// app/api/anonymize/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// ENV: set these in .env.local
// AZURE_LANGUAGE_ENDPOINT=https://<yourname>.cognitiveservices.azure.com
// AZURE_LANGUAGE_KEY=<your-key>
// AZURE_LANGUAGE_API_VERSION=2022-05-01  (or a preview like 2024-11-15-preview)
const endpoint = process.env.AZURE_LANGUAGE_ENDPOINT!;
const key = process.env.AZURE_LANGUAGE_KEY!;
const apiVersion = process.env.AZURE_LANGUAGE_API_VERSION ?? "2022-05-01";

type Span = { start: number; length: number };

// ------------ helpers ------------
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

function normalizeName(s: string) {
  // lower-case, drop possessive, strip punctuation, keep letters/digits/spaces
  return s
    .toLowerCase()
    .replace(/['’]s\b/g, "") // emma’s -> emma
    .replace(/[^\p{L}\p{N}\s]/gu, "") // remove punctuation
    .trim();
}

function isAllowedPerson(text: string, allowSet: Set<string>) {
  if (!text) return false;
  const norm = normalizeName(text);
  if (!norm) return false;
  if (allowSet.has(norm)) return true;
  // also allow if ANY token is in the allow-list (helps with "david smith")
  for (const tok of norm.split(/\s+/)) {
    if (allowSet.has(tok)) return true;
  }
  return false;
}

// ------------ route ------------
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const t0 = Date.now();

  try {
    const bodyIn = await req.json();
    const {
      text,
      language = "en",
      redactLocationsAndOrgs = true, // also remove cities/hospitals/wards via NER
      keepDates = true, // keep all DateTime values visible
      allowNames = [], // names to KEEP if tagged as Person
    } = bodyIn || {};

    if (!text) {
      return NextResponse.json(
        { error: "Missing text", requestId },
        { status: 400 }
      );
    }

    // Build allow-list set (case-insensitive, normalized)
    const allowSet = new Set(
      Array.isArray(allowNames)
        ? allowNames.map(String).map(normalizeName).filter(Boolean)
        : []
    );

    // --- 1) PII: detect all PII (we'll decide which to mask)
    const piiPayload = {
      kind: "PiiEntityRecognition",
      parameters: {
        modelVersion: "latest",
        stringIndexType: "Utf16CodeUnit",
        // Tip: with preview API you could add redactionPolicy, but we still use spans so we can keep dates + allow-list:
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
      const msg =
        piiData?.error?.message ?? `Azure PII error (status ${piiRes.status})`;
      return NextResponse.json(
        {
          error: msg,
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

    // Spans to mask (start/length). Apply rules: keepDates, allow-list for Person
    const spans: Span[] = [];
    for (const e of piiEntities) {
      const cat = String(e?.category ?? "");
      const isDate = cat === "DateTime";
      const isPerson = cat === "Person";

      if (keepDates && isDate) continue; // keep dates visible
      if (
        isPerson &&
        allowSet.size &&
        isAllowedPerson(e.text ?? "", allowSet)
      ) {
        // don't mask allowed person names
        continue;
      }
      if (typeof e.offset === "number" && typeof e.length === "number") {
        spans.push({ start: e.offset, length: e.length });
      }
    }

    // --- 2) (Optional) NER for Location/Organization (cities, hospitals, wards, etc.)
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
        // not fatal; continue with PII-only spans
        console.warn(`[anonymize][${requestId}] NER error; continuing`, {
          status: nerRes.status,
          sample: nerRaw.slice(0, 400),
        });
      } else {
        const nerDoc = nerData?.results?.documents?.[0];
        const nerEntities: any[] = Array.isArray(nerDoc?.entities)
          ? nerDoc.entities
          : [];
        for (const e of nerEntities) {
          const cat = String(e?.category ?? "");
          // Optionally also skip allowed persons if NER returns Person
          if (
            cat === "Person" &&
            allowSet.size &&
            isAllowedPerson(e.text ?? "", allowSet)
          ) {
            continue;
          }
          if (
            (cat === "Location" ||
              cat === "Organization" ||
              cat === "Person") &&
            typeof e.offset === "number" &&
            typeof e.length === "number"
          ) {
            spans.push({ start: e.offset, length: e.length });
          }
        }
      }
    }

    // --- 3) Build final redacted text
    const redactedText = maskTextBySpans(text, spans, "*");

    // Minimal server log (no PII)
    console.log(`[anonymize][${requestId}] ok`, {
      tookMs: Date.now() - t0,
      piiEntities: piiEntities.length,
      totalSpans: spans.length,
      keepDates,
      allowNamesCount: allowSet.size,
      redactLocationsAndOrgs,
    });

    return NextResponse.json({
      requestId,
      tookMs: Date.now() - t0,
      redactedText,
      entities: piiEntities, // you can also add NER entities if you want to display them
    });
  } catch (err: any) {
    console.error(`[anonymize][${requestId}] 500`, {
      message: err?.message,
      stack: err?.stack,
    });
    return NextResponse.json(
      { error: err?.message ?? "Unknown error", requestId },
      { status: 500 }
    );
  }
}
