const express = require("express");
const { handleAssistantMessage } = require("../services/assistantService");
const { sanitizePendingAction } = require("../services/functionService");

const router = express.Router();

function normalizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter(
      (entry) =>
        entry &&
        (entry.role === "user" || entry.role === "assistant") &&
        typeof entry.content === "string" &&
        entry.content.trim()
    )
    .slice(-10)
    .map((entry) => ({
      role: entry.role,
      content: entry.content.trim(),
    }));
}

router.post("/", async (req, res) => {
  try {
    const { message, history, pendingAction } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const safeHistory = normalizeHistory(history);
    const safePendingAction = sanitizePendingAction(pendingAction);

    console.log("Incoming message:", message.trim());

    const result = await handleAssistantMessage({
      message,
      history: safeHistory,
      pendingAction: safePendingAction,
    });

    console.log("AI reply:", result.reply);

    res.json({
      reply: result.reply,
      pendingAction: result.pendingAction || null,
      dataChanged: Boolean(result.dataChanged),
    });
  } catch (err) {
    console.error("FULL ERROR:");
    console.error(err);

    if (err.retryAfterSeconds) {
      res.set("Retry-After", String(err.retryAfterSeconds));
    }

    res.status(err.statusCode || 500).json({
      error: err.publicMessage || "AI failed",
      retryAfterSeconds: err.retryAfterSeconds || null,
    });
  }
});

module.exports = router;
