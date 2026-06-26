import type { City } from "../../model/city";
import type { ServiceId } from "../../model/ids";
import type { Service } from "../../model/service";

/** Either the public internet or a specific service in the city. */
export type NetworkEndpoint = "internet" | ServiceId;

export interface ReachabilityQuery {
  readonly from: NetworkEndpoint;
  readonly to: NetworkEndpoint;
  readonly port: number;
}

/** One step in a traffic path, used for explanations and (later) visual traces. */
export interface Hop {
  readonly via: NetworkEndpoint;
  readonly kind: string;
}

export type BlockedCode =
  | "TARGET_NOT_IN_SUBNET"
  | "SUBNET_NOT_IN_VPC"
  | "NO_INTERNET_GATEWAY"
  | "NO_ROUTE_TABLE"
  | "PRIVATE_SUBNET_NO_PUBLIC_ROUTE"
  | "SECURITY_GROUP_BLOCKS_PORT"
  | "NO_EGRESS_ROUTE"
  | "NAT_NOT_IN_PUBLIC_SUBNET"
  | "UNSUPPORTED_QUERY";

export interface BlockedReason {
  readonly code: BlockedCode;
  readonly message: string;
  /** The service at which traffic was blocked, for highlighting. */
  readonly at?: ServiceId;
}

export interface ReachabilityResult {
  readonly reachable: boolean;
  readonly path: readonly Hop[];
  readonly blockedReason?: BlockedReason;
}

interface IngressRule {
  readonly port: number;
  readonly cidr: string;
}

const INTERNET_CIDR = "0.0.0.0/0";

/**
 * Answers reachability questions over a {@link City} by interpreting the
 * connection types stored in M1 (`attached-to`, `associated-with`, `routes-to`).
 *
 * Stateless and read-only: a pure function of the city's current state.
 */
export class NetworkingEngine {
  constructor(private readonly city: City) {}

  reachability(query: ReachabilityQuery): ReachabilityResult {
    if (query.from === "internet" && query.to !== "internet") {
      return this.inbound(query.to, query.port);
    }
    if (query.to === "internet" && query.from !== "internet") {
      return this.egress(query.from);
    }
    return {
      reachable: false,
      path: [],
      blockedReason: {
        code: "UNSUPPORTED_QUERY",
        message: "Only internet → instance reachability is supported in this milestone.",
      },
    };
  }

  /** internet → instance: requires IGW + a public route + a permissive SG. */
  private inbound(target: ServiceId, port: number): ReachabilityResult {
    const targetService = this.city.require(target);
    const path: Hop[] = [{ via: "internet", kind: "internet" }];

    const subnet = this.parent(target, "subnet");
    if (!subnet) {
      return blocked(path, "TARGET_NOT_IN_SUBNET", `"${target}" is not inside a subnet`, target);
    }

    const vpc = this.parent(subnet.id, "vpc");
    if (!vpc) {
      return blocked(path, "SUBNET_NOT_IN_VPC", `Subnet "${subnet.id}" is not inside a VPC`, subnet.id);
    }

    const igw = this.internetGatewayOf(vpc.id);
    if (!igw) {
      return blocked(
        path,
        "NO_INTERNET_GATEWAY",
        `VPC "${vpc.id}" has no internet gateway attached`,
        vpc.id,
      );
    }
    path.push({ via: igw.id, kind: "internet-gateway" });

    const routeTable = this.routeTableOf(subnet.id);
    if (!routeTable) {
      return blocked(
        path,
        "NO_ROUTE_TABLE",
        `Subnet "${subnet.id}" has no route table`,
        subnet.id,
      );
    }
    if (!this.routesTo(routeTable.id, igw.id)) {
      return blocked(
        path,
        "PRIVATE_SUBNET_NO_PUBLIC_ROUTE",
        `Subnet "${subnet.id}" has no route to the internet gateway (private subnet)`,
        subnet.id,
      );
    }
    path.push({ via: routeTable.id, kind: "route-table" });
    path.push({ via: subnet.id, kind: "subnet" });

    const allowingSg = this.securityGroupsOf(target).find((sg) =>
      this.ingressAllowsInternet(sg, port),
    );
    if (!allowingSg) {
      return blocked(
        path,
        "SECURITY_GROUP_BLOCKS_PORT",
        `No security group on "${target}" allows port ${port} from the internet`,
        target,
      );
    }
    path.push({ via: allowingSg.id, kind: "security-group" });
    path.push({ via: target, kind: targetService.kind });

    return { reachable: true, path };
  }

