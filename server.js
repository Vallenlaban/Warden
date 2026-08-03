// server.js
const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const fetch = require("node-fetch");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

// Mendukung endpoint /api/evaluate dan /api/analyze-url
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
      return res
        .status(500)
        .json({
          error:
            "GEMINI_API_KEY atau GROQ_API_KEY harus dikonfigurasi pada server",
        });
    }

    const systemInstruction = `You are the core engine of \"Warden\" - an elite Web3 AI Security Analyst and Wallet Guardian.\nYour job is to evaluate URLs and classify them by actual phishing risk, impersonation, scam patterns, or verified legitimacy.\n\nCRITICAL EVALUATION RULES:\n1. SAFE must be used for official domains, verified community sites, educational sites, event/hackathon portals, and legitimate applications/websites. Do NOT mark a site as WARNING or DANGER just because it is not a major crypto brand or is less well-known, as long as there are no phishing/scam indicators.\n2. DANGER must only be used when the URL is clearly phishing, impersonating a brand, using scam typosquatting, acting as a wallet drainer, or serving fake claim/airdrop pages.\n3. WARNING should be used for suspicious shorteners, unknown redirectors, or URLs with unusual TLDs combined with claim/airdrop/recovery keywords and unverified redirect behavior.\n4. If the URL is an official or legitimate site without threat signals, classify it as SAFE with a low threat score.\n\nOUTPUT FORMAT INSTRUCTIONS:\nRespond strictly in valid JSON format with concise reason text of 1-2 sentences only:\n{\n  \"status\": \"SAFE|WARNING|DANGER\",\n  \"threat_score\": 0-100,\n  \"classification\": \"string\",\n  \"reason\": \"Short and clear, 1-2 sentences only.\"\n}`;

    const prompt = `Evaluate this URL for phishing and security risks: \"${url}\"`;

    const normalizePayload = (parsedPayload) => {
      const parsedStatus = String(
        parsedPayload?.status || "WARNING",
      ).toUpperCase();
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
            ? `Threat Detected: \"${url}\" exhibits high-risk indicators such as brand impersonation or potential wallet drainer patterns.`
            : finalStatus === "WARNING"
              ? `Anomaly Detected: \"${url}\" is an unverified or unusual domain requiring user caution.`
              : `Verified Domain: \"${url}\" is confirmed as a trusted primary domain.`;

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

    const extractJson = (rawText) => {
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

    const parseJson = (rawText) => {
      const content = rawText?.trim();
      if (!content) {
        throw new Error("Empty response from AI provider");
      }
      try {
        return JSON.parse(content);
      } catch (parseError) {
        const extracted = extractJson(content);
        return JSON.parse(extracted);
      }
    };

    const callGemini = async () => {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.1,
          responseJsonSchema: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["SAFE", "WARNING", "DANGER"] },
              threat_score: { type: "number", minimum: 0, maximum: 100 },
              classification: { type: "string" },
              reason: { type: "string" },
            },
            required: ["status", "threat_score", "classification", "reason"],
            additionalProperties: true,
          },
        },
      });

      const text = response?.text || "";
      return normalizePayload(parseJson(text));
    };

    const callGroq = async () => {
      const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
      let lastError;

      for (const model of models) {
        const body = {
          model,
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt },
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
              Authorization: `Bearer ${groqApiKey}`,
            },
            body: JSON.stringify(body),
          },
        );

        const responseBody = await response.text();
        if (!response.ok) {
          lastError = new Error(
            `Groq API(${model}) ${response.status}: ${responseBody}`,
          );
          if (response.status === 404 || response.status === 422) {
            continue;
          }
          throw lastError;
        }

        let payload;
        try {
          const json = JSON.parse(responseBody);
          const choice = json?.choices?.[0];
          payload =
            choice?.message?.content ??
            choice?.content ??
            choice?.message ??
            json;
          if (typeof payload === "string") {
            payload = parseJson(payload);
          }
        } catch (parseError) {
          throw new Error(
            `Groq parse error: ${parseError.message}: ${responseBody}`,
          );
        }

        return normalizePayload(payload);
      }

      throw lastError || new Error("Groq API did not return a valid response");
    };

    const isRetryableGeminiError = (error) => {
      const message = String(error?.message || error || "").toLowerCase();
      return (
        message.includes("429") ||
        message.includes("quota") ||
        message.includes("resource_exhausted")
      );
    };

    let geminiError;
    if (geminiApiKey) {
      try {
        return res.json(await callGemini());
      } catch (error) {
        geminiError = error;
        console.warn(
          "Gemini failed, will try Groq if available:",
          error?.message || error,
        );
      }
    }

    if (groqApiKey) {
      try {
        return res.json(await callGroq());
      } catch (groqError) {
        console.error("Groq API failed:", groqError?.message || groqError);
        const errorPayload = {
          error: "Both Gemini and Groq providers failed",
          providers: {
            gemini: geminiError ? String(geminiError) : "not attempted",
            groq: String(groqError),
          },
          fallback: true,
        };
        return res.status(502).json(errorPayload);
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
  } catch (err) {
    console.error("Internal request handler error:", err);
    return res
      .status(500)
      .json({ error: "Internal server error", details: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Server Warden berjalan di http://localhost:${PORT}`);
});
