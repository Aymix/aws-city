import { describe, expect, it } from "vitest";
import { City } from "../../../src/model/city";
import { ServiceRegistry } from "../../../src/registry/service-registry";
import {
  ValidationEngine,
  type Diagnostic,
  type ValidationRule,
} from "../../../src/engines/validation/validation-engine";

function emptyCity(): City {
  return new City(
    ServiceRegistry.from([
      { kind: "vpc", provider: "aws", category: "network", displayName: "VPC", containment: { allowedIn: [] } },
    ]),
  );
}

function rule(code: string, diagnostics: Diagnostic[]): ValidationRule {
  return { code, evaluate: () => diagnostics };
}

const warn: Diagnostic = {
  code: "W",
  severity: "warning",
  title: "warn",
  message: "m",
  targets: [],
};
const err: Diagnostic = { code: "E", severity: "error", title: "err", message: "m", targets: [] };
const info: Diagnostic = { code: "I", severity: "info", title: "info", message: "m", targets: [] };

describe("ValidationEngine", () => {
  it("returns no diagnostics when there are no rules", () => {
    expect(new ValidationEngine([]).run(emptyCity())).toEqual([]);
  });

  it("aggregates diagnostics from every rule", () => {
    const engine = new ValidationEngine([rule("a", [err]), rule("b", [warn, info])]);
    expect(engine.run(emptyCity())).toHaveLength(3);
  });

  it("orders diagnostics by severity: error → warning → info", () => {
    const engine = new ValidationEngine([rule("a", [info]), rule("b", [warn]), rule("c", [err])]);
    expect(engine.run(emptyCity()).map((d) => d.severity)).toEqual(["error", "warning", "info"]);
  });

  it("passes a context exposing the city and a networking engine to each rule", () => {
    let seenCity: City | undefined;
    let hasNetwork = false;
    const probe: ValidationRule = {
      code: "probe",
      evaluate: (ctx) => {
        seenCity = ctx.city;
        hasNetwork = typeof ctx.network.reachability === "function";
        return [];
      },
    };
    const city = emptyCity();
    new ValidationEngine([probe]).run(city);
    expect(seenCity).toBe(city);
    expect(hasNetwork).toBe(true);
  });
});
