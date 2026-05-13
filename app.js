import { Buffer } from "buffer";
import { ethers } from "ethers";
import { ConfidentialTransferClient } from "@fairblock/stabletrust";

globalThis.Buffer = globalThis.Buffer || Buffer;

const API_BASE = "https://stabletrust-api.fairblock.network";
const TOKEN_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const TOKEN_DECIMALS = 6;
const AGENT_API_BASE = "/api/agent";
const BASE_SEPOLIA = {
  chainId: 84532,
  chainHex: "0x14a34",
  name: "Base Sepolia",
  rpcUrl: "https://sepolia.base.org",
  blockExplorerUrl: "https://sepolia.basescan.org"
};
const stabletrustClient = new ConfidentialTransferClient(BASE_SEPOLIA.rpcUrl, BASE_SEPOLIA.chainId);
const STORAGE_KEY = "stabletrust-autopay-studio:v2";
const AGENT_KEY_STORAGE_KEY = "stabletrust-autopay-studio:test-agent-key";

const state = {
  mode: "mock",
  wallet: {
    browserProvider: null,
    signer: null,
    address: "",
    chainId: null,
    keys: null,
    publicBalance: null,
    confidentialBalance: null,
    pendingBalance: null
  },
  agent: {
    wallet: null,
    address: "",
    keys: null,
    schedulerId: null,
    running: false
  },
  recipients: [],
  queue: [],
  activity: [],
  chat: []
};

function loadSavedState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (Array.isArray(saved.recipients)) {
      state.recipients = saved.recipients;
    }
    if (Array.isArray(saved.queue)) {
      state.queue = saved.queue;
    }
    if (Array.isArray(saved.activity)) {
      state.activity = saved.activity;
    }
    if (Array.isArray(saved.chat)) {
      state.chat = saved.chat;
    }
  } catch (error) {
    console.warn("Failed to load saved state", error);
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      recipients: state.recipients,
      queue: state.queue,
      activity: state.activity,
      chat: state.chat
    })
  );
}

loadSavedState();

const els = {
  publicMetricLabel: document.querySelector("#publicMetricLabel"),
  confidentialMetricLabel: document.querySelector("#confidentialMetricLabel"),
  pendingMetricLabel: document.querySelector("#pendingMetricLabel"),
  queueMetricLabel: document.querySelector("#queueMetricLabel"),
  agentMetricLabel: document.querySelector("#agentMetricLabel"),
  nextPaymentDetail: document.querySelector("#nextPaymentDetail"),
  policyChecksLabel: document.querySelector("#policyChecksLabel"),
  recipientSelect: document.querySelector("#recipientSelect"),
  recipientStatusLabel: document.querySelector("#recipientStatusLabel"),
  checkRecipientButton: document.querySelector("#checkRecipientButton"),
  recipientList: document.querySelector("#recipientList"),
  queueList: document.querySelector("#queueList"),
  clearQueueButton: document.querySelector("#clearQueueButton"),
  activityLog: document.querySelector("#activityLog"),
  curlPreview: document.querySelector("#curlPreview"),
  agentStateLabel: document.querySelector("#agentStateLabel"),
  agentStateDetail: document.querySelector("#agentStateDetail"),
  walletAddressLabel: document.querySelector("#walletAddressLabel"),
  chainLabel: document.querySelector("#chainLabel"),
  walletFullAddressLabel: document.querySelector("#walletFullAddressLabel"),
  selfAccountStatusLabel: document.querySelector("#selfAccountStatusLabel"),
  contractAddressLabel: document.querySelector("#contractAddressLabel"),
  connectWalletButton: document.querySelector("#connectWalletButton"),
  switchNetworkButton: document.querySelector("#switchNetworkButton"),
  initAccountButton: document.querySelector("#initAccountButton"),
  refreshWalletBalanceButton: document.querySelector("#refreshWalletBalanceButton"),
  publicUsdcLabel: document.querySelector("#publicUsdcLabel"),
  walletConfidentialLabel: document.querySelector("#walletConfidentialLabel"),
  testAmountInput: document.querySelector("#testAmountInput"),
  depositButton: document.querySelector("#depositButton"),
  withdrawButton: document.querySelector("#withdrawButton"),
  addRecipientInlineButton: document.querySelector("#addRecipientInlineButton"),
  agentPrivateKeyInput: document.querySelector("#agentPrivateKeyInput"),
  rememberAgentKeyCheck: document.querySelector("#rememberAgentKeyCheck"),
  forgetAgentKeyButton: document.querySelector("#forgetAgentKeyButton"),
  loadAgentKeyButton: document.querySelector("#loadAgentKeyButton"),
  initAgentButton: document.querySelector("#initAgentButton"),
  startSchedulerButton: document.querySelector("#startSchedulerButton"),
  stopSchedulerButton: document.querySelector("#stopSchedulerButton"),
  agentWalletLabel: document.querySelector("#agentWalletLabel"),
  agentModeLabel: document.querySelector("#agentModeLabel"),
  agentChatLog: document.querySelector("#agentChatLog"),
  agentChatForm: document.querySelector("#agentChatForm"),
  agentChatInput: document.querySelector("#agentChatInput"),
  clearAgentChatButton: document.querySelector("#clearAgentChatButton"),
  ruleForm: document.querySelector("#ruleForm"),
  toast: document.querySelector("#toast")
};

