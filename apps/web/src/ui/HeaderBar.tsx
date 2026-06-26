export interface HeaderBarProps {
  readonly title: string;
  readonly briefing: string;
  readonly moves: number;
  readonly movesRemaining: number | null;
  readonly solved: boolean;
}

export function HeaderBar({ title, briefing, moves, movesRemaining, solved }: HeaderBarProps): JSX.Element {
  return (
    <header style={{ padding: "12px 16px", color: "#e0e1dd", background: "#1b263b" }}>
      <h1 style={{ margin: 0, fontSize: 18 }}>{title}</h1>
      <p style={{ margin: "4px 0", fontSize: 13, opacity: 0.8 }}>{briefing}</p>
      <div style={{ fontSize: 12, opacity: 0.7 }}>
        Moves: {moves}
        {movesRemaining !== null ? ` (${movesRemaining} left)` : ""}
        {solved ? " · ✅ solved" : ""}
      </div>
    </header>
  );
}
