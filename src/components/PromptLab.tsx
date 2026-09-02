'use client';

import { useState } from 'react';
import { Beaker, Play, Save, Check, GitCommit, Copy } from 'lucide-react';

interface Version {
  version: string;
  name: string;
  systemPrompt: string;
  accuracy: string;
  latency: string;
}

export default function PromptLab() {
  const [versions, setVersions] = useState<Version[]>([
    {
      version: 'V1',
      name: 'Naive Direct Prompt',
      systemPrompt: 'You are a helpful AI assistant. Answer the user prompt directly.',
      accuracy: '72%',
      latency: '340ms'
    },
    {
      version: 'V2',
      name: 'Chain-of-Thought (CoT)',
      systemPrompt: 'You are an expert reasoning agent. Think step by step before arriving at your final answer. Structure your output clearly.',
      accuracy: '89%',
      latency: '450ms'
    },
    {
      version: 'V3',
      name: 'Role-Based Structured Guardrail',
      systemPrompt: 'You are a Senior Prompt Engineer. Verify user intent, list constraints, and enforce structured JSON response format.',
      accuracy: '96%',
      latency: '510ms'
    }
  ]);

  const [selectedVersion, setSelectedVersion] = useState<Version>(versions[2]);
  const [testInput, setTestInput] = useState('Extract entities and sentiment from: "Loved the product, but shipping was slow!"');
  const [testOutput, setTestOutput] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const runTest = async () => {
    setIsTesting(true);
    setTestOutput('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: selectedVersion.systemPrompt },
            { role: 'user', content: testInput }
          ]
        })
      });
      const data = await res.json();
      setTestOutput(data.content || data.error || 'No response returned.');
    } catch (e: any) {
      setTestOutput(`Error: ${e.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Prompt Lab & Version Control</h1>
          <p className="text-slate-500 text-sm mt-1">Iterate, benchmark, and compare prompt versions side-by-side.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Version Selection Column */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wider">Versions</h3>
            <div className="space-y-3">
              {versions.map((v) => (
                <div 
                  key={v.version}
                  onClick={() => setSelectedVersion(v)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    selectedVersion.version === v.version 
                      ? 'border-blue-500 bg-white dark:bg-slate-950 shadow-md ring-2 ring-blue-500/20' 
                      : 'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-600 font-bold text-xs rounded-md">
                      {v.version}
                    </span>
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Acc: {v.accuracy}
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{v.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{v.systemPrompt}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Test & Workbench Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <Beaker className="w-5 h-5 text-blue-500" />
                  Prompt Sandbox ({selectedVersion.version})
                </h3>
                <span className="text-xs text-slate-400">Avg Latency: {selectedVersion.latency}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">System Instruction</label>
                <textarea 
                  value={selectedVersion.systemPrompt}
                  onChange={(e) => setSelectedVersion({ ...selectedVersion, systemPrompt: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Test Prompt Input</label>
                <textarea 
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={runTest}
                  disabled={isTesting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition-colors shadow-md disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-white" />
                  {isTesting ? 'Running Prompt...' : 'Run Test Output'}
                </button>
              </div>
            </div>

            {/* Test Output Box */}
            {testOutput && (
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-2">
                <h4 className="font-semibold text-xs text-slate-400 uppercase tracking-wider">Model Execution Result</h4>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl font-mono text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                  {testOutput}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