  /** instance → internet: public via an IGW route, private via a NAT gateway. */
  private egress(source: ServiceId): ReachabilityResult {
    const sourceService = this.city.require(source);
    const path: Hop[] = [{ via: source, kind: sourceService.kind }];

    const subnet = this.parent(source, "subnet");
    if (!subnet) {
      return blocked(path, "TARGET_NOT_IN_SUBNET", `"${source}" is not inside a subnet`, source);
    }
    const vpc = this.parent(subnet.id, "vpc");
    if (!vpc) {
      return blocked(path, "SUBNET_NOT_IN_VPC", `Subnet "${subnet.id}" is not inside a VPC`, subnet.id);
    }

    const routeTable = this.routeTableOf(subnet.id);
    if (!routeTable) {
      return blocked(path, "NO_ROUTE_TABLE", `Subnet "${subnet.id}" has no route table`, subnet.id);
    }
    path.push({ via: routeTable.id, kind: "route-table" });
    path.push({ via: subnet.id, kind: "subnet" });

    const igw = this.internetGatewayOf(vpc.id);

    // Public egress: the subnet's route table routes straight to the IGW.
    if (igw && this.routesTo(routeTable.id, igw.id)) {
      path.push({ via: igw.id, kind: "internet-gateway" });
      path.push({ via: "internet", kind: "internet" });
      return { reachable: true, path };
    }

    // Private egress: route to a NAT gateway that itself lives in a public subnet.
    const nat = this.routeTargetOfKind(routeTable.id, "nat-gateway");
    if (nat) {
      const natSubnet = this.parent(nat.id, "subnet");
      const natRouteTable = natSubnet ? this.routeTableOf(natSubnet.id) : undefined;
      const natIsPublic = Boolean(
        igw && natRouteTable && this.routesTo(natRouteTable.id, igw.id),
      );
      if (!natIsPublic) {
        return blocked(
          path,
          "NAT_NOT_IN_PUBLIC_SUBNET",
          `NAT gateway "${nat.id}" is not in a public subnet, so it cannot reach the internet`,
          nat.id,
        );
      }
      path.push({ via: nat.id, kind: "nat-gateway" });
      path.push({ via: "internet", kind: "internet" });
      return { reachable: true, path };
    }

    return blocked(
      path,
      "NO_EGRESS_ROUTE",
      `Subnet "${subnet.id}" has no route to the internet (no IGW route, no NAT gateway)`,
      subnet.id,
    );
  }

  // ── graph helpers ──────────────────────────────────────────────────────────

  /** The containing parent of `id`, if it is of the expected kind. */
  private parent(id: ServiceId, expectedKind: string): Service | undefined {
    const parentId = this.city.parentOf(id);
    if (parentId === undefined) return undefined;
    const parent = this.city.get(parentId);
    return parent && parent.kind === expectedKind ? parent : undefined;
  }

  private internetGatewayOf(vpcId: ServiceId): Service | undefined {
    return this.city
      .connectionsOf(vpcId)
      .filter((c) => c.type === "attached-to" && c.to === vpcId)
      .map((c) => this.city.get(c.from))
      .find((s): s is Service => s?.kind === "internet-gateway");
  }

  private routeTableOf(subnetId: ServiceId): Service | undefined {
    const conn = this.city
      .connectionsOf(subnetId)
      .find((c) => c.type === "associated-with" && c.to === subnetId);
    return conn ? this.city.get(conn.from) : undefined;
  }

  private routesTo(routeTableId: ServiceId, targetId: ServiceId): boolean {
    return this.city
      .connectionsOf(routeTableId)
      .some((c) => c.type === "routes-to" && c.from === routeTableId && c.to === targetId);
  }

  /** The first service of `kind` that this route table routes to, if any. */
  private routeTargetOfKind(routeTableId: ServiceId, kind: string): Service | undefined {
    return this.city
      .connectionsOf(routeTableId)
      .filter((c) => c.type === "routes-to" && c.from === routeTableId)
      .map((c) => this.city.get(c.to))
      .find((s): s is Service => s?.kind === kind);
  }

  private securityGroupsOf(targetId: ServiceId): Service[] {
    return this.city
      .connectionsOf(targetId)
      .filter((c) => c.type === "attached-to" && c.to === targetId)
      .map((c) => this.city.get(c.from))
      .filter((s): s is Service => s?.kind === "security-group");
  }

  private ingressAllowsInternet(sg: Service, port: number): boolean {
    return readIngressRules(sg).some((r) => r.port === port && r.cidr === INTERNET_CIDR);
  }
}

function blocked(
  path: readonly Hop[],
  code: BlockedCode,
  message: string,
  at?: ServiceId,
): ReachabilityResult {
  const reason: BlockedReason = at !== undefined ? { code, message, at } : { code, message };
  return { reachable: false, path, blockedReason: reason };
}

function readIngressRules(service: Service): IngressRule[] {
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
