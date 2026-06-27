import { PuzzleController } from "@aws-city/application";
import { CostEngine, serviceId } from "@aws-city/domain";
import { describe, expect, it } from "vitest";
import { createAwsRegistry } from "../src/aws";
import { createAwsValidationEngine } from "../src/aws/rules";
import { rightSizeInstancePuzzle } from "../src/puzzles";

function controller(): PuzzleController {
  return new PuzzleController(rightSizeInstancePuzzle, createAwsValidationEngine(), {
    cost: new CostEngine(createAwsRegistry()),
  });
}

describe("FinOps: right-size the instance", () => {
  it("is unsolved while the instance is oversized (over budget)", () => {
    expect(controller().solved).toBe(false);
  });

  it("is solved only when functional AND under budget", () => {
    const c = controller();
    const result = c.apply({
      type: "update-properties",
      id: serviceId("web"),
      properties: { instanceType: "t3.small" },
    });
    expect(result.solved).toBe(true);
  });

  it("stays unsolved if cost is fixed but functionality breaks", () => {
    const c = controller();
    // tiny instance (cheap) but also remove the route to the internet gateway,
    // breaking reachability -> the composite goal must remain unmet.
    c.apply({ type: "update-properties", id: serviceId("web"), properties: { instanceType: "t3.micro" } });
    c.apply({ type: "disconnect", from: serviceId("rt"), to: serviceId("igw"), connectionType: "routes-to" });
    expect(c.solved).toBe(false);
  });
});
