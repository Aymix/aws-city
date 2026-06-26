import Phaser from "phaser";
import type { ServiceId } from "@aws-city/domain";
import { TILE_H, TILE_W } from "../view/iso";
import type { SceneModel, SceneNode } from "../view/scene-model";

const CATEGORY_COLOR: Record<string, number> = {
  vpc: 0x274060,
  subnet: 0x335c81,
  ec2: 0x5fa8d3,
  "security-group": 0xbc4749,
  "internet-gateway": 0x6a994e,
  "route-table": 0x8d99ae,
  "nat-gateway": 0xb08968,
  "iam-role": 0x9d4edd,
};
const DEFAULT_COLOR = 0x808fa3;
const SEVERITY_STROKE: Record<string, number> = { error: 0xe63946, warning: 0xe9c46a, info: 0x90caf9 };

/**
 * Draws a {@link SceneModel} as an isometric scene and reports clicks. It holds
 * NO game state and NO rules — it is a pure function of the model it is given
 * (the Prime Directive). All logic lives in the tested view-model layer.
 */
export class CityScene extends Phaser.Scene {
  private model: SceneModel = { nodes: [], edges: [] };
  private onSelect: (id: ServiceId) => void = () => {};
  private drawn: Phaser.GameObjects.GameObject[] = [];
  private ready = false;

  constructor() {
    super("city");
  }

  configure(model: SceneModel, onSelect: (id: ServiceId) => void): void {
    this.model = model;
    this.onSelect = onSelect;
    if (this.ready) this.redraw();
  }

  setModel(model: SceneModel): void {
    this.model = model;
    if (this.ready) this.redraw();
  }

  create(): void {
    this.ready = true;
    this.cameras.main.setBackgroundColor("#0d1b2a");
    this.redraw();
  }

  private redraw(): void {
    for (const obj of this.drawn) obj.destroy();
    this.drawn = [];

    const edges = this.add.graphics({ lineStyle: { width: 2, color: 0x415a77, alpha: 0.7 } });
    for (const edge of this.model.edges) {
      edges.lineBetween(edge.fromX, edge.fromY, edge.toX, edge.toY);
    }
    this.drawn.push(edges);

    for (const node of this.model.nodes) this.drawNode(node);

    this.centerCamera();
  }

  private drawNode(node: SceneNode): void {
    const points = [
      { x: 0, y: -TILE_H / 2 },
      { x: TILE_W / 2, y: 0 },
      { x: 0, y: TILE_H / 2 },
      { x: -TILE_W / 2, y: 0 },
    ];
    const color = CATEGORY_COLOR[node.kind] ?? DEFAULT_COLOR;
    const tile = this.add.polygon(node.x, node.y, points, color);
    tile.setInteractive(new Phaser.Geom.Polygon(points), Phaser.Geom.Polygon.Contains);
    tile.on("pointerdown", () => this.onSelect(node.id));

    const stroke = node.selected ? 0xffffff : node.severity ? SEVERITY_STROKE[node.severity] : undefined;
    if (stroke !== undefined) tile.setStrokeStyle(node.selected ? 3 : 2, stroke);

    const label = this.add
      .text(node.x, node.y - TILE_H, node.label, { fontSize: "11px", color: "#e0e1dd" })
      .setOrigin(0.5);

    this.drawn.push(tile, label);
  }

  private centerCamera(): void {
    if (this.model.nodes.length === 0) return;
    const xs = this.model.nodes.map((n) => n.x);
    const ys = this.model.nodes.map((n) => n.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    this.cameras.main.centerOn(cx, cy);
  }
}
