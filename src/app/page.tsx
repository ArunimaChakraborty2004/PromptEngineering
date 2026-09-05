"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  tool_name?: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ToolRound {
  name: string;
  args: string;
  result: string;
}

type ModelKey = "default" | "qwen3.8" | "gpt-oss" | "qwen3.6";

interface ModelOption {
  key: ModelKey;
  label: string;
  description: string;
  apiModel: string | null; // null = use server default (GROQ_MODEL)
}

const MODEL_OPTIONS: ModelOption[] = [
  { key: "default", label: "Nova (default)", description: "Balanced, capable default (GROQ_MODEL)", apiModel: null },
  { key: "qwen3.8", label: "Qwen 3.8 27B", description: "Fast, great tool calling", apiModel: "qwen/qwen3.8-27b" },
  { key: "gpt-oss", label: "GPT-OSS 120B", description: "High capability open model", apiModel: "openai/gpt-oss-120b" },
  { key: "qwen3.6", label: "Qwen 3.6 27B", description: "Alternative Qwen variant", apiModel: "qwen/qwen3.6-27b" },
];

const WELCOME = `\u2728 **Welcome to Nova**

I'm your **Intelligent Personal Productivity & Knowledge Assistant**. Here's what I can do:

- \ud83d\udcc5 **Draft & plan** — todos, emails, schedules, research
- \ud83c\udf26\ufe0f **Live tools** — ask for the weather anywhere, or give me math like \`sqrt(144) + 32*4\`
- \ud83d\udcdc **Knowledge Base** — upload documents and ask questions about them
- \ud83e\udde0 **Conversational memory** — I remember our context across turns

Try: *"What's the weather in Hyderabad?"* or *"Compute log10(140000 * 30)"*`;

