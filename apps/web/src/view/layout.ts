import type { City, Service, ServiceId } from "@aws-city/domain";
import type { GridPos } from "./iso";

/**
 * Assigns each service a grid cell. A layered layout: the row (gy) is the
 * service's containment depth (VPC=0, subnet=1, instance=2, …) and the column
 * (gx) is its index within that depth, sorted by id. Pure and deterministic.
 *
 * Deliberately simple for M6 — a richer "districts inside VPC walls" layout can
 * replace this without touching the scene model or Phaser scene.
 */
export function layoutCity(city: City): Map<ServiceId, GridPos> {
  const depthOf = (id: ServiceId): number => {
    let depth = 0;
    let parent = city.parentOf(id);
    while (parent !== undefined) {
      depth += 1;
      parent = city.parentOf(parent);
    }
    return depth;
  };

  const byDepth = new Map<number, Service[]>();
  for (const service of city.all()) {
    const depth = depthOf(service.id);
    const bucket = byDepth.get(depth) ?? [];
    bucket.push(service);
    byDepth.set(depth, bucket);
  }

  const result = new Map<ServiceId, GridPos>();
  for (const [depth, services] of [...byDepth.entries()].sort((a, b) => a[0] - b[0])) {
    services.sort((a, b) => a.id.localeCompare(b.id));
    services.forEach((service, index) => result.set(service.id, { gx: index, gy: depth }));
  }
  return result;
}
