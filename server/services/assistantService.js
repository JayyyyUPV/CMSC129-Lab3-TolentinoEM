const Item = require("../models/Item");
const { generateJsonResponse, generateResponse } = require("./aiService");
const { buildDirectAnswer } = require("./queryService");
const {
  buildAssistantPlanningPrompt,
  buildPrompt,
} = require("./promptService");
const {
  createItemFromPlan,
  executePendingAction,
  prepareDeleteAction,
  prepareUpdateAction,
  sanitizeChanges,
  sanitizeCreateData,
  sanitizeTargetIds,
} = require("./functionService");

const CONFIRM_PATTERN =
  /^(yes|y|confirm|confirmed|go ahead|do it|proceed|sure|okay|ok)$/i;
const CANCEL_PATTERN =
  /^(no|n|cancel|stop|abort|never mind|nevermind)$/i;
const CREATE_ACTION_PATTERN = /\b(add|create|insert|save)\b/i;
const DELETE_ACTION_PATTERN = /\b(delete|remove|erase)\b/i;
const UPDATE_ACTION_PATTERN = /\b(update|rename|edit|modify)\b/i;
const FIELD_CHANGE_PATTERN =
  /\b(change|set)\b.*\b(name|category|description)\b|\bmove\b.*\bcategory\b/i;
const CRUD_CLARIFICATION_PATTERN =
  /i need a bit more detail before i can do that|i know which item to update, but i still need the new value|i could not tell which item you want to (?:update|delete)|tell me the item name or the exact change you want|mention the item name or ask me to list matching items first|mention the exact item name or narrow the request first/i;

function normalizePlan(rawPlan) {
  const mode = ["answer", "create", "update", "delete", "clarify"].includes(
    rawPlan?.mode
  )
    ? rawPlan.mode
    : "answer";

  return {
    mode,
    reason:
      typeof rawPlan?.reason === "string" ? rawPlan.reason.trim() : "",
    targetItemIds: sanitizeTargetIds(rawPlan?.targetItemIds),
    createData: sanitizeCreateData(rawPlan?.createData),
    changes: sanitizeChanges(rawPlan?.changes),
    clarificationQuestion:
      typeof rawPlan?.clarificationQuestion === "string"
        ? rawPlan.clarificationQuestion.trim()
        : "",
  };
}

async function buildAssistantPlan({ message, history, items }) {
  try {
    const rawPlan = await generateJsonResponse(
      buildAssistantPlanningPrompt({
        message,
        items,
        history,
      })
    );

    return normalizePlan(rawPlan);
  } catch (error) {
    if (error.code === "INVALID_JSON_RESPONSE") {
      return {
        mode: "answer",
        reason: "Fallback to normal answer because the planner JSON was invalid.",
        targetItemIds: [],
        createData: sanitizeCreateData(null),
        changes: {},
        clarificationQuestion: "",
      };
    }

    throw error;
  }
}

function isConfirmationMessage(message) {
  return CONFIRM_PATTERN.test(message.trim());
}

function isCancellationMessage(message) {
  return CANCEL_PATTERN.test(message.trim());
}

function getLastAssistantMessage(history) {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index]?.role === "assistant") {
      return history[index].content || "";
    }
  }

  return "";
}

function shouldBuildActionPlan({ message, history }) {
  const trimmedMessage = message.trim();

  if (
    CREATE_ACTION_PATTERN.test(trimmedMessage) ||
    DELETE_ACTION_PATTERN.test(trimmedMessage) ||
    UPDATE_ACTION_PATTERN.test(trimmedMessage) ||
    FIELD_CHANGE_PATTERN.test(trimmedMessage)
  ) {
    return true;
  }

  return CRUD_CLARIFICATION_PATTERN.test(getLastAssistantMessage(history));
}

async function fetchActiveItems(selectedFields) {
  return Item.find({ deleted: false })
    .select(selectedFields)
    .sort({ createdAt: 1 })
    .lean();
}

async function handlePendingActionMessage({ message, pendingAction }) {
  if (isConfirmationMessage(message)) {
    const result = await executePendingAction(pendingAction);
    return {
      ...result,
      pendingAction: null,
    };
  }

  if (isCancellationMessage(message)) {
    return {
      reply: "Cancelled the pending action. Nothing was changed.",
      pendingAction: null,
      dataChanged: false,
    };
  }

  const actionName = pendingAction.type === "delete" ? "delete" : "update";

  return {
    reply: `A ${actionName} request is still waiting for confirmation. Reply "yes" to continue or "cancel" to stop.`,
    pendingAction,
    dataChanged: false,
  };
}

async function answerWithChatbot({ message, history, items }) {
  const reply = await generateResponse(
    buildPrompt({
      message,
      items,
      history,
    })
  );

  return {
    reply,
    pendingAction: null,
    dataChanged: false,
  };
}

async function handleAssistantMessage({ message, history, pendingAction }) {
  if (pendingAction) {
    return handlePendingActionMessage({
      message,
      pendingAction,
    });
  }

  const shouldPlanAction = shouldBuildActionPlan({
    message,
    history,
  });

  if (!shouldPlanAction) {
    const answerItems = await fetchActiveItems(
      "_id name category description createdAt updatedAt"
    );
    const directReply = buildDirectAnswer({
      message,
      items: answerItems,
    });

    if (directReply) {
      return {
        reply: directReply,
        pendingAction: null,
        dataChanged: false,
      };
    }

    return answerWithChatbot({
      message,
      history,
      items: answerItems,
    });
  }

  const planningItems = await fetchActiveItems("_id name category description");

  const plan = await buildAssistantPlan({
    message,
    history,
    items: planningItems,
  });

  if (plan.mode === "create") {
    return {
      ...(await createItemFromPlan(plan.createData)),
      pendingAction: null,
    };
  }

  if (plan.mode === "update") {
    const prepared = prepareUpdateAction({
      items: planningItems,
      targetItemIds: plan.targetItemIds,
      changes: plan.changes,
    });

    return {
      reply: prepared.reply,
      pendingAction: prepared.pendingAction,
      dataChanged: false,
    };
  }

  if (plan.mode === "delete") {
    const prepared = prepareDeleteAction({
      items: planningItems,
      targetItemIds: plan.targetItemIds,
    });

    return {
      reply: prepared.reply,
      pendingAction: prepared.pendingAction,
      dataChanged: false,
    };
  }

  if (plan.mode === "clarify") {
    return {
      reply:
        plan.clarificationQuestion ||
        "I need a bit more detail before I can do that. Tell me the item name or the exact change you want.",
      pendingAction: null,
      dataChanged: false,
    };
  }

  const answerItems = await fetchActiveItems(
    "_id name category description createdAt updatedAt"
  );

  return answerWithChatbot({
    message,
    history,
    items: answerItems,
  });
}

module.exports = {
  handleAssistantMessage,
};
