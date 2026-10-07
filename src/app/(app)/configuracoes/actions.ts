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
      data: { full_name: fullName },
      redirectTo: `${origin}/auth/callback`,
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
