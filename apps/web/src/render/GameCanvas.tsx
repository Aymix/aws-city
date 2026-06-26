import { useEffect, useRef } from "react";
import type Phaser from "phaser";
import { createGame } from "./createGame";

/**
 * Mounts the Phaser canvas into the DOM and tears it down on unmount.
 * The Phaser game is created imperatively in an effect so React owns the DOM
 * node but not the render loop.
 */
export function GameCanvas(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let game: Phaser.Game | undefined;
    try {
      game = createGame(container);
    } catch (err) {
      // jsdom / headless environments lack WebGL+Canvas; skip mounting there.
      console.warn("Phaser game could not start in this environment", err);
    }

    return () => game?.destroy(true);
  }, []);

  return <div ref={containerRef} data-testid="game-canvas" style={{ position: "absolute", inset: 0 }} />;
}
