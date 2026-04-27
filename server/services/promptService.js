function formatItem(item) {
  const createdAt = item.createdAt
    ? new Date(item.createdAt).toISOString()
    : "unknown";
  const updatedAt = item.updatedAt
    ? new Date(item.updatedAt).toISOString()
    : "unknown";

  return [
    `- ID: ${item._id}`,
    `  Name: ${item.name}`,
    `  Category: ${item.category || "General"}`,
    `  Description: ${item.description || "No description provided."}`,
    `  Created At: ${createdAt}`,
    `  Updated At: ${updatedAt}`,
  ].join("\n");
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
        `${index + 1}. ${entry.role.toUpperCase()}: ${entry.content.trim()}`
    )
    .join("\n");
}

function buildPrompt({ message, items, history }) {
  const itemList =
    items.length > 0
      ? items.map((item) => formatItem(item)).join("\n\n")
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

module.exports = { buildPrompt };
