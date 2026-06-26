import {
  City,
  ServiceRegistry,
  ValidationEngine,
  type ServiceId,
  type ValidationRule,
} from "@aws-city/domain";
import { describe, expect, it } from "vitest";
import { evaluateGoal } from "../src/modes/puzzle/goal";

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

/** A reachable public web server; `open` toggles the SG rule on port 443. */
function publicWeb(open: boolean): { city: City; web: ServiceId } {
  const city = new City(registry());
  const vpc = city.add("vpc");
  const subnet = city.add("subnet", { in: vpc.id });
  const igw = city.add("internet-gateway");
  city.connect(igw.id, vpc.id, "attached-to");
  const rt = city.add("route-table", { in: vpc.id });
  city.connect(rt.id, subnet.id, "associated-with");
  city.connect(rt.id, igw.id, "routes-to");
  const web = city.add("ec2", { in: subnet.id });
  const sg = city.add("security-group", {
    in: vpc.id,
    properties: { ingress: open ? [{ port: 443, cidr: "0.0.0.0/0" }] : [] },
  });
  city.connect(sg.id, web.id, "attached-to");
  return { city, web: web.id };
}

// A synthetic validation rule that flags any service with { flagged: true }.
const flagRule: ValidationRule = {
  code: "FLAGGED",
  evaluate: (ctx) =>
    ctx.city
      .all()
      .filter((s) => s.properties["flagged"] === true)
      .map((s) => ({
        code: "FLAGGED",
        severity: "error" as const,
        title: "flagged",
        message: "flagged",
        targets: [s.id],
      })),
};

describe("evaluateGoal", () => {
  it("reachable: true when traffic can reach the target", () => {
    const { city, web } = publicWeb(true);
    const ctx = { city, validation: new ValidationEngine([]) };
    expect(evaluateGoal({ kind: "reachable", from: "internet", to: web, port: 443 }, ctx)).toBe(true);
  });

  it("reachable: false when blocked", () => {
    const { city, web } = publicWeb(false);
    const ctx = { city, validation: new ValidationEngine([]) };
    expect(evaluateGoal({ kind: "reachable", from: "internet", to: web, port: 443 }, ctx)).toBe(false);
  });

  it("not-reachable: the inverse of reachable", () => {
    const { city, web } = publicWeb(false);
    const ctx = { city, validation: new ValidationEngine([]) };
    expect(evaluateGoal({ kind: "not-reachable", from: "internet", to: web, port: 443 }, ctx)).toBe(
      true,
    );
  });

  it("no-diagnostics: true only when the validation engine is clean", () => {
    const { city } = publicWeb(true);
    const flagged = new ValidationEngine([flagRule]);
    const ctxClean = { city, validation: flagged };
    expect(evaluateGoal({ kind: "no-diagnostics" }, ctxClean)).toBe(true);

    city.updateProperties(city.byKind("ec2")[0]!.id, { flagged: true });
    expect(evaluateGoal({ kind: "no-diagnostics" }, ctxClean)).toBe(false);
  });

  it("diagnostic-absent: true when the specific code is not present", () => {
    const { city } = publicWeb(true);
    const ctx = { city, validation: new ValidationEngine([flagRule]) };
    expect(evaluateGoal({ kind: "diagnostic-absent", code: "FLAGGED" }, ctx)).toBe(true);
    city.updateProperties(city.byKind("ec2")[0]!.id, { flagged: true });
    expect(evaluateGoal({ kind: "diagnostic-absent", code: "FLAGGED" }, ctx)).toBe(false);
  });

  it("all: requires every sub-goal; any: requires at least one", () => {
    const { city, web } = publicWeb(true);
    const ctx = { city, validation: new ValidationEngine([]) };
    const reach = { kind: "reachable", from: "internet", to: web, port: 443 } as const;
    const unreach = { kind: "reachable", from: "internet", to: web, port: 22 } as const;
    expect(evaluateGoal({ kind: "all", goals: [reach, unreach] }, ctx)).toBe(false);
    expect(evaluateGoal({ kind: "any", goals: [reach, unreach] }, ctx)).toBe(true);
  });
});
