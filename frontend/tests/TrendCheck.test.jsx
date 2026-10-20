import { render, screen } from "@testing-library/react";
import { describeStats } from "../src/describe.js";
import { TrendCheck } from "../src/components/TrendCheck.jsx";
import { LeaveOneOutCheck } from "../src/components/LeaveOneOutCheck.jsx";

const labels = { x: "A", y: "B" };
const base = {
  n: 12, r: 0.98, r_squared: 0.9604, t: 15, df: 10, p_value: 3e-8, slope: 1, intercept: 0,
};

describe("TrendCheck", () => {
  it("compares level r with year-over-year r on two strength scales", () => {
    const { trend } = describeStats({
      ...base,
      year_over_year: { n: 11, r: 0.178, p_value: 0.6, reason: null },
    }, labels);

    render(<TrendCheck trend={trend} />);
    expect(screen.getByRole("region", { name: /does the trend explain it/i })).toBeInTheDocument();
    expect(screen.getByText("The shared time trend may be doing most of the work.")).toBeInTheDocument();
    const scales = screen.getAllByRole("img", { name: /strength of r/i });
    expect(scales).toHaveLength(2);
    expect(scales[0]).toHaveAccessibleName(/levels \(original\)/i);
    expect(scales[1]).toHaveAccessibleName(/year-over-year changes/i);
    expect(screen.getByText("year-over-year")).toHaveClass("term");
  });
});

describe("LeaveOneOutCheck", () => {
  it("shows a range visual and underlines leave-one-out", () => {
    const { leaveOneOut } = describeStats({
      ...base,
      leave_one_out: { r_min: 0.95, r_max: 0.97, valid_count: 12, undefined_count: 0, reason: null },
    }, labels);

    render(<LeaveOneOutCheck leaveOneOut={leaveOneOut} />);
    expect(screen.getByRole("region", { name: /does one point drive this/i })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /leave-one-out r ranges/i })).toBeInTheDocument();
    expect(screen.getByText("leave-one-out")).toHaveClass("term");
  });
});
