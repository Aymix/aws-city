/**
 * The HUD overlay. Pure React, no Phaser. In later milestones it reads selected
 * slices of the world snapshot (diagnostics, cost, posture) and dispatches
 * commands to the application layer.
 */
export function Hud(): JSX.Element {
  return (
    <header
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        padding: "12px 16px",
        color: "#e0e1dd",
        pointerEvents: "none",
      }}
    >
      <h1 style={{ margin: 0, fontSize: "18px" }}>AWS City</h1>
      <p style={{ margin: "4px 0 0", fontSize: "12px", opacity: 0.7 }}>
        Learn the cloud by building a city.
      </p>
    </header>
  );
}
