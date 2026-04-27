const Item = require("../models/Item");
const { generateJsonResponse, generateResponse } = require("./aiService");
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

  const items = await Item.find({ deleted: false })
    .sort({ createdAt: 1 })
    .lean();

  const plan = await buildAssistantPlan({
    message,
    history,
    items,
  });

  if (plan.mode === "create") {
    return {
      ...(await createItemFromPlan(plan.createData)),
      pendingAction: null,
    };
  }

  if (plan.mode === "update") {
    const prepared = prepareUpdateAction({
      items,
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
      items,
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

  return answerWithChatbot({
    message,
    history,
    items,
  });
}

module.exports = {
  handleAssistantMessage,
};
