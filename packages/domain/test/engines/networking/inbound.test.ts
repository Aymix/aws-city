import { describe, expect, it } from "vitest";
import { City } from "../../../src/model/city";
import { serviceId, type ServiceId } from "../../../src/model/ids";
import { NetworkingEngine } from "../../../src/engines/networking/networking-engine";
import { ServiceRegistry } from "../../../src/registry/service-registry";

function registry(): ServiceRegistry {
  return ServiceRegistry.from([
    { kind: "vpc", provider: "aws", category: "network", displayName: "VPC", containment: { allowedIn: [] } },
    { kind: "subnet", provider: "aws", category: "network", displayName: "Subnet", containment: { allowedIn: ["vpc"] } },
    { kind: "ec2", provider: "aws", category: "compute", displayName: "EC2", containment: { allowedIn: ["subnet"] } },
    { kind: "security-group", provider: "aws", category: "security", displayName: "SG", containment: { allowedIn: ["vpc"] } },
    { kind: "internet-gateway", provider: "aws", category: "network", displayName: "IGW", containment: { allowedIn: [] } },
    { kind: "route-table", provider: "aws", category: "network", displayName: "RT", containment: { allowedIn: ["vpc"] } },
    { kind: "iam-role", provider: "aws", category: "identity", displayName: "Role", containment: { allowedIn: [] } },
  ]);
}

interface ScenarioOptions {
  igw?: boolean; // internet gateway attached to vpc
  routeTable?: boolean; // route table associated with the subnet
  publicRoute?: boolean; // route table routes to the igw
  sgRule?: { port: number; cidr: string } | null; // ingress rule (null = no rule)
}

/** Builds a public-web-server-shaped city, breakable one knob at a time. */
function scenario(opts: ScenarioOptions = {}): { city: City; target: ServiceId } {
  const { igw = true, routeTable = true, publicRoute = true, sgRule = { port: 443, cidr: "0.0.0.0/0" } } =
    opts;
  const city = new City(registry());
  const vpc = city.add("vpc");
  const subnet = city.add("subnet", { in: vpc.id });
  const ec2 = city.add("ec2", { in: subnet.id, properties: { name: "web" } });

  if (igw) {
    const gw = city.add("internet-gateway");
    city.connect(gw.id, vpc.id, "attached-to");
    if (routeTable) {
      const rt = city.add("route-table", { in: vpc.id });
      city.connect(rt.id, subnet.id, "associated-with");
      if (publicRoute) city.connect(rt.id, gw.id, "routes-to");
    }
  } else if (routeTable) {
    const rt = city.add("route-table", { in: vpc.id });
    city.connect(rt.id, subnet.id, "associated-with");
  }

  const sg = city.add("security-group", {
    in: vpc.id,
    properties: { ingress: sgRule ? [sgRule] : [] },
  });
  city.connect(sg.id, ec2.id, "attached-to");

  return { city, target: ec2.id };
}

describe("NetworkingEngine — inbound reachability from the internet", () => {
  it("reaches a public web server on its open port", () => {
    const { city, target } = scenario();
    const result = new NetworkingEngine(city).reachability({ from: "internet", to: target, port: 443 });
    expect(result.reachable).toBe(true);
    expect(result.blockedReason).toBeUndefined();
    // the path should traverse the gateway and the security group to the instance
    const kinds = result.path.map((h) => h.kind);
    expect(kinds).toContain("internet-gateway");
    expect(kinds).toContain("security-group");
    expect(kinds[kinds.length - 1]).toBe("ec2");
  });

  it("blocks when there is no internet gateway", () => {
    const { city, target } = scenario({ igw: false });
    const result = new NetworkingEngine(city).reachability({ from: "internet", to: target, port: 443 });
    expect(result.reachable).toBe(false);
    expect(result.blockedReason?.code).toBe("NO_INTERNET_GATEWAY");
  });

  it("blocks when the subnet has no route table", () => {
    const { city, target } = scenario({ routeTable: false });
    const result = new NetworkingEngine(city).reachability({ from: "internet", to: target, port: 443 });
    expect(result.reachable).toBe(false);
    expect(result.blockedReason?.code).toBe("NO_ROUTE_TABLE");
  });

  it("blocks when the subnet is private (no route to the gateway)", () => {
    const { city, target } = scenario({ publicRoute: false });
    const result = new NetworkingEngine(city).reachability({ from: "internet", to: target, port: 443 });
    expect(result.reachable).toBe(false);
    expect(result.blockedReason?.code).toBe("PRIVATE_SUBNET_NO_PUBLIC_ROUTE");
  });

  it("blocks when the security group does not allow the port", () => {
    const { city, target } = scenario({ sgRule: { port: 80, cidr: "0.0.0.0/0" } });
    const result = new NetworkingEngine(city).reachability({ from: "internet", to: target, port: 443 });
    expect(result.reachable).toBe(false);
    expect(result.blockedReason?.code).toBe("SECURITY_GROUP_BLOCKS_PORT");
    expect(result.blockedReason?.at).toBe(target);
  });

  it("blocks when the security group only allows an internal CIDR", () => {
    const { city, target } = scenario({ sgRule: { port: 443, cidr: "10.0.0.0/16" } });
    const result = new NetworkingEngine(city).reachability({ from: "internet", to: target, port: 443 });
    expect(result.reachable).toBe(false);
    expect(result.blockedReason?.code).toBe("SECURITY_GROUP_BLOCKS_PORT");
  });

  it("blocks when there is no security group rule at all", () => {
    const { city, target } = scenario({ sgRule: null });
    const result = new NetworkingEngine(city).reachability({ from: "internet", to: target, port: 443 });
    expect(result.reachable).toBe(false);
    expect(result.blockedReason?.code).toBe("SECURITY_GROUP_BLOCKS_PORT");
  });

  it("blocks when the target is not inside a subnet", () => {
    const city = new City(registry());
    const role = city.add("iam-role");
    const result = new NetworkingEngine(city).reachability({
      from: "internet",
      to: role.id,
      port: 443,
    });
    expect(result.reachable).toBe(false);
    expect(result.blockedReason?.code).toBe("TARGET_NOT_IN_SUBNET");
  });

  it("throws when the target does not exist", () => {
    const city = new City(registry());
    expect(() =>
      new NetworkingEngine(city).reachability({ from: "internet", to: serviceId("ghost"), port: 443 }),
    ).toThrow();
  });
});
