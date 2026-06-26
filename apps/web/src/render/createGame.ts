import Phaser from "phaser";

/**
 * Creates the Phaser game instance.
 *
 * IMPORTANT (Prime Directive): this renderer is an *adapter*. It must never own
 * game state or game rules. In later milestones its scenes will read an immutable
 * world snapshot produced by the domain simulation and draw it — nothing more.
 *
 * For M0 it renders a blank isometric backdrop to prove the canvas mounts.
 */
class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#0d1b2a");
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, "AWS City", {
        color: "#e0e1dd",
        fontSize: "32px",
      })
      .setOrigin(0.5);
  }
}

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#0d1b2a",
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: "100%",
      height: "100%",
    },
    scene: [BootScene],
  });
}
