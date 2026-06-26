import { beforeEach, describe, expect, it } from "vitest";
import { DomainError } from "../../src/invariant";
import { City } from "../../src/model/city";
import { serviceId } from "../../src/model/ids";
import { ServiceRegistry } from "../../src/registry/service-registry";

function testRegistry(): ServiceRegistry {
  return ServiceRegistry.from([
    { kind: "vpc", provider: "aws", category: "network", displayName: "VPC", containment: { allowedIn: [] } },
    {
      kind: "subnet",
      provider: "aws",
      category: "network",
      displayName: "Subnet",
      containment: { allowedIn: ["vpc"] },
    },
    {
      kind: "ec2",
      provider: "aws",
      category: "compute",
      displayName: "EC2",
      containment: { allowedIn: ["subnet"] },
      defaults: { instanceType: "t3.micro" },
    },
    {
      kind: "security-group",
      provider: "aws",
      category: "security",
      displayName: "Security Group",
      containment: { allowedIn: ["vpc"] },
    },
    {
      kind: "internet-gateway",
      provider: "aws",
      category: "network",
      displayName: "Internet Gateway",
      containment: { allowedIn: [] },
    },
  ]);
}

describe("City — adding services", () => {
  let city: City;
  beforeEach(() => {
    city = new City(testRegistry());
  });

  it("adds a top-level service with a generated id", () => {
    const vpc = city.add("vpc");
    expect(vpc.kind).toBe("vpc");
    expect(vpc.id).toBe("vpc-1");
    expect(city.has(vpc.id)).toBe(true);
    expect(city.all()).toHaveLength(1);
  });

  it("generates sequential ids per kind", () => {
    expect(city.add("vpc").id).toBe("vpc-1");
    expect(city.add("vpc").id).toBe("vpc-2");
  });

  it("accepts an explicit id", () => {
    const vpc = city.add("vpc", { id: "main-vpc" });
    expect(vpc.id).toBe(serviceId("main-vpc"));
  });

  it("applies definition defaults, overridden by supplied properties", () => {
    const vpc = city.add("vpc");
    const subnet = city.add("subnet", { in: vpc.id });
    const ec2 = city.add("ec2", { in: subnet.id, properties: { name: "web" } });
    expect(ec2.properties).toEqual({ instanceType: "t3.micro", name: "web" });

    const ec2b = city.add("ec2", { in: subnet.id, properties: { instanceType: "m5.large" } });
    expect(ec2b.properties["instanceType"]).toBe("m5.large");
  });

  it("rejects an unknown kind", () => {
    expect(() => city.add("nope")).toThrow(DomainError);
  });

  it("rejects a duplicate id", () => {
    city.add("vpc", { id: "dup" });
    expect(() => city.add("vpc", { id: "dup" })).toThrow(DomainError);
  });

  it("skips generated ids that collide with explicit ones", () => {
    city.add("vpc", { id: "vpc-1" });
    expect(city.add("vpc").id).toBe("vpc-2");
  });
});

describe("City — containment invariants", () => {
  let city: City;
  beforeEach(() => {
    city = new City(testRegistry());
  });

  it("rejects a top-level service given a parent", () => {
    const vpc = city.add("vpc");
    expect(() => city.add("internet-gateway", { in: vpc.id })).toThrow(DomainError);
  });

  it("rejects a containment-requiring service with no parent", () => {
    expect(() => city.add("subnet")).toThrow(DomainError);
  });

  it("rejects placement into a non-existent parent", () => {
    expect(() => city.add("subnet", { in: serviceId("ghost") })).toThrow(DomainError);
  });

  it("rejects placement into a parent of the wrong kind", () => {
    const vpc = city.add("vpc");
    // ec2 must live in a subnet, not directly in a vpc
    expect(() => city.add("ec2", { in: vpc.id })).toThrow(DomainError);
  });

  it("records parent/child relationships", () => {
    const vpc = city.add("vpc");
    const subnet = city.add("subnet", { in: vpc.id });
    const ec2 = city.add("ec2", { in: subnet.id });
    expect(city.parentOf(ec2.id)).toBe(subnet.id);
    expect(city.parentOf(vpc.id)).toBeUndefined();
    expect(city.childrenOf(vpc.id).map((s) => s.id)).toEqual([subnet.id]);
    expect(city.childrenOf(subnet.id).map((s) => s.id)).toEqual([ec2.id]);
  });
});

