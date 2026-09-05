import { NextRequest } from "next/server";
import { getEvaluations, getEvaluationStats, addEvaluation } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    statistics: getEvaluationStats(),
    evaluations: getEvaluations(),
  });
}

export async function POST(req: NextRequest) {
  let body: {
    conversation_id?: string;
    message_id?: string;
    score?: number;
    category?: string;
    metrics?: unknown;
    feedback?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.score !== "number") {
    return Response.json({ error: "score (number) is required" }, { status: 400 });
  }
  if (!body.category) {
    return Response.json({ error: "category is required" }, { status: 400 });
  }
  const clamped = Math.max(0, Math.min(100, Math.round(body.score)));

  const evalRow = addEvaluation({
    conversation_id: body.conversation_id,
    message_id: body.message_id,
    score: clamped,
    category: body.category,
    metrics: body.metrics ? JSON.stringify(body.metrics) : undefined,
    feedback: body.feedback,
  });
  return Response.json({ evaluation: evalRow }, { status: 201 });
}