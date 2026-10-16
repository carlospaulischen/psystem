"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Troca a organização ativa — switch_organization valida a membership no banco.
export async function switchOrganization(orgId: string) {
  await requireStaff();
  const supabase = await createClient();

  const { error } = await supabase.rpc("switch_organization", {
    p_org: orgId,
  });
  if (error) {
    console.error("[org] switch:", error.message);
    return;
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

// Cria o consultório particular (org individual) do usuário e alterna para ele.
export async function createOwnPractice() {
  const { profile } = await requireStaff();
  if (profile.role !== "psychologist") {
    redirect("/configuracoes");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_own_practice");
  if (error) {
    console.error("[org] create practice:", error.message);
    return;
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
