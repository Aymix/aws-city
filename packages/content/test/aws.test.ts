import { describe, expect, it } from "vitest";
import { createAwsRegistry, awsServiceDefinitions } from "../src/aws";
import { buildPrivateDatabase, buildPublicWebServer } from "../src/topologies/reference";

describe("AWS service pack", () => {
  it("registers the M1 service kinds", () => {
    const registry = createAwsRegistry();
    for (const kind of [
      "vpc",
      "subnet",
      "ec2",
      "security-group",
      "internet-gateway",
      "route-table",
      "nat-gateway",
      "iam-role",
    ]) {
      expect(registry.has(kind)).toBe(true);
    }
  });

  it("declares every definition as an AWS provider", () => {
    expect(awsServiceDefinitions.every((d) => d.provider === "aws")).toBe(true);
  });

  it("declares containment rules that nest ec2 in subnet in vpc", () => {
    const registry = createAwsRegistry();
    expect(registry.require("vpc").containment.allowedIn).toEqual([]);
    expect(registry.require("subnet").containment.allowedIn).toEqual(["vpc"]);
    expect(registry.require("ec2").containment.allowedIn).toEqual(["subnet"]);
  });
});

describe("reference topology: public web server", () => {
  it("builds a vpc → public subnet → ec2 web server reachable design", () => {
    const city = buildPublicWebServer();

    const vpc = city.byKind("vpc")[0];
    const subnet = city.byKind("subnet")[0];
    const ec2 = city.byKind("ec2")[0];
    const igw = city.byKind("internet-gateway")[0];
    expect(vpc).toBeDefined();
    expect(subnet).toBeDefined();
    expect(ec2).toBeDefined();
    expect(igw).toBeDefined();

    // containment: ec2 in subnet in vpc
    expect(city.parentOf(ec2!.id)).toBe(subnet!.id);
    expect(city.parentOf(subnet!.id)).toBe(vpc!.id);

    // an internet gateway is attached to the vpc (what makes it "public")
    expect(
      city.connectionsOf(igw!.id).some((c) => c.type === "attached-to" && c.to === vpc!.id),
    ).toBe(true);

    // a security group is attached to the web server
    const sg = city.byKind("security-group")[0];
    expect(city.connectionsOf(ec2!.id).some((c) => c.from === sg!.id)).toBe(true);
  });
});

describe("reference topology: private database", () => {
  it("builds a vpc → private subnet → ec2 db with no internet gateway", () => {
    const city = buildPrivateDatabase();

    const subnet = city.byKind("subnet")[0];
    const ec2 = city.byKind("ec2")[0];
    expect(city.parentOf(ec2!.id)).toBe(subnet!.id);

    // private: deliberately no internet gateway
    expect(city.byKind("internet-gateway")).toHaveLength(0);
  });
});
