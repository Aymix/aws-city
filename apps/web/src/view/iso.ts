/** Isometric (2:1 diamond) projection helpers. Pure math — no Phaser, no DOM. */

export const TILE_W = 64;
export const TILE_H = 32;

export interface GridPos {
  readonly gx: number;
  readonly gy: number;
}

export interface ScreenPos {
  readonly x: number;
  readonly y: number;
}

export function gridToScreen(gx: number, gy: number, tileW = TILE_W, tileH = TILE_H): ScreenPos {
  return { x: (gx - gy) * (tileW / 2), y: (gx + gy) * (tileH / 2) };
}

export function screenToGrid(x: number, y: number, tileW = TILE_W, tileH = TILE_H): GridPos {
  const halfW = tileW / 2;
  const halfH = tileH / 2;
  return { gx: (x / halfW + y / halfH) / 2, gy: (y / halfH - x / halfW) / 2 };
}
