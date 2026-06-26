// Domain core public API. Pure TypeScript — no React, Phaser, or DOM.

export { DomainError, invariant } from "./invariant";

// Model
export { City, type AddOptions } from "./model/city";
export { serviceId, type ServiceId } from "./model/ids";
export type { Service } from "./model/service";
export { Port } from "./model/value-objects/port";
export { CidrBlock } from "./model/value-objects/cidr-block";
export { Connection } from "./model/value-objects/connection";

// Engines
export {
  NetworkingEngine,
  type NetworkEndpoint,
  type ReachabilityQuery,
  type ReachabilityResult,
  type BlockedReason,
  type BlockedCode,
  type Hop,
} from "./engines/networking/networking-engine";

// Registry (the extensibility keystone)
export { ServiceRegistry } from "./registry/service-registry";
export type {
  ServiceDefinition,
  ContainmentRule,
  Provider,
  ServiceCategory,
} from "./registry/service-definition";
