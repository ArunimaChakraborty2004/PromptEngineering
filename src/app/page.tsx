'use client';

import { useState } from 'react';
import { Bot, Send, User, Settings, Database, Beaker, GitCompare, Activity, ShieldCheck } from 'lucide-react';
import KnowledgeBase from '@/components/KnowledgeBase';
import PromptLab from '@/components/PromptLab';
import ModelCompare from '@/components/ModelCompare';
import Evaluations from '@/components/Evaluations';
import ResponsibleAI from '@/components/ResponsibleAI';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0">
        <div className="p-6 font-bold text-xl text-white flex items-center gap-2">
          <Bot className="w-6 h-6 text-blue-400" />
          PromptEngi
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <NavItem icon={<Bot className="w-5 h-5"/>} label="Main Chat" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
          <NavItem icon={<Database className="w-5 h-5"/>} label="Knowledge Base" active={activeTab === 'knowledge'} onClick={() => setActiveTab('knowledge')} />
          <NavItem icon={<Beaker className="w-5 h-5"/>} label="Prompt Lab" active={activeTab === 'lab'} onClick={() => setActiveTab('lab')} />
          <NavItem icon={<GitCompare className="w-5 h-5"/>} label="Compare Models" active={activeTab === 'compare'} onClick={() => setActiveTab('compare')} />
          <NavItem icon={<Activity className="w-5 h-5"/>} label="Evaluations" active={activeTab === 'eval'} onClick={() => setActiveTab('eval')} />
          <NavItem icon={<ShieldCheck className="w-5 h-5"/>} label="Responsible AI" active={activeTab === 'rai'} onClick={() => setActiveTab('rai')} />
        </nav>
        <div className="p-4 border-t border-slate-800 flex items-center gap-2 text-sm cursor-pointer hover:text-white">
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {activeTab === 'chat' && <ChatView />}
        {activeTab === 'knowledge' && <KnowledgeBase />}
        {activeTab === 'lab' && <PromptLab />}
        {activeTab === 'compare' && <ModelCompare />}
        {activeTab === 'eval' && <Evaluations />}
        {activeTab === 'rai' && <ResponsibleAI />}
      </div>
    </div>
  );
}

function ChatView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to fetch response');
      }

      setMessages([...newMessages, { id: (Date.now() + 1).toString(), role: 'assistant', content: data.content }]);
    } catch (err: any) {
      setMessages([...newMessages, { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: `⚠️ Error: ${err.message || 'Something went wrong.'}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm z-10">
        <h1 className="font-semibold text-lg">Chat Workspace</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium">
            Groq Active (groq/compound)
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-900 scroll-smooth">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <Bot className="w-16 h-16 mb-4 text-blue-500 opacity-20" />
            <h2 className="text-xl font-medium mb-2 text-slate-700 dark:text-slate-300">Welcome to PromptEngi</h2>
            <p className="max-w-md text-center text-sm">
              Start experimenting with your prompts. Powered by Groq's high-speed inference engine.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex gap-4 max-w-3xl mx-auto ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role !== 'user' && (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              
              <div className={`px-5 py-3 rounded-2xl max-w-[85%] shadow-sm ${
                m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-bl-none text-slate-800 dark:text-slate-100'
              }`}>
                <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                  {m.content}
                </div>
              </div>

              {m.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center shrink-0 shadow">
                  <User className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-4 max-w-3xl mx-auto justify-start items-center animate-pulse">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="px-5 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-bl-none flex gap-1.5 items-center">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{animationDelay: '0ms'}}></div>
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <form onSubmit={sendMessage} className="max-w-3xl mx-auto relative flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your prompt here... (Press Enter to send)"
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[56px] max-h-32 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
          </div>
          <button 
            type="submit"
            disabled={isLoading || !input.trim()}
            className="h-14 w-14 flex items-center justify-center bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-md"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <div className="text-center text-xs text-slate-500 mt-3">
          AI can make mistakes. Review responses carefully before using them.
        </div>
      </div>
    </>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${active ? 'bg-blue-600 text-white font-medium' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  );
}
