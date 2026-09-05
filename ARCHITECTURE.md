# Architecture — Nova

## Overview
Nova is an intelligent productivity & knowledge assistant. The frontend is a
single-page Next.js app (chat + knowledge base); the backend is a set of route
handlers backed by a local SQLite database and the Groq API.

## Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Styling**: Tailwind CSS v4
- **Database**: SQLite via `better-sqlite3` (`nova.db`)
- **AI Inference**: Groq API (OpenAI-compatible `chat/completions`)
- **Markdown**: `react-markdown` + `remark-gfm`

## Request Flow (chat)
```
Chat UI (/)
  → POST /api/chat        { message, conversationId?, model? }
      → orchestrator.runAssistant(conversationId, message)
          1. persist user message (SQLite)
          2. RAG: searchKnowledgeBase(query) → top-4 chunks w/ TF-IDF cosine
          3. build model messages: NOVA_SYSTEM_PROMPT + history + KB context
          4. tool loop (≤3 rounds):
               complete() → if tool_calls, runTool() and feed result back
          5. persist assistant reply (+ tool_events / sources metadata)
  ← { conversationId, reply, toolRounds, kbUsed, model }
```

## Data Models
- **conversations** — chat threads (`id`, `title`, timestamps)
- **messages** — per-conversation history (`role`, `content`, `metadata` JSON)
- **documents** — uploaded files (`filepath`, `file_type`, `status`, `chunk_count`)
- **document_chunks** — parsed text chunks + TF-IDF token vectors (`tokens` JSON)
- **evaluations** — heuristic scores for prompt runs (category, score, metrics)

## Document Pipeline
1. Upload → `saveUploadedFile` writes to `uploads/` and inserts a `documents` row.
2. `processDocument` → `extractText` (pdf-parse / mammoth / plain text) →
   `chunkText` (paragraph-aware, 900 chars w/ overlap) → `tokenize` (TF-IDF) →
   persists `document_chunks`.
3. Retrieval → `searchKnowledgeBase` computes cosine similarity between the
   query TF-IDF vector and each chunk vector (top-K, stopword filtered).

## Tool Calling
- `get_weather`: OpenWeatherMap if `OPENWEATHER_API_KEY` set, else wttr.in fallback.
- `calculate`: whitelisted expression evaluator (no `eval` of user strings).
- Models must support tool calling; `groq/compound` does not (see README).

## Fallback
- No `GROQ_API_KEY` → Nova returns a helpful offline-mode reply instead of crashing.