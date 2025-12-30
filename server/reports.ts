/**
 * Report Generation System
 * Generates JSON and PDF reports from scan results
 */

import { getScanById, getScanResults, getScanFindings } from "./db";
import { generateSummary, NormalizedResult, sortResults } from "./engine/normalize";

export interface ScanReport {
  scanId: string;
  target: string;
  scanDate: Date;
  completedAt?: Date;
  summary: ReturnType<typeof generateSummary>;
  findings: Array<{
    type: string;
    severity: string;
    title: string;
    description: string;
    evidence?: string;
  }>;
  subdomains: string[];
  liveHosts: string[];
  urls: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
  recommendations: string[];
}

/**
 * Generate JSON report
 */
export async function generateJsonReport(scanId: string): Promise<ScanReport | null> {
  try {
    const scan = await getScanById(scanId);
    if (!scan) return null;

    const results = await getScanResults(scanId);
    const findings = await getScanFindings(scanId);

    // Extract different types of results
    const subdomains = results
      .filter((r) => r.resultType === "subdomain")
      .map((r) => (r.data as Record<string, unknown>).subdomain || "")
      .filter(Boolean) as string[];

    const liveHosts = results
      .filter((r) => r.resultType === "host")
      .map((r) => (r.data as Record<string, unknown>).host || "")
      .filter(Boolean) as string[];

    const urls = results
      .filter((r) => r.resultType === "url")
      .map((r) => (r.data as Record<string, unknown>).url || "")
      .filter(Boolean) as string[];

    // Calculate risk level
    const criticalCount = findings.filter((f) => (f.severity || "info") === "critical").length;
    const highCount = findings.filter((f) => (f.severity || "info") === "high").length;

    let riskLevel: "low" | "medium" | "high" | "critical" = "low";
    if (criticalCount > 0) riskLevel = "critical";
    else if (highCount > 0) riskLevel = "high";
    else if (findings.length > 0) riskLevel = "medium";

    // Generate recommendations
    const recommendations = findings
      .filter((f) => f.severity === "critical" || f.severity === "high")
      .map((f) => `Address ${f.findingType}: ${f.value}`)
      .slice(0, 5);

    const report: ScanReport = {
      scanId,
      target: scan.target,
      scanDate: scan.createdAt,
      completedAt: scan.completedAt || undefined,
      summary: {
        totalResults: subdomains.length + liveHosts.length + urls.length + findings.length,
        subdomains: subdomains.length,
        hosts: liveHosts.length,
        urls: urls.length,
        findings: findings.length,
        criticalFindings: criticalCount,
        highFindings: highCount,
      },
      findings: findings.map((f) => ({
        type: f.findingType,
        severity: f.severity || "info",
        title: f.value,
        description: String((f.metadata as Record<string, unknown>)?.description || ""),
        evidence: (f.metadata as Record<string, unknown>)?.evidence as string | undefined,
      })),
      subdomains,
      liveHosts,
      urls,
      riskLevel,
      recommendations,
    };

    return report;
  } catch (error) {
    console.error("Failed to generate JSON report:", error);
    return null;
  }
}

/**
 * Generate PDF report
 */
export async function generatePdfReport(scanId: string): Promise<Buffer | null> {
  try {
    const report = await generateJsonReport(scanId);
    if (!report) return null;

    // Generate HTML content
    const htmlContent = generateReportHtml(report);

    // In production, use a library like puppeteer or weasyprint
    // For now, return the HTML as a placeholder
    return Buffer.from(htmlContent, "utf-8");
  } catch (error) {
    console.error("Failed to generate PDF report:", error);
    return null;
  }
}

/**
 * Generate HTML report content
 */
