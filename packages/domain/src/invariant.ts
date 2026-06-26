/**
 * Raised when a domain invariant is violated. A distinct error type lets the
 * application/UI layers distinguish "the player did something illegal" from
 * unexpected programming errors.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
    // Restore prototype chain for instanceof across transpilation targets.
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}

/**
 * Asserts a domain invariant. Throws a {@link DomainError} when `condition` is
 * falsy. On success it narrows the type of the checked expression (TS assertion).
 *
 * Used throughout the domain model to guard aggregate invariants, e.g.
 * `invariant(subnet !== undefined, "EC2 must live in a subnet")`.
 */
export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new DomainError(message);
  }
}
