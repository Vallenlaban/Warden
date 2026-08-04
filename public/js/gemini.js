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
