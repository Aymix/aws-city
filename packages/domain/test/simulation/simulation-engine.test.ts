import { describe, expect, it } from "vitest";
import { City } from "../../src/model/city";
import { ServiceRegistry } from "../../src/registry/service-registry";
import {
  SimulationEngine,
  type SimulationSystem,
} from "../../src/simulation/simulation-engine";
import {
  createInitialState,
  getMetrics,
  nextRandom,
  setMetrics,
  type WorldState,
} from "../../src/simulation/world-state";

function emptyCity(): City {
  return new City(
    ServiceRegistry.from([
      { kind: "ec2", provider: "aws", category: "compute", displayName: "EC2", containment: { allowedIn: [] } },
    ]),
  );
}

describe("SimulationEngine.tick", () => {
  it("advances the clock by one tick and by dt", () => {
    const engine = new SimulationEngine([]);
    const { state } = engine.tick(createInitialState(), emptyCity(), 100);
    expect(state.tick).toBe(1);
    expect(state.elapsedMs).toBe(100);
  });

  it("does not mutate the input state (immutability)", () => {
    const engine = new SimulationEngine([]);
    const initial = createInitialState();
    engine.tick(initial, emptyCity(), 100);
    expect(initial.tick).toBe(0);
    expect(initial.elapsedMs).toBe(0);
  });

  it("runs systems in order, threading the state through each", () => {
    const order: string[] = [];
    const sys = (name: string): SimulationSystem => ({
      name,
      step: (ctx) => {
        order.push(name);
        return ctx.state;
      },
    });
    new SimulationEngine([sys("a"), sys("b"), sys("c")]).tick(createInitialState(), emptyCity(), 1);
    expect(order).toEqual(["a", "b", "c"]);
  });

  it("lets a system evolve metrics across ticks", () => {
    const city = emptyCity();
    const ec2 = city.add("ec2");
    const loadSystem: SimulationSystem = {
      name: "load",
      step: (ctx) => {
        const current = getMetrics(ctx.state, ec2.id)?.load ?? 0;
        return setMetrics(ctx.state, ec2.id, { load: current + ctx.dt });
      },
    };
    const engine = new SimulationEngine([loadSystem]);
    let state = createInitialState();
    state = engine.tick(state, city, 10).state;
    state = engine.tick(state, city, 10).state;
    expect(getMetrics(state, ec2.id)?.load).toBe(20);
  });

  it("collects events emitted by systems, stamped with the current tick", () => {
    const beeper: SimulationSystem = {
      name: "beeper",
      step: (ctx) => {
        ctx.emit("beep", { hello: "world" });
        return ctx.state;
      },
    };
    const { events } = new SimulationEngine([beeper]).tick(createInitialState(), emptyCity(), 1);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "beep", tick: 1, payload: { hello: "world" } });
  });

  it("is deterministic: identical inputs produce identical output", () => {
    const city = emptyCity();
    const ec2 = city.add("ec2");
    const noisy: SimulationSystem = {
      name: "noisy",
      step: (ctx) => {
        const { value, state } = nextRandom(ctx.state);
        return setMetrics(state, ec2.id, { load: value });
      },
    };
    const run = (): WorldState => {
      const engine = new SimulationEngine([noisy]);
      let s = createInitialState({ seed: 42 });
      for (let i = 0; i < 5; i++) s = engine.tick(s, city, 10).state;
      return s;
    };
    const a = run();
    const b = run();
    expect(getMetrics(a, ec2.id)?.load).toBe(getMetrics(b, ec2.id)?.load);
    expect(a.rngState).toBe(b.rngState);
  });
});

describe("seeded RNG", () => {
  it("produces a reproducible sequence in [0, 1)", () => {
    const seqFrom = (seed: number): number[] => {
      let s = createInitialState({ seed });
      const out: number[] = [];
      for (let i = 0; i < 4; i++) {
        const r = nextRandom(s);
        out.push(r.value);
        s = r.state;
      }
      return out;
    };
    const first = seqFrom(7);
    expect(seqFrom(7)).toEqual(first);
    expect(first.every((v) => v >= 0 && v < 1)).toBe(true);
    // a different seed yields a different sequence
    expect(seqFrom(8)).not.toEqual(first);
  });
});
