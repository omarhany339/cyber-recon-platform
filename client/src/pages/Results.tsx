import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowLeft, Download, Filter } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Results() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/results/:scanId");
  const [filterType, setFilterType] = useState<string | null>(null);

  const scanId = params?.scanId as string;

  const { data: report, isLoading } = trpc.scan.getReport.useQuery(
    { scanId, format: "json" },
    { enabled: !!scanId && !!user }
  );

  const reportData = report && 'findings' in report ? report : null;

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container py-12">
          <Button variant="outline" onClick={() => navigate("/")} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <Card className="card-cyber text-center py-12">
            <p className="text-muted-foreground">Report not found</p>
          </Card>
        </div>
      </div>
    );
  }

  if (reportData === null) return null;

  const getSeverityBadge = (severity: string) => {
    const badges: Record<string, string> = {
      critical: "badge-critical",
      high: "badge-high",
      medium: "badge-medium",
      low: "badge-low",
      info: "badge-info",
    };
    return badges[severity] || "badge-info";
  };

  const getRiskBadge = (risk: string) => {
    const badges: Record<string, string> = {
      critical: "badge-critical",
      high: "badge-high",
      medium: "badge-medium",
      low: "badge-low",
    };
    return badges[risk] || "badge-info";
  };

  const filteredFindings = filterType
    ? reportData.findings.filter((f) => f.severity === filterType)
    : reportData.findings;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border/50 py-6 px-4 md:px-8">
        <div className="container">
          <Button variant="outline" onClick={() => navigate("/")} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Scan Results</h1>
              <p className="text-muted-foreground mt-2">Target: {reportData.target}</p>
            </div>
            <div className={`${getRiskBadge(reportData.riskLevel)} px-4 py-2 text-lg`}>
              {reportData.riskLevel.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-12 px-4 md:px-8">
        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="card-cyber text-center">
            <div className="text-3xl font-bold text-cyan-400">{reportData.summary.subdomains}</div>
            <div className="text-sm text-muted-foreground mt-2">Subdomains</div>
          </Card>
          <Card className="card-cyber text-center">
            <div className="text-3xl font-bold text-purple-400">{reportData.summary.hosts}</div>
            <div className="text-sm text-muted-foreground mt-2">Live Hosts</div>
          </Card>
          <Card className="card-cyber text-center">
            <div className="text-3xl font-bold text-blue-400">{reportData.summary.urls}</div>
            <div className="text-sm text-muted-foreground mt-2">URLs Found</div>
          </Card>
          <Card className="card-cyber text-center">
            <div className="text-3xl font-bold text-red-400">{reportData.summary.findings}</div>
            <div className="text-sm text-muted-foreground mt-2">Findings</div>
          </Card>
        </div>

        {/* Risk Summary */}
        <Card className="card-cyber mb-8">
          <h3 className="text-xl font-bold mb-4">Risk Summary</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Critical Issues</p>
              <p className="text-2xl font-bold text-red-400">{reportData.summary.criticalFindings}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">High Severity</p>
              <p className="text-2xl font-bold text-orange-400">{reportData.summary.highFindings}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Findings</p>
              <p className="text-2xl font-bold text-cyan-400">{reportData.summary.findings}</p>
            </div>
          </div>
        </Card>

        {/* Live Hosts */}
        {reportData.liveHosts.length > 0 && (
          <Card className="card-cyber mb-8">
            <h3 className="text-xl font-bold mb-4">Live Hosts ({reportData.liveHosts.length})</h3>
            <div className="overflow-x-auto">
              <table className="table-cyber w-full">
                <thead>
                  <tr>
                    <th>Host</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.liveHosts.map((host, idx) => (
                    <tr key={idx}>
                      <td className="font-mono text-sm text-cyan-400">{host}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Findings */}
        {reportData.findings.length > 0 && (
          <Card className="card-cyber mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Security Findings ({filteredFindings.length})</h3>
              <div className="flex gap-2">
                <Button
                  variant={filterType === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType(null)}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  All
                </Button>
                {["critical", "high", "medium", "low"].map((severity) => (
                  <Button
                    key={severity}
                    variant={filterType === severity ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType(severity)}
                  >
                    {severity}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {filteredFindings.map((finding, idx) => (
                <div key={idx} className="border border-border/50 rounded-lg p-4 hover:bg-black/20 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-bold">{finding.title}</h4>
                    <div className={getSeverityBadge(finding.severity)}>
                      {finding.severity}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{finding.description}</p>
                  {finding.evidence && (
                    <p className="text-xs text-cyan-400/70 font-mono">
                      Evidence: {finding.evidence}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Recommendations */}
        {reportData.recommendations.length > 0 && (
          <Card className="card-cyber mb-8">
            <h3 className="text-xl font-bold mb-4">Recommendations</h3>
            <ol className="space-y-2 list-decimal list-inside">
              {reportData.recommendations.map((rec: string, idx: number) => (
                <li key={idx} className="text-sm text-muted-foreground">
                  {rec}
                </li>
              ))}
            </ol>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button className="btn-cyber flex-1" onClick={() => navigate("/")}>
            Start New Scan
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              const dataStr = JSON.stringify(reportData, null, 2);
              const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
              const exportFileDefaultName = `scan-${scanId}.json`;
              const linkElement = document.createElement("a");
              linkElement.setAttribute("href", dataUri);
              linkElement.setAttribute("download", exportFileDefaultName);
              linkElement.click();
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Download JSON
          </Button>
        </div>
      </div>
    </div>
  );
}
