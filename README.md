# Warden

AI-powered phishing detection with permanent blockchain reporting on BOT Chain Mainnet.

Built for the BOT Chain Build Week Hackathon 2026.

## Overview

Warden is an AI-powered phishing detection platform that helps users identify malicious URLs and permanently preserve verified phishing reports on BOT Chain Mainnet.

This project solves the problem of web3 phishing by combining AI URL analysis with blockchain-backed reporting. It helps users identify malicious links, understand risk levels, and store authenticated threat records immutably on-chain.

## Features

- AI URL analysis using Google Gemini
- AI Threat Score (0–100)
- SAFE / DANGER classification
- MetaMask wallet integration
- Report phishing websites to BOT Chain Mainnet
- Immutable on-chain threat records

## How It Works

1. User enters a URL.
2. Google Gemini & Groq Cloud analyzes the URL.
3. Warden displays:
   - Threat Score
   - SAFE / DANGER status
   - AI explanation
4. The user can choose to report the phishing website.
5. MetaMask requests transaction confirmation.
6. The smart contract permanently records the phishing report on BOT Chain Mainnet.

## Technology Stack

- BOT Chain Mainnet
- Solidity
- Gemini AI
- Groq Cloud
- Ethers.js
- HTML/CSS/JavaScript

## Smart Contract

Contract Address:
`0x7Db5050a7594831e3D882C01e4f223eB5C59B8f6`

Network:
BOT Chain Mainnet

Chain ID:
677

## How to Run

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root with your API keys:

```env
GEMINI_API_KEY=YOUR_API_KEY
GROQ_API_KEY=YOUR_API_KEY
```

3. Build the server:

```bash
npm run build
```

4. Start the server:

```bash
npm start
```

5. Open the app in your browser at `http://localhost:3000`.

If you are developing locally, you can also run:

```bash
npm run dev
```

This starts the backend with `ts-node` and allows you to test the server and frontend together.

## License

MIT
