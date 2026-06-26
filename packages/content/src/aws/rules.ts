import {
  ValidationEngine,
  type Diagnostic,
  type Service,
  type ValidationContext,
  type ValidationRule,
} from "@aws-city/domain";

/**
 * The AWS validation rule pack. Each rule is pluggable data (like a service
 * definition); the generic ValidationEngine in `domain` just aggregates them.
 *
 * Content conventions read by these rules:
 *  - `properties.role === "database"`  → the service is a database.
 *  - `properties.port` (number)        → the service's primary listening port.
 *  - `properties.expose` (number)      → the service is *intended* to be reachable
 *                                        from the internet on that port.
 */

interface IngressRule {
  readonly port: number;
  readonly cidr: string;
}

const INTERNET_CIDR = "0.0.0.0/0";
const ADMIN_PORTS = new Set([22, 3389]); // SSH, RDP

function readIngress(service: Service): IngressRule[] {
  const raw = service.properties["ingress"];
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (r): r is IngressRule =>
      typeof r === "object" &&
      r !== null &&
      typeof (r as { port?: unknown }).port === "number" &&
      typeof (r as { cidr?: unknown }).cidr === "string",
  );
}

function readNumber(service: Service, key: string): number | undefined {
  const value = service.properties[key];
  return typeof value === "number" ? value : undefined;
}

/** ERROR: a security group exposes an administrative port to the whole internet. */
const publicAdminPort: ValidationRule = {
  code: "PUBLIC_ADMIN_PORT",
  evaluate: (ctx) => {
    const diagnostics: Diagnostic[] = [];
    for (const sg of ctx.city.byKind("security-group")) {
      const open = readIngress(sg).filter((r) => r.cidr === INTERNET_CIDR && ADMIN_PORTS.has(r.port));
      if (open.length > 0) {
        diagnostics.push({
          code: "PUBLIC_ADMIN_PORT",
          severity: "error",
          title: "Administrative port open to the world",
          message: `Security group "${sg.id}" allows port(s) ${open
            .map((r) => r.port)
            .join(", ")} from ${INTERNET_CIDR}. Restrict admin access to known IPs.`,
          targets: [sg.id],
          fixSuggestionId: "restrict-admin-port",
        });
      }
    }
    return diagnostics;
  },
};

/** ERROR: a database is reachable from the internet. */
const publicDatabaseExposure: ValidationRule = {
  code: "PUBLIC_DATABASE_EXPOSURE",
  evaluate: (ctx) => {
    const diagnostics: Diagnostic[] = [];
    for (const db of ctx.city.all().filter((s) => s.properties["role"] === "database")) {
      const port = readNumber(db, "port") ?? 5432;
      const result = ctx.network.reachability({ from: "internet", to: db.id, port });
      if (result.reachable) {
        diagnostics.push({
          code: "PUBLIC_DATABASE_EXPOSURE",
          severity: "error",
          title: "Public database exposure",
          message: `Database "${db.id}" is reachable from the internet on port ${port}. Move it to a private subnet and restrict its security group.`,
          targets: [db.id],
          fixSuggestionId: "isolate-database",
        });
      }
    }
    return diagnostics;
  },
};

/** WARNING: a service is meant to be public but traffic cannot reach it. */
const exposedServiceUnreachable: ValidationRule = {
  code: "EXPOSED_SERVICE_UNREACHABLE",
  evaluate: (ctx) => {
    const diagnostics: Diagnostic[] = [];
    for (const service of ctx.city.all()) {
      const port = readNumber(service, "expose");
      if (port === undefined) continue;
      const result = ctx.network.reachability({ from: "internet", to: service.id, port });
      if (!result.reachable) {
        diagnostics.push({
          code: "EXPOSED_SERVICE_UNREACHABLE",
          severity: "warning",
          title: "Public service is unreachable",
          message: `"${service.id}" should be reachable from the internet on port ${port}, but traffic is blocked: ${result.blockedReason?.code ?? "UNKNOWN"}.`,
          targets: [service.id],
          fixSuggestionId: "make-service-reachable",
        });
      }
    }
    return diagnostics;
  },
};

/** INFO: a security group is attached to nothing and has no effect. */
const orphanedSecurityGroup: ValidationRule = {
  code: "ORPHANED_SECURITY_GROUP",
  evaluate: (ctx) => {
    const diagnostics: Diagnostic[] = [];
    for (const sg of ctx.city.byKind("security-group")) {
      const isAttached = ctx.city
        .connectionsOf(sg.id)
        .some((c) => c.type === "attached-to" && c.from === sg.id);
      if (!isAttached) {
        diagnostics.push({
          code: "ORPHANED_SECURITY_GROUP",
          severity: "info",
          title: "Orphaned security group",
          message: `Security group "${sg.id}" is not attached to any service.`,
          targets: [sg.id],
          fixSuggestionId: "attach-or-remove-security-group",
        });
      }
    }
    return diagnostics;
  },
};

export const awsValidationRules: readonly ValidationRule[] = [
  publicAdminPort,
  publicDatabaseExposure,
  exposedServiceUnreachable,
  orphanedSecurityGroup,
];

/** Builds a ValidationEngine pre-loaded with the AWS rule pack. */
export function createAwsValidationEngine(): ValidationEngine {
  return new ValidationEngine(awsValidationRules);
}

// Re-export so callers don't have to know the context shape comes from domain.
export type { ValidationContext };
