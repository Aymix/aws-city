import type { City } from "../../model/city";
import type { ServiceId } from "../../model/ids";
import type { Service } from "../../model/service";
import { NetworkingEngine } from "../networking/networking-engine";

/** An attack scenario the player must defend against. */
export type Attack =
  | { readonly kind: "ssh-brute-force" }
  | { readonly kind: "db-exfiltration" }
  | { readonly kind: "web-defacement" };

export interface AttackResult {
  readonly breached: boolean;
  readonly reason: string;
  readonly target?: ServiceId;
}

export interface Posture {
  /** 0–100; 100 is fully hardened against the modelled attacks. */
  readonly score: number;
  readonly findings: readonly string[];
}

const ATTACK_WEIGHTS: ReadonlyArray<{ attack: Attack; weight: number }> = [
  { attack: { kind: "ssh-brute-force" }, weight: 40 },
  { attack: { kind: "db-exfiltration" }, weight: 40 },
  { attack: { kind: "web-defacement" }, weight: 20 },
];

/**
 * Simulates attacks against a city and scores its security posture, by composing
 * the networking engine (is the target reachable?) with service intent
 * (database role, public exposure, WAF protection). Stateless and read-only.
 */
export class SecurityEngine {
  simulateAttack(city: City, attack: Attack): AttackResult {
    const net = new NetworkingEngine(city);
    const reachable = (id: ServiceId, port: number): boolean =>
      net.reachability({ from: "internet", to: id, port }).reachable;

    switch (attack.kind) {
      case "ssh-brute-force": {
        const victim = city.all().find((s) => reachable(s.id, 22));
        return victim
          ? { breached: true, reason: `SSH (22) is reachable from the internet on "${victim.id}"`, target: victim.id }
          : { breached: false, reason: "No host exposes SSH to the internet" };
      }
      case "db-exfiltration": {
        const db = city
          .all()
          .find((s) => s.properties["role"] === "database" && reachable(s.id, dbPort(s)));
        return db
          ? { breached: true, reason: `Database "${db.id}" is reachable from the internet`, target: db.id }
          : { breached: false, reason: "No database is reachable from the internet" };
      }
      case "web-defacement": {
        const web = city.all().find((s) => {
          const port = exposePort(s);
          return port !== undefined && reachable(s.id, port) && !isProtectedByWaf(city, s.id);
        });
        return web
          ? { breached: true, reason: `Public service "${web.id}" has no WAF protection`, target: web.id }
          : { breached: false, reason: "No unprotected public service found" };
      }
    }
  }

  posture(city: City): Posture {
    let score = 100;
    const findings: string[] = [];
    for (const { attack, weight } of ATTACK_WEIGHTS) {
      const result = this.simulateAttack(city, attack);
      if (result.breached) {
        score -= weight;
        findings.push(result.reason);
      }
    }
    return { score: Math.max(0, score), findings };
  }
}

function dbPort(service: Service): number {
  const port = service.properties["port"];
  return typeof port === "number" ? port : 5432;
}

function exposePort(service: Service): number | undefined {
  const port = service.properties["expose"];
  return typeof port === "number" ? port : undefined;
}

function isProtectedByWaf(city: City, target: ServiceId): boolean {
  return city
    .connectionsOf(target)
    .some((c) => c.type === "protects" && c.to === target && city.get(c.from)?.kind === "waf");
}
