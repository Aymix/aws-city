import type { CitySnapshot } from "@aws-city/domain";
import { describe, expect, it } from "vitest";
import { buildShareUrl, decodeShare, encodeShare, parseShareUrl } from "../src/share/share";

const snapshot: CitySnapshot = {
  version: 1,
  services: [
    { id: "vpc", kind: "vpc", properties: { cidr: "10.0.0.0/16", note: "café ☕" } },
    { id: "sn", kind: "subnet", properties: {}, in: "vpc" },
  ],
  connections: [{ from: "sn", to: "vpc", type: "associated-with" }],
};

describe("share encoding", () => {
  it("produces a URL-safe string (no +, /, =)", () => {
    expect(encodeShare(snapshot)).not.toMatch(/[+/=]/);
  });

  it("round-trips a snapshot including unicode", () => {
    expect(decodeShare(encodeShare(snapshot))).toEqual(snapshot);
  });

  it("builds and parses a share URL", () => {
    const url = buildShareUrl(snapshot, "https://aws.city/");
    expect(url).toContain("#city=");
    expect(parseShareUrl(url)).toEqual(snapshot);
  });

  it("returns null when no city param is present", () => {
    expect(parseShareUrl("https://aws.city/#other=1")).toBeNull();
    expect(parseShareUrl("https://aws.city/")).toBeNull();
  });
});
