import type { Hint } from "@aws-city/application";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HintPanel } from "../../src/ui/HintPanel";

const hints: Hint[] = [
  { tier: "nudge", text: "a nudge" },
  { tier: "strategy", text: "a strategy" },
  { tier: "solution", text: "the solution" },
];

describe("HintPanel", () => {
  it("shows only the revealed hints", () => {
    render(<HintPanel hints={hints} revealed={1} onReveal={vi.fn()} />);
    expect(screen.getByText(/a nudge/)).toBeInTheDocument();
    expect(screen.queryByText(/a strategy/)).not.toBeInTheDocument();
  });

  it("invokes onReveal when the button is clicked", () => {
    const onReveal = vi.fn();
    render(<HintPanel hints={hints} revealed={0} onReveal={onReveal} />);
    fireEvent.click(screen.getByRole("button", { name: /get a hint/i }));
    expect(onReveal).toHaveBeenCalled();
  });

  it("disables the button once everything is revealed", () => {
    render(<HintPanel hints={hints} revealed={3} onReveal={vi.fn()} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
