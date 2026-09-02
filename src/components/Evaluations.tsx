'use client';

import { Activity, Award, CheckCircle, BarChart3, AlertTriangle } from 'lucide-react';

export default function Evaluations() {
  const metrics = [
    { title: 'Average Latency', value: '185 ms', change: '-12%', status: 'good' },
    { title: 'Relevance Score', value: '94.8%', change: '+3.2%', status: 'good' },
    { title: 'Hallucination Rate', value: '1.2%', change: '-0.5%', status: 'good' },
    { title: 'Total Tokens Consumed', value: '142.5K', change: '+18%', status: 'neutral' },
  ];

  const evaluations = [
    { id: '1', prompt: 'Summarize key policy updates', score: 98, latency: '160ms', pass: true, date: '10 mins ago' },
    { id: '2', prompt: 'Format customer address to JSON', score: 100, latency: '140ms', pass: true, date: '25 mins ago' },
    { id: '3', prompt: 'Extract technical requirements from RFP', score: 88, latency: '290ms', pass: true, date: '1 hour ago' },
    { id: '4', prompt: 'Generate SQL query for user metrics', score: 95, latency: '210ms', pass: true, date: '2 hours ago' },
  ];

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Evaluations & Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">Heuristic scoring, accuracy benchmarks, and prompt performance tracking.</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((m, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <span className="text-xs text-slate-400 font-medium">{m.title}</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold">{m.value}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  m.status === 'good' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 text-slate-600'
                }`}>
                  {m.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Runs Table */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Automated Evaluation Audit Log
            </h3>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {evaluations.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                <div>
                  <h4 className="font-medium text-sm text-slate-800 dark:text-slate-200">{item.prompt}</h4>
                  <span className="text-xs text-slate-400">Tested {item.date} • Latency: {item.latency}</span>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.score}/100</span>
                    <span className="block text-[10px] text-slate-400">Heuristic Score</span>
                  </div>

                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Passed
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
