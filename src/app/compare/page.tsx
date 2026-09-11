"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ModelSpec {
  key: string;
  label: string;
  sublabel: string;
  apiModel: string | null;
}

const MODELS: ModelSpec[] = [
  { key: "default", label: "Nova (default)", sublabel: "GROQ_MODEL", apiModel: null },
  { key: "qwen3.8", label: "Qwen 3.8 27B", sublabel: "qwen/qwen3.8-27b", apiModel: "qwen/qwen3.8-27b" },
  { key: "gpt-oss", label: "GPT-OSS 120B", sublabel: "openai/gpt-oss-120b", apiModel: "openai/gpt-oss-120b" },
  { key: "qwen3.6", label: "Qwen 3.6 27B", sublabel: "qwen/qwen3.6-27b", apiModel: "qwen/qwen3.6-27b" },
];

interface Cell {
  output: string;
  latency: number | null;
  error?: string;
}

export default function ComparePage() {
  const [prompt, setPrompt] = useState(
    "Explain artificial intelligence in simple terms for a 10 year old."
  );
  const [running, setRunning] = useState(false);
  const [cells, setCells] = useState<Record<string, Cell>>({});

  async function runOne(spec: ModelSpec): Promise<Cell> {
    const start = performance.now();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, model: spec.apiModel }),
      });
      const data = await res.json();
      const latency = Math.round(performance.now() - start);
      if (!res.ok) {
        return { output: "", latency, error: data.error ?? "Request failed" };
      }
      return { output: data.content ?? data.reply ?? "", latency };
    } catch (e) {
      return { output: "", latency: null, error: (e as Error).message };
    }
  }

  async function runAll() {
    if (!prompt.trim() || running) return;
    setRunning(true);
    setCells({});
    const results = await Promise.all(MODELS.map((m) => runOne(m)));
    const next: Record<string, Cell> = {};
    MODELS.forEach((m, i) => (next[m.key] = results[i]));
    setCells(next);
    setRunning(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          {"\u2190"} Back to Nova chat
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Model Comparison</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Run the same prompt against all models side-by-side and compare quality
          and latency.
        </p>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <div className="mt-4 flex justify-end">
            <button
              onClick={runAll}
              disabled={running || !prompt.trim()}
              className="rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
            >
              {running ? "Running all models\u2026" : "Execute Comparison"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {MODELS.map((m) => {
            const cell = cells[m.key];
            return (
              <div
                key={m.key}
                className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60"
              >
                <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">{m.label}</p>
                    <p className="font-mono text-[11px] text-zinc-500">{m.sublabel}</p>
                  </div>
                  {cell?.latency !== null && cell?.latency !== undefined && (
                    <span className="text-xs text-zinc-400">{cell.latency} ms</span>
                  )}
                </div>
                <div className="h-72 flex-1 overflow-y-auto p-4 text-sm leading-relaxed text-zinc-300">
                  {cell?.error ? (
                    <p className="text-red-400">Error: {cell.error}</p>
                  ) : cell?.output ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{cell.output}</ReactMarkdown>
                  ) : running ? (
                    <p className="text-zinc-600">Generating\u2026</p>
                  ) : (
                    <p className="text-zinc-600">Run the comparison to see output.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}