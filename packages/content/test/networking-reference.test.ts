import { NetworkingEngine } from "@aws-city/domain";
import { describe, expect, it } from "vitest";
import { buildPrivateDatabase, buildPublicWebServer } from "../src/topologies/reference";

describe("networking over reference topologies", () => {
  it("public web server is reachable from the internet on 443", () => {
    const city = buildPublicWebServer();
    const web = city.byKind("ec2")[0]!;
    const result = new NetworkingEngine(city).reachability({
      from: "internet",
      to: web.id,
      port: 443,
    });
    expect(result.reachable).toBe(true);
  });

  it("public web server can also egress to the internet (public subnet)", () => {
    const city = buildPublicWebServer();
    const web = city.byKind("ec2")[0]!;
    const result = new NetworkingEngine(city).reachability({
      from: web.id,
      to: "internet",
      port: 443,
    });
    expect(result.reachable).toBe(true);
  });

  it("private database is NOT reachable from the internet (no gateway)", () => {
    const city = buildPrivateDatabase();
    const db = city.byKind("ec2")[0]!;
    const result = new NetworkingEngine(city).reachability({
      from: "internet",
      to: db.id,
      port: 5432,
    });
    expect(result.reachable).toBe(false);
    expect(result.blockedReason?.code).toBe("NO_INTERNET_GATEWAY");
  });
});
