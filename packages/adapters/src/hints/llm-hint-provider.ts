import type { Hint, HintProvider, HintRequest } from "@aws-city/application";

/** A text-completion function (e.g. a Claude API call). Injected for testability. */
export type CompleteFn = (prompt: string) => Promise<string>;

/**
 * An optional LLM-backed hint provider. The completion function is injected so
 * the provider stays free of any SDK/network dependency and is testable with a
 * mock. Falls back gracefully — callers should prefer the rule-based provider as
 * the deterministic default.
 */
export class LlmHintProvider implements HintProvider {
  constructor(private readonly complete: CompleteFn) {}

  async hints(request: HintRequest): Promise<readonly Hint[]> {
    const problems = request.diagnostics.map((d) => `- ${d.title}: ${d.message}`).join("\n");
    const prompt = `You are a cloud architecture tutor. Given these problems, give one concise strategy hint without revealing the full answer:\n${problems}`;
    const text = await this.complete(prompt);
    return [{ tier: "strategy", text: text.trim() }];
  }
}
