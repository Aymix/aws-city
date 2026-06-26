import type { City, SimulationEngine, SimulationEvent, WorldState } from "@aws-city/domain";

export interface AdvanceResult {
  readonly events: readonly SimulationEvent[];
  /** Number of fixed steps executed during this advance. */
  readonly steps: number;
}

/**
 * The core game loop: a fixed-timestep accumulator that decouples simulation
 * rate from render frame rate. A renderer calls {@link advance} once per frame
 * with the real elapsed time; the loop runs as many *fixed* steps as fit, so the
 * simulation is deterministic regardless of frame timing.
 *
 * This is the application-layer wrapper around the pure domain SimulationEngine.
 */
export class GameLoop {
  private accumulatorMs = 0;
  private current: WorldState;

  constructor(
    private readonly engine: SimulationEngine,
    private readonly city: City,
    private readonly fixedStepMs: number,
    initialState: WorldState,
    /** Cap on steps per advance — prevents the "spiral of death" on huge deltas. */
    private readonly maxStepsPerAdvance = 240,
  ) {
    this.current = initialState;
  }

  get state(): WorldState {
    return this.current;
  }

  advance(realDeltaMs: number): AdvanceResult {
    this.accumulatorMs += realDeltaMs;
    const events: SimulationEvent[] = [];
    let steps = 0;

    while (this.accumulatorMs >= this.fixedStepMs && steps < this.maxStepsPerAdvance) {
      const result = this.engine.tick(this.current, this.city, this.fixedStepMs);
      this.current = result.state;
      events.push(...result.events);
      this.accumulatorMs -= this.fixedStepMs;
      steps += 1;
    }

    // If we hit the cap, drop the unprocessed backlog rather than carrying it
    // forward forever (which would make the loop fall further behind each frame).
    if (steps >= this.maxStepsPerAdvance) {
      this.accumulatorMs = 0;
    }

    return { events, steps };
  }
}
