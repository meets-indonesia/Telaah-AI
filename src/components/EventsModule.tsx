"use client";

import React, { useState } from "react";
import { EventsTimelineData } from "@/lib/agent/types";
import { Calendar, AlertCircle, Newspaper, FileText, HelpCircle } from "lucide-react";

interface EventsModuleProps {
  events: EventsTimelineData;
  openQuestions: string[];
  limitations: string[];
}

export const EventsModule: React.FC<EventsModuleProps> = ({ events, openQuestions, limitations }) => {
  const [activeTab, setActiveTab] = useState<"actions" | "filings" | "news">("actions");

  const safeActions = Array.isArray(events?.actions) ? events.actions : [];
  const safeFilings = Array.isArray(events?.filings) ? events.filings : [];
  const safeNews = Array.isArray(events?.news) ? events.news : [];
  const safeQuestions = Array.isArray(openQuestions) ? openQuestions : [];
  const safeLimitations = Array.isArray(limitations) ? limitations : [];

  return (
    <div className="space-y-3">
      {/* Events Card */}
      <div className="bg-white dark:bg-[#0f1118] rounded-lg border border-slate-200 dark:border-slate-800/80 p-4 space-y-3 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800/60">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Events & Disclosure Timeline</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Kronologi aksi korporasi, keterbukaan informasi insider, dan berita resmi.
            </p>
          </div>

          <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-[#12151f] rounded border border-slate-200 dark:border-slate-800 text-[11px] font-mono">
            <button
              onClick={() => setActiveTab("actions")}
              className={`px-2 py-0.5 rounded transition ${
                activeTab === "actions"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              Aksi Korporasi ({safeActions.length})
            </button>
            <button
              onClick={() => setActiveTab("filings")}
              className={`px-2 py-0.5 rounded transition ${
                activeTab === "filings"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              Filings ({safeFilings.length})
            </button>
            <button
              onClick={() => setActiveTab("news")}
              className={`px-2 py-0.5 rounded transition ${
                activeTab === "news"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              Berita ({safeNews.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-2.5">
          {activeTab === "actions" && (
            <>
              {safeActions.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">Tidak ada aksi korporasi tercatat baru-baru ini.</p>
              ) : (
                safeActions.map((act, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">
                          {act.action_type || act.description || "Aksi Korporasi"}
                        </span>
                        {act.date && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                            {act.date}
                          </span>
                        )}
                      </div>
                      {act.description && act.action_type && (
                        <p className="text-slate-400 mt-1 leading-relaxed">{act.description}</p>
                      )}
                      {(act.cum_date || act.ex_date || act.amount) && (
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-slate-400 font-mono">
                          {act.amount && <span>Nominal/Dividen: Rp {act.amount.toLocaleString("id-ID")}</span>}
                          {act.cum_date && <span>Cum Date: {act.cum_date}</span>}
                          {act.ex_date && <span>Ex Date: {act.ex_date}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === "filings" && (
            <>
              {safeFilings.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">Tidak ada insider/major-holder filing tercatat.</p>
              ) : (
                safeFilings.map((fil, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">{fil.title}</span>
                        {fil.date && (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                            {fil.date}
                          </span>
                        )}
                      </div>
                      {fil.body && <p className="text-slate-400 mt-1 leading-relaxed">{fil.body}</p>}
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === "news" && (
            <>
              {safeNews.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">Tidak ada berita spesifik terbaru.</p>
              ) : (
                safeNews.map((n, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                      <Newspaper className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-200">{n.title}</span>
                        {n.published_at && (
                          <span className="text-[10px] font-mono text-slate-500 shrink-0">
                            {n.published_at.split("T")[0]}
                          </span>
                        )}
                      </div>
                      {n.body && <p className="text-slate-400 mt-1 leading-relaxed line-clamp-2">{n.body}</p>}
                      {n.source && (
                        <span className="text-[10px] text-blue-400 mt-1 inline-block">Sumber: {n.source}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* Open Questions & Risk Limitations Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Open Questions */}
        <div className="bg-white dark:bg-[#0f1118] rounded-lg border border-slate-200 dark:border-slate-800/80 p-3.5 space-y-2">
          <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-500" /> Open Questions / Catatan Kritis
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            {safeQuestions.map((q, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-slate-50 dark:bg-[#12151f] p-2 rounded border border-slate-100 dark:border-slate-800/60">
                <span className="text-indigo-500 font-bold font-mono">•</span>
                <span className="leading-relaxed">{q}</span>
              </li>
            ))}
            {safeQuestions.length === 0 && (
              <li className="text-slate-400 text-xs">Tidak ada catatan terbuka khusus.</li>
            )}
          </ul>
        </div>

        {/* Audit & Compliance Limitations */}
        <div className="bg-white dark:bg-[#0f1118] rounded-lg border border-slate-200 dark:border-slate-800/80 p-3.5 space-y-2">
          <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400" /> Batasan Data & Disclaimer
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
            {safeLimitations.map((l, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-slate-50 dark:bg-[#12151f] p-2 rounded border border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-400 font-bold font-mono">•</span>
                <span className="leading-relaxed">{l}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
