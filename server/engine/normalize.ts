/**
 * Result Normalization Module
 * Normalizes and deduplicates results from different tools
 */

export interface NormalizedResult {
  type: "subdomain" | "host" | "url" | "finding";
  value: string;
  metadata: Record<string, unknown>;
  source: string;
  discoveredAt: Date;
}

/**
 * Deduplicate results
 */
export function deduplicateResults(results: NormalizedResult[]): NormalizedResult[] {
  const seen = new Set<string>();
  const deduplicated: NormalizedResult[] = [];

  for (const result of results) {
    const key = `${result.type}:${result.value}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(result);
    }
  }

  return deduplicated;
}

/**
 * Normalize subdomain results
 */
export function normalizeSubdomains(
  subdomains: Array<{ subdomain: string; discoveredAt: Date; source: string }>
): NormalizedResult[] {
  return subdomains.map((s) => ({
    type: "subdomain",
    value: s.subdomain,
    metadata: { source: s.source },
    source: s.source,
    discoveredAt: s.discoveredAt,
  }));
}

/**
 * Normalize host results
 */
export function normalizeHosts(
  hosts: Array<{ host: string; isAlive: boolean; statusCode?: number; responseTime?: number; checkedAt: Date }>
): NormalizedResult[] {
  return hosts
    .filter((h) => h.isAlive)
    .map((h) => ({
      type: "host",
      value: h.host,
      metadata: {
        statusCode: h.statusCode,
        responseTime: h.responseTime,
        isAlive: h.isAlive,
      },
      source: "host-detection",
      discoveredAt: h.checkedAt,
    }));
}

/**
 * Normalize URL results
 */
export function normalizeUrls(
  urls: Array<{ url: string; statusCode?: number; contentType?: string; title?: string; discoveredAt: Date }>
): NormalizedResult[] {
  return urls.map((u) => ({
    type: "url",
    value: u.url,
    metadata: {
      statusCode: u.statusCode,
      contentType: u.contentType,
      title: u.title,
    },
    source: "url-crawling",
    discoveredAt: u.discoveredAt,
  }));
}

/**
 * Normalize finding results
 */
export function normalizeFindings(
  findings: Array<{ type: string; severity: string; title: string; description: string; evidence?: string }>
): NormalizedResult[] {
  return findings.map((f) => ({
    type: "finding",
    value: f.title,
    metadata: {
      findingType: f.type,
      severity: f.severity,
      description: f.description,
      evidence: f.evidence,
    },
    source: "vulnerability-scan",
    discoveredAt: new Date(),
  }));
}

/**
 * Sort results by type and importance
 */
export function sortResults(results: NormalizedResult[]): NormalizedResult[] {
  const typeOrder: Record<string, number> = { finding: 0, host: 1, url: 2, subdomain: 3 };
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

  return results.sort((a, b) => {
    // Sort by type first
    const typeCompare = (typeOrder[a.type] ?? 5) - (typeOrder[b.type] ?? 5);
    if (typeCompare !== 0) return typeCompare;

    // For findings, sort by severity
    if (a.type === "finding") {
      const aSeverity = severityOrder[(a.metadata.severity as string) || "info"] ?? 5;
      const bSeverity = severityOrder[(b.metadata.severity as string) || "info"] ?? 5;
      return aSeverity - bSeverity;
    }

    // Default: sort by value
    return a.value.localeCompare(b.value);
  });
}

/**
 * Generate summary statistics
 */
export function generateSummary(results: NormalizedResult[]) {
  const summary = {
    totalResults: results.length,
    subdomains: results.filter((r) => r.type === "subdomain").length,
    hosts: results.filter((r) => r.type === "host").length,
    urls: results.filter((r) => r.type === "url").length,
    findings: results.filter((r) => r.type === "finding").length,
    criticalFindings: results.filter(
      (r) => r.type === "finding" && r.metadata.severity === "critical"
    ).length,
    highFindings: results.filter((r) => r.type === "finding" && r.metadata.severity === "high").length,
  };

  return summary;
}
