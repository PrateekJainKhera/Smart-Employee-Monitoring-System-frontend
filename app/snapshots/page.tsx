"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getSnapshots, getCameras, getEmployees,
  getSnapshotImageUrl,
  type Snapshot, type Camera, type Employee,
} from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, ImageOff } from "lucide-react";

type Filter = "all" | "matched" | "unmatched";

function confidenceBadge(matched: boolean, confidence: number | null, method: string) {
  const pct = confidence != null ? `${(confidence * 100).toFixed(0)}%` : "—";
  if (matched) {
    const isDeepface = method.includes("deepface");
    return (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isDeepface ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
        {pct} {isDeepface ? "· verified" : "· high"}
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
      {pct} · unknown
    </span>
  );
}

function methodLabel(method: string): string {
  const map: Record<string, string> = {
    frame_high: "Frame high",
    "frame_medium+deepface": "Frame + DeepFace",
    crop_high: "Crop high",
    "crop_medium+deepface": "Crop + DeepFace",
    unverified: "Unverified",
    unknown: "Unknown",
  };
  return map[method] ?? method;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function SnapshotCard({ snap }: { snap: Snapshot }) {
  const [imgErr, setImgErr] = useState(false);
  const border = snap.matched
    ? "border-l-4 border-l-green-500"
    : "border-l-4 border-l-red-400";

  return (
    <Card className={`overflow-hidden ${border}`}>
      <div className="bg-gray-100 flex items-center justify-center" style={{ height: 140 }}>
        {imgErr ? (
          <div className="flex flex-col items-center text-gray-400 gap-1">
            <ImageOff size={28} />
            <span className="text-xs">No image</span>
          </div>
        ) : (
          <img
            src={getSnapshotImageUrl(snap.filename)}
            alt={snap.employee_name ?? "unknown"}
            className="h-full w-full object-cover"
            onError={() => setImgErr(true)}
          />
        )}
      </div>
      <CardContent className="pt-3 pb-3 px-3 space-y-1.5">
        <div className="flex items-start justify-between gap-1">
          <p className="font-semibold text-sm truncate">
            {snap.employee_name ?? "Unknown Person"}
          </p>
          {confidenceBadge(snap.matched, snap.confidence, snap.method)}
        </div>
        <p className="text-xs text-muted-foreground">{methodLabel(snap.method)}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{snap.camera_label || `cam ${snap.camera_id}`}</span>
          <span>{fmt(snap.timestamp)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SnapshotsPage() {
  const [snapshots, setSnapshots]   = useState<Snapshot[]>([]);
  const [cameras, setCameras]       = useState<Camera[]>([]);
  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [filter, setFilter]         = useState<Filter>("all");
  const [camFilter, setCamFilter]   = useState<number | "">("");
  const [empFilter, setEmpFilter]   = useState<number | "">("");
  const [loading, setLoading]       = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const load = useCallback(async () => {
    try {
      const params: Parameters<typeof getSnapshots>[0] = { limit: 200 };
      if (filter === "matched")   params.matched = true;
      if (filter === "unmatched") params.matched = false;
      if (camFilter !== "")  params.camera_id   = camFilter as number;
      if (empFilter !== "")  params.employee_id = empFilter as number;
      const data = await getSnapshots(params);
      setSnapshots(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [filter, camFilter, empFilter]);

  // Load cameras + employees once
  useEffect(() => {
    getCameras().then(setCameras).catch(() => {});
    getEmployees().then(setEmployees).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 5s
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  const matched   = snapshots.filter(s => s.matched).length;
  const unmatched = snapshots.filter(s => !s.matched).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Detection Snapshots</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Face crops captured by the recognition pipeline — use this to debug why detection succeeds or fails
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              autoRefresh
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            <RefreshCw size={13} className={autoRefresh ? "animate-spin" : ""} />
            {autoRefresh ? "Live" : "Auto-refresh"}
          </button>
          <button
            onClick={load}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-white p-3 text-center">
          <p className="text-2xl font-bold">{snapshots.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total shown</p>
        </div>
        <div className="rounded-lg border-l-4 border-l-green-500 bg-green-50/40 border p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{matched}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Matched</p>
        </div>
        <div className="rounded-lg border-l-4 border-l-red-400 bg-red-50/20 border p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{unmatched}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Unknown</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-white border rounded-lg px-4 py-3">
        {/* Matched / Unmatched toggle */}
        <div className="flex rounded-lg overflow-hidden border text-sm font-medium">
          {(["all", "matched", "unmatched"] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 capitalize transition-colors ${
                filter === f
                  ? f === "matched"   ? "bg-green-600 text-white"
                  : f === "unmatched" ? "bg-red-500 text-white"
                  : "bg-gray-800 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Camera filter */}
        <select
          value={camFilter}
          onChange={e => setCamFilter(e.target.value === "" ? "" : Number(e.target.value))}
          className="border rounded-lg px-3 py-1.5 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All cameras</option>
          {cameras.map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.location_label})</option>
          ))}
        </select>

        {/* Employee filter */}
        <select
          value={empFilter}
          onChange={e => setEmpFilter(e.target.value === "" ? "" : Number(e.target.value))}
          className="border rounded-lg px-3 py-1.5 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All employees</option>
          {employees.map(e => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>

        <span className="text-xs text-muted-foreground ml-auto">
          Showing {snapshots.length} · newest first · last 24h retained
        </span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-36 w-full rounded-t-lg" />
              <CardContent className="pt-3 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : snapshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <ImageOff size={40} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">No snapshots yet</p>
          <p className="text-xs mt-1">Snapshots appear once the pipeline detects faces</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {snapshots.map(snap => (
            <SnapshotCard key={snap.id} snap={snap} />
          ))}
        </div>
      )}
    </div>
  );
}
