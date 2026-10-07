import { requireStaff } from "@/lib/auth";

export default async function ConfiguracoesPage() {
  const { profile } = await requireStaff();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold">Configurações</h1>
      <div className="mt-6 space-y-4">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="font-medium">Organização</h2>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-zinc-500">Nome</dt>
            <dd>{profile.organization?.name}</dd>
            <dt className="text-zinc-500">Tipo</dt>
            <dd>
              {profile.organization?.type === "clinic" ? "Clínica" : "Individual"}
            </dd>
          </dl>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="font-medium">Seu perfil</h2>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-zinc-500">Nome</dt>
            <dd>{profile.full_name}</dd>
            <dt className="text-zinc-500">Função</dt>
            <dd>{profile.role}</dd>
            {profile.crp && (
              <>
                <dt className="text-zinc-500">CRP</dt>
                <dd>{profile.crp}</dd>
              </>
            )}
          </dl>
        </section>
      </div>
    </div>
  );
}
