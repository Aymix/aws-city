import { createAwsValidationEngine, fixSecurityGroupPuzzle } from "@aws-city/content";
import { serviceId } from "@aws-city/domain";
import { fireEvent, render, screen } from "@testing-library/react";
import { useSyncExternalStore } from "react";
import { describe, expect, it } from "vitest";
import { PuzzleSession } from "../../src/state/puzzle-session";
import { ServiceInspector } from "../../src/ui/ServiceInspector";
import { WinBanner } from "../../src/ui/WinBanner";

/**
 * Integration: the real session + the real React components solving a puzzle by
 * UI interaction (the SG inspector). The only part NOT exercised here is the
 * Phaser canvas click that produces `select(id)` — pure rendering glue.
 */
function Harness({ session }: { session: PuzzleSession }): JSX.Element {
  const snap = useSyncExternalStore(
    (cb) => session.subscribe(cb),
    () => session.getSnapshot(),
  );
  const service = snap.selectedId ? snap.city.get(snap.selectedId) ?? null : null;
  return (
    <>
      <WinBanner solved={snap.solved} />
      <ServiceInspector service={service} onCommand={(c) => session.apply(c)} />
    </>
  );
}

describe("play loop integration", () => {
  it("solves The Locked Door by toggling the security group's 443 port", () => {
    const session = new PuzzleSession(fixSecurityGroupPuzzle, createAwsValidationEngine());
    // Stand in for the canvas click that selects the security group.
    session.select(serviceId("sg"));

    render(<Harness session={session} />);

    expect(screen.queryByText(/solved/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: /443/ }));

    expect(screen.getByText(/solved/i)).toBeInTheDocument();
  });
});
