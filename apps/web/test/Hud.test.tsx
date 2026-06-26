import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hud } from "../src/ui/Hud";

describe("Hud", () => {
  it("renders the game title", () => {
    render(<Hud />);
    expect(screen.getByRole("heading", { name: "AWS City" })).toBeInTheDocument();
  });
});
