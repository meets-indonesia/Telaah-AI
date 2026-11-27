"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Search, X } from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import {
  getCompanyName,
  searchEmiten,
  type IDXCompany,
} from "@/lib/sectors/companies";

interface SymbolSearchProps {
  value: string;
  onSelect: (symbol: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

const POPULAR = ["BBCA", "BBRI", "BMRI", "TLKM", "ASII", "ADRO", "ANTM", "GOTO"];

function popularCompanies(): IDXCompany[] {
  return POPULAR.map((symbol) => ({
    symbol,
    name: getCompanyName(symbol) ?? symbol,
  }));
}

export const SymbolSearch = forwardRef<HTMLInputElement, SymbolSearchProps>(
  function SymbolSearch(
    {
      value,
      onSelect,
      placeholder = "Cari kode atau nama emiten...",
      className = "",
      ariaLabel = "Cari emiten",
    },
    ref
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [query, setQuery] = useState(value);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);

    useEffect(() => {
      setQuery(value);
    }, [value]);

    useEffect(() => {
      const handlePointer = (event: MouseEvent) => {
        if (!wrapperRef.current?.contains(event.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", handlePointer);
      return () => document.removeEventListener("mousedown", handlePointer);
    }, []);

    const results = useMemo(() => {
      const clean = query.trim();
      if (!clean) return popularCompanies();
      return searchEmiten(clean, 8);
    }, [query]);

    const commit = (item: IDXCompany) => {
      setQuery(item.symbol);
      setOpen(false);
      setActiveIndex(0);
      onSelect(item.symbol);
      inputRef.current?.blur();
    };

    const commitRaw = () => {
      const clean = query.trim().toUpperCase().replace(".JK", "");
      if (/^[A-Z]{4}$/.test(clean)) {
        setQuery(clean);
        setOpen(false);
        onSelect(clean);
        inputRef.current?.blur();
      }
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setOpen(true);
        setActiveIndex((index) =>
          results.length === 0 ? 0 : (index + 1) % results.length
        );
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setOpen(true);
        setActiveIndex((index) =>
          results.length === 0
            ? 0
            : (index - 1 + results.length) % results.length
        );
      } else if (event.key === "Enter") {
        event.preventDefault();
        const selected = results[activeIndex] ?? results[0];
        if (selected) commit(selected);
        else commitRaw();
      } else if (event.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };

    return (
      <div ref={wrapperRef} className={`relative ${className}`}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label={ariaLabel}
            aria-expanded={open}
            aria-controls="symbol-search-results"
            aria-autocomplete="list"
            value={query}
            placeholder={placeholder}
            onChange={(event) => {
              setQuery(event.target.value.toUpperCase());
              setOpen(true);
              setActiveIndex(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 font-mono text-xs text-zinc-900 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-100 dark:placeholder:text-slate-500 dark:focus:border-white/20 dark:focus:ring-white/5"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setOpen(true);
                inputRef.current?.focus();
              }}
              aria-label="Bersihkan pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {open && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 dark:border-white/10 dark:bg-[#0b0b0c] dark:shadow-black/50">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-white/5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                {query.trim() ? "Hasil pencarian" : "Emiten populer"}
              </span>
              <span className="text-[9px] font-mono text-slate-400">↑↓ pilih · ↵ buka</span>
            </div>

            <div
              id="symbol-search-results"
              role="listbox"
              aria-label="Hasil pencarian emiten"
              className="max-h-80 overflow-y-auto p-1.5"
            >
              {results.length > 0 ? (
                results.map((item, index) => (
                  <button
                    key={item.symbol}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => commit(item)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition ${
                      index === activeIndex
                        ? "bg-slate-100 dark:bg-white/[0.07]"
                        : "hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <CompanyLogo
                        symbol={item.symbol}
                        companyName={item.name}
                        size="sm"
                      />
                      <span className="min-w-0">
                        <span className="block font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {item.symbol}
                        </span>
                        <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {item.name}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-slate-400">
                      buka
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  <p>Tidak ditemukan emiten untuk “{query.trim()}”.</p>
                  {/^[A-Z]{4}$/.test(query.trim().toUpperCase()) && (
                    <button
                      type="button"
                      onClick={commitRaw}
                      className="mt-2 rounded-md border border-slate-200 px-2.5 py-1 font-mono text-[11px] text-zinc-700 transition hover:bg-slate-100 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5"
                    >
                      Buka {query.trim().toUpperCase()}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);