function money(value, token = "USDC") {
  return `${Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} ${token}`;
}

function shortenAddress(address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[character]);
}

function normalizeAddress(address) {
  const trimmed = address.trim();
  if (!trimmed.startsWith("0x") || trimmed.length !== 42) {
    throw new Error("Address must be a 42-character EVM address starting with 0x.");
  }
  return ethers.getAddress(trimmed.toLowerCase());
}

function isTransactionHash(value) {
  return /^0x[a-fA-F0-9]{64}$/.test(value || "");
}

function explorerTxUrl(hash) {
  return `${BASE_SEPOLIA.blockExplorerUrl}/tx/${hash}`;
}

function extractTransactionHash(value) {
  if (!value) return "";
  if (typeof value === "string") return isTransactionHash(value) ? value : "";
  if (typeof value !== "object") return "";

  const directKeys = ["hash", "txHash", "transactionHash", "transaction_hash", "tx_hash"];
  for (const key of directKeys) {
    if (isTransactionHash(value[key])) return value[key];
  }

  for (const nested of Object.values(value)) {
    const found = extractTransactionHash(nested);
    if (found) return found;
  }
  return "";
}

function extractTransactionLabel(value) {
  const hash = extractTransactionHash(value);
  if (hash) return hash;
  if (typeof value === "string" && value) return value;
  if (value?.id) return String(value.id);
  if (value?.status) return String(value.status);
  return "submitted";
}

function formatUnits(value, decimals = TOKEN_DECIMALS) {
  return Number(ethers.formatUnits(value || 0n, decimals)).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  });
}

function getRecipient(id) {
  return state.recipients.find((recipient) => recipient.id === id);
}

function getSelectedRulePayload() {
  const recipient = getRecipient(document.querySelector("#recipientSelect").value);
  const amount = Number.parseFloat(document.querySelector("#amountInput").value || "0");
  return {
    privateKey: "0xAgentPrivateKeyForServerSideMode",
    recipientAddress: recipient?.address || "0xRecipientAddress",
    tokenAddress: TOKEN_ADDRESS,
    amount: String(Math.round(amount * 1_000_000)),
    waitForFinalization: true
  };
}

function renderMetrics() {
  els.publicMetricLabel.textContent =
    state.wallet.publicBalance == null ? "--" : `${state.wallet.publicBalance} USDC`;
  els.confidentialMetricLabel.textContent =
    state.wallet.confidentialBalance == null ? "--" : `${state.wallet.confidentialBalance} USDC`;
  els.pendingMetricLabel.textContent =
    state.wallet.pendingBalance == null ? "Refresh after connect" : `${state.wallet.pendingBalance} pending`;

  const activeQueue = state.queue.filter((item) => item.status !== "sent");
  const readyQueue = activeQueue.filter((item) => evaluateQueueItem(item).status === "ready");
  const next = activeQueue
    .filter(isItemDue)
    .find((item) => evaluateQueueItem(item).status === "ready") || activeQueue[0];

  els.queueMetricLabel.textContent = String(activeQueue.length);
  els.nextPaymentDetail.textContent = next
    ? `${next.due} · ${getRecipient(next.recipientId)?.name || "Unknown"}`
    : "No queued transfers";

  const checks = [
    document.querySelector("#allowlistCheck").checked,
    document.querySelector("#approvalSelect").value === "yes"
  ].filter(Boolean).length;
  els.agentMetricLabel.textContent = state.agent.address ? "Loaded" : "Not loaded";
  els.policyChecksLabel.textContent = `${readyQueue.length} ready · ${checks} checks active`;
}

function renderRecipients() {
  const selected = els.recipientSelect.value;
  els.recipientSelect.innerHTML = state.recipients
    .map((recipient) => `<option value="${recipient.id}">${recipient.name}</option>`)
    .join("");
  if (!state.recipients.length) {
    els.recipientSelect.innerHTML = `<option value="">Add recipient first</option>`;
  }
  if (state.recipients.some((recipient) => recipient.id === selected)) {
    els.recipientSelect.value = selected;
  }
  els.recipientStatusLabel.textContent = "Recipient Stabletrust status not checked.";

  els.recipientList.innerHTML = state.recipients
    .map(
      (recipient) => `
        <div class="recipient">
          <div>
            <strong>${recipient.name}</strong>
            <div class="address">${recipient.address}</div>
          </div>
          <span class="tag ${recipient.approved ? "ready" : "waiting"}">
            ${recipient.approved ? "Approved" : "Review"}
          </span>
          <button class="mini-button danger" data-remove-recipient="${recipient.id}" type="button">Remove</button>
        </div>
      `
    )
    .join("");
}

function evaluateQueueItem(item) {
  const recipient = getRecipient(item.recipientId);
  if (!recipient?.approved) return { status: "blocked", reason: "Recipient not approved" };
  if (!item.approved) return { status: "waiting", reason: "Approval required" };
  return { status: "ready", reason: "Ready to execute" };
}

