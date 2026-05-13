import { Buffer } from "buffer";
import { ethers } from "ethers";
import { ConfidentialTransferClient } from "@fairblock/stabletrust";

globalThis.Buffer = globalThis.Buffer || Buffer;

const TOKEN_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const TOKEN_DECIMALS = 6;
const BASE_SEPOLIA = {
  chainId: 84532,
  chainHex: "0x14a34",
  name: "Base Sepolia",
  rpcUrl: "https://sepolia.base.org",
  blockExplorerUrl: "https://sepolia.basescan.org"
};
const client = new ConfidentialTransferClient(BASE_SEPOLIA.rpcUrl, BASE_SEPOLIA.chainId);

const state = {
  provider: null,
  signer: null,
  address: "",
  chainId: null,
  keys: null,
  mode: "receive"
};

const els = {
  title: document.querySelector("#actionTitle"),
  walletAddress: document.querySelector("#walletAddressLabel"),
  chain: document.querySelector("#chainLabel"),
  status: document.querySelector("#selfAccountStatusLabel"),
  publicBalance: document.querySelector("#actionPublicBalance"),
  confidentialBalance: document.querySelector("#actionConfidentialBalance"),
  receiveAction: document.querySelector("#receiveAction"),
  sendAction: document.querySelector("#sendAction"),
  withdrawAction: document.querySelector("#withdrawAction"),
  connect: document.querySelector("#actionConnectButton"),
  switchNetwork: document.querySelector("#actionSwitchNetworkButton"),
  activate: document.querySelector("#actionActivateButton"),
  refresh: document.querySelector("#actionRefreshButton"),
  receiveMode: document.querySelector("#quickReceiveButton"),
  sendMode: document.querySelector("#quickSendButton"),
  withdrawMode: document.querySelector("#quickWithdrawButton"),
  recipient: document.querySelector("#simpleRecipientInput"),
  sendAmount: document.querySelector("#simpleSendAmountInput"),
  recipientStatus: document.querySelector("#simpleRecipientStatusLabel"),
  checkRecipient: document.querySelector("#simpleCheckRecipientButton"),
  send: document.querySelector("#simpleSendButton"),
  withdrawAmount: document.querySelector("#simpleWithdrawAmountInput"),
  withdraw: document.querySelector("#simpleWithdrawButton"),
  toast: document.querySelector("#toast")
};

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.setTimeout(() => els.toast.classList.remove("show"), 2600);
}

function shorten(address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not connected";
}

function format(value) {
  return `${Number(ethers.formatUnits(value || 0n, TOKEN_DECIMALS)).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  })} USDC`;
}

function normalize(address) {
  const trimmed = address.trim();
  if (!trimmed.startsWith("0x") || trimmed.length !== 42) {
    throw new Error("Address must be 0x + 40 hex characters.");
  }
  return ethers.getAddress(trimmed.toLowerCase());
}

function injected() {
  if (!window.ethereum) throw new Error("EVM wallet not found. Open this page in a browser with MetaMask.");
  return window.ethereum;
}

async function switchNetwork() {
  const ethereum = injected();
  try {
    await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BASE_SEPOLIA.chainHex }] });
  } catch (error) {
    if (error.code !== 4902) throw error;
    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: BASE_SEPOLIA.chainHex,
        chainName: BASE_SEPOLIA.name,
        nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: [BASE_SEPOLIA.rpcUrl],
        blockExplorerUrls: [BASE_SEPOLIA.blockExplorerUrl]
      }]
    });
  }
}

async function sync() {
  if (!state.provider) return;
  const network = await state.provider.getNetwork();
  state.chainId = Number(network.chainId);
  if (state.signer) state.address = await state.signer.getAddress();
  els.walletAddress.textContent = shorten(state.address);
  els.connect.textContent = state.address ? "Connected" : "Connect";
  els.chain.textContent = state.chainId === BASE_SEPOLIA.chainId ? "Base Sepolia connected" : `Wrong network: ${state.chainId || "unknown"}`;
}

async function connect() {
  try {
    await injected().request({ method: "eth_requestAccounts" });
    await switchNetwork();
    state.provider = new ethers.BrowserProvider(injected());
    state.signer = await state.provider.getSigner();
    await sync();
    await refresh();
    toast("Wallet connected");
  } catch (error) {
    toast(error.message);
  }
}

async function ensureWallet() {
  if (!state.signer) await connect();
  if (state.chainId !== BASE_SEPOLIA.chainId) {
    await switchNetwork();
    await sync();
  }
  if (!state.signer) throw new Error("Connect wallet first.");
}

