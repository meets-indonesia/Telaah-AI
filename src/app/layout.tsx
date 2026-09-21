import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

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
    <html lang="id" className={`dark ${poppins.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const savedTheme = localStorage.getItem('telaah_theme');
                if (savedTheme === 'light') {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                } else {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${poppins.className} font-sans antialiased bg-white dark:bg-black text-slate-900 dark:text-slate-100 min-h-[100dvh] transition-colors duration-200 selection:bg-orange-500 selection:text-white`}>
        <a href="#main-content" className="skip-link">Lewati ke konten utama</a>
        {children}
      </body>
    </html>
  );
}