function renderQueue() {
  els.queueList.innerHTML = state.queue
    .filter((item) => item.status !== "sent")
    .map((item) => {
      const check = evaluateQueueItem(item);
      item.status = check.status;
      const recipient = getRecipient(item.recipientId);
      return `
        <div class="queue-item">
          <div>
            <strong>${item.ruleName}</strong>
            <div class="muted-line">${recipient?.name || "Unknown"} · ${money(item.amount, item.token)} · ${item.due}</div>
            <div class="tag-row">
              <span class="tag ${check.status}">${check.reason}</span>
              <span class="tag">${item.cadence}</span>
              <span class="tag">confidential</span>
            </div>
          </div>
          <div class="queue-actions">
            <button class="mini-button" data-approve="${item.id}" type="button">Approve</button>
            <button class="mini-button execute" data-execute="${item.id}" type="button">Run</button>
          </div>
        </div>
      `;
    })
    .join("");

  if (!els.queueList.innerHTML) {
    els.queueList.innerHTML = `<div class="queue-item"><strong>No queued transfers</strong><span class="muted-line">Create a rule to schedule the next private payment.</span></div>`;
  }
}

function renderActivity() {
  els.activityLog.innerHTML = state.activity
    .map(
      (entry) => `
        <div class="log-item">
          <span class="log-dot"></span>
          <div>
            <strong>${entry.title}</strong>
            <div class="muted-line">${entry.time} · ${entry.detail}</div>
          </div>
        </div>
      `
    )
    .join("");
}

function renderAgentChat() {
  if (!els.agentChatLog) return;
  if (!state.chat.length) {
    els.agentChatLog.innerHTML = `
      <div class="chat-message agent">
        Load an agent key, then write a command like: send 1 USDC to 0x... now.
      </div>
    `;
    return;
  }
  els.agentChatLog.innerHTML = state.chat
    .slice(0, 8)
    .map((entry) => `<div class="chat-message ${entry.role}">${escapeHtml(entry.text)}</div>`)
    .join("");
}

function renderActivityWithLinks() {
  els.activityLog.innerHTML = state.activity
    .map((entry) => {
      const txLink = isTransactionHash(entry.txHash)
        ? ` <a class="tx-link" href="${explorerTxUrl(entry.txHash)}" target="_blank" rel="noreferrer">View tx</a>`
        : "";
      return `
        <div class="log-item">
          <span class="log-dot"></span>
          <div>
            <strong>${entry.title}</strong>
            <div class="muted-line">${entry.time} · ${entry.detail}${txLink}</div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderApiPreview() {
  const payload = getSelectedRulePayload();
  els.curlPreview.textContent = `curl -X POST ${API_BASE}/transfer \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload, null, 2)}'`;
}

async function checkSelectedRecipient() {
  const recipient = getRecipient(els.recipientSelect.value);
  if (!recipient) return;

  try {
    const address = normalizeAddress(recipient.address);
    els.recipientStatusLabel.textContent = `Checking ${address}...`;
    const info = await stabletrustClient.getAccountInfo(address);
    if (!info.exists) {
      els.recipientStatusLabel.textContent = `No Stabletrust account on Base Sepolia for ${address}.`;
      showToast("Recipient must initialize on Base Sepolia first.");
      return;
    }
    if (!info.finalized) {
      els.recipientStatusLabel.textContent = `Account exists for ${address}, but is not finalized yet.`;
      showToast("Recipient account exists but is still finalizing.");
      return;
    }
    els.recipientStatusLabel.textContent = `Ready: ${address} is initialized and finalized.`;
    showToast("Recipient is ready");
  } catch (error) {
    els.recipientStatusLabel.textContent = error.message;
    showToast(error.message);
  }
}

async function checkSelfAccount() {
  if (!state.wallet.address) {
    showToast("Connect wallet first.");
    return;
  }

  try {
    els.selfAccountStatusLabel.textContent = "Checking your Stabletrust account...";
    const info = await stabletrustClient.getAccountInfo(state.wallet.address);
    if (!info.exists) {
      els.selfAccountStatusLabel.textContent = "No Stabletrust account for this wallet on Base Sepolia.";
      return;
    }
    els.selfAccountStatusLabel.textContent = info.finalized
      ? "Your Stabletrust account exists and is finalized."
      : "Your Stabletrust account exists, but is still finalizing.";
  } catch (error) {
    els.selfAccountStatusLabel.textContent = error.message;
    showToast(error.message);
  }
}

function renderMode() {
  const connected = Boolean(state.wallet.address);
  els.walletAddressLabel.textContent = connected ? shortenAddress(state.wallet.address) : "Not connected";
  els.connectWalletButton.textContent = connected ? "Connected" : "Connect";
  els.walletFullAddressLabel.textContent = connected ? state.wallet.address : "";
  els.contractAddressLabel.textContent = `Stabletrust contract: ${stabletrustClient.config.contractAddress}`;
  els.chainLabel.textContent = connected
    ? state.wallet.chainId === BASE_SEPOLIA.chainId
      ? "Base Sepolia connected"
      : `Wrong network: ${state.wallet.chainId || "unknown"}`
    : "Connect MetaMask or another EVM wallet.";
  els.publicUsdcLabel.textContent =
    state.wallet.publicBalance == null ? "--" : `${state.wallet.publicBalance} USDC`;
  els.walletConfidentialLabel.textContent =
    state.wallet.confidentialBalance == null
      ? state.wallet.address
        ? "Initialize needed"
        : "--"
      : `${state.wallet.confidentialBalance} USDC`;
  els.agentStateLabel.textContent = connected ? "Wallet connected" : "Simulation active";
  els.agentStateDetail.textContent = state.wallet.keys
    ? "Confidential account initialized"
    : "No private key stored";
  els.agentWalletLabel.textContent = state.agent.address
    ? shortenAddress(state.agent.address)
    : "No agent key loaded";
  els.agentModeLabel.textContent = state.agent.running
    ? "Auto scheduler is running in this browser tab."
    : state.agent.address
      ? "Agent key loaded in memory only."
      : "Use a dedicated Base Sepolia test wallet only.";
}

