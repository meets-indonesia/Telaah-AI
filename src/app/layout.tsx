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
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const savedTheme = localStorage.getItem('telaah_theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="antialiased bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 min-h-screen transition-colors duration-200 selection:bg-brand-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
