// app/api/chat/route.ts
import { NextResponse } from "next/server";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type IncomingBody = {
  model: string;
  systemPrompt?: string;
  userPrompt?: string;
  // Optional knobs from client; sent only if supported by the chosen model.
  temperature?: number;
  top_p?: number;
};

const OPENAI_CHAT_COMPLETIONS_ENDPOINT =
  "https://api.openai.com/v1/chat/completions";

// ---- Capability helpers ----

// Models you intend to use with the Chat Completions endpoint:
const SUPPORTED_MODELS = new Set([
  "gpt-4",
  "gpt-4.1",
  "gpt-4o",
  "gpt-5",
  "gpt-5-mini",
]);

/**
 * Models that DO NOT allow custom sampling params (treat as fixed).
 * Based on your error, gpt-5-mini must use default temperature (1) and should not
 * receive temperature/top_p at all. Same for gpt-5.
 */
function isFixedSamplingModel(model: string): boolean {
  return model === "gpt-5" || model === "gpt-5-mini";
}

/**
 * Models that allow temperature overrides.
 * Exclude gpt-5 and gpt-5-mini.
 */
function supportsTemperature(model: string): boolean {
  return !isFixedSamplingModel(model);
}

/**
 * Models that allow top_p.
 * Be conservative: exclude gpt-5 and gpt-5-mini unless you confirm otherwise.
 */
function supportsTopP(model: string): boolean {
  return !isFixedSamplingModel(model);
}

function clamp(num: number, min: number, max: number) {
  return Math.min(Math.max(num, min), max);
}

/**
 * Build request body — only send knobs the model supports AND only if the client provided them.
 * (No auto-defaults that could violate fixed models.)
 */
function buildRequestBody(body: IncomingBody, messages: ChatMessage[]) {
  const base: Record<string, any> = {
    model: body.model,
    messages,
  };

  if (supportsTemperature(body.model) && typeof body.temperature === "number") {
    base.temperature = clamp(body.temperature, 0, 2);
  }
  if (supportsTopP(body.model) && typeof body.top_p === "number") {
    base.top_p = clamp(body.top_p, 0, 1);
  }

  return base;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as IncomingBody;

    const API_KEY = process.env.OPENAI_API_KEY;
    if (!API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          errorDetails: {
            message:
              "Missing API key on the server. Set OPENAI_API_KEY in your environment.",
          },
        },
        { status: 500 }
      );
    }

    const model = (body.model || "").trim();
    if (!model) {
      return NextResponse.json(
        {
          ok: false,
          errorDetails: { message: "Missing 'model' in request body." },
        },
        { status: 400 }
      );
    }

    if (!SUPPORTED_MODELS.has(model)) {
      return NextResponse.json(
        {
          ok: false,
          errorDetails: {
            message: `Model '${model}' is not enabled by this route.`,
            supported: Array.from(SUPPORTED_MODELS),
          },
        },
        { status: 400 }
      );
    }

    const systemPrompt = body.systemPrompt?.trim() || "";
    const userPrompt = body.userPrompt?.trim() || "(empty user prompt)";

    const messages: ChatMessage[] = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: userPrompt });

    const requestBody = buildRequestBody(body, messages);

    // Timeout guard to avoid network hangs showing as "Failed to fetch" on the client
    const controller = new AbortController();
    const timeoutMs = 60_000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(OPENAI_CHAT_COMPLETIONS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      return NextResponse.json(
        {
          ok: false,
          errorDetails: {
            message:
              fetchErr?.name === "AbortError"
                ? `Upstream request timed out after ${timeoutMs} ms`
                : fetchErr?.message || "Upstream fetch failed",
            name: fetchErr?.name,
          },
        },
        { status: 504 }
      );
    } finally {
      clearTimeout(timeout);
    }

    const rawText = await upstreamRes.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // keep rawText for diagnostics
    }

    if (!upstreamRes.ok) {
      const errorDetails = {
        message:
          parsed?.error?.message ||
          parsed?.message ||
          upstreamRes.statusText ||
          "Unknown API error",
        status: upstreamRes.status,
        statusText: upstreamRes.statusText,
        endpoint: OPENAI_CHAT_COMPLETIONS_ENDPOINT,
        responseHeaders: Object.fromEntries(upstreamRes.headers.entries()),
        payloadSent: {
          model: requestBody.model,
          ...(typeof requestBody.temperature !== "undefined" && {
            temperature: requestBody.temperature,
          }),
          ...(typeof requestBody.top_p !== "undefined" && {
            top_p: requestBody.top_p,
          }),
          messagesSummary: messages.map((m, i) => ({
            index: i,
            role: m.role,
            length: m.content.length,
          })),
        },
        parsedError: parsed || undefined,
        rawResponse: !parsed ? rawText : undefined,
      };

      return NextResponse.json(
        { ok: false, errorDetails },
        { status: upstreamRes.status }
      );
    }

    const content =
      parsed?.choices?.[0]?.message?.content ??
      parsed?.choices?.[0]?.delta?.content ??
      "";

    return NextResponse.json(
      {
        ok: true,
        content,
        usage: parsed?.usage,
        model: parsed?.model,
        raw: parsed,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        errorDetails: {
          message: err?.message || "Unhandled server error",
          name: err?.name,
          stack: err?.stack,
        },
      },
      { status: 500 }
    );
  }
}
