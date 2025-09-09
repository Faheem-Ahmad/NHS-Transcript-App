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

      const res = await axios.post(
        openaiUrl!,
        {
          model: "gpt-4",
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
      const apiVersion =
        process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview";

      const deployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? "";
      // my deployment name is "gpt-4o" // This worked on 09/09/2025
      const url = `${azureEndpoint}/openai/deployments/${encodeURIComponent(
        deployment
      )}/chat/completions?api-version=${apiVersion}`;

      console.log("azureKey:", azureKey);
      console.log("azureEndpoint:", azureEndpoint);
      console.log("deployment:", deployment);
      console.log("apiVersion:", apiVersion);

      const res = await axios.post(
        url,
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
    console.error("AI API error:", error.response?.data || error.message);
    return NextResponse.json(
      { error: error.message || "Unexpected error occurred" },
      { status: 500 }
    );
  }
}