function renderAll() {
  renderMetrics();
  renderRecipients();
  renderQueue();
  renderActivityWithLinks();
  renderAgentChat();
  renderApiPreview();
  renderMode();
}

function addActivity(title, detail) {
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  state.activity.unshift({ time, title, detail });
  state.activity = state.activity.slice(0, 8);
  saveState();
  renderActivityWithLinks();
}

function addActivityWithMeta(title, detail, meta = {}) {
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  state.activity.unshift({ time, title, detail, txHash: meta.txHash || "" });
  state.activity = state.activity.slice(0, 8);
  saveState();
  renderActivityWithLinks();
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.setTimeout(() => els.toast.classList.remove("show"), 2600);
}

function addChatMessage(role, text) {
  state.chat.unshift({ role, text });
  state.chat = state.chat.slice(0, 12);
  saveState();
  renderAgentChat();
}

function getInjectedWallet() {
  if (!window.ethereum) {
    throw new Error("EVM wallet not found. Install MetaMask or open in a wallet browser.");
  }
  return window.ethereum;
}

async function switchToBaseSepolia() {
  const ethereum = getInjectedWallet();
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BASE_SEPOLIA.chainHex }]
    });
  } catch (error) {
    if (error.code !== 4902) throw error;
    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: BASE_SEPOLIA.chainHex,
          chainName: BASE_SEPOLIA.name,
          nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: [BASE_SEPOLIA.rpcUrl],
          blockExplorerUrls: [BASE_SEPOLIA.blockExplorerUrl]
        }
      ]
    });
  }
}

async function syncWalletState() {
  if (!state.wallet.browserProvider) return;
  const network = await state.wallet.browserProvider.getNetwork();
  state.wallet.chainId = Number(network.chainId);
  if (state.wallet.signer) {
    state.wallet.address = await state.wallet.signer.getAddress();
  }
  renderMode();
}

async function connectWallet() {
  try {
    const ethereum = getInjectedWallet();
    await ethereum.request({ method: "eth_requestAccounts" });
    await switchToBaseSepolia();
    state.wallet.browserProvider = new ethers.BrowserProvider(ethereum);
    state.wallet.signer = await state.wallet.browserProvider.getSigner();
    await syncWalletState();
    addActivity("Wallet connected", `${shortenAddress(state.wallet.address)} on Base Sepolia.`);
    await refreshWalletBalances();
    showToast("Wallet connected");
  } catch (error) {
    showToast(error.message);
    addActivity("Wallet connection failed", error.message);
  }
}

async function ensureWalletReady() {
  if (!state.wallet.signer) {
    await connectWallet();
  }
  if (state.wallet.chainId !== BASE_SEPOLIA.chainId) {
    await switchToBaseSepolia();
    await syncWalletState();
  }
  if (!state.wallet.signer) {
    throw new Error("Connect wallet first.");
  }
}

async function initializeConfidentialAccount() {
  try {
    await ensureWalletReady();
    showToast("Sign to derive keys, then wait for account finalization...");
    state.wallet.keys = await stabletrustClient.ensureAccount(state.wallet.signer, {
      waitForFinalization: true,
      maxAttempts: 225
    });
    await checkSelfAccount();
    addActivity("Confidential account initialized", "Stabletrust account is ready on Base Sepolia.");
    await refreshWalletBalances();
    showToast("Confidential account ready");
  } catch (error) {
    showToast(error.message);
    addActivity("Initialization failed", error.message);
  }
}

async function refreshWalletBalances() {
  try {
    await ensureWalletReady();
    const publicBalance = await stabletrustClient.getPublicBalance(state.wallet.address, TOKEN_ADDRESS);
    state.wallet.publicBalance = formatUnits(publicBalance);

    const accountInfo = await stabletrustClient.getAccountInfo(state.wallet.address);
    if (!accountInfo.exists) {
      state.wallet.confidentialBalance = null;
      state.wallet.pendingBalance = null;
      els.selfAccountStatusLabel.textContent = "No Stabletrust account yet. Click Initialize.";
      renderAll();
      showToast("Public balance refreshed. Initialize to read confidential balance.");
      return;
    }

    if (!accountInfo.finalized) {
      state.wallet.confidentialBalance = null;
      state.wallet.pendingBalance = null;
      els.selfAccountStatusLabel.textContent = "Stabletrust account exists, but is still finalizing.";
      renderAll();
      showToast("Account is still finalizing.");
      return;
    }

    if (!state.wallet.keys?.privateKey) {
      showToast("Sign once to derive keys for confidential balance.");
      state.wallet.keys = await stabletrustClient.ensureAccount(state.wallet.signer, {
        waitForFinalization: true,
        maxAttempts: 225
      });
    }

    if (state.wallet.keys?.privateKey) {
      const confidential = await stabletrustClient.getConfidentialBalance(
        state.wallet.address,
        state.wallet.keys.privateKey,
        TOKEN_ADDRESS
      );
      state.wallet.confidentialBalance = formatUnits(confidential.amount);
      state.wallet.pendingBalance = `${formatUnits(confidential.pending.amount)} USDC`;
      els.selfAccountStatusLabel.textContent = "Your Stabletrust account exists and is finalized.";
    }

    renderAll();
    showToast("Balances refreshed");
  } catch (error) {
    showToast(error.message);
    addActivity("Balance refresh failed", error.message);
  }
}

