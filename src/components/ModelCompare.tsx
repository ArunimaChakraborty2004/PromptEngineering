'use client';

import { useState } from 'react';
import { GitCompare, Play, Zap, Clock } from 'lucide-react';

export default function ModelCompare() {
  const [prompt, setPrompt] = useState('Explain the concept of quantum entanglement in simple terms for a 10 year old.');
  const [modelA, setModelA] = useState('groq/compound');
  const [modelB, setModelB] = useState('qwen/qwen3.6-27b');
  const [outputA, setOutputA] = useState('');
  const [outputB, setOutputB] = useState('');
  const [loading, setLoading] = useState(false);
  const [latencyA, setLatencyA] = useState<number | null>(null);
  const [latencyB, setLatencyB] = useState<number | null>(null);

  const runComparison = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setOutputA('');
    setOutputB('');
    setLatencyA(null);
    setLatencyB(null);

    // Call Model A
    const startA = performance.now();
    try {
      const resA = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      });
      const dataA = await resA.json();
      setOutputA(dataA.content || dataA.error || 'No output');
      setLatencyA(Math.round(performance.now() - startA));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setOutputA(`Error: ${e.message}`);
    }

    // Call Model B
    const startB = performance.now();
    try {
      const resB = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      });
      const dataB = await resB.json();
      setOutputB(dataB.content || dataB.error || 'No output');
      setLatencyB(Math.round(performance.now() - startB));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setOutputB(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Model Comparison Engine</h1>
          <p className="text-slate-500 text-sm mt-1">Execute prompts side-by-side to evaluate quality, tone, and latency.</p>
        </div>

        {/* Input & Config */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Comparison Prompt Input</label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="flex justify-end">
            <button 
              onClick={runComparison}
              disabled={loading || !prompt.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition-all shadow-md disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
              {loading ? 'Running Side-by-Side...' : 'Execute Comparison'}
            </button>
          </div>
        </div>

        {/* Side by Side Output Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Model A */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col h-[450px]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div>
                <span className="text-xs font-bold text-blue-600 bg-blue-500/10 px-2.5 py-1 rounded-md">Model A</span>
                <h3 className="font-semibold text-base mt-1">Groq Compound (Flagship)</h3>
              </div>
              {latencyA !== null && (
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{latencyA}ms</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 rounded-xl p-4 text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
              {outputA || (loading ? 'Generating response...' : 'Run comparison to see output.')}
            </div>
          </div>

          {/* Model B */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col h-[450px]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div>
                <span className="text-xs font-bold text-purple-600 bg-purple-500/10 px-2.5 py-1 rounded-md">Model B</span>
                <h3 className="font-semibold text-base mt-1">Qwen 3.6 27B (Groq)</h3>
              </div>
              {latencyB !== null && (
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{latencyB}ms</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 rounded-xl p-4 text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
              {outputB || (loading ? 'Generating response...' : 'Run comparison to see output.')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
