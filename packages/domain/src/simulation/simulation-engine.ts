import type { City } from "../model/city";
import type { WorldState } from "./world-state";

/** An event produced during a tick. `tick` is stamped by the engine. */
export interface SimulationEvent {
  readonly type: string;
  readonly tick: number;
  readonly payload?: Readonly<Record<string, unknown>>;
}

/** What a system may read/do during a tick. */
export interface SystemContext {
  readonly city: City;
  readonly dt: number;
  /** The state so far this tick (after the clock and any prior systems). */
  readonly state: WorldState;
  /** Emit a domain event, stamped with the current tick by the engine. */
  emit(type: string, payload?: Record<string, unknown>): void;
}

/**
 * A pluggable unit of simulation behavior. Returns the next WorldState. Systems
 * must be pure with respect to their input (return a new state, never mutate).
 * Cost (M8) and incidents (M10) are added as new systems, not engine changes.
 */
export interface SimulationSystem {
  readonly name: string;
  step(context: SystemContext): WorldState;
}

export interface TickResult {
  readonly state: WorldState;
  readonly events: readonly SimulationEvent[];
}

/**
 * The deterministic heartbeat. Each {@link tick} advances the clock by exactly
 * `dt`, then runs every system in order, threading the state through them and
 * collecting emitted events. Pure: the input state is never mutated.
 */
export class SimulationEngine {
  constructor(private readonly systems: readonly SimulationSystem[]) {}

  tick(state: WorldState, city: City, dt: number): TickResult {
    const events: SimulationEvent[] = [];
    const currentTick = state.tick + 1;
    const emit = (type: string, payload?: Record<string, unknown>): void => {
      events.push(payload !== undefined ? { type, tick: currentTick, payload } : { type, tick: currentTick });
    };

    let next: WorldState = { ...state, tick: currentTick, elapsedMs: state.elapsedMs + dt };
    for (const system of this.systems) {
      next = system.step({ city, dt, state: next, emit });
    }
    return { state: next, events };
  }
}
