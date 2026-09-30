import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import Agenda from "@/components/Agenda";
import { listEvents } from "./actions";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  return (
    <main>
      <header className="row" style={{ justifyContent: "space-between" }}>
        <h1>AgendaBoa</h1>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="btn ghost" type="submit">Sair</button>
        </form>
      </header>
      <p style={{ color: "var(--muted)" }}>Olá, {session.user.name ?? session.user.email}</p>
      <Agenda initial={await listEvents()} />
    </main>
  );
}
