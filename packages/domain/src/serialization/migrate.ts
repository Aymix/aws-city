import { DomainError } from "../invariant";
import { SCHEMA_VERSION, type CitySnapshot } from "./snapshot";

interface VersionedPayload {
  readonly version: number;
  readonly [key: string]: unknown;
}

/**
 * Stepwise migrations keyed by the version they upgrade *from*. Each returns the
 * payload one version newer. This is what protects players' saved cities across
 * future schema changes.
 *
 * v0 → v1: the legacy format used `nodes` with a `parentId` field.
 */
const MIGRATIONS: Record<number, (payload: VersionedPayload) => VersionedPayload> = {
  0: (payload) => {
    const nodes = Array.isArray(payload["nodes"]) ? (payload["nodes"] as Array<Record<string, unknown>>) : [];
    return {
      version: 1,
      services: nodes.map((n) => ({
        id: n["id"],
        kind: n["kind"],
        properties: n["properties"] ?? {},
        ...(n["parentId"] !== undefined ? { in: n["parentId"] } : {}),
      })),
      connections: payload["connections"] ?? [],
    };
  },
};

/** Upgrades any older snapshot to the current schema version. */
export function migrate(payload: unknown): CitySnapshot {
  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof (payload as { version?: unknown }).version !== "number"
  ) {
    throw new DomainError("Invalid snapshot: missing numeric version");
  }
  let current = payload as VersionedPayload;
  while (current.version < SCHEMA_VERSION) {
    const step = MIGRATIONS[current.version];
    invariantStep(step, current.version);
    current = step(current);
  }
  if (current.version !== SCHEMA_VERSION) {
    throw new DomainError(`Unsupported snapshot version ${current.version} (newer than ${SCHEMA_VERSION})`);
  }
  return current as unknown as CitySnapshot;
}

function invariantStep(
  step: ((p: VersionedPayload) => VersionedPayload) | undefined,
  version: number,
): asserts step is (p: VersionedPayload) => VersionedPayload {
  if (!step) throw new DomainError(`No migration registered from snapshot version ${version}`);
}
