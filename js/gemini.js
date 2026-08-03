// js/gemini.js
/* -------------------------------------------------------------
   SECURE LOCAL VERIFICATION OR GEMINI FALLBACK ENGINE
   ------------------------------------------------------------- */
async function evaluateUrlSecurity(inputUrl) {
  console.log("Current URL:", inputUrl);
  function isValidURL(string) {
    let urlString = string.trim();
    if (!urlString) return false;
    if (!/^https?:\/\//i.test(urlString)) {
      urlString = "https://" + urlString;
    }
    try {
      const parsed = new URL(urlString);
      const host = parsed.hostname;
      if (!host || (!host.includes(".") && host !== "localhost")) {
        return false;
      }
      const domainPattern = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      return (
        host === "localhost" ||
        domainPattern.test(host) ||
        /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(host)
      );
    } catch (_) {
      return false;
    }
  }

  function extractGeminiResponseText(data) {
    if (!data || !Array.isArray(data.candidates)) return null;
    for (const candidate of data.candidates) {
      if (candidate && candidate.content) {
        const parts = candidate.content.parts;
        if (Array.isArray(parts)) {
          for (const part of parts) {
            if (part && typeof part.text === "string" && part.text.trim()) {
              return part.text;
            }
          }
        }
        if (
          typeof candidate.content.text === "string" &&
          candidate.content.text.trim()
        ) {
          return candidate.content.text;
        }
      }
    }
    return null;
  }

  function normalizeGeminiResponseText(rawText) {
    if (typeof rawText !== "string") return null;
    let cleaned = rawText.trim();
    cleaned = cleaned
      .replace(/^[^\S\r\n]*```(?:json)?\s*/i, "")
      .replace(/\s*```[^\S\r\n]*$/i, "")
      .replace(/\r\n/g, "\n")
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, "")
      .trim();

    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
      return null;
    }

    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    cleaned = cleaned.replace(/,\s*(?=[}\]])/g, "");
    cleaned = cleaned.replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":');
    return cleaned;
  }

  if (!isValidURL(inputUrl)) {
    return {
      status: "INVALID",
      threat_score: 0,
      classification: "Invalid URL",
      reason:
        "INVALID URL - Please enter a valid website address. Example: https://example.com",
    };
  }

  function executeLocalFallback(urlStr) {
    const cleanUrl = urlStr.trim();
    console.log("Local heuristic fallback invoked for:", cleanUrl);
    const targetLower = cleanUrl.toLowerCase().trim();
    const dangerousDirectHits = [
      "https://metamask-support.org",
      "https://securewalletconnect.com",
      "https://binancepromo.com",
      "metamask-support.org",
      "securewalletconnect.com",
      "binancepromo.com",
    ];
    if (dangerousDirectHits.some((target) => targetLower.includes(target))) {
      return {
        status: "DANGER",
        threat_score: 98,
        classification: "Verified Threat",
        reason:
          "This address has been directly flagged by Warden intelligence as a malicious spoofing vector.",
      };
    }

    let testUrl = cleanUrl;
    if (!/^https?:\/\//i.test(testUrl)) {
      testUrl = "https://" + testUrl;
    }
    let hostname = "";
    try {
      hostname = new URL(testUrl).hostname.toLowerCase();
    } catch (_) {
      hostname = cleanUrl.toLowerCase();
    }

    // Official domain whitelist for known brands
    const officialWhitelist = {
      metamask: ["metamask.io"],
      uniswap: ["uniswap.org", "app.uniswap.org"],
      pancakeswap: ["pancakeswap.finance", "pancakeswap.com"],
      binance: ["binance.com"],
      ethereum: ["ethereum.org"],
    };

    function isOfficialBrandDomain(host, list) {
      if (!Array.isArray(list)) return false;
      for (const b of list) {
        if (host === b || host.endsWith("." + b)) return true;
      }
      return false;
    }

    let threatScore = 0;
    let reasons = [];
    let classification = "Suspicious Link";

    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (ipRegex.test(hostname)) {
      threatScore += 55;
      reasons.push("Direct IP address hosting detected");
    }

    const shorteners = [
      "bit.ly",
      "tinyurl.com",
      "t.co",
      "is.gd",
      "buff.ly",
      "adf.ly",
      "goo.gl",
      "ow.ly",
      "rebrand.ly",
    ];
    if (shorteners.some((s) => hostname === s || hostname.endsWith("." + s))) {
      threatScore += 45;
      reasons.push("Obfuscated URL shortener");
      classification = "Obfuscated URL";
    }

    const badTlds = [
      ".xyz",
      ".top",
      ".click",
      ".zip",
      ".gq",
      ".cf",
      ".tk",
      ".ml",
      ".ga",
      ".work",
      ".buzz",
      ".club",
      ".country",
      ".support",
      ".info",
      ".online",
      ".claims",
      ".finance",
      ".app",
    ];
    const matchedTld = badTlds.find((tld) => hostname.endsWith(tld));
    if (matchedTld) {
      threatScore += 35;
      reasons.push(`Suspicious TLD (${matchedTld})`);
    }

    const hyphenCount = hostname.split("-").length - 1;
    if (hyphenCount >= 3) {
      threatScore += 30;
      reasons.push("Excessive domain hyphens");
    }

    const scamKeywords = [
      "claim",
      "airdrop",
      "bonus",
      "wallet",
      "verify",
      "login",
      "free",
      "staking",
      "bridge",
      "drain",
      "gift",
      "free-nft",
      "uniswap-claims",
      "recovery",
      "revoked",
      "pancake",
      "meta-mask",
      "secure-vault",
      "ledger",
    ];
    const matchedKeywords = scamKeywords.filter((kw) => hostname.includes(kw));
    if (matchedKeywords.length > 0) {
      threatScore += matchedKeywords.length * 20;
      reasons.push(`Suspicious keyphrases: [${matchedKeywords.join(", ")}]`);
      classification = "Potential Phishing / Wallet Drainer";
    }

    if (matchedTld && matchedKeywords.length > 0) {
      threatScore += 30;
      reasons.push("Suspicious high-risk TLD & scam keyword combination");
    }

    const typosquattingScenarios = [
      { pattern: /vv/i, label: "'vv' mimicking 'w'" },
      { pattern: /rn/i, label: "'rn' mimicking 'm'" },
      {
        pattern: /([a-zA-Z0-9])\u0001{2,}/i,
        label: "Abnormal character repetition",
      },
      { pattern: /00/i, label: "'00' mimicking 'oo'" },
      { pattern: /1e/i, label: "'1e' substitution patterns" },
    ];
    typosquattingScenarios.forEach((scenario) => {
      if (scenario.pattern.test(hostname)) {
        threatScore += 20;
        reasons.push(scenario.label);
        classification = "Typosquatting Mimicry";
      }
    });

    const trailingTypos = ["metamask", "uniswap", "pancakeswap", "ethereum"];
    trailingTypos.forEach((brand) => {
      if (
        hostname.includes(brand) &&
        hostname !== brand &&
        (hostname.startsWith(brand) || hostname.endsWith(brand))
      ) {
        threatScore += 25;
        reasons.push(`Slight variation of trusted brand: '${brand}'`);
        classification = "Trademark Hijacking";
      }
    });

    // Brand keyword detection - if contains brand keywords but not official domain, escalate to DANGER
    const brandKeywords = [
      "metamask",
      "uniswap",
      "pancake",
      "pancakeswap",
      "binance",
      "wallet",
      "claim",
      "airdrop",
      "free",
      "staking",
      "drain",
      "connect",
    ];
    const hostnameIncludesBrand = brandKeywords.some((kw) =>
      hostname.includes(kw),
    );
    if (hostnameIncludesBrand) {
      // identify if hostname matches any official
      let isOfficial = false;
      for (const [brand, list] of Object.entries(officialWhitelist)) {
        if (hostname.includes(brand) && isOfficialBrandDomain(hostname, list)) {
          isOfficial = true;
          break;
        }
      }
      if (!isOfficial) {
        threatScore = Math.max(threatScore, 90);
        reasons.push("Brand impersonation indicators detected");
        classification = "Verified Threat";
      }
    }

    // Subdomain chain (multiple dots) increases suspicion
    const dotCount = (hostname.match(/\./g) || []).length;
    if (dotCount >= 3) {
      threatScore += 25;
      reasons.push("Excessive subdomain chaining");
    }

    // Normalize and decide status with safer defaults
    threatScore = Math.max(0, Math.min(100, threatScore));
    let status = "WARNING"; // default conservative stance
    if (threatScore >= 75) {
      status = "DANGER";
    } else if (threatScore >= 40) {
      status = "WARNING";
    } else {
      status = "WARNING";
    }

    // If absolutely no indicators (very low score), allow SAFE
    if (threatScore <= 5 && reasons.length === 0) {
      return {
        status: "SAFE",
        threat_score: Math.max(2, threatScore),
        classification: "Trusted",
        reason:
          "No standard heuristic threat indicators detected locally. Always transact with vigilance.",
      };
    }

    return {
      status: status,
      threat_score: Math.max(2, threatScore),
      classification: classification,
      reason: `Warden Heuristic scan flagged URL. Detected: ${reasons.join("; ")}.`,
    };
  }

  try {
    // Call backend analyze endpoint which proxies Gemini and handles the API key server-side.
    // Use a relative endpoint so the app works on local preview and when published.
    const endpoint =
      typeof window !== "undefined" && window.location && window.location.origin
        ? window.location.origin + "/api/analyze-url"
        : "/api/analyze-url";

    // Use AbortController to avoid long hangs when backend is not available (connection refused).
    const controller = new AbortController();
    const timeoutMs = 6000; // 6s soft timeout to avoid UI freeze
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    let parsedPayload = null;
    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: inputUrl }),
        signal: controller.signal,
      });

      clearTimeout(timeoutHandle);

      if (!resp.ok) {
        console.warn(
          `Backend analyze endpoint responded with ${resp.status}. Attempting Groq fallback.`,
        );
        // Try Groq fallback before local heuristic
        try {
          const groqResult = await callGroqFallback(inputUrl);
          if (groqResult) return groqResult;
        } catch (gErr) {
          console.warn("Groq fallback failed or unavailable:", gErr);
        }
        return executeLocalFallback(inputUrl);
      }

      parsedPayload = await resp.json();
    } catch (fetchErr) {
      clearTimeout(timeoutHandle);
      // Graceful handling: backend may be down or connection refused (local dev without backend).
      console.warn("Backend analyze fetch failed or timed out:", fetchErr);
      console.log(
        "Proceeding with Groq fallback (if configured) or local heuristic to avoid UI freeze.",
      );
      try {
        const groqResult = await callGroqFallback(inputUrl);
        if (groqResult) return groqResult;
      } catch (gErr) {
        console.warn(
          "Groq fallback failed or unavailable after fetch error:",
          gErr,
        );
      }
      return executeLocalFallback(inputUrl);
    }
    // If backend returned a fallback heuristic object, use it.
    if (parsedPayload && parsedPayload.fallback) {
      console.log("Backend returned fallback heuristic");
      return parsedPayload.fallback;
    }

    console.log("Parsed JSON from backend:", parsedPayload);

    const rawStatus = parsedPayload.status;
    const rawScore = parsedPayload.threat_score ?? parsedPayload.score;
    const rawReason =
      parsedPayload.reason ||
      parsedPayload.analysis_summary ||
      parsedPayload.explanation;

    if (typeof rawStatus !== "string") {
      console.log("Fallback usage: Yes (Missing or invalid status)");
      return executeLocalFallback(inputUrl);
    }

    const parsedStatus = rawStatus.trim().toUpperCase();
    if (!["SAFE", "WARNING", "DANGER"].includes(parsedStatus)) {
      console.log("Fallback usage: Yes (Invalid status value)");
      return executeLocalFallback(inputUrl);
    }

    let parsedScore = null;
    if (typeof rawScore === "number") {
      parsedScore = rawScore;
    } else if (typeof rawScore === "string" && rawScore.trim() !== "") {
      const maybeNumber = Number(rawScore.trim());
      if (!Number.isNaN(maybeNumber)) {
        parsedScore = maybeNumber;
      }
    }

    if (typeof parsedScore !== "number" || Number.isNaN(parsedScore)) {
      console.log("Fallback usage: Yes (Missing or invalid threat_score)");
      return executeLocalFallback(inputUrl);
    }

    const finalScore = Math.max(0, Math.min(100, parsedScore));
    const finalStatus = parsedStatus;
    const finalReason =
      typeof rawReason === "string" && rawReason.trim().length > 20
        ? rawReason.trim()
        : finalStatus === "DANGER"
          ? `Threat Detected: "${inputUrl}" exhibits high-risk indicators such as brand impersonation, suspicious domain extensions, or potential wallet drainer patterns.`
          : finalStatus === "WARNING"
            ? `Anomaly Detected: "${inputUrl}" is an unverified or unusual domain requiring user caution before connecting Web3 wallets.`
            : `Verified Domain: "${inputUrl}" is confirmed as a trusted, official primary domain with no detected threat vectors.`;

    const rawPhishingProbability = parsedPayload.phishing_probability;
    const rawAnalysisSummary = parsedPayload.analysis_summary;
    const rawDetectedRisks = parsedPayload.detected_risks;
    const rawRecommendations = parsedPayload.recommendations;

    const finalPhishingProbability =
      typeof rawPhishingProbability === "number"
        ? Math.max(0, Math.min(100, rawPhishingProbability))
        : typeof rawPhishingProbability === "string" &&
            rawPhishingProbability.trim() !== ""
          ? (() => {
              const num = Number(rawPhishingProbability.trim());
              return Number.isNaN(num) ? null : Math.max(0, Math.min(100, num));
            })()
          : null;

    const finalResult = {
      status: finalStatus,
      threat_score: finalScore,
      classification:
        parsedStatus === "SAFE"
          ? "Verified Domain"
          : parsedStatus === "DANGER"
            ? "Impersonator Site"
            : "Phishing Risk",
      reason: finalReason,
      ...(finalPhishingProbability !== null && {
        phishing_probability: finalPhishingProbability,
      }),
      ...(typeof rawAnalysisSummary === "string" &&
        rawAnalysisSummary.trim() !== "" && {
          analysis_summary: rawAnalysisSummary.trim(),
        }),
      ...(Array.isArray(rawDetectedRisks) && {
        detected_risks: rawDetectedRisks.filter(
          (item) => typeof item === "string",
        ),
      }),
      ...(Array.isArray(rawRecommendations) && {
        recommendations: rawRecommendations.filter(
          (item) => typeof item === "string",
        ),
      }),
    };

    if (typeof checkDomainThreatOnChain === "function") {
      try {
        const onChainResult = await checkDomainThreatOnChain(inputUrl);
        if (onChainResult) {
          finalResult.on_chain = onChainResult;
        }
      } catch (chainError) {
        console.warn("On-chain inspection failed:", chainError);
      }
    }

    console.log("Final result:", finalResult);
    return finalResult;
  } catch (error) {
    try {
      if (typeof timeoutId !== "undefined") clearTimeout(timeoutId);
    } catch (e) {}
    console.warn(
      "Warden security request error. Running fallback parser...",
      error,
    );
    console.log(
      "Fallback usage: Yes (Request Exception). Attempting Groq fallback before local heuristic.",
    );
    try {
      const groqResult = await callGroqFallback(inputUrl);
      if (groqResult) return groqResult;
    } catch (gErr) {
      console.warn("Groq fallback failed or unavailable:", gErr);
    }
    return executeLocalFallback(inputUrl);
  }
}

