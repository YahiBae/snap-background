import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
<<<<<<< HEAD
import { Upload, ImageIcon, CreditCard, Clock, TrendingUp, Settings } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
=======
import { Upload, ImageIcon, CreditCard, Clock, TrendingUp } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getUsageStats } from "@/lib/usage";
>>>>>>> f8109bf (feat: add Developer Portal for managing API keys and usage statistics)

const stats = [
  { icon: ImageIcon, label: "Images Today", value: "3 / 5", color: "text-primary" },
  { icon: CreditCard, label: "Plan", value: "Free", color: "text-accent" },
  { icon: Clock, label: "Avg Time", value: "2.1s", color: "text-secondary" },
  { icon: TrendingUp, label: "Total Processed", value: "47", color: "text-primary" },
];

<<<<<<< HEAD
const recentUploads = [
  { name: "portrait.jpg", date: "2 hours ago", status: "Done" },
  { name: "product-photo.png", date: "5 hours ago", status: "Done" },
  { name: "team-pic.webp", date: "Yesterday", status: "Done" },
];

const Dashboard = () => {
  const currentUser = getCurrentUser();
=======
type HistoryRow = {
  id: string;
  createdAt: string;
  originalName: string;
};

const Dashboard = () => {
import { Upload, ImageIcon, CreditCard, Clock, TrendingUp } from "lucide-react";
  const usage = currentUser ? getUsageStats(currentUser) : null;
  const recentUploads: HistoryRow[] = (() => {
    if (typeof window === "undefined") {
const HISTORY_STORAGE_KEY = "snap-background-history";
    }
type HistoryRow = {
  id: string;
  createdAt: string;
  originalName: string;
};
      return [];
    }
  })();

  const stats = [
    { icon: ImageIcon, label: "Images Today", value: usage ? `${usage.usedToday} / ${usage.dailyLimit}` : "0 / 0", color: "text-primary" },
    { icon: CreditCard, label: "Plan", value: usage && usage.dailyLimit > 5 ? "Pro" : "Free", color: "text-accent" },
    { icon: Clock, label: "Avg Time", value: `${(usage?.averageSeconds ?? 0).toFixed(1)}s`, color: "text-secondary" },
    { icon: TrendingUp, label: "Total Processed", value: String(usage?.totalProcessed ?? 0), color: "text-primary" },
  ];
>>>>>>> f8109bf (feat: add Developer Portal for managing API keys and usage statistics)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-heading font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back{currentUser ? `, ${currentUser.name}` : ""}! Here's your overview.
            </p>
          </div>
          <Link to="/upload">
            <Button variant="cta" className="rounded-xl">
              <Upload className="w-4 h-4 mr-2" />
              New Upload
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

<<<<<<< HEAD
        {/* Recent Uploads */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Uploads</h2>
          <div className="space-y-3">
            {recentUploads.map((u) => (
              <div key={u.name} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
=======
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Uploads</h2>
          <div className="space-y-3">
            {recentUploads.length === 0 && (
              <p className="text-sm text-muted-foreground">No uploads yet. Process your first image in the workspace.</p>
            )}
            {recentUploads.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
>>>>>>> f8109bf (feat: add Developer Portal for managing API keys and usage statistics)
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted/30 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
<<<<<<< HEAD
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.date}</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{u.status}</span>
=======
                    <p className="text-sm font-medium">{u.originalName}</p>
                    <p className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">Done</span>
>>>>>>> f8109bf (feat: add Developer Portal for managing API keys and usage statistics)
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
