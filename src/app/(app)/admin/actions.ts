"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAuthEmail } from "@/lib/messages";
import { logAudit } from "@/lib/audit";
import { headers } from "next/headers";

async function requirePlatformAdmin() {
  const { user, profile } = await requireStaff();
  if (!profile.is_platform_admin) redirect("/dashboard");
  return { user, profile };
}

// Cria um novo tenant: organização + convite do primeiro clinic_admin.
export async function createTenant(formData: FormData) {
  const { profile } = await requirePlatformAdmin();
  const admin = createAdminClient();

  const orgName = (formData.get("org_name") as string)?.trim();
  const adminName = (formData.get("admin_name") as string)?.trim();
  const email = (formData.get("admin_email") as string)
    ?.trim()
    .toLowerCase();
  if (!orgName || !adminName || !email) {
    return redirect("/admin/organizacoes?error=" + encodeURIComponent("Preencha organização, nome e e-mail do admin."));
  }

  const slug =
    orgName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `org-${Date.now()}`;

  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({ type: "clinic", name: orgName, slug })
    .select("id, name")
    .single();
  if (orgErr || !org) {
    console.error("[admin] org:", orgErr?.message);
    return redirect("/admin/organizacoes?error=" + encodeURIComponent("Falha ao criar a organização (slug duplicado?)."));
  }

  const origin = (await headers()).get("origin") ?? "";
  const { data: invite, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: { full_name: adminName, app: "psystem" },
      redirectTo: `${origin}/auth/callback?next=/nova-senha`,
    },
  });
  if (error || !invite.user) {
    await admin.from("organizations").delete().eq("id", org.id);
    console.error("[admin] invite:", error?.message);
    return redirect("/admin/organizacoes?error=" + encodeURIComponent("Não foi possível enviar o convite."));
  }

  const actionLink = invite.properties?.hashed_token
    ? `${origin}/auth/verify?token_hash=${invite.properties.hashed_token}&type=invite&next=/nova-senha`
    : invite.properties?.action_link;

  const { error: pErr } = await admin.from("profiles").insert({
    id: invite.user.id,
    organization_id: org.id,
    role: "clinic_admin",
    status: "invited",
    full_name: adminName,
  });
  if (pErr) {
    await admin.auth.admin.deleteUser(invite.user.id);
    await admin.from("organizations").delete().eq("id", org.id);
    return redirect("/admin/organizacoes?error=" + encodeURIComponent("Falha ao criar o perfil do admin."));
  }

  await admin.from("organization_members").insert({
    organization_id: org.id,
    user_id: invite.user.id,
    role: "clinic_admin",
    status: "invited",
    is_admin: true,
    invited_by: profile.id,
  });

  if (actionLink) {
    await sendAuthEmail("staff_invite", {
      to: email,
      name: adminName,
      orgName: org.name,
      actionLink,
    });
  }

  void logAudit({
    organizationId: profile.organization_id,
    resourceType: "organization",
    resourceId: org.id,
    action: "TENANT_CRIADO",
    metadata: { org: org.name, admin_email: email },
  });

  revalidatePath("/admin/organizacoes");

}
