import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GADAP Armazém | WMS & Recinto Alfandegado",
  description: "Sistema WMS Multi-tenant com PWA de Doca e Auditoria Aduaneira",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}

