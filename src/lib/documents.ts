import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import {
  addDocument,
  addDocumentChunks,
  updateDocumentStatus,
  getDocument,
  getAllChunks,
  countReadyDocuments,
} from "@/lib/db";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export type SupportedFileType = "txt" | "md" | "pdf" | "docx" | "csv";

export const SUPPORTED_TYPES: Record<SupportedFileType, string> = {
  txt: "text/plain",
  md: "text/markdown",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  csv: "text/csv",
};

export function isSupportedFile(filename: string): boolean {
  const ext = getExtension(filename);
  return ext in SUPPORTED_TYPES;
}

export function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return "";
  return filename.slice(dot + 1).toLowerCase();
}

export function humanizeBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Save an uploaded document to disk and register it in the database.
 */
export async function saveUploadedFile(buffer: Buffer, originalName: string): Promise<string> {
  if (!isSupportedFile(originalName)) {
    throw new Error(
      `Unsupported file type. Allowed: ${Object.keys(SUPPORTED_TYPES).join(", ")}`
    );
  }
  const id = uuidv4();
  const safeName = path.basename(originalName);
  const filepath = path.join(uploadDir, `${id}_${safeName}`);
  fs.writeFileSync(filepath, buffer);
  addDocument({
    id,
    filename: safeName,
    filepath,
    file_type: getExtension(originalName),
    size_bytes: buffer.length,
  });
  return id;
}

/**
 * Full ingestion pipeline: read -> parse text -> chunk -> embed -> store.
 */
export async function processDocument(documentId: string): Promise<{
  chunkCount: number;
  message: string;
}> {
  const doc = getDocument(documentId);
  if (!doc) throw new Error("Document not found");

  try {
    const rawText = await extractText(doc.filepath, doc.file_type);
    if (!rawText || rawText.trim().length === 0) {
      throw new Error("No readable text found in document.");
    }

    const cleaned = cleanText(rawText);
    const chunks = chunkText(cleaned, 900, 100);

    const embedded = chunks.map((c) => ({
      content: c,
      tokens: JSON.stringify(tokenize(c)),
    }));

    addDocumentChunks(documentId, embedded);
    updateDocumentStatus(documentId, "ready", embedded.length);
    return {
      chunkCount: embedded.length,
      message: `Ingested ${embedded.length} chunks from "${doc.filename}".`,
    };
  } catch (error) {
    updateDocumentStatus(documentId, "failed", undefined, (error as Error).message);
    throw error;
  }
}

async function extractText(filepath: string, fileType: string): Promise<string> {
  const buffer = fs.readFileSync(filepath);
  switch (fileType) {
    case "txt":
    case "md":
    case "csv":
      return buffer.toString("utf-8");
    case "pdf": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = (await import("pdf-parse")) as any;
      const pdfParse = typeof mod.default === "function" ? mod.default : mod;
      const parsed = await pdfParse(buffer);
      return parsed.text;
    }
    case "docx": {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    default:
      throw new Error(`Unsupported type: ${fileType}`);
  }
}

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Chunk text with overlap. Splits on paragraph first when possible,
 * then falls back to hard character limits.
 */
function chunkText(text: string, maxLen = 900, overlap = 100): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter((p) => p.length > 0);

  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (para.length > maxLen) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      // split long paragraph by sentences
      let remaining = para;
      while (remaining.length > maxLen) {
        const slice = remaining.slice(0, maxLen);
        const lastSpace = slice.lastIndexOf(" ");
        const cutAt = lastSpace > maxLen * 0.5 ? lastSpace : maxLen;
        chunks.push(remaining.slice(0, cutAt).trim());
        remaining = remaining.slice(Math.max(0, cutAt - overlap)).trim();
      }
      if (remaining) chunks.push(remaining.trim());
      continue;
    }

    const candidate = current ? `${current} ${para}` : para;
    if (candidate.length <= maxLen) {
      current = candidate;
    } else {
      if (current) chunks.push(current);
      const tail = current.split(" ");
      const tailLen = tail.slice(-Math.floor(overlap / 8)).join(" ").length;
      current = para;
      if (tailLen > 0) current = `${tail.slice(-Math.floor(overlap / 8)).join(" ")} ${para}`;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Simple TF-IDF-style tokenization for local embeddings.
 * Returns a map of term -> term frequency.
 */
export function tokenize(text: string): Record<string, number> {
  const terms = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
  const freq: Record<string, number> = {};
  for (const t of terms) {
    freq[t] = (freq[t] ?? 0) + 1;
  }
  return freq;
}

const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "any", "can",
  "her", "was", "one", "our", "out", "that", "this", "with", "from",
  "have", "has", "had", "will", "your", "know", "what", "when", "where",
  "which", "there", "their", "about", "into", "than", "then", "them",
  "they", "these", "those", "also", "how", "who", "whom", "because",
]);

function isStopword(term: string): boolean {
  return STOPWORDS.has(term);
}

/**
 * Rank document chunks against a query using cosine similarity
 * with TF-IDF weighting. Returns top hits with scores.
 */
export function searchKnowledgeBase(
  query: string,
  topK = 4
): { chunkId: string; documentId: string; filename: string; content: string; score: number }[] {
  const chunks = getAllChunks();
  if (chunks.length === 0) return [];

  const queryTokens = tokenize(query);
  const queryVector = new Map<string, number>();
  for (const [term, freq] of Object.entries(queryTokens)) {
    if (isStopword(term)) continue;
    queryVector.set(term, Math.log(1 + freq));
  }
  if (queryVector.size === 0) return [];

  const docCount = chunks.length;
  const docFreq = new Map<string, number>();
  for (const chunk of chunks) {
    if (!chunk.tokens) continue;
    const tokens = JSON.parse(chunk.tokens) as Record<string, number>;
    for (const term of Object.keys(tokens)) {
      if (!isStopword(term) && queryVector.has(term)) {
        docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
      }
    }
  }

  interface Scored {
    chunkId: string;
    documentId: string;
    filename: string;
    content: string;
    score: number;
  }
  const results: Scored[] = [];

  for (const chunk of chunks) {
    if (!chunk.tokens) continue;
    const tokens = JSON.parse(chunk.tokens) as Record<string, number>;
    const docVector = new Map<string, number>();
    for (const [term, freq] of Object.entries(tokens)) {
      if (isStopword(term)) continue;
      docVector.set(term, (1 + Math.log(freq)) * Math.log(1 + docCount / ((docFreq.get(term) ?? 1) + 1)));
    }
    let dot = 0;
    let qNorm = 0;
    let dNorm = 0;
    for (const [term, w] of queryVector) {
      qNorm += w * w;
      const dw = docVector.get(term) ?? 0;
      dot += w * dw;
    }
    for (const w of docVector.values()) dNorm += w * w;
    if (qNorm === 0 || dNorm === 0) continue;
    const score = dot / (Math.sqrt(qNorm) * Math.sqrt(dNorm));
    if (score > 0) {
      results.push({
        chunkId: chunk.id,
        documentId: chunk.document_id,
        filename: chunk.filename ?? "document",
        content: chunk.content,
        score,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

export { countReadyDocuments };