"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
import { SendIcon } from "@/components/ui/icons";
import { getTeam } from "@/lib/storage/local";
import { cn } from "@/lib/cn";
import type { Mystery, DetectiveChatMessage } from "@/types";

interface DetectiveChatProps {
  mystery: Mystery;
  onClose: () => void;
}

const SUGGESTED_QUESTIONS = [
  "Which evidence should we review?",
  "Do any alibis conflict?",
  "What is easy to overlook here?",
  "What should we compare next?",
];

export function DetectiveChat({ mystery, onClose }: DetectiveChatProps) {
  const [messages, setMessages] = useState<DetectiveChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(question: string) {
    if (!question.trim() || loading) return;

    const playerMessage: DetectiveChatMessage = {
      role: "player",
      content: question,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, playerMessage]);
    setInput("");
    setLoading(true);

    try {
      const history = messages
        .slice(-6)
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");
      const team = getTeam();

      const res = await fetch("/api/ai/detective-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          mysteryId: mystery.id,
          conversationHistory: history,
          sessionId: team?.id ? `${team.id}_${mystery.id}` : undefined,
        }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "detective",
          content: data.response,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "detective",
          content: "I cannot be reached right now. Try me again in a moment.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet
      title="Ask the detective"
      onClose={onClose}
      footer={
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage(input);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about evidence, alibis, anything…"
            aria-label="Your question"
            disabled={loading}
            className={cn(
              "min-h-11 flex-1 rounded border border-border-dark bg-ink-800 px-3 py-2",
              "text-base text-text-primary placeholder:text-text-muted",
              "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40",
              "disabled:opacity-50"
            )}
          />
          <Button
            type="submit"
            aria-label="Send"
            disabled={!input.trim() || loading}
            className="w-11 shrink-0 px-0"
          >
            <SendIcon className="h-4 w-4" />
          </Button>
        </form>
      }
    >
      <div className="space-y-3">
        {messages.length === 0 && (
          <div className="space-y-3">
            <Card>
              <p className="text-[15px] leading-relaxed text-text-secondary">
                I have read the same file you have. Ask me what to look at
                next — I will point, but I will not hand you the answer.
              </p>
            </Card>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => void sendMessage(question)}
                  disabled={loading}
                  className={cn(
                    "min-h-11 rounded-full border border-border-mid px-4 py-2",
                    "text-xs text-text-secondary transition-colors",
                    "hover:border-accent/60 hover:text-text-primary",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={`${message.timestamp}-${index}`}
            className={cn(
              "flex",
              message.role === "player" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-[15px] leading-relaxed",
                message.role === "player"
                  ? "bg-accent/20 text-text-primary"
                  : "bg-ink-700 text-text-secondary"
              )}
            >
              {message.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div
              className="flex gap-1.5 rounded-lg bg-ink-700 px-3 py-3"
              role="status"
              aria-label="The detective is thinking"
            >
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-text-muted"
                  style={{ animationDelay: `${dot * 160}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>
    </Sheet>
  );
}
