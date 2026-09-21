import { NextRequest, NextResponse } from "next/server";
import { SectorsClient } from "@/lib/sectors/client";
import { classifyInputAndExtractClaims } from "@/lib/agent/classifier";
import { executeEvidencePlan } from "@/lib/agent/coordinator";
import { synthesizeIntelligenceReport } from "@/lib/agent/synthesizer";
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
    const confirmedSymbol = body.confirmedSymbol?.trim()?.toUpperCase()?.replace(".JK", "");

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt atau teks analisis tidak boleh kosong." },
        { status: 400 }
      );
    }

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
      classification = await classifyInputAndExtractClaims(prompt);
    }

    const targetSymbol = confirmedSymbol || classification.symbol;

    if (!targetSymbol || !/^[A-Z]{4}$/.test(targetSymbol)) {
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
      prompt,
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