function getTestAmount() {
  const value = els.testAmountInput.value.trim();
  if (!value || Number(value) <= 0) {
    throw new Error("Enter a positive test amount.");
  }
  return ethers.parseUnits(value, TOKEN_DECIMALS);
}

async function agentApiPost(path, body = {}) {
  const savedPrivateKey = getSavedAgentKey();
  const payloadBody = savedPrivateKey && !body.privateKey
    ? { privateKey: savedPrivateKey, ...body }
    : body;
  const response = await fetch(`${AGENT_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payloadBody)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Agent API returned ${response.status}`);
  }
  return payload;
}

async function agentApiGet(path) {
  const response = await fetch(`${AGENT_API_BASE}${path}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Agent API returned ${response.status}`);
  }
  return payload;
}

function getSavedAgentKey() {
  return localStorage.getItem(AGENT_KEY_STORAGE_KEY) || "";
}

function rememberAgentKey(privateKey) {
  localStorage.setItem(AGENT_KEY_STORAGE_KEY, privateKey);
}

function forgetAgentKey() {
  localStorage.removeItem(AGENT_KEY_STORAGE_KEY);
  els.agentPrivateKeyInput.value = "";
  els.rememberAgentKeyCheck.checked = false;
  state.agent.address = "";
  state.agent.keys = null;
  addActivity("Agent key forgotten", "Saved test agent key was removed from this browser.");
  renderAll();
  showToast("Saved test key removed");
}

function hydrateSavedAgentKey() {
  const savedKey = getSavedAgentKey();
  if (!savedKey) return;
  els.agentPrivateKeyInput.value = savedKey;
  els.rememberAgentKeyCheck.checked = true;
  els.agentModeLabel.textContent = "Saved test key found in this browser. Click Load key.";
}

function getExecutionSigner() {
  if (state.wallet.signer && state.wallet.keys) {
    return { signer: state.wallet.signer, keys: state.wallet.keys, address: state.wallet.address, source: "wallet" };
  }
  return null;
}

function loadAgentKey() {
  try {
    const privateKey = els.agentPrivateKeyInput.value.trim();
    if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
      throw new Error("Private key must be 0x + 64 hex characters.");
    }
    agentApiPost("/agent/key", { privateKey }).then((payload) => {
      state.agent.wallet = null;
      state.agent.address = payload.address;
      state.agent.keys = { api: true };
      if (els.rememberAgentKeyCheck.checked) {
        rememberAgentKey(privateKey);
      }
      els.agentPrivateKeyInput.value = "";
      addActivity(
        "Agent key loaded",
        els.rememberAgentKeyCheck.checked
          ? `${shortenAddress(state.agent.address)} loaded and remembered in this browser.`
          : `${shortenAddress(state.agent.address)} loaded into local API agent memory.`
      );
      renderAll();
      showToast("Agent key loaded in API agent");
    }).catch((error) => {
      showToast(error.message);
      addActivity("Agent key failed", error.message);
    });
  } catch (error) {
    showToast(error.message);
    addActivity("Agent key failed", error.message);
  }
}

async function initializeAgentAccount() {
  try {
    if (!state.agent.address) {
      throw new Error("Load agent private key first.");
    }
    showToast("Checking agent through Stabletrust API...");
    const payload = await agentApiPost("/agent/balance", { tokenAddress: TOKEN_ADDRESS });
    state.agent.keys = { api: true };
    addActivity("Agent API checked", `Stabletrust API balance response received for ${shortenAddress(state.agent.address)}.`);
    renderAll();
    showToast("Agent API ready");
  } catch (error) {
    showToast(error.message);
    addActivity("Agent API check failed", error.message);
  }
}

async function depositFromWallet() {
  try {
    await ensureWalletReady();
    if (!state.wallet.keys) {
      await initializeConfidentialAccount();
    }
    const amount = getTestAmount();
    showToast("Submitting confidential deposit...");
    const receipt = await stabletrustClient.confidentialDeposit(state.wallet.signer, TOKEN_ADDRESS, amount, {
      waitForFinalization: true
    });
    addActivityWithMeta("Deposit submitted", `Tx ${receipt.hash || "confirmed"} on Base Sepolia.`, {
      txHash: receipt.hash
    });
    await refreshWalletBalances();
    showToast("Deposit complete");
  } catch (error) {
    showToast(error.message);
    addActivity("Deposit failed", error.message);
  }
}

async function withdrawToWallet() {
  try {
    await ensureWalletReady();
    if (!state.wallet.keys) {
      throw new Error("Initialize confidential account first.");
    }
    const amount = getTestAmount();
    showToast("Submitting confidential withdrawal...");
    const receipt = await stabletrustClient.withdraw(state.wallet.signer, TOKEN_ADDRESS, amount, {
      waitForFinalization: true
    });
    addActivityWithMeta("Withdrawal submitted", `Tx ${receipt.hash || "confirmed"} on Base Sepolia.`, {
      txHash: receipt.hash
    });
    await refreshWalletBalances();
    showToast("Withdrawal complete");
  } catch (error) {
    showToast(error.message);
    addActivity("Withdrawal failed", error.message);
  }
}

