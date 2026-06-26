import { serviceId, type Diagnostic, type Service } from "@aws-city/domain";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DiagnosticsPanel } from "../../src/ui/DiagnosticsPanel";
import { HeaderBar } from "../../src/ui/HeaderBar";
import { ServiceInspector } from "../../src/ui/ServiceInspector";
import { WinBanner } from "../../src/ui/WinBanner";

describe("HeaderBar", () => {
  it("shows the title and move count", () => {
    render(<HeaderBar title="The Locked Door" briefing="Fix it." moves={2} movesRemaining={null} solved={false} />);
    expect(screen.getByRole("heading", { name: "The Locked Door" })).toBeInTheDocument();
    expect(screen.getByText(/Fix it\./)).toBeInTheDocument();
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });
});

describe("WinBanner", () => {
  it("appears only when solved", () => {
    const { rerender, queryByText } = render(<WinBanner solved={false} />);
    expect(queryByText(/solved/i)).not.toBeInTheDocument();
    rerender(<WinBanner solved={true} />);
    expect(queryByText(/solved/i)).toBeInTheDocument();
  });
});

describe("DiagnosticsPanel", () => {
  const diagnostics: Diagnostic[] = [
    { code: "PUBLIC_ADMIN_PORT", severity: "error", title: "SSH open", message: "bad", targets: [serviceId("sg")] },
    { code: "ORPHANED_SECURITY_GROUP", severity: "info", title: "Orphan", message: "meh", targets: [serviceId("sg2")] },
  ];

  it("lists each diagnostic's title", () => {
    render(<DiagnosticsPanel diagnostics={diagnostics} onSelect={vi.fn()} />);
    expect(screen.getByText("SSH open")).toBeInTheDocument();
    expect(screen.getByText("Orphan")).toBeInTheDocument();
  });

  it("shows an all-clear message when empty", () => {
    render(<DiagnosticsPanel diagnostics={[]} onSelect={vi.fn()} />);
    expect(screen.getByText(/no problems/i)).toBeInTheDocument();
  });

  it("selects a diagnostic's target when clicked", () => {
    const onSelect = vi.fn();
    render(<DiagnosticsPanel diagnostics={diagnostics} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("SSH open"));
    expect(onSelect).toHaveBeenCalledWith(serviceId("sg"));
  });
});

describe("ServiceInspector", () => {
  const sg: Service = {
    id: serviceId("sg"),
    kind: "security-group",
    properties: { ingress: [{ port: 443, cidr: "0.0.0.0/0" }] },
  };

  it("prompts to select when nothing is selected", () => {
    render(<ServiceInspector service={null} onCommand={vi.fn()} />);
    expect(screen.getByText(/select a building/i)).toBeInTheDocument();
  });

  it("reflects which ports are open to the world", () => {
    render(<ServiceInspector service={sg} onCommand={vi.fn()} />);
    expect(screen.getByRole("checkbox", { name: /443/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /22/ })).not.toBeChecked();
  });

  it("dispatches an update-properties command when a port is toggled", () => {
    const onCommand = vi.fn();
    render(<ServiceInspector service={sg} onCommand={onCommand} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /22/ }));
    expect(onCommand).toHaveBeenCalledTimes(1);
    const command = onCommand.mock.calls[0]![0];
    expect(command.type).toBe("update-properties");
    expect(command.id).toBe(serviceId("sg"));
    const ports = (command.properties.ingress as { port: number }[]).map((r) => r.port).sort();
    expect(ports).toEqual([22, 443]);
  });
});
