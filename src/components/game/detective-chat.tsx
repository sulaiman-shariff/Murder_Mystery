"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTeam } from "@/lib/storage/local";
import type { Mystery, DetectiveChatMessage } from "@/types";

interface DetectiveChatProps {
  mystery: Mystery;
  onClose: () => void;
}

const SUGGESTED_QUESTIONS = [
  "Which evidence should we review?",
  "Do any alibis conflict?",
  "What details are easy to overlook?",
  "What should we compare next?",
  "Give us a small hint.",
];

export function DetectiveChat({ mystery, onClose }: DetectiveChatProps) {
  const [messages, setMessages] = useState<DetectiveChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  async function sendMessage(question: string) {
    if (!question.trim() || loading) return;

    const playerMsg: DetectiveChatMessage = {
      role: "player",
      content: question,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, playerMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages
        .slice(-6)
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");

      const res = await fetch("/api/ai/detective-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          mysteryId: mystery.id,
          conversationHistory: history,
          sessionId: getTeam()?.id ? `${getTeam()!.id}_${mystery.id}` : undefined,
        }),
      });
      const data = await res.json();

      const detectiveMsg: DetectiveChatMessage = {
        role: "detective",
        content: data.response,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, detectiveMsg]);
    } catch {
      const errorMsg: DetectiveChatMessage = {
        role: "detective",
        content:
          "The detective is having trouble connecting. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/80 sm:items-center sm:justify-center">
      <div className="bottom-sheet flex max-h-[90vh] w-full flex-col rounded-t-2xl bg-dark-900 sm:mx-4 sm:max-w-md sm:rounded-2xl border border-border-dark">
        <div className="flex items-center justify-between border-b border-border-dark px-4 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-accent">
            Ask the Detective
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary text-lg leading-none"
          >
            &times;
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-3"
          style={{ maxHeight: "50vh" }}
        >
          {messages.length === 0 && (
            <div className="space-y-2">
              <Card className="bg-dark-800 border-border-dark">
                <p className="text-xs leading-relaxed text-text-muted">
                  Ask the detective for guidance. You can ask about evidence,
                  suspects, alibis, or anything that seems suspicious.
                </p>
              </Card>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    disabled={loading}
                    className={`rounded-full border border-border-dark bg-dark-800 px-3 py-1 text-[10px] transition-colors ${
                      loading
                        ? "text-text-muted/50 cursor-not-allowed"
                        : "text-text-secondary hover:border-accent/50 hover:text-text-primary"
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "player" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "player"
                    ? "bg-accent/20 text-text-primary"
                    : "bg-dark-700 text-text-secondary"
                }`}
              >
                <p className="leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-dark-700 px-3 py-2 text-sm text-text-muted">
                <span className="inline-block animate-pulse">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t border-border-dark p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the detective..."
            className="flex-1 rounded border border-border-dark bg-dark-800 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
            disabled={loading}
          />
          <Button type="submit" size="sm" disabled={!input.trim() || loading}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
