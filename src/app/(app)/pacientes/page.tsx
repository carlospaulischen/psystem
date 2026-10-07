import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Patient } from "@/types";

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  paused: "Pausado",
  closed: "Encerrado",
  archived: "Arquivado",
};

export default async function PacientesPage() {
  await requireStaff();
  const supabase = await createClient();

  const { data: patients } = await supabase
    .from("patients")
    .select("id, full_name, phone, email, status")
    .order("full_name")
    .limit(100)
    .returns<Patient[]>();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pacientes</h1>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white">
        {patients && patients.length > 0 ? (
          <ul className="divide-y divide-zinc-100">
            {patients.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between px-5 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{p.full_name}</p>
                  <p className="text-xs text-zinc-500">
                    {p.phone ?? p.email ?? "—"}
                  </p>
                </div>
                <span className="text-xs text-zinc-500">
                  {STATUS_LABEL[p.status]}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-zinc-500">
            Nenhum paciente cadastrado ainda.
          </p>
        )}
      </div>
    </div>
  );
}
