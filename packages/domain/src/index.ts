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

export {
  ValidationEngine,
  type Diagnostic,
  type Severity,
  type ValidationRule,
  type ValidationContext,
} from "./engines/validation/validation-engine";

export {
  CostEngine,
  createCostSystem,
  HOURS_PER_MONTH,
  type CostLine,
} from "./engines/cost/cost-engine";

// Simulation (the heartbeat)
export {
  SimulationEngine,
  type SimulationSystem,
  type SystemContext,
  type SimulationEvent,
  type TickResult,
} from "./simulation/simulation-engine";
export {
  createInitialState,
  getMetrics,
  setMetrics,
  nextRandom,
  type WorldState,
  type ServiceMetrics,
  type InitialStateOptions,
} from "./simulation/world-state";
export { EventBus, type Listener } from "./simulation/event-bus";

// Serialization (save/load)
export { serializeCity, deserializeCity } from "./serialization/serialize";
export { migrate } from "./serialization/migrate";
export {
  SCHEMA_VERSION,
  type CitySnapshot,
  type SerializedService,
  type SerializedConnection,
} from "./serialization/snapshot";

// Registry (the extensibility keystone)
export { ServiceRegistry } from "./registry/service-registry";
export type {
  ServiceDefinition,
  ContainmentRule,
  Provider,
  ServiceCategory,
} from "./registry/service-definition";
