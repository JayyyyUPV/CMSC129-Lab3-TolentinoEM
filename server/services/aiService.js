const { GoogleGenerativeAI } = require("@google/generative-ai");

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const DEFAULT_PLANNER_MODEL =
  process.env.GEMINI_PLANNER_MODEL || "gemini-2.5-flash-lite";
const DEFAULT_BACKUP_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite-preview",
  "gemini-2.5-flash-lite",
  "gemma-3-1b-it",
  "gemini-1.5-flash",
];
let genAIClient = null;

function getGenAIClient() {
  if (!genAIClient) {
    genAIClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  return genAIClient;
}

function buildAiError(error, context = {}) {
  const message = error?.message || "Unknown AI error";
  const wrappedError = new Error(message);
  const attemptedModels = Array.isArray(context.attemptedModels)
    ? context.attemptedModels.filter(Boolean)
    : [];
  const primaryModel = context.primaryModel || DEFAULT_MODEL;

  wrappedError.statusCode = 500;
  wrappedError.publicMessage = "AI failed";
  wrappedError.attemptedModels = attemptedModels;

  if (
    message.includes("403") ||
    message.includes("PERMISSION_DENIED") ||
    message.includes("unregistered callers") ||
    message.includes("API Key")
  ) {
    wrappedError.statusCode = 403;
    wrappedError.publicMessage =
      "Gemini API key was rejected. Check that the key is valid, the Gemini/Generative Language API is enabled for that Google project, and the key's API restrictions allow this API.";
    return wrappedError;
  }

  if (
    message.includes("404") ||
    message.includes("NOT_FOUND") ||
    message.includes("is not found for API version") ||
    message.includes("Call ListModels")
  ) {
    wrappedError.statusCode = 404;
    wrappedError.publicMessage =
      `Gemini model "${primaryModel}" is not available for generateContent. Use a currently supported model or list available models for this API key.`;
    return wrappedError;
  }

  if (
    message.includes("503") ||
    message.includes("Service Unavailable") ||
    message.includes("high demand")
  ) {
    wrappedError.statusCode = 503;
    wrappedError.publicMessage =
      "Gemini is temporarily under heavy load right now. Please try again in a moment.";

    const retryMatch = message.match(/retry in ([\d.]+)s/i);
    if (retryMatch) {
      wrappedError.retryAfterSeconds = Math.ceil(Number(retryMatch[1]));
    }

    return wrappedError;
  }

  if (message.includes("429") || message.includes("Quota exceeded")) {
    wrappedError.statusCode = 429;
    wrappedError.publicMessage =
      "Gemini API quota exceeded. Check your API plan/billing or try again later.";

    const retryMatch = message.match(/Please retry in ([\d.]+)s/i);
    if (retryMatch) {
      wrappedError.retryAfterSeconds = Math.ceil(Number(retryMatch[1]));
    }
  }

  return wrappedError;
}

function parseBackupModels(value) {
  if (!value || typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
}

function getModelFallbackChain(preferredModel = DEFAULT_MODEL) {
  const configuredBackupModels = parseBackupModels(process.env.GEMINI_BACKUP_MODELS);
  const backupModels =
    configuredBackupModels.length > 0 ? configuredBackupModels : DEFAULT_BACKUP_MODELS;

  return [...new Set([preferredModel, DEFAULT_MODEL, ...backupModels].filter(Boolean))];
}

function shouldTryFallback(error) {
  const message = error?.message || "";

  return (
    message.includes("429") ||
    message.includes("Quota exceeded") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("503") ||
    message.includes("Service Unavailable") ||
    message.includes("high demand") ||
    message.includes("UNAVAILABLE") ||
    message.includes("fetch failed") ||
    message.includes("EAI_AGAIN") ||
    message.includes("ETIMEDOUT")
  );
}

function buildRequest(prompt, responseMimeType) {
  const request =
    typeof prompt === "string"
      ? {
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
        }
      : { ...prompt };

  if (responseMimeType) {
    request.generationConfig = {
      ...(request.generationConfig || {}),
      responseMimeType,
    };
  }

  return request;
}

function parseJsonResponse(text) {
  try {
    return JSON.parse(text);
  } catch (directError) {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);

    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (nestedError) {
        // Fall through to the explicit invalid JSON error below.
      }
    }
  }

  const error = new Error("Model did not return valid JSON.");
  error.code = "INVALID_JSON_RESPONSE";
  throw error;
}

async function runModel(prompt, options = {}) {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error("GEMINI_API_KEY is missing");
    error.statusCode = 500;
    error.publicMessage = "AI service is not configured.";
    throw error;
  }

  const genAI = getGenAIClient();
  const primaryModel = options.preferredModel || DEFAULT_MODEL;
  const modelChain = getModelFallbackChain(primaryModel);
  const attemptedModels = [];
  let lastError = null;

  for (const modelName of modelChain) {
    attemptedModels.push(modelName);

    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
      });
      const result = await model.generateContent(
        buildRequest(prompt, options.responseMimeType)
      );
      const response = await result.response;
      const text = response.text().trim();

      if (attemptedModels.length > 1) {
        console.warn(
          `Primary Gemini model failed. Recovered using backup model: ${modelName}`
        );
      }

      return text;
    } catch (error) {
      lastError = error;

      if (error.code === "INVALID_JSON_RESPONSE") {
        throw error;
      }

      if (!shouldTryFallback(error) || modelName === modelChain[modelChain.length - 1]) {
        throw buildAiError(error, { attemptedModels, primaryModel });
      }

      console.warn(
        `Gemini model ${modelName} failed with a retryable error. Trying next backup model.`
      );
    }
  }

  throw buildAiError(lastError, { attemptedModels, primaryModel });
}

async function generateResponse(prompt) {
  const text = await runModel(prompt);

  return text || "I could not find a useful answer from the current item data.";
}

async function generateJsonResponse(prompt) {
  const text = await runModel(prompt, {
    preferredModel: DEFAULT_PLANNER_MODEL,
    responseMimeType: "application/json",
  });

  return parseJsonResponse(text);
}

module.exports = { generateJsonResponse, generateResponse };
