import { SandboxController, buildShareUrl, parseShareUrl, type Command } from "@aws-city/application";
import { createAwsRegistry } from "@aws-city/content";
import type { ServiceId } from "@aws-city/domain";
import { useMemo, useReducer, useState } from "react";
import { GameCanvas } from "../render/GameCanvas";
import { buildSceneModel } from "../view/scene-model";
import { ServiceInspector } from "./ServiceInspector";

type Tool = "select" | "connect" | "remove";
const CONNECTION_TYPES = ["attached-to", "associated-with", "routes-to", "protects"];

/**
 * Free-build sandbox / level editor. Reuses the sandbox controller (commands),
 * the scene model, and the inspector. Cities can be exported as a share link and
 * imported from the URL hash.
 */
export function EditorView(): JSX.Element {
  const registry = useMemo(() => createAwsRegistry(), []);
  const kinds = useMemo(() => registry.all().map((d) => d.kind), [registry]);

  const sandbox = useMemo(() => {
    const fromUrl = typeof window !== "undefined" ? parseShareUrl(window.location.hash) : null;
    return fromUrl ? SandboxController.fromSnapshot(fromUrl, registry) : SandboxController.empty(registry);
  }, [registry]);

  const [, force] = useReducer((x: number) => x + 1, 0);
  const [selected, setSelected] = useState<ServiceId | null>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [connectFrom, setConnectFrom] = useState<ServiceId | null>(null);
  const [connectType, setConnectType] = useState(CONNECTION_TYPES[0]!);
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const model = buildSceneModel(sandbox.city, selected ? { selectedId: selected } : {});
  const selectedService = selected ? sandbox.city.get(selected) ?? null : null;

  const run = (command: Command): void => {
    const result = sandbox.apply(command);
    setError(result.ok ? null : result.error ?? "Command failed");
    force();
  };

  const onSelect = (id: ServiceId): void => {
    if (tool === "remove") {
      run({ type: "remove-service", id });
      setSelected(null);
      return;
    }
    if (tool === "connect") {
      if (!connectFrom) {
        setConnectFrom(id);
      } else {
        run({ type: "connect", from: connectFrom, to: id, connectionType: connectType });
        setConnectFrom(null);
      }
      return;
    }
    setSelected(id);
  };

  const addKind = (kind: string): void => {
    // Try inside the selected service first; fall back to top-level.
    let result = selected ? sandbox.apply({ type: "add-service", kind, in: selected }) : { ok: false };
    if (!result.ok) result = sandbox.apply({ type: "add-service", kind });
    setError(result.ok ? null : `Cannot add ${kind} here`);
    force();
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", height: "100%" }}>
      <div style={{ position: "relative", overflow: "hidden" }}>
        <GameCanvas model={model} onSelect={onSelect} />
      </div>
      <aside style={{ background: "#11203a", borderLeft: "1px solid #1b263b", overflowY: "auto", color: "#e0e1dd" }}>
        <div style={{ padding: 12 }}>
          <h2 style={{ fontSize: 14, margin: "0 0 8px" }}>Build</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {kinds.map((kind) => (
              <button key={kind} onClick={() => addKind(kind)} style={{ fontSize: 11, cursor: "pointer" }}>
                + {kind}
              </button>
            ))}
          </div>

          <h2 style={{ fontSize: 14, margin: "12px 0 8px" }}>Tools</h2>
          <div style={{ display: "flex", gap: 4 }}>
            {(["select", "connect", "remove"] as Tool[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTool(t);
                  setConnectFrom(null);
                }}
                style={{ fontSize: 12, fontWeight: tool === t ? 700 : 400, cursor: "pointer" }}
              >
                {t}
              </button>
            ))}
          </div>
          {tool === "connect" ? (
            <div style={{ fontSize: 12, marginTop: 6 }}>
              type:{" "}
              <select value={connectType} onChange={(e) => setConnectType(e.target.value)}>
                {CONNECTION_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <div style={{ opacity: 0.7, marginTop: 4 }}>
                {connectFrom ? `from ${connectFrom} → click target` : "click the source building"}
              </div>
            </div>
          ) : null}

          <h2 style={{ fontSize: 14, margin: "12px 0 8px" }}>Share</h2>
          <button
            onClick={() => setShareUrl(buildShareUrl(sandbox.snapshot(), window.location.origin + window.location.pathname))}
            style={{ fontSize: 12, cursor: "pointer" }}
          >
            Create share link
          </button>
          {shareUrl ? (
            <input
              aria-label="share-url"
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              style={{ width: "100%", marginTop: 6, fontSize: 11 }}
            />
          ) : null}

          {error ? <div style={{ color: "#e63946", fontSize: 12, marginTop: 8 }}>⚠ {error}</div> : null}
        </div>
        <ServiceInspector service={selectedService} onCommand={run} />
      </aside>
    </div>
  );
}
