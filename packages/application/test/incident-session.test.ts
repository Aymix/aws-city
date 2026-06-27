import { City, ServiceRegistry, ValidationEngine, serviceId } from "@aws-city/domain";
import { describe, expect, it } from "vitest";
import type { Incident } from "../src/modes/incident/incident";
import { IncidentSession } from "../src/modes/incident/incident-session";

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

/** Web reachable on 443; at tick 2 the route to the IGW is cut (outage). */
const outageIncident: Incident = {
  id: "outage",
  title: "Outage",
  briefing: "service down",
  build: () => {
    const city = new City(registry());
    const vpc = city.add("vpc", { id: "vpc" });
    const subnet = city.add("subnet", { id: "sn", in: vpc.id });
    const igw = city.add("internet-gateway", { id: "igw" });
    city.connect(igw.id, vpc.id, "attached-to");
    const rt = city.add("route-table", { id: "rt", in: vpc.id });
    city.connect(rt.id, subnet.id, "associated-with");
    city.connect(rt.id, igw.id, "routes-to");
    city.add("ec2", { id: "web", in: subnet.id });
    const sg = city.add("security-group", { id: "sg", in: vpc.id, properties: { ingress: [{ port: 443, cidr: "0.0.0.0/0" }] } });
    city.connect(sg.id, serviceId("web"), "attached-to");
    return city;
  },
  triggerTick: 2,
  inject: (city) => city.disconnect(serviceId("rt"), serviceId("igw"), "routes-to"),
  alert: "web unreachable",
  goal: { kind: "reachable", from: "internet", to: serviceId("web"), port: 443 },
};

function session(): IncidentSession {
  return new IncidentSession(outageIncident, { validation: new ValidationEngine([]) });
}

describe("IncidentSession", () => {
  it("stays quiet before the trigger tick", () => {
    const s = session();
    s.advance(1);
    expect(s.hasFired).toBe(false);
    expect(s.alerts).toEqual([]);
    expect(s.resolved).toBe(false);
  });

  it("fires the fault and raises an alert at the trigger tick", () => {
    const s = session();
    s.advance(2);
    expect(s.hasFired).toBe(true);
    expect(s.resolved).toBe(false);
    expect(s.alerts).toContain("web unreachable");
  });

  it("resolves when the player restores the route, clearing alerts", () => {
    const s = session();
    s.advance(2);
    const result = s.apply({
      type: "connect",
      from: serviceId("rt"),
      to: serviceId("igw"),
      connectionType: "routes-to",
    });
    expect(result.resolved).toBe(true);
    expect(s.alerts).toEqual([]);
  });
});
