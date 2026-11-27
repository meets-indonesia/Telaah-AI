export interface TerminalCommand {
  id: string;
  label: string;
  description: string;
  href: string;
  keywords: string[];
}

const FUNCTIONS: TerminalCommand[] = [
  {
    id: "terminal",
    label: "Terminal",
    description: "AI research terminal",
    href: "/",
    keywords: ["terminal", "chat", "ai", "research"],
  },
  {
    id: "chart",
    label: "Chart",
    description: "Price, volume, harmonic overlay",
    href: "/chart",
    keywords: ["chart", "grafik", "harga", "price"],
  },
  {
    id: "harmonic",
    label: "Harmonic Scanner",
    description: "PRZ, XABCD, swing 1D/1W",
    href: "/harmonic",
    keywords: ["harmonic", "pattern", "prz", "swing"],
  },
  {
    id: "screener",
    label: "Screener",
    description: "Valuation, trend, flow filters",
    href: "/screener",
    keywords: ["screener", "filter", "valuasi"],
  },
  {
    id: "portfolio",
    label: "Portfolio",
    description: "Holdings, P&L, dividend calendar",
    href: "/portfolio",
    keywords: ["portfolio", "holding", "dividend", "dividen"],
  },
  {
    id: "watchlist",
    label: "Watchlist",
    description: "Saved symbols and alerts",
    href: "/watchlist",
    keywords: ["watchlist", "alert"],
  },
];

function cleanQuery(raw: string): string {
  return raw.trim().toUpperCase().replace(/^[>/]\s*/, "");
}

export function parseTerminalQuery(raw: string): TerminalCommand | null {
  const query = cleanQuery(raw);
  if (!query) return null;

  const symbolMatch = query.match(/^([A-Z]{4})(?:\s+(GO|HP|HARM|HARMONIC|CHART))?$/);
  if (symbolMatch) {
    const symbol = symbolMatch[1];
    const fn = symbolMatch[2] ?? "GO";
    if (fn === "HP") {
      return {
        id: `${symbol}:hp`,
        label: `${symbol} HP`,
        description: "Historical price · 1Y",
        href: `/chart?symbol=${symbol}&tf=1Y`,
        keywords: [symbol, "hp", "historical"],
      };
    }
    if (fn === "HARM" || fn === "HARMONIC") {
      return {
        id: `${symbol}:harmonic`,
        label: `${symbol} HARM`,
        description: "Harmonic overlay · 1M",
        href: `/chart?symbol=${symbol}&tf=1Y&htf=1M`,
        keywords: [symbol, "harmonic", "prz"],
      };
    }
    return {
      id: `${symbol}:go`,
      label: `${symbol} GO`,
      description: "Open chart",
      href: `/chart?symbol=${symbol}`,
      keywords: [symbol, "chart", "go"],
    };
  }

  const fn = FUNCTIONS.find(
    (item) =>
      item.id === query.toLowerCase() ||
      item.label.toUpperCase() === query ||
      item.keywords.includes(query.toLowerCase())
  );
  return fn ?? null;
}

export function terminalCommands(
  raw: string,
  companies: Array<{ symbol: string; name: string }>
): TerminalCommand[] {
  const query = cleanQuery(raw);
  const commands: TerminalCommand[] = [];
  const exact = parseTerminalQuery(raw);
  if (exact) commands.push(exact);

  for (const company of companies) {
    const command: TerminalCommand = {
      id: `symbol:${company.symbol}`,
      label: `${company.symbol} GO`,
      description: company.name,
      href: `/chart?symbol=${company.symbol}`,
      keywords: [company.symbol, company.name],
    };
    if (!commands.some((item) => item.href === command.href)) {
      commands.push(command);
    }
  }

  const needle = query.toLowerCase();
  for (const fn of FUNCTIONS) {
    if (
      !needle ||
      fn.label.toLowerCase().includes(needle) ||
      fn.keywords.some((keyword) => keyword.includes(needle))
    ) {
      if (!commands.some((item) => item.href === fn.href)) {
        commands.push(fn);
      }
    }
  }

  return commands.slice(0, 8);
}