describe("City — queries", () => {
  let city: City;
  beforeEach(() => {
    city = new City(testRegistry());
  });

  it("requires returns or throws", () => {
    const vpc = city.add("vpc");
    expect(city.require(vpc.id)).toBe(city.get(vpc.id));
    expect(() => city.require(serviceId("ghost"))).toThrow(DomainError);
  });

  it("filters by kind", () => {
    const vpc = city.add("vpc");
    city.add("subnet", { in: vpc.id });
    city.add("subnet", { in: vpc.id });
    expect(city.byKind("subnet")).toHaveLength(2);
    expect(city.byKind("vpc")).toHaveLength(1);
  });
});

describe("City — connections", () => {
  let city: City;
  let sg: string;
  let ec2: string;
  beforeEach(() => {
    city = new City(testRegistry());
    const vpc = city.add("vpc");
    const subnet = city.add("subnet", { in: vpc.id });
    sg = city.add("security-group", { in: vpc.id }).id;
    ec2 = city.add("ec2", { in: subnet.id }).id;
  });

  it("connects two services and lists the edge from both ends", () => {
    const conn = city.connect(serviceId(sg), serviceId(ec2), "attached-to");
    expect(conn.type).toBe("attached-to");
    expect(city.connections()).toHaveLength(1);
    expect(city.connectionsOf(serviceId(sg))).toHaveLength(1);
    expect(city.connectionsOf(serviceId(ec2))).toHaveLength(1);
  });

  it("rejects a connection to a non-existent target", () => {
    expect(() => city.connect(serviceId(sg), serviceId("ghost"), "attached-to")).toThrow(
      DomainError,
    );
  });

  it("rejects a connection from a non-existent source", () => {
    expect(() => city.connect(serviceId("ghost"), serviceId(ec2), "attached-to")).toThrow(
      DomainError,
    );
  });

  it("rejects a self-connection", () => {
    expect(() => city.connect(serviceId(sg), serviceId(sg), "attached-to")).toThrow(DomainError);
  });

  it("rejects a duplicate connection", () => {
    city.connect(serviceId(sg), serviceId(ec2), "attached-to");
    expect(() => city.connect(serviceId(sg), serviceId(ec2), "attached-to")).toThrow(DomainError);
  });

  it("disconnects an existing edge and rejects disconnecting a missing one", () => {
    city.connect(serviceId(sg), serviceId(ec2), "attached-to");
    city.disconnect(serviceId(sg), serviceId(ec2), "attached-to");
    expect(city.connections()).toHaveLength(0);
    expect(() => city.disconnect(serviceId(sg), serviceId(ec2), "attached-to")).toThrow(DomainError);
  });
});

describe("City — removing services", () => {
  let city: City;
  beforeEach(() => {
    city = new City(testRegistry());
  });

  it("removes a leaf service and its connections", () => {
    const vpc = city.add("vpc");
    const subnet = city.add("subnet", { in: vpc.id });
    const sg = city.add("security-group", { in: vpc.id });
    const ec2 = city.add("ec2", { in: subnet.id });
    city.connect(sg.id, ec2.id, "attached-to");

    city.remove(ec2.id);

    expect(city.has(ec2.id)).toBe(false);
    expect(city.connections()).toHaveLength(0);
    expect(city.connectionsOf(sg.id)).toHaveLength(0);
  });

  it("refuses to remove a service that still contains children", () => {
    const vpc = city.add("vpc");
    city.add("subnet", { in: vpc.id });
    expect(() => city.remove(vpc.id)).toThrow(DomainError);
  });

  it("rejects removing a non-existent service", () => {
    expect(() => city.remove(serviceId("ghost"))).toThrow(DomainError);
  });
});

describe("City — updating properties", () => {
  let city: City;
  beforeEach(() => {
    city = new City(testRegistry());
  });

  it("shallow-merges a patch over existing properties", () => {
    const vpc = city.add("vpc");
    const ec2 = city.add("ec2", {
      in: city.add("subnet", { in: vpc.id }).id,
      properties: { name: "web", instanceType: "t3.micro" },
    });
    const updated = city.updateProperties(ec2.id, { instanceType: "m5.large" });
    expect(updated.properties).toEqual({ name: "web", instanceType: "m5.large" });
    // the change is persisted in the city
    expect(city.require(ec2.id).properties["instanceType"]).toBe("m5.large");
  });

  it("rejects updating a non-existent service", () => {
    expect(() => city.updateProperties(serviceId("ghost"), { x: 1 })).toThrow(DomainError);
  });
});
