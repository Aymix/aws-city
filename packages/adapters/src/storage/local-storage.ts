import type { StoragePort } from "@aws-city/application";
import type { CitySnapshot } from "@aws-city/domain";

/**
 * A StoragePort backed by the browser's localStorage. Keys are namespaced so we
 * can list saved cities. Not exercised in node tests (no localStorage there);
 * the logic mirrors {@link InMemoryStorage}, which is fully tested.
 */
export class LocalStorageAdapter implements StoragePort {
  constructor(private readonly prefix = "aws-city:") {}

  save(key: string, snapshot: CitySnapshot): Promise<void> {
    localStorage.setItem(this.prefix + key, JSON.stringify(snapshot));
    return Promise.resolve();
  }

  load(key: string): Promise<CitySnapshot | null> {
    const raw = localStorage.getItem(this.prefix + key);
    return Promise.resolve(raw ? (JSON.parse(raw) as CitySnapshot) : null);
  }

  list(): Promise<readonly string[]> {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(this.prefix)) keys.push(k.slice(this.prefix.length));
    }
    return Promise.resolve(keys);
  }

  remove(key: string): Promise<void> {
    localStorage.removeItem(this.prefix + key);
    return Promise.resolve();
  }
}
