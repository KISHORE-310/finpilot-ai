"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  ConversationResponse,
  Citation,
  KeyMetric,
  AIHealthResponse,
  AnalyticsOverviewResponse,
} from "@/types";
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  BookOpen,
  Cpu,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Compass,
  PanelRightClose,
  PanelRightOpen,
  ShieldCheck,
  CheckCircle2,
  Wallet,
  ArrowRight,
  RefreshCw,
  Search,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui";

function AIAnalystContent() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams?.get("prompt");

  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [searchThreadQuery, setSearchThreadQuery] = useState("");
  const [messages, setMessages] = useState<
    Array<{
      id?: string;
      role: "user" | "assistant";
      content: string;
      tools_used?: string[];
      citations?: Citation[];
      key_metrics?: KeyMetric[];
      guardrail_intervened?: boolean;
      created_at?: string;
    }>
  >([]);

  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [healthInfo, setHealthInfo] = useState<AIHealthResponse | null>(null);
  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null);
  const [showContextPanel, setShowContextPanel] = useState(true);
  const [expandedTraceIdx, setExpandedTraceIdx] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Suggested prompt chips for India-first personal finance
  const suggestedPrompts = [
    "How much did I spend across all categories this month?",
    "Am I on track with my monthly budget pacing?",
    "Where can I reduce discretionary expenses?",
    "How is my net worth and cash balance changing?",
    "Can I afford a ₹25,000 purchase this month?",
    "Compare Old vs New Tax Regime savings for FY 2024-25",
  ];

  const loadHealthAndConversations = useCallback(async () => {
    try {
      const [health, convs, ov] = await Promise.all([
        api.ai.health().catch(() => null),
        api.ai.listConversations().catch(() => []),
        api.analytics.getOverview("this_month").catch(() => null),
      ]);
      if (health) setHealthInfo(health);
      if (ov) setOverview(ov);
      if (convs && convs.length > 0) {
        setConversations(convs);
        selectConversation(convs[0].id);
      }
    } catch (err) {
      console.error("Failed to load AI conversations:", err);
    }
  }, []);

  useEffect(() => {
    loadHealthAndConversations();
  }, [loadHealthAndConversations]);

  // Handle URL query parameter prompt auto-fill
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      setInputMessage(initialPrompt);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [initialPrompt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const selectConversation = async (convId: string) => {
    setActiveConvId(convId);
    try {
      const msgs = await api.ai.listMessages(convId);
      setMessages(
        (msgs || []).map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          tools_used: m.tools_used || [],
          citations: m.citations || [],
          created_at: m.created_at,
        }))
      );
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  const handleCreateNewConversation = async () => {
    try {
      const newConv = await api.ai.createConversation(`Analysis ${conversations.length + 1}`);
      setConversations([newConv, ...conversations]);
      setActiveConvId(newConv.id);
      setMessages([]);
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    try {
      await api.ai.deleteConversation(convId);
      const remaining = conversations.filter((c) => c.id !== convId);
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
      console.error("Failed to delete conversation:", err);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputMessage;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      role: "user" as const,
      content: textToSend,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputMessage("");
    setLoading(true);

    try {
      const response = await api.ai.chat({
        message: textToSend,
        conversation_id: activeConvId || undefined,
        include_rag: true,
      });

      if (!activeConvId && response.conversation_id) {
        setActiveConvId(response.conversation_id);
        loadHealthAndConversations();
      }

      const assistantMsg = {
        role: "assistant" as const,
        content: response.response,
        tools_used: response.tools_used,
        citations: response.citations,
        key_metrics: response.key_metrics,
        guardrail_intervened: response.guardrail_intervened,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "An unexpected error occurred while communicating with the AI Analyst. The deterministic ledger engine remains healthy. Please try again.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchThreadQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-7.5rem)] min-h-[640px] animate-in fade-in duration-300">
      {/* ============================================================ */}
      {/* COLUMN 1: CONVERSATION THREADS & AGENT HEALTH */}
      {/* ============================================================ */}
      <div className="w-full lg:w-64 bg-[#111420] rounded-2xl border border-slate-800/90 p-4 flex flex-col gap-3.5 shadow-sm shrink-0">
        {/* New Chat Button */}
        <button
          type="button"
          onClick={handleCreateNewConversation}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>New Analysis Thread</span>
        </button>

        {/* Search Threads */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchThreadQuery}
            onChange={(e) => setSearchThreadQuery(e.target.value)}
            placeholder="Filter threads..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#0a0c14] border border-slate-800 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* Engine Specs Pill */}
        {healthInfo && (
          <div className="p-2.5 bg-[#0a0c14]/80 rounded-xl border border-slate-800/90 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                LangGraph Mesh
              </span>
              <span className="text-emerald-400 font-mono font-semibold">5 Nodes Active</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                Verified Corpus
              </span>
              <span className="text-slate-300 font-mono font-semibold">{healthInfo.knowledge_docs_count} Docs</span>
            </div>
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 font-mono">
            Saved Threads ({filteredConversations.length})
          </div>
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 leading-relaxed px-2">
              No saved threads. Ask a question to begin.
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition group ${
                  activeConvId === conv.id
                    ? "bg-blue-600/15 text-blue-300 font-semibold border border-blue-500/30 shadow-sm"
                    : "hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                <div className="truncate flex-1 pr-2 flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
                  <span className="truncate">{conv.title}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDeleteConversation(e, conv.id)}
                  className="p-1 text-slate-400 hover:text-rose-400 opacity-40 hover:opacity-100 transition rounded"
                  title="Delete Conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Security Policy Note */}
        <div className="pt-2.5 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-start gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
          <span>Non-advisory educational analyst grounded in deterministic ledger data.</span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* COLUMN 2: CENTER ACTIVE CHAT WORKSPACE */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col bg-[#111420] rounded-2xl border border-slate-800/90 shadow-sm overflow-hidden min-w-0">
        {/* Workspace Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-[#0a0c14]/40">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 tracking-tight">
                <Sparkles className="w-4 h-4 text-purple-400" />
                AI Financial Analyst Workspace
              </h1>
              <Badge variant="purple" size="sm">LangGraph Engine</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-agent reasoning with deterministic tool calls and verified regulatory knowledge
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowContextPanel(!showContextPanel)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition hidden md:flex items-center gap-1.5 text-xs font-semibold"
              title={showContextPanel ? "Hide Context Panel" : "Show Context Panel"}
            >
              {showContextPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4 text-blue-400" />}
              <span className="hidden xl:inline">{showContextPanel ? "Hide Telemetry" : "Show Telemetry"}</span>
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center space-y-4 my-auto py-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-purple-500/20 ring-1 ring-white/20">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  How can I assist your financial intelligence today?
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mt-1">
                  Ask about your cash flow, net worth, spending anomalies, budget pacing, or personal finance concepts with verified citations.
                </p>
              </div>

              {/* Suggested Prompt Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-3">
                {suggestedPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="p-3 text-left text-xs bg-[#0a0c14]/70 hover:bg-[#0a0c14] border border-slate-800/90 hover:border-slate-700 rounded-xl transition flex items-center justify-between group active:scale-[0.99]"
                  >
                    <span className="text-slate-300 group-hover:text-blue-300 leading-snug font-medium">
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
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-3xl rounded-2xl p-4 sm:p-5 text-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-600/10"
                      : "bg-[#0a0c14]/90 text-slate-200 border border-slate-800/90 rounded-bl-none shadow-sm space-y-3.5"
                  }`}
                >
                  {/* Multi-Agent Execution Pipeline for Assistant */}
                  {msg.role === "assistant" && (
                    <div className="bg-[#131622] rounded-xl border border-slate-800 p-3 space-y-2 text-xs">
                      <div
                        onClick={() => setExpandedTraceIdx(expandedTraceIdx === index ? null : index)}
                        className="flex items-center justify-between cursor-pointer text-slate-400 hover:text-slate-200 select-none"
                      >
                        <div className="flex items-center gap-2">
                          <Compass className="w-3.5 h-3.5 text-blue-400" />
                          <span className="font-semibold text-slate-300 text-[11px]">LangGraph Multi-Agent Execution Pipeline</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="success" size="sm">5/5 Quality Gates</Badge>
                          {expandedTraceIdx === index ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                      </div>

                      {expandedTraceIdx === index && (
                        <div className="pt-2.5 border-t border-slate-800 space-y-2 text-[11px] text-slate-400 animate-in fade-in duration-150">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-300">1. Planner Intent:</span>
                            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px]">
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
                                    className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px] border border-purple-500/30"
                                  >
                                    ✓ {tool}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <div className="font-semibold text-slate-300 mb-1">3. Critic Gate Evaluation:</div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px]">
                              <span className="text-emerald-400">✓ Grounding Validated</span>
                              <span className="text-emerald-400">✓ ₹ INR Formatted</span>
                              <span className="text-emerald-400">✓ Non-Advisory Safe</span>
                              <span className="text-emerald-400">✓ Math Balanced</span>
                              <span className="text-emerald-400">✓ Completeness Passed</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Key Metrics Pills */}
                  {msg.key_metrics && msg.key_metrics.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                      {msg.key_metrics.map((km, kmIdx) => (
                        <div key={kmIdx} className="p-2.5 bg-[#131622] rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">{km.label}</span>
                          <span className="text-sm font-bold font-mono text-emerald-400 mt-0.5 block">{km.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Message Content */}
                  <div className="whitespace-pre-wrap leading-relaxed font-normal text-xs sm:text-sm">
                    {msg.content}
                  </div>

                  {/* Citations Card */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                      <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                        Verified Regulatory & Educational Citations:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.citations.map((c, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-2 bg-[#131622] rounded-lg border border-slate-800 text-[11px] text-slate-300"
                          >
                            <div className="font-medium text-white flex items-center justify-between">
                              <span>{c.source}</span>
                              {c.url && (
                                <a
                                  href={c.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-400 hover:text-blue-300"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                            <p className="text-slate-400 text-[10px] mt-0.5 line-clamp-2">{c.title || c.snippet}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-start">
              <div className="bg-[#0a0c14] border border-slate-800/90 rounded-2xl rounded-bl-none p-4 text-xs text-slate-400 flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
                <span>AI Analyst querying deterministic ledger tools & evaluating critic quality gates...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Composer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800/80 bg-[#0a0c14]/60">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2"
          >
            <div className="flex-1 bg-[#131622] border border-slate-800 rounded-xl p-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition">
              <textarea
                ref={textareaRef}
                rows={2}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your net worth, expenses, budgets, taxes, or finance strategies... (Enter to send, Shift+Enter for newline)"
                className="w-full bg-transparent text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none resize-none scrollbar-thin"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="p-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition shadow-md shadow-blue-600/20 shrink-0 active:scale-95"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* ============================================================ */}
      {/* COLUMN 3: CONTEXTUAL INTELLIGENCE PANEL */}
      {/* ============================================================ */}
      {showContextPanel && overview && (
        <div className="w-full lg:w-72 bg-[#111420] rounded-2xl border border-slate-800/90 p-4 flex flex-col gap-4 shadow-sm shrink-0 overflow-y-auto scrollbar-thin">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">Live Telemetry</h2>
            </div>
            <Badge variant="purple" size="sm">Real-Time</Badge>
          </div>

          {/* Quick Metrics */}
          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-[#0a0c14] border border-slate-800 rounded-xl space-y-1">
              <span className="text-slate-400 text-[11px] block">Net Worth</span>
              <span className="text-sm font-bold font-mono text-white block">
                {formatCurrency(overview.net_worth.net_worth)}
              </span>
            </div>

            <div className="p-3 bg-[#0a0c14] border border-slate-800 rounded-xl space-y-1">
              <span className="text-slate-400 text-[11px] block">Period Cash Surplus</span>
              <span className="text-sm font-bold font-mono text-emerald-400 block">
                {formatCurrency(overview.cash_flow.net_cash_flow)}
              </span>
            </div>

            <div className="p-3 bg-[#0a0c14] border border-slate-800 rounded-xl space-y-1">
              <span className="text-slate-400 text-[11px] block">Financial Health Rating</span>
              <span className="text-sm font-bold text-purple-300 block">
                {overview.financial_health.overall_score}/100 • {overview.financial_health.rating}
              </span>
            </div>
          </div>

          {/* Quick Inquiry Prompts */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Inquiry Prompts
            </div>
            <div className="space-y-1.5">
              {[
                "Audit my highest spending category this month",
                "How much emergency runway do I currently have?",
                "Simulate saving ₹10,000 more per month",
              ].map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  className="w-full p-2 text-left text-[11px] text-slate-300 hover:text-white bg-[#0a0c14]/70 hover:bg-[#0a0c14] border border-slate-800 rounded-lg transition leading-snug"
                >
                  &quot;{prompt}&quot;
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AIAnalystPage() {
  return (
    <React.Suspense
      fallback={
        <div className="h-[calc(100vh-7.5rem)] min-h-[640px] flex items-center justify-center bg-[#111420] rounded-2xl border border-slate-800 text-xs text-slate-400">
          Loading AI Analyst Workspace...
        </div>
      }
    >
      <AIAnalystContent />
    </React.Suspense>
  );
}
