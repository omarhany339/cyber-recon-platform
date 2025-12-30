/**
 * Tools Engine Runner
 * Orchestrates execution of all security scanning tools
 */

import { discoverSubdomains, normalizeDomain } from "./subdomains";
import { detectLiveHosts } from "./live_hosts";
import { crawlUrls, detectEndpoints } from "./crawl";
import { scanForVulnerabilities, checkMisconfigurations } from "./template_scan";
import {
  normalizeSubdomains,
  normalizeHosts,
  normalizeUrls,
  normalizeFindings,
  deduplicateResults,
  sortResults,
  generateSummary,
  NormalizedResult,
} from "./normalize";

export interface ScanProgress {
  step: number;
  totalSteps: number;
  currentStep: string;
  progress: number;
}

export interface ScanResults {
  target: string;
  startedAt: Date;
  completedAt: Date;
  results: NormalizedResult[];
  summary: ReturnType<typeof generateSummary>;
  errors: string[];
}

/**
 * Main scan execution function
 * Runs all tools sequentially and aggregates results
 */
export async function runFullScan(
  target: string,
  onProgress?: (progress: ScanProgress) => void
): Promise<ScanResults> {
  const startedAt = new Date();
  const errors: string[] = [];
  const allResults: NormalizedResult[] = [];

  try {
    // Step 1: Normalize domain
    const totalSteps = 4;
    let currentStep = 1;

    onProgress?.({
      step: currentStep,
      totalSteps,
      currentStep: "Normalizing domain",
      progress: Math.round((currentStep / totalSteps) * 100),
    });

    const normalizedTarget = normalizeDomain(target);

    // Step 2: Discover subdomains
    currentStep = 2;
    onProgress?.({
      step: currentStep,
      totalSteps,
      currentStep: "Discovering subdomains",
      progress: Math.round((currentStep / totalSteps) * 100),
    });

    const subdomains = await discoverSubdomains(normalizedTarget);
    const normalizedSubdomains = normalizeSubdomains(subdomains);
    allResults.push(...normalizedSubdomains);

    // Step 3: Detect live hosts
    currentStep = 3;
    onProgress?.({
      step: currentStep,
      totalSteps,
      currentStep: "Detecting live hosts",
      progress: Math.round((currentStep / totalSteps) * 100),
    });

    const subdomainNames = subdomains.map((s) => s.subdomain);
    const liveHosts = await detectLiveHosts(subdomainNames);
    const normalizedHosts = normalizeHosts(liveHosts);
    allResults.push(...normalizedHosts);

    // Crawl URLs from live hosts
    const liveHostNames = liveHosts.filter((h) => h.isAlive).map((h) => h.host);
    const crawledUrls = await crawlUrls(liveHostNames);
    const normalizedUrls = normalizeUrls(crawledUrls);
    allResults.push(...normalizedUrls);

    // Detect endpoints
    for (const host of liveHostNames.slice(0, 3)) {
      const endpoints = await detectEndpoints(host);
      const normalizedEndpoints = normalizeUrls(endpoints);
      allResults.push(...normalizedEndpoints);
    }

    // Step 4: Scan for vulnerabilities
    currentStep = 4;
    onProgress?.({
      step: currentStep,
      totalSteps,
      currentStep: "Scanning for vulnerabilities",
      progress: Math.round((currentStep / totalSteps) * 100),
    });

    const vulnerabilities = await scanForVulnerabilities(liveHostNames);
    const misconfigurations = await checkMisconfigurations(liveHostNames);
    const allFindings = [...vulnerabilities, ...misconfigurations];
    const normalizedFindings = normalizeFindings(allFindings);
    allResults.push(...normalizedFindings);

    // Deduplicate and sort results
    const deduplicatedResults = deduplicateResults(allResults);
    const sortedResults = sortResults(deduplicatedResults);
    const summary = generateSummary(sortedResults);

    onProgress?.({
      step: totalSteps,
      totalSteps,
      currentStep: "Completed",
      progress: 100,
    });

    return {
      target: normalizedTarget,
      startedAt,
      completedAt: new Date(),
      results: sortedResults,
      summary,
      errors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(errorMessage);

    return {
      target,
      startedAt,
      completedAt: new Date(),
      results: allResults,
      summary: generateSummary(allResults),
      errors,
    };
  }
}

/**
 * Validate if target is suitable for scanning
 */
export function validateTarget(target: string): { valid: boolean; error?: string } {
  if (!target || target.trim().length === 0) {
    return { valid: false, error: "Target cannot be empty" };
  }

  if (target.length > 255) {
    return { valid: false, error: "Target is too long" };
  }

  // Basic domain validation
  const domainRegex = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;
  if (!domainRegex.test(target.replace(/^https?:\/\//, "").replace(/^www\./, ""))) {
    return { valid: false, error: "Invalid domain format" };
  }

  return { valid: true };
}
