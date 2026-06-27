import type { Incident } from "@aws-city/application";
import { City, serviceId } from "@aws-city/domain";
import { createAwsRegistry } from "../aws";

/**
 * A healthy web server whose security group is silently widened to expose SSH to
 * the world at tick 3 — an intrusion vector. Resolve by closing port 22.
 */
export const sshExposureIncident: Incident = {
  id: "ssh-exposure",
  title: "Midnight Intruder",
  briefing: "At 03:00 an alarm fires: someone opened the city gates to the world. Find it and shut it.",
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
    const sg = city.add("security-group", {
      id: "sg",
      in: vpc.id,
      properties: { ingress: [{ port: 443, cidr: "0.0.0.0/0" }] },
    });
    city.connect(sg.id, serviceId("web"), "attached-to");
    return city;
  },
  triggerTick: 3,
  inject: (city) => {
    // SSH (22) is opened to the whole internet.
    city.updateProperties(serviceId("sg"), {
      ingress: [
        { port: 443, cidr: "0.0.0.0/0" },
        { port: 22, cidr: "0.0.0.0/0" },
      ],
    });
  },
  alert: "🚨 ALERT: SSH brute-force traffic detected from the internet",
  goal: { kind: "attack-repelled", attack: { kind: "ssh-brute-force" } },
};

export const incidents: readonly Incident[] = [sshExposureIncident];
