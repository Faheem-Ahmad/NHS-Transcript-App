// app/api/anonymize/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const endpoint = process.env.AZURE_LANGUAGE_ENDPOINT!;
const key = process.env.AZURE_LANGUAGE_KEY!;
const apiVersion = process.env.AZURE_LANGUAGE_API_VERSION ?? "2022-05-01";

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();

  try {
    const { text, language = "en" } = await req.json();

    if (!text) {
      console.warn(`[anonymize][${requestId}] 400 Missing text`);
      return NextResponse.json(
        { error: "Missing text", requestId },
        { status: 400 }
      );
    }

    // Never log PII. Log only metadata.
    console.log(`[anonymize][${requestId}] start`, {
      endpoint,
      apiVersion,
      language,
      textLength: text.length,
    });

    const body: any = {
      kind: "PiiEntityRecognition",
      parameters: {
        modelVersion: "latest",
        stringIndexType: "Utf16CodeUnit",
        /* piiCategories: [
          "Person",
          "Organization",
          "Location",
          "Email",
          "PhoneNumber",
        ], */
        // preview option:
        // redactionPolicy: { policyKind: "MaskWithEntityType" }
      },
      analysisInput: {
        documents: [{ id: "1", language, text }],
      },
    };

    const res = await fetch(
      `${endpoint}/language/:analyze-text?api-version=${apiVersion}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": key,
        },
        body: JSON.stringify(body),
      }
    );

    const elapsedMs = Date.now() - startedAt;

    // Try to parse JSON; fall back to raw text for diagnostics
    const raw = await res.text();
    let data: any = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      /* keep raw */
    }

    if (!res.ok) {
      console.error(`[anonymize][${requestId}] Azure error`, {
        status: res.status,
        elapsedMs,
        bodySample: raw?.slice(0, 500),
      });
      // Normalize Azure error shape into something the client can display
      const message =
        data?.error?.message ??
        data?.message ??
        `Azure Language API error (status ${res.status})`;

      return NextResponse.json(
        {
          error: message,
          status: res.status,
          requestId,
          azureError: data?.error ?? data ?? raw,
        },
        { status: res.status }
      );
    }

    const doc = data?.results?.documents?.[0];
    console.log(`[anonymize][${requestId}] success`, {
      elapsedMs,
      entities: Array.isArray(doc?.entities) ? doc.entities.length : 0,
      redactedLength: (doc?.redactedText ?? "").length,
    });

    return NextResponse.json({
      requestId,
      redactedText: doc?.redactedText ?? "",
      entities: doc?.entities ?? [],
    });
  } catch (e: any) {
    const elapsedMs = Date.now() - startedAt;
    console.error(`[anonymize][${requestId}] 500`, {
      elapsedMs,
      error: e?.message,
      stack: e?.stack,
    });
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", requestId },
      { status: 500 }
    );
  }
}
