import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Term } from "../src/components/Term.jsx";
import { GLOSSARY } from "../src/glossary.js";

test("a term is underlined text that shows its definition on hover", async () => {
  const user = userEvent.setup();
  render(<p>unlikely by chance (<Term>p-value</Term> = 0.012)</p>);
  const term = screen.getByText("p-value");
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  await user.hover(term);
  expect(screen.getByRole("tooltip")).toHaveTextContent(GLOSSARY["p-value"]);
  await user.unhover(term);
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
});

test("the definition opens on keyboard focus and closes on Escape", async () => {
  const user = userEvent.setup();
  render(<Term>r²</Term>);
  await user.tab();
  expect(screen.getByRole("tooltip")).toHaveTextContent(GLOSSARY["r²"]);
  expect(screen.getByText("r²", { selector: ".term" })).toHaveAttribute("aria-describedby", screen.getByRole("tooltip").id);
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
});

test("an unknown term renders as plain text with no tooltip affordance", () => {
  render(<Term>mystery</Term>);
  expect(screen.getByText("mystery")).not.toHaveAttribute("tabindex");
});
