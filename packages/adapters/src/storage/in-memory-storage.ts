import type { StoragePort } from "@aws-city/application";
import type { CitySnapshot } from "@aws-city/domain";

/** A non-persistent StoragePort backed by a Map. Useful for tests and previews. */
export class InMemoryStorage implements StoragePort {
  private readonly store = new Map<string, CitySnapshot>();

  save(key: string, snapshot: CitySnapshot): Promise<void> {
    this.store.set(key, snapshot);
    return Promise.resolve();
  }

  load(key: string): Promise<CitySnapshot | null> {
    return Promise.resolve(this.store.get(key) ?? null);
  }

  list(): Promise<readonly string[]> {
    return Promise.resolve([...this.store.keys()]);
  }

  remove(key: string): Promise<void> {
    this.store.delete(key);
    return Promise.resolve();
  }
}
