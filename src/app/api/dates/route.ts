import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const endpoint = process.env.AZURE_LANGUAGE_ENDPOINT!;
const key = process.env.AZURE_LANGUAGE_KEY!;
const apiVersion = process.env.AZURE_LANGUAGE_API_VERSION ?? "2022-05-01";

type Span = { start: number; length: number };

function maskTextBySpans(
  original: string,
  spans: Span[],
  maskChar = "*"
): string {
  if (!spans.length) return original;

  // merge overlapping/adjacent spans
  const merged = [...spans]
    .sort((a, b) => a.start - b.start)
    .reduce<Span[]>((acc, s) => {
      if (!acc.length) return [s];
      const last = acc[acc.length - 1];
      const lastEnd = last.start + last.length;
      const sEnd = s.start + s.length;
      if (s.start <= lastEnd) {
        acc[acc.length - 1] = {
          start: last.start,
          length: Math.max(lastEnd, sEnd) - last.start,
        };
      } else {
        acc.push(s);
      }
      return acc;
    }, []);

  let out = "";
  let i = 0;
  for (const s of merged) {
    out += original.slice(i, s.start);
    out += maskChar.repeat(Math.max(0, s.length));
    i = s.start + s.length;
  }
  out += original.slice(i);
  return out;
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const t0 = Date.now();

  try {
    const bodyIn = await req.json();
    const {
      text,
      language = "en",
      redactLocationsAndOrgs = true,
      keepDates = true, // <— NEW: keep dates visible by default
    } = bodyIn || {};

    if (!text) {
      return NextResponse.json(
        { error: "Missing text", requestId },
        { status: 400 }
      );
    }

    // --- 1) PII (detect everything; we’ll decide what to mask)
    const piiPayload = {
      kind: "PiiEntityRecognition",
      parameters: {
        modelVersion: "latest",
        stringIndexType: "Utf16CodeUnit",
        // NOTE: we intentionally omit piiCategories to let service detect all PII
        // If you switch to preview API + redactionPolicy, still keep spans-based masking below
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
      return NextResponse.json(
        {
          error:
            piiData?.error?.message ??
            `Azure PII error (status ${piiRes.status})`,
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

    // Build spans from PII, optionally skipping dates
    const spans: Span[] = [];
    for (const e of piiEntities) {
      const cat = (e?.category ?? "").toString();
      const isDate = cat === "DateTime"; // Azure PII uses "DateTime" for dates (incl. DOB)
      if (keepDates && isDate) continue; // <— skip masking dates
      if (typeof e.offset === "number" && typeof e.length === "number") {
        spans.push({ start: e.offset, length: e.length });
      }
    }

    // --- 2) NER pass for Location/Organization (to catch cities & hospitals/wards)
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

      if (nerRes.ok) {
        const nerDoc = nerData?.results?.documents?.[0];
        const nerEntities: any[] = Array.isArray(nerDoc?.entities)
          ? nerDoc.entities
          : [];
        for (const e of nerEntities) {
          const cat = (e?.category ?? "").toString();
          if (
            (cat === "Location" || cat === "Organization") &&
            typeof e.offset === "number" &&
            typeof e.length === "number"
          ) {
            spans.push({ start: e.offset, length: e.length });
          }
        }
      } else {
        // non-fatal; continue with what we have
        console.warn(`[anonymize][${requestId}] NER error; continuing`, {
          status: nerRes.status,
          bodySample: nerRaw.slice(0, 400),
        });
      }
    }

    // --- 3) Build final redacted text
    const redactedText = maskTextBySpans(text, spans, "*");

    return NextResponse.json({
      requestId,
      tookMs: Date.now() - t0,
      redactedText,
      entities: piiEntities, // (you can add NER entities too if you want to inspect)
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown error", requestId },
      { status: 500 }
    );
  }
}
