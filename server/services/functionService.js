const Item = require("../models/Item");

const EDITABLE_FIELDS = ["name", "category", "description"];

function toTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function pluralize(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

function sanitizeTargetIds(targetIds) {
  if (!Array.isArray(targetIds)) {
    return [];
  }

  return [...new Set(targetIds.map((id) => toTrimmedString(id)).filter(Boolean))];
}

function sanitizeCreateData(createData) {
  return {
    name: toTrimmedString(createData?.name),
    category: toTrimmedString(createData?.category) || "General",
    description: toTrimmedString(createData?.description),
  };
}

function sanitizeChanges(changes) {
  return EDITABLE_FIELDS.reduce((accumulator, field) => {
    const value = toTrimmedString(changes?.[field]);

    if (value) {
      accumulator[field] = value;
    }

    return accumulator;
  }, {});
}

function sanitizePendingAction(pendingAction) {
  if (!pendingAction || !["update", "delete"].includes(pendingAction.type)) {
    return null;
  }

  const targetIds = sanitizeTargetIds(pendingAction.targetIds);

  if (targetIds.length === 0) {
    return null;
  }

  const sanitized = {
    type: pendingAction.type,
    targetIds,
    targetNames: Array.isArray(pendingAction.targetNames)
      ? pendingAction.targetNames.map((name) => toTrimmedString(name)).filter(Boolean)
      : [],
  };

  if (pendingAction.type === "update") {
    const changes = sanitizeChanges(pendingAction.changes);

    if (Object.keys(changes).length === 0) {
      return null;
    }

    sanitized.changes = changes;
  }

  return sanitized;
}

function formatItemLabel(item) {
  const category = item.category || "General";
  return `${item.name} (${category})`;
}

function formatItemDetails(item) {
  return [
    `- ${item.name}`,
    `  Category: ${item.category || "General"}`,
    `  Description: ${item.description || "No description provided."}`,
  ].join("\n");
}

function formatNameList(items) {
  return items.map((item) => `"${item.name}"`).join(", ");
}

function matchItemsByIds(items, targetIds) {
  const targetSet = new Set(targetIds.map((id) => String(id)));
  return items.filter((item) => targetSet.has(String(item._id)));
}

function buildUpdateChangeSummary(changes) {
  return Object.entries(changes)
    .map(([field, value]) => `${field}: ${value}`)
    .join(", ");
}

function prepareUpdateAction({ items, targetItemIds, changes }) {
  const matchedItems = matchItemsByIds(items, sanitizeTargetIds(targetItemIds));
  const sanitizedChanges = sanitizeChanges(changes);

  if (matchedItems.length === 0) {
    return {
      reply:
        "I could not tell which item you want to update. Mention the item name or ask me to list matching items first.",
      pendingAction: null,
    };
  }

  if (Object.keys(sanitizedChanges).length === 0) {
    return {
      reply:
        "I know which item to update, but I still need the new value. Tell me what you want to change.",
      pendingAction: null,
    };
  }

  const actionLabel = `update ${matchedItems.length} ${pluralize(
    matchedItems.length,
    "item"
  )}`;

  return {
    reply: [
      `I can ${actionLabel}: ${formatNameList(matchedItems)}.`,
      `Planned changes: ${buildUpdateChangeSummary(sanitizedChanges)}.`,
      'Reply "yes" to continue or "cancel" to stop.',
    ].join("\n"),
    pendingAction: {
      type: "update",
      targetIds: matchedItems.map((item) => String(item._id)),
      targetNames: matchedItems.map((item) => item.name),
      changes: sanitizedChanges,
    },
  };
}

function prepareDeleteAction({ items, targetItemIds }) {
  const matchedItems = matchItemsByIds(items, sanitizeTargetIds(targetItemIds));

  if (matchedItems.length === 0) {
    return {
      reply:
        "I could not tell which item you want to delete. Mention the exact item name or narrow the request first.",
      pendingAction: null,
    };
  }

  return {
    reply: [
      `I can remove ${matchedItems.length} ${pluralize(
        matchedItems.length,
        "item"
      )} from the active list: ${formatNameList(matchedItems)}.`,
      'Reply "yes" to continue or "cancel" to stop.',
    ].join("\n"),
    pendingAction: {
      type: "delete",
      targetIds: matchedItems.map((item) => String(item._id)),
      targetNames: matchedItems.map((item) => item.name),
    },
  };
}

async function createItemFromPlan(createData) {
  const sanitized = sanitizeCreateData(createData);

  if (!sanitized.name) {
    return {
      reply:
        "I need an item name before I can create a new record. Tell me the name and I can try again.",
      dataChanged: false,
    };
  }

  const createdItem = await Item.create(sanitized);

  return {
    reply: [
      "Created a new item successfully:",
      formatItemDetails(createdItem),
    ].join("\n"),
    dataChanged: true,
  };
}

async function executeUpdateAction(pendingAction) {
  const sanitized = sanitizePendingAction(pendingAction);

  if (!sanitized) {
    return {
      reply:
        "The pending update request is no longer valid. Please send the update command again.",
      dataChanged: false,
    };
  }

  const existingItems = await Item.find({
    _id: { $in: sanitized.targetIds },
    deleted: false,
  })
    .sort({ createdAt: 1 })
    .lean();

  if (existingItems.length === 0) {
    return {
      reply:
        "I could not find those items anymore, so nothing was updated. Please refresh the page and try again.",
      dataChanged: false,
    };
  }

  await Item.updateMany(
    {
      _id: { $in: sanitized.targetIds },
      deleted: false,
    },
    { $set: sanitized.changes }
  );

  const updatedItems = await Item.find({
    _id: { $in: sanitized.targetIds },
    deleted: false,
  })
    .sort({ createdAt: 1 })
    .lean();

  return {
    reply: [
      `Updated ${updatedItems.length} ${pluralize(updatedItems.length, "item")}:`,
      updatedItems.map((item) => formatItemDetails(item)).join("\n"),
    ].join("\n"),
    dataChanged: true,
  };
}

async function executeDeleteAction(pendingAction) {
  const sanitized = sanitizePendingAction(pendingAction);

  if (!sanitized) {
    return {
      reply:
        "The pending delete request is no longer valid. Please send the delete command again.",
      dataChanged: false,
    };
  }

  const existingItems = await Item.find({
    _id: { $in: sanitized.targetIds },
    deleted: false,
  })
    .sort({ createdAt: 1 })
    .lean();

  if (existingItems.length === 0) {
    return {
      reply:
        "I could not find those items anymore, so nothing was deleted. Please refresh the page and try again.",
      dataChanged: false,
    };
  }

  await Item.updateMany(
    {
      _id: { $in: sanitized.targetIds },
      deleted: false,
    },
    { $set: { deleted: true } }
  );

  return {
    reply: [
      `Removed ${existingItems.length} ${pluralize(
        existingItems.length,
        "item"
      )} from the active list:`,
      existingItems.map((item) => `- ${formatItemLabel(item)}`).join("\n"),
    ].join("\n"),
    dataChanged: true,
  };
}

async function executePendingAction(pendingAction) {
  const sanitized = sanitizePendingAction(pendingAction);

  if (!sanitized) {
    return {
      reply:
        "That pending action is no longer valid. Please send the request again so I can re-check it.",
      dataChanged: false,
    };
  }

  if (sanitized.type === "update") {
    return executeUpdateAction(sanitized);
  }

  return executeDeleteAction(sanitized);
}

module.exports = {
  createItemFromPlan,
  executePendingAction,
  prepareDeleteAction,
  prepareUpdateAction,
  sanitizeChanges,
  sanitizeCreateData,
  sanitizePendingAction,
  sanitizeTargetIds,
};
