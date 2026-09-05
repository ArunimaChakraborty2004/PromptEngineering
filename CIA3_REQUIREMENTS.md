# CIA3 Requirements Compliance Document

## System Overview
"Nova — Intelligent Personal Productivity & Knowledge Assistant" is a
Prompt Engineering platform built with Next.js, Groq AI, and SQLite. It goes
beyond a basic chatbot by adding tool calling, a document knowledge base (RAG),
conversational memory, model selection, and offline fallbacks.

## Compliance Checklist

### Phase 1: Foundation
- [x] Next.js 16 App Router with Tailwind CSS v4 styling
- [x] SQLite schema for conversations, messages, documents, document_chunks, and evaluations
- [x] Environment config (`.env.example`) with Groq API integration

### Phase 2: Core API & AI Integration
- [x] **LLM orchestration layer** (`src/lib/llm.ts`): unified Groq `chat/completions` client, Nova system prompt, conversation-history formatting, streaming support
- [x] **Tool calling**: `get_weather` (OpenWeatherMap/wttr.in) and `calculate` (safe expression evaluator), multi-round tool loop in `src/lib/orchestrator.ts`
- [x] **Document ingestion**: upload → parse (PDF/DOCX/TXT/MD/CSV) → chunk → TF-IDF embed → store locally (`src/lib/documents.ts`), with cosine-similarity retrieval
- [x] **Conversational memory**: messages persisted per conversation; context replayed across turns

### Phase 3: Interactive UI Modules
- [x] **Main Chat**: Nova chat UI with markdown rendering, conversational memory, tool activity panel, and model selector (Qwen / GPT-OSS / default)
- [x] **Knowledge Base** (`/knowledge`): drag-and-drop upload, status tracking (processing → ready/failed), chunk counts, delete
- [x] **Prompt Lab**: prompt versioning sandbox (V1/V2/V3) with live Groq execution
- [x] **Model Comparison**: side-by-side evaluation of prompts across models
- [x] **Evaluations Dashboard**: heuristic scoring and analytics (via `/api/evaluations`)
- [x] **Responsible AI**: guardrails documentation, PII/hallucination mitigations

### Phase 4: Polish & Documentation
- [x] Documentation (`README.md`, `ARCHITECTURE.md`, `CIA3_REQUIREMENTS.md`, `DEMO_GUIDE.md`)
- [x] Offline fallback mode when `GROQ_API_KEY` is missing
- [x] Verified build, typecheck, and end-to-end demo flows

## Notes
- Default model `qwen/qwen3.8-27b` supports tool calling.
- `groq/compound` does **not** support tool calling and is avoided for the tool loop.