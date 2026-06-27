import {
  DomainError,
  SimulationEngine,
  createInitialState,
  type City,
  type WorldState,
} from "@aws-city/domain";
import type { Command } from "../../commands/command";
import { executeCommand } from "../../commands/execute-command";
import { evaluateGoal, type GoalContext } from "../puzzle/goal";
import type { PuzzleEngines } from "../puzzle/puzzle-controller";
import type { Incident } from "./incident";

const TICK_MS = 1000;

export interface IncidentResult {
  readonly ok: boolean;
  readonly error?: string;
  readonly resolved: boolean;
}

/**
 * A headless incident session driven on the simulation timeline. {@link advance}
 * runs the clock; when it reaches the trigger tick the fault is injected and the
 * alert fires. The player then issues commands to restore service.
 */
export class IncidentSession {
  private readonly cityState: City;
  private readonly sim: SimulationEngine;
  private worldState: WorldState;
  private fired = false;

  constructor(
    private readonly incident: Incident,
    private readonly engines: PuzzleEngines & { validation: GoalContext["validation"] },
  ) {
    this.cityState = incident.build();
    this.worldState = createInitialState();
    const trigger = {
      name: "incident-trigger",
      step: (ctx: { state: WorldState; city: City; emit: (t: string, p?: Record<string, unknown>) => void }) => {
        if (!this.fired && ctx.state.tick >= incident.triggerTick) {
          incident.inject(ctx.city);
          this.fired = true;
          ctx.emit("incident-fired", { id: incident.id });
        }
        return ctx.state;
      },
    };
    this.sim = new SimulationEngine([trigger]);
  }

  get city(): City {
    return this.cityState;
  }

  get tick(): number {
    return this.worldState.tick;
  }

  get hasFired(): boolean {
    return this.fired;
  }

  advance(ticks = 1): void {
    for (let i = 0; i < ticks; i++) {
      this.worldState = this.sim.tick(this.worldState, this.cityState, TICK_MS).state;
    }
  }

  get resolved(): boolean {
    return this.fired && evaluateGoal(this.incident.goal, this.context());
  }

  /** Active alerts: the headline plus current diagnostics, until resolved. */
  get alerts(): readonly string[] {
    if (!this.fired || this.resolved) return [];
    const diagnostics = this.engines.validation.run(this.cityState).map((d) => d.title);
    return [this.incident.alert, ...diagnostics];
  }

  apply(command: Command): IncidentResult {
    try {
      executeCommand(this.cityState, command);
      return { ok: true, resolved: this.resolved };
    } catch (err) {
      if (err instanceof DomainError) return { ok: false, error: err.message, resolved: this.resolved };
      throw err;
    }
  }

  private context(): GoalContext {
    return {
      city: this.cityState,
      validation: this.engines.validation,
      ...(this.engines.cost ? { cost: this.engines.cost } : {}),
      ...(this.engines.security ? { security: this.engines.security } : {}),
    };
  }
}
