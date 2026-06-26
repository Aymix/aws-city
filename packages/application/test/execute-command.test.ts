import { City, DomainError, ServiceRegistry, serviceId } from "@aws-city/domain";
import { beforeEach, describe, expect, it } from "vitest";
import { executeCommand } from "../src/commands/execute-command";

function registry(): ServiceRegistry {
  return ServiceRegistry.from([
    { kind: "vpc", provider: "aws", category: "network", displayName: "VPC", containment: { allowedIn: [] } },
    { kind: "subnet", provider: "aws", category: "network", displayName: "Subnet", containment: { allowedIn: ["vpc"] } },
    { kind: "ec2", provider: "aws", category: "compute", displayName: "EC2", containment: { allowedIn: ["subnet"] } },
    { kind: "internet-gateway", provider: "aws", category: "network", displayName: "IGW", containment: { allowedIn: [] } },
  ]);
}

describe("executeCommand", () => {
  let city: City;
  beforeEach(() => {
    city = new City(registry());
  });

  it("add-service adds a service inside a parent", () => {
    executeCommand(city, { type: "add-service", kind: "vpc", id: "vpc-1" });
    executeCommand(city, { type: "add-service", kind: "subnet", id: "sn-1", in: serviceId("vpc-1") });
    expect(city.has(serviceId("sn-1"))).toBe(true);
    expect(city.parentOf(serviceId("sn-1"))).toBe(serviceId("vpc-1"));
  });

  it("update-properties merges a patch", () => {
    executeCommand(city, { type: "add-service", kind: "vpc", id: "vpc-1", properties: { cidr: "10.0.0.0/16" } });
    executeCommand(city, { type: "update-properties", id: serviceId("vpc-1"), properties: { name: "main" } });
    expect(city.require(serviceId("vpc-1")).properties).toEqual({ cidr: "10.0.0.0/16", name: "main" });
  });

  it("connect / disconnect create and remove edges", () => {
    executeCommand(city, { type: "add-service", kind: "vpc", id: "vpc-1" });
    executeCommand(city, { type: "add-service", kind: "internet-gateway", id: "igw-1" });
    executeCommand(city, {
      type: "connect",
      from: serviceId("igw-1"),
      to: serviceId("vpc-1"),
      connectionType: "attached-to",
    });
    expect(city.connections()).toHaveLength(1);
    executeCommand(city, {
      type: "disconnect",
      from: serviceId("igw-1"),
      to: serviceId("vpc-1"),
      connectionType: "attached-to",
    });
    expect(city.connections()).toHaveLength(0);
  });

  it("remove-service removes a service", () => {
    executeCommand(city, { type: "add-service", kind: "vpc", id: "vpc-1" });
    executeCommand(city, { type: "remove-service", id: serviceId("vpc-1") });
    expect(city.has(serviceId("vpc-1"))).toBe(false);
  });

  it("propagates DomainError for an illegal command", () => {
    expect(() =>
      executeCommand(city, {
        type: "connect",
        from: serviceId("ghost"),
        to: serviceId("nope"),
        connectionType: "attached-to",
      }),
    ).toThrow(DomainError);
  });
});
