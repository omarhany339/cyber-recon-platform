/**
 * Template-based Scan Module
 * Scans for common vulnerabilities and misconfigurations
 */

interface Finding {
  type: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  evidence?: string;
  recommendation?: string;
}

/**
 * Scan for common security issues
 */
export async function scanForVulnerabilities(hosts: string[]): Promise<Finding[]> {
  // Simulate scanning delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const findings: Finding[] = [];
  const vulnerabilityTemplates = [
    {
      type: "open-directory",
      severity: "medium" as const,
      title: "Open Directory Listing",
      description: "Directory listing is enabled on the web server",
      recommendation: "Disable directory listing in web server configuration",
    },
    {
      type: "outdated-software",
      severity: "high" as const,
      title: "Outdated Software Detected",
      description: "Server is running outdated software versions",
      recommendation: "Update all software to the latest stable versions",
    },
    {
      type: "weak-ssl",
      severity: "medium" as const,
      title: "Weak SSL/TLS Configuration",
      description: "SSL/TLS configuration allows weak ciphers",
      recommendation: "Update SSL/TLS configuration to use strong ciphers only",
    },
    {
      type: "missing-headers",
      severity: "low" as const,
      title: "Missing Security Headers",
      description: "Important security headers are missing",
      recommendation: "Add security headers like CSP, X-Frame-Options, etc.",
    },
    {
      type: "default-credentials",
      severity: "critical" as const,
      title: "Default Credentials Detected",
      description: "Service is using default credentials",
      recommendation: "Change all default credentials immediately",
    },
  ];

  // Randomly select findings for each host
  for (const host of hosts) {
    const findingCount = Math.floor(Math.random() * 3) + 1;
    const selectedFindings = vulnerabilityTemplates
      .sort(() => Math.random() - 0.5)
      .slice(0, findingCount);

    for (const template of selectedFindings) {
      findings.push({
        ...template,
        evidence: `Found on ${host}`,
      });
    }
  }

  return findings;
}

/**
 * Check for common misconfigurations
 */
export async function checkMisconfigurations(hosts: string[]): Promise<Finding[]> {
  const findings: Finding[] = [];

  const misconfigurations = [
    {
      type: "cors-misconfiguration",
      severity: "medium" as const,
      title: "CORS Misconfiguration",
      description: "CORS is configured to allow all origins",
      recommendation: "Restrict CORS to specific trusted domains",
    },
    {
      type: "debug-mode",
      severity: "high" as const,
      title: "Debug Mode Enabled",
      description: "Application is running in debug mode",
      recommendation: "Disable debug mode in production",
    },
    {
      type: "exposed-config",
      severity: "critical" as const,
      title: "Exposed Configuration Files",
      description: "Configuration files are publicly accessible",
      recommendation: "Remove or restrict access to configuration files",
    },
  ];

  // Randomly select misconfigurations
  for (const host of hosts) {
    if (Math.random() > 0.5) {
      const misconfiguration = misconfigurations[Math.floor(Math.random() * misconfigurations.length)];
      findings.push({
        ...misconfiguration,
        evidence: `Found on ${host}`,
      });
    }
  }

  return findings;
}

/**
 * Analyze results and generate recommendations
 */
export function analyzeFindings(findings: Finding[]): {
  summary: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  recommendations: string[];
} {
  if (findings.length === 0) {
    return {
      summary: "No security issues found",
      riskLevel: "low",
      recommendations: ["Continue monitoring for new vulnerabilities"],
    };
  }

  const severityLevels = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
  const maxSeverity = Math.max(...findings.map((f) => severityLevels[f.severity]));

  const riskLevel = (
    Object.entries(severityLevels).find(([_, v]) => v === maxSeverity)?.[0] || "low"
  ) as "low" | "medium" | "high" | "critical";

  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const highCount = findings.filter((f) => f.severity === "high").length;

  const summary = `Found ${findings.length} security issues: ${criticalCount} critical, ${highCount} high`;

  const recommendations = findings
    .filter((f) => f.recommendation)
    .map((f) => f.recommendation!)
    .slice(0, 5);

  return { summary, riskLevel, recommendations };
}
