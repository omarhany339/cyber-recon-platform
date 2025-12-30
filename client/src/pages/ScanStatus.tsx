import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function ScanStatus() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/scan/:scanId");

  const scanId = params?.scanId as string;
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: scan, isLoading, refetch } = trpc.scan.getStatus.useQuery(
    { scanId },
    { enabled: !!scanId && !!user, refetchInterval: autoRefresh ? 2000 : false }
  );

  useEffect(() => {
    if (scan?.status === "completed" || scan?.status === "failed") {
      setAutoRefresh(false);
    }
  }, [scan?.status]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container py-12">
          <Button variant="outline" onClick={() => navigate("/")} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <Card className="card-cyber text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Scan Not Found</h2>
            <p className="text-muted-foreground">The scan you're looking for doesn't exist.</p>
          </Card>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      queued: "badge-queued",
      running: "badge-running",
      completed: "badge-completed",
      failed: "badge-failed",
    };
    return badges[status] || "badge-info";
  };

  const getStatusIcon = (status: string) => {
    if (status === "completed") return <CheckCircle className="w-6 h-6 text-green-400" />;
    if (status === "failed") return <AlertCircle className="w-6 h-6 text-red-400" />;
    if (status === "running") return <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />;
    return <Loader2 className="w-6 h-6 text-gray-400" />;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border/50 py-6 px-4 md:px-8">
        <div className="container">
          <Button variant="outline" onClick={() => navigate("/")} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-3xl font-bold">Scan Status</h1>
          <p className="text-muted-foreground mt-2">Target: {scan.target}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-12 px-4 md:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Status Card */}
          <Card className="card-cyber mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {getStatusIcon(scan.status)}
                <div>
                  <h2 className="text-2xl font-bold">Scan {scan.status.toUpperCase()}</h2>
                  <p className="text-muted-foreground text-sm">ID: {scan.id}</p>
                </div>
              </div>
              <div className={`${getStatusBadge(scan.status)} px-4 py-2`}>
                {scan.status}
              </div>
            </div>

            {/* Progress Information */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {scan.progress}%
                  </span>
                </div>
                <div className="progress-cyber">
                  <div
                    className="progress-cyber-fill"
                    style={{ width: `${scan.progress}%` }}
                  />
                </div>
              </div>

              {scan.currentStep && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Current Step: <span className="text-cyan-400">{scan.currentStep}</span>
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                <div>
                  <p className="text-xs text-muted-foreground">Started</p>
                  <p className="text-sm font-medium">
                    {new Date(scan.createdAt).toLocaleString()}
                  </p>
                </div>
                {scan.completedAt && (
                  <div>
                    <p className="text-xs text-muted-foreground">Completed</p>
                    <p className="text-sm font-medium">
                      {new Date(scan.completedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Error Message */}
          {scan.errorMessage && (
            <Card className="card-cyber border-red-500/50 mb-8">
              <div className="flex gap-4">
                <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-red-400 mb-1">Scan Failed</h3>
                  <p className="text-sm text-muted-foreground">{scan.errorMessage}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            {scan.status === "completed" && (
              <>
                <Button
                  onClick={() => navigate(`/results/${scan.id}`)}
                  className="btn-cyber flex-1"
                >
                  View Results
                </Button>
                <Button
                  onClick={() => navigate(`/report/${scan.id}`)}
                  variant="outline"
                  className="flex-1"
                >
                  Download Report
                </Button>
              </>
            )}
            {(scan.status === "running" || scan.status === "queued") && (
              <Button
                onClick={() => refetch()}
                variant="outline"
                className="w-full"
              >
                <Loader2 className="w-4 h-4 mr-2" />
                Refresh Status
              </Button>
            )}
            {scan.status === "failed" && (
              <Button
                onClick={() => navigate("/")}
                className="btn-cyber w-full"
              >
                Start New Scan
              </Button>
            )}
          </div>

          {/* Info Box */}
          <div className="mt-8 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
            <p className="text-sm text-muted-foreground">
              {scan.status === "running" || scan.status === "queued"
                ? "Scan is in progress. This page will automatically update every 2 seconds."
                : scan.status === "completed"
                  ? "Scan completed successfully! View the results to see discovered assets and vulnerabilities."
                  : "Scan failed. Please check the error message above and try again."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
