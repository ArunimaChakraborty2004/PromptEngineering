# Architecture

## Overview
This is a modern Next.js 15+ application configured for Prompt Engineering tasks using the Groq AI API.

## Tech Stack
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS v4
- **Database**: SQLite (via `better-sqlite3`)
- **AI Integration**: Vercel AI SDK (`@ai-sdk/openai` configured to use Groq)
- **Icons**: Lucide React

## Data Models
- **Conversations**: Chat threads
- **Messages**: Individual prompts and responses
- **Documents**: Uploaded context for retrieval
- **Evaluations**: Scoring and metrics for prompt versions

## Key Features
1. **Chat UI**: Built with `ai/react` hook `useChat` for fast streaming.
2. **Local Database**: All history and documents are stored locally in `nova.db`.
3. **Groq Inference**: Extremely fast token generation via Groq API.
