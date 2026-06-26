import type { City } from "../../model/city";
import type { ServiceId } from "../../model/ids";
import { NetworkingEngine } from "../networking/networking-engine";

export type Severity = "error" | "warning" | "info";

/**
 * A player-facing finding about the city. `code` is machine-readable (for hints
 * and tests), `targets` are the services to highlight, and `fixSuggestionId`
 * links to a remediation hint (used by the AI hint system in M11).
 */
export interface Diagnostic {
  readonly code: string;
  readonly severity: Severity;
  readonly title: string;
  readonly message: string;
  readonly targets: readonly ServiceId[];
  readonly fixSuggestionId?: string;
}

/** What a rule may read while evaluating. Engines build on engines. */
export interface ValidationContext {
  readonly city: City;
  readonly network: NetworkingEngine;
}

/** A pluggable check. New checks are new rules — the engine never changes. */
export interface ValidationRule {
  readonly code: string;
  evaluate(context: ValidationContext): readonly Diagnostic[];
}

const SEVERITY_ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

/**
 * Runs a set of {@link ValidationRule}s against a city and returns the merged,
 * deterministically-ordered list of diagnostics. Stateless and read-only.
 */
export class ValidationEngine {
  constructor(private readonly rules: readonly ValidationRule[]) {}

  run(city: City): readonly Diagnostic[] {
    const context: ValidationContext = { city, network: new NetworkingEngine(city) };
    const diagnostics = this.rules.flatMap((rule) => [...rule.evaluate(context)]);
    return diagnostics.sort(
      (a, b) =>
        SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.code.localeCompare(b.code),
    );
  }
}
