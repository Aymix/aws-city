import { invariant } from "../../invariant";

/** A TCP/UDP port number (0–65535). Construct via {@link Port.of}. */
export class Port {
  private constructor(readonly value: number) {}

  static of(value: number): Port {
    invariant(
      Number.isInteger(value) && value >= 0 && value <= 65535,
      `Port must be an integer in 0–65535, got ${value}`,
    );
    return new Port(value);
  }

  equals(other: Port): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return String(this.value);
  }
}
