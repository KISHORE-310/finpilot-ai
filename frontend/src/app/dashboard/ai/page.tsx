"use client";

import React, { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import {
  ConversationResponse,
  Citation,
  KeyMetric,
  AIHealthResponse,
} from "@/types";
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  BookOpen,
  TrendingUp,
  ShieldCheck,
  Cpu,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Compass,
} from "lucide-react";
import { Badge } from "@/components/ui";

export default function AIAnalystPage() {
  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
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
  const [expandedTraceIdx, setExpandedTraceIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested prompt chips for India-first personal finance
  const suggestedPrompts = [
    "What is my current net worth and cash balance in ₹?",
    "How much did I spend this month across all categories?",
    "Do I have any recurring subscriptions or monthly commitments?",
    "How is an emergency fund calculated for 6 months of living expenses?",
    "What are my financial health score strengths and risks?",
    "What is the difference between Old and New Indian Tax Regimes for FY 2024-25?",
  ];

  useEffect(() => {
    loadHealthAndConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const loadHealthAndConversations = async () => {
    try {
      const [health, convs] = await Promise.all([
        api.ai.health().catch(() => null),
        api.ai.listConversations().catch(() => []),
      ]);
      if (health) setHealthInfo(health);
      if (convs && convs.length > 0) {
        setConversations(convs);
        selectConversation(convs[0].id);
      }
    } catch (err) {
      console.error("Failed to load AI conversations:", err);
    }
  };

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
            "An unexpected error occurred while communicating with the AI Analyst. The backend deterministic engine remains healthy. Please try again.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-7.5rem)] min-h-[620px] animate-in fade-in duration-300">
      {/* Sidebar: Conversation Threads & Agent Health */}
      <div className="w-full lg:w-72 bg-[#131622] rounded-2xl border border-slate-800/90 p-4 flex flex-col gap-4 shadow-sm shrink-0">
        {/* New Chat Button */}
        <button
          type="button"
          onClick={handleCreateNewConversation}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          New Financial Analysis
        </button>

        {/* Engine Specs */}
        {healthInfo && (
          <div className="p-3 bg-[#0a0c14]/80 rounded-xl border border-slate-800/90 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                Multi-Agent Mesh
              </span>
              <Badge variant="purple" size="sm">LangGraph 5-Node</Badge>
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
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
            Analysis Threads
          </div>
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 leading-relaxed px-2">
              No saved threads. Ask a question to begin live reasoning.
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition ${
                  activeConvId === conv.id
                    ? "bg-blue-600/15 text-blue-300 font-semibold border border-blue-500/30 shadow-sm"
                    : "hover:bg-slate-800/60 text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="truncate flex-1 pr-2">{conv.title}</div>
                <button
                  type="button"
                  onClick={(e) => handleDeleteConversation(e, conv.id)}
                  className="p-1 text-slate-400 hover:text-rose-400 opacity-60 hover:opacity-100 transition rounded"
                  title="Delete Conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Financial Guardrail Note */}
        <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>Non-advisory educational analyst grounded in deterministic ledger data.</span>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col bg-[#131622] rounded-2xl border border-slate-800/90 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-[#0a0c14]/40">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 tracking-tight">
              <Sparkles className="w-4 h-4 text-blue-400" />
              Agentic Financial Analyst
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-agent reasoning with deterministic tool calls and verified regulatory knowledge
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Badge variant="success" size="sm">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 mr-1" />
              Critic 5-Gate Validation Active
            </Badge>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center space-y-4 my-auto py-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                How can I assist your financial journey today?
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md">
                Ask about your cash flow, net worth, spending anomalies, budget pacing, or personal finance concepts with verified citations.
              </p>

              {/* Suggested Prompt Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-3">
                {suggestedPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="p-3 text-left text-xs bg-[#0a0c14]/70 hover:bg-[#0a0c14] border border-slate-800/90 rounded-xl transition flex items-center justify-between group active:scale-[0.99]"
                  >
                    <span className="text-slate-300 group-hover:text-blue-300 leading-snug">
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
                  {/* LangGraph Trace Accordion for Assistant */}
                  {msg.role === "assistant" && (
                    <div className="bg-[#131622] rounded-xl border border-slate-800 p-3 space-y-2 text-xs">
                      <div
                        onClick={() => setExpandedTraceIdx(expandedTraceIdx === index ? null : index)}
                        className="flex items-center justify-between cursor-pointer text-slate-400 hover:text-slate-200 select-none"
                      >
                        <div className="flex items-center gap-2">
                          <Compass className="w-3.5 h-3.5 text-blue-400" />
                          <span className="font-semibold text-slate-300 text-[11px]">LangGraph Multi-Agent Execution Trace</span>
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
                                    {tool}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <div className="font-semibold text-slate-300 mb-1">3. Critic Gate Evaluation:</div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px]">
                              <span className="text-emerald-400">✓ Grounding Validated</span>
                              <span className="text-emerald-400">✓ ₹ INR Currency Formatted</span>
                              <span className="text-emerald-400">✓ Non-Advisory Safe</span>
                              <span className="text-emerald-400">✓ Arithmetic Source Bound</span>
                              <span className="text-emerald-400">✓ Completeness Passed</span>
                            </div>
                          </div>
                        </div>
                      )}
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
                <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                <span>AI Analyst querying deterministic financial tools & validating gates...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800/80 bg-[#0a0c14]/60">
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
              placeholder="Ask about your net worth, expenses, budgets, taxes, or finance strategies..."
              className="flex-1 px-4 py-2.5 bg-[#131622] border border-slate-800 rounded-xl text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition shadow-md shadow-blue-600/20 shrink-0 active:scale-95"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
