import type { Diagnostic } from "@aws-city/domain";
import { serviceId } from "@aws-city/domain";
import { describe, expect, it } from "vitest";
import { createHintProvider } from "../src/hints";

const diag = (code: string): Diagnostic => ({
  code,
  severity: "error",
  title: code,
  message: `${code} message`,
  targets: [serviceId("x")],
});

describe("RuleBasedHintProvider", () => {
  it("returns escalating tiers for a known diagnostic", async () => {
    const hints = await createHintProvider().hints({ diagnostics: [diag("PUBLIC_DATABASE_EXPOSURE")] });
    expect(hints.map((h) => h.tier)).toEqual(["nudge", "strategy", "solution"]);
  });

  it("addresses the most severe diagnostic first", async () => {
    const diagnostics: Diagnostic[] = [
      { ...diag("PUBLIC_ADMIN_PORT"), severity: "error" },
      { ...diag("ORPHANED_SECURITY_GROUP"), severity: "info" },
    ];
    const hints = await createHintProvider().hints({ diagnostics });
    expect(hints[0]!.text.toLowerCase()).toContain("administrative");
  });

  it("congratulates when there is nothing wrong", async () => {
    const hints = await createHintProvider().hints({ diagnostics: [] });
    expect(hints).toHaveLength(1);
    expect(hints[0]!.text.toLowerCase()).toContain("no problems");
  });

  it("is deterministic", async () => {
    const provider = createHintProvider();
    const a = await provider.hints({ diagnostics: [diag("PUBLIC_ADMIN_PORT")] });
    const b = await provider.hints({ diagnostics: [diag("PUBLIC_ADMIN_PORT")] });
    expect(a).toEqual(b);
  });
});