async function activate() {
  try {
    await ensureWallet();
    toast("Sign and wait for Fairblock account activation...");
    state.keys = await client.ensureAccount(state.signer, { waitForFinalization: true, maxAttempts: 225 });
    els.status.textContent = "Fairblock account is activated and finalized.";
    await refresh();
  } catch (error) {
    toast(error.message);
  }
}

async function refresh() {
  try {
    await ensureWallet();
    const publicBalance = await client.getPublicBalance(state.address, TOKEN_ADDRESS);
    els.publicBalance.textContent = format(publicBalance);

    const info = await client.getAccountInfo(state.address);
    if (!info.exists) {
      els.status.textContent = "No Fairblock account yet. Activate it first.";
      els.confidentialBalance.textContent = "--";
      return;
    }
    if (!info.finalized) {
      els.status.textContent = "Fairblock account exists, but is still finalizing.";
      return;
    }
    if (!state.keys?.privateKey) {
      toast("Sign once to decrypt confidential balance.");
      state.keys = await client.ensureAccount(state.signer, { waitForFinalization: true, maxAttempts: 225 });
    }
    const balance = await client.getConfidentialBalance(state.address, state.keys.privateKey, TOKEN_ADDRESS);
    els.confidentialBalance.textContent = format(balance.amount);
    els.status.textContent = `Fairblock account active. Pending: ${format(balance.pending.amount)}`;
  } catch (error) {
    toast(error.message);
  }
}

async function checkRecipient() {
  try {
    const address = normalize(els.recipient.value);
    const info = await client.getAccountInfo(address);
    if (!info.exists) {
      els.recipientStatus.textContent = "Recipient has no Fairblock account on Base Sepolia.";
      return;
    }
    els.recipientStatus.textContent = info.finalized ? "Recipient is ready." : "Recipient account is still finalizing.";
  } catch (error) {
    els.recipientStatus.textContent = error.message;
  }
}

async function send() {
  try {
    await ensureWallet();
    if (!state.keys?.privateKey) await activate();
    const recipient = normalize(els.recipient.value);
    const amount = ethers.parseUnits(els.sendAmount.value || "0", TOKEN_DECIMALS);
    if (amount <= 0n) throw new Error("Enter a positive amount.");
    toast("Submitting confidential payment...");
    const receipt = await client.confidentialTransfer(state.signer, recipient, TOKEN_ADDRESS, amount, {
      waitForFinalization: true,
      useOffchainVerify: false
    });
    toast(`Transfer sent: ${receipt.hash}`);
    await refresh();
  } catch (error) {
    toast(error.message);
  }
}

async function withdraw() {
  try {
    await ensureWallet();
    if (!state.keys?.privateKey) await activate();
    const amount = ethers.parseUnits(els.withdrawAmount.value || "0", TOKEN_DECIMALS);
    if (amount <= 0n) throw new Error("Enter a positive amount.");
    toast("Withdrawing to public USDC...");
    const receipt = await client.withdraw(state.signer, TOKEN_ADDRESS, amount, {
      waitForFinalization: true,
      useOffchainVerify: false
    });
    toast(`Withdraw sent: ${receipt.hash}`);
    await refresh();
  } catch (error) {
    toast(error.message);
  }
}

function setMode(mode) {
  state.mode = mode;
  els.receiveAction.classList.toggle("hidden", mode !== "receive");
  els.sendAction.classList.toggle("hidden", mode !== "send");
  els.withdrawAction.classList.toggle("hidden", mode !== "withdraw");
  els.title.textContent = {
    receive: "Check incoming confidential payment",
    send: "Send confidential payment",
    withdraw: "Withdraw to public"
  }[mode];
}

els.connect.addEventListener("click", connect);
els.switchNetwork.addEventListener("click", switchNetwork);
els.activate.addEventListener("click", activate);
els.refresh.addEventListener("click", refresh);
els.receiveMode.addEventListener("click", () => setMode("receive"));
els.sendMode.addEventListener("click", () => setMode("send"));
els.withdrawMode.addEventListener("click", () => setMode("withdraw"));
els.checkRecipient.addEventListener("click", checkRecipient);
els.send.addEventListener("click", send);
els.withdraw.addEventListener("click", withdraw);

if (window.ethereum) {
  window.ethereum.on?.("accountsChanged", () => window.location.reload());
  window.ethereum.on?.("chainChanged", () => window.location.reload());
}

setMode("receive");
