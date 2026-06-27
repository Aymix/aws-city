import { describe, expect, it } from "vitest";
import { City } from "../../../src/model/city";
import { ServiceRegistry } from "../../../src/registry/service-registry";
import { SecurityEngine } from "../../../src/engines/security/security-engine";

function registry(): ServiceRegistry {
  return ServiceRegistry.from([
    { kind: "vpc", provider: "aws", category: "network", displayName: "VPC", containment: { allowedIn: [] } },
    { kind: "subnet", provider: "aws", category: "network", displayName: "Subnet", containment: { allowedIn: ["vpc"] } },
    { kind: "ec2", provider: "aws", category: "compute", displayName: "EC2", containment: { allowedIn: ["subnet"] } },
    { kind: "security-group", provider: "aws", category: "security", displayName: "SG", containment: { allowedIn: ["vpc"] } },
    { kind: "internet-gateway", provider: "aws", category: "network", displayName: "IGW", containment: { allowedIn: [] } },
    { kind: "route-table", provider: "aws", category: "network", displayName: "RT", containment: { allowedIn: ["vpc"] } },
  ]);
}

/** A public subnet with a DB whose SG opens `port` to `cidr`. */
function exposedDb(cidr: string): City {
  const city = new City(registry());
  const vpc = city.add("vpc", { id: "vpc" });
  const subnet = city.add("subnet", { id: "sn", in: vpc.id });
  const igw = city.add("internet-gateway", { id: "igw" });
  city.connect(igw.id, vpc.id, "attached-to");
  const rt = city.add("route-table", { id: "rt", in: vpc.id });
  city.connect(rt.id, subnet.id, "associated-with");
  city.connect(rt.id, igw.id, "routes-to");
  city.add("ec2", { id: "db", in: subnet.id, properties: { role: "database", port: 5432 } });
  const sg = city.add("security-group", { id: "sg", in: vpc.id, properties: { ingress: [{ port: 5432, cidr }] } });
  city.connect(sg.id, city.require(city.byKind("ec2")[0]!.id).id, "attached-to");
  return city;
}

describe("SecurityEngine", () => {
  const engine = new SecurityEngine();

  it("db-exfiltration breaches when the database is internet-reachable", () => {
    const result = engine.simulateAttack(exposedDb("0.0.0.0/0"), { kind: "db-exfiltration" });
    expect(result.breached).toBe(true);
    expect(result.target).toBe("db");
  });

  it("db-exfiltration is repelled when the SG only allows internal traffic", () => {
    const result = engine.simulateAttack(exposedDb("10.0.0.0/16"), { kind: "db-exfiltration" });
    expect(result.breached).toBe(false);
  });

  it("posture drops when an attack succeeds and recovers when hardened", () => {
    expect(engine.posture(exposedDb("0.0.0.0/0")).score).toBeLessThan(100);
    expect(engine.posture(exposedDb("10.0.0.0/16")).score).toBe(100);
  });
});
