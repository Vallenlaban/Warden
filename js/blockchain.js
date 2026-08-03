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

function resetWalletSession() {
  walletConnected = false;
  userWalletAddress = "";
  provider = null;
  signer = null;
  contract = null;
}

function getSigner() {
  return signer;
}

function getContract() {
  return contract;
}

async function connectWallet() {
  const btnText = document.getElementById("walletBtnText");
  const dot = document.getElementById("walletConnectedDot");

  if (!window.ethereum) {
    alert("MetaMask was not detected. Please install MetaMask and try again.");
    return;
  }

  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    if (!Array.isArray(accounts) || accounts.length === 0) {
      throw new Error("No wallet account is connected.");
    }

    const selectedAddress = accounts[0];
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    const network = await provider.getNetwork();

    if (Number(network.chainId) !== CONFIG.CHAIN_ID) {
      alert(
        `Please switch MetaMask to BOT Chain Mainnet (Chain ID ${CONFIG.CHAIN_ID}). Current network: ${network.chainId}.`,
      );
      return;
    }

    contract = new ethers.Contract(
      CONFIG.CONTRACT_ADDRESS,
      CONTRACT_ABI,
      signer,
    );
    userWalletAddress = selectedAddress;
    walletConnected = true;

    const shortAddress = `${selectedAddress.slice(0, 6)}...${selectedAddress.slice(-4)}`;
    if (btnText) btnText.textContent = shortAddress;
    if (dot) dot.classList.add("active");

    if (window.ethereum?.removeListener) {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    }
    if (window.ethereum?.on) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);
    }
  } catch (error) {
    console.error("connectWallet error:", error);
    const message = error?.message || "Failed to connect to MetaMask.";
    alert(message);
  }
}

async function handleAccountsChanged(accounts) {
  if (!Array.isArray(accounts) || accounts.length === 0) {
    resetWalletSession();
    const btnText = document.getElementById("walletBtnText");
    const dot = document.getElementById("walletConnectedDot");
    if (btnText) btnText.textContent = "Connect Wallet";
    if (dot) dot.classList.remove("active");
    return;
  }
  if (accounts[0] !== userWalletAddress) {
    userWalletAddress = accounts[0];
    if (provider) {
      signer = await provider.getSigner();
      contract = new ethers.Contract(
        CONFIG.CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer,
      );
    }
    const btnText = document.getElementById("walletBtnText");
    if (btnText)
      btnText.textContent = `${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`;
  }
}

async function handleChainChanged(chainIdHex) {
  try {
    const chainId = Number(chainIdHex);
    if (chainId !== CONFIG.CHAIN_ID) {
      alert(
        `Please switch MetaMask to BOT Chain Mainnet (Chain ID ${CONFIG.CHAIN_ID}).`,
      );
      resetWalletSession();
      const btnText = document.getElementById("walletBtnText");
      const dot = document.getElementById("walletConnectedDot");
      if (btnText) btnText.textContent = "Connect Wallet";
      if (dot) dot.classList.remove("active");
    } else {
      if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        contract = new ethers.Contract(
          CONFIG.CONTRACT_ADDRESS,
          CONTRACT_ABI,
          signer,
        );
        walletConnected = true;
      }
    }
  } catch (error) {
    console.error("handleChainChanged error:", error);
  }
}

function toggleWalletConnection() {
  if (walletConnected) {
    resetWalletSession();
    const btnText = document.getElementById("walletBtnText");
    const dot = document.getElementById("walletConnectedDot");
    if (btnText) btnText.textContent = "Connect Wallet";
    if (dot) dot.classList.remove("active");
  } else {
    connectWallet();
  }
}
