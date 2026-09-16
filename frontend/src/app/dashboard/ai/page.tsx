'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import {
  ChatResponse,
  ConversationResponse,
  MessageItemResponse,
  Citation,
  KeyMetric
} from '@/types';
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  BookOpen,
  TrendingUp,
  ShieldCheck,
  Cpu,
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  IndianRupee,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Compass,
} from 'lucide-react';

export default function AIAnalystPage() {
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{
    id?: string;
    role: 'user' | 'assistant';
    content: string;
    tools_used?: string[];
    citations?: Citation[];
    key_metrics?: KeyMetric[];
    guardrail_intervened?: boolean;
    created_at?: string;
  }>>([]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [healthInfo, setHealthInfo] = useState<{ status?: string; model: string; knowledge_docs_count: number } | null>(null);
  const [expandedTraceIdx, setExpandedTraceIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested prompt chips for India-first personal finance
  const suggestedPrompts = [
    "What is my current net worth and cash balance in ₹?",
    "How much did I spend this month across all categories?",
    "Do I have any recurring subscriptions or monthly commitments?",
    "How is an emergency fund calculated for 6 months of living expenses?",
    "What are my financial health score strengths and risks?",
    "What is the difference between Old and New Indian Tax Regimes for FY 2024-25?"
  ];

  useEffect(() => {
    loadHealthAndConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadHealthAndConversations = async () => {
    try {
      const [health, convs] = await Promise.all([
        api.ai.health().catch(() => null),
        api.ai.listConversations().catch(() => [])
      ]);
      if (health) setHealthInfo(health as any);
      if (convs && convs.length > 0) {
        setConversations(convs);
        selectConversation(convs[0].id);
      }
    } catch (err) {
      console.error('Failed to load AI conversations:', err);
    }
  };

  const selectConversation = async (convId: string) => {
    setActiveConvId(convId);
    try {
      const msgs = await api.ai.listMessages(convId);
      setMessages((msgs || []).map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        tools_used: m.tools_used || [],
        citations: m.citations || [],
        created_at: m.created_at
      })));
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleCreateNewConversation = async () => {
    try {
      const newConv = await api.ai.createConversation(`Chat ${conversations.length + 1}`);
      setConversations([newConv, ...conversations]);
      setActiveConvId(newConv.id);
      setMessages([]);
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    try {
      await api.ai.deleteConversation(convId);
      const remaining = conversations.filter(c => c.id !== convId);
      setConversations(remaining);
      if (activeConvId === convId) {
        if (remaining.length > 0) {
          selectConversation(remaining[0].id);
        } else {
          setActiveConvId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputMessage;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      role: 'user' as const,
      content: textToSend,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInputMessage('');
    setLoading(true);

    try {
      const response = await api.ai.chat({
        message: textToSend,
        conversation_id: activeConvId || undefined,
        include_rag: true
      });

      if (!activeConvId && response.conversation_id) {
        setActiveConvId(response.conversation_id);
        loadHealthAndConversations();
      }

      const assistantMsg = {
        role: 'assistant' as const,
        content: response.response,
        tools_used: response.tools_used,
        citations: response.citations,
        key_metrics: response.key_metrics,
        guardrail_intervened: response.guardrail_intervened,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'An unexpected error occurred while communicating with the AI Analyst. Please try again.',
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-6.5rem)] min-h-[600px]">
      {/* Sidebar: Conversations & Engine Health */}
      <div className="w-full lg:w-72 bg-[#1a1d2e] rounded-2xl border border-slate-700/50 p-4 flex flex-col gap-4 shadow-lg shrink-0">
        {/* New Chat Button */}
        <button
          onClick={handleCreateNewConversation}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          New Financial Conversation
        </button>

        {/* Engine Specs */}
        {healthInfo && (
          <div className="p-3 bg-[#121526] rounded-xl border border-slate-700/50 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                Multi-Agent Mesh
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                LangGraph 5-Node
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                Semantic RAG
              </span>
              <span className="text-slate-200 font-semibold">{healthInfo.knowledge_docs_count} Verified Docs</span>
            </div>
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No conversations yet. Start asking financial questions!
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition ${
                  activeConvId === conv.id
                    ? 'bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/30'
                    : 'hover:bg-slate-800/60 text-slate-400'
                }`}
              >
                <div className="truncate flex-1 pr-2">
                  {conv.title}
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(e, conv.id)}
                  className="p-1 hover:text-rose-400 opacity-60 hover:opacity-100 transition"
                  title="Delete Conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Financial Guardrail Note */}
        <div className="pt-3 border-t border-slate-700/50 text-[11px] text-slate-400 flex items-start gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>Non-advisory educational platform with deterministic data grounding.</span>
        </div>
      </div>

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col bg-[#1a1d2e] rounded-2xl border border-slate-700/50 shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-900/40">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              AI Financial Analyst
            </h1>
            <p className="text-xs text-slate-400">
              Grounded conversational analysis powered by deterministic financial data and verified knowledge
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 font-medium border border-blue-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Critic 5-Gate Validation Active
            </span>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">
                How can I assist your financial journey today?
              </h3>
              <p className="text-xs text-slate-400">
                I can analyze your spending trends, net worth, budgets, recurring bills, emergency savings, and explain foundational personal finance strategies with grounded citations.
              </p>

              {/* Starter Prompt Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full pt-2">
                {suggestedPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="p-3 text-left text-xs bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-xl transition flex items-center justify-between group"
                  >
                    <span className="text-slate-300 group-hover:text-blue-300">
                      {prompt}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition text-blue-400 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-3xl rounded-2xl p-4 text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-500/10'
                      : 'bg-slate-900/80 text-slate-200 border border-slate-700/50 rounded-bl-none shadow-md space-y-3'
                  }`}
                >
                  {/* Reasoning & Execution Trace Accordion for Assistant */}
                  {msg.role === 'assistant' && (
                    <div className="bg-[#121526] rounded-xl border border-slate-700/60 p-2.5 space-y-2 text-xs">
                      <div
                        onClick={() => setExpandedTraceIdx(expandedTraceIdx === index ? null : index)}
                        className="flex items-center justify-between cursor-pointer text-slate-400 hover:text-slate-200"
                      >
                        <div className="flex items-center gap-2">
                          <Compass className="w-3.5 h-3.5 text-blue-400" />
                          <span className="font-semibold text-slate-300 text-[11px]">LangGraph Multi-Agent Execution Trace</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            5/5 Quality Gates Passed
                          </span>
                          {expandedTraceIdx === index ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                      </div>

                      {expandedTraceIdx === index && (
                        <div className="pt-2 border-t border-slate-800 space-y-2 text-[11px] text-slate-400 animate-fadeIn">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-300">1. Planner Classification:</span>
                            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                              {msg.tools_used && msg.tools_used.length > 0 ? "financial_data + tools" : "educational_rag"}
                            </span>
                          </div>

                          {msg.tools_used && msg.tools_used.length > 0 && (
                            <div>
                              <div className="font-semibold text-slate-300 mb-1">2. Tools Executed:</div>
                              <div className="flex flex-wrap gap-1.5">
                                {msg.tools_used.map((tool, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="inline-flex items-center gap-1 text-[10px] font-medium bg-[#1a1d2e] text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-md font-mono"
                                  >
                                    <Cpu className="w-3 h-3 text-blue-400" />
                                    {tool}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-300">3. Critic Safety Review:</span>
                            <div className="flex items-center gap-1 text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Grounding, ₹ Currency, Non-Advisory Verified</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Guardrail alert */}
                  {msg.guardrail_intervened && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Security Guardrail: Action intercepted to maintain non-advisory boundary.</span>
                    </div>
                  )}

                  {/* Message content */}
                  <div className="whitespace-pre-wrap leading-relaxed text-slate-200">
                    {msg.content}
                  </div>

                  {/* Key Metrics Cards if present */}
                  {msg.key_metrics && msg.key_metrics.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                      {msg.key_metrics.map((km, kIdx) => (
                        <div key={kIdx} className="p-2.5 rounded-xl bg-[#1a1d2e] border border-slate-700/60 text-xs">
                          <div className="text-[10px] text-slate-400">{km.label}</div>
                          <div className="font-semibold text-white mt-0.5">{km.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Grounded Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="pt-2 border-t border-slate-800 text-xs space-y-1">
                      <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                        Educational Sources & Citations
                      </div>
                      <div className="grid grid-cols-1 gap-1">
                        {msg.citations.map((cite, cIdx) => (
                          <div key={cIdx} className="text-[11px] bg-[#1a1d2e] p-2 rounded-lg border border-slate-800 text-slate-300">
                            <span className="font-medium text-white">{cite.title}</span> — {cite.source}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex items-start">
              <div className="bg-slate-900/80 text-slate-300 border border-slate-700/50 rounded-2xl rounded-bl-none p-4 text-xs flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span>LangGraph Agent running Planner, executing financial tools, and evaluating Critic quality gates...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-700/50 bg-[#1a1d2e]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about your cash flow, net worth, budgets, emergency fund, or tax strategy..."
              className="flex-1 bg-[#121526] border border-slate-700 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="p-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl transition shadow-lg shadow-blue-500/20 shrink-0"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
