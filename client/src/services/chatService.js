import axios from "axios";

const CHAT_API_URL = "http://localhost:5000/api/chat";

export async function sendChatMessage({ message, history }) {
  try {
    const response = await axios.post(CHAT_API_URL, {
      message,
      history,
    });

    return response.data.reply;
  } catch (error) {
    const apiMessage = error.response?.data?.error;
    const retryAfterSeconds = error.response?.data?.retryAfterSeconds;

    if (retryAfterSeconds) {
      throw new Error(`${apiMessage} Try again in about ${retryAfterSeconds} seconds.`);
    }

    throw new Error(apiMessage || "The chatbot is unavailable right now.");
  }
}
