import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const { systemPrompt, transcript } = await req.json();

    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;

    if (!endpoint || !apiKey || !deployment) {
      throw new Error("Missing Azure OpenAI configuration");
    }

    const response = await axios.post(
      `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-05-01`,
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
      }
    );

    const message = response.data.choices?.[0]?.message?.content || "";
    return NextResponse.json({ response: message });
  } catch (error: any) {
    console.error("Azure OpenAI error:", error);
    return NextResponse.json(
      { error: error.message || "Unexpected error occurred" },
      { status: 500 }
    );
  }
}
