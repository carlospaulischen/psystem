import { login } from "./actions";

export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">psystem</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Gestão para psicólogos e clínicas
        </p>

        <form action={login} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="next" value={params.next ?? "/dashboard"} />

          <label className="flex flex-col gap-1 text-sm font-medium">
            E-mail
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Senha
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
            />
          </label>

          {params.error && (
            <p className="text-sm text-red-600">
              Não foi possível autenticar. Tente novamente.
            </p>
          )}

          <button
            type="submit"
            className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
