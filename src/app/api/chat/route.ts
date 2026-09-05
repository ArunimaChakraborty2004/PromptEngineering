import { NextRequest } from "next/server";
import {
  getConversation,
  createConversation,
  getMessages,
} from "@/lib/db";
import { runAssistant } from "@/lib/orchestrator";
import { getConfiguredModel, hasApiKey } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/chat?conversationId=<id>  -> conversation + messages (used by chat UI)
export async function GET(req: NextRequest) {
  const conversationId = req.nextUrl.searchParams.get("conversationId");
  if (conversationId) {
    const conv = getConversation(conversationId);
    if (!conv) return Response.json({ error: "Conversation not found" }, { status: 404 });
    return Response.json({ conversation: conv, messages: getMessages(conversationId) });
  }
  return Response.json({
    ready: true,
    apiKeyConfigured: hasApiKey(),
    model: getConfiguredModel(),
  });
}

// POST /api/chat -> { message, conversationId?, model? }
export async function POST(req: NextRequest) {
  let body: {
    message?: string;
    messages?: { role: string; content: string }[];
    conversationId?: string;
    conversation_id?: string;
    model?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const conversationId = body.conversationId ?? body.conversation_id ?? undefined;
  let userText = (body.message ?? "").trim();
  if (!userText && body.messages && body.messages.length > 0) {
    userText = String(body.messages[body.messages.length - 1].content ?? "").trim();
  }
  if (!userText) return Response.json({ error: "No user message provided" }, { status: 400 });

  const modelId = body.model && body.model !== "default" ? body.model : undefined;

  let convId = conversationId;
  if (!convId) {
    convId = createConversation(userText.slice(0, 60)).id;
  } else if (!getConversation(convId)) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  const result = await runAssistant(convId, userText, { model: modelId });

  return Response.json({
    conversationId: result.conversationId,
    conversation_id: result.conversationId,
    reply: result.reply,
    content: result.reply,
    model: result.model,
    toolRounds: result.toolEvents.map((t) => ({
      name: t.name,
      args: JSON.stringify(t.arguments),
      result: t.result,
      ok: t.ok,
    })),
    tool_events: result.toolEvents,
    kbUsed: result.sources.length > 0,
    sources: result.sources,
    fallback: result.fallback,
  });
}