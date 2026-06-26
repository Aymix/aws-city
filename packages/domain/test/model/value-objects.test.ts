import { describe, expect, it } from "vitest";
import { DomainError } from "../../src/invariant";
import { serviceId } from "../../src/model/ids";
import { CidrBlock } from "../../src/model/value-objects/cidr-block";
import { Connection } from "../../src/model/value-objects/connection";
import { Port } from "../../src/model/value-objects/port";

describe("ServiceId", () => {
  it("wraps a non-empty string", () => {
    expect(serviceId("ec2-1")).toBe("ec2-1");
  });

  it("rejects an empty string", () => {
    expect(() => serviceId("")).toThrow(DomainError);
  });
});

describe("Port", () => {
  it("accepts valid port numbers", () => {
    expect(Port.of(443).value).toBe(443);
    expect(Port.of(0).value).toBe(0);
    expect(Port.of(65535).value).toBe(65535);
  });

  it.each([-1, 65536, 1.5, NaN])("rejects invalid port %s", (n) => {
    expect(() => Port.of(n)).toThrow(DomainError);
  });

  it("has value equality", () => {
    expect(Port.of(443).equals(Port.of(443))).toBe(true);
    expect(Port.of(443).equals(Port.of(80))).toBe(false);
  });
});

describe("CidrBlock", () => {
  it("parses a valid block and exposes its prefix", () => {
    const cidr = CidrBlock.parse("10.0.0.0/16");
    expect(cidr.value).toBe("10.0.0.0/16");
    expect(cidr.prefixLength).toBe(16);
  });

  it.each(["10.0.0.0", "999.0.0.0/16", "10.0.0.0/33", "abc", "10.0.0/16", ""])(
    "rejects invalid block %s",
    (s) => {
      expect(() => CidrBlock.parse(s)).toThrow(DomainError);
    },
  );

  it("has value equality", () => {
    expect(CidrBlock.parse("10.0.0.0/16").equals(CidrBlock.parse("10.0.0.0/16"))).toBe(true);
    expect(CidrBlock.parse("10.0.0.0/16").equals(CidrBlock.parse("10.0.0.0/24"))).toBe(false);
  });
});

describe("Connection", () => {
  const a = serviceId("sg-1");
  const b = serviceId("ec2-1");

  it("holds endpoints and a relationship type", () => {
    const c = new Connection(a, b, "attached-to");
    expect(c.from).toBe(a);
    expect(c.to).toBe(b);
    expect(c.type).toBe("attached-to");
  });

  it("has value equality across all three fields", () => {
    expect(new Connection(a, b, "attached-to").equals(new Connection(a, b, "attached-to"))).toBe(
      true,
    );
    expect(new Connection(a, b, "attached-to").equals(new Connection(a, b, "routes-to"))).toBe(
      false,
    );
    expect(new Connection(a, b, "attached-to").equals(new Connection(b, a, "attached-to"))).toBe(
      false,
    );
  });

  it("produces a stable key for de-duplication", () => {
    expect(new Connection(a, b, "attached-to").key()).toBe(
      new Connection(a, b, "attached-to").key(),
    );
    expect(new Connection(a, b, "attached-to").key()).not.toBe(
      new Connection(a, b, "routes-to").key(),
    );
  });
});
