import type { Diagnostic, ServiceId, Severity } from "@aws-city/domain";

export interface DiagnosticsPanelProps {
  readonly diagnostics: readonly Diagnostic[];
  readonly onSelect: (id: ServiceId) => void;
}

const SEVERITY_COLOR: Record<Severity, string> = {
  error: "#e63946",
  warning: "#e9c46a",
  info: "#90caf9",
};

export function DiagnosticsPanel({ diagnostics, onSelect }: DiagnosticsPanelProps): JSX.Element {
  return (
    <section style={{ padding: 12, color: "#e0e1dd" }}>
      <h2 style={{ fontSize: 14, margin: "0 0 8px" }}>Diagnostics</h2>
      {diagnostics.length === 0 ? (
        <p style={{ fontSize: 13, color: "#74c69d" }}>✅ No problems detected.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
          {diagnostics.map((d, i) => (
            <li
              key={`${d.code}-${i}`}
              onClick={() => d.targets[0] && onSelect(d.targets[0])}
              style={{
                cursor: d.targets[0] ? "pointer" : "default",
                borderLeft: `3px solid ${SEVERITY_COLOR[d.severity]}`,
                padding: "4px 8px",
                background: "#243047",
                borderRadius: 4,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>{d.title}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{d.message}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
