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
  // Optional knobs you might add from the client later; safely ignored for fixed models
  temperature?: number;
  top_p?: number;
  // You can expose other OpenAI fields here if needed (e.g., max_tokens, presence_penalty, etc.)
};

const OPENAI_CHAT_COMPLETIONS_ENDPOINT =
  "https://api.openai.com/v1/chat/completions";

/**
 * Some GPT-5 variants (notably the flagship "gpt-5") do not support overriding sampling params.
 * If the model is fixed, we must NOT send temperature/top_p/etc.
 * Adjust this logic as OpenAI updates model capabilities.
 */
function isFixedSamplingModel(model: string): boolean {
  // Treat the flagship "gpt-5" as fixed. Variants like "gpt-5-mini" generally allow tuning.
  return model === "gpt-5";
  // return model === "gpt-5" || model === "gpt-5-mini";
}

/**
 * Build the request body while conditionally adding sampling params only when allowed.
 * Defaults:
 * - If client doesn't send temperature/top_p, we optionally set temperature=0.2 for tunable models.
 * - For fixed models, we omit them entirely.
 */
function buildRequestBody(body: IncomingBody, messages: ChatMessage[]) {
  const base: any = {
    model: body.model,
    messages,
  };

  if (!isFixedSamplingModel(body.model)) {
    // Use client-provided values if present; else a sensible default.
    if (typeof body.temperature === "number")
      base.temperature = body.temperature;
    else base.temperature = 0.2;

    if (typeof body.top_p === "number") base.top_p = body.top_p;
  }

  return base;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as IncomingBody;

    const API_KEY =
      process.env.OPENAI_API_KEY ||
      process.env.DEEPSEEK_API_KEY ||
      process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || // last resort for local demos only
      "YOUR_API_KEY_HERE";

    if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE") {
      return NextResponse.json(
        {
          ok: false,
          errorDetails: {
            message:
              "Missing API key on the server. Set OPENAI_API_KEY (or DEEPSEEK_API_KEY) in your environment.",
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
          errorDetails: {
            message: "Missing 'model' in request body.",
          },
        },
        { status: 400 }
      );
    }

    const systemPrompt = body.systemPrompt?.trim() || "";
    const userPrompt = body.userPrompt?.trim() || "(empty user prompt)";

    const messages: ChatMessage[] = [];
    if (systemPrompt.length > 0) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: userPrompt });

    const requestBody = buildRequestBody(body, messages);

    const res = await fetch(OPENAI_CHAT_COMPLETIONS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    const rawText = await res.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Non-JSON response, keep rawText for diagnostics
    }

    if (!res.ok) {
      // Construct rich error payload for your 4th textarea
      const errorDetails = {
        message:
          parsed?.error?.message ||
          parsed?.message ||
          res.statusText ||
          "Unknown API error",
        status: res.status,
        statusText: res.statusText,
        endpoint: OPENAI_CHAT_COMPLETIONS_ENDPOINT,
        responseHeaders: Object.fromEntries(res.headers.entries()),
        // Summarize the payload we sent without leaking full message content
        payloadSent: {
          model: requestBody.model,
          // Include knobs only if present
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
        { status: res.status }
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
    // Unexpected server-side exceptions with structured diagnostics
    const errorDetails = {
      message: err?.message || "Unhandled server error",
      stack: err?.stack,
      name: err?.name,
    };
    return NextResponse.json({ ok: false, errorDetails }, { status: 500 });
  }
}
