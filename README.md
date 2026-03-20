# ♠️ Poker & Gambling Tracker

A clean, privacy-first session tracker for poker and gambling — built for tax reporting and trend analysis.

## Features

- **Session logging** — date, time, venue, game type, buy-in, cash-out
- **Separate tracking** — Poker and Other Gambling kept separate (IRS-friendly)
- **Dashboard** — cumulative net chart, win rates, $/hour stats
- **Sessions list** — filterable by category and year, edit/delete
- **Tax reports** — annual summary with gross wins/losses per category
- **CSV export** — one click, ready for your accountant

## Running Locally

No build step needed. Just serve the files with any static server.

### Option 1: Python (built-in)
```bash
cd poker-tracker
python3 -m http.server 8080
```
Then open http://localhost:8080

### Option 2: Node (if available)
```bash
npx serve poker-tracker
```

### Option 3: VS Code
Install the "Live Server" extension, right-click `index.html` → Open with Live Server.

> ⚠️ Must be served over HTTP (not opened as a file://) due to ES module imports.

## Data Storage

All data is stored in your browser's **localStorage** — nothing leaves your device. To back up, use the CSV export on the Reports page.

## Game Types

**Poker:** Cash - NLHE, Cash - PLO, Cash - Other, Tournament - MTT, Tournament - Sit-n-Go, Other

**Other Gambling:** Blackjack, Slots, Roulette, Sports Betting, Horse Racing, Other

## Tax Notes

The IRS requires session-based reporting for gambling:
- **Winnings** reported as Other Income (Form 1040)
- **Losses** deductible up to winnings, itemized (Schedule A)
- Keep records of: date, establishment name/address, type of game, amount won/lost

This app tracks all of that. Export CSV at year-end for your accountant.