export default function NovaChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [toolActivity, setToolActivity] = useState<ToolRound[]>([]);
  const [kbUsed, setKbUsed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prevConversationCount, setPrevConversationCount] = useState(0);
  const [selectedModel, setSelectedModel] = useState<ModelKey>("default");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadConversations = useCallback(async (): Promise<Conversation[]> => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      return data.conversations ?? [];
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await loadConversations();
      if (active) setConversations(data);
    })();
    return () => {
      active = false;
    };
  }, [loadConversations]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, toolActivity]);

  const selectConversation = useCallback(
    async (id: string) => {
      setCurrentId(id);
      setError(null);
      setToolActivity([]);
      setKbUsed(false);
      const res = await fetch(`/api/chat?conversationId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
      }
    },
    []
  );

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    setInput("");
    setError(null);
    setToolActivity([]);
    setKbUsed(false);

    if (!currentId) {
      // Optimistic: the server creates the conversation and returns its id.
      setLoading(true);
    } else {
      const optimistic: Message = {
        id: crypto.randomUUID(),
        conversation_id: currentId,
        role: "user",
        content: text,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      setLoading(true);
    }

    try {
      const apiModel = MODEL_OPTIONS.find((m) => m.key === selectedModel)?.apiModel ?? null;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId: currentId,
          model: apiModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");

      if (data.conversationId) setCurrentId(data.conversationId);
      if (data.toolRounds) setToolActivity(data.toolRounds);
      if (data.kbUsed) setKbUsed(true);

      await selectConversation(data.conversationId);

      // Refresh sidebar if we created a new conversation.
      const convs = conversations.length;
      if (!currentId || prevConversationCount !== convs) {
        setConversations((await loadConversations()) as Conversation[]);
      }
      setPrevConversationCount(convs);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function newChat() {
    setCurrentId(null);
    setMessages([]);
    setToolActivity([]);
    setKbUsed(false);
    setError(null);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const hasInitialUserMsg = messages.length === 0 && !loading;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-base font-bold text-white">
            N
          </span>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-zinc-100">Nova</h1>
            <p className="text-xs text-zinc-500">Intelligent Productivity & Knowledge Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Groq API connected
          </span>
          <button
            onClick={newChat}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-800"
          >
            + New chat
          </button>
        </div>
      </header>

      {/* Mobile conversation picker */}
      {conversations.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-b border-zinc-800 bg-zinc-950 px-3 py-2 lg:hidden">
          {conversations.slice(0, 8).map((c) => (
            <button
              key={c.id}
              onClick={() => selectConversation(c.id)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs transition ${
                currentId === c.id
                  ? "border-violet-500 bg-violet-600/20 text-violet-300"
                  : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden w-72 flex-col border-r border-zinc-800 bg-zinc-950/60 lg:flex">
          <div className="border-b border-zinc-800 px-4 py-3">
            <button
              onClick={newChat}
              className="w-full rounded-lg border border-zinc-700 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
            >
              + New conversation
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {conversations.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-zinc-600">
                No conversations yet.
              </p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  className={`w-full px-4 py-2.5 text-left transition hover:bg-zinc-800/60 ${
                    currentId === c.id ? "bg-zinc-800/80" : ""
                  }`}
                >
                  <p className="truncate text-sm text-zinc-200">{c.title}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-600">
                    {new Date(c.updated_at).toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </div>
          <div className="border-t border-zinc-800 px-4 py-3 text-[11px] text-zinc-600">
            <a
              href="/knowledge"
              className="mb-2 flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-violet-500 hover:text-violet-300"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              Knowledge Base
            </a>
            <p className="font-medium text-zinc-500">Capabilities</p>
            <ul className="mt-1 space-y-0.5">
              <li>{"\u2022"} Live tools: Weather, Calculator</li>
              <li>{"\u2022"} Knowledge Base (document Q&A)</li>
              <li>{"\u2022"} Conversational memory</li>
            </ul>
          </div>
        </aside>

        {/* Main chat area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Model selector */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
            <div className="flex gap-2">
              {MODEL_OPTIONS.map((m) => (
                <button
                  key={m.key}
                  title={m.description}
                  onClick={() => setSelectedModel(m.key)}
                  className={`rounded-md px-2.5 py-1 text-xs transition ${
                    selectedModel === m.key
                      ? "bg-violet-600 text-white"
                      : "border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {kbUsed && (
              <span className="flex items-center gap-1 text-xs text-cyan-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                Knowledge Base used
              </span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-4 py-6">
              {hasInitialUserMsg ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
                  <div className="markdown-body text-sm text-zinc-300">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{WELCOME}</ReactMarkdown>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {[
                      "What's the weather in Hyderabad?",
                      "Compute log10(140000 * 30)",
                      "Summarize my uploaded documents",
                      "Draft an email to my team about tomorrow's sprint plan",
                    ].map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-violet-500 hover:text-violet-300"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages
                    .filter((m) => m.role !== "system")
                    .map((m) => (
                      <div
                        key={m.id}
                        className={`animate-fade-in flex ${
                          m.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {m.role === "assistant" && (
                          <div className="mr-3 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 text-xs font-bold text-white">
                            N
                          </div>
                        )}
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                            m.role === "user"
                              ? "bg-violet-600 text-white"
                              : "border border-zinc-800 bg-zinc-900 text-zinc-200"
                          }`}
                        >
                          {m.role === "tool" ? (
                            <div className="flex items-center gap-2 text-xs text-cyan-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                              <code className="text-[11px]">{m.content}</code>
                            </div>
                          ) : (
                            <div className="markdown-body">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {m.content}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                  {toolActivity.length > 0 && (
                    <div className="animate-fade-in flex justify-start">
                      <div className="max-w-[85%] rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-400">
                          Tool activity
                        </p>
                        <div className="space-y-2">
                          {toolActivity.map((t, i) => (
                            <div key={i} className="text-xs">
                              <span className="font-mono text-cyan-300">
                                {t.name}
                              </span>{" "}
                              <span className="text-zinc-400">{t.args}</span>
                              <div className="text-zinc-300">{`\u2192`} {t.result}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {loading && (
                    <div className="animate-fade-in flex items-center gap-2 text-sm text-zinc-500">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800">
                        <span className="h-2 w-2 animate-blink rounded-full bg-violet-400" />
                      </span>
                      Thinking{"\u2026"}
                    </div>
                  )}

                  {error && (
                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      {error}
                    </div>
                  )}
                </div>
              )}
              <div ref={endRef} />
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-zinc-800 bg-zinc-950/80 px-4 py-3">
            <div className="mx-auto max-w-3xl">
              <div className="flex items-end gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 transition focus-within:border-violet-500">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder={
                    loading
                      ? "Nova is thinking\u2026"
                      : "Message Nova \u2026 try \"weather in Paris\" or \"sqrt(144) + 8\""
                  }
                  className="max-h-32 flex-1 resize-none bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
                />
                <button
                  onClick={() => send()}
                  disabled={loading || !input.trim()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white transition hover:bg-violet-500 disabled:opacity-40"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m22 2-7 20-4-9-9-4z" />
                    <path d="M22 2 11 13" />
                  </svg>
                </button>
              </div>
              <p className="mt-1.5 text-center text-[11px] text-zinc-600">
                Nova can call live tools (weather, calculator) and retrieve from your
                uploaded documents. Responses are generated by Groq&apos;s LLM.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}