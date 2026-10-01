import { redirect } from "next/navigation";
import { auth, isAllowedEmail, signOut } from "@/auth";
import Calendar from "@/components/Calendar";
import { listEvents } from "./actions";

export const dynamic = "force-dynamic";

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const shift = (d: Date, days: number) => new Date(d.getTime() + days * 864e5);

export default async function Home() {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email || !isAllowedEmail(email)) redirect("/login");

  // Já entrega os itens de ~4 meses em volta de hoje; o cliente busca mais ao navegar para longe.
  const now = new Date();
  const range: [string, string] = [dayKey(shift(now, -45)), dayKey(shift(now, 75))];
  const res = await listEvents(range[0], range[1]);

  return (
    <Calendar
      initialEvents={res.ok ? res.data : []}
      initialRange={res.ok ? range : null}
      email={email}
      onSignOut={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    />
  );
}
