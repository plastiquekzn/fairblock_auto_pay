import { Wallet, getAddress, isAddress } from "ethers";

const STABLETRUST_API = "https://stabletrust-api.fairblock.network";
const TOKEN_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const state = globalThis.__stabletrustAgentState || {
  privateKey: "",
  address: "",
  startedAt: null
};

globalThis.__stabletrustAgentState = state;

function send(response, status, payload) {
  response.status(status).json(payload);
}

function getPath(request) {
  const value = request.query?.path;
  let path = Array.isArray(value) ? value.join("/") : value || "";
  if (!path && request.url) {
    const url = new URL(request.url, "https://vercel.local");
    path = url.pathname.replace(/^\/api\/agent\/?/, "");
  }
  return path.startsWith("agent/") ? path.slice("agent/".length) : path;
}

function getPrivateKey(body = {}) {
  return body.privateKey || state.privateKey || "";
}

function requireAgentKey(body = {}) {
  const privateKey = getPrivateKey(body);
  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error("Agent private key is not loaded.");
  }
  return privateKey;
}

async function stabletrustPost(path, body) {
  const privateKey = requireAgentKey(body);
  const { privateKey: _ignored, ...safeBody } = body;
  const response = await fetch(`${STABLETRUST_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      privateKey,
      ...safeBody
    })
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `Stabletrust API returned ${response.status}`);
  }
  return payload;
}

export default async function handler(request, response) {
  try {
    const path = getPath(request);
    const body = request.body || {};

    if (request.method === "GET" && path === "health") {
      send(response, 200, { ok: true, stabletrustApi: STABLETRUST_API });
      return;
    }

    if (request.method === "GET" && path === "status") {
      send(response, 200, {
        loaded: Boolean(state.privateKey),
        address: state.address,
        startedAt: state.startedAt,
        stabletrustApi: STABLETRUST_API
      });
      return;
    }

    if (request.method === "POST" && path === "key") {
      const { privateKey } = body;
      if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey || "")) {
        throw new Error("Private key must be 0x + 64 hex characters.");
      }
      const wallet = new Wallet(privateKey);
      state.privateKey = privateKey;
      state.address = wallet.address;
      state.startedAt = new Date().toISOString();
      send(response, 200, { loaded: true, address: state.address });
      return;
    }

    if (request.method === "POST" && path === "balance") {
      const { tokenAddress = TOKEN_ADDRESS } = body;
      if (!isAddress(tokenAddress)) throw new Error("Invalid token address.");
      const payload = await stabletrustPost("/balance", {
        ...body,
        tokenAddress: getAddress(tokenAddress)
      });
      send(response, 200, payload);
      return;
    }

    if (request.method === "POST" && path === "deposit") {
      const { tokenAddress = TOKEN_ADDRESS, amount, waitForFinalization = true } = body;
      if (!isAddress(tokenAddress)) throw new Error("Invalid token address.");
      const payload = await stabletrustPost("/deposit", {
        ...body,
        tokenAddress: getAddress(tokenAddress),
        amount: String(amount),
        waitForFinalization
      });
      send(response, 200, payload);
      return;
    }

    if (request.method === "POST" && path === "transfer") {
      const {
        recipientAddress,
        tokenAddress = TOKEN_ADDRESS,
        amount,
        waitForFinalization = true
      } = body;
      if (!isAddress(recipientAddress)) throw new Error("Invalid recipient address.");
      if (!isAddress(tokenAddress)) throw new Error("Invalid token address.");
      const payload = await stabletrustPost("/transfer", {
        ...body,
        recipientAddress: getAddress(recipientAddress),
        tokenAddress: getAddress(tokenAddress),
        amount: String(amount),
        waitForFinalization
      });
      send(response, 200, payload);
      return;
    }

    if (request.method === "POST" && path === "withdraw") {
      const { tokenAddress = TOKEN_ADDRESS, amount, waitForFinalization = true } = body;
      if (!isAddress(tokenAddress)) throw new Error("Invalid token address.");
      const payload = await stabletrustPost("/withdraw", {
        ...body,
        tokenAddress: getAddress(tokenAddress),
        amount: String(amount),
        waitForFinalization
      });
      send(response, 200, payload);
      return;
    }

    send(response, 404, { error: "Not found" });
  } catch (error) {
    send(response, 400, { error: error.message });
  }
}
