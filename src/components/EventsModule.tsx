"use client";

import React, { useState } from "react";
import { EventsTimelineData } from "@/lib/agent/types";
import { Calendar, AlertCircle, Newspaper, FileText, HelpCircle, ChevronLeft, ChevronRight } from "lucide-react";

interface EventsModuleProps {
  events: EventsTimelineData;
  openQuestions: string[];
  limitations: string[];
}

const ITEMS_PER_PAGE = 5;

export const EventsModule: React.FC<EventsModuleProps> = ({ events, openQuestions, limitations }) => {
  const [activeTab, setActiveTab] = useState<"actions" | "filings" | "news">("actions");
  const [page, setPage] = useState<number>(1);

  // Current year filter: e.g. "2026"
  const currentYear = new Date().getFullYear().toString();

  // 1. Filter only items from current year
  const safeActions = (Array.isArray(events?.actions) ? events.actions : []).filter((act) => {
    const itemDate = act.date || act.ex_date || act.cum_date || "";
    return itemDate.startsWith(currentYear);
  });

  const safeFilings = (Array.isArray(events?.filings) ? events.filings : []).filter((fil) => {
    const itemDate = fil.date || "";
    return itemDate.startsWith(currentYear);
  });

  const safeNews = (Array.isArray(events?.news) ? events.news : []).filter((n) => {
    const itemDate = n.published_at || "";
    return itemDate.startsWith(currentYear);
  });

  const safeQuestions = Array.isArray(openQuestions) ? openQuestions : [];
  const safeLimitations = Array.isArray(limitations) ? limitations : [];

  // Reset page when tab changes
  const handleTabChange = (tab: "actions" | "filings" | "news") => {
    setActiveTab(tab);
    setPage(1);
  };

  // Determine current active list
  let currentList: any[] = [];
  if (activeTab === "actions") currentList = safeActions;
  else if (activeTab === "filings") currentList = safeFilings;
  else if (activeTab === "news") currentList = safeNews;

  const totalPages = Math.max(1, Math.ceil(currentList.length / ITEMS_PER_PAGE));
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const paginatedList = currentList.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-3">
      {/* Events Card */}
      <div className="bg-white dark:bg-black rounded-lg border border-slate-200 dark:border-slate-800/80 p-4 space-y-3 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800/60">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Events & Disclosure Timeline
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
                Tahun {currentYear}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Kronologi aksi korporasi, keterbukaan informasi insider, dan berita resmi tahun berjalan ({currentYear}).
            </p>
          </div>

          <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-black rounded border border-slate-200 dark:border-slate-800 text-[11px] font-mono">
            <button
              onClick={() => handleTabChange("actions")}
              className={`px-2 py-0.5 rounded transition ${
                activeTab === "actions"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              Aksi Korporasi ({safeActions.length})
            </button>
            <button
              onClick={() => handleTabChange("filings")}
              className={`px-2 py-0.5 rounded transition ${
                activeTab === "filings"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              Filings ({safeFilings.length})
            </button>
            <button
              onClick={() => handleTabChange("news")}
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

        {/* Tab Content (Capped at 5 items per page) */}
        <div className="space-y-2">
          {activeTab === "actions" && (
            <>
              {paginatedList.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center font-mono">
                  Tidak ada aksi korporasi tercatat di tahun {currentYear}.
                </p>
              ) : (
                paginatedList.map((act: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded bg-white dark:bg-black border border-slate-100 dark:border-slate-800/60 text-xs flex items-start gap-2.5 transition"
                  >
                    <div className="w-7 h-7 rounded bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {act.action_type || act.description || "Aksi Korporasi"}
                        </span>
                        {act.date && (
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {act.date}
                          </span>
                        )}
                      </div>
                      {act.description && act.action_type && (
                        <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed text-[11px] line-clamp-2">
                          {act.description}
                        </p>
                      )}
                      {(act.cum_date || act.ex_date || act.amount) && (
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-[10px] text-slate-400 font-mono tabular-nums">
                          {act.amount && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              Dividen: Rp {act.amount.toLocaleString("id-ID")}
                            </span>
                          )}
                          {act.cum_date && <span>Cum: {act.cum_date}</span>}
                          {act.ex_date && <span>Ex: {act.ex_date}</span>}
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
              {paginatedList.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center font-mono">
                  Tidak ada insider filing tercatat di tahun {currentYear}.
                </p>
              ) : (
                paginatedList.map((fil: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded bg-white dark:bg-black border border-slate-100 dark:border-slate-800/60 text-xs flex items-start gap-2.5 transition"
                  >
                    <div className="w-7 h-7 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {fil.title}
                        </span>
                        {fil.date && (
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {fil.date}
                          </span>
                        )}
                      </div>
                      {fil.body && (
                        <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed text-[11px] line-clamp-2">
                          {fil.body}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === "news" && (
            <>
              {paginatedList.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center font-mono">
                  Tidak ada berita resmi tercatat di tahun {currentYear}.
                </p>
              ) : (
                paginatedList.map((n: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded bg-white dark:bg-black border border-slate-100 dark:border-slate-800/60 text-xs flex items-start gap-2.5 transition"
                  >
                    <div className="w-7 h-7 rounded bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                      <Newspaper className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {n.title}
                        </span>
                        {n.published_at && (
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {n.published_at.split("T")[0]}
                          </span>
                        )}
                      </div>
                      {n.body && (
                        <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed text-[11px] line-clamp-2">
                          {n.body}
                        </p>
                      )}
                      {n.source && (
                        <span className="text-[10px] text-indigo-500 mt-1 inline-block font-mono">
                          Sumber: {n.source}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* Pagination Controls (if items > 5) */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px] font-mono">
            <span className="text-slate-500">
              Menampilkan {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, currentList.length)} dari {currentList.length} entri ({currentYear})
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded bg-slate-100 dark:bg-black border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="px-2 font-bold text-slate-800 dark:text-slate-200">
                {page} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded bg-slate-100 dark:bg-black border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Open Questions & Risk Limitations Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Open Questions */}
        <div className="bg-white dark:bg-black rounded-lg border border-slate-200 dark:border-slate-800/80 p-3.5 space-y-2">
          <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-500" /> Open Questions / Catatan Kritis
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            {safeQuestions.map((q, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-white dark:bg-black p-2 rounded border border-slate-100 dark:border-slate-800/60">
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
        <div className="bg-white dark:bg-black rounded-lg border border-slate-200 dark:border-slate-800/80 p-3.5 space-y-2">
          <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400" /> Batasan Data & Disclaimer
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
            {safeLimitations.map((l, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-white dark:bg-black p-2 rounded border border-slate-100 dark:border-slate-800/60">
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
