import React, { useState, useEffect, useRef } from 'react';
import { Send, BookOpen } from 'lucide-react';
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
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [generating, setGenerating] = useState(false);
    const [activeSources, setActiveSources] = useState<number | null>(null);
    const messageEndRef = useRef<HTMLDivElement | null>(null);



    const scrollToBottom = () => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, generating]);

    // Listen for structural event generated in sidebar
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
                      <div className="message-text">
                        {renderMarkdown(msg.content, msg.role)}
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

// Helper to parse simple Markdown syntax into beautiful React elements
function renderMarkdown(content: string, role: "user" | "assistant") {
  const lines = content.split('\n');
  const elements: React.JSX.Element[] = [];
  let currentList: { type: 'bullet' | 'ordered'; items: string[] } | null = null;

  const isUser = role === 'user';

  // Flush any accumulated list items into a single ul or ol element
  const flushList = (key: string | number) => {
    if (!currentList) return;
    const listStyle = { 
      margin: '8px 0 8px 20px', 
      listStyleType: currentList.type === 'bullet' ? 'disc' : 'decimal',
      paddingLeft: '0'
    };
    const itemStyle = { 
      color: isUser ? 'inherit' : 'var(--text)', 
      marginBottom: '6px',
      lineHeight: '1.6',
      textAlign: 'left' as const
    };

    if (currentList.type === 'bullet') {
      elements.push(
        <ul key={`list-${key}`} style={listStyle}>
          {currentList.items.map((item, idx) => (
            <li key={idx} style={itemStyle}>
              {parseBoldText(item)}
            </li>
          ))}
        </ul>
      );
    } else {
      elements.push(
        <ol key={`list-${key}`} style={listStyle}>
          {currentList.items.map((item, idx) => (
            <li key={idx} style={itemStyle}>
              {parseBoldText(item)}
            </li>
          ))}
        </ol>
      );
    }
    currentList = null;
  };

  // Parses **bold** occurrences inside a line
  const parseBoldText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong 
            key={i} 
            style={{ 
              color: isUser ? 'inherit' : 'var(--text-h)', 
              fontWeight: '700' 
            }}
          >
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // 1. Empty lines -> create paragraph break spacing
    if (!trimmed) {
      flushList(index);
      elements.push(<div key={`spacer-${index}`} style={{ height: '8px' }} />);
      return;
    }

    // 2. Horizontal Rules
    if (trimmed === '---') {
      flushList(index);
      elements.push(
        <hr 
          key={`hr-${index}`} 
          style={{ 
            border: 'none', 
            borderTop: isUser ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border)', 
            margin: '16px 0' 
          }} 
        />
      );
      return;
    }

    // 3. Headers
    if (trimmed.startsWith('### ')) {
      flushList(index);
      elements.push(
        <h3 
          key={`h3-${index}`} 
          style={{ 
            color: isUser ? 'inherit' : 'var(--accent)', 
            fontSize: '19px', 
            fontWeight: '700', 
            margin: '14px 0 6px 0',
            lineHeight: '1.3',
            textAlign: 'left'
          }}
        >
          {parseBoldText(trimmed.substring(4))}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('#### ')) {
      flushList(index);
      elements.push(
        <h4 
          key={`h4-${index}`} 
          style={{ 
            color: isUser ? 'inherit' : 'var(--text-h)', 
            fontSize: '17px', 
            fontWeight: '700', 
            margin: '12px 0 4px 0',
            lineHeight: '1.3',
            textAlign: 'left'
          }}
        >
          {parseBoldText(trimmed.substring(5))}
        </h4>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      flushList(index);
      elements.push(
        <h2 
          key={`h2-${index}`} 
          style={{ 
            color: isUser ? 'inherit' : 'var(--accent)', 
            fontSize: '22px', 
            fontWeight: '800', 
            margin: '18px 0 8px 0',
            lineHeight: '1.3',
            textAlign: 'left'
          }}
        >
          {parseBoldText(trimmed.substring(3))}
        </h2>
      );
      return;
    }

    // 4. Bullet Points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const cleanText = trimmed.substring(2);
      if (currentList && currentList.type === 'bullet') {
        currentList.items.push(cleanText);
      } else {
        flushList(index);
        currentList = { type: 'bullet', items: [cleanText] };
      }
      return;
    }

    // 5. Numbered Lists
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      const cleanText = numMatch[2];
      if (currentList && currentList.type === 'ordered') {
        currentList.items.push(cleanText);
      } else {
        flushList(index);
        currentList = { type: 'ordered', items: [cleanText] };
      }
      return;
    }

    // 6. Regular Paragraphs
    flushList(index);
    elements.push(
      <p 
        key={`p-${index}`} 
        style={{ 
          color: isUser ? 'inherit' : 'var(--text)', 
          lineHeight: '1.6', 
          marginBottom: '8px',
          marginTop: '0',
          textAlign: 'left'
        }}
      >
        {parseBoldText(line)}
      </p>
    );
  });

  // Flush remaining lists at the end
  flushList('final');

  return elements;
}