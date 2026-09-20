import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiFetch } from '../utils/api';
import type { CoachProfile } from '../App';

interface ChatAreaProps {
    userProfile: CoachProfile | null;
    selectedTeamId?: number | null;
}

interface Message {
    role: "user" | "assistant";
    content: string;
    sources?: string[];
}

export default function ChatArea({ userProfile, selectedTeamId }: ChatAreaProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: "Hi! I'm Coach Winnie. 🥎 I've got your playbook loaded and team stats ready. How can I help you coach today?"
        }
    ]);
    const [input, setInput] = useState('');
    const [generating, setGenerating] = useState(false);
    const [activeSources, setActiveSources] = useState<number | null>(null);
    const messageEndRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const scrollToBottom = () => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const sendPrompt = useCallback(async (questionText: string, customDivision?: string) => {
        if (!questionText.trim()) return;

        // 1. Add user message and create an empty placeholder for the assistant response
        const userMessage: Message = { role: "user", content: questionText };
        setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "", sources: [] }]);
        setGenerating(true);

        try {
            const response = await apiFetch(`/api/chat`, {
                method: "POST",
                body: JSON.stringify({
                    question: questionText,
                    age_group: customDivision || userProfile?.age_group || "8U Division",
                    coach_name: userProfile?.coach_name || "Guest Coach",
                    location: userProfile?.location || "General Location",
                    coach_id: userProfile?.id,
                    selected_team_id: selectedTeamId || null,
                    history: messages.map(m => ({ role: m.role, content: m.content })),
                }),
            });

            if (!response.ok) {
                throw new Error("API server failed to respond.");
            }

            // 2. Read the response stream chunk-by-chunk
            const reader = response.body?.getReader();
            const decoder = new TextDecoder("utf-8");
            let done = false;
            let buffer = "";

            if (reader) {
                while (!done) {
                    const { value, done: doneReading } = await reader.read();
                    done = doneReading;
                    if (done) break;

                    const chunkValue = decoder.decode(value);
                    buffer += chunkValue;

                    // Split by single newline
                    const lines = buffer.split("\n");
                    buffer = lines.pop() || ""; // retain incomplete line in buffer
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed.startsWith("data: ")) {
                            const dataStr = trimmed.slice(6).trim();
                            try {
                                const parsed = JSON.parse(dataStr);
                                if (parsed.type === "token") {
                                    setMessages((prev) => {
                                        const lastIndex = prev.length - 1;
                                        if (lastIndex < 0) return prev;
                                        const lastMsg = prev[lastIndex];
                                        if (lastMsg && lastMsg.role === "assistant") {
                                            let currentContent = lastMsg.content;
                                            if (currentContent.startsWith("🔍 Running tool:")) {
                                                currentContent = "";
                                            }
                                            return [
                                                ...prev.slice(0, lastIndex),
                                                { ...lastMsg, content: currentContent + parsed.text }
                                            ];
                                        }
                                        return prev;
                                    });
                                } else if (parsed.type === "tool_start") {
                                    setMessages((prev) => {
                                        const lastIndex = prev.length - 1;
                                        if (lastIndex < 0) return prev;
                                        const lastMsg = prev[lastIndex];
                                        if (lastMsg && lastMsg.role === "assistant" && lastMsg.content === "") {
                                            return [
                                                ...prev.slice(0, lastIndex),
                                                { ...lastMsg, content: `🔍 Running tool: ${parsed.tool}...` }
                                            ];
                                        }
                                        return prev;
                                    });
                                } else if (parsed.type === "tool_end") {
                                    setMessages((prev) => {
                                        const lastIndex = prev.length - 1;
                                        if (lastIndex < 0) return prev;
                                        const lastMsg = prev[lastIndex];
                                        if (lastMsg && lastMsg.role === "assistant") {
                                            let content = lastMsg.content;
                                            if (content.startsWith("🔍 Running tool:")) {
                                                content = "";
                                            }
                                            let sources = lastMsg.sources ? [...lastMsg.sources] : [];
                                            if (parsed.sources && Array.isArray(parsed.sources) && parsed.sources.length > 0) {
                                                sources = sources.filter((s) => s !== "softball_playbook");
                                                for (const s of parsed.sources) {
                                                    if (!sources.includes(s)) {
                                                        sources.push(s);
                                                    }
                                                }
                                            } else if (parsed.tool === "search_playbook" && sources.length === 0) {
                                                sources.push("softball_playbook");
                                            }
                                            return [
                                                ...prev.slice(0, lastIndex),
                                                { ...lastMsg, content, sources }
                                            ];
                                        }
                                        return prev;
                                    });
                                } else if (parsed.detail || parsed.type === "error") {
                                    const errorText = parsed.detail || parsed.message || "An error occurred during coaching strategy generation.";
                                    setMessages((prev) => {
                                        const lastIndex = prev.length - 1;
                                        if (lastIndex < 0) return prev;
                                        const lastMsg = prev[lastIndex];
                                        if (lastMsg && lastMsg.role === "assistant") {
                                            return [
                                                ...prev.slice(0, lastIndex),
                                                { ...lastMsg, content: `❌ ${errorText}` }
                                            ];
                                        }
                                        return prev;
                                    });
                                }
                            } catch (e) {
                                console.error("Error parsing stream event:", e);
                            }
                        }
                    }
                }
            }
        } catch {
            setMessages((prev) => {
                const lastIndex = prev.length - 1;
                if (lastIndex < 0) return prev;
                const lastMsg = prev[lastIndex];
                if (lastMsg && lastMsg.role === "assistant") {
                    return [
                        ...prev.slice(0, lastIndex),
                        { ...lastMsg, content: "❌ Could not retrieve coaching strategy. Ensure backend FastAPI is running." }
                    ];
                }
                return prev;
            });
        } finally {
            setGenerating(false);
        }
    }, [userProfile, selectedTeamId, messages]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, generating]);

    useEffect(() => {
        if (!generating) {
            inputRef.current?.focus();
        }
    }, [generating]);

    // Listen for structural event generated in sidebar
    useEffect(() => {
        const handlePlaybookGen = (e: Event) => {
            const customEvent = e as CustomEvent;
            const { prompt, division } = customEvent.detail;
            sendPrompt(prompt, division);
        };

        window.addEventListener("generate-playbook", handlePlaybookGen);
        return () => window.removeEventListener("generate-playbook", handlePlaybookGen);
    }, [sendPrompt]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (generating || !input.trim()) return;
        const query = input;
        setInput('');
        inputRef.current?.focus();
        sendPrompt(query);
    };

    return (
        <div className="chat-area-container">
          <div className="chat-window">
            {messages.length === 0 ? (
              <div className="chat-empty-state">
                <span className="bulletin-icon">📋</span>
                <h3>Coach Winnie's Whiteboard Active</h3>
                <p>I'm Coach Winnie, your fastpitch playbook co-pilot. Ask me about situational rules, pitching circle drills, or team rotations!</p>
              </div>
            ) : (
              <div className="chat-history-scroll">
                {messages.map((msg, idx) => {
                  const isLastEmptyAssistant = idx === messages.length - 1 && msg.role === 'assistant' && msg.content === "" && generating;
                  if (isLastEmptyAssistant) return null;

                  return (
                    <div key={idx} className={`chat-message ${msg.role}`}>
                      <div className="message-avatar">
                        {msg.role === 'user' ? '🧢' : <img src="/winnie-avatar.png?v=4" alt="Winnie" className="avatar-img" />}
                      </div>
                      <div className="message-content-wrapper">
                        <div className="message-text">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                        
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="message-sources-wrapper">
                            <button 
                              onClick={() => setActiveSources(activeSources === idx ? null : idx)}
                              className="btn-sources-toggle"
                            >
                              <BookOpen size={14} />
                              Sources referenced ({msg.sources.length})
                            </button>
                            
                            {activeSources === idx && (
                              <div className="sources-list">
                                {msg.sources.map((source, sIdx) => (
                                  <span key={sIdx} className="source-badge">• {source}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {generating && messages[messages.length - 1]?.content === "" && (
                  <div className="chat-message assistant generating">
                    <div className="message-avatar">
                      <img src="/winnie-avatar.png?v=4" alt="Winnie" className="avatar-img" />
                    </div>
                    <div className="spinner-wrapper">
                      <div className="spinner"></div>
                      <span>Coach Winnie is stepping up to the plate... Calculating strategy...</span>
                    </div>
                  </div>
                )}
                <div ref={messageEndRef} />
              </div>
            )}
          </div>
          <form onSubmit={handleSend} className="chat-input-bar">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Coach Winnie a youth fastpitch strategy question..."
              className="chat-input-box"
            />
            <button type="submit" className="btn-send" disabled={generating || !input.trim()}>
              <Send size={18} />
            </button>
          </form>
        </div>
    );
}