import Link from "next/link";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Patient } from "@/types";

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireStaff();
  const supabase = await createClient();
  const { q } = await searchParams;
  const term = q?.trim();

  let query = supabase
    .from("patients")
    .select("id, full_name, phone, email, status")
    .order("full_name")
    .limit(200);

  if (term) {
    query = query.or(
      `full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`,
    );
  }

  const { data: patients } = await query.returns<Patient[]>();

  return (
    <div>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {term
              ? `${patients?.length ?? 0} resultado(s) para "${term}"`
              : `${patients?.length ?? 0} cadastrado(s)`}
          </p>
        </div>
        <Link href="/pacientes/novo" className={buttonVariants()}>
          <Plus className="size-4" />
          Novo paciente
        </Link>
      </header>

      <div className="mt-6 rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead className="w-32">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients && patients.length > 0 ? (
              patients.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link
                      href={`/pacientes/${p.id}`}
                      className="font-medium hover:text-primary"
                    >
                      {p.full_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.phone ?? p.email ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Nenhum paciente cadastrado ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
