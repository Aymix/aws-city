import type { Command, Hint } from "@aws-city/application";
import { createAwsRegistry, createAwsValidationEngine, createHintProvider, puzzles } from "@aws-city/content";
import { CostEngine, SecurityEngine, type ServiceId } from "@aws-city/domain";
import { useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";
import { GameCanvas } from "./render/GameCanvas";
import { PuzzleSession } from "./state/puzzle-session";
import { buildSceneModel } from "./view/scene-model";
import { DiagnosticsPanel } from "./ui/DiagnosticsPanel";
import { EditorView } from "./ui/EditorView";
import { HeaderBar } from "./ui/HeaderBar";
import { HintPanel } from "./ui/HintPanel";
import { ServiceInspector } from "./ui/ServiceInspector";
import { WinBanner } from "./ui/WinBanner";

function PuzzleView(): JSX.Element {
  const [puzzleId, setPuzzleId] = useState(puzzles[0]!.id);

  // A fresh session per selected puzzle.
  const session = useMemo(() => {
    const puzzle = puzzles.find((p) => p.id === puzzleId) ?? puzzles[0]!;
    return new PuzzleSession(
      puzzle,
      createAwsValidationEngine(),
      new CostEngine(createAwsRegistry()),
      new SecurityEngine(),
    );
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

  // Tiered hints, reset whenever the puzzle or move count changes.
  const hintProvider = useMemo(() => createHintProvider(), []);
  const [hints, setHints] = useState<readonly Hint[]>([]);
  const [revealed, setRevealed] = useState(0);
  useEffect(() => {
    setHints([]);
    setRevealed(0);
  }, [puzzleId, snapshot.moves]);
  const onReveal = (): void => {
    if (hints.length === 0) {
      void hintProvider.hints({ diagnostics: snapshot.diagnostics }).then((h) => {
        setHints(h);
        setRevealed(1);
      });
    } else {
      setRevealed((r) => Math.min(r + 1, hints.length));
    }
  };

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
        <HintPanel hints={hints} revealed={revealed} onReveal={onReveal} />
      </aside>
    </div>
  );
}

const TAB_BTN = (active: boolean): CSSProperties => ({
  padding: "8px 16px",
  background: active ? "#1b263b" : "transparent",
  color: "#e0e1dd",
  border: "none",
  borderBottom: active ? "2px solid #5fa8d3" : "2px solid transparent",
  cursor: "pointer",
  fontSize: 13,
});

export function App(): JSX.Element {
  const [mode, setMode] = useState<"puzzle" | "sandbox">("puzzle");
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#0d1b2a" }}>
      <nav style={{ display: "flex", background: "#11203a", borderBottom: "1px solid #1b263b" }}>
        <button style={TAB_BTN(mode === "puzzle")} onClick={() => setMode("puzzle")}>
          Puzzles
        </button>
        <button style={TAB_BTN(mode === "sandbox")} onClick={() => setMode("sandbox")}>
          Sandbox
        </button>
      </nav>
      <div style={{ flex: 1, minHeight: 0 }}>{mode === "puzzle" ? <PuzzleView /> : <EditorView />}</div>
    </div>
  );
}
