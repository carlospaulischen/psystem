"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

const INVITABLE_ROLES = ["psychologist", "receptionist", "clinic_admin"];

export type InviteState = { ok?: boolean; error?: string } | null;

// Fluxo de convite (ET-015): o admin informa o e-mail; o Supabase envia o
// convite e o profile nasce com status "invited" até o primeiro acesso.
export async function inviteStaff(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const { profile } = await requireStaff();
  if (profile.role !== "clinic_admin") {
    return { error: "Somente administradores podem convidar membros." };
  }

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const fullName = (formData.get("full_name") as string)?.trim();
  const role = formData.get("role") as string;
  const crp = (formData.get("crp") as string)?.trim() || null;

  if (!email || !fullName || !INVITABLE_ROLES.includes(role)) {
    return { error: "Preencha nome, e-mail e função." };
  }
  if (role === "psychologist" && !crp) {
    return { error: "Informe o CRP do psicólogo(a)." };
  }

  const origin =
    (await headers()).get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";
  const admin = createAdminClient();

  const { data: invite, error } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      data: { full_name: fullName, app: "psystem" },
      redirectTo: `${origin}/auth/callback?next=/nova-senha`,
    },
  );

  if (error || !invite.user) {
    if (error?.message?.includes("already been registered")) {
      return { error: "Já existe um usuário com esse e-mail." };
    }
    console.error("[staff] invite:", error?.message);
    return { error: "Não foi possível enviar o convite." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: invite.user.id,
    organization_id: profile.organization_id,
    role: role as "psychologist" | "receptionist" | "clinic_admin",
    status: "invited",
    full_name: fullName,
    crp,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(invite.user.id);
    console.error("[staff] profile:", profileError.message);
    return { error: "Falha ao criar o perfil do membro." };
  }

  await logAudit({
    organizationId: profile.organization_id,
    resourceType: "profile",
    resourceId: invite.user.id,
    action: "EQUIPE_CONVIDADO",
    metadata: { email, role },
  });

  revalidatePath("/configuracoes");
  return { ok: true };
}

// Disponibilidade semanal — o psicólogo gerencia os próprios horários
// (RLS também permite a recepção/admin; a UI oferece só ao psicólogo).
export async function addAvailability(formData: FormData) {
  const { profile } = await requireStaff();
  const supabase = await createClient();

  const weekday = Number(formData.get("weekday"));
  const startTime = formData.get("start_time") as string;
  const endTime = formData.get("end_time") as string;
  if (!Number.isInteger(weekday) || !startTime || !endTime) return;

  await supabase.from("availability").insert({
    organization_id: profile.organization_id,
    psychologist_id: profile.id,
    weekday,
    start_time: startTime,
    end_time: endTime,
  });

  revalidatePath("/configuracoes");
}

export async function removeAvailability(id: string) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("availability").delete().eq("id", id);
  revalidatePath("/configuracoes");
}

// Dados da organização — usados em NFS-e e PDFs. Somente admin.
export async function updateOrganization(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const { profile } = await requireStaff();
  if (profile.role !== "clinic_admin") {
    return { error: "Somente administradores." };
  }

  const name = (formData.get("name") as string)?.trim();
  const document = (formData.get("document") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;
  const city = (formData.get("city") as string)?.trim() || null;

  if (!name) return { error: "Informe o nome da organização." };

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", profile.organization_id)
    .single();

  const { error } = await supabase
    .from("organizations")
    .update({
      name,
      document,
      settings: {
        ...((org?.settings as Record<string, unknown>) ?? {}),
        phone,
        address,
        city,
      },
    })
    .eq("id", profile.organization_id);

  if (error) {
    console.error("[org] update:", error.message);
    return { error: "Não foi possível salvar." };
  }

  await logAudit({
    organizationId: profile.organization_id,
    resourceType: "organization",
    resourceId: profile.organization_id,
    action: "ORGANIZACAO_ATUALIZADA",
    metadata: { name },
  });

  revalidatePath("/configuracoes");
  return { ok: true };
}

// Perfil próprio — qualquer membro edita nome; CRP só para psicólogo.
export async function updateMyProfile(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const { profile } = await requireStaff();

  const fullName = (formData.get("full_name") as string)?.trim();
  const crp = (formData.get("crp") as string)?.trim() || null;
  if (!fullName) return { error: "Informe seu nome." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      crp: profile.role === "psychologist" ? crp : profile.crp,
    })
    .eq("id", profile.id);

  if (error) {
    console.error("[profile] update:", error.message);
    return { error: "Não foi possível salvar." };
  }

  await logAudit({
    organizationId: profile.organization_id,
    resourceType: "profile",
    resourceId: profile.id,
    action: "PERFIL_ATUALIZADO",
  });

  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function updateMemberStatus(
  memberId: string,
  status: "active" | "inactive" | "blocked",
) {
  const { profile } = await requireStaff();
  if (profile.role !== "clinic_admin" || memberId === profile.id) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ status })
    .eq("id", memberId);

  if (!error) {
    await logAudit({
      organizationId: profile.organization_id,
      resourceType: "profile",
      resourceId: memberId,
      action: "EQUIPE_STATUS",
      metadata: { status },
    });
  }

  revalidatePath("/configuracoes");
}
