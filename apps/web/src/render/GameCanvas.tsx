import type { ServiceId } from "@aws-city/domain";
import Phaser from "phaser";
import { useEffect, useRef } from "react";
import type { SceneModel } from "../view/scene-model";
import { CityScene } from "./CityScene";

export interface GameCanvasProps {
  readonly model: SceneModel;
  readonly onSelect: (id: ServiceId) => void;
}

/**
 * Mounts the Phaser canvas and keeps the CityScene in sync with `model`. React
 * owns the DOM node and the data; Phaser owns only the drawing.
 */
export function GameCanvas({ model, onSelect }: GameCanvasProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<CityScene>();
  // Keep the latest onSelect without re-creating the game.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let game: Phaser.Game | undefined;
    const scene = new CityScene();
    sceneRef.current = scene;

    try {
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: container,
        backgroundColor: "#0d1b2a",
        scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
        scene,
      });
      scene.configure(model, (id) => onSelectRef.current(id));
    } catch (err) {
      // jsdom / headless environments lack WebGL+Canvas; skip mounting there.
      console.warn("Phaser game could not start in this environment", err);
    }

    return () => {
      game?.destroy(true);
      sceneRef.current = undefined;
    };
    // Created once; subsequent model changes are pushed via the effect below.
  }, []);

  useEffect(() => {
    sceneRef.current?.setModel(model);
  }, [model]);

  return <div ref={containerRef} data-testid="game-canvas" style={{ position: "absolute", inset: 0 }} />;
}