async function stabletrustTransfer(item) {
  const recipient = getRecipient(item.recipientId);
  const recipientAddress = normalizeAddress(recipient.address);
  if (state.agent.address) {
    const payload = await agentApiPost("/agent/transfer", {
      recipientAddress,
      tokenAddress: TOKEN_ADDRESS,
      amount: String(ethers.parseUnits(String(item.amount), TOKEN_DECIMALS)),
      waitForFinalization: true
    });
    const hash = extractTransactionHash(payload);
    return {
      receipt: {
        hash,
        label: hash || extractTransactionLabel(payload)
      }
    };
  }

  const execution = getExecutionSigner();
  if (!execution) {
    throw new Error("Connect and initialize sender wallet, or load and initialize an agent key.");
  }

  if (execution.source === "wallet") {
    await ensureWalletReady();
  }
  return stabletrustClient.confidentialTransfer(
    execution.signer,
    recipientAddress,
    TOKEN_ADDRESS,
    ethers.parseUnits(String(item.amount), TOKEN_DECIMALS),
    {
      waitForFinalization: true,
      useOffchainVerify: false
    }
  ).then((receipt) => ({
    receipt: { hash: receipt.hash, label: receipt.hash }
  }));
}

function isItemDue(item) {
  if (!item.dueAt) return true;
  return Date.now() >= item.dueAt;
}

