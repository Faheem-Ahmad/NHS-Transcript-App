import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const { systemPrompt, transcript } = await req.json();

    const provider = process.env.AI_PROVIDER;
    console.log("AI Provider from .env:", provider);

    let responseText = "";

    if (provider === "openai") {
      const openaiKey = process.env.OPENAI_API_KEY;
      const openaiUrl = process.env.OPENAI_API_ENDPOINT;
      // Debug logs
      console.log("OPENAI_API_KEY from .env:", openaiKey);
      console.log("OPENAI_API_URL from .env:", openaiUrl);

      const res = await axios.post(
        openaiUrl!,
        {
          model: "gpt-4", // or 'gpt-4o' if supported
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
            Authorization: `Bearer ${openaiKey}`,
          },
        }
      );

      responseText = res.data.choices?.[0]?.message?.content || "";
    } else if (provider === "azure") {
      const azureKey = process.env.AZURE_OPENAI_API_KEY;
      const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
      const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
      //  const apiVersion = process.env.AZURE_OPENAI_API_VERSION;
      const apiVersion = "2024-12-01-preview";

      //   console.log("AZURE_OPENAI_API_KEY from .env:", azureKey);
      //  console.log("AZURE_OPENAI_ENDPOINT from .env:", azureEndpoint);
      console.log("AZURE_OPENAI_DEPLOYMENT from .env:", deployment);
      console.log("AZURE_OPENAI_API_VERSION from .env:", apiVersion);

      const res = await axios.post(
        `${azureEndpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`,
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
            "api-key": azureKey!,
          },
        }
      );

      responseText = res.data.choices?.[0]?.message?.content || "";
    } else {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }

    return NextResponse.json({ response: responseText });
  } catch (error: any) {
    console.error("AI API error:", error);
    return NextResponse.json(
      { error: error.message || "Unexpected error occurred" },
      { status: 500 }
    );
  }
}
