import React, { useEffect, useRef, useState } from "react";
import { sendChatMessage } from "../services/chatService";

const STARTER_MESSAGES = [
  {
    role: "assistant",
    content:
      "Hi! I can answer questions about the items in this app. Ask me to list items, count categories, find the newest entry, or search by keyword.",
  },
];

const SUGGESTED_QUERIES = [
  "What items do I currently have?",
  "How many categories are there?",
  "Which item was added first?",
  "Show items related to study or office work.",
];

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(STARTER_MESSAGES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isOpen]);

  const handleSend = async (rawMessage) => {
    const trimmedMessage = rawMessage.trim();

    if (!trimmedMessage || isLoading) {
      return;
    }

    const history = messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .slice(-10)
      .map(({ role, content }) => ({ role, content }));

    setMessages((currentMessages) => [
      ...currentMessages,
      { role: "user", content: trimmedMessage },
    ]);
    setInput("");
    setError("");
    setIsLoading(true);

    try {
      const reply = await sendChatMessage({
        message: trimmedMessage,
        history,
      });

      setMessages((currentMessages) => [
        ...currentMessages,
        { role: "assistant", content: reply },
      ]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await handleSend(input);
  };

  return (
    <div className={`chat-widget ${isOpen ? "chat-widget--open" : ""}`}>
      {isOpen ? (
        <section className="chat-panel" aria-label="Item chatbot">
          <div className="chat-panel__header">
            <div>
              <p className="chat-panel__eyebrow">Gemini Chatbot</p>
              <h2>Ask about your items</h2>
            </div>
            <button
              type="button"
              className="chat-panel__close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chatbot"
            >
              ×
            </button>
          </div>

          <div className="chat-panel__body">
            <div className="chat-suggestions">
              {SUGGESTED_QUERIES.map((query) => (
                <button
                  key={query}
                  type="button"
                  className="chat-suggestion"
                  onClick={() => handleSend(query)}
                  disabled={isLoading}
                >
                  {query}
                </button>
              ))}
            </div>

            <div className="chat-messages">
              {messages.map((message, index) => (
                <article
                  key={`${message.role}-${index}`}
                  className={`chat-bubble chat-bubble--${message.role}`}
                >
                  <span className="chat-bubble__role">
                    {message.role === "assistant" ? "AI" : "You"}
                  </span>
                  <p>{message.content}</p>
                </article>
              ))}

              {isLoading ? (
                <article className="chat-bubble chat-bubble--assistant">
                  <span className="chat-bubble__role">AI</span>
                  <p>Thinking through your item data...</p>
                </article>
              ) : null}

              <div ref={bottomRef} />
            </div>
          </div>

          <form className="chat-panel__form" onSubmit={handleSubmit}>
            {error ? <p className="chat-error">{error}</p> : null}

            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about your current items..."
              rows={3}
              disabled={isLoading}
            />

            <div className="chat-panel__actions">
              <span>Context is kept for the current session.</span>
              <button type="submit" disabled={isLoading || !input.trim()}>
                Send
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        className="chat-toggle"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? "Hide chat" : "Open AI chat"}
      </button>
    </div>
  );
}

export default ChatWidget;
