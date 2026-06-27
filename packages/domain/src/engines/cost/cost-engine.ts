import type { City } from "../../model/city";
import type { ServiceId } from "../../model/ids";
import type { ServiceRegistry } from "../../registry/service-registry";
import type { SimulationSystem } from "../../simulation/simulation-engine";

export const HOURS_PER_MONTH = 730;

export interface CostLine {
  readonly id: ServiceId;
  readonly kind: string;
  readonly hourly: number;
  readonly monthly: number;
}

/**
 * Computes the operating cost of a city from per-service cost models registered
 * on their ServiceDefinitions. Stateless and read-only.
 */
export class CostEngine {
  constructor(private readonly registry: ServiceRegistry) {}

  hourlyCost(city: City): number {
    return city.all().reduce((sum, service) => {
      const def = this.registry.get(service.kind);
      return sum + (def?.cost ? def.cost(service) : 0);
    }, 0);
  }

  monthlyCost(city: City): number {
    return this.hourlyCost(city) * HOURS_PER_MONTH;
  }

  breakdown(city: City): readonly CostLine[] {
    return city.all().map((service) => {
      const def = this.registry.get(service.kind);
      const hourly = def?.cost ? def.cost(service) : 0;
      return { id: service.id, kind: service.kind, hourly, monthly: hourly * HOURS_PER_MONTH };
    });
  }
}

/**
 * A simulation system that accrues spend over time, emitting a `cost-accrued`
 * event each tick. This is how FinOps mode shows a running bill.
 */
export function createCostSystem(costEngine: CostEngine): SimulationSystem {
  return {
    name: "cost",
    step: (ctx) => {
      const hourly = costEngine.hourlyCost(ctx.city);
      const accrued = (hourly * ctx.dt) / 3_600_000; // dt is in ms
      ctx.emit("cost-accrued", { hourly, accrued });
      return ctx.state;
    },
  };
}
