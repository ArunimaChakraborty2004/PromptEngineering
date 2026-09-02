'use client';

import { ShieldCheck, Lock, AlertTriangle, FileText, Check } from 'lucide-react';

export default function ResponsibleAI() {
  const policies = [
    { title: 'Prompt Injection Defense', status: 'Enforced', desc: 'Input sanitization and delimiter isolation to prevent adversarial instruction overrides.' },
    { title: 'Pll & Data Anonymization', status: 'Active', desc: 'Automatic detection and masking of sensitive credentials, emails, and PII prior to model submission.' },
    { title: 'Hallucination Mitigation', status: 'Active', desc: 'Grounding responses with verified RAG context and structured JSON constraints.' },
    { title: 'Ethical Content Filters', status: 'Enforced', desc: 'Strict guardrails preventing harmful, abusive, or biased output generation.' }
  ];

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Responsible AI & Safety Framework</h1>
          <p className="text-slate-500 text-sm mt-1">Documentation of guardrails, limitations, and safety compliance policies.</p>
        </div>

        {/* Safety Badges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {policies.map((p, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  {p.status}
                </span>
              </div>
              <h3 className="font-semibold text-base">{p.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Safety Policy Markdown View */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm space-y-6">
          <h3 className="font-semibold text-lg border-b border-slate-100 dark:border-slate-800 pb-4">
            System Limitations & Usage Guidelines
          </h3>
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>
              <strong>1. Model Limitations:</strong> LLM outputs are probabilistic and may contain inaccuracies. Users should independently verify critical factual outputs.
            </p>
            <p>
              <strong>2. Data Retention:</strong> All prompt evaluations and local database queries are kept inside your local SQLite instance (<code className="bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-xs">nova.db</code>) and are never shared with third parties beyond the Groq API endpoint.
            </p>
            <p>
              <strong>3. System Prompt Security:</strong> Never expose system prompt parameters directly to end-user inputs without escaping delimiters.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
