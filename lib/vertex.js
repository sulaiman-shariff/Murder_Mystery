import { GoogleAuth } from "google-auth-library";

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || "striped-sight-443116-g6";
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
const MODEL_ID = process.env.VERTEX_AI_MODEL || "gemini-2.0-flash-lite";

let auth;

function getAuth() {
  if (auth) return auth;

  let credentials;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON must contain valid JSON");
    }
  }

  auth = new GoogleAuth({
    ...(credentials ? { credentials } : {}),
    ...(process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS }
      : {}),
    projectId: PROJECT_ID,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  return auth;
}

export async function getAccessToken() {
  const client = await getAuth().getClient();
  const token = await client.getAccessToken();
  if (!token?.token) throw new Error("Google authentication did not return an access token");
  return token.token;
}

export async function callVertexAI(prompt, maxTokens = 1024, temperature = 0.7) {
  const accessToken = await getAccessToken();
  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:generateContent`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        topP: 0.95,
        topK: 40,
      },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("Vertex AI API error:", details);
    throw new Error("Failed to generate AI response");
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Vertex AI returned an empty response");
  return text;
}

export function parseJsonResponse(text, fallback) {
  if (!text?.trim()) return fallback;
  const cleaned = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return fallback;
  }
}

export function vagueMotiveHint() {
  const hints = [
    "Consider emotional or personal reasons behind the crime.",
    "Think about hidden resentments or relationships.",
    "Reflect on what might drive someone to act out of desperation or passion.",
    "Sometimes the motive is rooted in the past, not just the present.",
    "Look for clues in the victim's interactions and history.",
  ];
  return hints[Math.floor(Math.random() * hints.length)];
}
