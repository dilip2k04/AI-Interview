import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI = null;

export function validateGeminiConfig() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY missing from environment.");
    process.exit(1);
  }
  console.log("✅ Gemini API key validated.");
}

function getClient() {
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI;
}

export function getModel(config = {}) {
  const client = getClient();
  return client.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    generationConfig: {
      temperature: config.temperature ?? 0.7,
      topP: config.topP ?? 0.9,
      maxOutputTokens: config.maxOutputTokens ?? 8192,
    },
  });
}

export async function generateText(prompt, config = {}) {
  const model = getModel(config);
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export function parseGeminiJSON(text) {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned);
}
