import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";

// Define the path to the SQLite database
const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), "nova.db");

// Initialize the database connection
const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

// ---------------------------------------------------------------------------
// Migration: the Phase 1 schema stored documents without file metadata and
// chunks without tokens. Drop and recreate those tables when they are stale.
// ---------------------------------------------------------------------------
function migrate() {
  const docCols = db.prepare("PRAGMA table_info(documents)").all() as { name: string }[];
  if (docCols.length > 0 && !docCols.some((c) => c.name === "filepath")) {
    db.exec("DROP TABLE IF EXISTS document_chunks; DROP TABLE IF EXISTS documents;");
  }
  const evalCols = db.prepare("PRAGMA table_info(evaluations)").all() as { name: string }[];
  if (evalCols.length > 0 && !evalCols.some((c) => c.name === "category")) {
    db.exec("DROP TABLE IF EXISTS evaluations;");
  }
}

// Initialize schema
export function initDB() {
  migrate();

  // Create Conversations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT, -- JSON string for sources, tool calls, etc.
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
    );
  `);

  // Create Documents table (with file metadata used by the ingestion pipeline)
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL DEFAULT '',
      filepath TEXT NOT NULL DEFAULT '',
      file_type TEXT NOT NULL DEFAULT '',
      size_bytes INTEGER NOT NULL DEFAULT 0,
      mimetype TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'processing', -- processing | ready | failed
      chunk_count INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Document Chunks table (TF-IDF token vectors stored as JSON)
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL DEFAULT 0,
      content TEXT NOT NULL,
      tokens TEXT, -- JSON object: term -> term frequency
      FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
    );
  `);

  // Create Evaluations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      message_id TEXT,
      category TEXT DEFAULT 'general',
      score INTEGER NOT NULL DEFAULT 0,
      metrics TEXT,
      feedback TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

initDB();

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------
export interface ConversationRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function createConversation(title: string): ConversationRow {
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO conversations (id, title) VALUES (?, ?)"
  ).run(id, title || "New conversation");
  return getConversation(id) as ConversationRow;
}

export function getConversations(): ConversationRow[] {
  return db
    .prepare("SELECT * FROM conversations ORDER BY updated_at DESC")
    .all() as ConversationRow[];
}

export function getConversation(id: string): ConversationRow | undefined {
  return db.prepare("SELECT * FROM conversations WHERE id = ?").get(id) as
    | ConversationRow
    | undefined;
}

export function deleteConversation(id: string): void {
  db.prepare("DELETE FROM conversations WHERE id = ?").run(id);
}

