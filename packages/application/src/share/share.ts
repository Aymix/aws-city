import type { CitySnapshot } from "@aws-city/domain";

const PARAM = "city";

// URL-safe base64 that works in both the browser and Node (uses global btoa/atob).
function toBase64Url(text: string): string {
  return btoa(unescape(encodeURIComponent(text)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(encoded: string): string {
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(padded)));
}

/** Encodes a city snapshot into a compact, URL-safe string. */
export function encodeShare(snapshot: CitySnapshot): string {
  return toBase64Url(JSON.stringify(snapshot));
}

/** Decodes a string produced by {@link encodeShare} back into a snapshot. */
export function decodeShare(encoded: string): CitySnapshot {
  return JSON.parse(fromBase64Url(encoded)) as CitySnapshot;
}

/** Builds a shareable link with the encoded city in the URL hash. */
export function buildShareUrl(snapshot: CitySnapshot, baseUrl = ""): string {
  return `${baseUrl}#${PARAM}=${encodeShare(snapshot)}`;
}

/** Extracts a snapshot from a share URL (or hash fragment); null if absent. */
export function parseShareUrl(url: string): CitySnapshot | null {
  const hash = url.includes("#") ? url.slice(url.indexOf("#") + 1) : url;
  const params = new URLSearchParams(hash);
  const encoded = params.get(PARAM);
  return encoded ? decodeShare(encoded) : null;
}
