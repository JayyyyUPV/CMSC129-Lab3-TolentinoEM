const express = require("express");
const Item = require("../models/Item");
const { generateResponse } = require("../services/aiService");
const { buildPrompt } = require("../services/promptService");

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
    const { message, history } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const safeHistory = normalizeHistory(history);
    const items = await Item.find({ deleted: false })
      .sort({ createdAt: 1 })
      .lean();
    const prompt = buildPrompt({
      message,
      items,
      history: safeHistory,
    });

    console.log("Incoming message:", message.trim());

    const reply = await generateResponse(prompt);

    console.log("AI reply:", reply);

    res.json({ reply });
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
