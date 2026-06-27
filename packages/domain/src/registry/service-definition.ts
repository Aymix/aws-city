import type { Service } from "../model/service";

/**
 * The set of cloud providers the game can model. Only "aws" is populated in M1;
 * the others exist so the type (and the engines that switch on it) are ready for
 * the multi-cloud expansions on the roadmap — added as content packs, not engine
 * rewrites.
 */
export type Provider = "aws" | "azure" | "gcp" | "k8s";

/** High-level grouping used by the UI and (later) by engine rule selection. */
export type ServiceCategory =
  | "network"
  | "compute"
  | "storage"
  | "security"
  | "identity"
  | "integration"
  | "observability";

/**
 * Where a service may sit in the containment tree.
 * - `allowedIn: []`  → top-level only; the service must NOT have a parent.
 * - `allowedIn: [k]` → a parent whose kind is one of `k` is REQUIRED.
 */
export interface ContainmentRule {
  readonly allowedIn: readonly string[];
}

/**
 * A plugin describing one kind of service. This is the extensibility keystone:
 * adding a new AWS service (or a whole new provider) means registering more of
 * these — the City aggregate and the engines never hard-code service kinds.
 *
 * Engine-contribution hooks (validators, costModel, securityModel,
 * networkBehavior, visual) are intentionally absent in M1 and will be added to
 * this interface by the milestones that introduce those engines.
 */
export interface ServiceDefinition {
  readonly kind: string;
  readonly provider: Provider;
  readonly category: ServiceCategory;
  readonly displayName: string;
  readonly containment: ContainmentRule;
  /** Default property values applied when a service of this kind is created. */
  readonly defaults?: Readonly<Record<string, unknown>>;
  /**
   * Hourly operating cost (USD) for an instance of this kind. May depend on the
   * service's properties (e.g. EC2 instance type). Consumed by the cost engine.
   */
  readonly cost?: (service: Service) => number;
}