// Groq fallback helper using Groq OpenAI-compatible endpoint
async function callGroqFallback(inputUrl) {
  try {
    // Read GROQ key from global CONFIG if available
    const groqKey =
      typeof CONFIG !== "undefined" && CONFIG.GROQ_API_KEY
        ? CONFIG.GROQ_API_KEY
        : "";
    if (!groqKey || groqKey.trim() === "") {
      throw new Error("No GROQ_API_KEY configured");
    }

    const systemPrompt = `Zero-Trust URL security evaluator for Web3. Given a single target URL, analyze for impersonation, phishing, wallet-drainer, typosquatting, suspicious TLDs, and obfuscation. Respond STRICTLY with a single JSON object only, using these keys: status (SAFE|WARNING|DANGER), threat_score (integer 0-100), classification (short string), reason (detailed string). Rules: Only mark status as SAFE if the domain exactly matches a known official primary domain (e.g., metamask.io, uniswap.org, pancakeswap.finance, binance.com, ethereum.org) or an explicit high-trust canonical domain. If any brand keywords, suspicious TLDs, subdomain chaining, URL shorteners, or typosquatting are detected, prefer WARNING or DANGER. Do NOT include any explanatory text outside the JSON. Example output: {"status":"DANGER","threat_score":92,"classification":"Phishing","reason":"Detected brand impersonation and suspicious TLD"}`;
    const userPrompt = `Evaluate the following URL for phishing and wallet-drainer risk: ${inputUrl}\nReturn ONLY the JSON evaluation object as described.`;

    const body = {
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 400,
      temperature: 0.0,
    };

    const resp = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify(body),
      },
    );

    if (!resp.ok) {
      throw new Error(`Groq responded ${resp.status}`);
    }

    const parsed = await resp.json();
    console.log("Groq raw response parsed:", parsed);
    // Groq returns choices with message.content (string)
    const content =
      parsed?.choices?.[0]?.message?.content ||
      parsed?.choices?.[0]?.text ||
      null;
    if (!content || typeof content !== "string") {
      throw new Error("Groq returned no textual content");
    }

    // Try to extract JSON from content
    let jsonText = content.trim();
    // strip markdown fences if present
    jsonText = jsonText
      .replace(/^```(?:json)?\s*/, "")
      .replace(/\s*```$/, "")
      .trim();

    // Find first { and last }
    const first = jsonText.indexOf("{");
    const last = jsonText.lastIndexOf("}");
    if (first === -1 || last === -1 || last < first) {
      throw new Error("Groq response did not contain JSON object");
    }
    jsonText = jsonText.substring(first, last + 1);

    let resultObj = null;
    try {
      resultObj = JSON.parse(jsonText.replace(/,\s*(?=[}\]])/g, ""));
    } catch (e) {
      // attempt loose normalization like normalizeGeminiResponseText
      const normalized = jsonText.replace(
        /([{,]\s*)([A-Za-z0-9_]+)\s*:/g,
        '$1"$2":',
      );
      resultObj = JSON.parse(normalized);
    }

    // Validate shape
    if (!resultObj || typeof resultObj !== "object")
      throw new Error("Invalid Groq JSON");
    const status = (resultObj.status || "").toString().trim().toUpperCase();
    const score = Number(resultObj.threat_score);
    const classification = (resultObj.classification || "").toString();
    const reason = (resultObj.reason || "").toString();

    console.log("Groq parsed evaluation object:", resultObj);

    if (
      !["SAFE", "WARNING", "DANGER"].includes(status) ||
      Number.isNaN(score)
    ) {
      throw new Error("Groq JSON missing required fields");
    }

    return {
      status: status,
      threat_score: Math.max(0, Math.min(100, Math.round(score))),
      classification:
        classification ||
        (status === "SAFE"
          ? "Verified Domain"
          : status === "DANGER"
            ? "Impersonator Site"
            : "Phishing Risk"),
      reason: reason || `Groq evaluation for ${inputUrl}`,
    };
  } catch (err) {
    throw err;
  }
}
