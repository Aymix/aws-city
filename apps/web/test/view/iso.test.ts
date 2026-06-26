import { describe, expect, it } from "vitest";
import { gridToScreen, screenToGrid, TILE_H, TILE_W } from "../../src/view/iso";

describe("isometric projection", () => {
  it("maps the origin to the origin", () => {
    expect(gridToScreen(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it("projects a diamond: +x goes right+down, +y goes left+down", () => {
    expect(gridToScreen(1, 0)).toEqual({ x: TILE_W / 2, y: TILE_H / 2 });
    expect(gridToScreen(0, 1)).toEqual({ x: -TILE_W / 2, y: TILE_H / 2 });
  });

  it("round-trips grid -> screen -> grid", () => {
    const cases: ReadonlyArray<readonly [number, number]> = [
      [0, 0],
      [3, 5],
      [7, 2],
      [10, 10],
    ];
    for (const [gx, gy] of cases) {
      const screen = gridToScreen(gx, gy);
      const back = screenToGrid(screen.x, screen.y);
      expect(back.gx).toBeCloseTo(gx, 6);
      expect(back.gy).toBeCloseTo(gy, 6);
    }
  });
});
