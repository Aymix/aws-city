import type { ServiceId } from "../ids";

/**
 * A directed, typed edge between two services — e.g. a security group
 * `attached-to` an instance, or a route table `associated-with` a subnet.
 *
 * Connections are structural in M1: the city only guarantees both endpoints
 * exist. The *meaning* of each relationship type is interpreted by the
 * networking engine in M2.
 */
export class Connection {
  constructor(
    readonly from: ServiceId,
    readonly to: ServiceId,
    readonly type: string,
  ) {}

  equals(other: Connection): boolean {
    return this.from === other.from && this.to === other.to && this.type === other.type;
  }

  /** A stable string key for de-duplication and lookup. */
  key(): string {
    return `${this.from}|${this.type}|${this.to}`;
  }
}
