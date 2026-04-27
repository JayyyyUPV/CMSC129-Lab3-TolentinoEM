const { GoogleGenerativeAI } = require("@google/generative-ai");

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function buildAiError(error) {
  const message = error?.message || "Unknown AI error";
  const wrappedError = new Error(message);

  wrappedError.statusCode = 500;
  wrappedError.publicMessage = "AI failed";

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
      `Gemini model "${DEFAULT_MODEL}" is not available for generateContent. Use a currently supported model or list available models for this API key.`;
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

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: DEFAULT_MODEL,
    });
    const result = await model.generateContent(
      buildRequest(prompt, options.responseMimeType)
    );
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    if (error.code === "INVALID_JSON_RESPONSE") {
      throw error;
    }

    throw buildAiError(error);
  }
}

async function generateResponse(prompt) {
  const text = await runModel(prompt);

  return text || "I could not find a useful answer from the current item data.";
}

async function generateJsonResponse(prompt) {
  const text = await runModel(prompt, {
    responseMimeType: "application/json",
  });

  return parseJsonResponse(text);
}

module.exports = { generateJsonResponse, generateResponse };
