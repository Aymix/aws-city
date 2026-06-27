import { PuzzleController } from "@aws-city/application";
import { SecurityEngine, serviceId } from "@aws-city/domain";
import { describe, expect, it } from "vitest";
import { createAwsValidationEngine } from "../src/aws/rules";
import { repelDataBreachPuzzle } from "../src/puzzles";

function controller(): PuzzleController {
  return new PuzzleController(repelDataBreachPuzzle, createAwsValidationEngine(), {
    security: new SecurityEngine(),
  });
}

describe("SecOps: repel the data breach", () => {
  it("starts breached (unsolved)", () => {
    expect(controller().solved).toBe(false);
  });

  it("is solved when public DB access is cut off", () => {
    const c = controller();
    const result = c.apply({
      type: "update-properties",
      id: serviceId("sg"),
      properties: { ingress: [{ port: 5432, cidr: "10.0.0.0/16" }] },
    });
    expect(result.solved).toBe(true);
  });
});
