import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Telaah 360 — Asisten Riset Emiten IDX Berbasis Bukti",
  description: "Membedah rumor, berita, dan postingan saham IDX dengan data faktual dari Sectors API v2.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased bg-[#090d16] text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
