import { serviceId } from "@aws-city/domain";
import { createAwsValidationEngine, fixSecurityGroupPuzzle } from "@aws-city/content";
import { describe, expect, it, vi } from "vitest";
import { PuzzleSession } from "../../src/state/puzzle-session";

function session(): PuzzleSession {
  return new PuzzleSession(fixSecurityGroupPuzzle, createAwsValidationEngine());
}

const openPort443 = {
  type: "update-properties" as const,
  id: serviceId("sg"),
  properties: { ingress: [{ port: 443, cidr: "0.0.0.0/0" }] },
};

describe("PuzzleSession", () => {
  it("exposes the puzzle briefing and an initially-unsolved snapshot", () => {
    const snap = session().getSnapshot();
    expect(snap.title).toBe(fixSecurityGroupPuzzle.title);
    expect(snap.briefing).toBe(fixSecurityGroupPuzzle.briefing);
    expect(snap.solved).toBe(false);
    expect(snap.selectedId).toBeNull();
  });

  it("returns a stable snapshot reference until something changes", () => {
    const s = session();
    expect(s.getSnapshot()).toBe(s.getSnapshot());
  });

  it("updates selection and notifies subscribers", () => {
    const s = session();
    const listener = vi.fn();
    s.subscribe(listener);
    s.select(serviceId("sg"));
    expect(s.getSnapshot().selectedId).toBe(serviceId("sg"));
    expect(listener).toHaveBeenCalled();
  });

  it("applies a command, solving the puzzle and refreshing the snapshot", () => {
    const s = session();
    const before = s.getSnapshot();
    const result = s.apply(openPort443);
    expect(result.ok).toBe(true);
    const after = s.getSnapshot();
    expect(after).not.toBe(before);
    expect(after.solved).toBe(true);
    expect(after.moves).toBe(1);
  });

  it("records the error from an illegal command", () => {
    const s = session();
    const result = s.apply({
      type: "connect",
      from: serviceId("ghost"),
      to: serviceId("sg"),
      connectionType: "attached-to",
    });
    expect(result.ok).toBe(false);
    expect(s.getSnapshot().lastError).toBeTruthy();
  });

  it("surfaces diagnostics in the snapshot", () => {
    const s = session();
    expect(Array.isArray(s.getSnapshot().diagnostics)).toBe(true);
  });

  it("stops notifying after unsubscribe", () => {
    const s = session();
    const listener = vi.fn();
    const off = s.subscribe(listener);
    off();
    s.select(serviceId("sg"));
    expect(listener).not.toHaveBeenCalled();
  });
});
