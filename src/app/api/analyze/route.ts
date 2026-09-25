import { NextRequest, NextResponse } from "next/server";
import { SectorsClient } from "@/lib/sectors/client";
import { classifyInputAndExtractClaims } from "@/lib/agent/classifier";
import { executeEvidencePlan } from "@/lib/agent/coordinator";
import { synthesizeIntelligenceReport } from "@/lib/agent/synthesizer";
import { callOpenRouter } from "@/lib/agent/openrouter";
import { extractVisionDataWithGPT } from "@/lib/agent/vision";
import { AnalysisMode } from "@/lib/agent/types";
import { sectorsErrorMessage } from "@/lib/sectors/errors";
import {
  searchSemanticReportCache,
  upsertReportToVectorCache,
  getTodayWIB,
} from "@/lib/vector/qdrant";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body.prompt?.trim();
    const mode: AnalysisMode = body.mode === "quick" ? "quick" : "full";
    let confirmedSymbol = body.confirmedSymbol?.trim()?.toUpperCase()?.replace(".JK", "");
    const images: string[] = Array.isArray(body.images) ? body.images : [];

    if (!prompt && images.length === 0) {
      return NextResponse.json(
        { error: "Prompt atau gambar analisis tidak boleh kosong." },
        { status: 400 }
      );
    }

    // Step 0: Stage 1 Pipeline (Vision Extraction with GPT-4o-mini if images present)
    let visionContext = "";
    if (images.length > 0) {
      const visionResult = await extractVisionDataWithGPT(images, prompt);
      if (visionResult.detectedTicker && !confirmedSymbol) {
        confirmedSymbol = visionResult.detectedTicker;
      }
      visionContext = `[Temuan Visual Gambar via GPT-4o-mini (${visionResult.imageType})]:\n${visionResult.summary}\n${visionResult.extractedData}\n\n`;
    }

    const effectivePrompt = `${visionContext}${prompt || "Analisis data dari gambar terlampir."}`.trim();

    // Fast-path: Check semantic cache if confirmedSymbol is passed
    if (confirmedSymbol && /^[A-Z]{4}$/.test(confirmedSymbol)) {
      const cacheCheck = await searchSemanticReportCache(prompt, confirmedSymbol, 0.88, mode);
      if (cacheCheck.isMatch && cacheCheck.isFresh && cacheCheck.payload?.report) {
        return NextResponse.json({
          success: true,
          report: {
            ...cacheCheck.payload.report,
            fromVectorCache: true,
            cacheScore: Number(cacheCheck.score.toFixed(3)),
            cacheDate: cacheCheck.payload.capturedDate,
          },
        });
      }
    }

    // Step 1: Input Classification & Claim Extraction
    // Fast-path: Jika confirmedSymbol sudah valid dan prompt hanya berupa lookup emiten standar, bypass LLM classifier
    let classification: any;
    const isDirectLookup = confirmedSymbol && /^[A-Z]{4}$/.test(confirmedSymbol) && 
      (prompt.includes("Analisis komprehensif emiten") || prompt.trim() === confirmedSymbol);

    if (isDirectLookup) {
      classification = {
        symbol: confirmedSymbol,
        intent: "company_overview",
        isAmbiguous: false,
        claims: [],
        explanation: `Direct lookup for ${confirmedSymbol}`,
      };
    } else {
      classification = await classifyInputAndExtractClaims(effectivePrompt);
    }

    const targetSymbol = confirmedSymbol || classification.symbol;

    if (!targetSymbol || !/^[A-Z]{4}$/.test(targetSymbol)) {
      // Fallback Stage 2: Qwen Conversational Answer if no IDX stock ticker identified
      if (process.env.OPENROUTER_API_KEY) {
        const conversationalReply = await callOpenRouter<string>({
          systemPrompt: `Anda adalah Asisten Riset Kuantitatif Pasar Modal Indonesia (IDX).
Jawab pertanyaan pengguna atau bahas temuan dari gambar/grafik/tabel yang dilampirkan dengan ramah, profesional, analitis, dan berbasis edukasi investasi yang objektif.
Jika gambar menunjukkan grafik teknikal, broker summary, atau laporan keuangan tanpa kode ticker yang jelas, jelaskan pola data yang terlihat dan tawarkan pengguna untuk menyebutkan kode sahamnya agar data resmi bursa dapat ditarik.
DILARANG memberikan rekomendasi beli/jual ilegal (selalu sertakan disclaimer edukasi).`,
          userPrompt: `Pertanyaan Pengguna: "${prompt || "Tolong analisis gambar ini."}"\n\n${visionContext ? visionContext : ""}`,
          responseFormat: "text",
          temperature: 0.3,
        });

        return NextResponse.json({
          success: true,
          conversationalReply,
        });
      }

      return NextResponse.json(
        {
          needsConfirmation: true,
          candidateSymbol: classification.symbol || "",
          message: "Tidak dapat mendeteksi kode saham IDX 4 huruf secara pasti. Silakan konfirmasi kode saham.",
          classification,
        },
        { status: 200 }
      );
    }

    // Step 1b: Semantic Vector Cache Check with targetSymbol
    const cacheHit = await searchSemanticReportCache(prompt, targetSymbol, 0.88, mode);
    if (cacheHit.isMatch && cacheHit.isFresh && cacheHit.payload?.report) {
      return NextResponse.json({
        success: true,
        report: {
          ...cacheHit.payload.report,
          fromVectorCache: true,
          cacheScore: Number(cacheHit.score.toFixed(3)),
          cacheDate: cacheHit.payload.capturedDate,
        },
      });
    }

    // Step 2: Coordinator & Evidence Collection (Cache Miss / Stale Day)
    const sectorsClient = new SectorsClient();
    const evidence = await executeEvidencePlan(
      sectorsClient,
      targetSymbol,
      mode,
      classification.intent,
      classification.claims
    );

    // Step 3: Synthesis Guard & Final Report Generation
    const report = await synthesizeIntelligenceReport(
      evidence,
      effectivePrompt,
      mode,
      classification.intent,
      classification.claims
    );

    // Step 4: Asynchronously update Qdrant Vector Cache with today's capturedDate
    upsertReportToVectorCache(prompt, targetSymbol, report, mode).catch((err) => {
      console.warn("Failed to async upsert report to Qdrant:", err);
    });

    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    console.error("Error in /api/analyze:", error);
    return NextResponse.json(
      {
        error: sectorsErrorMessage(error),
        code: error?.kind || "analysis_error",
      },
      { status: 500 }
    );
  }
}
