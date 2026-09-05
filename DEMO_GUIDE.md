# Demo Guide — Nova (Intelligent Personal Productivity & Knowledge Assistant)

## Quick Start
1. `cp .env.example .env.local` and fill in your `GROQ_API_KEY`.
2. `npm install`
3. `npm run dev` — open **http://localhost:3000**

## Guided Walkthrough

### 1. Main Chat Workspace (`/`)
- Type any prompt and press **Enter**.
- Try the live calculator: `Compute log10(140000 * 30)` — Nova calls the
  `calculate` tool and shows the exact result in the **Tool activity** panel.
- Try live weather: `What's the weather in Tokyo?` — Nova calls `get_weather`.
- Switch the **model selector** (Qwen 3.8 27B / GPT-OSS 120B / default) and
  re-run a prompt to observe differences.
- Ask a follow-up question — Nova remembers the conversation context.

### 2. Knowledge Base (`/knowledge`)
- Drag-and-drop a `.txt`, `.md`, `.pdf`, `.docx`, or `.csv` file, or click
  **browse files**.
- Watch the document move from **Processing** to **Ready** with a chunk count.
- Return to chat and ask `What does my document say about ...?` — Nova grounds
  its answer in retrieved chunks and cites the source document by name.

### 3. Prompt Lab & Version Control
- Compare the V1 (naive direct prompt), V2 (Chain-of-Thought), and V3
  (role-based structured) system prompts.
- Edit the system instruction, run a test, and observe the output change.

### 4. Side-by-Side Model Comparison
- Enter a prompt and execute the comparison to view outputs and latency for
  two different models.

### 5. Evaluations & Analytics
- The Evaluations dashboard reports heuristic scores, latency, and pass rates
  (backed by `/api/evaluations`).

### 6. Responsible AI
- Review the documented guardrails: prompt-injection defense, PII
  anonymization, hallucination grounding, and model limitations.

## Fallback Mode
Without a `GROQ_API_KEY`, Nova still runs: it responds in a helpful offline
mode and tells you exactly which environment variable to set.