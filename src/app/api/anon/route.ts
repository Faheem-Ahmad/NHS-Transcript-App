import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const endpoint = process.env.AZURE_LANGUAGE_ENDPOINT!;
const key = process.env.AZURE_LANGUAGE_KEY!;
const apiVersion = process.env.AZURE_LANGUAGE_API_VERSION ?? "2022-05-01";

// helper: build masked text from offsets
type Span = { start: number; length: number };

function maskTextBySpans(
  original: string,
  spans: Span[],
  maskChar = "*"
): string {
  if (!spans.length) return original;
  // merge overlapping spans
  const sorted = [...spans]
    .sort((a, b) => a.start - b.start)
    .reduce<Span[]>((acc, s) => {
      if (acc.length === 0) return [s];
      const last = acc[acc.length - 1];
      const lastEnd = last.start + last.length;
      if (s.start <= lastEnd) {
        // overlap/adjacent → merge
        acc[acc.length - 1] = {
          start: last.start,
          length: Math.max(lastEnd, s.start + s.length) - last.start,
        };
      } else {
        acc.push(s);
      }
      return acc;
    }, []);

  let out = "";
  let cursor = 0;
  for (const s of sorted) {
    const end = s.start + s.length;
    out += original.slice(cursor, s.start);
    out += maskChar.repeat(Math.max(0, end - s.start));
    cursor = end;
  }
  out += original.slice(cursor);
  return out;
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();

  try {
    const bodyIn = await req.json();
    const {
      text,
      language = "en",
      redactLocationsAndOrgs = true,
    } = bodyIn || {};
    if (!text) {
      console.warn(`[anonymize][${requestId}] 400 Missing text`);
      return NextResponse.json(
        { error: "Missing text", requestId },
        { status: 400 }
      );
    }

    // 1) PII call
    const piiPayload = {
      kind: "PiiEntityRecognition",
      parameters: {
        modelVersion: "latest",
        stringIndexType: "Utf16CodeUnit",
        // omit piiCategories to include all supported PII
        // preview option:
        // redactionPolicy: { policyKind: "MaskWithEntityType" }
      },
      analysisInput: { documents: [{ id: "1", language, text }] },
    };

    const piiRes = await fetch(
      `${endpoint}/language/:analyze-text?api-version=${apiVersion}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": key,
        },
        body: JSON.stringify(piiPayload),
      }
    );

    const piiRaw = await piiRes.text();
    let piiData: any = null;
    try {
      piiData = piiRaw ? JSON.parse(piiRaw) : null;
    } catch {}
    if (!piiRes.ok) {
      const message =
        piiData?.error?.message ?? `Azure PII error (status ${piiRes.status})`;
      console.error(`[anonymize][${requestId}] PII error`, {
        status: piiRes.status,
        bodySample: piiRaw.slice(0, 500),
      });
      return NextResponse.json(
        {
          error: message,
          status: piiRes.status,
          requestId,
          azureError: piiData ?? piiRaw,
        },
        { status: piiRes.status }
      );
    }

    const piiDoc = piiData?.results?.documents?.[0];
    const piiEntities: any[] = Array.isArray(piiDoc?.entities)
      ? piiDoc.entities
      : [];

    // Collect spans from PII
    const spans: Span[] = [];
    for (const e of piiEntities) {
      if (typeof e.offset === "number" && typeof e.length === "number") {
        spans.push({ start: e.offset, length: e.length });
      }
    }

    // 2) Optional NER call (to catch Location and Organization)
    if (redactLocationsAndOrgs) {
      const nerPayload = {
        kind: "EntityRecognition",
        parameters: {
          modelVersion: "latest",
          stringIndexType: "Utf16CodeUnit",
        },
        analysisInput: { documents: [{ id: "1", language, text }] },
      };

      const nerRes = await fetch(
        `${endpoint}/language/:analyze-text?api-version=${apiVersion}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Ocp-Apim-Subscription-Key": key,
          },
          body: JSON.stringify(nerPayload),
        }
      );

      const nerRaw = await nerRes.text();
      let nerData: any = null;
      try {
        nerData = nerRaw ? JSON.parse(nerRaw) : null;
      } catch {}

      if (!nerRes.ok) {
        // Not fatal—just log and continue with PII-only
        console.warn(
          `[anonymize][${requestId}] NER error (continuing with PII only)`,
          {
            status: nerRes.status,
            bodySample: nerRaw.slice(0, 400),
          }
        );
      } else {
        const nerDoc = nerData?.results?.documents?.[0];
        const nerEntities: any[] = Array.isArray(nerDoc?.entities)
          ? nerDoc.entities
          : [];
        for (const e of nerEntities) {
          const cat = (e.category || "").toString();
          if (
            (cat === "Location" || cat === "Organization") &&
            typeof e.offset === "number" &&
            typeof e.length === "number"
          ) {
            spans.push({ start: e.offset, length: e.length });
          }
        }
      }
    }

    // 3) Build final redacted text (mask everything we collected)
    const redacted = maskTextBySpans(text, spans, "*");

    console.log(`[anonymize][${requestId}] success`, {
      elapsedMs: Date.now() - startedAt,
      piiEntities: piiEntities.length,
      totalSpans: spans.length,
      redactedLength: redacted.length,
    });

    return NextResponse.json({
      requestId,
      redactedText: redacted,
      // You may also return merged entity metadata if you like:
      entities: piiEntities, // (plus NER ones if you want to expose them)
    });
  } catch (e: any) {
    console.error(`[anonymize][${requestId}] 500`, {
      error: e?.message,
      stack: e?.stack,
    });
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", requestId },
      { status: 500 }
    );
  }
}
