/**
 * Background Jobs System
 * Handles asynchronous scan execution
 */

import { nanoid } from "nanoid";
import { runFullScan, validateTarget } from "./engine/runner";
import {
  createScan,
  getScanById,
  updateScanStatus,
  saveScanResults,
  saveScanFindings,
} from "./db";
import {
  normalizeFindings,
  normalizeSubdomains,
  normalizeHosts,
  normalizeUrls,
} from "./engine/normalize";
import { invokeLLM } from "./_core/llm";

// In-memory job queue (in production, use Redis or similar)
const jobQueue: Map<string, { status: "pending" | "running" | "completed" | "failed"; error?: string }> = new Map();

/**
 * Start a new scan job
 */
export async function startScanJob(target: string, userId: number): Promise<string | null> {
  // Validate target
  const validation = validateTarget(target);
  if (!validation.valid) {
    console.error("Invalid target:", validation.error);
    return null;
  }

  const scanId = nanoid();

  try {
    // Create scan record
    const scan = await createScan({
      id: scanId,
      userId,
      target,
      status: "queued",
      progress: 0,
      totalSteps: 4,
    });

    if (!scan) {
      console.error("Failed to create scan record");
      return null;
    }

    // Add to job queue
    jobQueue.set(scanId, { status: "pending" });

    // Start background job (non-blocking)
    executeScanJob(scanId, target, userId).catch((error) => {
      console.error("Scan job failed:", error);
      jobQueue.set(scanId, { status: "failed", error: String(error) });
    });

    return scanId;
  } catch (error) {
    console.error("Failed to start scan job:", error);
    return null;
  }
}

/**
 * Execute scan job in background
 */
async function executeScanJob(scanId: string, target: string, userId: number): Promise<void> {
  try {
    jobQueue.set(scanId, { status: "running" });

    // Update scan status to running
    await updateScanStatus(scanId, "running", 0, "Starting scan");

    // Run the full scan
    const results = await runFullScan(target, async (progress) => {
      await updateScanStatus(scanId, "running", progress.progress, progress.currentStep);
    });

    // Save results to database
    const resultRecords = results.results.map((r) => ({
      id: nanoid(),
      scanId,
      toolName: r.source,
      resultType: r.type,
      data: r.metadata,
    }));

    await saveScanResults(scanId, resultRecords);

    // Extract and save findings
    const findings = results.results
      .filter((r) => r.type === "finding")
      .map((r) => ({
        id: nanoid(),
        scanId,
        findingType: (r.metadata.findingType as string) || "unknown",
        value: r.value,
        severity: (r.metadata.severity as "info" | "low" | "medium" | "high" | "critical") || "info",
        metadata: r.metadata,
      }));

    await saveScanFindings(scanId, findings);

    // Generate LLM analysis
    const analysis = await generateLLMAnalysis(results);

    // Update scan with completion
    const scan = await getScanById(scanId);
    if (scan) {
      await updateScanStatus(scanId, "completed", 100, "Completed");
    }

    jobQueue.set(scanId, { status: "completed" });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Scan job execution failed:", errorMessage);

    await updateScanStatus(scanId, "failed", 0);
    jobQueue.set(scanId, { status: "failed", error: errorMessage });
  }
}

/**
 * Generate LLM analysis for scan results
 */
async function generateLLMAnalysis(results: Awaited<ReturnType<typeof runFullScan>>): Promise<string> {
  try {
    const findingsText = results.results
      .filter((r) => r.type === "finding")
      .map((r) => `- ${r.value}: ${r.metadata.description}`)
      .join("\n");

    const prompt = `Analyze the following security scan results and provide a brief executive summary with key recommendations:

Target: ${results.target}
Total Findings: ${results.summary.findings}
Critical Findings: ${results.summary.criticalFindings}
High Severity Findings: ${results.summary.highFindings}

Findings:
${findingsText}

Please provide:
1. A brief risk assessment
2. Top 3 immediate actions
3. Long-term security improvements`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a cybersecurity expert providing security analysis reports.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const analysis = response.choices[0]?.message?.content || "";
    return typeof analysis === "string" ? analysis : JSON.stringify(analysis);
  } catch (error) {
    console.error("Failed to generate LLM analysis:", error);
    return "Analysis generation failed";
  }
}

/**
 * Get job status
 */
export function getJobStatus(scanId: string): { status: "pending" | "running" | "completed" | "failed" | "unknown"; error?: string } {
  const job = jobQueue.get(scanId);
  return job || { status: "unknown" };
}

/**
 * Get all active jobs
 */
export function getActiveJobs(): string[] {
  return Array.from(jobQueue.entries())
    .filter(([_, job]) => job.status === "pending" || job.status === "running")
    .map(([scanId]) => scanId);
}
