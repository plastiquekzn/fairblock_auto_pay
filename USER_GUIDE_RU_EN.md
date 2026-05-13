# User Guide / Гайд пользователя

## Русский

### 1. Что это

Stabletrust Autopay Studio - тестнетный no-code интерфейс для confidential USDC-платежей через Fairblock Stabletrust на Base Sepolia.

В приложении можно:

- подключить EVM-кошелек;
- активировать Fairblock/Stabletrust confidential account;
- внести public test USDC в confidential balance;
- отправить confidential USDC другому активированному аккаунту;
- вывести confidential USDC обратно в public USDC;
- отправлять платежи через простую форму `Confidential payment`;
- использовать Agent Chat для команд вроде `send 1 USDC to 0x... at 18:30`.

Это прототип для тестнета. Не используй основной кошелек и не вставляй private key от кошелька с реальными средствами.

### 2. Что подготовить

Создай новые тестовые кошельки:

- `Sender wallet` - отправитель.
- `Receiver wallet` - получатель.
- `Agent wallet` - отдельный кошелек только для API-agent demo.

Кошелькам, которые делают транзакции, нужны:

- Base Sepolia ETH для газа;
- Base Sepolia test USDC.

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

Удобный способ теста: открой sender wallet в одном браузере, receiver wallet в другом.

### 3. Активация Fairblock account

На sender wallet:

1. Открой `https://fairblock-auto-pay.vercel.app`.
2. Нажми `Connect`.
3. Нажми `Base Sepolia`.
4. Нажми `Activate Fairblock account`.
5. Подпиши запросы в кошельке.
6. Нажми `Refresh balance`.

То же самое нужно сделать на receiver wallet. Если получатель не активирован, перевод может упасть с ошибкой:

```text
Recipient account does not exist
```

### 4. Deposit в confidential balance

Confidential transfer тратит confidential USDC, а не public USDC напрямую.

1. Подключи sender wallet.
2. Убедись, что есть Base Sepolia ETH и test USDC.
3. Активируй Fairblock account.
4. В блоке кошелька введи сумму в `Amount`.
5. Нажми `Deposit confidential`.
6. Дождись транзакции.
7. Нажми `Refresh balance`.

После этого public USDC превращается в confidential USDC внутри Stabletrust.

### 5. Отправка confidential payment

На главной странице используй блок `Confidential payment`.

1. Добавь получателя через `+` или `Add`.
2. Выбери получателя.
3. Нажми `Check recipient`.
4. Введи сумму.
5. Нажми `Approve payment`, если хочешь сначала положить платеж в очередь.
6. Нажми `Run now`, если хочешь сразу отправить.

Если платеж был добавлен в очередь, его можно запустить из `Transfer queue` кнопкой `Run`.

### 6. Как получателю увидеть деньги

На receiver wallet:

1. Открой приложение во втором браузере.
2. Нажми `Connect`.
3. Нажми `Base Sepolia`.
4. Активируй Fairblock account, если еще не активирован.
5. Нажми `Refresh balance`.

Сумма должна появиться в `Confidential USDC`.

### 7. Withdraw to public

На кошельке, который получил confidential USDC:

1. Введи сумму в `Amount`.
2. Нажми `Withdraw to public`.
3. Подтверди транзакцию в кошельке.
4. Нажми `Refresh balance`.

После этого USDC снова станет public.

### 8. Agent Chat

Agent Chat находится в отдельном горизонтальном блоке: чат слева, настройки API-agent справа.

Примеры команд:

```text
send 1 USDC to 0x1234... now
send 2.5 USDC to 0x1234... in 5 minutes
send 1.5 USDC to 0x1234... at 18:30
```

Сейчас это простой parser, не LLM. Он:

- находит сумму;
- находит адрес или имя из allowlist;
- добавляет новый адрес в allowlist;
- создает задачу платежа;
- отправляет сразу, если время уже наступило;
- оставляет будущий платеж в очереди, если указано время.

### 9. API-agent режим

Vercel деплоит web UI и same-origin API endpoints `/api/agent/*`. Поэтому публичная версия не должна просить доступ к локальным сервисам на устройстве.

Для API-agent:

1. Создай отдельный `Agent wallet`.
2. Пополни его Base Sepolia ETH и test USDC.
3. Вставь private key в `Agent private key`.
4. Нажми `Load key`.
5. Нажми `Check API agent`.
6. Используй Agent Chat или `Run now`.

Если включить `Remember test agent key in this browser`, тестовый private key сохранится в `localStorage` этого браузера. Запросы к `/api/agent/*` будут отправлять этот тестовый ключ на Vercel API, чтобы Vercel мог выполнить Stabletrust API call без localhost-разрешений.

Используй это только с отдельным testnet wallet. `Forget key` удаляет сохраненный ключ.

Для production нужен безопасный backend, smart account/session key, embedded wallet, TEE, MPC или другая custody-архитектура.

### 10. Что видно в explorer

BaseScan показывает:

- contract interaction;
- tx hash;
- gas;
- timestamp.

