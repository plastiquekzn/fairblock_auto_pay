# Stabletrust Autopay Studio

No-code testnet interface for confidential USDC payments and agent experiments using Fairblock Stabletrust on Base Sepolia.

The app lets users:

- connect an EVM wallet on Base Sepolia;
- activate a Fairblock/Stabletrust confidential account;
- deposit public test USDC into a confidential balance;
- send confidential USDC to another initialized account;
- withdraw confidential USDC back to public USDC;
- approve and run one-off private payments from the main screen;
- try Agent Chat on top of the Vercel API-agent flow.

Detailed bilingual guide:

- [USER_GUIDE_RU_EN.md](USER_GUIDE_RU_EN.md)

## Testnet Requirements

Use fresh testnet wallets only. Do not use a main wallet and do not paste a private key that controls real funds.

Recommended wallets:

- `Sender wallet` - used for normal browser wallet actions.
- `Receiver wallet` - used to receive confidential payments.
- `Agent wallet` - a dedicated testnet wallet for autonomous API-agent demos.

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

## Main Flow

1. Open `https://fairblock-auto-pay.vercel.app`.
2. Connect the sender wallet.
3. Switch to `Base Sepolia`.
4. Click `Activate Fairblock account`.
5. Deposit public test USDC with `Deposit confidential`.
6. Add or select a recipient in `Confidential payment`.
7. Click `Check recipient`.
8. Enter amount.
9. Click `Approve payment` to place it in the queue, or `Run now` to send immediately.

The receiver must also activate a Fairblock account before receiving. If not, transfers can fail with:

```text
Recipient account does not exist
```

## Agent Chat

The Agent Chat uses a simple parser for now, not an LLM.

Example commands:

```text
send 1 USDC to 0x1234... now
send 2.5 USDC to 0x1234... in 5 minutes
send 1.5 USDC to 0x1234... at 18:30
```

The chat can parse the command, add a new recipient to the allowlist, create a payment task, and execute through the API-agent when a dedicated test agent key is loaded.

## API-Agent Demo

The deployed Vercel UI supports wallet-based Stabletrust SDK actions and same-origin API-agent endpoints under `/api/agent/*`. Because the API is on the same Vercel domain, the browser should not request access to local services on the user's device.

In the UI:

1. Use only a dedicated testnet `Agent wallet`.
2. Fund it with Base Sepolia ETH and test USDC.
3. Paste its private key into `Agent private key`.
4. Click `Load key`.
5. Click `Check API agent`.
6. Use Agent Chat or `Run now`.

For convenience, `Remember test agent key in this browser` stores the dedicated testnet agent key in this browser's `localStorage`. Requests to `/api/agent/*` include that test key when needed, so Vercel can execute the Stabletrust API call without localhost permissions. Use this only with a fresh testnet wallet. Click `Forget key` to remove it.

For production, move private-key handling to a secure backend, smart-account session key, embedded wallet, TEE, MPC, or another dedicated custody architecture.

## Explorer Links

Submitted deposit, withdrawal, and transfer activity records include a `View tx` link when a real transaction hash is available. Links open the transaction on Base Sepolia BaseScan.

BaseScan shows contract interaction, tx hash, gas, and timestamp. It does not show a normal public ERC-20 transfer line like `A sent exact amount to B`.

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

This is a Vite app. Vercel can deploy the web UI with:

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

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
