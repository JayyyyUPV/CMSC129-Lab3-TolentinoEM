import axios from "axios";

const CHAT_API_URL = "http://localhost:5000/api/chat";

export async function sendChatMessage({ message, history, pendingAction }) {
  try {
    const response = await axios.post(CHAT_API_URL, {
      message,
      history,
      pendingAction,
    });

    return response.data;
  } catch (error) {
    const apiMessage = error.response?.data?.error;
    const retryAfterSeconds = error.response?.data?.retryAfterSeconds;

    if (retryAfterSeconds) {
      throw new Error(`${apiMessage} Try again in about ${retryAfterSeconds} seconds.`);
    }

    throw new Error(apiMessage || "The chatbot is unavailable right now.");
  }
}