BaseScan не показывает обычную строку `A sent exact USDC amount to B`. В этом и смысл confidential flow: on-chain footprint есть, но платежные данные не раскрываются как обычный ERC-20 transfer.

### 11. Безопасность

Нельзя:

- вставлять private key основного кошелька;
- хранить реальные средства на agent wallet;
- использовать прототип как production wallet.

Можно:

- создать отдельные testnet wallets;
- пополнить их небольшим количеством Base Sepolia ETH и test USDC;
- использовать только для демо.

---

## English

### 1. What This Is

Stabletrust Autopay Studio is a testnet no-code interface for confidential USDC payments using Fairblock Stabletrust on Base Sepolia.

The app lets you:

- connect an EVM wallet;
- activate a Fairblock/Stabletrust confidential account;
- deposit public test USDC into a confidential balance;
- send confidential USDC to another activated account;
- withdraw confidential USDC back to public USDC;
- send payments from the simple `Confidential payment` form;
- use Agent Chat for commands like `send 1 USDC to 0x... at 18:30`.

This is a testnet prototype. Do not use your main wallet and do not paste a private key that controls real funds.

### 2. What You Need

Create fresh test wallets:

- `Sender wallet` - sends payments.
- `Receiver wallet` - receives confidential payments.
- `Agent wallet` - used only for API-agent demos.

Wallets that submit transactions need:

- Base Sepolia ETH for gas;
- Base Sepolia test USDC.

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

Testing tip: open the sender wallet in one browser and the receiver wallet in another.

### 3. Activate A Fairblock Account

On the sender wallet:

1. Open `https://fairblock-auto-pay.vercel.app`.
2. Click `Connect`.
3. Click `Base Sepolia`.
4. Click `Activate Fairblock account`.
5. Sign wallet prompts.
6. Click `Refresh balance`.

Do the same on the receiver wallet. If the receiver is not activated, transfers can fail with:

```text
Recipient account does not exist
```

### 4. Deposit Into Confidential Balance

Confidential transfers spend confidential USDC, not public USDC directly.

1. Connect the sender wallet.
2. Make sure it has Base Sepolia ETH and test USDC.
3. Activate the Fairblock account.
4. Enter amount in the wallet `Amount` field.
5. Click `Deposit confidential`.
6. Wait for the transaction.
7. Click `Refresh balance`.

Your public USDC is now confidential inside Stabletrust.

### 5. Send A Confidential Payment

Use the `Confidential payment` block on the main page.

1. Add a recipient with `+` or `Add`.
2. Select the recipient.
3. Click `Check recipient`.
4. Enter amount.
5. Click `Approve payment` if you want to place it in the queue first.
6. Click `Run now` if you want to send immediately.

If a payment is placed in the queue, it can still be executed from `Transfer queue` with `Run`.

### 6. Receiver Balance

On the receiver wallet:

1. Open the app in the second browser.
2. Click `Connect`.
3. Click `Base Sepolia`.
4. Activate the Fairblock account if needed.
5. Click `Refresh balance`.

The received amount should appear under `Confidential USDC`.

### 7. Withdraw To Public

On the wallet that received confidential USDC:

1. Enter amount.
2. Click `Withdraw to public`.
3. Confirm in the wallet.
4. Click `Refresh balance`.

The USDC becomes public again.

### 8. Agent Chat

Agent Chat is in one horizontal block: chat on the left, API-agent controls on the right.

Example commands:

```text
send 1 USDC to 0x1234... now
send 2.5 USDC to 0x1234... in 5 minutes
send 1.5 USDC to 0x1234... at 18:30
```

It is currently a simple parser, not an LLM. It:

- extracts amount;
- finds an address or allowlist name;
- adds a new address to allowlist;
- creates a payment task;
- sends immediately if due now;
- keeps future payments in the queue.

### 9. API-Agent Mode

Vercel deploys the web UI and same-origin API endpoints under `/api/agent/*`. The public version should not request access to local services on the user's device.

For API-agent:

1. Create a dedicated `Agent wallet`.
2. Fund it with Base Sepolia ETH and test USDC.
3. Paste its private key into `Agent private key`.
4. Click `Load key`.
5. Click `Check API agent`.
6. Use Agent Chat or `Run now`.

If `Remember test agent key in this browser` is enabled, the test private key is stored in this browser's `localStorage`. Requests to `/api/agent/*` include that test key when needed, so Vercel can execute the Stabletrust API call without localhost permissions.

Use this only with a dedicated testnet wallet. `Forget key` removes the saved key.

Production needs a secure backend, smart account/session key, embedded wallet, TEE, MPC, or another custody architecture.

### 10. Explorer Visibility

BaseScan shows:

- contract interaction;
- tx hash;
- gas;
- timestamp.

BaseScan does not show a normal line like `A sent exact USDC amount to B`. That is the point of the confidential flow: the on-chain footprint exists, but payment data is not exposed like a standard ERC-20 transfer.

### 11. Safety

Do not:

- paste your main wallet private key;
- keep real funds in the agent wallet;
- use this prototype as a production wallet.

Do:

- create dedicated testnet wallets;
- fund them with small amounts of Base Sepolia ETH and test USDC;
- use them only for demos.
