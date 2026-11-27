"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { searchEmiten } from "@/lib/sectors/companies";
import {
  parseTerminalQuery,
  terminalCommands,
  type TerminalCommand,
} from "@/lib/terminal/commands";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const companies = useMemo(() => {
    const clean = query.trim();
    if (!clean) return [];
    return searchEmiten(clean, 6).map((company) => ({
      symbol: company.symbol,
      name: company.name,
    }));
  }, [query]);

  const commands = useMemo(
    () => terminalCommands(query, companies),
    [query, companies]
  );

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  if (!open) return null;

  const go = (command: TerminalCommand) => {
    router.push(command.href);
    onClose();
  };

  const submit = () => {
    const command = commands[active] ?? parseTerminalQuery(query);
    if (command) go(command);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 pt-[10vh] backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command terminal"
        className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-black/30 dark:border-white/10 dark:bg-[#0b0b0c]"
      >
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5 dark:border-white/[0.06]">
          <span className="font-mono text-sm font-bold text-emerald-500">
            &gt;
          </span>
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value.toUpperCase())}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((index) =>
                  commands.length === 0 ? 0 : (index + 1) % commands.length
                );
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((index) =>
                  commands.length === 0
                    ? 0
                    : (index - 1 + commands.length) % commands.length
                );
              } else if (event.key === "Enter") {
                event.preventDefault();
                submit();
              } else if (event.key === "Escape") {
                event.preventDefault();
                onClose();
              }
            }}
            placeholder="Ketik BBCA GO, BBCA HP, BBCA HARM, atau HARMONIC..."
            aria-label="Command"
            aria-autocomplete="list"
            aria-controls="terminal-command-list"
            className="h-8 flex-1 bg-transparent font-mono text-xs text-zinc-900 outline-none placeholder:font-sans placeholder:text-slate-400 dark:text-zinc-100"
          />
          <kbd className="rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[9px] text-slate-400 dark:border-white/10">
            ESC
          </kbd>
        </div>

        <div
          id="terminal-command-list"
          role="listbox"
          className="max-h-80 overflow-y-auto p-1.5"
        >
          {commands.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
              Tidak ada perintah. Coba BBCA GO atau HARMONIC.
            </p>
          ) : (
            commands.map((command, index) => (
              <button
                key={command.id}
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onClick={() => go(command)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition ${
                  index === active
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                    : "text-zinc-700 hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-white/[0.06]"
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="font-mono text-xs font-bold">
                    {command.label}
                  </span>
                  <span
                    className={`truncate text-[11px] ${
                      index === active
                        ? "text-white/70 dark:text-black/60"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {command.description}
                  </span>
                </span>
                {index === active && (
                  <CornerDownLeft className="h-3.5 w-3.5 shrink-0 opacity-70" />
                )}
              </button>
            ))
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 font-mono text-[9px] text-slate-400 dark:border-white/[0.06]">
          <span>BBCA GO · BBCA HP · BBCA HARM</span>
          <span>↑↓ navigasi · ↵ buka</span>
        </div>
      </div>
    </div>
  );
}
