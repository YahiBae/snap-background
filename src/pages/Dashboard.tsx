import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { Upload, ImageIcon, CreditCard, Clock, TrendingUp } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getUsageStats } from "@/lib/usage";

const HISTORY_STORAGE_KEY = "snap-background-history";

type HistoryRow = {
  id: string;
  createdAt: string;
  originalName: string;
};

const Dashboard = () => {
  const currentUser = getCurrentUser();
  const usage = currentUser ? getUsageStats(currentUser) : null;
  const recentUploads: HistoryRow[] = (() => {
    if (typeof window === "undefined") {
      return [];
    }

    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as HistoryRow[];
      return parsed.slice(0, 5);
    } catch {
      return [];
    }
  })();

  const stats = [
    { icon: ImageIcon, label: "Images Today", value: usage ? `${usage.usedToday} / ${usage.dailyLimit}` : "0 / 0", color: "text-primary" },
    { icon: CreditCard, label: "Plan", value: usage && usage.dailyLimit > 5 ? "Pro" : "Free", color: "text-accent" },
    { icon: Clock, label: "Avg Time", value: `${(usage?.averageSeconds ?? 0).toFixed(1)}s`, color: "text-secondary" },
    { icon: TrendingUp, label: "Total Processed", value: String(usage?.totalProcessed ?? 0), color: "text-primary" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex flex-col items-center text-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back{currentUser ? `, ${currentUser.name}` : ""}! Here's your overview.
            </p>
          </div>
          <Link to="/upload">
            <Button variant="cta" className="rounded-xl">
              <Upload className="w-4 h-4 mr-2" />
              Photo Upload
            </Button>
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="glass-card rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-semibold">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Uploads</h2>
          <div className="space-y-3">
            {recentUploads.length === 0 && (
              <p className="text-sm text-muted-foreground">No uploads yet. Process your first image in the workspace.</p>
            )}
            {recentUploads.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted/30 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{u.originalName}</p>
                    <p className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">Done</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
