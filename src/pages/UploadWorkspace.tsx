import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import JSZip from "jszip";
import { Upload, X, Download, Loader2, ImageIcon, History, Package, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { listApiKeys } from "@/lib/apiKeys";
import { canProcessImages, getUsageStats, recordApiUsage, recordImageProcessed } from "@/lib/usage";

const WEBHOOK_URL = "https://sagarpun.app.n8n.cloud/webhook/remove-background";
const API_ENDPOINT = "/api/v1/remove-background";
const HISTORY_STORAGE_KEY = "snap-background-history";
const HISTORY_LIMIT = 30;
const MAX_BATCH = 20;

type HistoryItem = {
  id: string;
  createdAt: string;
  originalName: string;
  originalPreview: string;
  resultUrl: string;
};

type QueueStatus = "pending" | "processing" | "done" | "failed" | "blocked";

type QueueItem = {
  id: string;
  file: File;
  preview: string;
  status: QueueStatus;
  resultUrl: string | null;
  error: string | null;
};

type Preset = {
  id: string;
  name: string;
  filter: string;
  background: "transparent" | "white" | "studio";
};

const PRESETS: Preset[] = [
  { id: "balanced", name: "Balanced", filter: "brightness(1) contrast(1)", background: "transparent" },
  { id: "ecommerce", name: "E-commerce", filter: "brightness(1.03) contrast(1.08) saturate(1.08)", background: "white" },
  { id: "social", name: "Social", filter: "brightness(1.06) contrast(1.04) saturate(1.14)", background: "studio" },
  { id: "logo", name: "Logo", filter: "contrast(1.12) saturate(1.02)", background: "transparent" },
];

const makeDownloadName = (originalName: string) => {
  const dotIndex = originalName.lastIndexOf(".");
  const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
  return `${base}-no-bg`;
};

const normalizeImageUrl = (url: string) => {
  if (!url) return url;

  if (url.startsWith("http://")) {
    return `https://${url.slice("http://".length)}`;
  }

  return url;
};

const UploadWorkspace = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<"workspace" | "history">("workspace");
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [activePresetId, setActivePresetId] = useState(PRESETS[0].id);
  const [exportFormat, setExportFormat] = useState<"png" | "webp" | "jpeg">("png");
  const { toast } = useToast();
  const currentUser = getCurrentUser();

  const MAX_SIZE = 10 * 1024 * 1024;
  const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
  const activePreset = useMemo(() => PRESETS.find((preset) => preset.id === activePresetId) ?? PRESETS[0], [activePresetId]);
  const usageStats = currentUser ? getUsageStats(currentUser) : null;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as HistoryItem[];
      if (Array.isArray(parsed)) {
        const normalized = parsed.map((item) => ({
          ...item,
          resultUrl: normalizeImageUrl(String(item.resultUrl)),
        }));
        setHistoryItems(normalized);
        window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(normalized));
      }
    } catch {
      toast({ title: "History reset", description: "Could not load saved history.", variant: "destructive" });
    }
  }, [toast]);

  const saveHistory = useCallback((items: HistoryItem[]) => {
    setHistoryItems(items);
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
  }, []);

  const toPreview = useCallback(
    (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(String(event.target?.result || ""));
        reader.onerror = () => reject(new Error("Could not read image"));
        reader.readAsDataURL(file);
      }),
    []
  );

  const validateFile = useCallback((file: File) => {
    if (!ALLOWED.includes(file.type)) {
      return "Only JPG, PNG, WEBP allowed.";
    }

    if (file.size > MAX_SIZE) {
      return "Max size is 10MB.";
    }

    return null;
  }, []);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).slice(0, MAX_BATCH);
      const nextItems: QueueItem[] = [];

      for (const file of list) {
        const validationError = validateFile(file);
        if (validationError) {
          toast({ title: "Invalid file", description: `${file.name}: ${validationError}`, variant: "destructive" });
          continue;
        }

        try {
          const preview = await toPreview(file);
          nextItems.push({
            id: crypto.randomUUID(),
            file,
            preview,
            status: "pending",
            resultUrl: null,
            error: null,
          });
        } catch {
          toast({ title: "Read failed", description: `Could not read ${file.name}.`, variant: "destructive" });
        }
      }

      if (nextItems.length > 0) {
        setQueue((current) => [...current, ...nextItems].slice(0, MAX_BATCH));
        toast({ title: "Batch updated", description: `${nextItems.length} image(s) added to queue.` });
      }
    },
    [toPreview, toast, validateFile]
  );

  const setItemState = useCallback((id: string, patch: Partial<QueueItem>) => {
    setQueue((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragOver(false);
      if (event.dataTransfer.files?.length) {
        void addFiles(event.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      const pastedItems = Array.from(event.clipboardData?.items ?? []);
      const pastedFile = pastedItems.map((item) => item.getAsFile()).find((item) => item && ALLOWED.includes(item.type));

      if (!pastedFile) {
        return;
      }

      event.preventDefault();
      toast({ title: "Image pasted", description: "Clipboard image added successfully." });
      void addFiles([pastedFile]);
    },
    [ALLOWED, addFiles, toast]
  );

  useEffect(() => {
    window.addEventListener("paste", handlePaste);

    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [handlePaste]);

  const processFile = async (file: File) => {
    const callEndpoint = async (url: string) => {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": file.type,
          "X-File-Name": encodeURIComponent(file.name),
          "x-owner-email": currentUser?.email ?? "",
        },
        body: file,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Request failed with status ${response.status}`);
      }

      return response.json();
    };

    try {
      const data = await callEndpoint(API_ENDPOINT);
      const payload = data?.data ?? data;
      if (!payload?.url) {
        throw new Error("API response missing image URL.");
      }

      return normalizeImageUrl(String(payload.url));
    } catch {
      const fallbackData = await callEndpoint(WEBHOOK_URL);
      if (!fallbackData?.url) {
        throw new Error("Webhook response missing image URL.");
      }

      return normalizeImageUrl(String(fallbackData.url));
    }
  };

  const handleProcessBatch = async () => {
    if (queue.length === 0) {
      return;
    }

    if (!currentUser) {
      toast({ title: "Sign in required", description: "Please sign in to process images.", variant: "destructive" });
      return;
    }

    setProcessing(true);
    const nextHistory = [...historyItems];

    for (const item of queue) {
      if (item.status === "done") {
        continue;
      }

      if (!canProcessImages(currentUser, 1)) {
        setItemState(item.id, {
          status: "blocked",
          error: "Daily quota reached",
        });
        continue;
      }

      setItemState(item.id, {
        status: "processing",
        error: null,
      });

      const startedAt = performance.now();
      try {
        const resultUrl = await processFile(item.file);
        const duration = performance.now() - startedAt;
        recordImageProcessed(currentUser, duration);

        const activeKey = listApiKeys(currentUser).find((key) => !key.revokedAt);
        if (activeKey) {
          recordApiUsage({
            keyId: activeKey.id,
            endpoint: "/api/v1/remove-background",
            status: 200,
          });
        }

        setItemState(item.id, {
          status: "done",
          resultUrl,
        });

        nextHistory.unshift({
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          originalName: item.file.name,
          originalPreview: item.preview,
          resultUrl,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to process image.";
        setItemState(item.id, {
          status: "failed",
          error: message,
        });
      }
    }

    saveHistory(nextHistory.slice(0, HISTORY_LIMIT));
    setProcessing(false);
    toast({ title: "Batch complete", description: "Processing finished for current queue." });
  };

  const reset = () => {
    setQueue([]);
  };

  const getBackgroundStyle = (preset: Preset) => {
    if (preset.background === "white") {
      return { background: "#ffffff" };
    }

    if (preset.background === "studio") {
      return { background: "linear-gradient(135deg, #f5f3ff 0%, #e2f3ff 100%)" };
    }

    return {
      backgroundImage: "repeating-conic-gradient(hsl(var(--muted)) 0% 25%, transparent 0% 50%)",
      backgroundSize: "16px 16px",
    };
  };

  const renderProcessedBlob = useCallback(
    async (imageUrl: string) => {
      const response = await fetch(normalizeImageUrl(imageUrl));
      if (!response.ok) {
        throw new Error("Could not fetch processed image.");
      }

      const sourceBlob = await response.blob();
      const objectUrl = URL.createObjectURL(sourceBlob);

      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Could not decode image."));
        img.src = objectUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(objectUrl);
        throw new Error("Canvas context unavailable.");
      }

      if (activePreset.background === "white") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (activePreset.background === "studio") {
        const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, "#f5f3ff");
        gradient.addColorStop(1, "#e2f3ff");
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      context.filter = activePreset.filter;
      context.drawImage(image, 0, 0);
      URL.revokeObjectURL(objectUrl);

      const mime = exportFormat === "png" ? "image/png" : exportFormat === "webp" ? "image/webp" : "image/jpeg";
      const outputBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, 0.92));
      if (!outputBlob) {
        throw new Error("Failed to render output.");
      }

      return outputBlob;
    },
    [activePreset.background, activePreset.filter, exportFormat]
  );

  const handleDownload = useCallback(
    async (imageUrl: string, originalName: string, id = "current") => {
      setDownloadingId(id);

      try {
        const blob = await renderProcessedBlob(imageUrl);
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = `${makeDownloadName(originalName)}.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
      } catch {
        toast({
          title: "Download failed",
          description: "Could not download automatically. Please try again.",
          variant: "destructive",
        });
      } finally {
        setDownloadingId(null);
      }
    },
    [exportFormat, renderProcessedBlob, toast]
  );

  const handleDownloadZip = useCallback(async () => {
    const doneItems = queue.filter((item) => item.status === "done" && item.resultUrl);
    if (doneItems.length === 0) {
      toast({ title: "Nothing to export", description: "Process images first.", variant: "destructive" });
      return;
    }

    setDownloadingId("zip");

    try {
      const zip = new JSZip();

      for (const item of doneItems) {
        const blob = await renderProcessedBlob(String(item.resultUrl));
        zip.file(`${makeDownloadName(item.file.name)}.${exportFormat}`, blob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const objectUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `snapcut-batch-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast({ title: "ZIP export failed", description: "Could not package images.", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  }, [exportFormat, queue, renderProcessedBlob, toast]);

  const clearHistory = () => {
    window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    setHistoryItems([]);
    toast({ title: "History cleared", description: "Saved uploads were removed." });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold mb-2">
            <span className="gradient-text">Upload</span> Your Images
          </h1>
          <p className="text-muted-foreground">Batch upload, process with presets, and export individual files or ZIP</p>
        </div>

        <div className="max-w-4xl mx-auto mb-6 flex justify-center">
          <div className="glass-card rounded-xl p-1 inline-flex gap-1">
            <button
              type="button"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === "workspace" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("workspace")}
            >
              Workspace
            </button>
            <button
              type="button"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition inline-flex items-center gap-2 ${
                activeTab === "history" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("history")}
            >
              <History className="w-4 h-4" />
              History ({historyItems.length})
            </button>
          </div>
        </div>

        {activeTab === "workspace" && queue.length === 0 ? (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`max-w-2xl mx-auto glass-card rounded-2xl p-16 text-center transition-all ${
              dragOver ? "neon-border scale-[1.02]" : "border border-dashed border-border hover:border-primary/50"
            }`}
          >
            <Upload className="w-12 h-12 text-primary mx-auto mb-4 animate-float" />
            <p className="text-lg font-medium mb-2">Drop your images here</p>
            <p className="text-sm text-muted-foreground mb-4">
              or{" "}
              <span
                role="button"
                tabIndex={0}
                className="text-primary cursor-pointer hover:underline"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                browse files
              </span>{" "}
              or paste with cmd+V / Ctrl+V
            </p>
            <p className="text-xs text-muted-foreground">Batch up to 20 files. JPG, PNG, WEBP, max 10MB each.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files?.length) {
                  void addFiles(event.target.files);
                }
                event.target.value = "";
              }}
            />
          </div>
        ) : activeTab === "workspace" ? (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="glass-card rounded-2xl p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold">Queue</p>
                  <p className="text-xs text-muted-foreground">
                    {queue.filter((item) => item.status === "done").length} done · {queue.filter((item) => item.status === "pending").length} pending · {queue.length} total
                  </p>
                </div>
                {usageStats && (
                  <p className="text-xs text-muted-foreground">Daily usage: {usageStats.usedToday}/{usageStats.dailyLimit}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button variant="cta-outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Add files
                  </Button>
                  <Button variant="cta" size="sm" onClick={handleProcessBatch} disabled={processing}>
                    {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    {processing ? "Processing" : "Process batch"}
                  </Button>
                  <Button variant="cta-outline" size="sm" onClick={handleDownloadZip} disabled={downloadingId === "zip"}>
                    {downloadingId === "zip" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Package className="w-4 h-4 mr-2" />}
                    Export ZIP
                  </Button>
                  <Button variant="ghost" size="sm" onClick={reset}>
                    <X className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    if (event.target.files?.length) {
                      void addFiles(event.target.files);
                    }
                    event.target.value = "";
                  }}
                />
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`px-3 py-2 rounded-lg text-sm border transition ${
                      activePresetId === preset.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setActivePresetId(preset.id)}
                  >
                    {preset.name}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-2">
                  <label htmlFor="exportFormat" className="text-xs text-muted-foreground">
                    Export
                  </label>
                  <select
                    id="exportFormat"
                    className="bg-muted/40 border border-border rounded-lg px-2 py-1 text-sm"
                    value={exportFormat}
                    onChange={(event) => setExportFormat(event.target.value as "png" | "webp" | "jpeg")}
                  >
                    <option value="png">PNG</option>
                    <option value="webp">WEBP</option>
                    <option value="jpeg">JPEG</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {queue.map((item) => (
                  <div key={item.id} className="glass-card rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium">{item.file.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {item.status}
                          {item.error ? ` · ${item.error}` : ""}
                        </p>
                      </div>
                      {item.status === "done" && item.resultUrl && (
                        <Button
                          variant="cta"
                          size="sm"
                          onClick={() => handleDownload(String(item.resultUrl), item.file.name, item.id)}
                          disabled={downloadingId === item.id}
                        >
                          {downloadingId === item.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                          Download
                        </Button>
                      )}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="rounded-xl overflow-hidden bg-muted/20 aspect-square flex items-center justify-center">
                        <img src={item.preview} alt="Original" className="max-w-full max-h-full object-contain" />
                      </div>
                      <div className="rounded-xl overflow-hidden aspect-square flex items-center justify-center" style={getBackgroundStyle(activePreset)}>
                        {item.status === "processing" && <Loader2 className="w-8 h-8 text-primary animate-spin" />}
                        {item.status !== "processing" && item.resultUrl && (
                          <img src={item.resultUrl} alt="Result" className="max-w-full max-h-full object-contain" style={{ filter: activePreset.filter }} />
                        )}
                        {item.status !== "processing" && !item.resultUrl && <ImageIcon className="w-8 h-8 text-muted-foreground" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Processing History</h2>
              <Button variant="cta-outline" size="sm" onClick={clearHistory} disabled={historyItems.length === 0}>
                Clear History
              </Button>
            </div>

            {historyItems.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center">
                <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-medium mb-1">No history yet</p>
                <p className="text-sm text-muted-foreground">Process an image in Workspace to see it saved here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {historyItems.map((item) => (
                  <div key={item.id} className="glass-card rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium">{item.originalName}</p>
                        <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
                      </div>
                      <Button
                        variant="cta"
                        size="sm"
                        onClick={() => handleDownload(item.resultUrl, item.originalName, item.id)}
                        disabled={downloadingId === item.id}
                      >
                        {downloadingId === item.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                        Download
                      </Button>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="rounded-xl overflow-hidden bg-muted/20 aspect-square flex items-center justify-center">
                        <img src={item.originalPreview} alt="Original" className="max-w-full max-h-full object-contain" />
                      </div>
                      <div className="rounded-xl overflow-hidden aspect-square flex items-center justify-center" style={getBackgroundStyle(activePreset)}>
                        <img src={item.resultUrl} alt="Result" className="max-w-full max-h-full object-contain" style={{ filter: activePreset.filter }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadWorkspace;
