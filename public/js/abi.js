// js/abi.js
const CONTRACT_ABI = [
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "urlHash",
        type: "bytes32",
      },
      {
        internalType: "uint8",
        name: "aiThreatScore",
        type: "uint8",
      },
      {
        internalType: "string",
        name: "aiStatus",
        type: "string",
      },
      {
        internalType: "string",
        name: "aiReason",
        type: "string",
      },
    ],
    name: "reportThreat",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "urlHash",
        type: "bytes32",
      },
      {
        indexed: true,
        internalType: "address",
        name: "reporter",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint8",
        name: "aiThreatScore",
        type: "uint8",
      },
      {
        indexed: false,
        internalType: "string",
        name: "aiStatus",
        type: "string",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "reportCount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
    ],
    name: "ThreatReported",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "urlHash",
        type: "bytes32",
      },
    ],
    name: "exists",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];
