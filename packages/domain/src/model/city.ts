import { invariant } from "../invariant";
import type { ServiceRegistry } from "../registry/service-registry";
import { serviceId, type ServiceId } from "./ids";
import type { Service } from "./service";
import { Connection } from "./value-objects/connection";

/** Options for {@link City.add}. */
export interface AddOptions {
  /** Explicit id; if omitted a sequential `${kind}-${n}` id is generated. */
  readonly id?: string;
  /** Kind-specific property overrides, merged over the definition defaults. */
  readonly properties?: Record<string, unknown>;
  /** The containing parent service (required iff the kind's containment demands it). */
  readonly in?: ServiceId;
}

/**
 * The City aggregate — the single source of truth for an infrastructure layout.
 *
 * It is a typed graph with two relationship kinds:
 *  - **containment** (a tree): enforced strictly via the registry's containment
 *    rules (e.g. an EC2 must live in a subnet);
 *  - **connections** (a graph): typed edges whose meaning is interpreted by
 *    later engines; the City only guarantees both endpoints exist.
 *
 * Every mutating method enforces its invariants and throws a DomainError on
 * violation, so an invalid city cannot be constructed.
 */
export class City {
  private readonly services = new Map<ServiceId, Service>();
  private readonly parents = new Map<ServiceId, ServiceId>();
  private readonly connectionsByKey = new Map<string, Connection>();
  private readonly counters = new Map<string, number>();

  constructor(private readonly registry: ServiceRegistry) {}

  /** Adds a service of the given kind, enforcing containment invariants. */
  add(kind: string, opts: AddOptions = {}): Service {
    const definition = this.registry.require(kind);
    const parent = opts.in;

    if (definition.containment.allowedIn.length === 0) {
      invariant(
        parent === undefined,
        `"${kind}" is a top-level service and cannot be placed inside another service`,
      );
    } else {
      invariant(
        parent !== undefined,
        `"${kind}" must be placed inside one of: ${definition.containment.allowedIn.join(", ")}`,
      );
      const parentService = this.services.get(parent);
      invariant(parentService !== undefined, `Parent service "${parent}" does not exist`);
      invariant(
        definition.containment.allowedIn.includes(parentService.kind),
        `"${kind}" cannot be placed inside "${parentService.kind}"`,
      );
    }

    const id = opts.id !== undefined ? serviceId(opts.id) : this.generateId(kind);
    invariant(!this.services.has(id), `Service id "${id}" already exists`);

    const service: Service = {
      id,
      kind,
      properties: { ...(definition.defaults ?? {}), ...(opts.properties ?? {}) },
    };
    this.services.set(id, service);
    if (parent !== undefined) this.parents.set(id, parent);
    return service;
  }

  /** Removes a leaf service and any connections touching it. */
  remove(id: ServiceId): void {
    invariant(this.services.has(id), `Service "${id}" does not exist`);
    const children = this.childrenOf(id);
    invariant(
      children.length === 0,
      `Cannot remove "${id}": it still contains ${children.length} service(s)`,
    );
    for (const [key, connection] of this.connectionsByKey) {
      if (connection.from === id || connection.to === id) this.connectionsByKey.delete(key);
    }
    this.parents.delete(id);
    this.services.delete(id);
  }

  /** Shallow-merges a property patch into an existing service, returning it. */
  updateProperties(id: ServiceId, patch: Record<string, unknown>): Service {
    const existing = this.require(id);
    const updated: Service = { ...existing, properties: { ...existing.properties, ...patch } };
    this.services.set(id, updated);
    return updated;
  }

  /** Creates a typed edge between two existing, distinct services. */
  connect(from: ServiceId, to: ServiceId, type: string): Connection {
    invariant(this.services.has(from), `Connection source "${from}" does not exist`);
    invariant(this.services.has(to), `Connection target "${to}" does not exist`);
    invariant(from !== to, `Cannot connect a service to itself ("${from}")`);
    const connection = new Connection(from, to, type);
    invariant(
      !this.connectionsByKey.has(connection.key()),
      `Connection ${connection.key()} already exists`,
    );
    this.connectionsByKey.set(connection.key(), connection);
    return connection;
  }

  /** Removes an existing edge. */
  disconnect(from: ServiceId, to: ServiceId, type: string): void {
    const key = new Connection(from, to, type).key();
    invariant(this.connectionsByKey.has(key), `Connection ${key} does not exist`);
    this.connectionsByKey.delete(key);
  }

  // ── queries ──────────────────────────────────────────────────────────────

  get(id: ServiceId): Service | undefined {
    return this.services.get(id);
  }

  require(id: ServiceId): Service {
    const service = this.services.get(id);
    invariant(service !== undefined, `Service "${id}" does not exist`);
    return service;
  }

  has(id: ServiceId): boolean {
    return this.services.has(id);
  }

  all(): readonly Service[] {
    return [...this.services.values()];
  }

  byKind(kind: string): readonly Service[] {
    return this.all().filter((s) => s.kind === kind);
  }

  parentOf(id: ServiceId): ServiceId | undefined {
    return this.parents.get(id);
  }

  childrenOf(id: ServiceId): readonly Service[] {
    return this.all().filter((s) => this.parents.get(s.id) === id);
  }

  connections(): readonly Connection[] {
    return [...this.connectionsByKey.values()];
  }

  connectionsOf(id: ServiceId): readonly Connection[] {
    return this.connections().filter((c) => c.from === id || c.to === id);
  }

  private generateId(kind: string): ServiceId {
    let n = (this.counters.get(kind) ?? 0) + 1;
    let candidate = serviceId(`${kind}-${n}`);
    while (this.services.has(candidate)) {
      n += 1;
      candidate = serviceId(`${kind}-${n}`);
    }
    this.counters.set(kind, n);
    return candidate;
  }
}
