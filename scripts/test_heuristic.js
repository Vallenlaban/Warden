const url = process.argv[2] || 'https://google-drive-sharefiles.net';

function heuristicAnalysis(urlStr) {
  const url = String(urlStr).trim();
  const lower = url.toLowerCase();
  const reasons = [];
  let score = 10;
  if (/claim|airdrop|free|verify|connect-wallet|reward|bonus/.test(lower)) {
    reasons.push('Contains common phishing/drainer keywords');
    score = 95;
  }
  if (/\b(meta|meta-?|m?t?etamask|uniswap|binance|opensea|etherscan)\b/.test(lower) && !/\.org|\.com|\.io/.test(lower)) {
    reasons.push('Appears to impersonate a known brand on an unofficial TLD or with typos');
    score = Math.max(score, 90);
  }
  if (!/https?:\/\//i.test(url)) {
    reasons.push('Non-standard or missing protocol');
    score = Math.max(score, 40);
  }
  if (reasons.length === 0) {
    reasons.push('No strong heuristics detected; domain looks ordinary but unverified');
    score = 20;
  }

  const status = score >= 85 ? 'DANGER' : score >= 40 ? 'WARNING' : 'SAFE';
  return {
    status,
    threat_score: score,
    classification: status === 'SAFE' ? 'Verified Domain (heuristic)' : status === 'DANGER' ? 'Impersonator / Drainer (heuristic)' : 'Unverified / Suspicious (heuristic)',
    reason: reasons.join('; '),
  };
}

console.log(JSON.stringify({ url, heuristic: heuristicAnalysis(url) }, null, 2));
