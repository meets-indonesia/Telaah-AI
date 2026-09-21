"use client";

import React, { useState } from "react";

interface CompanyLogoProps {
  symbol: string;
  website?: string;
  companyName?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  xs: "w-4 h-4 text-[9px] rounded",
  sm: "w-6 h-6 text-[10px] rounded",
  md: "w-8 h-8 text-xs rounded-md",
  lg: "w-11 h-11 text-sm rounded-md",
  xl: "w-14 h-14 text-base rounded-lg",
};

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  symbol,
  website,
  companyName,
  size = "md",
  className = "",
}) => {
  const cleanSymbol = symbol.trim().toUpperCase().replace(".JK", "");
  const [sourceIndex, setSourceIndex] = useState(0);

  // Extract clean domain from website string
  let domain = "";
  if (website) {
    domain = website.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").replace(/^www\./i, "");
  }

  // Multi-tier logo URLs: 1. Stockbit IDX CDN, 2. Google High-Res Favicon, 3. Fallback Monogram
  const sources = [
    `https://assets.stockbit.com/logos/companies/${cleanSymbol}.png`,
    domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null,
  ].filter(Boolean) as string[];

  const handleImageError = () => {
    setSourceIndex((prev) => prev + 1);
  };

  const currentSrc = sources[sourceIndex];

  // If all image sources fail, show an institutional monogram badge
  if (!currentSrc || sourceIndex >= sources.length) {
    return (
      <div
        className={`bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center font-mono font-bold text-slate-800 dark:text-slate-100 shrink-0 select-none ${sizeClasses[size]} ${className}`}
        title={companyName || cleanSymbol}
      >
        {cleanSymbol.slice(0, 4)}
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-2xs ${sizeClasses[size]} ${className}`}
      title={companyName || cleanSymbol}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={currentSrc}
        alt={`${cleanSymbol} logo`}
        onError={handleImageError}
        className="w-full h-full object-contain"
        loading="lazy"
      />
    </div>
  );
};
