import React, { useState, useEffect, useRef } from 'react';
import { Send, BookOpen } from 'lucide-react';
import type { CoachProfile } from '../App';

interface ChatAreaProps {
    userProfile: CoachProfile | null;
}

interface Message {
    role: "user" | "assistant";
    content: string;
    sources?: string[];
}

export default function ChatArea({ userProfile }: ChatAreaProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [generating, setGenerating] = useState(false);
    const [activeSources, setActiveSources] = useState<number | null>(null);
    const messageEndRef = useRef<HTMLDivElement | null>(null);

    const API_BASE = "http://localhost:8000";

    const scrollToBottom = () => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, generating]);

    // Listen for structural even generated in sidebar
    useEffect(() => {
        const handlePlaybookGen = (e: Event) => {
            const customEvent = e as CustomEvent;
            const { prompt, division } = customEvent.detail;
            sendPrompt(prompt, division);
        };

        window.addEventListener("generate-playbook", handlePlaybookGen);
        return () => window.removeEventListener("generate-playbook", handlePlaybookGen);
    }, [userProfile]);

    const sendPrompt = async (questionText: string, customDivision?: string) => {
        if (!questionText.trim()) return;

        const userMessage: Message = { role: "user", content: questionText };
        setMessages((prev) => [...prev, userMessage]);
        setGenerating(true);

        try {
            const response = await fetch(`${API_BASE}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question: questionText,
                    age_group: customDivision || userProfile?.age_group || "8U Division",
                    coach_name: userProfile?.coach_name || "Guest Coach",
                    location: userProfile?.location || "General Location",
                }),
            });

            if (!response.ok) {
                throw new Error("API server failed to respond.");
            }

            const data = await response.json();
            const assistantMessage: Message = {
                role: "assistant",
                content: data.answer,
                sources: data.sources,
            };
            
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err: any) {
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "❌ Could not retrieve coaching strategy. Ensure backend FastAPI is running." },
            ]);
        } finally {
            setGenerating(false);
        }
    };

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if(!input.trim()) return;
        const query = input;
        setInput('');
        sendPrompt(query);
    };

    return (
    <div className="chat-area-container">
      <div className="chat-window">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <span className="bulletin-icon">📋</span>
            <h3>Coach's Whiteboard Active</h3>
            <p>RAG Fastpitch playbook loaded. Ask situational rules, base strategies, or pitching drills.</p>
          </div>
        ) : (
          <div className="chat-history-scroll">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? '🧢' : '🥎'}
                </div>
                <div className="message-content-wrapper">
                  <div className="message-text">{msg.content}</div>
                  
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
            ))}
            {generating && (
              <div className="chat-message assistant generating">
                <div className="message-avatar">🥎</div>
                <div className="spinner-wrapper">
                  <div className="spinner"></div>
                  <span>Stepping up to the plate... Calculating strategy...</span>
                </div>
              </div>
            )}
            <div ref={messageEndRef} />
          </div>
        )}
      </div>
      <form onSubmit={handleSend} className="chat-input-bar">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a youth fastpitch strategy question..."
          className="chat-input-box"
          disabled={generating}
        />
        <button type="submit" className="btn-send" disabled={generating}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}