import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { systemPrompt, transcript } = await req.json();

    // Placeholder logic — this will later call Azure OpenAI via Foundry
    const mockResponse = `📝 Clinical Note based on transcript:\n\n"${transcript.slice(
      0,
      100
    )}..."`;

    return NextResponse.json({ response: mockResponse });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unexpected error occurred" },
      { status: 500 }
    );
  }
}
