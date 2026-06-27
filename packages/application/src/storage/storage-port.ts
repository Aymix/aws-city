import type { CitySnapshot } from "@aws-city/domain";

/**
 * Port for persisting city snapshots. Implemented by adapters (in-memory,
 * localStorage, …). Async so remote/IndexedDB backends fit the same contract.
 */
export interface StoragePort {
  save(key: string, snapshot: CitySnapshot): Promise<void>;
  load(key: string): Promise<CitySnapshot | null>;
  list(): Promise<readonly string[]>;
  remove(key: string): Promise<void>;
}
