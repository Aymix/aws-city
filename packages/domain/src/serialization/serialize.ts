import { City } from "../model/city";
import { serviceId } from "../model/ids";
import type { ServiceRegistry } from "../registry/service-registry";
import { migrate } from "./migrate";
import { SCHEMA_VERSION, type CitySnapshot, type SerializedService } from "./snapshot";

/** Serializes a City to a versioned, JSON-safe snapshot. */
export function serializeCity(city: City): CitySnapshot {
  const services: SerializedService[] = city.all().map((service) => {
    const parent = city.parentOf(service.id);
    return {
      id: service.id,
      kind: service.kind,
      properties: { ...service.properties },
      ...(parent !== undefined ? { in: parent } : {}),
    };
  });
  const connections = city.connections().map((c) => ({ from: c.from, to: c.to, type: c.type }));
  return { version: SCHEMA_VERSION, services, connections };
}

/**
 * Rebuilds a City from a snapshot (migrating older versions first). Services are
 * added parents-before-children so containment invariants hold during rebuild.
 */
export function deserializeCity(snapshot: unknown, registry: ServiceRegistry): City {
  const migrated = migrate(snapshot);
  const city = new City(registry);
  const byId = new Map(migrated.services.map((s) => [s.id, s]));
  const added = new Set<string>();

  const add = (service: SerializedService): void => {
    if (added.has(service.id)) return;
    if (service.in !== undefined) {
      const parent = byId.get(service.in);
      if (parent) add(parent);
    }
    city.add(service.kind, {
      id: service.id,
      properties: service.properties,
      ...(service.in !== undefined ? { in: serviceId(service.in) } : {}),
    });
    added.add(service.id);
  };

  for (const service of migrated.services) add(service);
  for (const c of migrated.connections) {
    city.connect(serviceId(c.from), serviceId(c.to), c.type);
  }
  return city;
}
