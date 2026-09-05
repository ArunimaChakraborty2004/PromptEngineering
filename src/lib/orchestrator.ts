import { addMessage, getMessages, touchConversation } from "@/lib/db";
import {
  complete,
  NOVA_SYSTEM_PROMPT,
  hasApiKey,
  getConfiguredModel,
  type ChatMessage,
} from "@/lib/llm";
import { ALL_TOOLS, runTool } from "@/lib/tools";
import { searchKnowledgeBase, countReadyDocuments } from "@/lib/documents";

export interface ToolEvent {
  name: string;
  arguments: Record<string, string | number>;
  result: string;
  ok: boolean;
}

export interface OrchestratorResult {
  reply: string;
  conversationId: string;
  model: string;
  toolEvents: ToolEvent[];
  sources: { filename: string; score: number }[];
  fallback: boolean;
}

const MAX_TOOL_ROUNDS = 3;
const HISTORY_TURNS = 12;

function buildKBContext(userText: string): {
  context: string;
  sources: { filename: string; score: number }[];
} {
  if (countReadyDocuments() === 0) return { context: "", sources: [] };
  const hits = searchKnowledgeBase(userText, 4);
  if (hits.length === 0) return { context: "", sources: [] };

  const context =
    "\n\n[KB RESULTS] Retrieved from the user's uploaded documents:\n" +
    hits
      .map(
        (h, i) => `(${i + 1}) From "${h.filename}":\n${h.content.slice(0, 1200)}`
      )
      .join("\n\n");

  const sources = hits.map((h) => ({ filename: h.filename, score: h.score }));
  return { context, sources };
}

function fallbackReply(userText: string): string {
  const lower = userText.toLowerCase();
  if (/\b(weather|temperature|rain|forecast)\b/.test(lower)) {
    return "I'd check the live weather for you, but the Groq API key isn't configured on this device (GROQ_API_KEY). Add it to .env.local and restart, then I can fetch real-time weather via the get_weather tool.";
  }
  if (/calculate|compute|math|[\d\s+\-*/^()]/.test(lower)) {
    return "I can run calculations through the calculate tool, but the Groq API key isn't configured on this device. Add GROQ_API_KEY to .env.local and restart to enable tool calling.";
  }
  if (countReadyDocuments() > 0) {
    return `You have documents indexed in the Knowledge Base. Ask me a question about them and I'll retrieve the relevant chunks — but first add GROQ_API_KEY to .env.local so I can answer.`;
  }
  return `Hello! I'm Nova (offline mode). I can help with weather, calculations, document Q&A and more once GROQ_API_KEY is set in .env.local. You said: "${userText.slice(0, 120)}"`;
}

/**
 * Core assistant orchestration: persist the user message, attach knowledge
 * base context, run the tool-calling loop, persist the reply.
 */
export async function runAssistant(
  conversationId: string,
  userText: string,
  opts?: { model?: string }
): Promise<OrchestratorResult> {
  const model = opts?.model;
  addMessage(conversationId, "user", userText);

  // 1) Knowledge base retrieval (RAG)
  const { context, sources } = buildKBContext(userText);

  // 2) Build context from stored history (exclude the message just added)
  const stored = getMessages(conversationId).slice(0, -1).slice(-HISTORY_TURNS * 2);
  const modelMessages: ChatMessage[] = [
    { role: "system", content: NOVA_SYSTEM_PROMPT },
  ];
  for (const m of stored) {
    if (m.role === "system") continue;
    if (m.role === "assistant") {
      modelMessages.push({ role: "assistant", content: m.content });
    } else {
      modelMessages.push({ role: "user", content: m.content });
    }
  }
  modelMessages.push({ role: "user", content: userText + context });

  if (!hasApiKey()) {
    const reply = fallbackReply(userText);
    addMessage(conversationId, "assistant", reply, { model: "(offline)", fallback: true });
    touchConversation(conversationId);
    return {
      reply,
      conversationId,
      model: "(offline)",
      toolEvents: [],
      sources,
      fallback: true,
    };
  }

  const toolEvents: ToolEvent[] = [];

  // 3) Tool-calling loop
  let finalContent: string | null = null;
  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const result = await complete({
        messages: modelMessages,
        tools: ALL_TOOLS,
        toolChoice: "auto",
        model,
      });

      if (result.toolCalls.length === 0) {
        finalContent = result.content;
        break;
      }

      // Assistant message with its tool_calls (must round-trip ids)
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: result.content ?? "",
        tool_calls: result.rawMessage?.tool_calls ?? [],
      };
      modelMessages.push(assistantMsg);

      for (const tc of result.toolCalls) {
        const toolResult = await runTool(tc.name, tc.arguments);
        toolEvents.push({
          name: tc.name,
          arguments: tc.arguments,
          result: toolResult.result,
          ok: toolResult.ok,
        });
        modelMessages.push({
          role: "tool",
          content: toolResult.result,
          tool_call_id: tc.id,
        });
      }
    }

    if (finalContent === null) {
      const summary = await complete({
        messages: modelMessages,
        tools: [], // force a plain synthesis
        model,
      });
      finalContent = summary.content ?? "Tool execution completed.";
    }
  } catch (error) {
    const msg = (error as Error).message;
    addMessage(conversationId, "assistant", `[error] ${msg}`, { model, toolEvents });
    touchConversation(conversationId);
    throw new Error(msg);
  }

  // 4) Persist assistant reply with metadata about the run.
  addMessage(conversationId, "assistant", finalContent ?? "", {
    model: model ?? getConfiguredModel(),
    tool_events: toolEvents,
    sources,
  });
  touchConversation(conversationId);

  return {
    reply: finalContent ?? "",
    conversationId,
    model: model ?? getConfiguredModel(),
    toolEvents,
    sources,
    fallback: false,
  };
}