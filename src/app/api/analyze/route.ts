import { NextRequest, NextResponse } from "next/server";
import { SectorsClient } from "@/lib/sectors/client";
import { classifyInputAndExtractClaims } from "@/lib/agent/classifier";
import { executeEvidencePlan } from "@/lib/agent/coordinator";
import { synthesizeIntelligenceReport } from "@/lib/agent/synthesizer";
import { AnalysisMode } from "@/lib/agent/types";
import { sectorsErrorMessage } from "@/lib/sectors/errors";

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

    // Step 1: Input Classification & Claim Extraction
    const classification = await classifyInputAndExtractClaims(prompt);

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

    // Step 2: Coordinator & Evidence Collection
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
