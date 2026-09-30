import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await auth()) redirect("/");
  const { error } = await searchParams;

  return (
    <div className="center">
      <div className="card" style={{ maxWidth: 360 }}>
        <h1>AgendaBoa</h1>
        <p style={{ color: "var(--muted)" }}>Acesso restrito a usuários autorizados.</p>
        {error && (
          <p className="err">
            {error === "AccessDenied"
              ? "Este e-mail não tem acesso ao aplicativo."
              : "Não foi possível entrar. Tente novamente."}
          </p>
        )}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button className="btn" type="submit">Entrar com Google</button>
        </form>
      </div>
    </div>
  );
}
