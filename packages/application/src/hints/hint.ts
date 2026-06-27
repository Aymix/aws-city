import type { Diagnostic } from "@aws-city/domain";

/** Escalating help: a gentle nudge, then a strategy, then the full solution. */
export type HintTier = "nudge" | "strategy" | "solution";

export interface Hint {
  readonly tier: HintTier;
  readonly text: string;
}

export interface HintRequest {
  /** Current diagnostics (already severity-ordered by the validation engine). */
  readonly diagnostics: readonly Diagnostic[];
}

/**
 * Port for hint providers. A deterministic rule-based provider ships in content;
 * an optional LLM-backed provider lives in adapters. Async so either fits.
 */
export interface HintProvider {
  hints(request: HintRequest): Promise<readonly Hint[]>;
}