export function renameConversation(id: string, title: string): void {
  db.prepare("UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(title, id);
}

export function touchConversation(id: string): void {
  db.prepare("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------
export interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  metadata: string | null;
  created_at: string;
}

export function addMessage(
  conversationId: string,
  role: string,
  content: string,
  metadata?: Record<string, unknown>
): MessageRow {
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO messages (id, conversation_id, role, content, metadata) VALUES (?, ?, ?, ?, ?)"
  ).run(id, conversationId, role, content, metadata ? JSON.stringify(metadata) : null);
  return getMessage(id) as MessageRow;
}

export function getMessage(id: string): MessageRow | undefined {
  return db.prepare("SELECT * FROM messages WHERE id = ?").get(id) as MessageRow | undefined;
}

export function getMessages(conversationId: string): MessageRow[] {
  return db
    .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC, rowid ASC")
    .all(conversationId) as MessageRow[];
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------
export interface DocumentRow {
  id: string;
  filename: string;
  original_name: string;
  filepath: string;
  file_type: string;
  size_bytes: number;
  mimetype: string;
  status: string;
  chunk_count: number;
  error: string | null;
  created_at: string;
}

export function addDocument(doc: {
  id: string;
  filename: string;
  filepath: string;
  file_type: string;
  size_bytes: number;
  original_name?: string;
  mimetype?: string;
}): DocumentRow {
  db.prepare(
    `INSERT INTO documents (id, filename, original_name, filepath, file_type, size_bytes, mimetype)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    doc.id,
    doc.filename,
    doc.original_name ?? doc.filename,
    doc.filepath,
    doc.file_type,
    doc.size_bytes,
    doc.mimetype ?? ""
  );
  return getDocument(doc.id) as DocumentRow;
}

export function getDocuments(): DocumentRow[] {
  return db
    .prepare("SELECT * FROM documents ORDER BY created_at DESC")
    .all() as DocumentRow[];
}

export function getDocument(id: string): DocumentRow | undefined {
  return db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as DocumentRow | undefined;
}

export function deleteDocument(id: string): void {
  db.prepare("DELETE FROM documents WHERE id = ?").run(id);
}

export function updateDocumentStatus(
  id: string,
  status: string,
  chunkCount?: number,
  error?: string
): void {
  db.prepare(
    "UPDATE documents SET status = ?, chunk_count = ?, error = ? WHERE id = ?"
  ).run(status, chunkCount ?? 0, error ?? null, id);
}

export function countReadyDocuments(): number {
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM documents WHERE status = 'ready'")
    .get() as { n: number };
  return row.n;
}

// ---------------------------------------------------------------------------
// Document Chunks
// ---------------------------------------------------------------------------
export interface ChunkRow {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  tokens: string | null;
  filename?: string;
}

export function addDocumentChunks(
  documentId: string,
  chunks: { content: string; tokens: string }[]
): void {
  const insert = db.prepare(
    "INSERT INTO document_chunks (id, document_id, chunk_index, content, tokens) VALUES (?, ?, ?, ?, ?)"
  );
  chunks.forEach((c, i) => {
    insert.run(crypto.randomUUID(), documentId, i, c.content, c.tokens);
  });
}

export function getChunksForDocument(documentId: string): ChunkRow[] {
  return db
    .prepare("SELECT * FROM document_chunks WHERE document_id = ? ORDER BY chunk_index ASC")
    .all(documentId) as ChunkRow[];
}

export function getAllChunks(): ChunkRow[] {
  return db
    .prepare(
      `SELECT c.id, c.document_id, c.chunk_index, c.content, c.tokens, d.filename
       FROM document_chunks c JOIN documents d ON d.id = c.document_id
       ORDER BY c.chunk_index ASC`
    )
    .all() as ChunkRow[];
}

export function deleteChunksForDocument(documentId: string): void {
  db.prepare("DELETE FROM document_chunks WHERE document_id = ?").run(documentId);
}

// ---------------------------------------------------------------------------
// Evaluations
// ---------------------------------------------------------------------------
export interface EvaluationRow {
  id: string;
  conversation_id: string | null;
  message_id: string | null;
  category: string;
  score: number;
  metrics: string | null;
  feedback: string | null;
  created_at: string;
}

export function addEvaluation(input: {
  conversation_id?: string;
  message_id?: string;
  category?: string;
  score: number;
  metrics?: string;
  feedback?: string;
}): EvaluationRow {
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO evaluations (id, conversation_id, message_id, category, score, metrics, feedback)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.conversation_id ?? null,
    input.message_id ?? null,
    input.category ?? "general",
    input.score,
    input.metrics ?? null,
    input.feedback ?? null
  );
  return db.prepare("SELECT * FROM evaluations WHERE id = ?").get(id) as EvaluationRow;
}

export function getEvaluations(): EvaluationRow[] {
  return db
    .prepare("SELECT * FROM evaluations ORDER BY created_at DESC LIMIT 100")
    .all() as EvaluationRow[];
}

export function getEvaluationStats() {
  const rows = db.prepare("SELECT score FROM evaluations").all() as { score: number }[];
  const n = rows.length;
  const avg = n ? rows.reduce((s, r) => s + r.score, 0) / n : 0;
  const pass = rows.filter((r) => r.score >= 70).length;
  return {
    total: n,
    averageScore: Math.round(avg * 10) / 10,
    passRate: n ? Math.round((pass / n) * 100) : 0,
    highScorers: rows.filter((r) => r.score >= 90).length,
  };
}

export default db;