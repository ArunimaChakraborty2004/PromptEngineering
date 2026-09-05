import { NextRequest } from "next/server";
import { getConversation, getMessages, deleteConversation, renameConversation, touchConversation } from "@/lib/db";
import { runAssistant } from "@/lib/orchestrator";
import { getConfiguredModel } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const conv = getConversation(id);
  if (!conv) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ conversation: conv, messages: getMessages(id) });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!getConversation(id)) return Response.json({ error: "Not found" }, { status: 404 });
  let body: { title?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.title?.trim()) return Response.json({ error: "title is required" }, { status: 400 });
  renameConversation(id, body.title.trim().slice(0, 100));
  return Response.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  deleteConversation(id);
  return Response.json({ ok: true });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const conv = getConversation(id);
  if (!conv) return Response.json({ error: "Not found" }, { status: 404 });

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const userText = (body.message ?? "").trim();
  if (!userText) return Response.json({ error: "message is required" }, { status: 400 });

  const result = await runAssistant(id, userText);
  touchConversation(id);

  return Response.json({
    reply: result.reply,
    conversation_id: id,
    model: result.model || getConfiguredModel(),
    tool_events: result.toolEvents,
  });
}