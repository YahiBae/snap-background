import { useMemo, useState } from "react";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentUser } from "@/lib/auth";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/apiKeys";
import { getApiUsageByKey, getRecentApiUsage } from "@/lib/usage";
import { toast } from "sonner";

const DeveloperPortal = () => {
  const user = getCurrentUser();
  const [label, setLabel] = useState("Production");
  const [refreshTick, setRefreshTick] = useState(0);

  const apiKeys = useMemo(() => (user ? listApiKeys(user) : []), [user, refreshTick]);
  const usageByKey = useMemo(() => getApiUsageByKey(), [refreshTick]);
  const recentUsage = useMemo(() => getRecentApiUsage(20), [refreshTick]);

  if (!user) {
    return null;
  }

  const handleCreateKey = () => {
    const key = createApiKey(user, label);
    setRefreshTick((prev) => prev + 1);
    setLabel("Production");
    navigator.clipboard.writeText(key.key).catch(() => {
      // noop
    });
    toast.success("API key created and copied.");
  };

  const handleRevoke = (keyId: string) => {
    if (!revokeApiKey(user, keyId)) {
      toast.error("Could not revoke key.");
      return;
    }

    setRefreshTick((prev) => prev + 1);
    toast.success("API key revoked.");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold mb-2">Developer Portal</h1>
          <p className="text-muted-foreground">Manage API keys, monitor usage, and copy ready-to-use API snippets.</p>
        </div>

        <div className="glass-card rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create API Key</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Key label" className="bg-muted/30 border-border" />
            <Button variant="cta" onClick={handleCreateKey}>
              <Plus className="w-4 h-4 mr-2" />
              Create Key
            </Button>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Your Keys</h2>
          {apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys yet. Create your first key above.</p>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <KeyRound className="w-4 h-4" />
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Created {new Date(item.createdAt).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">Calls: {usageByKey[item.id] ?? 0}</p>
                    <p className="text-xs font-mono mt-2 break-all">{item.key}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="cta-outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(item.key).catch(() => {
                          // noop
                        });
                        toast.success("Copied API key.");
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                    <Button variant="ghost" size="sm" disabled={Boolean(item.revokedAt)} onClick={() => handleRevoke(item.id)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      {item.revokedAt ? "Revoked" : "Revoke"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Quick Start</h2>
          <pre className="text-xs overflow-x-auto rounded-xl bg-muted/30 p-4 border border-border/50"><code>{`curl -X POST https://your-domain.com/api/v1/remove-background \\
  -H "x-api-key: sk_live_xxx" \\
  -H "x-owner-email: ${user.email}" \\
  -H "Content-Type: image/png" \\
  --data-binary @input.png`}</code></pre>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Recent API Usage</h2>
          {recentUsage.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API calls recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {recentUsage.map((event) => (
                <div key={event.id} className="text-sm border-b border-border/40 last:border-0 py-2 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs">{event.endpoint}</span>
                  <span className="text-muted-foreground text-xs">{new Date(event.createdAt).toLocaleString()}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{event.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeveloperPortal;
