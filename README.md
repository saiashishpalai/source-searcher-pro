# Haven7 – Source Searcher Pro

Source Searcher Pro is an AI workbench for product teams. It combines multi-source enterprise search with a structured PRD (Product Requirements Document) authoring flow, letting teams move from discovery to spec in minutes.

---

## ✨ Highlights

- **Unified Knowledge Search**  
  Federated search across Google Drive, Slack, and Notion with BM25 + pgvector hybrid retrieval, duplicate suppression, and automatic recency boosts.

- **PRD Builder & Assembly**  
  Five-question wizard captures the core problem, scope, metrics, dependencies, and timeline, then synthesizes a 14-section PRD using a deterministic GPT-4o-mini system prompt.

- **Context-Aware Drafting**  
  Dual-phase retrieval streams lexical hits instantly, then upgrades to a hybrid RRF + MMR shortlist. Drafts and assembled PRDs cite the exact chunks they reference.

- **Speech to Text Capture**  
  Push-to-talk recording routes through OpenAI Whisper, auto-translating to English and piping transcripts directly into the active section with insert/replace controls.

- **Collapsible Assist Controls**  
  Dependency hints, context toggles, and advanced grounding settings live in a settings menu to keep the drafting surface clean while still enabling power features.

- **Production-Ready UX**  
  Updated PRD view includes modern card layout, rich markdown rendering, metadata hydration, and preview modals for the assembled document.

---

## 🧱 Architecture Overview

| Layer | Stack | Notes |
| --- | --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind | SPA served from `/src`. Uses React Query for data fetching and Radix UI primitives for composable components. |
| Backend | Node.js + Express (`/server`) | REST endpoints for search, PRD CRUD, GPT orchestration, speech transcription. Long-running services live in `server/services`. |
| Database | Supabase (PostgreSQL + pgvector) | Stores users, OAuth credentials, document chunks, PRD versions/sections, and usage telemetry. |
| AI | OpenAI GPT-4o-mini & text-embedding-3-small | GPT handles PRD drafting/assembly; embeddings power semantic retrieval. |
| Storage | Supabase buckets | Document sync and PRD assets. |

### Retrieval Flow
1. **Phase 1:** Instant BM25 lexical search (Supabase `ILIKE` + elasticlunr) returns first batch within ~300 ms.  
2. **Phase 2:** Hybrid vector search via `search_document_chunks` RPC, reciprocal-rank fusion, iterative grounding boosts, dependency hint boosts, and maximal marginal relevance for diversity.  
3. **Drafting:** Results trimmed, deduped, and passed to GPT with numbered references; citations map back to chunk IDs.  
4. **Assembly:** Final PRD prompt merges user answers + citations, enforces 14-section output with strict spacing and inferred content.

---

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+
- Supabase project (with pgvector extension enabled)
- OpenAI API key
- OAuth credentials for Google, Slack, and Notion (if syncing external content)

### Installation

```bash
git clone https://github.com/saiashishpalai/source-searcher-pro.git
cd source-searcher-pro
npm install
```

Copy environment defaults and populate secrets:

```bash
cp env.example .env.local
cp env.local.example server/.env.local # if you run backend separately
# Edit both files with Supabase, OpenAI, and OAuth credentials
```

### Local Development

Frontend + backend can run from the same workspace:

```bash
# terminal 1 – Vite dev server
npm run dev

# terminal 2 – Express API (port 8085 by default)
npm run server
```

Optional helper scripts:

- `npm run build` – type-check and build production assets  
- `npm run preview` – preview built frontend  
- `npm run test:email` – verify transactional email flows

Supabase migrations live in `database/migrations`. Apply them in order to provision required tables and RPC functions (including `search_document_chunks` and PRD schema changes).

---

## 📁 Key Directories

```
├── src/                 # React application (pages, components, hooks, lib)
├── server/              # Express API and service layer
├── database/            # SQL migrations, schema docs, and debug utilities
├── docs/                # Detailed guides (API, deployment, setup, security)
├── public/              # Static assets
├── scripts/             # Automation and developer tooling
└── tools/               # Evaluation utilities
```

Legacy `backend/` artifacts have been removed in favor of the unified `server/` directory.

---

## 📚 Further Reading

- [Setup Guide](docs/setup/QUICK_START.md) – step-by-step onboarding
- [API Reference](docs/api/API_REFERENCE.md) – REST contract details
- [Database Schema](docs/database/DATABASE_SCHEMA.md) – ERD and table docs
- [Deployment Guide](docs/deployment/DEPLOYMENT_GUIDE.md) – Render/Vercel workflow
- [Security Best Practices](docs/SECURITY_BEST_PRACTICES.md) – OAuth + Supabase RLS
- [Testing AI Draft Generation](TESTING_AI_DRAFT_GENERATION.md) – prompts & QA notes

---

## 🔐 Security Posture

- Supabase Row Level Security on all tenant-scoped tables
- Encrypted OAuth tokens with automatic refresh + expiry guards
- Request-level guards for PRD access and chunk retrieval
- Middleware enforcing rate limits on GPT and transcription endpoints

---

## 🤝 Contributing

1. Fork the repository and create a feature branch.
2. Keep frontend and backend changes isolated by directory.
3. Add or update documentation under `docs/` when adding new capabilities.
4. Submit a pull request with a clear summary and testing notes.

---

## 📄 License & Support

Source Searcher Pro is released under the [MIT License](LICENSE).

Questions or feedback? Open an issue or reach out via the repository discussions board.