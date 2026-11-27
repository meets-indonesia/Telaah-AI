/**
 * JII70 constituents snapshot, used as a conservative syariah filter.
 *
 * Source: Ajaib JII70 constituent pages, checked 2026-11-26. JII70 is a
 * syariah index; it is not the full OJK DES list. Update this snapshot when
 * the index review changes. Do not treat it as a fatwa or a live compliance
 * certificate.
 */
export const JII70_SYARIAH: ReadonlySet<string> = new Set([
  "AADI",
  "ACES",
  "ADMR",
  "ADRO",
  "AKRA",
  "ANTM",
  "ARCI",
  "AVIA",
  "BKSL",
  "BRIS",
  "BRMS",
  "BSDE",
  "BTPS",
  "BUMI",
  "CMRY",
  "CPIN",
  "CTRA",
  "DEWA",
  "DKFT",
  "DSNG",
  "ELSA",
  "ENRG",
  "ERAA",
  "ESSA",
  "EXCL",
  "HEAL",
  "HRTA",
  "HRUM",
  "ICBP",
  "IMPC",
  "INDF",
  "INDY",
  "INKP",
  "INTP",
  "ISAT",
  "ITMG",
  "JPFA",
  "JSMR",
  "KIJA",
  "KLBF",
  "KPIG",
  "LSIP",
  "MAPA",
  "MAPI",
  "MARK",
  "MBMA",
  "MDKA",
  "MEDC",
  "MIKA",
  "MTEL",
  "MYOR",
  "PGAS",
  "PTBA",
  "RAJA",
  "RATU",
  "SIDO",
  "SMGR",
  "SMRA",
  "SRTG",
  "SSIA",
  "TAPG",
  "TCPI",
  "TINS",
  "TKIM",
  "TLKM",
  "TOBA",
  "TPIA",
  "UNTR",
  "UNVR",
  "WIFI",
]);

export function isSyariah(symbol: string): boolean {
  return JII70_SYARIAH.has(symbol.trim().toUpperCase());
}

export function filterSyariah(symbols: string[]): string[] {
  return symbols.filter((symbol) => isSyariah(symbol));
}
