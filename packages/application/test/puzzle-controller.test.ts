import { City, ServiceRegistry, ValidationEngine, serviceId } from "@aws-city/domain";
import { describe, expect, it } from "vitest";
import type { Puzzle } from "../src/modes/puzzle/puzzle";
import { PuzzleController } from "../src/modes/puzzle/puzzle-controller";

function registry(): ServiceRegistry {
  return ServiceRegistry.from([
    { kind: "vpc", provider: "aws", category: "network", displayName: "VPC", containment: { allowedIn: [] } },
    { kind: "subnet", provider: "aws", category: "network", displayName: "Subnet", containment: { allowedIn: ["vpc"] } },
    { kind: "ec2", provider: "aws", category: "compute", displayName: "EC2", containment: { allowedIn: ["subnet"] } },
    { kind: "security-group", provider: "aws", category: "security", displayName: "SG", containment: { allowedIn: ["vpc"] } },
    { kind: "internet-gateway", provider: "aws", category: "network", displayName: "IGW", containment: { allowedIn: [] } },
    { kind: "route-table", provider: "aws", category: "network", displayName: "RT", containment: { allowedIn: ["vpc"] } },
  ]);
}

/** Public web reachable EXCEPT the SG has no rule — fix by setting ingress 443. */
function brokenSgPuzzle(maxMoves?: number): Puzzle {
  return {
    id: "fix-sg",
    title: "The Locked Door",
    briefing: "Traffic can't reach the web server.",
    build: () => {
      const city = new City(registry());
      const vpc = city.add("vpc", { id: "vpc" });
      const subnet = city.add("subnet", { in: vpc.id, id: "sn" });
      const igw = city.add("internet-gateway", { id: "igw" });
      city.connect(igw.id, vpc.id, "attached-to");
      const rt = city.add("route-table", { in: vpc.id, id: "rt" });
      city.connect(rt.id, subnet.id, "associated-with");
      city.connect(rt.id, igw.id, "routes-to");
      city.add("ec2", { in: subnet.id, id: "web" });
      const sg = city.add("security-group", { in: vpc.id, id: "sg", properties: { ingress: [] } });
      city.connect(sg.id, serviceId("web"), "attached-to");
      return city;
    },
    goal: { kind: "reachable", from: "internet", to: serviceId("web"), port: 443 },
    ...(maxMoves !== undefined ? { constraints: { maxMoves } } : {}),
  };
}

const fixSg = {
  type: "update-properties" as const,
  id: serviceId("sg"),
  properties: { ingress: [{ port: 443, cidr: "0.0.0.0/0" }] },
};

function controller(puzzle: Puzzle): PuzzleController {
  return new PuzzleController(puzzle, new ValidationEngine([]));
}

describe("PuzzleController", () => {
  it("starts unsolved with zero moves", () => {
    const c = controller(brokenSgPuzzle());
    expect(c.solved).toBe(false);
    expect(c.status.moves).toBe(0);
  });

  it("solves the puzzle when the fixing command is applied", () => {
    const c = controller(brokenSgPuzzle());
    const result = c.apply(fixSg);
    expect(result.ok).toBe(true);
    expect(result.solved).toBe(true);
    expect(c.solved).toBe(true);
    expect(c.status.moves).toBe(1);
  });

  it("rejects an illegal command without counting a move", () => {
    const c = controller(brokenSgPuzzle());
    const result = c.apply({
      type: "connect",
      from: serviceId("ghost"),
      to: serviceId("web"),
      connectionType: "attached-to",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
    expect(c.status.moves).toBe(0);
  });

  it("enforces a move limit and reports being out of moves", () => {
    const c = controller(brokenSgPuzzle(0));
    const result = c.apply(fixSg);
    expect(result.ok).toBe(false);
    expect(c.status.outOfMoves).toBe(true);
    expect(c.status.movesRemaining).toBe(0);
  });

  it("enforces allowedCommands", () => {
    const puzzle: Puzzle = { ...brokenSgPuzzle(), constraints: { allowedCommands: ["connect"] } };
    const c = controller(puzzle);
    expect(c.apply(fixSg).ok).toBe(false); // update-properties not allowed
  });

  it("enforces allowedServiceKinds for add-service", () => {
    const puzzle: Puzzle = {
      ...brokenSgPuzzle(),
      constraints: { allowedServiceKinds: ["internet-gateway"] },
    };
    const c = controller(puzzle);
    const addEc2 = { type: "add-service" as const, kind: "ec2", in: serviceId("sn") };
    expect(c.apply(addEc2).ok).toBe(false);
  });

  it("exposes movesRemaining as null when unconstrained", () => {
    const c = controller(brokenSgPuzzle());
    expect(c.status.movesRemaining).toBeNull();
  });
});
