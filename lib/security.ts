import dns from "dns/promises";
import net from "net";

const ALLOWED_DOMAINS = new Set([
  "raw.githubusercontent.com",
  "gist.githubusercontent.com",
  "gitlab.com",
]);

function isPublicIpv4Parts(parts: number[]): boolean {
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return false;

  const [a, b, c] = parts;
  if (a === 0) return false; // 0.0.0.0/8
  if (a === 10) return false; // 10.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return false; // 100.64.0.0/10 (CGNAT / Cloud metadata)
  if (a === 127) return false; // 127.0.0.0/8 (Loopback)
  if (a === 169 && b === 254) return false; // 169.254.0.0/16 (Link-local / AWS IMDS)
  if (a === 172 && b >= 16 && b <= 31) return false; // 172.16.0.0/12
  if (a === 192 && b === 0 && c === 0) return false; // 192.0.0.0/24
  if (a === 192 && b === 0 && c === 2) return false; // 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 168) return false; // 192.168.0.0/16
  if (a === 198 && (b === 18 || b === 19)) return false; // 198.18.0.0/15 (Benchmark)
  if (a === 198 && b === 51 && c === 100) return false; // 198.51.100.0/24 (TEST-NET-2)
  if (a === 203 && b === 0 && c === 113) return false; // 203.0.113.0/24 (TEST-NET-3)
  if (a >= 224) return false; // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved/Broadcast)

  return true;
}

/**
 * Validates if an IP address is a public, routable IP.
 * Blocks localhost, LAN, CGNAT, multicast, IPv4-mapped IPv6, and cloud metadata (IMDS) IPs.
 */
export function isPublicIp(ip: string): boolean {
  const trimmed = ip.trim();
  if (!net.isIP(trimmed)) return false;

  // IPv4 checks
  if (net.isIPv4(trimmed)) {
    const parts = trimmed.split(".").map((p) => parseInt(p, 10));
    return isPublicIpv4Parts(parts);
  }

  // IPv6 checks
  const lower = trimmed.toLowerCase();
  if (lower === "::" || lower === "::1" || lower === "0:0:0:0:0:0:0:1" || lower === "0:0:0:0:0:0:0:0") {
    return false;
  }

  // Handle IPv4-mapped IPv6 addresses (e.g., ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (lower.startsWith("::ffff:")) {
    const suffix = lower.slice(7);
    if (net.isIPv4(suffix)) {
      return isPublicIpv4Parts(suffix.split(".").map((p) => parseInt(p, 10)));
    }
    const hexParts = suffix.split(":");
    if (hexParts.length === 2) {
      const hi = parseInt(hexParts[0], 16);
      const lo = parseInt(hexParts[1], 16);
      if (!isNaN(hi) && !isNaN(lo)) {
        return isPublicIpv4Parts([(hi >> 8) & 0xff, hi & 0xff, (lo >> 8) & 0xff, lo & 0xff]);
      }
    }
    return false;
  }

  if (lower.startsWith("fc") || lower.startsWith("fd")) return false; // Unique local (fc00::/7)
  if (
    lower.startsWith("fe8") ||
    lower.startsWith("fe9") ||
    lower.startsWith("fea") ||
    lower.startsWith("feb")
  ) {
    return false; // Link-local (fe80::/10)
  }
  if (lower.startsWith("ff")) return false; // Multicast (ff00::/8)
  if (lower.startsWith("2001:db8:") || lower.startsWith("2001:0db8:")) return false; // Documentation

  return true;
}

/**
 * Performs DNS resolution across all A/AAAA records and checks that every resolved IP is public.
 * Also strictly enforces an allowlist for all domains.
 */
export async function verifyUrlSafety(urlString: string): Promise<{ safe: boolean; reason?: string }> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return { safe: false, reason: "Invalid URL format" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { safe: false, reason: "Only HTTP/HTTPS protocols are allowed" };
  }

  const host = url.hostname.toLowerCase();

  // 1. Domain Allowlist Check
  const isTrustedAppDomain =
    host.endsWith(".squig.link") ||
    host === "squig.link" ||
    host.endsWith(".github.io") ||
    host === "github.io" ||
    host === "graph.hangout.audio";
  const isAllowedThirdParty = ALLOWED_DOMAINS.has(host);

  if (!isTrustedAppDomain && !isAllowedThirdParty) {
    return {
      safe: false,
      reason:
        "Domain not in safe-list. Allowed domains: *.squig.link, *.github.io, graph.hangout.audio, raw.githubusercontent.com.",
    };
  }

  // 2. DNS Resolution & Multi-Record IP Check (SSRF Mitigation)
  try {
    const lookupResults = await dns.lookup(host, { all: true });
    if (!lookupResults || lookupResults.length === 0) {
      return { safe: false, reason: "Could not resolve hostname to an IP address." };
    }

    for (const record of lookupResults) {
      if (!record.address || !isPublicIp(record.address)) {
        return { safe: false, reason: "URL resolves to a private or blocked IP address." };
      }
    }

    return { safe: true };
  } catch {
    return { safe: false, reason: "DNS resolution failed." };
  }
}

// ─── Bounded In-Memory Rate Limiter (LRU + TTL Cleanup) ───────────────────

const MAX_RATE_LIMIT_ENTRIES = 2000;
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

export function extractClientIp(headers: Headers, fallbackIp?: string): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return fallbackIp || "unknown";
}

/**
 * Checks and increments the request count for `key` within `windowMs`.
 * Returns `true` if allowed, `false` if rate-limited.
 */
export function checkInMemoryRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  if (!key || key === "unknown") return true;
  const now = Date.now();

  const existing = rateLimitMap.get(key);
  if (existing && now - existing.timestamp <= windowMs) {
    if (existing.count >= maxRequests) {
      return false;
    }
    existing.count += 1;
    // Refresh insertion order for LRU
    rateLimitMap.delete(key);
    rateLimitMap.set(key, existing);
    return true;
  }

  // Prune expired entries when map grows large
  if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (now - v.timestamp > windowMs) {
        rateLimitMap.delete(k);
      }
    }
    // If still at capacity, evict oldest entry
    if (rateLimitMap.size >= MAX_RATE_LIMIT_ENTRIES) {
      const oldestKey = rateLimitMap.keys().next().value;
      if (oldestKey !== undefined) {
        rateLimitMap.delete(oldestKey);
      }
    }
  }

  rateLimitMap.set(key, { count: 1, timestamp: now });
  return true;
}
