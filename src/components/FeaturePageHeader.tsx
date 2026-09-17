import type { LucideIcon } from "lucide-react";

interface FeaturePageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  activeSymbol: string;
  symbols: string[];
  onSelectSymbol: (symbol: string) => void;
}

export function FeaturePageHeader({
  icon: Icon,
  title,
  description,
  activeSymbol,
  symbols,
  onSelectSymbol,
}: FeaturePageHeaderProps) {
  return (
    <section className="surface dark:!border-slate-800 dark:!bg-[#0f172a] p-5 sm:p-6" aria-labelledby="feature-title">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5">
        <div className="max-w-2xl">
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 flex items-center justify-center mb-4">
            <Icon className="w-5 h-5" aria-hidden="true" />
          </div>
          <h1 id="feature-title" className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Pilih emiten untuk dianalisis</p>
          <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Pilih emiten">
            {symbols.map((symbol) => (
              <button
                key={symbol}
                type="button"
                onClick={() => onSelectSymbol(symbol)}
                aria-pressed={activeSymbol === symbol}
                className={`min-h-9 px-3 rounded-lg text-xs font-mono font-bold transition-colors ${
                  activeSymbol === symbol
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
                }`}
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
