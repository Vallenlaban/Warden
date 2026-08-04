import "dotenv/config";
import express from "express";
import fetch from "node-fetch";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const ROOT_DIR = process.cwd();

app.use(express.json());

// Determine a safe static directory that works both locally and after build.
// Try a directory relative to this file (works when compiled to dist/),
// then fallback to process.cwd() where index.html exists in repo root.
const STATIC_DIR = (() => {
  try {
    const maybe = path.resolve(__dirname, "..");
    if (fs.existsSync(path.join(maybe, "index.html"))) return maybe;
  } catch (e) {
    // ignore
  }
  return process.cwd();
})();

app.use(express.static(STATIC_DIR, { extensions: ["html"] }));

// SPA fallback: serve index.html for any non-API GET request.
app.get("*", (req, res, next) => {
  if (req.method !== "GET") return next();
  if (req.path && req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(STATIC_DIR, "index.html"), (err) => {
    if (err) return next(err);
  });
});

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["SAFE", "WARNING", "DANGER"] },
    threat_score: { type: "number", minimum: 0, maximum: 100 },
    classification: { type: "string" },
    reason: { type: "string" },
  },
  required: ["status", "threat_score", "classification", "reason"],
  additionalProperties: true,
};

const buildSystemInstruction = () =>
  `You are the core engine of "Warden" - an elite Web3 AI Security Analyst and Wallet Guardian.\nYour job is to evaluate URLs and classify them by actual phishing risk, impersonation, scam patterns, or verified legitimacy.\n\nCRITICAL EVALUATION RULES:\n1. SAFE must be used for official domains, verified community sites, educational sites, event/hackathon portals, and legitimate applications/websites. Do NOT mark a site as WARNING or DANGER just because it is not a major crypto brand or is less well-known, as long as there are no phishing/scam indicators.\n2. DANGER must only be used when the URL is clearly phishing, impersonating a brand, using scam typosquatting, acting as a wallet drainer, or serving fake claim/airdrop pages.\n3. WARNING should be used for suspicious shorteners, unknown redirectors, or URLs with unusual TLDs combined with claim/airdrop/recovery keywords and unverified redirect behavior.\n4. If the URL is an official or legitimate site without threat signals, classify it as SAFE with a low threat score.\n\nOUTPUT FORMAT INSTRUCTIONS:\nRespond strictly in valid JSON format with concise reason text of 1-2 sentences only:\n{\n  \"status\": \"SAFE|WARNING|DANGER\",\n  \"threat_score\": 0-100,\n  \"classification\": \"string\",\n  \"reason\": \"Short and clear, 1-2 sentences only.\"\n}`;

const normalizePayload = (parsedPayload: any, url: string) => {
  const parsedStatus = String(parsedPayload?.status || "WARNING").toUpperCase();
  const finalStatus = ["SAFE", "WARNING", "DANGER"].includes(parsedStatus)
    ? parsedStatus
    : "WARNING";
  const finalScore =
    typeof parsedPayload?.threat_score === "number"
      ? Math.max(0, Math.min(100, Math.round(parsedPayload.threat_score)))
      : finalStatus === "DANGER"
        ? 95
        : finalStatus === "WARNING"
          ? 60
          : 5;
  const rawReason =
    parsedPayload?.reason ||
    parsedPayload?.analysis_summary ||
    parsedPayload?.explanation;
  const finalReason =
    rawReason && rawReason.length > 15
      ? rawReason
      : finalStatus === "DANGER"
        ? `Threat Detected: "${url}" exhibits high-risk indicators such as brand impersonation or potential wallet drainer patterns.`
        : finalStatus === "WARNING"
          ? `Anomaly Detected: "${url}" is an unverified or unusual domain requiring user caution.`
          : `Verified Domain: "${url}" is confirmed as a trusted primary domain.`;

  return {
    status: finalStatus,
    threat_score: finalScore,
    classification:
      parsedPayload?.classification ||
      (finalStatus === "SAFE"
        ? "Trusted"
        : finalStatus === "DANGER"
          ? "Verified Threat"
          : "Anomaly Spotted"),
    reason: finalReason,
  };
};

