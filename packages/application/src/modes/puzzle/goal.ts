import {
  NetworkingEngine,
  type City,
  type NetworkEndpoint,
  type ServiceId,
  type Severity,
  type ValidationEngine,
} from "@aws-city/domain";

/**
 * A declarative win-condition. Goals are data, evaluated by composing the M2/M3
 * engines — no bespoke win-logic per puzzle. `all`/`any` compose them.
 */
export type Goal =
  | { readonly kind: "no-diagnostics"; readonly minSeverity?: Severity }
  | { readonly kind: "diagnostic-absent"; readonly code: string }
  | {
      readonly kind: "reachable";
      readonly from: NetworkEndpoint;
      readonly to: ServiceId;
      readonly port: number;
    }
  | {
      readonly kind: "not-reachable";
      readonly from: NetworkEndpoint;
      readonly to: ServiceId;
      readonly port: number;
    }
  | { readonly kind: "all"; readonly goals: readonly Goal[] }
  | { readonly kind: "any"; readonly goals: readonly Goal[] };

export interface GoalContext {
  readonly city: City;
  readonly validation: ValidationEngine;
}

const SEVERITY_RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

export function evaluateGoal(goal: Goal, ctx: GoalContext): boolean {
  switch (goal.kind) {
    case "no-diagnostics": {
      const diagnostics = ctx.validation.run(ctx.city);
      const threshold = goal.minSeverity;
      if (threshold === undefined) return diagnostics.length === 0;
      return !diagnostics.some((d) => SEVERITY_RANK[d.severity] <= SEVERITY_RANK[threshold]);
    }
    case "diagnostic-absent": {
      const diagnostics = ctx.validation.run(ctx.city);
      return !diagnostics.some((d) => d.code === goal.code);
    }
    case "reachable":
      return new NetworkingEngine(ctx.city).reachability({
        from: goal.from,
        to: goal.to,
        port: goal.port,
      }).reachable;
    case "not-reachable":
      return !new NetworkingEngine(ctx.city).reachability({
        from: goal.from,
        to: goal.to,
        port: goal.port,
      }).reachable;
    case "all":
      return goal.goals.every((g) => evaluateGoal(g, ctx));
    case "any":
      return goal.goals.some((g) => evaluateGoal(g, ctx));
  }
}
