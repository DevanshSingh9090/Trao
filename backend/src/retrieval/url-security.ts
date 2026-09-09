import dns from "node:dns/promises";
import net from "node:net";

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);

  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const a = parts[0] ?? -1;
  const b = parts[1] ?? -1;

  return (
    a === 0 ||
    a === 10 ||
    a === 100 && b >= 64 && b <= 127 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51) ||
    (a === 203 && b === 0) ||
    a >= 224
  );
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("ff")
  );
}

function isPrivateIp(ip: string): boolean {
  const version = net.isIP(ip);

  if (version === 4) {
    return isPrivateIPv4(ip);
  }

  if (version === 6) {
    return isPrivateIPv6(ip);
  }

  return false;
}

export async function assertSafeUrl(
  rawUrl: string
): Promise<URL> {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are allowed");
  }

  if (url.username || url.password) {
    throw new Error("URLs containing credentials are not allowed");
  }

  const hostname = url.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "0.0.0.0" ||
    hostname === "::1"
  ) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Private or loopback URLs are not allowed");
    }
  }

  const allowPrivateUrls =
    process.env.ALLOW_PRIVATE_URLS === "true" &&
    process.env.NODE_ENV !== "production";

  if (!allowPrivateUrls) {
    const addresses = await dns.lookup(hostname, {
      all: true,
      verbatim: true,
    });

    for (const address of addresses) {
      if (isPrivateIp(address.address)) {
        throw new Error(
          "Private or loopback IP addresses are not allowed"
        );
      }
    }
  }

  return url;
}

export function resolveRelativeUrl(
  baseUrl: string,
  href: string
): string | null {
  try {
    const resolved = new URL(href, baseUrl);

    if (!["http:", "https:"].includes(resolved.protocol)) {
      return null;
    }

    resolved.username = "";
    resolved.password = "";

    return resolved.href;
  } catch {
    return null;
  }
}

export function isSameOrigin(
  first: string,
  second: string
): boolean {
  try {
    const a = new URL(first);
    const b = new URL(second);

    return a.origin === b.origin;
  } catch {
    return false;
  }
}