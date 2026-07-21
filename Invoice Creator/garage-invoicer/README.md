# Garage Invoicer

A mobile-first invoicing tool built for on-site mechanical work. Create a
client, add labour/parts line items, and generate a branded PDF quote or
invoice — with an optional live Square payment link — straight from your
phone while you're still at the client's location.

This is a starter project, not a finished product. It's built to be handed
to Claude Code (or edited by hand) so you can shape it around exactly how
your jobs run.

## What's here

```
garage-invoicer/
├── backend/          Node/Express API + SQLite storage + Square + PDF generation
└── frontend/          React (Vite) mobile-first UI
```

## Quick start

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and fill in:

- `SQUARE_ACCESS_TOKEN` — from your Square Developer Dashboard (start with a
  **sandbox** token to test safely before going live)
- `SQUARE_LOCATION_ID` — found in the same dashboard
- `SQUARE_ENV` — `sandbox` or `production`
- `BUSINESS_NAME`, `BUSINESS_ADDRESS`, `BUSINESS_VAT_NUMBER` — used on the PDF

Then run:

```bash
npm run dev
```

The API starts on `http://localhost:4000`.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the printed local URL on your phone (same WiFi network) or in your
browser. On a phone, use "Add to Home Screen" so it behaves like an app.

## Getting a Square access token

1. Go to https://developer.squareup.com/apps and sign in with your existing
   Square account.
2. Create an application (any name, e.g. "Garage Invoicer").
3. Under **Sandbox**, copy the Sandbox Access Token and Location ID first —
   test the whole flow safely with fake payments.
4. When ready to go live, switch to the **Production** tab, copy those
   credentials into `.env`, and set `SQUARE_ENV=production`.

Square's own docs: https://developer.squareup.com/docs/invoices-api/overview

## What it does today

- Add/search clients and vehicles
- Build an invoice from line items (labour hours × rate, parts, custom lines)
- Auto-calculates VAT
- Generates a branded PDF you can share directly from your phone
- Optionally pushes the same invoice to Square, which emails/texts the client
  a payment link (card, Apple Pay, Google Pay)
- Keeps a simple history of jobs per client

## Natural next steps (good prompts for Claude Code)

- "Add a way to attach photos of parts/damage to a job"
- "Add offline support so I can build an invoice with no signal and sync later"
- "Add a settings screen so I can edit my hourly rate and business details
  without touching .env"
- "Deploy this to [Vercel/Render/Railway] so I don't need my laptop running"
- "Add a simple login so this is safe to put on the public internet"

## A note on money

This starter stores invoice data locally in a SQLite file
(`backend/data/garage.db`). It does not touch your HSBC account — bank
transfers still land there exactly as they do now. Treat the Square
integration as optional: you can generate and share the PDF alone if you'd
rather keep taking bank transfers and cash as you do today.
