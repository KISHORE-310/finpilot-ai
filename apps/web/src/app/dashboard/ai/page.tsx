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
  DollarSign
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
  const [healthInfo, setHealthInfo] = useState<{ status: string; model: string; knowledge_docs_count: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested prompt chips
  const suggestedPrompts = [
    "What is my current net worth and liquid cash?",
    "How much did I spend this month by category?",
    "Do I have any recurring subscription expenses?",
    "How is my emergency fund calculated based on CFPB rules?",
    "What are my financial health score strengths and risks?",
    "What is the difference between debt snowball and avalanche methods?"
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
      if (health) setHealthInfo(health);
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
      setMessages(msgs.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        tools_used: m.tools_used,
        citations: m.citations,
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
      console.error('Failed to create new conversation:', err);
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

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || loading) return;

    const userMsg = {
      role: 'user' as const,
      content: text,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const response: ChatResponse = await api.ai.chat({
        message: text,
        conversation_id: activeConvId || undefined,
        include_rag: true
      });

      if (!activeConvId && response.conversation_id) {
        setActiveConvId(response.conversation_id);
        const convList = await api.ai.listConversations();
        setConversations(convList);
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: response.response,
          tools_used: response.tools_used,
          citations: response.citations,
          key_metrics: response.key_metrics,
          guardrail_intervened: response.guardrail_intervened,
          created_at: new Date().toISOString()
        }
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${err.message || 'Failed to communicate with AI Financial Analyst.'}`,
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6">
      {/* Left Sidebar: Conversations */}
      <div className="w-full md:w-80 flex flex-col bg-card rounded-xl border p-4 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h2 className="font-semibold text-foreground">Conversations</h2>
          </div>
          <button
            onClick={handleCreateNewConversation}
            className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        {/* Model Status Badge */}
        {healthInfo && (
          <div className="my-3 p-2.5 bg-muted/50 rounded-lg text-xs flex flex-col gap-1 border">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium">
                <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                Model Engine
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Active
              </span>
            </div>
            <div className="text-foreground font-mono text-[11px] truncate">
              {healthInfo.model}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {healthInfo.knowledge_docs_count} verified knowledge bases loaded
            </div>
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No conversations yet. Start asking financial questions!
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition ${
                  activeConvId === conv.id
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-200 dark:border-indigo-900'
                    : 'hover:bg-muted text-muted-foreground'
                }`}
              >
                <div className="truncate flex-1 pr-2">
                  {conv.title}
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(e, conv.id)}
                  className="p-1 hover:text-red-500 opacity-60 hover:opacity-100 transition"
                  title="Delete Conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Financial Guardrail Note */}
        <div className="pt-3 border-t text-[11px] text-muted-foreground flex items-start gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>Non-advisory educational platform with deterministic data grounding.</span>
        </div>
      </div>

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col bg-card rounded-xl border shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-muted/20">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              AI Financial Analyst
            </h1>
            <p className="text-xs text-muted-foreground">
              Grounded conversational analysis powered by your deterministic financial data and vetted education
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Grounded Tools Active
            </span>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                How can I assist your financial journey today?
              </h3>
              <p className="text-xs text-muted-foreground">
                I can analyze your spending trends, net worth, budgets, recurring bills, emergency savings, and explain foundational personal finance strategies with grounded citations.
              </p>

              {/* Starter Prompt Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full pt-2">
                {suggestedPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="p-3 text-left text-xs bg-muted/40 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border rounded-lg transition flex items-center justify-between group"
                  >
                    <span className="text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {prompt}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition text-indigo-600 flex-shrink-0 ml-2" />
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
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-muted/60 text-foreground border rounded-bl-none shadow-sm space-y-3'
                  }`}
                >
                  {/* Tool execution badges */}
                  {msg.role === 'assistant' && msg.tools_used && msg.tools_used.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pb-1">
                      {msg.tools_used.map((tool, tIdx) => (
                        <span
                          key={tIdx}
                          className="inline-flex items-center gap-1 text-[10px] font-medium bg-background/80 text-muted-foreground border px-2 py-0.5 rounded-md"
                        >
                          <Cpu className="w-3 h-3 text-indigo-500" />
                          {tool}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Guardrail alert */}
                  {msg.guardrail_intervened && (
                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>Security Guardrail: Action intercepted to maintain advisory and execution boundaries.</span>
                    </div>
                  )}

                  {/* Message content */}
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>

                  {/* Key Metrics Cards if present */}
                  {msg.key_metrics && msg.key_metrics.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                      {msg.key_metrics.map((km, kIdx) => (
                        <div key={kIdx} className="p-2 rounded bg-background border text-xs">
                          <div className="text-[10px] text-muted-foreground">{km.label}</div>
                          <div className="font-semibold text-foreground">{km.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Grounded Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="pt-2 border-t text-xs space-y-1">
                      <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                        Educational Sources & Citations
                      </div>
                      <div className="grid grid-cols-1 gap-1">
                        {msg.citations.map((cite, cIdx) => (
                          <div key={cIdx} className="text-[11px] bg-background/60 p-1.5 rounded border text-muted-foreground">
                            <span className="font-medium text-foreground">{cite.title}</span> — {cite.source}
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
              <div className="bg-muted/60 text-foreground border rounded-2xl rounded-bl-none p-4 text-xs flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Analyzing financial ledger and consulting verified knowledge bases...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t bg-card">
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
              placeholder="Ask anything about your net worth, expenses, budgets, or financial strategies..."
              className="flex-1 text-sm bg-muted/40 border border-input rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-foreground placeholder:text-muted-foreground"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-1.5 transition"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>
          <div className="text-[10px] text-center text-muted-foreground mt-2">
            FinPilot AI provides educational analytics and is not a registered financial advisor. Verify all decisions independently.
          </div>
        </div>
      </div>
    </div>
  );
}
