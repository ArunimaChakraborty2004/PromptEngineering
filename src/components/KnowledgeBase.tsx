'use client';

import { useState } from 'react';
import { Upload, FileText, CheckCircle, Clock, Trash2, Search } from 'lucide-react';

interface DocItem {
  id: string;
  name: string;
  size: string;
  status: 'processed' | 'processing';
  uploadedAt: string;
}

export default function KnowledgeBase() {
  const [docs, setDocs] = useState<DocItem[]>([
    { id: '1', name: 'System_Architecture_Guide.pdf', size: '2.4 MB', status: 'processed', uploadedAt: '10 mins ago' },
    { id: '2', name: 'Prompt_Engineering_Standard.docx', size: '512 KB', status: 'processed', uploadedAt: '1 hour ago' },
    { id: '3', name: 'Evaluation_Metrics_v2.txt', size: '128 KB', status: 'processed', uploadedAt: 'Yesterday' }
  ]);
  const [dragActive, setDragActive] = useState(false);
  const [search, setSearch] = useState('');

  const handleFileUpload = (filename: string) => {
    const newDoc: DocItem = {
      id: Date.now().toString(),
      name: filename,
      size: `${(Math.random() * 3 + 0.1).toFixed(1)} MB`,
      status: 'processed',
      uploadedAt: 'Just now'
    };
    setDocs([newDoc, ...docs]);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-slate-500 text-sm mt-1">Upload and manage documents to empower RAG (Retrieval-Augmented Generation).</p>
        </div>

        {/* Upload Dropzone */}
        <div 
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileUpload(e.dataTransfer.files[0].name);
            }
          }}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
            dragActive 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:border-blue-400'
          }`}
        >
          <div className="w-12 h-12 bg-blue-500/10 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-lg">Click or drag & drop files here</h3>
          <p className="text-slate-500 text-sm mt-1">Supports PDF, DOCX, TXT, and Markdown files up to 25MB.</p>
          <input 
            type="file" 
            className="hidden" 
            id="file-upload"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0].name);
              }
            }}
          />
          <label htmlFor="file-upload" className="inline-block mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer">
            Browse Files
          </label>
        </div>

        {/* Documents List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Uploaded Documents ({docs.length})</h2>
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-sm">
            {docs
              .filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
              .map((doc) => (
                <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-slate-800 dark:text-slate-200">{doc.name}</h4>
                      <span className="text-xs text-slate-400">{doc.size} • Uploaded {doc.uploadedAt}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Indexed
                    </span>
                    <button 
                      onClick={() => setDocs(docs.filter(d => d.id !== doc.id))}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
