export type SectorsErrorKind =
  | "subscription_not_allowed"
  | "invalid_key"
  | "not_found"
  | "rate_limited"
  | "provider_error"
  | "validation_error";

export class SectorsApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly kind: SectorsErrorKind = classifySectorsError(status, code)
  ) {
    super(message);
    this.name = "SectorsApiError";
  }
}

export function classifySectorsError(status: number, code = ""): SectorsErrorKind {
  if (status === 401 && code === "SUBSCRIPTION_DOES_NOT_ALLOW") return "subscription_not_allowed";
  if (status === 401) return "invalid_key";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "provider_error";
  return "validation_error";
}

export function sectorsErrorMessage(error: unknown): string {
  if (!(error instanceof SectorsApiError)) {
    return "Data provider Sectors API tidak dapat diakses.";
  }

  switch (error.kind) {
    case "subscription_not_allowed":
      return "Subscription Sectors API saat ini tidak mengizinkan endpoint yang dibutuhkan. Periksa plan/workspace/API key Sectors.";
    case "invalid_key":
      return "API key Sectors tidak valid atau tidak diterima oleh provider.";
    case "not_found":
      return "Emiten atau data yang diminta tidak ditemukan di Sectors API.";
    case "rate_limited":
      return "Batas request Sectors API tercapai. Coba lagi setelah cooldown.";
    case "provider_error":
      return "Sectors API sedang mengalami gangguan sementara.";
    default:
      return "Parameter request ke Sectors API tidak valid.";
  }
}
