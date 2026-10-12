import { render, screen } from "@testing-library/react";
import App, { PRODUCT_NAME } from "../src/App.jsx";

test("header shows the product name and the four-step tagline", () => {
  render(<App />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(PRODUCT_NAME);
  expect(screen.getByText(/four steps/i)).toBeInTheDocument();
});