function generateReportHtml(report: ScanReport): string {
  const severityColors: Record<string, string> = {
    critical: "#ff4444",
    high: "#ff8800",
    medium: "#ffbb00",
    low: "#00bb00",
    info: "#0088ff",
  };

  const findingsHtml = report.findings
    .map((f) => {
      const color = severityColors[f.severity] || "#999";
      return `
    <div style="margin: 15px 0; padding: 10px; border-left: 4px solid ${color}; background: #f5f5f5;">
      <h4 style="margin: 0 0 5px 0; color: ${color};">${f.title}</h4>
      <p style="margin: 5px 0; font-size: 12px;"><strong>Severity:</strong> ${f.severity}</p>
      <p style="margin: 5px 0; font-size: 12px;">${f.description}</p>
      ${f.evidence ? `<p style="margin: 5px 0; font-size: 11px; color: #666;"><strong>Evidence:</strong> ${f.evidence}</p>` : ""}
    </div>
  `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Security Scan Report - ${report.target}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #333; background: #fff; }
    .header { background: #1a1a1a; color: #fff; padding: 20px; text-align: center; }
    .header h1 { margin: 0; }
    .content { max-width: 900px; margin: 0 auto; padding: 20px; }
    .section { margin: 20px 0; }
    .section h2 { border-bottom: 2px solid #1a1a1a; padding-bottom: 10px; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 15px 0; }
    .summary-item { background: #f5f5f5; padding: 15px; text-align: center; border-radius: 5px; }
    .summary-item .number { font-size: 24px; font-weight: bold; color: #1a1a1a; }
    .summary-item .label { font-size: 12px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #1a1a1a; color: #fff; padding: 10px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    tr:nth-child(even) { background: #f9f9f9; }
    .risk-critical { color: #ff4444; font-weight: bold; }
    .risk-high { color: #ff8800; font-weight: bold; }
    .risk-medium { color: #ffbb00; font-weight: bold; }
    .risk-low { color: #00bb00; font-weight: bold; }
    .footer { text-align: center; font-size: 12px; color: #999; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Security Scan Report</h1>
    <p>Target: ${report.target}</p>
    <p>Scan Date: ${report.scanDate.toLocaleString()}</p>
  </div>

  <div class="content">
    <div class="section">
      <h2>Executive Summary</h2>
      <div class="summary">
        <div class="summary-item">
          <div class="number">${report.summary.findings}</div>
          <div class="label">Total Findings</div>
        </div>
        <div class="summary-item">
          <div class="number risk-critical">${report.summary.criticalFindings}</div>
          <div class="label">Critical Issues</div>
        </div>
        <div class="summary-item">
          <div class="number risk-high">${report.summary.highFindings}</div>
          <div class="label">High Severity</div>
        </div>
      </div>
      <p><strong>Overall Risk Level:</strong> <span class="risk-${report.riskLevel}">${report.riskLevel.toUpperCase()}</span></p>
    </div>

    <div class="section">
      <h2>Discovery Summary</h2>
      <div class="summary">
        <div class="summary-item">
          <div class="number">${report.summary.subdomains}</div>
          <div class="label">Subdomains</div>
        </div>
        <div class="summary-item">
          <div class="number">${report.summary.hosts}</div>
          <div class="label">Live Hosts</div>
        </div>
        <div class="summary-item">
          <div class="number">${report.summary.urls}</div>
          <div class="label">URLs Found</div>
        </div>
      </div>
    </div>

    ${
      report.liveHosts.length > 0
        ? `
    <div class="section">
      <h2>Live Hosts</h2>
      <table>
        <tr><th>Host</th></tr>
        ${report.liveHosts.map((h) => `<tr><td>${h}</td></tr>`).join("")}
      </table>
    </div>
    `
        : ""
    }

    ${
      report.findings.length > 0
        ? `
    <div class="section">
      <h2>Security Findings</h2>
      ${findingsHtml}
    </div>
    `
        : ""
    }

    ${
      report.recommendations.length > 0
        ? `
    <div class="section">
      <h2>Recommendations</h2>
      <ol>
        ${report.recommendations.map((r) => `<li>${r}</li>`).join("")}
      </ol>
    </div>
    `
        : ""
    }

    <div class="footer">
      <p>Generated by Cyber Security Automation Platform</p>
      <p>Report ID: ${report.scanId}</p>
    </div>
  </div>
</body>
</html>
  `;
}
