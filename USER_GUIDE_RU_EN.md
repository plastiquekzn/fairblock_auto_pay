# User Guide / Гайд пользователя

## Русский

### 1. Что это

Stabletrust Autopay Studio - тестнетный no-code интерфейс для confidential USDC-платежей через Fairblock Stabletrust на Base Sepolia.

В приложении есть:

- подключение MetaMask или другого EVM-кошелька;
- активация Fairblock/Stabletrust confidential account;
- deposit public test USDC в confidential balance;
- confidential transfer на другой Fairblock account;
- withdraw обратно в public USDC;
- очередь задач и простой планировщик;
- API-agent режим для демо с отдельным testnet private key;
- Agent Chat для команд вроде `отправь 1 USDC 0x... сейчас`.

Это прототип для тестнета. Не используй основной кошелек и не вставляй private key от кошелька с реальными средствами.

### 2. Что нужно подготовить

Создай новые тестовые кошельки.

Рекомендуемый минимум:

- `Sender wallet` - кошелек отправителя.
- `Receiver wallet` - кошелек получателя.
- `Agent wallet` - отдельный кошелек только для автономного агента.

Каждый кошелек, который делает транзакции, должен иметь:

- Base Sepolia ETH для газа;
- Base Sepolia test USDC для депозитов и переводов.

Base Sepolia:

```text
Chain ID: 84532
RPC: https://sepolia.base.org
Explorer: https://sepolia.basescan.org
```

Test USDC:

