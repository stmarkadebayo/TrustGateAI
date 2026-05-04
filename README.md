# TrustGateAI

TrustGateAI is a lightweight, open source toolkit for anti-corruption workflows.

The direction is:
- no sign-up required for core features
- small, independently usable modules
- simple local setup
- easy contribution paths for other builders

## Current Status

This repository now ships three public modules:
- `/audit` for multi-file audit-pack analysis plus optional AI explanation
- `/verify` for document-bundle OCR, country-pack validation, and optional registry assistance
- `/chat` for grounded compliance Q&A with citations

## Product Direction

The intended feature set is:
1. audit automation
2. document verification
3. compliance chatbot

Core operating rules:
- each feature is usable without creating an account
- deterministic analysis runs first
- AI is optional and env-configured
- no runtime database is required
- all analysis results are transient

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env values:

```bash
cp .env.example .env.local
```

3. Optional AI provider configuration:

```bash
LLM_API_BASE_URL=
LLM_API_KEY=
LLM_API_MODEL=
```

4. Optional registry adapter configuration for `/verify`:

```bash
VERIFY_REGISTRY_DATA='{"CERT-001":{"status":"match","detail":"Matched curated registry record","source":"Demo registry"}}'
```

5. Optional official and assisted registry integrations:

```bash
SAM_API_BASE_URL="https://api.sam.gov/entity-information/v4/entities"
SAM_API_KEY=
CAC_PUBLIC_SEARCH_URL="https://icrp.cac.gov.ng/public-search"
```

6. Start the app:

```bash
npm run dev
```

## Immediate Roadmap

- Expand deterministic rules and document parsers
- Add deeper field extraction and scan robustness for difficult documents
- Improve official/assisted verification integrations beyond SAM and CAC
- Improve corpus coverage and retrieval quality for chat
- Keep the default local run simple even as features grow

## Contribution Standard

When adding features:
- keep modules loosely coupled
- avoid mandatory auth unless there is a hard security reason
- prefer small diffs and explicit behavior
- document any privacy or retention implications
