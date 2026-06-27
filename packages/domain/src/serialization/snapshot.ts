/** The current on-disk schema version. Bump when the shape changes + add a migration. */
export const SCHEMA_VERSION = 1;

export interface SerializedService {
  readonly id: string;
  readonly kind: string;
  readonly properties: Record<string, unknown>;
  /** Containing parent id, if any. */
  readonly in?: string;
}

export interface SerializedConnection {
  readonly from: string;
  readonly to: string;
  readonly type: string;
}

/** A versioned, JSON-serializable snapshot of a City. */
export interface CitySnapshot {
  readonly version: number;
  readonly services: readonly SerializedService[];
  readonly connections: readonly SerializedConnection[];
}
