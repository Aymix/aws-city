import { invariant } from "../invariant";
import type { ServiceDefinition } from "./service-definition";

/**
 * A registry of {@link ServiceDefinition}s keyed by `kind`. The City aggregate
 * consults it to validate that a service kind exists and to enforce containment
 * rules. Content packs (e.g. the AWS pack) populate it.
 */
export class ServiceRegistry {
  private readonly definitions = new Map<string, ServiceDefinition>();

  /** Builds a registry pre-seeded with the given definitions. */
  static from(definitions: readonly ServiceDefinition[]): ServiceRegistry {
    const registry = new ServiceRegistry();
    for (const def of definitions) registry.register(def);
    return registry;
  }

  /** Registers a definition. Throws if its kind is already registered. */
  register(definition: ServiceDefinition): this {
    invariant(
      !this.definitions.has(definition.kind),
      `Service kind "${definition.kind}" is already registered`,
    );
    this.definitions.set(definition.kind, definition);
    return this;
  }

  has(kind: string): boolean {
    return this.definitions.has(kind);
  }

  get(kind: string): ServiceDefinition | undefined {
    return this.definitions.get(kind);
  }

  /** Like {@link get} but throws a DomainError when the kind is unknown. */
  require(kind: string): ServiceDefinition {
    const definition = this.definitions.get(kind);
    invariant(definition !== undefined, `Unknown service kind "${kind}"`);
    return definition;
  }

  all(): readonly ServiceDefinition[] {
    return [...this.definitions.values()];
  }
}
