import { PuzzleController, type Puzzle } from "@aws-city/application";
import { serviceId } from "@aws-city/domain";
import { describe, expect, it } from "vitest";
import { createAwsValidationEngine } from "../src/aws/rules";
import {
  addInternetGatewayPuzzle,
  fixPublicDatabasePuzzle,
  fixSecurityGroupPuzzle,
  puzzles,
} from "../src/puzzles";

function controller(puzzle: Puzzle): PuzzleController {
  return new PuzzleController(puzzle, createAwsValidationEngine());
}

describe("starter puzzles are solvable end-to-end (headless)", () => {
  it("The Locked Door: fix the security group to open 443", () => {
    const c = controller(fixSecurityGroupPuzzle);
    expect(c.solved).toBe(false);

    const result = c.apply({
      type: "update-properties",
      id: serviceId("sg"),
      properties: { ingress: [{ port: 443, cidr: "0.0.0.0/0" }] },
    });

    expect(result.ok).toBe(true);
    expect(result.solved).toBe(true);
  });

  it("The Missing Bridge: add an internet gateway and route to it", () => {
    const c = controller(addInternetGatewayPuzzle);
    expect(c.solved).toBe(false);

    expect(c.apply({ type: "add-service", kind: "internet-gateway", id: "igw" }).ok).toBe(true);
    expect(
      c.apply({
        type: "connect",
        from: serviceId("igw"),
        to: serviceId("vpc"),
        connectionType: "attached-to",
      }).ok,
    ).toBe(true);
    const last = c.apply({
      type: "connect",
      from: serviceId("rt"),
      to: serviceId("igw"),
      connectionType: "routes-to",
    });

    expect(last.solved).toBe(true);
    expect(c.status.moves).toBe(3);
  });

  it("Exposed Vault: lock down a publicly-reachable database", () => {
    const c = controller(fixPublicDatabasePuzzle);
    expect(c.solved).toBe(false);
    expect(c.diagnostics().map((d) => d.code)).toContain("PUBLIC_DATABASE_EXPOSURE");

    const result = c.apply({
      type: "update-properties",
      id: serviceId("sg"),
      properties: { ingress: [{ port: 5432, cidr: "10.0.0.0/16" }] },
    });

    expect(result.solved).toBe(true);
    expect(c.diagnostics().map((d) => d.code)).not.toContain("PUBLIC_DATABASE_EXPOSURE");
  });

  it("registers all puzzles with unique ids", () => {
    const ids = puzzles.map((p) => p.id);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
  });
});
