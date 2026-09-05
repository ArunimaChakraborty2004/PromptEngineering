import { NextRequest } from "next/server";
import {
  getDocuments,
  getDocument,
  deleteDocument,
} from "@/lib/db";
import { saveUploadedFile, processDocument, humanizeBytes, SUPPORTED_TYPES } from "@/lib/documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const docs = getDocuments().map((d) => ({
    ...d,
    size_human: humanizeBytes(d.size_bytes),
  }));
  return Response.json({ documents: docs, supportedTypes: SUPPORTED_TYPES });
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file uploaded (expected form field 'file')" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let id: string;
  try {
    id = await saveUploadedFile(buffer, file.name);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }

  // Process the document (parse -> chunk -> embed -> store). This blocks the
  // upload response so the client knows the final status without polling.
  try {
    const result = await processDocument(id);
    return Response.json({
      documentId: id,
      filename: file.name,
      size_human: humanizeBytes(buffer.length),
      status: "ready",
      chunkCount: result.chunkCount,
      message: result.message,
    });
  } catch (error) {
    return Response.json({
      documentId: id,
      filename: file.name,
      size_human: humanizeBytes(buffer.length),
      status: "failed",
      message: (error as Error).message,
      error: (error as Error).message,
    }, { status: 422 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });
  const doc = getDocument(id);
  if (doc && doc.filepath) {
    try {
      const fs = await import("fs");
      fs.unlinkSync(doc.filepath);
    } catch {
      // file already gone
    }
  }
  deleteDocument(id);
  return Response.json({ ok: true });
}