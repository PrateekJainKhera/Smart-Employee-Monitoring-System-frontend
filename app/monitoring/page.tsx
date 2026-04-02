"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getEmployees, getTodayAttendance, type Employee, type AttendanceLog, type WsEvent } from "@/lib/api";
import { useWebSocket } from "@/lib/useWebSocket";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Wifi, WifiOff, Clock, Eye } from "lucide-react";

type Status = "absent" | "inside" | "on_break" | "checked_out";

interface MonitorEntry {
  employee: Employee;
  status: Status;
  check_in: string | null;
  last_seen: string | null;
  last_camera: string | null;
  confidence: number | null;
}

interface LiveEvent {
  id: number;
  event: string;
  employee_name?: string;
  camera_label?: string;
  detail: string;
  timestamp: string;
  color: string;
}

const WS_URL = (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000") + "/ws/live";

function statusBadge(status: Status) {
  const map: Record<Status, { label: string; className: string }> = {
    inside: { label: "Inside", className: "bg-green-500 text-white" },
    on_break: { label: "On Break", className: "bg-amber-500 text-white" },
    checked_out: { label: "Checked Out", className: "bg-gray-400 text-white" },
    absent: { label: "Absent", className: "bg-red-400 text-white" },
  };
  const { label, className } = map[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

function cardBorder(status: Status) {
  return {
    inside: "border-l-4 border-l-green-500 bg-green-50/40",
    on_break: "border-l-4 border-l-amber-500 bg-amber-50/40",
    checked_out: "border-l-4 border-l-gray-400 bg-gray-50/40",
    absent: "border-l-4 border-l-red-300 bg-red-50/20",
  }[status];
}

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ago(iso: string | null): string {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function eventColor(event: string): string {
  return { checkin: "text-green-600", checkout: "text-gray-500", break_start: "text-amber-600", break_end: "text-blue-600", detected: "text-purple-600", unknown: "text-red-400", snapshot: "text-gray-400" }[event] ?? "text-gray-600";
}

function eventDetail(ev: WsEvent): string {
  switch (ev.event) {
    case "checkin": return `checked in at ${ev.camera_label ?? "entry"}`;
    case "checkout": return `checked out${ev.auto ? " (auto)" : ""}${ev.total_hours ? ` · ${ev.total_hours.toFixed(1)}h` : ""}`;
    case "break_start": return `started break`;
    case "break_end": return `returned · ${ev.break_type} break (${ev.duration_min?.toFixed(0)}m)`;
    case "detected": return `seen at ${ev.camera_label ?? "camera"} (${((ev.confidence ?? 0) * 100).toFixed(0)}%)`;
    case "unknown": return `unknown person at ${ev.camera_label ?? "camera"}`;
    case "snapshot": return "snapshot loaded";
    default: return ev.event;
  }
}

export default function MonitoringPage() {
  const [entries, setEntries] = useState<Map<number, MonitorEntry>>(new Map());
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const eventIdRef = useRef(0);

  const load = useCallback(async () => {
    try {
      const [employees, todayLogs] = await Promise.all([
        getEmployees(),
        getTodayAttendance(),
      ]);

      const logMap = new Map<number, AttendanceLog>();
      for (const log of todayLogs) logMap.set(log.employee_id, log);

      const map = new Map<number, MonitorEntry>();
      for (const emp of employees) {
        const log = logMap.get(emp.id);
        let status: Status = "absent";
        if (log) {
          if (log.check_out) status = "checked_out";
          else if (log.on_break) status = "on_break";
          else status = "inside";
        }
        map.set(emp.id, {
          employee: emp,
          status,
          check_in: log?.check_in ?? null,
          last_seen: log?.check_in ?? null,
          last_camera: null,
          confidence: null,
        });
      }
      setEntries(map);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleWsEvent = useCallback((ev: WsEvent) => {
    if (ev.event === "snapshot" && ev.data) {
      load();
      return;
    }

    const id = ev.employee_id;
    if (id !== undefined) {
      setEntries(prev => {
        const next = new Map(prev);
        const entry = next.get(id);
        if (entry) {
          const updated = { ...entry };
          if (ev.event === "checkin") { updated.status = "inside"; updated.check_in = ev.timestamp; updated.last_seen = ev.timestamp; updated.last_camera = ev.camera_label ?? null; }
          else if (ev.event === "checkout") { updated.status = "checked_out"; updated.last_seen = ev.timestamp; }
          else if (ev.event === "break_start") { updated.status = "on_break"; updated.last_seen = ev.timestamp; updated.last_camera = ev.camera_label ?? null; }
          else if (ev.event === "break_end") { updated.status = "inside"; updated.last_seen = ev.timestamp; }
          else if (ev.event === "detected") { updated.last_seen = ev.timestamp; updated.last_camera = ev.camera_label ?? null; updated.confidence = ev.confidence ?? null; }
          next.set(id, updated);
        }
        return next;
      });
    }

    if (ev.event !== "snapshot") {
      const liveEv: LiveEvent = {
        id: ++eventIdRef.current,
        event: ev.event,
        employee_name: ev.employee_name,
        camera_label: ev.camera_label,
        detail: eventDetail(ev),
        timestamp: ev.timestamp,
        color: eventColor(ev.event),
      };
      setEvents(prev => [liveEv, ...prev].slice(0, 30));
    }
  }, [load]);

  const { connected } = useWebSocket(WS_URL, handleWsEvent);

  const sorted = Array.from(entries.values()).sort((a, b) => {
    const order: Record<Status, number> = { inside: 0, on_break: 1, checked_out: 2, absent: 3 };
    return order[a.status] - order[b.status];
  });

  const counts = sorted.reduce((acc, e) => { acc[e.status] = (acc[e.status] ?? 0) + 1; return acc; }, {} as Record<Status, number>);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Live Monitoring</h2>
          <p className="text-muted-foreground text-sm mt-1">Real-time employee location and status</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${connected ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {connected ? "Live" : "Reconnecting..."}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {(["inside", "on_break", "checked_out", "absent"] as Status[]).map(s => (
          <div key={s} className={`rounded-lg p-3 text-center ${cardBorder(s)}`}>
            <p className="text-2xl font-bold">{counts[s] ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">{s.replace("_", " ")}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Employees</h3>
          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}><CardContent className="pt-4 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-20" /></CardContent></Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {sorted.map(({ employee, status, check_in, last_seen, last_camera, confidence }) => (
                <Card key={employee.id} className={`transition-all ${cardBorder(status)}`}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{employee.name}</p>
                        <p className="text-xs text-muted-foreground">{employee.department || employee.designation || "—"}</p>
                      </div>
                      {statusBadge(status)}
                    </div>
                    <div className="space-y-1 mt-3">
                      {check_in && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock size={11} />
                          <span>Check-in: {fmt(check_in)}</span>
                        </div>
                      )}
                      {last_seen && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Eye size={11} />
                          <span>Last seen: {ago(last_seen)}</span>
                          {last_camera && <span className="text-gray-400">· {last_camera}</span>}
                        </div>
                      )}
                      {confidence && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Activity size={11} />
                          <span>Confidence: {(confidence * 100).toFixed(0)}%</span>
                        </div>
                      )}
                      {status === "absent" && !check_in && (
                        <p className="text-xs text-muted-foreground italic">Not yet arrived today</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Live Events</h3>
          <div className="rounded-lg border bg-white overflow-hidden">
            {events.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <Activity size={24} className="mx-auto mb-2 opacity-30" />
                Waiting for events...
              </div>
            ) : (
              <div className="divide-y max-h-[500px] overflow-y-auto">
                {events.map(ev => (
                  <div key={ev.id} className="px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {ev.employee_name && (
                          <p className="text-xs font-semibold truncate">{ev.employee_name}</p>
                        )}
                        <p className={`text-xs ${ev.color}`}>{ev.detail}</p>
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">{fmt(ev.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
