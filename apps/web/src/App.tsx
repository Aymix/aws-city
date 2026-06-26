import { GameCanvas } from "./render/GameCanvas";
import { Hud } from "./ui/Hud";

export function App(): JSX.Element {
  return (
    <main style={{ position: "relative", width: "100%", height: "100%" }}>
      <GameCanvas />
      <Hud />
    </main>
  );
}
