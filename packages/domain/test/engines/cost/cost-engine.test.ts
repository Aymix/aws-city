import { describe, expect, it } from "vitest";
import { City } from "../../../src/model/city";
import { ServiceRegistry } from "../../../src/registry/service-registry";
import { CostEngine, HOURS_PER_MONTH, createCostSystem } from "../../../src/engines/cost/cost-engine";
import { SimulationEngine } from "../../../src/simulation/simulation-engine";
import { createInitialState } from "../../../src/simulation/world-state";

function registry(): ServiceRegistry {
  return ServiceRegistry.from([
    { kind: "vpc", provider: "aws", category: "network", displayName: "VPC", containment: { allowedIn: [] } },
    { kind: "subnet", provider: "aws", category: "network", displayName: "Subnet", containment: { allowedIn: ["vpc"] } },
    {
      kind: "ec2",
      provider: "aws",
      category: "compute",
      displayName: "EC2",
      containment: { allowedIn: ["subnet"] },
      cost: (s) => (s.properties["instanceType"] === "big" ? 1 : 0.01),
    },
  ]);
}

function cityWith(instanceType: string): City {
  const city = new City(registry());
  const vpc = city.add("vpc");
  const subnet = city.add("subnet", { in: vpc.id });
  city.add("ec2", { in: subnet.id, properties: { instanceType } });
  return city;
}

describe("CostEngine", () => {
  it("sums per-service hourly cost (free kinds cost nothing)", () => {
    expect(new CostEngine(registry()).hourlyCost(cityWith("small"))).toBeCloseTo(0.01);
  });

  it("derives monthly cost from hourly", () => {
    expect(new CostEngine(registry()).monthlyCost(cityWith("big"))).toBeCloseTo(HOURS_PER_MONTH);
  });

  it("reflects property changes (right-sizing reduces cost)", () => {
    const engine = new CostEngine(registry());
    expect(engine.monthlyCost(cityWith("big"))).toBeGreaterThan(engine.monthlyCost(cityWith("small")));
  });

  it("produces a per-service breakdown", () => {
    const breakdown = new CostEngine(registry()).breakdown(cityWith("big"));
    expect(breakdown.find((l) => l.kind === "ec2")!.hourly).toBeCloseTo(1);
    expect(breakdown.filter((l) => l.kind === "vpc")[0]!.hourly).toBe(0);
  });
});

describe("createCostSystem", () => {
  it("emits a cost-accrued event each tick", () => {
    const city = cityWith("big");
    const system = createCostSystem(new CostEngine(registry()));
    const { events } = new SimulationEngine([system]).tick(createInitialState(), city, 3_600_000);
    const cost = events.find((e) => e.type === "cost-accrued");
    expect(cost).toBeDefined();
    expect((cost!.payload as { accrued: number }).accrued).toBeCloseTo(1); // 1 hour at $1/hr
  });
});
