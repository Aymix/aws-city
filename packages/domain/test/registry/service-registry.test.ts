import { describe, expect, it } from "vitest";
import { DomainError } from "../../src/invariant";
import type { ServiceDefinition } from "../../src/registry/service-definition";
import { ServiceRegistry } from "../../src/registry/service-registry";

const vpc: ServiceDefinition = {
  kind: "vpc",
  provider: "aws",
  category: "network",
  displayName: "VPC",
  containment: { allowedIn: [] },
};

const subnet: ServiceDefinition = {
  kind: "subnet",
  provider: "aws",
  category: "network",
  displayName: "Subnet",
  containment: { allowedIn: ["vpc"] },
};

describe("ServiceRegistry", () => {
  it("registers and retrieves a definition", () => {
    const registry = new ServiceRegistry();
    registry.register(vpc);
    expect(registry.has("vpc")).toBe(true);
    expect(registry.get("vpc")).toBe(vpc);
    expect(registry.require("vpc")).toBe(vpc);
  });

  it("is chainable", () => {
    const registry = new ServiceRegistry();
    expect(registry.register(vpc)).toBe(registry);
    registry.register(vpc === subnet ? vpc : subnet);
    expect(registry.all()).toHaveLength(2);
  });

  it("returns undefined / false for unknown kinds", () => {
    const registry = new ServiceRegistry();
    expect(registry.get("nope")).toBeUndefined();
    expect(registry.has("nope")).toBe(false);
  });

  it("throws when requiring an unknown kind", () => {
    const registry = new ServiceRegistry();
    expect(() => registry.require("nope")).toThrow(DomainError);
  });

  it("rejects duplicate kind registration", () => {
    const registry = new ServiceRegistry();
    registry.register(vpc);
    expect(() => registry.register(vpc)).toThrow(DomainError);
  });

  it("can be seeded from an array of definitions", () => {
    const registry = ServiceRegistry.from([vpc, subnet]);
    expect(registry.all()).toHaveLength(2);
    expect(registry.has("subnet")).toBe(true);
  });
});
