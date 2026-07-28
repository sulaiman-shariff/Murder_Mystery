import { NextResponse } from "next/server";
import { callVertexAI } from "../../../../../lib/vertex";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { question, mystery } = await request.json();
    if (!question || !mystery?.title) {
      return NextResponse.json({ error: "Question and mystery details are required" }, { status: 400 });
    }

    const prompt = `
You are an AI detective assistant in an interactive murder mystery game. Provide clues to help players solve the mystery, but never directly reveal the murderer, their motive, or confirm suspicions. Give only helpful, cryptic leads.

Current Mystery Details:
- Title: ${mystery.title}
- Story: ${mystery.story}

Player's Question: "${question}"

Provide a helpful and cryptic response that guides investigation without revealing answers.`;

    return NextResponse.json({ response: await callVertexAI(prompt, 512, 0.7) });
  } catch (error) {
    console.error("Detective chat error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate detective response" }, { status: 500 });
  }
}
