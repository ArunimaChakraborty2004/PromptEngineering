"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface DocumentRow {
  id: string;
  filename: string;
  file_type: string;
  size_human: string;
  status: "processing" | "ready" | "failed";
  chunk_count: number;
  error?: string;
  created_at: string;
}

const ACCEPT = [
  ".txt",
  ".md",
  ".pdf",
  ".docx",
  ".csv",
].join(",");

export default function KnowledgeBasePage() {
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/documents");
    const data = await res.json();
    setDocs(data.documents ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    async function poll() {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (active) setDocs(data.documents ?? []);
    }
    poll();
    const t = setInterval(poll, 4000); // poll while processing
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  async function uploadFile(file: File) {
    setUploading(true);
    setStatus(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/documents", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setStatus(`Failed: ${data.error ?? "Upload error"}`);
      } else {
        setStatus(`Uploaded "${file.name}" \u2014 ${data.size_human}. Processing in background\u2026`);
        setTimeout(refresh, 1200);
      }
    } catch (e) {
      setStatus(`Upload failed: ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  async function removeDoc(id: string) {
    await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
    refresh();
  }

  const readyCount = docs.filter((d) => d.status === "ready").length;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          {`\u2190`} Back to Nova chat
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Knowledge Base</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Upload documents. Nova retrieves relevant chunks from them when you chat
          (local TF-IDF search, no external embeddings needed).
        </p>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        {/* Upload dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) uploadFile(file);
          }}
          className={`rounded-2xl border-2 border-dashed p-10 text-center transition ${
            dragOver
              ? "border-violet-500 bg-violet-500/10"
              : "border-zinc-700 bg-zinc-900/50"
          }`}
        >
          <p className="text-lg font-medium">
            {uploading ? "Uploading\u2026" : "Drop a document here"}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            or{" "}
            <label className="cursor-pointer font-medium text-violet-400 hover:underline">
              browse files
              <input
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadFile(file);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </p>
          <p className="mt-3 text-xs text-zinc-600">
            Supported: .txt, .md, .pdf, .docx, .csv
          </p>
        </div>

        {status && (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
            {status}
          </div>
        )}

        {/* Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-2xl font-semibold text-violet-400">{docs.length}</p>
            <p className="text-xs text-zinc-500">Total documents</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-2xl font-semibold text-emerald-400">{readyCount}</p>
            <p className="text-xs text-zinc-500">Ready to query</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-2xl font-semibold text-cyan-400">
              {docs.reduce((n, d) => n + d.chunk_count, 0)}
            </p>
            <p className="text-xs text-zinc-500">Total chunks indexed</p>
          </div>
        </div>

        {/* Document list */}
        <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Documents
        </h2>
        {docs.length === 0 ? (
          <p className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-8 text-center text-sm text-zinc-600">
            No documents uploaded yet.
          </p>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-xs font-bold uppercase text-zinc-400">
                    {d.file_type}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{d.filename}</p>
                    <p className="text-xs text-zinc-500">
                      {d.size_human} {"\u00b7"} {d.chunk_count} chunks {"\u00b7"}{" "}
                      {new Date(d.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {d.status === "ready" && (
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400">
                      Ready
                    </span>
                  )}
                  {d.status === "processing" && (
                    <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-400">
                      <span className="h-1.5 w-1.5 animate-blink rounded-full bg-amber-400" />
                      Processing
                    </span>
                  )}
                  {d.status === "failed" && (
                    <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs text-red-400" title={d.error}>
                      Failed
                    </span>
                  )}
                  <button
                    onClick={() => removeDoc(d.id)}
                    className="text-zinc-600 transition hover:text-red-400"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M3 6h18" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}