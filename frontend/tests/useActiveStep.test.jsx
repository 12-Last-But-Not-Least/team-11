import { act, render, renderHook, screen } from "@testing-library/react";
import { useActiveStep } from "../src/useActiveStep.js";
import { Step } from "../src/components/Step.jsx";

function mockIntersectionObserver() {
  const observers = [];
  class FakeIntersectionObserver {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.targets = new Set();
      observers.push(this);
    }
    observe(el) {
      this.targets.add(el);
    }
    unobserve(el) {
      this.targets.delete(el);
    }
    disconnect() {
      this.targets.clear();
    }
    trigger(entries) {
      this.callback(entries.map((e) => ({
        isIntersecting: e.intersectionRatio > 0,
        intersectionRatio: e.intersectionRatio,
        target: e.target,
      })));
    }
  }
  globalThis.IntersectionObserver = FakeIntersectionObserver;
  return observers;
}

describe("useActiveStep", () => {
  it("marks the step with the highest intersection ratio as active", () => {
    const observers = mockIntersectionObserver();
    const { result } = renderHook(() => useActiveStep(1));

    const a = document.createElement("section");
    const b = document.createElement("section");
    act(() => {
      result.current.register(1)(a);
      result.current.register(2)(b);
    });

    expect(observers).toHaveLength(1);
    act(() => {
      observers[0].trigger([
        { target: a, intersectionRatio: 0.2 },
        { target: b, intersectionRatio: 0.8 },
      ]);
    });
    expect(result.current.active).toBe(2);
  });
});

describe("Step active marking", () => {
  it("applies step--active and aria-current when active", () => {
    const { rerender } = render(
      <Step n={2} title="Look" active={false}>body</Step>,
    );
    const section = screen.getByRole("region", { name: /step 2/i });
    expect(section).not.toHaveClass("step--active");
    expect(section).not.toHaveAttribute("aria-current");

    rerender(<Step n={2} title="Look" active>body</Step>);
    expect(section).toHaveClass("step--active");
    expect(section).toHaveAttribute("aria-current", "step");
  });
});
