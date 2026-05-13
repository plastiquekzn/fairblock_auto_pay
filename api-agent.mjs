import { createServer } from "node:http";
import { Wallet, getAddress, isAddress, parseUnits } from "ethers";

const STABLETRUST_API = "https://stabletrust-api.fairblock.network";
const TOKEN_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const TOKEN_DECIMALS = 6;
const port = Number(process.env.AGENT_PORT || 8787);

const state = {
  privateKey: "",
  address: "",
  startedAt: null
};

function send(response, status, payload) {
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function requireAgentKey() {
  if (!state.privateKey) {
    throw new Error("Agent private key is not loaded.");
  }
}

async function stabletrustPost(path, body) {
  requireAgentKey();
  const response = await fetch(`${STABLETRUST_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      privateKey: state.privateKey,
      ...body
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

async function handle(request, response) {
  if (request.method === "OPTIONS") {
    send(response, 204, {});
    return;
  }

  const url = new URL(request.url || "/", `http://${request.headers.host}`);

  try {
    if (request.method === "GET" && url.pathname === "/health") {
      send(response, 200, { ok: true, stabletrustApi: STABLETRUST_API });
      return;
    }

    if (request.method === "GET" && url.pathname === "/agent/status") {
      send(response, 200, {
        loaded: Boolean(state.privateKey),
        address: state.address,
        startedAt: state.startedAt,
        stabletrustApi: STABLETRUST_API
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/agent/key") {
      const { privateKey } = await readJson(request);
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

    if (request.method === "POST" && url.pathname === "/agent/balance") {
      const { tokenAddress = TOKEN_ADDRESS } = await readJson(request);
      if (!isAddress(tokenAddress)) throw new Error("Invalid token address.");
      const payload = await stabletrustPost("/balance", { tokenAddress: getAddress(tokenAddress) });
      send(response, 200, payload);
      return;
    }

    if (request.method === "POST" && url.pathname === "/agent/deposit") {
      const { tokenAddress = TOKEN_ADDRESS, amount, waitForFinalization = true } = await readJson(request);
      if (!isAddress(tokenAddress)) throw new Error("Invalid token address.");
      const payload = await stabletrustPost("/deposit", {
        tokenAddress: getAddress(tokenAddress),
        amount: String(amount),
        waitForFinalization
      });
      send(response, 200, payload);
      return;
    }

    if (request.method === "POST" && url.pathname === "/agent/transfer") {
      const {
        recipientAddress,
        tokenAddress = TOKEN_ADDRESS,
        amount,
        waitForFinalization = true
      } = await readJson(request);
      if (!isAddress(recipientAddress)) throw new Error("Invalid recipient address.");
      if (!isAddress(tokenAddress)) throw new Error("Invalid token address.");
      const payload = await stabletrustPost("/transfer", {
        recipientAddress: getAddress(recipientAddress),
        tokenAddress: getAddress(tokenAddress),
        amount: String(amount),
        waitForFinalization
      });
      send(response, 200, payload);
      return;
    }

    if (request.method === "POST" && url.pathname === "/agent/withdraw") {
      const { tokenAddress = TOKEN_ADDRESS, amount, waitForFinalization = true } = await readJson(request);
      if (!isAddress(tokenAddress)) throw new Error("Invalid token address.");
      const payload = await stabletrustPost("/withdraw", {
        tokenAddress: getAddress(tokenAddress),
        amount: String(amount),
        waitForFinalization
      });
      send(response, 200, payload);
      return;
    }

    if (request.method === "POST" && url.pathname === "/agent/parse-rule") {
      const { prompt } = await readJson(request);
      if (!process.env.GEMINI_API_KEY) {
        send(response, 200, {
          draft: null,
          note: "Set GEMINI_API_KEY to enable Gemini rule drafting.",
          prompt
        });
        return;
      }
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text:
                      "Extract a payment rule as compact JSON with fields recipientName, amount, cadence, time, requiresApproval from this request: " +
                      prompt
                  }
                ]
              }
            ]
          })
        }
      );
      const geminiPayload = await geminiResponse.json();
      send(response, geminiResponse.ok ? 200 : 502, geminiPayload);
      return;
    }

    send(response, 404, { error: "Not found" });
  } catch (error) {
    send(response, 400, { error: error.message });
  }
}

createServer(handle).listen(port, "127.0.0.1", () => {
  console.log(`Stabletrust API agent running at http://127.0.0.1:${port}`);
});
