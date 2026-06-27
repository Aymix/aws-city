import { ServiceRegistry, serviceId } from "@aws-city/domain";
import { describe, expect, it } from "vitest";
import { SandboxController } from "../src/modes/sandbox/sandbox-controller";

function registry(): ServiceRegistry {
  return ServiceRegistry.from([
    { kind: "vpc", provider: "aws", category: "network", displayName: "VPC", containment: { allowedIn: [] } },
    { kind: "subnet", provider: "aws", category: "network", displayName: "Subnet", containment: { allowedIn: ["vpc"] } },
  ]);
}

describe("SandboxController", () => {
  it("starts empty and builds freely via commands", () => {
    const sandbox = SandboxController.empty(registry());
    expect(sandbox.apply({ type: "add-service", kind: "vpc", id: "vpc" }).ok).toBe(true);
    expect(sandbox.apply({ type: "add-service", kind: "subnet", id: "sn", in: serviceId("vpc") }).ok).toBe(true);
    expect(sandbox.city.all()).toHaveLength(2);
  });

  it("reports an error for an illegal command instead of throwing", () => {
    const sandbox = SandboxController.empty(registry());
    const result = sandbox.apply({ type: "add-service", kind: "subnet", id: "sn" }); // needs a vpc parent
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("snapshots and restores a city", () => {
    const sandbox = SandboxController.empty(registry());
    sandbox.apply({ type: "add-service", kind: "vpc", id: "vpc" });
    sandbox.apply({ type: "add-service", kind: "subnet", id: "sn", in: serviceId("vpc") });
    const snapshot = sandbox.snapshot();

    const restored = SandboxController.fromSnapshot(snapshot, registry());
    expect(restored.city.all()).toHaveLength(2);
    expect(restored.snapshot()).toEqual(snapshot);
  });
});
