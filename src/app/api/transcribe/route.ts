import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { transcribeMedia } from "@/lib/transcribe";
import { saveUploadedFile, processDocument, getExtension } from "@/lib/documents";
import { hasApiKey } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 25 * 1024 * 1024;

/**
 * Transcribe an audio or video file with Groq Whisper, returning the text.
 * Optionally (`addToKnowledgeBase`) the transcript is ingested into the RAG
 * pipeline so Nova can answer questions about the recording.
 */
export async function POST(req: NextRequest) {
  if (!hasApiKey()) {
    return Response.json(
      { error: "GROQ_API_KEY is not set. Add it to .env.local (see README)." },
      { status: 400 }
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const addToKb = form.get("addToKnowledgeBase") === "true";

  if (!(file instanceof File)) {
    return Response.json(
      { error: "No file uploaded (expected form field 'file')" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_FILE_BYTES) {
    return Response.json(
      { error: "File too large. Groq Whisper accepts files up to 25 MB." },
      { status: 400 }
    );
  }

  let transcript: string;
  try {
    const result = await transcribeMedia(buffer, file.name);
    transcript = result.text;
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 422 });
  }

  let documentId: string | null = null;
  let chunkCount: number | null = null;
  if (addToKb) {
    try {
      const safeName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "_");
      const originalExt = getExtension(file.name) || "media";
      documentId = await saveUploadedFile(
        Buffer.from(transcript, "utf-8"),
        `${safeName}_${originalExt}.txt`
      );
      const result = await processDocument(documentId);
      chunkCount = result.chunkCount;
    } catch (error) {
      documentId = null;
      return Response.json(
        {
          text: transcript,
          filename: file.name,
          model: process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo",
          warning: `Transcript ready, but adding to Knowledge Base failed: ${(error as Error).message}`,
        },
        { status: 200 }
      );
    }
  }

  return Response.json({
    text: transcript,
    documentId,
    chunkCount,
    addedToKnowledgeBase: addToKb,
    filename: file.name,
    model: process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo",
  });
}