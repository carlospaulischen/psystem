import { redirect } from "next/navigation";

// Redirect puro — opt out da validação "instant" (a navegação nunca renderiza UI).
export const instant = false;

export default function Home() {
  redirect("/dashboard");
}
