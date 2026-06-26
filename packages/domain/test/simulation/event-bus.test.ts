import { describe, expect, it, vi } from "vitest";
import { EventBus } from "../../src/simulation/event-bus";

interface Ping {
  readonly type: "ping";
  readonly n: number;
}

describe("EventBus", () => {
  it("delivers emitted events to a subscriber", () => {
    const bus = new EventBus<Ping>();
    const listener = vi.fn();
    bus.on(listener);
    bus.emit({ type: "ping", n: 1 });
    expect(listener).toHaveBeenCalledWith({ type: "ping", n: 1 });
  });

  it("delivers to every subscriber", () => {
    const bus = new EventBus<Ping>();
    const a = vi.fn();
    const b = vi.fn();
    bus.on(a);
    bus.on(b);
    bus.emit({ type: "ping", n: 2 });
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });

  it("stops delivery after unsubscribe via the returned disposer", () => {
    const bus = new EventBus<Ping>();
    const listener = vi.fn();
    const off = bus.on(listener);
    off();
    bus.emit({ type: "ping", n: 3 });
    expect(listener).not.toHaveBeenCalled();
  });

  it("clear() removes all subscribers", () => {
    const bus = new EventBus<Ping>();
    const listener = vi.fn();
    bus.on(listener);
    bus.clear();
    bus.emit({ type: "ping", n: 4 });
    expect(listener).not.toHaveBeenCalled();
  });

  it("emitting with no subscribers is a no-op", () => {
    const bus = new EventBus<Ping>();
    expect(() => bus.emit({ type: "ping", n: 5 })).not.toThrow();
  });
});