```text
0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

### 3. Как открыть приложение

Если проект задеплоен на Vercel, просто открой публичную ссылку деплоя.

Для локальной разработки:

```bash
npm install
npm run dev
```

Потом открой:

```text
http://localhost:3000
```

Страница простых платежных действий:

```text
/payment.html
```

### 4. Как активировать Fairblock account

1. Подключи кошелек через `Connect`.
2. Переключись на `Base Sepolia`.
3. Нажми `Activate Fairblock account`.
4. Подпиши запросы в кошельке.
5. Нажми `Refresh balance`.

Это нужно сделать и для отправителя, и для получателя. Если получатель не активировал account, перевод может упасть с ошибкой:

```text
Recipient account does not exist
```

### 5. Как пополнить confidential balance

Confidential transfer тратит не public USDC напрямую, а confidential USDC.

1. Подключи `Sender wallet`.
2. Убедись, что есть Base Sepolia ETH и test USDC.
3. Активируй Fairblock account.
4. Введи сумму в `Amount`.
5. Нажми `Deposit confidential`.
6. Дождись транзакции.
7. Нажми `Refresh balance`.

### 6. Как отправить confidential payment

Открой `/payment.html`.

1. Нажми `Connect`.
2. Выбери `Send confidential payment`.
3. Вставь адрес получателя.
4. Введи сумму.
5. Нажми `Check recipient`.
6. Если получатель готов, нажми `Send confidential payment`.

После отправки в Activity на главной странице появится запись. Если доступен реальный tx hash, рядом будет ссылка `View tx` на BaseScan.

### 7. Как получателю увидеть деньги

На `Receiver wallet`:

1. Открой `/payment.html`.
2. Подключи кошелек.
3. Активируй Fairblock account, если ещё не активирован.
4. Выбери `Check incoming confidential payment`.
5. Нажми `Refresh balance`.

Сумма должна появиться в `Confidential USDC`.

### 8. Как вывести в public USDC

На кошельке, который получил confidential USDC:

1. Открой `/payment.html`.
2. Выбери `Withdraw to public`.
3. Введи сумму.
4. Нажми `Withdraw to public USDC`.
5. Дождись транзакции.

### 9. Manual tasks и allowlist

На главной странице есть `Payment task`.

1. Добавь получателя через `+` или `Add`.
2. Выбери получателя.
3. Введи сумму.
4. Выбери время.
5. Если не нужен ручной approval, выбери `Requires approval: No`.
6. Нажми `Create task`.
7. В `Transfer queue` нажми `Run`, если хочешь выполнить задачу вручную.

### 10. API-agent режим

Vercel деплоит web UI и same-origin API endpoints `/api/agent/*`. Поэтому публичная версия не должна запрашивать доступ к локальным сервисам на устройстве.

В UI:

1. Используй только отдельный `Agent wallet`.
2. Пополни его Base Sepolia ETH и test USDC.
3. Вставь private key в `Agent private key`.
4. Нажми `Load key`.
5. Нажми `Check API agent`.

Если включить `Remember test agent key in this browser`, тестовый private key сохранится в `localStorage` этого браузера. Запросы к `/api/agent/*` будут отправлять этот тестовый ключ на Vercel API, чтобы Vercel мог выполнить Stabletrust API call без localhost-разрешений. Это удобно для демо, но используй только отдельный testnet `Agent wallet`. Кнопка `Forget key` удаляет сохраненный ключ.

Для production нужен безопасный backend, smart account/session key, embedded wallet, TEE, MPC или другая custody-архитектура.

### 11. Agent Chat

После подготовки API-agent можно писать команды:

```text
отправь 1 USDC 0x1234... сейчас
отправь 2.5 USDC 0x1234... через 5 минут
send 1.5 USDC to 0x1234... at 18:30
```

Чат:

- находит сумму;
- находит адрес или имя из allowlist;
- добавляет новый адрес в allowlist;
- создает задачу без approval;
- отправляет сразу, если время уже наступило;
- планирует задачу, если время в будущем.

Сейчас это простой parser, не LLM.

### 12. Что видно в explorer

Explorer может показывать contract interaction, tx hash, gas и timestamp. Но confidential flow не выглядит как обычный ERC-20 transfer `A sent exact public USDC amount to B`.

### 13. Безопасность

Нельзя:

- вставлять private key основного кошелька;
- хранить реальные средства на agent wallet;
- использовать этот прототип как production wallet.

Можно:

- создать отдельные testnet wallets;
- пополнить их небольшим количеством Base Sepolia ETH и test USDC;
- использовать только для демо.

---

## English

### 1. What This Is

Stabletrust Autopay Studio is a testnet no-code interface for confidential USDC payments using Fairblock Stabletrust on Base Sepolia.

The app includes:

- MetaMask/EVM wallet connection;
- Fairblock/Stabletrust confidential account activation;
- public test USDC deposits into confidential balance;
- confidential transfers to another initialized account;
- withdrawals back to public USDC;
- payment task queue and a simple scheduler;
- API-agent demo mode with a dedicated testnet private key;
- Agent Chat for commands like `send 1 USDC to 0x... now`.

This is a testnet prototype. Do not use your main wallet and do not paste a private key that controls real funds.

### 2. What You Need

Create fresh test wallets.

Recommended setup:

- `Sender wallet` - sends payments.
- `Receiver wallet` - receives confidential payments.
- `Agent wallet` - a separate wallet used only for autonomous agent demos.

Every wallet that sends transactions needs:

- Base Sepolia ETH for gas;
- Base Sepolia test USDC for deposits and transfers.

Base Sepolia:

```text
Chain ID: 84532
RPC: https://sepolia.base.org
Explorer: https://sepolia.basescan.org
```

Test USDC:

```text
0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

### 3. Open The App

If the project is deployed to Vercel, open the public deployment URL.

For local development:

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

Simple payment tools:

```text
/payment.html
```

### 4. Activate A Fairblock Account

1. Connect your wallet with `Connect`.
2. Switch to `Base Sepolia`.
3. Click `Activate Fairblock account`.
4. Sign wallet prompts.
5. Click `Refresh balance`.

Both sender and receiver need an activated account. If the receiver is not initialized, the transfer can fail with:

```text
Recipient account does not exist
```

### 5. Deposit Into Confidential Balance

Confidential transfers spend confidential USDC, not public USDC directly.

1. Connect the `Sender wallet`.
2. Make sure it has Base Sepolia ETH and test USDC.
3. Activate the Fairblock account.
4. Enter an amount.
5. Click `Deposit confidential`.
6. Wait for the transaction.
7. Click `Refresh balance`.

### 6. Send A Confidential Payment

Open `/payment.html`.

1. Click `Connect`.
2. Select `Send confidential payment`.
3. Paste the receiver address.
4. Enter the amount.
5. Click `Check recipient`.
6. If the receiver is ready, click `Send confidential payment`.

After submission, Activity records on the main page include a `View tx` BaseScan link when a real transaction hash is available.

### 7. Receiver Balance

On the `Receiver wallet`:

1. Open `/payment.html`.
2. Connect the wallet.
3. Activate the Fairblock account if needed.
4. Select `Check incoming confidential payment`.
5. Click `Refresh balance`.

The received amount should appear under `Confidential USDC`.

### 8. Withdraw To Public USDC

On the wallet that received confidential USDC:

1. Open `/payment.html`.
2. Select `Withdraw to public`.
3. Enter the amount.
4. Click `Withdraw to public USDC`.
5. Wait for the transaction.

### 9. Manual Tasks And Allowlist

On the main page:

1. Add a recipient with `+` or `Add`.
2. Select the recipient.
3. Enter amount and execution time.
4. Set `Requires approval: No` if no manual approval is needed.
5. Click `Create task`.
6. Click `Run` in `Transfer queue` to execute manually.

### 10. API-Agent Mode

Vercel deploys the web UI and same-origin API endpoints under `/api/agent/*`. The public version should not request access to local services on the user's device.

In the UI:

1. Use a dedicated `Agent wallet`.
2. Fund it with Base Sepolia ETH and test USDC.
3. Paste its private key into `Agent private key`.
4. Click `Load key`.
5. Click `Check API agent`.

If `Remember test agent key in this browser` is enabled, the test private key is stored in this browser's `localStorage`. Requests to `/api/agent/*` include that test key when needed, so Vercel can execute the Stabletrust API call without localhost permissions. This is convenient for demos, but use only a dedicated testnet `Agent wallet`. `Forget key` removes the saved key.

Production needs a secure backend, smart account/session key, embedded wallet, TEE, MPC, or another custody architecture.

### 11. Agent Chat

After the API-agent is ready, type commands like:

```text
send 1 USDC to 0x1234... now
send 2.5 USDC to 0x1234... in 5 minutes
send 1.5 USDC to 0x1234... at 18:30
```

The chat:

- extracts amount;
- finds an address or allowlist name;
- adds new addresses to allowlist;
- creates tasks without approval;
- sends immediately if due now;
- schedules future tasks.

It is currently a simple parser, not an LLM.

### 12. Explorer Visibility

Explorers can show contract interaction, tx hash, gas, and timestamp. The confidential flow is not a plain ERC-20 transfer like `A sent exact public USDC amount to B`.

### 13. Safety

Do not:

- paste your main wallet private key;
- keep real funds in the agent wallet;
- use this prototype as a production wallet.

Do:

- create dedicated testnet wallets;
- fund them with small amounts of Base Sepolia ETH and test USDC;
- use them only for demos.
