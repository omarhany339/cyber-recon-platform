/**
 * Subdomain Discovery Module
 * Discovers subdomains for a given target domain
 */

import { nanoid } from "nanoid";

interface SubdomainResult {
  subdomain: string;
  discoveredAt: Date;
  source: string;
}

/**
 * Simulated subdomain discovery
 * In production, this would integrate with real tools like:
 * - crt.sh (Certificate Transparency)
 * - dnsdumpster
 * - subfinder
 * - assetfinder
 */
export async function discoverSubdomains(target: string): Promise<SubdomainResult[]> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Simulated results for demo purposes
  const commonSubdomains = [
    "www",
    "mail",
    "ftp",
    "localhost",
    "webmail",
    "smtp",
    "pop",
    "ns1",
    "ns2",
    "cpanel",
    "whm",
    "autodiscover",
    "autoconfig",
    "m",
    "admin",
    "api",
    "blog",
    "shop",
    "dev",
    "staging",
  ];

  const results: SubdomainResult[] = commonSubdomains.map((subdomain) => ({
    subdomain: `${subdomain}.${target}`,
    discoveredAt: new Date(),
    source: "certificate-transparency",
  }));

  // Add some random additional subdomains
  const additionalCount = Math.floor(Math.random() * 5) + 3;
  for (let i = 0; i < additionalCount; i++) {
    results.push({
      subdomain: `service${i + 1}.${target}`,
      discoveredAt: new Date(),
      source: "dns-enumeration",
    });
  }

  return results;
}

/**
 * Validate domain format
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;
  return domainRegex.test(domain) && domain.length <= 255;
}

/**
 * Normalize domain (remove protocol, www, trailing slash)
 */
export function normalizeDomain(domain: string): string {
  let normalized = domain.trim().toLowerCase();

  // Remove protocol
  if (normalized.startsWith("http://")) {
    normalized = normalized.substring(7);
  } else if (normalized.startsWith("https://")) {
    normalized = normalized.substring(8);
  }

  // Remove www prefix
  if (normalized.startsWith("www.")) {
    normalized = normalized.substring(4);
  }

  // Remove trailing slash
  normalized = normalized.replace(/\/$/, "");

  return normalized;
}
