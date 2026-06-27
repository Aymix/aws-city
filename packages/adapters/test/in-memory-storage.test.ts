import type { CitySnapshot } from "@aws-city/domain";
import { describe, expect, it } from "vitest";
import { InMemoryStorage } from "../src/storage/in-memory-storage";

const snapshot: CitySnapshot = { version: 1, services: [{ id: "vpc", kind: "vpc", properties: {} }], connections: [] };

describe("InMemoryStorage", () => {
  it("saves and loads a snapshot", async () => {
    const storage = new InMemoryStorage();
    await storage.save("my-city", snapshot);
    expect(await storage.load("my-city")).toEqual(snapshot);
  });

  it("returns null for a missing key", async () => {
    expect(await new InMemoryStorage().load("nope")).toBeNull();
  });

  it("lists and removes keys", async () => {
    const storage = new InMemoryStorage();
    await storage.save("a", snapshot);
    await storage.save("b", snapshot);
    expect([...(await storage.list())].sort()).toEqual(["a", "b"]);
    await storage.remove("a");
    expect(await storage.list()).toEqual(["b"]);
  });
});
