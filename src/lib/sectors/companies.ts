import companiesData from "@/data/idx-companies.json";

export interface IDXCompany {
  symbol: string;
  name: string;
}

const companies: IDXCompany[] = companiesData as IDXCompany[];

/**
 * Mencari emiten berdasarkan kode saham atau nama perusahaan
 */
export function searchEmiten(query: string, limit = 8): IDXCompany[] {
  if (!query || !query.trim()) return [];
  const q = query.trim().toUpperCase();
  const qLower = query.trim().toLowerCase();

  const exactSymbol: IDXCompany[] = [];
  const startsWithSymbol: IDXCompany[] = [];
  const containsSymbol: IDXCompany[] = [];
  const exactNameStart: IDXCompany[] = [];
  const nameMatches: IDXCompany[] = [];

  for (const c of companies) {
    const sym = c.symbol.toUpperCase();
    const nameLow = c.name.toLowerCase();

    if (sym === q) {
      exactSymbol.push(c);
    } else if (sym.startsWith(q)) {
      startsWithSymbol.push(c);
    } else if (sym.includes(q)) {
      containsSymbol.push(c);
    } else if (nameLow.startsWith(qLower) || nameLow.includes(" " + qLower)) {
      exactNameStart.push(c);
    } else if (nameLow.includes(qLower)) {
      nameMatches.push(c);
    }
  }

  const results = [
    ...exactSymbol,
    ...startsWithSymbol,
    ...exactNameStart,
    ...containsSymbol,
    ...nameMatches,
  ];

  return results.slice(0, limit);
}

/**
 * Mengambil nama perusahaan dari kode emiten
 */
export function getCompanyName(symbol: string): string | undefined {
  if (!symbol) return undefined;
  const clean = symbol.toUpperCase().trim();
  const found = companies.find((c) => c.symbol.toUpperCase() === clean);
  return found?.name;
}
