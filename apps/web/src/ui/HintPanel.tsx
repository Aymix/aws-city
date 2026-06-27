import type { Hint } from "@aws-city/application";

export interface HintPanelProps {
  readonly hints: readonly Hint[];
  readonly revealed: number;
  readonly onReveal: () => void;
}

/** Reveals tiered hints one tap at a time (nudge → strategy → solution). */
export function HintPanel({ hints, revealed, onReveal }: HintPanelProps): JSX.Element {
  const canReveal = revealed < hints.length;
  return (
    <section style={{ padding: 12, color: "#e0e1dd" }}>
      <h2 style={{ fontSize: 14, margin: "0 0 8px" }}>Hints</h2>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
        {hints.slice(0, revealed).map((h, i) => (
          <li key={i} style={{ fontSize: 13, background: "#243047", borderRadius: 4, padding: "4px 8px" }}>
            <strong style={{ textTransform: "capitalize", opacity: 0.7 }}>{h.tier}: </strong>
            {h.text}
          </li>
        ))}
      </ul>
      <button
        onClick={onReveal}
        disabled={!canReveal}
        style={{ marginTop: 8, fontSize: 12, cursor: canReveal ? "pointer" : "default" }}
      >
        {revealed === 0 ? "Get a hint" : canReveal ? "Need more help?" : "No more hints"}
      </button>
    </section>
  );
}
