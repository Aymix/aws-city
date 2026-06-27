import { serviceId, type Diagnostic } from "@aws-city/domain";
import { describe, expect, it, vi } from "vitest";
import { LlmHintProvider } from "../src/hints/llm-hint-provider";

const diagnostics: Diagnostic[] = [
  { code: "X", severity: "error", title: "Public DB", message: "exposed", targets: [serviceId("db")] },
];

describe("LlmHintProvider", () => {
  it("calls the injected completion with the problems and returns its hint", async () => {
    const complete = vi.fn().mockResolvedValue("  Restrict the database security group.  ");
    const hints = await new LlmHintProvider(complete).hints({ diagnostics });

    expect(complete).toHaveBeenCalledOnce();
    expect(complete.mock.calls[0]![0]).toContain("Public DB");
    expect(hints).toEqual([{ tier: "strategy", text: "Restrict the database security group." }]);
  });
});
