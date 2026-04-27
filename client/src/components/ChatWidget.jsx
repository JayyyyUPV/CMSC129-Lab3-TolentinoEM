import React, { useEffect, useRef, useState } from "react";
import { sendChatMessage } from "../services/chatService";

const STARTER_MESSAGES = [
  {
    role: "assistant",
    content:
      'Hi! I can answer questions about your items and also create, update, or delete them through chat. For update and delete requests, I will always ask for a "yes" confirmation first.',
  },
];

const SUGGESTED_QUERIES = [
  "What items do I currently have?",
  "How many categories are there?",
  "Add a new item called Planner Pad in Office with description Daily schedule notebook.",
  "Update the Graph Notebook description to Grid pages for math exercises.",
  "Delete the Mini Whiteboard item.",
];

function ChatWidget({ onItemsChanged }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(STARTER_MESSAGES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
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
      const response = await sendChatMessage({
        message: trimmedMessage,
        history,
        pendingAction,
      });

      setMessages((currentMessages) => [
        ...currentMessages,
        { role: "assistant", content: response.reply },
      ]);
      setPendingAction(response.pendingAction || null);

      if (response.dataChanged && onItemsChanged) {
        await onItemsChanged();
      }
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
        <section className="chat-panel" aria-label="Item assistant">
          <div className="chat-panel__header">
            <div>
              <p className="chat-panel__eyebrow">Gemini Assistant</p>
              <h2>Ask, create, update, or delete</h2>
            </div>
            <button
              type="button"
              className="chat-panel__close"
              onClick={() => setIsOpen(false)}
              aria-label="Close assistant"
            >
              x
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
                  <p>Thinking through your item data and available actions...</p>
                </article>
              ) : null}

              <div ref={bottomRef} />
            </div>
          </div>

          <form className="chat-panel__form" onSubmit={handleSubmit}>
            {error ? <p className="chat-error">{error}</p> : null}
            {pendingAction ? (
              <p className="chat-error">
                Pending {pendingAction.type} request. Reply "yes" to continue or
                "cancel" to stop.
              </p>
            ) : null}

            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about items or request a CRUD action..."
              rows={3}
              disabled={isLoading}
            />

            <div className="chat-panel__actions">
              <span>Context stays in this session, including pending confirmations.</span>
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
        {isOpen ? "Hide assistant" : "Open AI assistant"}
      </button>
    </div>
  );
}

export default ChatWidget;
