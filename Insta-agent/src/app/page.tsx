"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import * as Ably from "ably";
import type { ConversationWithLastMessage, Message } from "@/lib/types";

// Instant updates come from Ably push (see /api/ably-auth + lib/realtime).
// Polling is kept only as a slow safety net in case the realtime token or
// connection drops, or ABLY_API_KEY isn't configured.
const POLL_INTERVAL_MS = 15000;

export default function Dashboard() {
  const [conversations, setConversations] = useState<ConversationWithLastMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Guards against a slow fetch for conversation A landing after the user
  // already clicked conversation B and overwriting B's thread with A's.
  const activeFetchIdRef = useRef<string | null>(null);
  // Latest selected id, read by the Ably handler and the poll tick so neither
  // has to be in their effect deps (which would re-open the realtime connection
  // on every conversation switch).
  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const selected = conversations.find((c) => c.id === selectedId);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      // An API error returns {error} — feeding that into .map() white-screens
      // the page, so only accept arrays.
      if (!res.ok || !Array.isArray(data)) {
        setErrorBanner(data?.error || "Failed to load conversations");
        return;
      }
      setErrorBanner(null);
      // Keep the previous array reference when nothing changed so a poll tick
      // doesn't re-render the whole list (and lose hover/scroll state).
      setConversations((prev) =>
        JSON.stringify(prev) === JSON.stringify(data) ? prev : data
      );
    } catch {
      setErrorBanner("Server unreachable — retrying on next update");
    }
  }, []);

  const fetchMessages = useCallback(async (convoId: string) => {
    activeFetchIdRef.current = convoId;
    try {
      const res = await fetch(`/api/conversations/${convoId}/messages`);
      const data = await res.json();
      if (activeFetchIdRef.current !== convoId) return; // stale response
      if (!res.ok || !Array.isArray(data)) {
        setErrorBanner(data?.error || "Failed to load messages");
        return;
      }
      // Skip the state update (and the scroll-to-bottom it triggers) when the
      // polled thread is identical to what's already rendered.
      setMessages((prev) =>
        JSON.stringify(prev) === JSON.stringify(data) ? prev : data
      );
    } catch {
      if (activeFetchIdRef.current === convoId) {
        setErrorBanner("Failed to load messages");
      }
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedId) fetchMessages(selectedId);
  }, [selectedId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Instant push via Ably: the server publishes an "update" with the changed
  // conversation id, and we re-fetch from the DB (single source of truth). The
  // connection is opened once — selectedId is read from a ref so switching
  // conversations doesn't tear it down and reconnect.
  useEffect(() => {
    let client: Ably.Realtime | null = null;
    try {
      client = new Ably.Realtime({ authUrl: "/api/ably-auth" });
    } catch {
      return; // realtime unavailable — the safety-net poll below still runs
    }
    const channel = client.channels.get("instagram-dm");
    const onUpdate = (msg: Ably.Message) => {
      const convoId = (msg.data as { conversationId?: string })?.conversationId;
      fetchConversations();
      if (convoId && convoId === selectedIdRef.current) {
        fetchMessages(selectedIdRef.current);
      }
    };
    channel.subscribe("update", onUpdate);

    return () => {
      channel.unsubscribe("update", onUpdate);
      client?.close();
    };
  }, [fetchConversations, fetchMessages]);

  // Slow safety-net poll in case the realtime token/connection drops or Ably
  // isn't configured. Pauses while the tab is hidden; refreshes on refocus.
  useEffect(() => {
    let cancelled = false;

    const tick = () => {
      if (cancelled || document.hidden) return;
      fetchConversations();
      if (selectedIdRef.current) fetchMessages(selectedIdRef.current);
    };

    const interval = setInterval(tick, POLL_INTERVAL_MS);
    const onVisibility = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchConversations, fetchMessages]);

  async function toggleMode() {
    if (!selected) return;
    const newMode = selected.mode === "agent" ? "human" : "agent";
    // Only flip the UI once the server confirms — showing "Human Mode" while
    // the bot actually kept auto-replying would be a dangerous lie for a
    // takeover control.
    try {
      const res = await fetch(`/api/conversations/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErrorBanner(data?.error || "Failed to switch mode");
        return;
      }
      setConversations((prev) =>
        prev.map((c) => (c.id === selected.id ? { ...c, mode: newMode } : c))
      );
    } catch {
      setErrorBanner("Failed to switch mode");
    }
  }

  async function handleSend() {
    if (!input.trim() || !selectedId || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${selectedId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input.trim() }),
      });
      if (!res.ok) {
        // Keep the draft in the input so a rate-limit (429) or send failure
        // doesn't silently eat the operator's message.
        const data = await res.json().catch(() => null);
        setErrorBanner(data?.error || `Send failed (${res.status})`);
        return;
      }
      setErrorBanner(null);
      setInput("");
      fetchMessages(selectedId);
    } catch {
      setErrorBanner("Send failed — network error");
    } finally {
      setSending(false);
    }
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function getInitials(name: string | null, igsid: string) {
    if (name) return name.slice(0, 2).toUpperCase();
    return igsid.slice(-2);
  }

  function Avatar({ src, name, igsid, size }: { src: string | null; name: string | null; igsid: string; size: number }) {
    const cls = `rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold overflow-hidden`;
    const style = { width: size, height: size, minWidth: size, fontSize: size * 0.3 };
    if (src) {
      return (
        <div className={cls} style={style}>
          <Image src={src} alt={name || igsid} width={size} height={size} className="w-full h-full object-cover rounded-full" unoptimized />
        </div>
      );
    }
    return (
      <div className={cls} style={{ ...style, background: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)" }}>
        {getInitials(name, igsid)}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0f0f0f] font-sans">
      {/* Error banner */}
      {errorBanner && (
        <div
          role="alert"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 rounded-lg text-xs text-white bg-red-500/90 shadow-lg"
        >
          <span>{errorBanner}</span>
          <button
            onClick={() => setErrorBanner(null)}
            aria-label="Dismiss error"
            className="text-white/80 hover:text-white font-bold"
          >
            ✕
          </button>
        </div>
      )}
      {/* Sidebar */}
      <div className="w-[320px] flex flex-col border-r border-white/[0.06]" style={{ background: "#141414" }}>
        {/* Sidebar Header */}
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white leading-tight">Instagram AI Agent</h1>
              <p className="text-xs text-white/40 leading-tight mt-0.5">
                {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p className="text-xs text-white/30">No conversations yet</p>
            </div>
          )}
          {conversations.map((convo) => {
            const isSelected = selectedId === convo.id;
            return (
              <button
                key={convo.id}
                onClick={() => setSelectedId(convo.id)}
                aria-label={`Open conversation with ${convo.name || convo.username || convo.igsid}`}
                className={`w-full text-left px-4 py-3.5 transition-all duration-150 relative group ${
                  isSelected ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"
                }`}
              >
                {isSelected && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-r"
                    style={{ background: "linear-gradient(to bottom, #833ab4, #fd1d1d)" }}
                  />
                )}
                <div className="flex items-center gap-3">
                  <Avatar src={convo.profile_pic} name={convo.name} igsid={convo.igsid} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white/90 truncate">
                        {convo.name || convo.username || convo.igsid}
                      </span>
                      <span className="text-[10px] text-white/30 flex-shrink-0">
                        {formatTime(convo.updated_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-white/30 truncate">
                        {convo.username ? `@${convo.username}` : convo.last_message || ""}
                      </p>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 uppercase tracking-wide ${
                          convo.mode === "agent"
                            ? "bg-purple-500/20 text-purple-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {convo.mode === "agent" ? "AI" : "You"}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white/40">Select a conversation</p>
              <p className="text-xs text-white/20 mt-1">Choose from the list to start chatting</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between" style={{ background: "#141414" }}>
              <div className="flex items-center gap-4">
                <Avatar src={selected.profile_pic} name={selected.name} igsid={selected.igsid} size={44} />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-white leading-tight">
                      {selected.name || selected.username || selected.igsid}
                    </h2>
                    {selected.username && (
                      <span className="text-xs text-white/30">@{selected.username}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {selected.follower_count !== null && (
                      <span className="text-[11px] text-white/40">
                        <span className="text-white/60 font-medium">{selected.follower_count.toLocaleString()}</span> followers
                      </span>
                    )}
                    {selected.is_user_follow_business !== null && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${selected.is_user_follow_business ? "bg-purple-500/15 text-purple-400" : "bg-white/5 text-white/30"}`}>
                        {selected.is_user_follow_business ? "Follows you" : "Doesn't follow"}
                      </span>
                    )}
                    {selected.is_business_follow_user !== null && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${selected.is_business_follow_user ? "bg-pink-500/15 text-pink-400" : "bg-white/5 text-white/30"}`}>
                        {selected.is_business_follow_user ? "You follow" : "You don't follow"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={toggleMode}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  selected.mode === "agent"
                    ? "bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 border border-purple-500/20"
                    : "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/20"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${selected.mode === "agent" ? "bg-purple-400" : "bg-amber-400"}`} />
                {selected.mode === "agent" ? "AI Mode" : "Human Mode"}
              </button>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 80%, rgba(131,58,180,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(253,29,29,0.03) 0%, transparent 50%)",
              }}
            >
              {messages.map((msg, i) => {
                const isUser = msg.role === "user";
                const showTime = i === messages.length - 1 || messages[i + 1]?.role !== msg.role;
                return (
                  <div key={msg.id} className={`flex items-end gap-2 ${isUser ? "justify-start" : "justify-end"}`}>
                    {isUser && (
                      <Avatar src={selected.profile_pic} name={selected.name} igsid={selected.igsid} size={26} />
                    )}
                    <div className={`flex flex-col ${isUser ? "items-start" : "items-end"} max-w-[65%]`}>
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isUser
                            ? "bg-white/[0.07] text-white/90 rounded-tl-sm border border-white/[0.06]"
                            : "text-white rounded-tr-sm"
                        }`}
                        style={!isUser ? { background: "linear-gradient(135deg, #833ab4, #fd1d1d)" } : {}}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      {showTime && (
                        <p className="text-[10px] text-white/25 mt-1.5 px-1">
                          {!isUser && <span className="text-purple-400/60 mr-1">AI ·</span>}
                          {formatTime(msg.created_at)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="px-6 py-4 border-t border-white/[0.06]" style={{ background: "#141414" }}>
              <div className="flex items-center gap-3 bg-white/[0.06] rounded-xl px-4 py-2.5 border border-white/[0.06] focus-within:border-purple-500/40 transition-colors">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    // isComposing guard: creators type in Indic IMEs — Enter
                    // during composition must commit the character, not send.
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) handleSend();
                  }}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/25 focus:outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="w-8 h-8 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #833ab4, #fd1d1d)" }}
                  aria-label="Send"
                >
                  {sending ? (
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
