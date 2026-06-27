import type { Puzzle } from "@aws-city/application";
import { City, serviceId } from "@aws-city/domain";
import { createAwsRegistry } from "../aws";

/**
 * Starter puzzles (data). Each `build()` produces an initial broken city with
 * fixed service ids so scenarios and tutorials can reference them, and a
 * declarative goal evaluated by the puzzle controller.
 */

/** A complete public path whose security group has no ingress rule. */
export const fixSecurityGroupPuzzle: Puzzle = {
  id: "fix-security-group",
  title: "The Locked Door",
  briefing:
    "Citizens can't reach the web server. Everything looks connected — check the door locks (security group).",
  build: () => {
    const city = new City(createAwsRegistry());
    const vpc = city.add("vpc", { id: "vpc" });
    const subnet = city.add("subnet", { id: "sn", in: vpc.id, properties: { public: true } });
    const igw = city.add("internet-gateway", { id: "igw" });
    city.connect(igw.id, vpc.id, "attached-to");
    const rt = city.add("route-table", { id: "rt", in: vpc.id });
    city.connect(rt.id, subnet.id, "associated-with");
    city.connect(rt.id, igw.id, "routes-to");
    city.add("ec2", { id: "web", in: subnet.id, properties: { name: "web", expose: 443 } });
    const sg = city.add("security-group", { id: "sg", in: vpc.id, properties: { ingress: [] } });
    city.connect(sg.id, serviceId("web"), "attached-to");
    return city;
  },
  goal: { kind: "reachable", from: "internet", to: serviceId("web"), port: 443 },
};

/** A web server whose subnet has a route table, but the VPC has no gateway. */
export const addInternetGatewayPuzzle: Puzzle = {
  id: "add-internet-gateway",
  title: "The Missing Bridge",
  briefing:
    "The web server is configured correctly, but the city has no bridge to the outside world. Build one.",
  build: () => {
    const city = new City(createAwsRegistry());
    const vpc = city.add("vpc", { id: "vpc" });
    const subnet = city.add("subnet", { id: "sn", in: vpc.id, properties: { public: true } });
    const rt = city.add("route-table", { id: "rt", in: vpc.id });
    city.connect(rt.id, subnet.id, "associated-with");
    city.add("ec2", { id: "web", in: subnet.id, properties: { name: "web", expose: 443 } });
    const sg = city.add("security-group", {
      id: "sg",
      in: vpc.id,
      properties: { ingress: [{ port: 443, cidr: "0.0.0.0/0" }] },
    });
    city.connect(sg.id, serviceId("web"), "attached-to");
    return city;
  },
  goal: { kind: "reachable", from: "internet", to: serviceId("web"), port: 443 },
};

/** A database sitting in a public subnet with its port open to the world. */
export const fixPublicDatabasePuzzle: Puzzle = {
  id: "fix-public-database",
  title: "Exposed Vault",
  briefing:
    "The bank vault (database) is reachable from the open internet. Lock it down to internal traffic only.",
  build: () => {
    const city = new City(createAwsRegistry());
    const vpc = city.add("vpc", { id: "vpc" });
    const subnet = city.add("subnet", { id: "sn", in: vpc.id, properties: { public: true } });
    const igw = city.add("internet-gateway", { id: "igw" });
    city.connect(igw.id, vpc.id, "attached-to");
    const rt = city.add("route-table", { id: "rt", in: vpc.id });
    city.connect(rt.id, subnet.id, "associated-with");
    city.connect(rt.id, igw.id, "routes-to");
    city.add("ec2", { id: "db", in: subnet.id, properties: { role: "database", port: 5432 } });
    const sg = city.add("security-group", {
      id: "sg",
      in: vpc.id,
      properties: { ingress: [{ port: 5432, cidr: "0.0.0.0/0" }] },
    });
    city.connect(sg.id, serviceId("db"), "attached-to");
    return city;
  },
  goal: {
    kind: "all",
    goals: [
      { kind: "diagnostic-absent", code: "PUBLIC_DATABASE_EXPOSURE" },
      { kind: "not-reachable", from: "internet", to: serviceId("db"), port: 5432 },
    ],
  },
};

/** A correctly-working web server running on a wildly oversized instance. */
export const rightSizeInstancePuzzle: Puzzle = {
  id: "right-size-instance",
  title: "The Overbuilt Tower",
  briefing:
    "The web server works, but it's running on an enormous, expensive instance. Keep it reachable while getting the monthly bill under $150.",
  build: () => {
    const city = new City(createAwsRegistry());
    const vpc = city.add("vpc", { id: "vpc" });
    const subnet = city.add("subnet", { id: "sn", in: vpc.id, properties: { public: true } });
    const igw = city.add("internet-gateway", { id: "igw" });
    city.connect(igw.id, vpc.id, "attached-to");
    const rt = city.add("route-table", { id: "rt", in: vpc.id });
    city.connect(rt.id, subnet.id, "associated-with");
    city.connect(rt.id, igw.id, "routes-to");
    city.add("ec2", {
      id: "web",
      in: subnet.id,
      properties: { name: "web", expose: 443, instanceType: "m5.4xlarge" },
    });
    const sg = city.add("security-group", {
      id: "sg",
      in: vpc.id,
      properties: { ingress: [{ port: 443, cidr: "0.0.0.0/0" }] },
    });
    city.connect(sg.id, serviceId("web"), "attached-to");
    return city;
  },
  goal: {
    kind: "all",
    goals: [
      { kind: "reachable", from: "internet", to: serviceId("web"), port: 443 },
      { kind: "monthly-cost-at-most", max: 150 },
    ],
  },
};

export const puzzles: readonly Puzzle[] = [
  fixSecurityGroupPuzzle,
  addInternetGatewayPuzzle,
  fixPublicDatabasePuzzle,
  rightSizeInstancePuzzle,
];
