import {
  City,
  ServiceRegistry,
  SimulationEngine,
  createInitialState,
  getMetrics,
  setMetrics,
  type SimulationSystem,
} from "@aws-city/domain";
import { beforeEach, describe, expect, it } from "vitest";
import { GameLoop } from "../src/loop/game-loop";

function emptyCity(): City {
  return new City(
    ServiceRegistry.from([
      { kind: "ec2", provider: "aws", category: "compute", displayName: "EC2", containment: { allowedIn: [] } },
    ]),
  );
}

const FIXED_STEP = 10;

describe("GameLoop — fixed-timestep accumulator", () => {
  let city: City;
  beforeEach(() => {
    city = emptyCity();
  });

  it("runs one fixed step per elapsed step worth of real time", () => {
    const loop = new GameLoop(new SimulationEngine([]), city, FIXED_STEP, createInitialState());
    const { steps } = loop.advance(100);
    expect(steps).toBe(10);
    expect(loop.state.tick).toBe(10);
    expect(loop.state.elapsedMs).toBe(100);
  });

  it("is frame-rate independent: one 100ms advance equals ten 10ms advances", () => {
    const counter: SimulationSystem = {
      name: "counter",
      step: (ctx) => {
        const ec2 = ctx.city.all()[0]!;
        const load = (getMetrics(ctx.state, ec2.id)?.load ?? 0) + 1;
        return setMetrics(ctx.state, ec2.id, { load });
      },
    };
    city.add("ec2");
    const ec2Id = city.all()[0]!.id;

    const big = new GameLoop(new SimulationEngine([counter]), city, FIXED_STEP, createInitialState());
    big.advance(100);

    const small = new GameLoop(
      new SimulationEngine([counter]),
      city,
      FIXED_STEP,
      createInitialState(),
    );
    for (let i = 0; i < 10; i++) small.advance(10);

    expect(big.state.tick).toBe(small.state.tick);
    expect(getMetrics(big.state, ec2Id)?.load).toBe(getMetrics(small.state, ec2Id)?.load);
  });

  it("carries leftover time across advances", () => {
    const loop = new GameLoop(new SimulationEngine([]), city, FIXED_STEP, createInitialState());
    expect(loop.advance(15).steps).toBe(1); // 5ms remains in the accumulator
    expect(loop.advance(5).steps).toBe(1); // 5 + 5 = 10 -> one more step
    expect(loop.state.tick).toBe(2);
  });

  it("does not step when less than one fixed step has elapsed", () => {
    const loop = new GameLoop(new SimulationEngine([]), city, FIXED_STEP, createInitialState());
    expect(loop.advance(4).steps).toBe(0);
    expect(loop.state.tick).toBe(0);
  });

  it("clamps runaway deltas to avoid the spiral of death", () => {
    const loop = new GameLoop(
      new SimulationEngine([]),
      city,
      FIXED_STEP,
      createInitialState(),
      5, // maxStepsPerAdvance
    );
    const { steps } = loop.advance(10_000);
    expect(steps).toBe(5);
    // the unprocessed backlog is dropped, not carried forever
    expect(loop.advance(0).steps).toBe(0);
  });

  it("aggregates events emitted across all steps in one advance", () => {
    const beeper: SimulationSystem = {
      name: "beeper",
      step: (ctx) => {
        ctx.emit("beep");
        return ctx.state;
      },
    };
    const loop = new GameLoop(new SimulationEngine([beeper]), city, FIXED_STEP, createInitialState());
    const { events } = loop.advance(30);
    expect(events).toHaveLength(3);
    expect(events.every((e) => e.type === "beep")).toBe(true);
  });
});
