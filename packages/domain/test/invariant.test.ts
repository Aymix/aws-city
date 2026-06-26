import { describe, expect, it } from "vitest";
import { DomainError, invariant } from "../src/invariant";

describe("invariant", () => {
  it("does nothing when the condition holds", () => {
    expect(() => invariant(true, "should not throw")).not.toThrow();
  });

  it("throws a DomainError with the given message when the condition fails", () => {
    expect(() => invariant(false, "EC2 must live in a subnet")).toThrow(DomainError);
    expect(() => invariant(false, "EC2 must live in a subnet")).toThrow(
      "EC2 must live in a subnet",
    );
  });

  it("narrows the type after a passing assertion", () => {
    const value: string | undefined = "ok";
    invariant(value !== undefined, "value is defined");
    // If narrowing works, `value` is `string` here and `.length` type-checks.
    expect(value.length).toBe(2);
  });

  it("DomainError is an Error with a stable name", () => {
    const err = new DomainError("boom");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("DomainError");
  });
});
