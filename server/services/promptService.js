function compactText(value, fallback) {
  const text =
    typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return text || fallback;
}

function formatItem(item) {
  const createdAt = item.createdAt
    ? new Date(item.createdAt).toISOString()
    : "unknown";
  const updatedAt = item.updatedAt
    ? new Date(item.updatedAt).toISOString()
    : "unknown";

  return `- id=${item._id} | name=${compactText(
    item.name,
    "Unnamed item"
  )} | category=${compactText(
    item.category,
    "General"
  )} | description=${compactText(
    item.description,
    "No description provided."
  )} | createdAt=${createdAt} | updatedAt=${updatedAt}`;
}

function formatPlanningItem(item) {
  return `- id=${item._id} | name=${compactText(
    item.name,
    "Unnamed item"
  )} | category=${compactText(
    item.category,
    "General"
  )} | description=${compactText(
    item.description,
    "No description provided."
  )}`;
}

function buildCategorySummary(items) {
  const counts = items.reduce((summary, item) => {
    const category = item.category || "General";
    summary[category] = (summary[category] || 0) + 1;
    return summary;
  }, {});

  if (Object.keys(counts).length === 0) {
    return "No categories available.";
  }

  return Object.entries(counts)
    .map(([category, count]) => `${category}: ${count}`)
    .join(", ");
}

function buildConversationHistory(history) {
  if (!history.length) {
    return "No previous conversation yet.";
  }

  return history
    .map(
      (entry, index) =>
        `${index + 1}. ${entry.role}: ${entry.content.trim()}`
    )
    .join("\n");
}

function buildPrompt({ message, items, history }) {
  const itemList =
    items.length > 0
      ? items.map((item) => formatItem(item)).join("\n")
      : "No active items are currently stored in the database.";

  return `
You are a helpful AI chatbot for a CRUD inventory-style web application.

Your job:
- Answer questions using ONLY the application data provided below.
- Be conversational, clear, and concise.
- If the user asks a follow-up question, use the conversation history to resolve pronouns or references.
- If the answer cannot be determined from the provided data, say so honestly and suggest what the user can ask instead.
- Never invent prices, dates, categories, or item details that are not in the data.
- Keep responses short enough for a chat widget, but still helpful.

The available item fields are:
- name
- description
- category
- createdAt
- updatedAt

Application data summary:
- Active item count: ${items.length}
- Category breakdown: ${buildCategorySummary(items)}

Current active items:
${itemList}

Recent conversation history:
${buildConversationHistory(history)}

Latest user question:
${message.trim()}

Answer the user's latest question based on the application data.
  `.trim();
}

function buildAssistantPlanningPrompt({ message, items, history }) {
  const itemList =
    items.length > 0
      ? items.map((item) => formatPlanningItem(item)).join("\n")
      : "No active items are currently stored in the database.";

  return `
You are the planning layer for an AI assistant in a CRUD item-tracking web application.

Your job:
- Read the latest user message, the recent conversation history, and the current item data.
- Decide whether the user wants a normal data answer, a CREATE action, an UPDATE action, a DELETE action, or a clarification question.
- Use the conversation history to resolve pronouns and references like "it", "that one", "those", or "the last item".
- For UPDATE and DELETE requests, only reference item IDs that appear in the current active item list below.
- If the user request is missing required details or the target item is unclear, return "clarify".
- Never invent item IDs, names, categories, or descriptions that are not supported by the data or the user's latest message.

Return ONLY valid JSON using this exact shape:
{
  "mode": "answer" | "create" | "update" | "delete" | "clarify",
  "reason": "short explanation",
  "targetItemIds": ["existing item id"],
  "createData": {
    "name": "",
    "category": "",
    "description": ""
  },
  "changes": {
    "name": null,
    "category": null,
    "description": null
  },
  "clarificationQuestion": ""
}

Rules for each mode:
- "answer": Use when the user is asking a question, summary, count, comparison, or search request without changing stored data.
- "create": Use when the user clearly wants to add a new record.
- "update": Use when the user wants to change an existing record.
- "delete": Use when the user wants to remove one or more existing records.
- "clarify": Use when the request is too ambiguous or incomplete to execute safely.

Additional rules:
- For "create", fill in createData. If category is not given, use "General". If description is not given, use an empty string.
- For "update", include every matching target ID that should receive the same changes.
- For "delete", include every matching target ID that should be removed.
- For "update", set only the fields that should change. Leave untouched fields as null.
- If the user references a previous assistant result, use the conversation history to infer the intended target item IDs.

Current active items:
${itemList}

Recent conversation history:
${buildConversationHistory(history)}

Latest user message:
${message.trim()}
  `.trim();
}

module.exports = {
  buildAssistantPlanningPrompt,
  buildCategorySummary,
  buildConversationHistory,
  buildPrompt,
  formatItem,
};
