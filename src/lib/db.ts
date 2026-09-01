import Database from 'better-sqlite3';
import path from 'path';

// Define the path to the SQLite database
const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), 'nova.db');

// Initialize the database connection
const db = new Database(dbPath, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
});

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
export function initDB() {
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

  // Create Documents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      size INTEGER NOT NULL,
      mimetype TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'processing',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Document Chunks table (for lightweight retrieval without vector DB)
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      -- Optional: simple vector embedding storage if we use pgvector or similar, 
      -- but for SQLite we can just do basic keyword search or small in-memory embeddings.
      embedding TEXT, -- JSON array of floats if computed
      FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
    );
  `);

  // Create Evaluations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      prompt_version TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt TEXT NOT NULL,
      response TEXT NOT NULL,
      latency_ms INTEGER,
      score_accuracy REAL,
      score_relevance REAL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Call init on import so the tables exist
initDB();

export default db;
