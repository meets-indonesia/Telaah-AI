"use client";

import React from "react";

interface MarkdownTextProps {
  content: string;
  className?: string;
  isUser?: boolean;
}

// Parses inline markdown: **bold**, *italic*, `code`
function renderInline(text: string, isUser: boolean, overrideClass?: string): React.ReactNode[] {
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong
          key={index}
          className={`font-bold ${
            overrideClass ? "text-inherit font-extrabold" : isUser ? "text-white font-extrabold" : "text-slate-900 dark:text-white"
          }`}
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em
          key={index}
          className={`italic ${
            overrideClass ? "text-inherit" : isUser ? "text-slate-200" : "text-slate-700 dark:text-slate-300"
          }`}
        >
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className={`font-mono text-xs px-1 py-0.5 rounded ${
            isUser
              ? "bg-slate-800 text-white"
              : "bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700"
          }`}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function parseMarkdownTable(lines: string[]): React.ReactNode | null {
  if (lines.length < 2) return null;

  // Header line
  const headerLine = lines[0].trim();
  const separatorLine = lines[1].trim();

  if (!headerLine.includes("|") || !separatorLine.includes("|") || !separatorLine.includes("-")) {
    return null;
  }

  const headers = headerLine
    .split("|")
    .map((c) => c.trim())
    .filter((c, i, arr) => (i === 0 && c === "" ? false : i === arr.length - 1 && c === "" ? false : true));

  const bodyLines = lines.slice(2);
  const rows = bodyLines
    .filter((l) => l.trim().includes("|"))
    .map((l) =>
      l
        .split("|")
        .map((c) => c.trim())
        .filter((c, i, arr) => (i === 0 && c === "" ? false : i === arr.length - 1 && c === "" ? false : true))
    );

  return (
    <div className="overflow-x-auto my-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#11141e]">
      <table className="w-full text-left text-xs divide-y divide-slate-200 dark:divide-slate-800 font-sans">
        <thead className="bg-slate-50 dark:bg-[#151926] text-[10px] font-mono uppercase text-slate-500 font-semibold">
          <tr>
            {headers.map((h, hIdx) => (
              <th key={hIdx} className="py-2 px-2.5 font-bold">
                {renderInline(h, false)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans text-xs">
          {rows.map((r, rIdx) => (
            <tr key={rIdx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
              {r.map((cell, cIdx) => (
                <td key={cIdx} className="py-2 px-2.5 text-slate-800 dark:text-slate-200 leading-snug">
                  {renderInline(cell, false)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({
  content,
  className = "",
  isUser = false,
}) => {
  if (!content) return null;

  // If message is from user, render with inline formatting
  if (isUser) {
    const lines = content.split("\n");
    return (
      <div className={`space-y-1 text-xs sm:text-[13px] leading-relaxed ${className}`}>
        {lines.map((line, idx) => (
          <p key={idx}>{renderInline(line, true)}</p>
        ))}
      </div>
    );
  }

  // Split by double line breaks into paragraphs / blocks
  const blocks = content.split(/\n\n+/);
  const textColorClass = className.includes("text-") ? "" : "text-slate-800 dark:text-slate-200";

  return (
    <div className={`space-y-2.5 text-xs sm:text-[13px] leading-relaxed ${textColorClass} ${className}`}>
      {blocks.map((block, bIdx) => {
        const lines = block.split("\n");

        // Check if markdown table (contains | and header separator ---)
        if (lines.length >= 2 && lines[0].includes("|") && lines[1].includes("|") && lines[1].includes("-")) {
          const tableNode = parseMarkdownTable(lines);
          if (tableNode) return <React.Fragment key={bIdx}>{tableNode}</React.Fragment>;
        }

        // Check if block is a horizontal rule (--- or ***)
        if (/^[-*_]{3,}$/.test(block.trim())) {
          return <hr key={bIdx} className="border-slate-200 dark:border-slate-800 my-2" />;
        }

        // Check if block is a bullet list (lines start with •, -, or *)
        const isList = lines.some((l) => /^[•\-*]\s+/.test(l.trim()));

        if (isList) {
          return (
            <ul key={bIdx} className="space-y-1.5 my-2">
              {lines.map((line, lIdx) => {
                const trimmed = line.trim();
                const bulletMatch = trimmed.match(/^[•\-*]\s+(.*)/);
                if (bulletMatch) {
                  return (
                    <li key={lIdx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                      <div className="flex-1 leading-relaxed">
                        {renderInline(bulletMatch[1], false)}
                      </div>
                    </li>
                  );
                }
                return (
                  <p key={lIdx} className="pl-3.5">
                    {renderInline(trimmed, false)}
                  </p>
                );
              })}
            </ul>
          );
        }

        // Heading detection
        const trimmedFirst = lines[0].trim();
        if (trimmedFirst.startsWith("###") || trimmedFirst.startsWith("##") || trimmedFirst.startsWith("#")) {
          return (
            <div
              key={bIdx}
              className="font-bold text-slate-900 dark:text-white text-sm pb-0.5 tracking-tight"
            >
              {renderInline(trimmedFirst.replace(/^#+\s+/, ""), false)}
            </div>
          );
        }

        // Normal paragraph
        return (
          <p key={bIdx} className="whitespace-normal">
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {renderInline(line, false, className)}
                {lIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
};
