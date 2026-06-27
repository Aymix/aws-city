import type { Hint, HintProvider, HintRequest } from "@aws-city/application";

interface CatalogEntry {
  readonly nudge: string;
  readonly strategy: string;
  readonly solution: string;
}

/** Tiered remediation copy keyed by diagnostic code. Pure game data. */
const CATALOG: Record<string, CatalogEntry> = {
  EXPOSED_SERVICE_UNREACHABLE: {
    nudge: "Something is stopping visitors from reaching a public building.",
    strategy: "Trace the path from the internet inward: bridge (gateway), road signs (route table), then the door locks (security group).",
    solution: "Open the required port on the security group, or add the missing internet gateway and a public route to it.",
  },
  PUBLIC_DATABASE_EXPOSURE: {
    nudge: "A bank vault is sitting wide open to the whole world.",
    strategy: "Databases should never accept traffic directly from the internet — restrict who can knock.",
    solution: "Change the database's security group to allow only internal ranges (e.g. 10.0.0.0/16), or move it to a private subnet.",
  },
  PUBLIC_ADMIN_PORT: {
    nudge: "An administrative door is unlocked for everyone.",
    strategy: "SSH (22) and RDP (3389) must be limited to trusted IPs, never 0.0.0.0/0.",
    solution: "Remove the 0.0.0.0/0 rule for the admin port from the security group.",
  },
  ORPHANED_SECURITY_GROUP: {
    nudge: "There's a door lock that isn't attached to anything.",
    strategy: "Unused security groups add confusion and risk.",
    solution: "Attach the security group to a service, or remove it.",
  },
};

/**
 * Deterministic, offline hint provider. Picks the most severe diagnostic and
 * returns escalating hints for it. No randomness, no network — safe default.
 */
export class RuleBasedHintProvider implements HintProvider {
  hints(request: HintRequest): Promise<readonly Hint[]> {
    const top = request.diagnostics[0];
    if (!top) {
      return Promise.resolve([{ tier: "nudge", text: "No problems detected — you may be done!" }]);
    }
    const entry = CATALOG[top.code];
    if (!entry) {
      return Promise.resolve([{ tier: "nudge", text: top.message }]);
    }
    return Promise.resolve([
      { tier: "nudge", text: entry.nudge },
      { tier: "strategy", text: entry.strategy },
      { tier: "solution", text: entry.solution },
    ]);
  }
}

export function createHintProvider(): HintProvider {
  return new RuleBasedHintProvider();
}
