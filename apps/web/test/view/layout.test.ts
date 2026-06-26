import { City, ServiceRegistry, type ServiceId } from "@aws-city/domain";
import { describe, expect, it } from "vitest";
import { layoutCity } from "../../src/view/layout";

function registry(): ServiceRegistry {
  return ServiceRegistry.from([
    { kind: "vpc", provider: "aws", category: "network", displayName: "VPC", containment: { allowedIn: [] } },
    { kind: "subnet", provider: "aws", category: "network", displayName: "Subnet", containment: { allowedIn: ["vpc"] } },
    { kind: "ec2", provider: "aws", category: "compute", displayName: "EC2", containment: { allowedIn: ["subnet"] } },
    { kind: "internet-gateway", provider: "aws", category: "network", displayName: "IGW", containment: { allowedIn: [] } },
  ]);
}

function nestedCity(): { city: City; vpc: ServiceId; subnet: ServiceId; ec2: ServiceId } {
  const city = new City(registry());
  const vpc = city.add("vpc");
  const subnet = city.add("subnet", { in: vpc.id });
  const ec2 = city.add("ec2", { in: subnet.id });
  return { city, vpc: vpc.id, subnet: subnet.id, ec2: ec2.id };
}

describe("layoutCity", () => {
  it("places every service exactly once", () => {
    const { city } = nestedCity();
    const layout = layoutCity(city);
    expect(layout.size).toBe(city.all().length);
  });

  it("rows deepen with containment (gy = containment depth)", () => {
    const { city, vpc, subnet, ec2 } = nestedCity();
    const layout = layoutCity(city);
    expect(layout.get(vpc)!.gy).toBe(0);
    expect(layout.get(subnet)!.gy).toBe(1);
    expect(layout.get(ec2)!.gy).toBe(2);
  });

  it("gives every node a distinct cell", () => {
    const city = new City(registry());
    const vpc = city.add("vpc");
    city.add("subnet", { in: vpc.id });
    city.add("subnet", { in: vpc.id });
    city.add("internet-gateway");
    const cells = [...layoutCity(city).values()].map((p) => `${p.gx},${p.gy}`);
    expect(new Set(cells).size).toBe(cells.length);
  });

  it("is deterministic", () => {
    const { city } = nestedCity();
    expect([...layoutCity(city).entries()]).toEqual([...layoutCity(city).entries()]);
  });
});
