"use client";

import React from "react";

interface MarkdownTextProps {
  content: string;
  className?: string;
  isUser?: boolean;
}

// Parses inline markdown: **bold**, *italic*, `code`
function renderInline(text: string, isUser: boolean): React.ReactNode[] {
  // Regex matches **bold**, *italic*, `code`
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong
          key={index}
          className={`font-bold ${isUser ? "text-white font-extrabold" : "text-slate-900 dark:text-white"
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
          className={`italic ${isUser ? "text-brand-100" : "text-slate-700 dark:text-slate-300"
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
          className={`font-mono text-xs px-1.5 py-0.5 rounded ${isUser
              ? "bg-brand-700 text-white"
              : "bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400 border border-slate-200 dark:border-slate-700"
            }`}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
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

  return (
    <div className={`space-y-2.5 text-xs sm:text-[13px] leading-relaxed text-slate-800 dark:text-slate-200 ${className}`}>
      {blocks.map((block, bIdx) => {
        const lines = block.split("\n");

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
                    <li key={lIdx} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0 mt-2" />
                      <div className="flex-1 leading-relaxed">
                        {renderInline(bulletMatch[1], false)}
                      </div>
                    </li>
                  );
                }
                return (
                  <p key={lIdx} className="pl-4">
                    {renderInline(trimmed, false)}
                  </p>
                );
              })}
            </ul>
          );
        }

        // Check if callout box (starts with 💡 or ⚠️ or 📌)
        const isCallout =
          block.trim().startsWith("💡") ||
          block.trim().startsWith("⚠️") ||
          block.trim().startsWith("📌");

        if (isCallout) {
          return (
            <div
              key={bIdx}
              className="p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20 text-slate-800 dark:text-amber-200/95 text-xs my-2 leading-relaxed"
            >
              {lines.map((l, lIdx) => (
                <div key={lIdx}>{renderInline(l, false)}</div>
              ))}
            </div>
          );
        }

        // Heading detection
        const trimmedFirst = lines[0].trim();
        const isHeading =
          trimmedFirst.startsWith("✨") ||
          trimmedFirst.startsWith("###") ||
          trimmedFirst.startsWith("##");

        if (isHeading && lines.length === 1) {
          return (
            <div
              key={bIdx}
              className="font-bold text-slate-900 dark:text-white text-sm sm:text-[14px] pb-0.5 tracking-tight"
            >
              {renderInline(trimmedFirst.replace(/^###\s+|^##\s+/, ""), false)}
            </div>
          );
        }

        // Normal paragraph
        return (
          <p key={bIdx} className="whitespace-normal">
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {renderInline(line, false)}
                {lIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
};
