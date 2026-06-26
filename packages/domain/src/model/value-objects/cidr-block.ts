import { invariant } from "../../invariant";

const CIDR_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/;

/**
 * An IPv4 CIDR block such as `10.0.0.0/16`. Construct via {@link CidrBlock.parse}.
 * Used for VPC and subnet address ranges; the networking engine (M2) reasons
 * about containment of these ranges.
 */
export class CidrBlock {
  private constructor(
    readonly value: string,
    readonly prefixLength: number,
  ) {}

  static parse(input: string): CidrBlock {
    const match = CIDR_PATTERN.exec(input);
    invariant(match !== null, `Invalid CIDR block: "${input}"`);
    const octets = [match[1], match[2], match[3], match[4]].map(Number);
    const prefix = Number(match[5]);
    invariant(
      octets.every((o) => o >= 0 && o <= 255),
      `CIDR octets must be 0–255: "${input}"`,
    );
    invariant(prefix >= 0 && prefix <= 32, `CIDR prefix must be 0–32: "${input}"`);
    return new CidrBlock(input, prefix);
  }

  equals(other: CidrBlock): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
