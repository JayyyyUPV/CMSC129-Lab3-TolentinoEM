import { render, screen } from "@testing-library/react";
import axios from "axios";
import App from "./App";

jest.mock("axios");

test("renders the lab 3 hero copy", async () => {
  axios.get.mockResolvedValue({ data: [] });
  render(<App />);

  expect(screen.getByText(/cmsc 129 laboratory 3/i)).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: /provincial book store/i })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /open ai assistant/i })
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      /manage store records on the page, then ask the floating chatbot to summarize, count, compare, or search them using natural language/i
    )
  ).toBeInTheDocument();

  const emptyState = await screen.findByText(/no items yet/i);
  expect(emptyState).toBeInTheDocument();
});
