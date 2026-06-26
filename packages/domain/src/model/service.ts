import type { ServiceId } from "./ids";

/**
 * A single service instance placed in the city (one EC2, one VPC, …).
 *
 * A Service is an entity identified by its {@link ServiceId}. Its `kind` points
 * at a ServiceDefinition in the registry; `properties` is a kind-specific bag
 * (typed per-kind in a later refinement). Containment and connections are owned
 * by the City aggregate, not stored on the service itself.
 */
export interface Service {
  readonly id: ServiceId;
  readonly kind: string;
  readonly properties: Readonly<Record<string, unknown>>;
}
