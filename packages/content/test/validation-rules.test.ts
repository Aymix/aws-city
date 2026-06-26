import { City } from "@aws-city/domain";
import { describe, expect, it } from "vitest";
import { createAwsRegistry } from "../src/aws";
import { createAwsValidationEngine } from "../src/aws/rules";

function newCity(): City {
  return new City(createAwsRegistry());
}

function codes(city: City): string[] {
  return createAwsValidationEngine()
    .run(city)
    .map((d) => d.code);
}

/** A correct, internet-reachable web server: VPC → public subnet → EC2(:443). */
function cleanPublicWeb(): City {
  const city = newCity();
  const vpc = city.add("vpc");
  const subnet = city.add("subnet", { in: vpc.id, properties: { public: true } });
  const igw = city.add("internet-gateway");
  city.connect(igw.id, vpc.id, "attached-to");
  const rt = city.add("route-table", { in: vpc.id });
  city.connect(rt.id, subnet.id, "associated-with");
  city.connect(rt.id, igw.id, "routes-to");
  const web = city.add("ec2", { in: subnet.id, properties: { name: "web", expose: 443 } });
  const sg = city.add("security-group", {
    in: vpc.id,
    properties: { ingress: [{ port: 443, cidr: "0.0.0.0/0" }] },
  });
  city.connect(sg.id, web.id, "attached-to");
  return city;
}

describe("AWS validation rules", () => {
  it("a correct public web server produces no diagnostics", () => {
    expect(codes(cleanPublicWeb())).toEqual([]);
  });

  it("PUBLIC_ADMIN_PORT: flags SSH open to the world", () => {
    const city = newCity();
    const vpc = city.add("vpc");
    const subnet = city.add("subnet", { in: vpc.id });
    const ec2 = city.add("ec2", { in: subnet.id });
    const sg = city.add("security-group", {
      in: vpc.id,
      properties: { ingress: [{ port: 22, cidr: "0.0.0.0/0" }] },
    });
    city.connect(sg.id, ec2.id, "attached-to");

    const diags = createAwsValidationEngine().run(city);
    const admin = diags.find((d) => d.code === "PUBLIC_ADMIN_PORT");
    expect(admin).toBeDefined();
    expect(admin!.severity).toBe("error");
    expect(admin!.targets).toContain(sg.id);
  });

  it("PUBLIC_DATABASE_EXPOSURE: flags an internet-reachable database", () => {
    const city = newCity();
    const vpc = city.add("vpc");
    const subnet = city.add("subnet", { in: vpc.id, properties: { public: true } });
    const igw = city.add("internet-gateway");
    city.connect(igw.id, vpc.id, "attached-to");
    const rt = city.add("route-table", { in: vpc.id });
    city.connect(rt.id, subnet.id, "associated-with");
    city.connect(rt.id, igw.id, "routes-to");
    const db = city.add("ec2", { in: subnet.id, properties: { role: "database", port: 5432 } });
    const sg = city.add("security-group", {
      in: vpc.id,
      properties: { ingress: [{ port: 5432, cidr: "0.0.0.0/0" }] },
    });
    city.connect(sg.id, db.id, "attached-to");

    expect(codes(city)).toContain("PUBLIC_DATABASE_EXPOSURE");
  });

  it("PUBLIC_DATABASE_EXPOSURE: does NOT flag a private database", () => {
    const city = newCity();
    const vpc = city.add("vpc");
    const subnet = city.add("subnet", { in: vpc.id, properties: { public: false } });
    const db = city.add("ec2", { in: subnet.id, properties: { role: "database", port: 5432 } });
    const sg = city.add("security-group", {
      in: vpc.id,
      properties: { ingress: [{ port: 5432, cidr: "10.0.0.0/16" }] },
    });
    city.connect(sg.id, db.id, "attached-to");

    expect(codes(city)).not.toContain("PUBLIC_DATABASE_EXPOSURE");
  });

  it("EXPOSED_SERVICE_UNREACHABLE: flags a service meant to be public but blocked", () => {
    const city = newCity();
    const vpc = city.add("vpc");
    const subnet = city.add("subnet", { in: vpc.id });
    // expose:443 but no internet gateway -> unreachable
    const web = city.add("ec2", { in: subnet.id, properties: { expose: 443 } });
    const sg = city.add("security-group", {
      in: vpc.id,
      properties: { ingress: [{ port: 443, cidr: "0.0.0.0/0" }] },
    });
    city.connect(sg.id, web.id, "attached-to");

    const diags = createAwsValidationEngine().run(city);
    const finding = diags.find((d) => d.code === "EXPOSED_SERVICE_UNREACHABLE");
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe("warning");
    expect(finding!.message).toContain("NO_INTERNET_GATEWAY");
  });

  it("ORPHANED_SECURITY_GROUP: flags a security group attached to nothing", () => {
    const city = newCity();
    const vpc = city.add("vpc");
    city.add("security-group", { in: vpc.id });
    expect(codes(city)).toContain("ORPHANED_SECURITY_GROUP");
  });
});
