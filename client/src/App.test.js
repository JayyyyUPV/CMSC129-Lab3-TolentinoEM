import { render, screen } from "@testing-library/react";
import axios from "axios";
import App from "./App";

jest.mock("axios");

test("renders the lab 3 heading", async () => {
  axios.get.mockResolvedValue({ data: [] });
  render(<App />);

  const heading = screen.getByText(/crud tracker with a gemini-powered item chatbot/i);
  expect(heading).toBeInTheDocument();

  const emptyState = await screen.findByText(/no items yet/i);
  expect(emptyState).toBeInTheDocument();
});