const extractJson = (rawText: string) => {
  let cleanJson = rawText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const firstCurly = cleanJson.indexOf("{");
  const lastCurly = cleanJson.lastIndexOf("}");
  if (firstCurly !== -1 && lastCurly !== -1) {
    cleanJson = cleanJson.substring(firstCurly, lastCurly + 1);
  }
  return cleanJson;
};

const parseJson = (rawText: string) => {
  const content = rawText?.trim();
  if (!content) {
    throw new Error("Empty response from AI provider");
  }
  try {
    return JSON.parse(content);
  } catch {
    return JSON.parse(extractJson(content));
  }
};

const callGemini = async (
  url: string,
  systemInstruction: string,
  apiKey: string,
) => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Evaluate this URL for phishing and security risks: "${url}"`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.1,
      responseJsonSchema: RESPONSE_SCHEMA,
    },
  });

  return normalizePayload(parseJson(response.text || ""), url);
};

const callGroq = async (
  url: string,
  systemInstruction: string,
  apiKey: string,
) => {
  const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
  let lastError: Error | null = null;

  for (const model of models) {
    const body = {
      model,
      messages: [
        { role: "system", content: systemInstruction },
        {
          role: "user",
          content: `Evaluate this URL for phishing and security risks: "${url}"`,
        },
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: "json_object" },
    };

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      },
    );

    const text = await response.text();
    if (!response.ok) {
      const error = new Error(`Groq API(${model}) ${response.status}: ${text}`);
      lastError = error;
      if (response.status === 404 || response.status === 422) continue;
      throw error;
    }

    let payload: any;
    try {
      const json = JSON.parse(text);
      const choice = json?.choices?.[0];
      payload =
        choice?.message?.content ?? choice?.content ?? choice?.message ?? json;
      if (typeof payload === "string") payload = parseJson(payload);
    } catch (error: any) {
      throw new Error(`Groq parse error: ${error?.message || error}: ${text}`);
    }

    return normalizePayload(payload, url);
  }

  throw lastError || new Error("Groq API did not return a valid response");
};

app.post(["/api/evaluate", "/api/analyze-url"], async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "Parameter URL wajib diisi" });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!geminiApiKey && !groqApiKey) {
      console.warn("GEMINI_API_KEY dan GROQ_API_KEY tidak ditemukan di .env!");
      return res.status(500).json({
        error:
          "GEMINI_API_KEY atau GROQ_API_KEY harus dikonfigurasi pada server",
      });
    }

    const systemInstruction = buildSystemInstruction();
    let geminiError: any = null;

    if (geminiApiKey) {
      try {
        return res.json(await callGemini(url, systemInstruction, geminiApiKey));
      } catch (error) {
        geminiError = error;
        console.warn("Gemini failed, trying Groq if available:", String(error));
      }
    }

    if (groqApiKey) {
      try {
        return res.json(await callGroq(url, systemInstruction, groqApiKey));
      } catch (error: any) {
        console.error("Groq API failed:", error?.message || String(error));
        return res.status(502).json({
          error: "Both Gemini and Groq providers failed",
          providers: {
            gemini: geminiError ? String(geminiError) : "not attempted",
            groq: String(error),
          },
          fallback: true,
        });
      }
    }

    if (geminiError) {
      return res.status(502).json({
        error: "Gemini API failed and no GROQ_API_KEY is configured",
        details: String(geminiError),
        fallback: true,
      });
    }

    return res.status(500).json({ error: "No AI provider configured" });
  } catch (err: any) {
    console.error("Internal request handler error:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: String(err) });
  }
});

const isVercel = process.env.VERCEL === "1";

if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`Server Warden berjalan di http://localhost:${PORT}`);
  });
}

export default app;
