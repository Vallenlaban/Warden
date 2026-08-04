// js/config.js
const CONFIG = {
  GEMINI_API_KEY: "",
  // Safely read GROQ API key without using import.meta (which errors in non-module scripts)
  GROQ_API_KEY:
    (typeof window !== "undefined" &&
      window.__env &&
      window.__env.VITE_GROQ_API_KEY) ||
    (typeof window !== "undefined" && window.GROQ_API_KEY) ||
    "",
  CONTRACT_ADDRESS: "0x7Db5050a7594831e3D882C01e4f223eB5C59B8f6",
  CHAIN_ID: 677,
  RPC_URL: "https://rpc.botchain.ai",
  EXPLORER: "https://scan.botchain.ai",
};
