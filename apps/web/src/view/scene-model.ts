import type { City, Diagnostic, ServiceId, Severity } from "@aws-city/domain";
import { gridToScreen } from "./iso";
import { layoutCity } from "./layout";

export interface SceneNode {
  readonly id: ServiceId;
  readonly kind: string;
  readonly label: string;
  readonly gx: number;
  readonly gy: number;
  readonly x: number;
  readonly y: number;
  readonly selected: boolean;
  /** Worst severity among diagnostics targeting this node, if any. */
  readonly severity?: Severity;
}

export interface SceneEdge {
  readonly from: ServiceId;
  readonly to: ServiceId;
  readonly type: string;
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
}

export interface SceneModel {
  readonly nodes: readonly SceneNode[];
  readonly edges: readonly SceneEdge[];
}

export interface SceneOptions {
  readonly selectedId?: ServiceId;
  readonly diagnostics?: readonly Diagnostic[];
}

const SEVERITY_RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

/**
 * Transforms a City (+ selection + diagnostics) into a flat, render-ready scene
 * description. Pure: this is the entire "view logic", testable without a canvas.
 * The Phaser scene only draws what this returns.
 */
export function buildSceneModel(city: City, options: SceneOptions): SceneModel {
  const layout = layoutCity(city);
  const diagnostics = options.diagnostics ?? [];

  const nodes: SceneNode[] = city.all().map((service) => {
    const cell = layout.get(service.id) ?? { gx: 0, gy: 0 };
    const screen = gridToScreen(cell.gx, cell.gy);
    const severity = worstSeverity(service.id, diagnostics);
    const nameProp = service.properties["name"];
    const label = typeof nameProp === "string" ? nameProp : service.kind;
    const base = {
      id: service.id,
      kind: service.kind,
      label,
      gx: cell.gx,
      gy: cell.gy,
      x: screen.x,
      y: screen.y,
      selected: service.id === options.selectedId,
    };
    return severity !== undefined ? { ...base, severity } : base;
  });

  const edges: SceneEdge[] = city.connections().map((connection) => {
    const from = layout.get(connection.from) ?? { gx: 0, gy: 0 };
    const to = layout.get(connection.to) ?? { gx: 0, gy: 0 };
    const fromScreen = gridToScreen(from.gx, from.gy);
    const toScreen = gridToScreen(to.gx, to.gy);
    return {
      from: connection.from,
      to: connection.to,
      type: connection.type,
      fromX: fromScreen.x,
      fromY: fromScreen.y,
      toX: toScreen.x,
      toY: toScreen.y,
    };
  });

  return { nodes, edges };
}

function worstSeverity(id: ServiceId, diagnostics: readonly Diagnostic[]): Severity | undefined {
  let worst: Severity | undefined;
  for (const diagnostic of diagnostics) {
    if (!diagnostic.targets.includes(id)) continue;
    if (worst === undefined || SEVERITY_RANK[diagnostic.severity] < SEVERITY_RANK[worst]) {
      worst = diagnostic.severity;
    }
  }
  return worst;
}
