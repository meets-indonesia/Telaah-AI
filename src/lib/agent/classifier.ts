import { callOpenRouter } from "./openrouter";
import { AtomicClaim, IntentType } from "./types";

export interface ClassificationResult {
  symbol: string;
  companyNameCandidate?: string;
  intent: IntentType;
  isAmbiguous: boolean;
  claims: AtomicClaim[];
  explanation: string;
}

export async function classifyInputAndExtractClaims(rawInput: string): Promise<ClassificationResult> {
  const systemPrompt = `Anda adalah "Input & Intent Interpreter" untuk Telaah 360, asisten riset pasar modal Indonesia (IDX).
Tugas Anda:
1. Identifikasi 1 kode saham IDX (4 huruf alfabet kapital, misal BBCA, BBRI, GOTO, TLKM, ASII, BREN, ADRO, AMMN).
   - Jika pengguna menyebut nama perusahaan (contoh: "Bank Central Asia", "Telkom"), konversikan ke simbol resminya.
   - Jika ada lebih dari 1 simbol, tentukan satu primary issuer yang paling dibahas. Jika sama sekali tidak ada ticker atau nama emiten yang jelas, set isAmbiguous: true.
2. Klasifikasikan intensitas/tipe input menjadi salah satu dari:
   - "claim_check": teks berisi rumor/klaim ("broker CC akumulasi", "laba naik 300%", "asing buang barang")
   - "news_event": teks berupa kutipan berita, pengumuman aksi korporasi, rights issue, dividen, tender offer
   - "company_overview": pertanyaan mendasar ("bagaimana fundamental BBCA?", "gimana bisnis GOTO?")
   - "thesis_review": hipotesis/tesis investasi jangka panjang ("saya rasa saham ini turnaround")
   - "market_technical": pertanyaan spesifik teknikal harga/volume ("apakah RSI oversold?", "breakout?")
3. Pisahkan klaim-klaim spesifik menjadi klaim atomik (AtomicClaim) maksimal 10 klaim:
   - Setiap klaim harus tunggal (jangan menggabungkan dua fakta dalam satu klaim).
   - Klasifikasikan tipenya: "financial", "flow", "price_technical", "event", "valuation", atau "general".
   - Tentukan targetMetric dan statedPeriod jika ada.

Jawab HANYA dalam format JSON valid dengan struktur:
{
  "symbol": "BBCA",
  "companyNameCandidate": "PT Bank Central Asia Tbk",
  "intent": "claim_check",
  "isAmbiguous": false,
  "claims": [
    {
      "id": "claim_1",
      "originalText": "Broker asing borong saham BBCA",
      "claimType": "flow",
      "targetMetric": "foreign_flow",
      "statedPeriod": "terkini"
    }
  ],
  "explanation": "Deteksi klaim arus dana asing pada emiten BBCA"
}`;

  const userPrompt = `Input pengguna:\n"""\n${rawInput.slice(0, 6000)}\n"""`;

  try {
    const result = await callOpenRouter<ClassificationResult>({
      systemPrompt,
      userPrompt,
      temperature: 0.1,
    });

    // Sanitasi simbol
    let sym = (result.symbol || "").toUpperCase().replace(".JK", "").trim();
    if (!/^[A-Z]{4}$/.test(sym)) {
      result.isAmbiguous = true;
    } else {
      result.symbol = sym;
    }

    if (!Array.isArray(result.claims)) {
      result.claims = [];
    }

    return result;
  } catch (error) {
    console.error("Error in classifyInputAndExtractClaims:", error);
    // Fallback regex detection
    const match = rawInput.match(/\b([A-Z]{4})\b/);
    return {
      symbol: match ? match[1] : "",
      companyNameCandidate: undefined,
      intent: "company_overview",
      isAmbiguous: !match,
      claims: [],
      explanation: "Fallback classification",
    };
  }
}
