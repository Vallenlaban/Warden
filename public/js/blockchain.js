// js/blockchain.js
/* -------------------------------------------------------------
   METAMASK WALLET INTEGRATION FOR BOT CHAIN TESTNET
   ------------------------------------------------------------- */
let walletConnected = false;
let userWalletAddress = "";
let provider = null;
let signer = null;
let contract = null;

function getProvider() {
  return provider;
}

function getRpcProvider() {
  if (typeof ethers === "undefined") return null;
  try {
    return new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  } catch (err) {
    console.warn("Unable to create RPC provider for on-chain check:", err);
    return null;
  }
}

async function checkDomainThreatOnChain(inputUrl) {
  if (!inputUrl || typeof inputUrl !== "string") return null;
  const urlString = inputUrl.trim();
  let normalizedUrl = urlString;
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = "https://" + normalizedUrl;
  }

  let urlHash;
  try {
    urlHash = ethers.hashMessage(normalizedUrl);
  } catch (err) {
    console.warn("Failed to hash URL for on-chain inspection:", err);
    return null;
  }

  const rpcProvider = getRpcProvider();
  if (!rpcProvider) return null;

  let readContract;
  try {
    readContract = new ethers.Contract(
      CONFIG.CONTRACT_ADDRESS,
      CONTRACT_ABI,
      rpcProvider,
    );
  } catch (err) {
    console.warn(
      "Failed to instantiate read-only contract for on-chain inspection:",
      err,
    );
    return null;
  }

  try {
    const threatData = await readContract.getThreat(urlHash);
    if (!threatData || !threatData.exists_) return null;
    return {
      urlHash: threatData.urlHash_,
      aiThreatScore: Number(threatData.aiThreatScore ?? 0),
      aiStatus: String(threatData.aiStatus ?? "").toUpperCase(),
      aiReason: String(threatData.aiReason ?? ""),
      reportCount: Number(threatData.reportCount ?? 0),
      firstReportedAt: Number(threatData.firstReportedAt ?? 0),
      lastReportedAt: Number(threatData.lastReportedAt ?? 0),
      exists: Boolean(threatData.exists_),
    };
  } catch (err) {
    console.warn("On-chain threat query failed:", err);
    return null;
  }
}
