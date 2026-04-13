# AI CR Calculator

Internal React app for parsing procurement ticket data from K2 / PSS, calculating printing fees, and reviewing ticket totals in a cleaner UI.

## Features

- Paste tab-separated raw ticket data directly into the app
- Parse line items and calculate totals automatically
- Add the derived printing fee row to the result set
- Review results in summary and table views
- Support dark mode and vendor comparison workflows

## Tech Stack

- React 19
- Vite 8
- Zustand
- Tailwind CSS 4

## Getting Started

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The production build outputs to `dist/`.
