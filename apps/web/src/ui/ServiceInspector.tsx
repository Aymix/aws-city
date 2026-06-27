import type { Command } from "@aws-city/application";
import type { Service } from "@aws-city/domain";

export interface ServiceInspectorProps {
  readonly service: Service | null;
  readonly onCommand: (command: Command) => void;
}

const COMMON_PORTS: ReadonlyArray<{ port: number; label: string }> = [
  { port: 80, label: "HTTP 80" },
  { port: 443, label: "HTTPS 443" },
  { port: 22, label: "SSH 22" },
  { port: 5432, label: "PostgreSQL 5432" },
];

const WORLD = "0.0.0.0/0";

const INSTANCE_TYPES = ["t3.micro", "t3.small", "t3.medium", "m5.large", "m5.xlarge", "m5.2xlarge", "m5.4xlarge"];

interface IngressRule {
  readonly port: number;
  readonly cidr: string;
}

function openPorts(service: Service): Set<number> {
  const raw = service.properties["ingress"];
  const rules: IngressRule[] = Array.isArray(raw) ? (raw as IngressRule[]) : [];
  return new Set(rules.filter((r) => r.cidr === WORLD).map((r) => r.port));
}

/**
 * Shows the selected service. For a security group it offers port toggles that
 * dispatch `update-properties` commands — the in-game way to open/close "door
 * locks". Other kinds show their properties read-only (full editing is M12).
 */
export function ServiceInspector({ service, onCommand }: ServiceInspectorProps): JSX.Element {
  if (!service) {
    return (
      <section style={{ padding: 12, color: "#9aa5b1" }}>
        <p style={{ fontSize: 13 }}>Select a building to inspect it.</p>
      </section>
    );
  }

  const isSecurityGroup = service.kind === "security-group";
  const isInstance = service.kind === "ec2";
  const open = isSecurityGroup ? openPorts(service) : new Set<number>();

  const toggle = (port: number): void => {
    const next = new Set(open);
    if (next.has(port)) next.delete(port);
    else next.add(port);
    onCommand({
      type: "update-properties",
      id: service.id,
      properties: { ingress: [...next].map((p) => ({ port: p, cidr: WORLD })) },
    });
  };

  return (
    <section style={{ padding: 12, color: "#e0e1dd" }}>
      <h2 style={{ fontSize: 14, margin: "0 0 8px" }}>{service.kind}</h2>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>{service.id}</div>

      {isSecurityGroup ? (
        <fieldset style={{ border: "1px solid #3a4a63", borderRadius: 6, padding: 8 }}>
          <legend style={{ fontSize: 12, opacity: 0.8 }}>Inbound from the internet</legend>
          {COMMON_PORTS.map(({ port, label }) => (
            <label key={port} style={{ display: "block", fontSize: 13, padding: "2px 0" }}>
              <input type="checkbox" checked={open.has(port)} onChange={() => toggle(port)} /> {label}
            </label>
          ))}
        </fieldset>
      ) : isInstance ? (
        <label style={{ display: "block", fontSize: 13 }}>
          Instance type:{" "}
          <select
            value={String(service.properties["instanceType"] ?? "t3.micro")}
            onChange={(e) =>
              onCommand({
                type: "update-properties",
                id: service.id,
                properties: { instanceType: e.target.value },
              })
            }
          >
            {INSTANCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <pre style={{ fontSize: 12, background: "#243047", padding: 8, borderRadius: 4, overflow: "auto" }}>
          {JSON.stringify(service.properties, null, 2)}
        </pre>
      )}
    </section>
  );
}
