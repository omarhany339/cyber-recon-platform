import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Shield, Zap, BarChart3 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [target, setTarget] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const startScan = trpc.scan.start.useMutation();

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!target.trim()) {
      setError("Please enter a target domain");
      return;
    }

    setIsLoading(true);
    try {
      const result = await startScan.mutateAsync({ target: target.trim() });
      if (result.scanId) {
        navigate(`/scan/${result.scanId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start scan");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-cyan-500" />
            <h1 className="text-xl font-bold">Cyber Recon</h1>
          </div>
          {isAuthenticated ? (
            <div className="text-sm text-muted-foreground">
              Welcome, <span className="text-cyan-400">{user?.name}</span>
            </div>
          ) : (
            <Button asChild variant="outline" size="sm">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 md:px-8">
        <div className="container max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <h2 className="text-5xl md:text-6xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400">
              Security Automation Platform
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Automated reconnaissance and vulnerability scanning for security professionals
            </p>
          </div>

          {!isAuthenticated ? (
            <div className="bg-card-cyber rounded-lg border border-cyan-500/30 p-8 mb-12">
              <p className="text-muted-foreground mb-6">Sign in to start scanning</p>
              <Button asChild size="lg" className="btn-cyber">
                <a href={getLoginUrl()}>Sign In to Get Started</a>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleScan} className="card-cyber mb-12 border-cyan-500/50">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Target Domain</label>
                  <Input
                    type="text"
                    placeholder="example.com"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="input-cyber w-full"
                    disabled={isLoading}
                  />
                  {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                </div>
                <Button
                  type="submit"
                  disabled={isLoading || !target.trim()}
                  className="btn-cyber w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting Scan...
                    </>
                  ) : (
                    "Run Scan"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 md:px-8 border-t border-border/50">
        <div className="container max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">Core Features</h3>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Subdomain Discovery */}
            <Card className="card-cyber">
              <div className="flex flex-col items-center text-center">
                <Zap className="w-12 h-12 text-cyan-400 mb-4" />
                <h4 className="text-lg font-bold mb-2">Subdomain Discovery</h4>
                <p className="text-muted-foreground text-sm">
                  Automatically discover subdomains using multiple techniques including certificate transparency
                </p>
              </div>
            </Card>

            {/* Live Host Detection */}
            <Card className="card-cyber">
              <div className="flex flex-col items-center text-center">
                <Shield className="w-12 h-12 text-purple-400 mb-4" />
                <h4 className="text-lg font-bold mb-2">Live Host Detection</h4>
                <p className="text-muted-foreground text-sm">
                  Identify active hosts and services running on discovered subdomains
                </p>
              </div>
            </Card>

            {/* Vulnerability Scanning */}
            <Card className="card-cyber">
              <div className="flex flex-col items-center text-center">
                <BarChart3 className="w-12 h-12 text-red-400 mb-4" />
                <h4 className="text-lg font-bold mb-2">Vulnerability Scanning</h4>
                <p className="text-muted-foreground text-sm">
                  Scan for common vulnerabilities, misconfigurations, and security issues
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 md:px-8 border-t border-border/50">
        <div className="container max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">How It Works</h3>
          <div className="space-y-6">
            {[
              { step: 1, title: "Enter Target", desc: "Provide the domain you want to scan" },
              { step: 2, title: "Run Scan", desc: "Our tools automatically discover assets and vulnerabilities" },
              { step: 3, title: "View Results", desc: "Get detailed reports with findings and recommendations" },
              { step: 4, title: "Download Report", desc: "Export results in JSON or PDF format" },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
                  <span className="text-cyan-400 font-bold">{item.step}</span>
                </div>
                <div>
                  <h4 className="font-bold mb-1">{item.title}</h4>
                  <p className="text-muted-foreground text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4 md:px-8 text-center text-muted-foreground text-sm">
        <div className="container">
          <p>Cyber Security Automation Platform &copy; 2025</p>
        </div>
      </footer>
    </div>
  );
}
