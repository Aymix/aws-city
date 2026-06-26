import { describe, expect, it } from "vitest";
import { City } from "../../../src/model/city";
import type { ServiceId } from "../../../src/model/ids";
import { NetworkingEngine } from "../../../src/engines/networking/networking-engine";
import { ServiceRegistry } from "../../../src/registry/service-registry";

function registry(): ServiceRegistry {
  return ServiceRegistry.from([
    { kind: "vpc", provider: "aws", category: "network", displayName: "VPC", containment: { allowedIn: [] } },
    { kind: "subnet", provider: "aws", category: "network", displayName: "Subnet", containment: { allowedIn: ["vpc"] } },
    { kind: "ec2", provider: "aws", category: "compute", displayName: "EC2", containment: { allowedIn: ["subnet"] } },
    { kind: "internet-gateway", provider: "aws", category: "network", displayName: "IGW", containment: { allowedIn: [] } },
    { kind: "nat-gateway", provider: "aws", category: "network", displayName: "NAT", containment: { allowedIn: ["subnet"] } },
    { kind: "route-table", provider: "aws", category: "network", displayName: "RT", containment: { allowedIn: ["vpc"] } },
  ]);
}

interface EgressOptions {
  route?: "igw" | "nat" | "none";
  routeTable?: boolean;
  natPublic?: boolean;
}

function egressScenario(opts: EgressOptions = {}): { city: City; source: ServiceId } {
  const { route = "nat", routeTable = true, natPublic = true } = opts;
  const city = new City(registry());
  const vpc = city.add("vpc");
  const igw = city.add("internet-gateway");
  city.connect(igw.id, vpc.id, "attached-to");

  const appSubnet = city.add("subnet", { in: vpc.id, properties: { public: false } });
  const app = city.add("ec2", { in: appSubnet.id, properties: { name: "app" } });

  if (routeTable) {
    const appRt = city.add("route-table", { in: vpc.id });
    city.connect(appRt.id, appSubnet.id, "associated-with");

    if (route === "igw") {
      city.connect(appRt.id, igw.id, "routes-to");
    } else if (route === "nat") {
      const natSubnet = city.add("subnet", { in: vpc.id, properties: { public: true } });
      const nat = city.add("nat-gateway", { in: natSubnet.id });
      city.connect(appRt.id, nat.id, "routes-to");
      const natRt = city.add("route-table", { in: vpc.id });
      city.connect(natRt.id, natSubnet.id, "associated-with");
      if (natPublic) city.connect(natRt.id, igw.id, "routes-to");
    }
  }

  return { city, source: app.id };
}

function egress(city: City, source: ServiceId) {
  return new NetworkingEngine(city).reachability({ from: source, to: "internet", port: 443 });
}

describe("NetworkingEngine — egress reachability to the internet", () => {
  it("reaches the internet directly via a public route to the IGW", () => {
    const { city, source } = egressScenario({ route: "igw" });
    const result = egress(city, source);
    expect(result.reachable).toBe(true);
    expect(result.path.map((h) => h.kind)).toContain("internet-gateway");
  });

  it("reaches the internet from a private subnet via a NAT gateway", () => {
    const { city, source } = egressScenario({ route: "nat", natPublic: true });
    const result = egress(city, source);
    expect(result.reachable).toBe(true);
    expect(result.path.map((h) => h.kind)).toContain("nat-gateway");
  });

  it("blocks when the NAT gateway sits in a private subnet", () => {
    const { city, source } = egressScenario({ route: "nat", natPublic: false });
    const result = egress(city, source);
    expect(result.reachable).toBe(false);
    expect(result.blockedReason?.code).toBe("NAT_NOT_IN_PUBLIC_SUBNET");
  });

  it("blocks when there is no internet-bound route at all", () => {
    const { city, source } = egressScenario({ route: "none" });
    const result = egress(city, source);
    expect(result.reachable).toBe(false);
    expect(result.blockedReason?.code).toBe("NO_EGRESS_ROUTE");
  });

  it("blocks when the subnet has no route table", () => {
    const { city, source } = egressScenario({ routeTable: false });
    const result = egress(city, source);
    expect(result.reachable).toBe(false);
    expect(result.blockedReason?.code).toBe("NO_ROUTE_TABLE");
  });
});
