import dns from "dns/promises";
import net from "net";

const ALLOWED_DOMAINS = new Set([
  "raw.githubusercontent.com",
  "gist.githubusercontent.com",
  "gitlab.com",
]);

/**
 * Validates if an IP address is a public, routable IP.
 * Blocks localhost, LAN, and cloud metadata (IMDS) IPs.
 */
export function isPublicIp(ip: string): boolean {
  if (!net.isIP(ip)) return false;

  // IPv4 checks
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map((p) => parseInt(p, 10));
    
    if (parts[0] === 10) return false; // 10.0.0.0/8
    if (parts[0] === 127) return false; // 127.0.0.0/8 (Localhost)
    if (parts[0] === 169 && parts[1] === 254) return false; // 169.254.0.0/16 (AWS/Cloud IMDS)
    if (parts[0] === 192 && parts[1] === 168) return false; // 192.168.0.0/16
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false; // 172.16.0.0/12
    if (parts[0] === 0) return false; // 0.0.0.0/8
    
    return true;
  }

  // IPv6 checks
  if (ip === "::1") return false; // Localhost
  if (ip.toLowerCase().startsWith("fc") || ip.toLowerCase().startsWith("fd")) return false; // Unique local
  if (ip.toLowerCase().startsWith("fe8") || ip.toLowerCase().startsWith("fe9") || ip.toLowerCase().startsWith("fea") || ip.toLowerCase().startsWith("feb")) return false; // Link local

  return true;
}

/**
 * Performs DNS resolution and checks if the hostname resolves to a public IP.
 * Also strictly enforces an allowlist for any non-squig/hangout domains.
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
  // We implicitly trust *.squig.link and graph.hangout.audio, but we'll still check their DNS just in case.
  const isTrustedAppDomain = host.endsWith(".squig.link") || host === "squig.link" || host === "graph.hangout.audio";
  const isAllowedThirdParty = ALLOWED_DOMAINS.has(host);

  if (!isTrustedAppDomain && !isAllowedThirdParty) {
    return { 
      safe: false, 
      reason: "Domain not in safe-list. Allowed domains: *.squig.link, graph.hangout.audio, raw.githubusercontent.com." 
    };
  }

  // 2. DNS Resolution & IP Check (SSRF Mitigation)
  try {
    // dns.lookup defaults to resolving to IPv4 if available
    const lookupResult = await dns.lookup(host);
    if (!lookupResult || !lookupResult.address) {
      return { safe: false, reason: "Could not resolve hostname to an IP address." };
    }

    if (!isPublicIp(lookupResult.address)) {
      return { safe: false, reason: "URL resolves to a private or blocked IP address." };
    }

    return { safe: true };
  } catch (error) {
    return { safe: false, reason: "DNS resolution failed." };
  }
}
