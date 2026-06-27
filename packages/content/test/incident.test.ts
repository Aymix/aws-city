import { IncidentSession } from "@aws-city/application";
import { SecurityEngine, serviceId } from "@aws-city/domain";
import { describe, expect, it } from "vitest";
import { createAwsValidationEngine } from "../src/aws/rules";
import { sshExposureIncident } from "../src/incidents";

function session(): IncidentSession {
  return new IncidentSession(sshExposureIncident, {
    validation: createAwsValidationEngine(),
    security: new SecurityEngine(),
  });
}

describe("Incident: Midnight Intruder (SSH exposure)", () => {
  it("is healthy until the trigger tick, then alerts", () => {
    const s = session();
    s.advance(2);
    expect(s.hasFired).toBe(false);
    s.advance(1); // tick 3 -> fires
    expect(s.hasFired).toBe(true);
    expect(s.alerts.length).toBeGreaterThan(0);
    expect(s.resolved).toBe(false);
  });

  it("is resolved by closing SSH to the world", () => {
    const s = session();
    s.advance(3);
    const result = s.apply({
      type: "update-properties",
      id: serviceId("sg"),
      properties: { ingress: [{ port: 443, cidr: "0.0.0.0/0" }] },
    });
    expect(result.resolved).toBe(true);
    expect(s.alerts).toEqual([]);
  });
});
