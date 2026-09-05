import { NextRequest } from "next/server";
import { searchKnowledgeBase, countReadyDocuments } from "@/lib/documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  let hits: ReturnType<typeof searchKnowledgeBase> = [];
  if (q && q.trim().length > 0) {
    hits = searchKnowledgeBase(q, 5);
  }
  return Response.json({
    query: q ?? "",
    totalReadyDocuments: countReadyDocuments(),
    results: hits,
  });
}