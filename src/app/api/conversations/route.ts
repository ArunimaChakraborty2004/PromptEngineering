import { NextRequest } from "next/server";
import {
  getConversations,
  createConversation,
  deleteConversation,
  renameConversation,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ conversations: getConversations() });
}

export async function POST(req: NextRequest) {
  let body: { title?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const title = (body.title ?? "New conversation").slice(0, 100);
  const conv = createConversation(title);
  return Response.json({ conversation: conv }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });
  deleteConversation(id);
  return Response.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });
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