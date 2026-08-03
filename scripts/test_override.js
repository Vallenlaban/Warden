// Simulate Gemini result and apply heuristic override logic similar to server
const url = process.argv[2] || 'https://google-drive-sharefiles.net';
const gemini = { status: 'SAFE', score: 20, reason: 'Model considered domain ordinary' };

function heuristicAnalysis(urlStr) {
  const url = String(urlStr).trim();
  const lower = url.toLowerCase();
  const reasons = [];
  let score = 10;
  if (/claim|airdrop|free|verify|connect-wallet|reward|bonus/.test(lower)) {
    reasons.push('Contains common phishing/drainer keywords');
    score = 95;
  }
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const brandTokens = ['google','drive','meta','metamask','opensea','uniswap','binance','etherscan','coinbase'];
    const officialMap = {
      google: ['google.com'],
      drive: ['drive.google.com'],
      meta: ['meta.com'],
      metamask: ['metamask.io'],
      opensea: ['opensea.io'],
      uniswap: ['uniswap.org','uniswap.exchange'],
      binance: ['binance.com'],
      etherscan: ['etherscan.io'],
      coinbase: ['coinbase.com']
    };
    for (const token of brandTokens) {
      if (hostname.includes(token)) {
        const officialList = officialMap[token] || [];
        const isOfficial = officialList.some(d => hostname === d || hostname.endsWith('.' + d));
        if (!isOfficial) {
          reasons.push(`Appears to impersonate or reuse brand token: ${token}`);
          score = Math.max(score, 95);
          break;
        }
      }
    }
  } catch(e){}
  if (!/https?:\/\//i.test(url)) {
    reasons.push('Non-standard or missing protocol');
    score = Math.max(score, 40);
  }
  if (reasons.length === 0) {
    reasons.push('No strong heuristics detected; domain looks ordinary but unverified');
    score = 20;
  }
  const status = score >= 85 ? 'DANGER' : score >= 40 ? 'WARNING' : 'SAFE';
  return { status, threat_score: score, reason: reasons.join('; ') };
}

const heur = heuristicAnalysis(url);
console.log('Simulated Gemini:', gemini);
console.log('Heuristic:', heur);

let final = { status: gemini.status, score: gemini.score, reason: gemini.reason };
if (heur && heur.status === 'DANGER' && (gemini.status !== 'DANGER' || gemini.score < heur.threat_score)) {
  final = { status: heur.status, score: heur.threat_score, reason: heur.reason };
}
console.log('Final result (after override):', final);
