import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createCharge } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function NovaCobrancaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireStaff();
  const params = await searchParams;
  const supabase = await createClient();

  const { data: patients } = await supabase
    .from("patients")
    .select("id, full_name")
    .eq("status", "active")
    .order("full_name")
    .returns<{ id: string; full_name: string }[]>();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Nova cobrança</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cobrança avulsa ou por consulta — o pagamento pode ser baixado
        manualmente ou pelo gateway quando integrado.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Dados da cobrança</CardTitle>
          <CardDescription>
            O paciente vê a cobrança no portal dele.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createCharge} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="patient_id">Paciente *</Label>
              <select
                id="patient_id"
                name="patient_id"
                required
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                <option value="" disabled selected>
                  Selecione
                </option>
                {(patients ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="amount">Valor (R$) *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="200,00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="due_date">Vencimento</Label>
                <Input id="due_date" name="due_date" type="date" />
              </div>
            </div>

            {params.error && (
              <p className="text-sm text-destructive">
                {params.error === "required"
                  ? "Informe o paciente e um valor maior que zero."
                  : "Não foi possível salvar. Tente novamente."}
              </p>
            )}

            <div className="flex justify-end">
              <Button type="submit">Criar cobrança</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
