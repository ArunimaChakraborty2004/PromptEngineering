# Nova — Intelligent Personal Productivity & Knowledge Assistant

Nova is a productivity and knowledge AI assistant built with **Next.js 16 (App Router)**, **Tailwind CSS v4**, **SQLite**, and the **Groq API**. It goes beyond a basic chatbot by combining:

- **Conversational memory** — full chat history is persisted locally per conversation.
- **Live tool calling** — real-time **weather** (Open-Meteo / wttr.in / OpenWeather) and a safe **calculator**.
- **Knowledge Base (RAG)** — upload `.txt`, `.md`, `.pdf`, `.docx`, `.csv` documents; they are parsed, chunked, and indexed locally with TF-IDF embeddings, then retrieved to ground answers.
- **Model selector** — switch between Groq models (Qwen, GPT-OSS, default).
- **Offline fallback** — if `GROQ_API_KEY` is missing the app still runs with a friendly offline mode.

## Quick Start

```bash
cp .env.example .env.local    # then add your GROQ_API_KEY
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

See [`.env.example`](.env.example). The only required variable is `GROQ_API_KEY`.

| Variable | Required | Description |
| --- | --- | --- |
| `GROQ_API_KEY` | Yes | Groq API key (https://console.groq.com/keys) |
| `GROQ_MODEL` | No | Default chat model. Must support tool calling (default `qwen/qwen3.8-27b`) |
| `OPENWEATHER_API_KEY` | No | Optional; richer weather data. Falls back to wttr.in without it |

> **Note:** `groq/compound` does **not** support tool calling. Tool-capable models include `qwen/qwen3.8-27b`, `qwen/qwen3.6-27b`, and `openai/gpt-oss-120b`.

## Try It

- "What's the weather in Tokyo?" → `get_weather` tool is invoked.
- "Compute log10(140000 * 30)" → `calculate` tool returns the exact value.
- Upload a PDF in the **Knowledge Base**, then ask "What does the document say about X?" → TM-retrieved chunks ground the answer, with source citations.

## Scripts

- `npm run dev` — development server
- `npm run build` / `npm start` — production build and start
- `npm run lint` — ESLint

## Structure

```
src/
  app/
    page.tsx                  # Nova chat UI
    knowledge/page.tsx        # Knowledge base (upload / status / delete)
    api/
      chat/route.ts           # Chat orchestration endpoint
      conversations/...       # Conversation CRUD + history
      documents/route.ts      # Document upload / list / delete
      knowledge/search/route.ts # RAG search
      evaluations/route.ts    # Evaluation logging + stats
  lib/
    llm.ts                    # Groq client, Nova system prompt, completion helpers
    tools.ts                  # get_weather + calculate tool implementations
    documents.ts              # Parse -> chunk -> TF-IDF embed -> search
    orchestrator.ts           # Tool loop + RAG + memory pipeline
    db.ts                     # SQLite schema + queries
```

See [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`CIA3_REQUIREMENTS.md`](CIA3_REQUIREMENTS.md).