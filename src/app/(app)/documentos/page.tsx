import { requireStaff } from "@/lib/auth";

export default async function DocumentosPage() {
  const { profile } = await requireStaff();
  const isPsychologist = profile.role === "psychologist";

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold">Documentos</h1>
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white px-5 py-8 text-center">
        {isPsychologist ? (
          <p className="text-sm text-zinc-500">
            Em breve: declarações, atestados, relatórios, laudos e
            encaminhamentos com versionamento e comprovante de entrega.
          </p>
        ) : (
          <p className="text-sm text-zinc-500">
            Documentos psicológicos são acessíveis apenas ao profissional
            responsável pelo paciente.
          </p>
        )}
      </div>
    </div>
  );
}
