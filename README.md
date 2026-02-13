# Hotel Vivanta Ledger

Local web-based accounting app for Hotel Vivanta (INR only). It runs on localhost and stores data in SQLite.

## Start the app

```bash
pnpm run dev
```

Open the URL shown in the terminal (usually http://localhost:5173).

## Database

The SQLite database is created automatically at startup in the data/ folder.

## Features

- Daily opening cash balance
- Room or group booking income entry (cash/online)
- Expense tracking with categories and payment type
- Owner payouts
- Master balances and custom date-range reports
