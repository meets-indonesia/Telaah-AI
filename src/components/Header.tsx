"use client";

import React from "react";
import { ShieldCheck, Sparkles, Database, Info } from "lucide-react";

interface HeaderProps {
  onSelectExample: (prompt: string, mode: "quick" | "full") => void;
}

export const Header: React.FC<HeaderProps> = ({ onSelectExample }) => {
  const examples = [
    {
      label: "BBCA • Akumulasi Asing & Laba",
      prompt: "BCA (BBCA) labanya naik gila-gilaan, asing juga borong saham ini. Benar gak ya?",
      mode: "quick" as const,
    },
    {
      label: "BBRI • Review Full & Dividen",
      prompt: "Bagaimana kondisi fundamental, valuasi peer, dan foreign flow BBRI saat ini?",
      mode: "full" as const,
    },
    {
      label: "TLKM • Valuasi & Penurunan Margin",
      prompt: "Ada yang bilang laba TLKM tertekan dan broker asing buang barang terus. Coba cek faktanya.",
      mode: "full" as const,
    },
  ];

  return (
    <header className="border-b border-slate-800/80 bg-[#0b101b]/90 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                Telaah <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">360</span>
              </h1>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                Sectors API v2
              </span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Ling 3.0 Flash Fin
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Asisten Riset Emiten IDX Berbasis Bukti • Anti Halusinasi & Tanpa Pom-Pom
            </p>
          </div>
        </div>

        {/* Quick Example Pills */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Coba Contoh:
          </span>
          {examples.map((ex, idx) => (
            <button
              key={idx}
              onClick={() => onSelectExample(ex.prompt, ex.mode)}
              className="px-2.5 py-1 rounded-lg bg-slate-800/70 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 transition text-[11px]"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
