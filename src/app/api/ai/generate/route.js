import { NextResponse } from "next/server";
import { callVertexAI } from "../../../../../lib/vertex";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { prompt, maxTokens, temperature } = await request.json();
    if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    return NextResponse.json({ response: await callVertexAI(prompt, maxTokens, temperature) });
  } catch (error) {
    console.error("Generate API error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate AI response" }, { status: 500 });
  }
}
