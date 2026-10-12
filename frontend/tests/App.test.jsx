import { render, screen } from "@testing-library/react";
import App, { PRODUCT_NAME } from "../src/App.jsx";

test("header shows the product name", () => {
  expect(PRODUCT_NAME).toBe("Coincidence? I Think Not");
  render(<App />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(PRODUCT_NAME);
});
