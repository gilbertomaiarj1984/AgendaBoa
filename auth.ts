import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

function allowedEmails(): Set<string> {
  return new Set(
    (process.env.ALLOWED_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

// Também usado nas ações do servidor: remover um e-mail da lista corta o acesso aos dados na hora,
// mesmo que a sessão (JWT) dele ainda não tenha expirado.
export function isAllowedEmail(email: string | null | undefined): boolean {
  return !!email && allowedEmails().has(email.toLowerCase());
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    // Só libera quem tem e-mail verificado pelo Google e está na lista do env.
    signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      if (!email || profile?.email_verified === false) return false;
      return allowedEmails().has(email);
    },
  },
});
