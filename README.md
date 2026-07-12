# Hotel Ledger Dashboard (Generic)

A lightweight hotel accounting and operations ledger built with SvelteKit and SQLite.
This project is designed so any hotel can use it by configuring rooms, staff, owners, and expense categories.

It helps teams track daily cash flow, online payments, expenses, payouts, and summary reports from one dashboard.

## What This Solves

Many hotels run operations with disconnected sheets or manual notes. This app provides:

- Daily opening balance tracking
- Income logging (room tariff, group booking, or custom reference)
- Expense tracking by type and payment mode
- Staff and owner related financial entries
- Consolidated summaries and date-range reports
- Support for multiple hotel profiles from one codebase

## Core Components

### Frontend

- SvelteKit routes and pages for ledger operations
- Layout-level hotel selection context
- Dashboard and forms for income, expenses, balances, and reports

### Backend (API)

API endpoints are under `src/routes/api/*` and include:

- `boards`
- `daily-balance`
- `daily-room-summary`
- `employees`
- `expense-types`
- `expenses`
- `hotel`
- `income`
- `master-balances`
- `owners`
- `reports`
- `rooms`
- `settings`
- `summary`

### Data Layer

- SQLite via `better-sqlite3`
- Auto-creates and migrates schema at startup
- Stores data files in `data/`
- Uses per-hotel DB files defined in server configuration

### Hotel Context Handling

- Active hotel is resolved server-side via cookie
- Context is applied per request using async local storage
- Enables multi-hotel operation without mixing ledger data
- Hotel profiles are persisted in `data/hotels.json` and can be created from the app

## Tech Stack

- SvelteKit 2
- Svelte 5
- Vite 6
- SQLite (`better-sqlite3`)
- pnpm (workspace + lockfile managed)

## Getting Started

### 1) Prerequisites

- Node.js 20+ (recommended)
- pnpm 9+ (recommended)

### 2) Install Dependencies

```bash
pnpm install
```

### 3) Start Development Server

```bash
pnpm dev
```

Open the local URL shown in terminal (typically `http://localhost:5173`).

### 4) Build for Production

```bash
pnpm build
```

### 5) Preview Production Build Locally

```bash
pnpm preview
```

## Project Structure (High-Level)

```text
src/
	lib/
		server/
			db.js           # SQLite schema, migrations, seeding, DB routing
			hotel.js        # Hotel definitions and normalization
	routes/
		api/              # REST-like endpoints
		+layout.*         # Global hotel context in UI
		*/+page.svelte    # Feature pages (income, expense, reports, etc.)
data/                 # Generated SQLite database files
```

## Environment Variables

No mandatory environment variables are required for local development in the current implementation.

Optional variables you can use in deployment environments:

- `PORT`: Runtime port for server hosting
- `HOST`: Runtime host binding
- `NODE_ENV`: Standard Node environment mode (`production`, `development`)

If your target platform requires configuration via environment (for paths, storage, or secrets), add them in your deployment settings and wire them into server code where needed.

## Configuration Notes for Generic Hotel Use

Use the hotel selector in the header and choose **Create hotel**. The setup flow accepts the
property name, room inventory, employees, owners, income types, expense types, and opening
balances. These masters remain editable from the **Masters** page after setup.

Vivanta and BlueMoon are retained as migrated profiles pointing to their existing database
files, so their current entries are not moved or renamed. New hotels receive a separate SQLite
database and cannot mix entries with another selected property.

## Typical Use Cases

- Front desk team records daily room and booking income
- Accounts team tracks expense outflow and payment channels
- Management reviews daily totals, outstanding notes, and trends
- Owners monitor payout and overall balance health
- Multi-property operators run separate ledgers under one application

## Why This Is Useful

- Reduces manual reconciliation effort
- Improves daily financial visibility
- Standardizes records across teams
- Helps reduce data loss from scattered sheets
- Provides a practical base for future analytics exports

## Deployment Tips

- Use a persistent filesystem or mounted volume for `data/` to avoid losing SQLite files
- Take automated backups of `data/*.db` at fixed intervals
- Run `pnpm build` in CI before deployment to catch compile-time issues
- Use process management (PM2, systemd, container restart policies) for stability
- Put the app behind a reverse proxy (Nginx/Caddy) for TLS and domain routing
- If deploying at scale, consider moving from SQLite to a managed relational database

## Validation Commands

```bash
pnpm check
pnpm build
```

These commands help verify typing, Svelte checks, and production readiness.

## Future Improvements (Optional)

- Authentication and role-based access
- Export to CSV/PDF
- Audit logs for financial edits
- Scheduled reports and notifications
- Cloud database support

## Author

Authored by Hrithik Joshi
