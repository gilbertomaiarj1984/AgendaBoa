// Quem pode usar o app é decidido por ALLOWED_EMAILS (auth.ts). Aqui só ficam nome e cor de cada pessoa.
// Cor do ícone: azul = Gilberto, rosa = Jacheline. Outros e-mails caem em cinza até definirmos a cor.
export type Tone = "blue" | "pink" | "gray";
export type Person = { name: string; initial: string; tone: Tone };

const PEOPLE: Record<string, Person> = {
  "gilbertomaiarj@gmail.com": { name: "Gilberto", initial: "G", tone: "blue" },
  "jachelinebarcelos@gmail.com": { name: "Jacheline", initial: "J", tone: "pink" },
};

export function personFor(email: string): Person {
  const known = PEOPLE[email.toLowerCase()];
  if (known) return known;
  const name = email.split("@")[0] || email;
  return { name, initial: name.charAt(0).toUpperCase() || "?", tone: "gray" };
}
