import type { Metadata, Viewport } from "next";
import RegisterSW from "@/components/RegisterSW";
import VersionFooter from "@/components/VersionFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgendaBoa",
  description: "Sua agenda pessoal",
  appleWebApp: { capable: true, title: "AgendaBoa", statusBarStyle: "default" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#2563eb", viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <VersionFooter />
        <RegisterSW />
      </body>
    </html>
  );
}
