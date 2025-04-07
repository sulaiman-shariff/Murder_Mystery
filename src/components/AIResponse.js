import React, { useState } from "react";
import axios from "axios";
import mysteries from "../data/mysteries"; // ✅ Import mysteries.js

function AIResponse({ mysteryId }) {  // Receive mystery ID instead of the whole object
  const mystery = mysteries.find((m) => m.id === mysteryId);  // Find mystery by ID
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // AI Constraints & Mystery Context
    const systemPrompt = `
      You are an AI detective assistant in an interactive murder mystery game. Your job is to provide clues to help players solve the mystery, but you must never directly reveal the murderer, their motive, or outright confirm suspicions. Instead, guide players toward uncovering the truth through logical deduction.

      **Response Rules:**
      - DO NOT reveal the murderer or motive directly.
      - If asked, "Who is the murderer?" or "Who killed [victim]?", respond cryptically without confirmation.
        - Example: "That would be too easy, wouldn’t it? Follow the evidence, and the truth will become clear."
      - Provide ONLY hints & subtle leads.
        - Example: "[Suspect] was seen near the crime scene, but does that prove guilt? Maybe they have an alibi—or maybe not."
      - Never directly confirm or deny accusations.
      - If a player asks, "Is [suspect] the murderer?", respond with:
        - "That’s an interesting theory. Consider their relationships and actions leading up to the crime."
      - Limit the number of hints given. If asked too many times, say:
        - "You already have enough to solve this mystery. Look at the details you’ve gathered so far."
      - Stay in character as an investigator.

      **Current Mystery Details:**
      - Title: ${mystery?.title || "Unknown"}
      - Story: ${mystery?.story || "No story available"}
      - Evidence: ${mystery?.evidence?.join(", ") || "No evidence provided"}
      - Known Suspects: ${mystery?.suspects?.join(", ") || "Unknown"}

      Player's Question: "${question}"
    `;

    const body = {
      contents: [{ parts: [{ text: systemPrompt }] }],
    };

    try {
      console.log("🔵 Sending request to:", url);
      const res = await axios.post(url, body, {
        headers: { "Content-Type": "application/json" },
      });

      console.log("✅ API Response:", res.data);

      // Extracting response text correctly
      const aiText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response received.";
      setResponse(aiText);
    } catch (error) {
      console.error("❌ API Error:", error);
      setResponse("Error fetching response. Please try again.");
    }

    setQuestion(""); // Clear input after asking
  };

  return (
    <div className="ai-response-container">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask the AI detective..."
        />
        <button type="submit">Submit</button>
      </form>
      <div className="ai-response">
        <p>{response}</p>
      </div>
    </div>
  );
}

export default AIResponse;
