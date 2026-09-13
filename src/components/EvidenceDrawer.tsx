"use client";

import React, { useState } from "react";
import { EvidenceRecord } from "@/lib/agent/types";
import { X, Database, Copy, Check, Filter, ExternalLink, Code } from "lucide-react";

interface EvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  evidenceRecords: EvidenceRecord[];
  toolCallTrace: Array<{ endpoint: string; params: any; credits: number; timestamp: string }>;
  selectedEvidenceId?: string | null;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  isOpen,
  onClose,
  evidenceRecords,
  toolCallTrace,
  selectedEvidenceId,
}) => {
  const [activeTab, setActiveTab] = useState<"records" | "trace">("records");
  const [filterModule, setFilterModule] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredRecords =
    filterModule === "all"
      ? evidenceRecords
      : evidenceRecords.filter((r) => r.module === filterModule);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-[#090d16] border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Evidence & Audit Drawer</h3>
              <p className="text-xs text-slate-400">
                Transparansi 100% data mentah, parameter endpoint, dan jejak panggilan API.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 py-2.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("records")}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === "records"
                  ? "bg-blue-600/30 text-blue-300 border border-blue-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Evidence Records ({evidenceRecords.length})
            </button>
            <button
              onClick={() => setActiveTab("trace")}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === "trace"
                  ? "bg-blue-600/30 text-blue-300 border border-blue-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Tool Call Trace ({toolCallTrace.length})
            </button>
          </div>

          {activeTab === "records" && (
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none"
            >
              <option value="all">Semua Modul</option>
              <option value="overview">Overview</option>
              <option value="financials">Financials</option>
              <option value="flowlens">FlowLens</option>
              <option value="technical">Technical</option>
              <option value="valuation">Valuation</option>
              <option value="events">Events</option>
            </select>
          )}
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === "records" ? (
            <div className="space-y-4">
              {filteredRecords.map((record) => {
                const isHighlighted = selectedEvidenceId === record.id;
                return (
                  <div
                    key={record.id}
                    id={record.id}
                    className={`p-4 rounded-xl border transition ${
                      isHighlighted
                        ? "bg-blue-950/40 border-blue-500 ring-1 ring-blue-500"
                        : "bg-slate-900/70 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-400">
                          #{record.id}
                        </span>
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {record.module}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {record.retrievedAt}
                      </span>
                    </div>

                    <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 mb-2 flex items-center justify-between">
                      <span className="truncate">{record.sourceEndpoint}</span>
                      <span className="text-slate-500 text-[10px] shrink-0 ml-2">
                        As of: {record.asOfDate}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      {record.summary}
                    </p>

                    {record.rawData && (
                      <div className="relative">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span className="flex items-center gap-1 font-mono">
                            <Code className="w-3 h-3" /> Raw JSON Payload
                          </span>
                          <button
                            onClick={() =>
                              handleCopy(JSON.stringify(record.rawData, null, 2), record.id)
                            }
                            className="flex items-center gap-1 hover:text-slate-300 transition"
                          >
                            {copiedId === record.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Tersalin!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" /> Salin JSON
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 overflow-x-auto max-h-48">
                          {JSON.stringify(record.rawData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs text-slate-400">
                Jejak pemanggilan endpoint bursa untuk laporan ini. Menunjukkan kepatuhan kuota kredit (Stop Condition &lt;30 calls).
              </div>

              {toolCallTrace.map((call, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono"
                >
                  <div className="flex items-center justify-between text-slate-300 mb-1">
                    <span className="font-semibold text-blue-400">GET {call.endpoint}</span>
                    <span className="text-amber-400 text-[11px] font-bold">
                      +{call.credits} Kredit
                    </span>
                  </div>
                  {call.params && Object.keys(call.params).length > 0 && (
                    <div className="text-[10px] text-slate-400">
                      Params: {JSON.stringify(call.params)}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 mt-1">
                    Timestamp: {call.timestamp}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
