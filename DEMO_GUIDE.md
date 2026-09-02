# Demo Guide - Prompt Engineering Platform

## Quick Start
1. Ensure `npm run dev` is running on `http://localhost:3000`.
2. Open your web browser and navigate to `http://localhost:3000`.

## Guided Walkthrough

### 1. Main Chat Workspace
- Click on **Main Chat** in the left sidebar.
- Type any prompt (e.g., *"Help me design a system prompt for a customer support bot"*) and click **Send** or press `Enter`.
- Observe the real-time AI response powered by Groq's high-speed inference engine.

### 2. Knowledge Base
- Click on **Knowledge Base** in the sidebar.
- Test document management by dragging and dropping a PDF/file into the dropzone or clicking **Browse Files**.
- See the uploaded document get indexed in real-time.

### 3. Prompt Lab & Version Control
- Click on **Prompt Lab**.
- Switch between **V1 (Naive)**, **V2 (Chain-of-Thought)**, and **V3 (Role-Based)** to inspect prompt evolution.
- Modify the system instruction in the text box and click **Run Test Output** to see live results.

### 4. Side-by-Side Model Comparison
- Click on **Compare Models**.
- Input a prompt (e.g., *"Explain quantum entanglement to a 10 year old"*).
- Click **Execute Comparison** to compare outputs and latency between models.

### 5. Analytics & Responsible AI
- Navigate to **Evaluations** to review latency metrics and heuristic scores.
- Navigate to **Responsible AI** to review prompt injection defenses and security guardrails.