function formatDueLabel(dueAt) {
  const date = new Date(dueAt);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === today.toDateString()) return `Today, ${time}`;
  if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`;
  return `${date.toLocaleDateString()} ${time}`;
}

function resolveChatRecipient(text) {
  const addressMatch = text.match(/0x[a-fA-F0-9]{40}/);
  if (addressMatch) {
    const address = normalizeAddress(addressMatch[0]);
    let recipient = state.recipients.find((item) => item.address.toLowerCase() === address.toLowerCase());
    if (!recipient) {
      recipient = {
        id: crypto.randomUUID(),
        name: `Recipient ${shortenAddress(address)}`,
        address,
        approved: true
      };
      state.recipients.push(recipient);
    } else {
      recipient.approved = true;
    }
    return recipient;
  }

  const lower = text.toLowerCase();
  const recipient = state.recipients.find((item) => lower.includes(item.name.toLowerCase()));
  if (!recipient) {
    throw new Error("I need a 0x recipient address or an existing allowlist name.");
  }
  recipient.approved = true;
  return recipient;
}

function parseChatAmount(text) {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:usdc|юсдс|юсдц|usdс)/i);
  if (!match) throw new Error("I need an amount like 1 USDC.");
  const amount = Number.parseFloat(match[1].replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be greater than zero.");
  return amount;
}

function parseChatDueAt(text) {
  const lower = text.toLowerCase();
  if (/(now|сейчас|сразу|немедленно)/i.test(lower)) return Date.now();

  const minutesMatch = lower.match(/через\s+(\d+)\s*(?:мин|минут|minutes?)/i);
  if (minutesMatch) return Date.now() + Number(minutesMatch[1]) * 60_000;

  const hoursMatch = lower.match(/через\s+(\d+)\s*(?:час|часа|часов|hours?)/i);
  if (hoursMatch) return Date.now() + Number(hoursMatch[1]) * 3_600_000;

  const timeMatch = lower.match(/(?:(завтра|сегодня)\s*)?(?:в|at)?\s*(\d{1,2})[:.](\d{2})/i);
  if (timeMatch) {
    const dueAt = new Date();
    const dayWord = timeMatch[1];
    dueAt.setHours(Number(timeMatch[2]), Number(timeMatch[3]), 0, 0);
    if (dayWord === "завтра") {
      dueAt.setDate(dueAt.getDate() + 1);
    } else if (dueAt.getTime() < Date.now()) {
      dueAt.setDate(dueAt.getDate() + 1);
    }
    return dueAt.getTime();
  }

  return Date.now();
}

function parseChatAmountNormalized(text) {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:usdc|usd|юсдс|юсдц)/i);
  if (!match) throw new Error("I need an amount like 1 USDC.");
  const amount = Number.parseFloat(match[1].replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be greater than zero.");
  return amount;
}

function parseChatDueAtNormalized(text) {
  const lower = text.toLowerCase();
  if (/(now|сейчас|сразу|немедленно)/i.test(lower)) return Date.now();

  const minutesMatch = lower.match(/(?:через|in)\s+(\d+)\s*(?:мин|минут|minutes?|mins?)/i);
  if (minutesMatch) return Date.now() + Number(minutesMatch[1]) * 60_000;

  const hoursMatch = lower.match(/(?:через|in)\s+(\d+)\s*(?:час|часа|часов|hours?|hrs?)/i);
  if (hoursMatch) return Date.now() + Number(hoursMatch[1]) * 3_600_000;

  const timeMatch = lower.match(/(?:(завтра|сегодня|tomorrow|today)\s*)?(?:в|at)?\s*(\d{1,2})[:.](\d{2})/i);
  if (timeMatch) {
    const dueAt = new Date();
    const dayWord = timeMatch[1];
    dueAt.setHours(Number(timeMatch[2]), Number(timeMatch[3]), 0, 0);
    if (dayWord === "завтра" || dayWord === "tomorrow") {
      dueAt.setDate(dueAt.getDate() + 1);
    } else if (dueAt.getTime() < Date.now()) {
      dueAt.setDate(dueAt.getDate() + 1);
    }
    return dueAt.getTime();
  }

  return Date.now();
}

async function runDueTransfers({ automatic = false } = {}) {
  const ready = state.queue.find((item) => evaluateQueueItem(item).status === "ready" && isItemDue(item));
  if (!ready) {
    if (!automatic) showToast("No ready due transfers.");
    return;
  }
  await executeItem(ready.id);
}

function startScheduler() {
  if (!state.agent.address || !state.agent.keys) {
    showToast("Load and check agent API key first.");
    return;
  }
  if (state.agent.schedulerId) {
    showToast("Auto scheduler is already running.");
    return;
  }
  state.agent.running = true;
  state.agent.schedulerId = window.setInterval(() => {
    runDueTransfers({ automatic: true });
  }, 15_000);
  addActivity("Auto scheduler started", "Agent will check due transfers every 15 seconds while this tab is open.");
  renderAll();
  showToast("Auto scheduler started");
}

function stopScheduler() {
  if (state.agent.schedulerId) {
    window.clearInterval(state.agent.schedulerId);
    state.agent.schedulerId = null;
  }
  state.agent.running = false;
  addActivity("Auto scheduler stopped", "Autonomous execution paused.");
  renderAll();
  showToast("Auto scheduler stopped");
}

function ensureAgentReadyForChat() {
  if (!state.agent.address || !state.agent.keys) {
    throw new Error("Load the agent private key and click Check API agent first.");
  }
}

async function handleAgentChat(event) {
  event.preventDefault();
  const text = els.agentChatInput.value.trim();
  if (!text) return;

  addChatMessage("user", text);
  els.agentChatInput.value = "";

  try {
    ensureAgentReadyForChat();
    const amount = parseChatAmountNormalized(text);
    const recipient = resolveChatRecipient(text);
    const dueAt = parseChatDueAtNormalized(text);
    const item = {
      id: crypto.randomUUID(),
      ruleName: "Chat command",
      recipientId: recipient.id,
      amount,
      token: "USDC",
      cadence: "once",
      due: formatDueLabel(dueAt),
      dueAt,
      approved: true,
      status: "ready",
      source: "agent-chat"
    };

    state.queue.unshift(item);
    saveState();
    addActivity("Chat task created", `${money(amount)} to ${recipient.name} at ${item.due}.`);
    renderAll();

    if (isItemDue(item)) {
      addChatMessage("agent", `Got it. Sending ${money(amount)} to ${recipient.name} now through Fairblock API.`);
      await executeItem(item.id);
    } else {
      if (!state.agent.running) startScheduler();
      addChatMessage("agent", `Scheduled ${money(amount)} to ${recipient.name} for ${item.due}. No approval needed.`);
    }
  } catch (error) {
    addChatMessage("agent", error.message);
    addActivity("Chat command failed", error.message);
    showToast(error.message);
  }
}

if (window.ethereum) {
  window.ethereum.on?.("accountsChanged", () => {
    state.wallet.keys = null;
    connectWallet();
  });
  window.ethereum.on?.("chainChanged", () => {
    window.location.reload();
  });
}

async function executeItem(id) {
  const item = state.queue.find((candidate) => candidate.id === id);
  if (!item) return;

  const check = evaluateQueueItem(item);
  if (check.status !== "ready") {
    showToast(check.reason);
    return;
  }

  try {
    showToast("Submitting confidential transfer...");
    const result = await stabletrustTransfer(item);
    item.status = "sent";
    saveState();
    addActivityWithMeta(
      "Confidential transfer submitted",
      `${money(item.amount, item.token)} to ${getRecipient(item.recipientId).name}; tx ${result.receipt?.label || result.receipt?.hash || "submitted"}.`,
      { txHash: result.receipt?.hash }
    );
    renderAll();
    showToast("Transfer submitted");
  } catch (error) {
    addActivity("Transfer failed", error.message);
    showToast(error.message);
  }
}

function createRule(event) {
  event.preventDefault();
  const recipientId = document.querySelector("#recipientSelect").value;
  const amount = Number.parseFloat(document.querySelector("#amountInput").value || "0");
  const token = document.querySelector("#tokenSelect").value;
  const cadence = document.querySelector("#cadenceSelect").value;
  const time = document.querySelector("#timeInput").value;
  const requiresApproval = document.querySelector("#approvalSelect").value === "yes";
  const agentName = document.querySelector("#agentName").value.trim() || "Autopay agent";

  if (!recipientId || !getRecipient(recipientId)) {
    showToast("Add a recipient first.");
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    showToast("Enter a valid amount.");
    return;
  }

  const [hours, minutes] = time.split(":").map(Number);
  const dueAt = new Date();
  dueAt.setHours(hours || 0, minutes || 0, 0, 0);
  if (dueAt.getTime() < Date.now()) {
    dueAt.setDate(dueAt.getDate() + 1);
  }

  const item = {
    id: crypto.randomUUID(),
    ruleName: agentName,
    recipientId,
    amount,
    token,
    cadence,
    due: cadence === "once" ? `Today, ${time}` : `Next ${cadence}, ${time}`,
    dueAt: dueAt.getTime(),
    approved: !requiresApproval,
    status: requiresApproval ? "waiting" : "ready"
  };

  state.queue.unshift(item);
  saveState();
  addActivity("Rule created", `${agentName} scheduled ${money(amount, token)} for ${getRecipient(recipientId).name}.`);
  renderAll();
  showToast("Rule created");
}

function resetRule() {
  document.querySelector("#agentName").value = "";
  document.querySelector("#amountInput").value = "1.00";
  document.querySelector("#cadenceSelect").value = "once";
  document.querySelector("#timeInput").value = "18:00";
  document.querySelector("#approvalSelect").value = "yes";
  renderAll();
}

function addRecipient() {
  const name = document.querySelector("#newRecipientName").value.trim();
  const rawAddress = document.querySelector("#newRecipientAddress").value.trim();
  if (!name) {
    showToast("Recipient needs a name.");
    return;
  }

  try {
    const address = normalizeAddress(rawAddress);
    state.recipients.push({
      id: crypto.randomUUID(),
      name,
      address,
      approved: true
    });

    saveState();
    document.querySelector("#recipientDialog").close();
    addActivity("Recipient approved", `${name} added to allowlist.`);
    renderAll();
  } catch (error) {
    showToast(error.message);
  }
}

function removeRecipient(id) {
  const recipient = getRecipient(id);
  if (!recipient) return;
  const beforeQueueLength = state.queue.length;
  state.recipients = state.recipients.filter((item) => item.id !== id);
  state.queue = state.queue.filter((item) => item.recipientId !== id || item.status === "sent");
  const removedQueueCount = beforeQueueLength - state.queue.length;
  saveState();
  addActivity(
    "Recipient removed",
    removedQueueCount
      ? `${recipient.name} removed from allowlist; ${removedQueueCount} queued task(s) removed.`
      : `${recipient.name} removed from allowlist.`
  );
  renderAll();
}

function runDue() {
  runDueTransfers();
}

document.querySelector("#queueList").addEventListener("click", (event) => {
  const approveId = event.target.dataset.approve;
  const executeId = event.target.dataset.execute;

  if (approveId) {
    const item = state.queue.find((candidate) => candidate.id === approveId);
    item.approved = true;
    saveState();
    addActivity("Transfer approved", `${item.ruleName} can run when policy checks pass.`);
    renderAll();
  }

  if (executeId) {
    executeItem(executeId);
  }
});

els.recipientList.addEventListener("click", (event) => {
  const removeId = event.target.dataset.removeRecipient;
  if (removeId) {
    removeRecipient(removeId);
  }
});

document.querySelector("#runDueButton").addEventListener("click", runDue);
document.querySelector("#ruleForm").addEventListener("submit", createRule);
document.querySelector("#resetRuleButton").addEventListener("click", resetRule);
document.querySelector("#addRecipientButton").addEventListener("click", () => {
  document.querySelector("#recipientDialog").showModal();
});
els.addRecipientInlineButton.addEventListener("click", () => {
  document.querySelector("#recipientDialog").showModal();
});
document.querySelector("#saveRecipientButton").addEventListener("click", addRecipient);
document.querySelector("#approveAllButton").addEventListener("click", () => {
  state.queue.forEach((item) => {
    item.approved = true;
  });
  saveState();
  addActivity("Queue approved", "All pending transfers were approved for policy evaluation.");
  renderAll();
});
els.clearQueueButton.addEventListener("click", () => {
  state.queue = [];
  saveState();
  addActivity("Queue cleared", "All pending transfer tasks were removed.");
  renderAll();
});
document.querySelector("#clearLogButton").addEventListener("click", () => {
  state.activity = [];
  saveState();
  renderActivityWithLinks();
});
document.querySelector("#refreshButton").addEventListener("click", () => {
  refreshWalletBalances();
});
document.querySelector("#copyCurlButton").addEventListener("click", async () => {
  await navigator.clipboard.writeText(els.curlPreview.textContent);
  showToast("Copied Stabletrust call");
});
els.checkRecipientButton.addEventListener("click", checkSelectedRecipient);
els.connectWalletButton.addEventListener("click", connectWallet);
els.switchNetworkButton.addEventListener("click", async () => {
  try {
    await switchToBaseSepolia();
    await syncWalletState();
    showToast("Switched to Base Sepolia");
  } catch (error) {
    showToast(error.message);
  }
});
els.initAccountButton.addEventListener("click", initializeConfidentialAccount);
els.refreshWalletBalanceButton.addEventListener("click", refreshWalletBalances);
els.depositButton.addEventListener("click", depositFromWallet);
els.withdrawButton.addEventListener("click", withdrawToWallet);
els.loadAgentKeyButton.addEventListener("click", loadAgentKey);
els.forgetAgentKeyButton.addEventListener("click", forgetAgentKey);
els.initAgentButton.addEventListener("click", initializeAgentAccount);
els.startSchedulerButton.addEventListener("click", startScheduler);
els.stopSchedulerButton.addEventListener("click", stopScheduler);
els.agentChatForm.addEventListener("submit", handleAgentChat);
els.clearAgentChatButton.addEventListener("click", () => {
  state.chat = [];
  saveState();
  renderAgentChat();
});

[
  "#recipientSelect",
  "#amountInput",
  "#tokenSelect",
  "#allowlistCheck",
  "#approvalSelect",
  "#testAmountInput"
].forEach((selector) => {
  document.querySelector(selector).addEventListener("input", () => {
    saveState();
    renderAll();
  });
});

hydrateSavedAgentKey();
renderAll();
