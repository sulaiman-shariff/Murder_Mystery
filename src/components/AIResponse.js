import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { optimizedAPI } from "../utils/apiOptimizer";

function AIResponse({ mysteryId }) {
  const [question, setQuestion] = useState("");
  
  // Memoize team name to prevent localStorage access on every render
  const teamName = useMemo(() => localStorage.getItem('teamName') || 'Unknown Team', []);
  
  // Memoize initial chat state to prevent recreation
  const initialChat = useMemo(() => [{
    sender: "ai",
    text: "Hello, Detective! Ask me anything about this case and I'll guide you with subtle hints."
  }], []);
  
  const [chat, setChat] = useState(initialChat);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const chatHistoryRef = useRef(null);

  useEffect(() => {
    // Scroll to the latest message within the chat history only
    if (chatEndRef.current && chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chat]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const currentQuestion = question;
    setQuestion("");

    setChat((prev) => [...prev, { sender: "user", text: currentQuestion }]);
    setLoading(true);

    try {
      const res = await optimizedAPI.sendAIChat(currentQuestion, mysteryId, teamName);
      const aiResponse = res.response || "No response received.";
      setChat((prev) => [...prev, { sender: "ai", text: aiResponse }]);
    } catch (error) {
      setChat((prev) => [...prev, { sender: "ai", text: "Error fetching response. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }, [question, mysteryId, teamName]);

  // Debounce input changes to prevent excessive re-renders
  const handleInputChange = useCallback((e) => {
    setQuestion(e.target.value);
  }, []);

  // Memoize submit button state
  const isSubmitDisabled = useMemo(() => 
    loading || !question.trim(), 
    [loading, question]
  );

  return (
    <div className="ai-chat-container">
      <div className="ai-chat-history" ref={chatHistoryRef}>
        {chat.map((msg, idx) => (
          <div
            key={idx}
            className={`ai-bubble ${msg.sender === "ai" ? "ai-bubble-ai" : "ai-bubble-user"}`}
          >
            {msg.sender === "ai" ? (
              <span className="ai-avatar" title="Detective AI">🕵️‍♂️</span>
            ) : (
              <span className="user-avatar" title="You">🧑</span>
            )}
            <span className="ai-bubble-text">{msg.text}</span>
          </div>
        ))}
        {loading && (
          <div className="ai-bubble ai-bubble-ai">
            <span className="ai-avatar" title="Detective AI">🕵️‍♂️</span>
            <span className="ai-bubble-text">Detective is thinking...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <form className="ai-chat-input-area" onSubmit={handleSubmit}>
        <input
          className="ai-chat-input"
          type="text"
          value={question}
          onChange={handleInputChange}
          placeholder="Ask the AI detective..."
          disabled={loading}
        />
        <button className="ai-chat-submit" type="submit" disabled={isSubmitDisabled}>
          Send
        </button>
      </form>
    </div>
  );
}

export default AIResponse;
