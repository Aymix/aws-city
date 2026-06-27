import { describe, expect, it } from "vitest";
import { City } from "../../src/model/city";
import { ServiceRegistry } from "../../src/registry/service-registry";
import { deserializeCity, serializeCity } from "../../src/serialization/serialize";
import { migrate } from "../../src/serialization/migrate";
import { SCHEMA_VERSION } from "../../src/serialization/snapshot";

function registry(): ServiceRegistry {
  return ServiceRegistry.from([
    { kind: "vpc", provider: "aws", category: "network", displayName: "VPC", containment: { allowedIn: [] }, defaults: { cidr: "10.0.0.0/16" } },
    { kind: "subnet", provider: "aws", category: "network", displayName: "Subnet", containment: { allowedIn: ["vpc"] } },
    { kind: "ec2", provider: "aws", category: "compute", displayName: "EC2", containment: { allowedIn: ["subnet"] }, defaults: { instanceType: "t3.micro" } },
    { kind: "security-group", provider: "aws", category: "security", displayName: "SG", containment: { allowedIn: ["vpc"] } },
  ]);
}

function sampleCity(): City {
  const city = new City(registry());
  const vpc = city.add("vpc", { id: "vpc" });
  const subnet = city.add("subnet", { id: "sn", in: vpc.id });
  city.add("ec2", { id: "web", in: subnet.id, properties: { name: "web" } });
  const sg = city.add("security-group", { id: "sg", in: vpc.id });
  city.connect(sg.id, city.require(city.byKind("ec2")[0]!.id).id, "attached-to");
  return city;
}

describe("city serialization", () => {
  it("stamps the current schema version", () => {
    expect(serializeCity(sampleCity()).version).toBe(SCHEMA_VERSION);
  });

  it("round-trips a city byte-stably", () => {
    const original = serializeCity(sampleCity());
    const rebuilt = deserializeCity(original, registry());
    expect(serializeCity(rebuilt)).toEqual(original);
  });

  it("preserves containment and connections", () => {
    const rebuilt = deserializeCity(serializeCity(sampleCity()), registry());
    expect(rebuilt.parentOf(rebuilt.require(rebuilt.byKind("ec2")[0]!.id).id)).toBeDefined();
    expect(rebuilt.connections()).toHaveLength(1);
  });

  it("rebuilds children even if listed before their parents", () => {
    const snapshot = {
      version: SCHEMA_VERSION,
      services: [
        { id: "web", kind: "ec2", properties: {}, in: "sn" },
        { id: "sn", kind: "subnet", properties: {}, in: "vpc" },
        { id: "vpc", kind: "vpc", properties: {} },
      ],
      connections: [],
    };
    const city = deserializeCity(snapshot, registry());
    expect(city.all()).toHaveLength(3);
  });
});

describe("migration", () => {
  it("upgrades a legacy v0 payload (nodes/parentId) to the current schema", () => {
    const v0 = {
      version: 0,
      nodes: [
        { id: "vpc", kind: "vpc", properties: {} },
        { id: "sn", kind: "subnet", properties: {}, parentId: "vpc" },
      ],
      connections: [],
    };
    const migrated = migrate(v0);
    expect(migrated.version).toBe(SCHEMA_VERSION);
    const city = deserializeCity(v0, registry());
    expect(city.parentOf(city.require(city.byKind("subnet")[0]!.id).id)).toBeDefined();
  });

  it("throws on an unknown future version", () => {
    expect(() => migrate({ version: 999, services: [], connections: [] })).toThrow();
  });
});
