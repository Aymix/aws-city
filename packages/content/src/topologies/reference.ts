import { City } from "@aws-city/domain";
import { createAwsRegistry } from "../aws";

/**
 * Reference topologies used as fixtures across the engines (M2+). They are built
 * purely through the City aggregate's public API — proving the M1 model can
 * express real AWS designs. Relationship-type conventions established here
 * (`attached-to`, `associated-with`, `routes-to`) are what the networking engine
 * will interpret in M2.
 */

/** A public web server: VPC → public subnet → EC2, reachable via an IGW. */
export function buildPublicWebServer(): City {
  const city = new City(createAwsRegistry());

  const vpc = city.add("vpc", { properties: { cidr: "10.0.0.0/16" } });
  const subnet = city.add("subnet", {
    in: vpc.id,
    properties: { cidr: "10.0.1.0/24", public: true },
  });

  const igw = city.add("internet-gateway");
  city.connect(igw.id, vpc.id, "attached-to");

  const routeTable = city.add("route-table", { in: vpc.id });
  city.connect(routeTable.id, subnet.id, "associated-with");
  city.connect(routeTable.id, igw.id, "routes-to");

  const web = city.add("ec2", { in: subnet.id, properties: { name: "web" } });
  const sg = city.add("security-group", {
    in: vpc.id,
    properties: { ingress: [{ port: 443, cidr: "0.0.0.0/0" }] },
  });
  city.connect(sg.id, web.id, "attached-to");

  return city;
}

/** A private database: VPC → private subnet → EC2, deliberately with no IGW. */
export function buildPrivateDatabase(): City {
  const city = new City(createAwsRegistry());

  const vpc = city.add("vpc", { properties: { cidr: "10.0.0.0/16" } });
  const subnet = city.add("subnet", {
    in: vpc.id,
    properties: { cidr: "10.0.2.0/24", public: false },
  });

  const db = city.add("ec2", { in: subnet.id, properties: { name: "db" } });
  const sg = city.add("security-group", {
    in: vpc.id,
    properties: { ingress: [{ port: 5432, cidr: "10.0.0.0/16" }] },
  });
  city.connect(sg.id, db.id, "attached-to");

  return city;
}
