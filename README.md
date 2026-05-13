# Stabletrust Autopay Studio

No-code testnet interface for confidential USDC payments and payment-agent experiments using Fairblock Stabletrust on Base Sepolia.

The app lets users:

- connect an EVM wallet on Base Sepolia;
- activate a Fairblock/Stabletrust confidential account;
- deposit public test USDC into a confidential balance;
- send confidential USDC to another initialized account;
- withdraw confidential USDC back to public USDC;
- create scheduled payment tasks;
- try an autonomous API-agent mode for testnet demos.

Detailed bilingual guide:

- [USER_GUIDE_RU_EN.md](USER_GUIDE_RU_EN.md)

## Testnet Requirements

Use fresh testnet wallets only. Do not use a main wallet and do not paste a private key that controls real funds.

Recommended wallets:

- `Sender wallet` - used for normal browser wallet actions.
- `Receiver wallet` - used to receive confidential payments.
- `Agent wallet` - a dedicated testnet wallet for local autonomous agent demos.

Wallets that submit transactions need:

- Base Sepolia ETH for gas;
- Base Sepolia test USDC.

Base Sepolia settings:

```text
Chain ID: 84532
RPC: https://sepolia.base.org
Explorer: https://sepolia.basescan.org
```

Test USDC used by this prototype:

```text
0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

## Local Development

Install dependencies:

```bash
npm install
```

Run the web app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Run checks:

```bash
npm run check
npm run build
```

## Vercel Deployment

This is a Vite app. Vercel can deploy the web UI with the default Vite settings:

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

The deployed Vercel UI supports the wallet-based Stabletrust SDK flow and same-origin API-agent endpoints under `/api/agent/*`. Because the API is on the same Vercel domain, the browser should not request access to local services on the user's device.

For production, move private-key handling to a secure backend, embedded wallet, smart-account session key, TEE, MPC, or another dedicated custody architecture.

## API-Agent Demo

The API-agent mode is useful for testnet demos where a dedicated agent wallet sends through the Stabletrust HTTP API.

In the UI:

1. Paste the dedicated testnet `Agent wallet` private key.
2. Click `Load key`.
3. Click `Check API agent`.
4. Use the task builder or Agent Chat.

For convenience, `Remember test agent key in this browser` stores the dedicated testnet agent key in this browser's `localStorage`. Requests to `/api/agent/*` include that test key when needed, so Vercel can execute the Stabletrust API call without asking for localhost permissions. Use this only with a fresh testnet wallet. Click `Forget key` to remove it.

## Agent Chat

The mini chat currently uses a simple local parser, not an LLM.

Example commands:

```text
send 1 USDC to 0x1234... now
send 2.5 USDC to 0x1234... in 5 minutes
send 1.5 USDC to 0x1234... at 18:30
```

If the agent is ready, the app creates an approved task. If the task is due immediately, it sends through the Vercel API-agent. If it is scheduled for later, the browser scheduler checks due transfers while the page is open.

## Explorer Links

Submitted deposit, withdrawal, and transfer activity records include a `View tx` link when a real transaction hash is available. Links open the transaction on Base Sepolia BaseScan.

## Stabletrust Integration

The browser flow uses `@fairblock/stabletrust`.

The API-agent is wired around Stabletrust API semantics:

- `POST https://stabletrust-api.fairblock.network/balance`
- `POST https://stabletrust-api.fairblock.network/deposit`
- `POST https://stabletrust-api.fairblock.network/transfer`
- `POST https://stabletrust-api.fairblock.network/withdraw`

## Safety

This is a testnet prototype:

- use new testnet wallets;
- do not paste a main-wallet private key;
- do not store real funds in an agent wallet;
- do not use this as a production wallet.
