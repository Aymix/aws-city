import type { Command } from "@aws-city/application";
import { createAwsValidationEngine, puzzles } from "@aws-city/content";
import type { ServiceId } from "@aws-city/domain";
import { useMemo, useState, useSyncExternalStore } from "react";
import { GameCanvas } from "./render/GameCanvas";
import { PuzzleSession } from "./state/puzzle-session";
import { buildSceneModel } from "./view/scene-model";
import { DiagnosticsPanel } from "./ui/DiagnosticsPanel";
import { HeaderBar } from "./ui/HeaderBar";
import { ServiceInspector } from "./ui/ServiceInspector";
import { WinBanner } from "./ui/WinBanner";

export function App(): JSX.Element {
  const [puzzleId, setPuzzleId] = useState(puzzles[0]!.id);

  // A fresh session per selected puzzle.
  const session = useMemo(() => {
    const puzzle = puzzles.find((p) => p.id === puzzleId) ?? puzzles[0]!;
    return new PuzzleSession(puzzle, createAwsValidationEngine());
  }, [puzzleId]);

  const snapshot = useSyncExternalStore(
    (cb) => session.subscribe(cb),
    () => session.getSnapshot(),
  );

  const model = useMemo(
    () =>
      buildSceneModel(snapshot.city, {
        diagnostics: snapshot.diagnostics,
        ...(snapshot.selectedId ? { selectedId: snapshot.selectedId } : {}),
      }),
    [snapshot],
  );

  const selectedService = snapshot.selectedId ? snapshot.city.get(snapshot.selectedId) ?? null : null;
  const onSelect = (id: ServiceId): void => session.select(id);
  const onCommand = (command: Command): void => {
    session.apply(command);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", height: "100%", background: "#0d1b2a" }}>
      <div style={{ position: "relative", overflow: "hidden" }}>
        <GameCanvas model={model} onSelect={onSelect} />
        <WinBanner solved={snapshot.solved} />
      </div>

      <aside style={{ background: "#11203a", borderLeft: "1px solid #1b263b", overflowY: "auto" }}>
        <HeaderBar
          title={snapshot.title}
          briefing={snapshot.briefing}
          moves={snapshot.moves}
          movesRemaining={snapshot.movesRemaining}
          solved={snapshot.solved}
        />
        <div style={{ padding: "8px 12px" }}>
          <label style={{ fontSize: 12, color: "#9aa5b1" }}>
            Puzzle:{" "}
            <select value={puzzleId} onChange={(e) => setPuzzleId(e.target.value)}>
              {puzzles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        {snapshot.lastError ? (
          <div style={{ color: "#e63946", fontSize: 12, padding: "0 12px 8px" }}>⚠ {snapshot.lastError}</div>
        ) : null}
        <ServiceInspector service={selectedService} onCommand={onCommand} />
        <DiagnosticsPanel diagnostics={snapshot.diagnostics} onSelect={onSelect} />
      </aside>
    </div>
  );
}
