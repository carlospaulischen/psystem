import { FileText } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DocumentosPage() {
  const { profile } = await requireStaff();
  const isPsychologist = profile.role === "psychologist";

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
      <Card className="mt-6">
        <CardHeader className="items-center pt-10 text-center">
          <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-muted">
            <FileText className="size-5 text-muted-foreground" />
          </div>
          <CardTitle className="text-base">
            {isPsychologist ? "Em breve" : "Acesso restrito"}
          </CardTitle>
          <CardDescription className="max-w-md">
            {isPsychologist
              ? "Declarações, atestados, relatórios, laudos e encaminhamentos — com versionamento, finalidade obrigatória e comprovante de entrega."
              : "Documentos psicológicos são acessíveis apenas ao profissional responsável pelo paciente."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-10" />
      </Card>
    </div>
  );
}
