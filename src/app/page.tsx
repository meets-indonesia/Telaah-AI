"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { InputStation } from "@/components/InputStation";
import { ReportHeader } from "@/components/ReportHeader";
import { ClaimCards } from "@/components/ClaimCards";
import { FlowLensModule } from "@/components/FlowLensModule";
import { FinancialModule } from "@/components/FinancialModule";
import { TechnicalModule } from "@/components/TechnicalModule";
import { PeerLensModule } from "@/components/PeerLensModule";
import { EventsModule } from "@/components/EventsModule";
import { EvidenceDrawer } from "@/components/EvidenceDrawer";
import { ReportQADrawer } from "@/components/ReportQADrawer";
import { ShareModal } from "@/components/ShareModal";
import { AnalysisMode, CompanyIntelligenceReport } from "@/lib/agent/types";
import { AlertCircle, CheckCircle, Database, HelpCircle, Layers, ShieldCheck } from "lucide-react";

export default function Home() {
  const [report, setReport] = useState<CompanyIntelligenceReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ambiguity confirmation state
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [candidateSymbol, setCandidateSymbol] = useState("");
  const [pendingPrompt, setPendingPrompt] = useState("");
  const [pendingMode, setPendingMode] = useState<AnalysisMode>("full");

  // Drawers & Modals
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [isQAOpen, setIsQAOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);

  // Trigger from example pills
  const [promptValue, setPromptValue] = useState("");
  const [modeValue, setModeValue] = useState<AnalysisMode>("full");

  const handleSelectExample = (prompt: string, mode: AnalysisMode) => {
    setPromptValue(prompt);
    setModeValue(mode);
    executeAnalysis(prompt, mode);
  };

  const executeAnalysis = async (prompt: string, mode: AnalysisMode, confirmedSymbol?: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setNeedsConfirmation(false);

    setLoadingStage("Menganalisis intensi & mengekstrak klaim atomik...");

    try {
      const stageTimer1 = setTimeout(() => {
        setLoadingStage("Mengambil data resmi Sectors API v2 (Financials, Flow, Price)...");
      }, 1500);

      const stageTimer2 = setTimeout(() => {
        setLoadingStage("Menghitung indikator teknikal & rasio keuangan deterministik...");
      }, 3500);

      const stageTimer3 = setTimeout(() => {
        setLoadingStage("Sintesis laporan Telaah 360 & verifikasi bukti citation guard...");
      }, 5500);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          mode,
          confirmedSymbol,
        }),
      });

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal melakukan telaah emiten.");
      }

      if (data.needsConfirmation) {
        setNeedsConfirmation(true);
        setCandidateSymbol(data.candidateSymbol || "");
        setPendingPrompt(prompt);
        setPendingMode(mode);
        setIsLoading(false);
        return;
      }

      if (data.report) {
        setReport(data.report);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat memproses permintaan.");
    } finally {
      setIsLoading(false);
      setLoadingStage("");
    }
  };

  const handleConfirmSymbol = (sym: string) => {
    if (!sym || !/^[A-Z]{4}$/.test(sym.toUpperCase())) {
      setErrorMessage("Kode saham harus 4 huruf kapital (misal: BBCA, TLKM).");
      return;
    }
    executeAnalysis(pendingPrompt, pendingMode, sym.toUpperCase());
  };

  const handleOpenEvidenceWithId = (evidenceId: string) => {
    setSelectedEvidenceId(evidenceId);
    setIsEvidenceOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100">
      {/* Top Navbar */}
      <Header onSelectExample={handleSelectExample} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Input Station */}
        <InputStation
          onAnalyze={executeAnalysis}
          isLoading={isLoading}
          loadingStage={loadingStage}
          initialPrompt={promptValue}
          initialMode={modeValue}
        />

        {/* Error Callout */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3 animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block mb-0.5">Terjadi Kendala Analisis</strong>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Needs Confirmation Prompt (Ambiguous Ticker) */}
        {needsConfirmation && (
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-slate-200 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Konfirmasi Kode Emiten IDX</h3>
            </div>
            <p className="text-xs text-slate-300">
              Sistem mendeteksi kemungkinan emiten{" "}
              <strong className="text-amber-400 font-mono">
                {candidateSymbol || "tidak terdeteksi jelas"}
              </strong>
              , namun membutuhkan konfirmasi Anda untuk memastikan data yang ditarik 100% akurat.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="text"
                defaultValue={candidateSymbol}
                placeholder="Misal: BBCA"
                maxLength={4}
                id="confirmedSymbolInput"
                className="w-28 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-center tracking-wider text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              <button
                onClick={() => {
                  const input = document.getElementById("confirmedSymbolInput") as HTMLInputElement;
                  handleConfirmSymbol(input.value.trim());
                }}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition"
              >
                Lanjutkan Telaah
              </button>
            </div>
          </div>
        )}

        {/* The 360° Dossier / Report Canvas */}
        {report && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header & Direct Answer */}
            <ReportHeader
              report={report}
              onOpenEvidence={() => {
                setSelectedEvidenceId(null);
                setIsEvidenceOpen(true);
              }}
              onOpenQA={() => setIsQAOpen(true)}
              onShare={() => setIsShareOpen(true)}
            />

            {/* Atomic Claims Evaluation */}
            <ClaimCards
              claims={report.claims}
              onSelectEvidence={handleOpenEvidenceWithId}
            />

            {/* Grid Modules: Left Column (Financial & Technical) vs Right Column (FlowLens & Peers) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                <FinancialModule financials={report.financials} />
                <TechnicalModule technical={report.technical} />
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <FlowLensModule flowLens={report.flowLens} />
                <PeerLensModule
                  peerLens={report.peerLens}
                  valuation={report.valuation}
                  symbol={report.symbol}
                />
              </div>
            </div>

            {/* Full-width Events & Disclosure Timeline */}
            <EventsModule
              events={report.events}
              openQuestions={report.openQuestions}
              limitations={report.limitations}
            />
          </div>
        )}

        {/* Empty State / Welcome Screen */}
        {!report && !isLoading && !needsConfirmation && (
          <div className="py-12 text-center max-w-xl mx-auto space-y-3 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">
              Siap Menganalisis Emiten IDX Secara Obyektif
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ketik pertanyaan Anda atau tempel teks postingan media sosial di atas. Telaah 360 akan
              memverifikasi klaim, menghitung indikator teknikal, menyajikan laporan keuangan, dan
              membedah arus broker serta asing dengan data langsung dari Sectors API v2.
            </p>
          </div>
        )}
      </main>

      {/* Floating Action Button for QA & Evidence when report is present */}
      {report && (
        <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2">
          <button
            onClick={() => setIsQAOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xl shadow-blue-600/30 transition transform hover:scale-105"
          >
            <span>Tanya Laporan</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>
      )}

      {/* Slide-over Drawers and Modals */}
      {report && (
        <>
          <EvidenceDrawer
            isOpen={isEvidenceOpen}
            onClose={() => setIsEvidenceOpen(false)}
            evidenceRecords={report.evidenceRecords}
            toolCallTrace={report.toolCallTrace}
            selectedEvidenceId={selectedEvidenceId}
          />

          <ReportQADrawer
            isOpen={isQAOpen}
            onClose={() => setIsQAOpen(false)}
            report={report}
          />

          <ShareModal
            isOpen={isShareOpen}
            onClose={() => setIsShareOpen(false)}
            report={report}
          />
        </>
      )}
    </div>
  );
}
