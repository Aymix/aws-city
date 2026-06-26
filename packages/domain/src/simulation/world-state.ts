import type { ServiceId } from "../model/ids";

/** Runtime, per-service metrics that evolve during the simulation. */
export interface ServiceMetrics {
  /** Normalized load/utilization. Systems define exact semantics. */
  readonly load: number;
}

/**
 * An immutable snapshot of the simulation at one tick. The City topology is NOT
 * part of the snapshot (it is the player's design, passed into each tick); the
 * WorldState holds only simulation-derived state: the clock, per-service
 * metrics, and the seeded RNG cursor.
 */
export interface WorldState {
  readonly tick: number;
  readonly elapsedMs: number;
  readonly metrics: ReadonlyMap<ServiceId, ServiceMetrics>;
  readonly rngState: number;
}

export interface InitialStateOptions {
  readonly seed?: number;
}

export function createInitialState(opts: InitialStateOptions = {}): WorldState {
  return {
    tick: 0,
    elapsedMs: 0,
    metrics: new Map(),
    rngState: opts.seed ?? 1,
  };
}

export function getMetrics(state: WorldState, id: ServiceId): ServiceMetrics | undefined {
  return state.metrics.get(id);
}

/** Returns a new WorldState with the given service's metrics replaced. */
export function setMetrics(state: WorldState, id: ServiceId, metrics: ServiceMetrics): WorldState {
  const next = new Map(state.metrics);
  next.set(id, metrics);
  return { ...state, metrics: next };
}

/**
 * Advances the seeded PRNG (mulberry32). Returns a value in [0, 1) and a new
 * WorldState carrying the next RNG cursor — pure and reproducible, so stochastic
 * systems (e.g. incidents in M10) stay deterministic given a seed.
 */
export function nextRandom(state: WorldState): { value: number; state: WorldState } {
  const a = (state.rngState + 0x6d2b79f5) | 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: { ...state, rngState: a } };
}
