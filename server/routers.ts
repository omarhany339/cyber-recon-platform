import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { startScanJob } from "./jobs";
import { getScanById, getUserScans } from "./db";
import { generateJsonReport, generatePdfReport } from "./reports";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  scan: router({
    /**
     * POST /api/scan - Start a new security scan
     */
    start: protectedProcedure
      .input(
        z.object({
          target: z.string().min(1).max(255),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const scanId = await startScanJob(input.target, ctx.user.id);
        if (!scanId) {
          throw new Error("Failed to start scan");
        }
        return { scanId, success: true };
      }),

    /**
     * GET /api/scan/{scan_id} - Get scan status
     */
    getStatus: protectedProcedure
      .input(
        z.object({
          scanId: z.string(),
        })
      )
      .query(async ({ input, ctx }) => {
        const scan = await getScanById(input.scanId);
        if (!scan) {
          throw new Error("Scan not found");
        }

        // Verify ownership
        if (scan.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new Error("Unauthorized");
        }

        return {
          id: scan.id,
          target: scan.target,
          status: scan.status,
          progress: scan.progress,
          totalSteps: scan.totalSteps,
          currentStep: scan.currentStep,
          createdAt: scan.createdAt,
          updatedAt: scan.updatedAt,
          completedAt: scan.completedAt,
          errorMessage: scan.errorMessage,
        };
      }),

    /**
     * GET /api/scan/{scan_id}/report - Get scan report
     */
    getReport: protectedProcedure
      .input(
        z.object({
          scanId: z.string(),
          format: z.enum(["json", "pdf"]).default("json"),
        })
      )
      .query(async ({ input, ctx }) => {
        const scan = await getScanById(input.scanId);
        if (!scan) {
          throw new Error("Scan not found");
        }

        // Verify ownership
        if (scan.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new Error("Unauthorized");
        }

        if (input.format === "json") {
          const report = await generateJsonReport(input.scanId);
          return report;
        } else {
          const report = await generatePdfReport(input.scanId);
          return report ? { success: true, buffer: report.toString("base64") } : null;
        }
      }),

    /**
     * GET /api/scans - Get user's scans
     */
    list: protectedProcedure.query(async ({ ctx }) => {
      const scans = await getUserScans(ctx.user.id);
      return scans.map((s) => ({
        id: s.id,
        target: s.target,
        status: s.status,
        progress: s.progress,
        createdAt: s.createdAt,
        completedAt: s.completedAt,
      }));
    }),
  }),
});

export type AppRouter = typeof appRouter;
