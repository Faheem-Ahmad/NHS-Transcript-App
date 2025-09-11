import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// ENV you need in .env.local:
// AZURE_OPENAI_ENDPOINT=https://<your-openai>.openai.azure.com
// AZURE_OPENAI_API_KEY=<your-openai-key>
// AZURE_OPENAI_DEPLOYMENT=<your-deployment-name>   // e.g., gpt-4o-mini
// AZURE_OPENAI_API_VERSION=2024-08-01-preview      // or the one you use
const aoaiEndpoint = process.env.AZURE_OPENAI_ENDPOINT!;
const aoaiKey = process.env.AZURE_OPENAI_API_KEY!;
const aoaiDeployment = process.env.AZURE_OPENAI_DEPLOYMENT!;
const aoaiApiVersion =
  process.env.AZURE_OPENAI_API_VERSION ?? "2024-08-01-preview";

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const t0 = Date.now();

  try {
    const {
      redactedText,
      system = "You are a Psychiatrist. Rewritte the interview trascript as indirect speech as a psychiatrist would write in a clinical note. Do not attempt to restore any identifying details. Keep any tokens like «PERSON_1» exactly as given.",
      temperature = 0.2,
    } = await req.json();

    if (!redactedText || typeof redactedText !== "string") {
      return NextResponse.json(
        { error: "Missing redactedText", requestId },
        { status: 400 }
      );
    }

    // IMPORTANT: do not log raw text; just metadata
    // console.log(`[openai][${requestId}] start`, { len: redactedText.length });

    const body = {
      messages: [
        { role: "system", content: system },
        { role: "user", content: redactedText },
      ],
      temperature,
      // You can add max_tokens if you want a hard cap:
      // max_tokens: 1200,
    };

    const res = await fetch(
      `${aoaiEndpoint}/openai/deployments/${aoaiDeployment}/chat/completions?api-version=${aoaiApiVersion}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": aoaiKey,
        },
        body: JSON.stringify(body),
      }
    );

    const raw = await res.text();
    let data: any = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {}

    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            data?.error?.message ?? `Azure OpenAI error (status ${res.status})`,
          status: res.status,
          requestId,
          azureError: data ?? raw,
        },
        { status: res.status }
      );
    }

    const content = data?.choices?.[0]?.message?.content ?? "";
    // console.log(`[openai][${requestId}] ok`, { tookMs: Date.now() - t0, outLen: content.length });

    return NextResponse.json({
      requestId,
      tookMs: Date.now() - t0,
      content,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown error", requestId },
      { status: 500 }
    );
  }
}
