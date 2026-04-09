"use client";

import { useEffect, useState } from "react";
import {
  getTodayAttendance, getAttendanceByDate, getExportUrl, getBreaks,
  getSightingsSummary,
  type AttendanceLog, type BreakLog, type SightingSummary,
} from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Download, Coffee, Eye, Scan, Shirt } from "lucide-react";
import { toast } from "sonner";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDur(min: number | null): string {
  if (min == null) return "—";
  if (min < 60) return `${Math.round(min)} min`;
  return `${Math.floor(min / 60)}h ${Math.round(min % 60)}m`;
}

function breakTypeBadge(type: string | null) {
  const map: Record<string, string> = {
    short: "bg-green-100 text-green-700",
    medium: "bg-amber-100 text-amber-700",
    long: "bg-red-100 text-red-700",
  };
  const cls = map[type ?? ""] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {type ?? "—"}
    </span>
  );
}

function IdentifiedByBadge({ method }: { method: string | null }) {
  if (!method || method === "face") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
        <Scan size={10} /> Face
      </span>
    );
  }
  if (method === "clothing_assist") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
        <Shirt size={10} /> Clothing Assist
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
      {method}
    </span>
  );
}

function StatusBadge({ log }: { log: AttendanceLog }) {
  if (log.check_out) return <Badge variant="secondary" className="text-xs">Checked Out</Badge>;
  return <Badge className="text-xs bg-green-500 text-white">Inside</Badge>;
}

export default function AttendancePage() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  // Break detail dialog
  const [breakLog, setBreakLog] = useState<AttendanceLog | null>(null);
  const [breaks, setBreaks] = useState<BreakLog[]>([]);
  const [breaksLoading, setBreaksLoading] = useState(false);
  const [sightings, setSightings] = useState<SightingSummary[]>([]);

  const load = (d: string) => {
    setLoading(true);
    const isToday = d === new Date().toISOString().slice(0, 10);
    const req = isToday ? getTodayAttendance() : getAttendanceByDate(d);
    req
      .then(setLogs)
      .catch(() => toast.error("Failed to load attendance."))
      .finally(() => setLoading(false));
    if (isToday) {
      getSightingsSummary().then(setSightings).catch(() => {});
    }
  };

  useEffect(() => { load(date); }, []);

  const openBreaks = (log: AttendanceLog) => {
    setBreakLog(log);
    setBreaksLoading(true);
    getBreaks(log.id)
      .then(setBreaks)
      .catch(() => toast.error("Failed to load breaks."))
      .finally(() => setBreaksLoading(false));
  };

  const totalHours = logs.reduce((sum, l) => sum + (l.total_hours ?? 0), 0);

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Attendance</h2>
          <p className="text-muted-foreground text-sm mt-1">Daily check-in and check-out records</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-40 text-sm"
          />
          <Button variant="outline" onClick={() => load(date)} size="sm">
            <Calendar size={14} className="mr-1" /> View
          </Button>
          <a href={getExportUrl(date)} download>
            <Button variant="outline" size="sm">
              <Download size={14} className="mr-1" /> CSV
            </Button>
          </a>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold">{logs.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Employees Present</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold">{logs.filter(l => l.check_out).length}</p>
            <p className="text-xs text-muted-foreground mt-1">Checked Out</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold">
              {logs.length > 0 ? (totalHours / logs.length).toFixed(1) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Avg Hours Worked</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Breaks</TableHead>
                <TableHead>Seen Today</TableHead>
                <TableHead>Identified By</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                    No attendance records for {date}.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map(log => {
                  const s = sightings.find(s => s.employee_id === log.employee_id);
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.employee_name}</TableCell>
                      <TableCell className="font-mono text-sm">{fmt(log.check_in)}</TableCell>
                      <TableCell className="font-mono text-sm">{fmt(log.check_out)}</TableCell>
                      <TableCell>{log.total_hours != null ? `${log.total_hours.toFixed(2)}h` : "—"}</TableCell>
                      <TableCell>
                        {log.break_count > 0 ? (
                          <button
                            onClick={() => openBreaks(log)}
                            className="flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium text-sm"
                          >
                            <Coffee size={13} />
                            {log.break_count} break{log.break_count > 1 ? "s" : ""}
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {s ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Eye size={13} className="text-blue-500" />
                            <span className="font-medium">{s.total}x</span>
                            <span className="text-muted-foreground text-xs">
                              ({s.cameras.map(c => `${c.label}: ${c.count}`).join(", ")})
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell><IdentifiedByBadge method={log.identified_by} /></TableCell>
                      <TableCell><StatusBadge log={log} /></TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Break Detail Dialog */}
      <Dialog open={breakLog !== null} onOpenChange={() => { setBreakLog(null); setBreaks([]); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coffee size={16} className="text-amber-500" />
              Break Details — {breakLog?.employee_name}
            </DialogTitle>
            <p className="text-xs text-muted-foreground pt-1">
              {breakLog?.date} · Check-in {fmt(breakLog?.check_in ?? null)}
            </p>
          </DialogHeader>

          {breaksLoading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : breaks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No break records found.</p>
          ) : (
            <div className="space-y-2 py-2">
              {breaks.map((b, i) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border px-4 py-3 bg-gray-50">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium">#{i + 1}</span>
                      {breakTypeBadge(b.break_type)}
                    </div>
                    <div className="text-sm font-mono text-gray-700">
                      {fmt(b.break_start)} → {b.break_end ? fmt(b.break_end) : <span className="text-amber-500">ongoing</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-800">{fmtDur(b.duration_minutes)}</p>
                    <p className="text-xs text-muted-foreground">duration</p>
                  </div>
                </div>
              ))}

              {/* Total */}
              <div className="flex items-center justify-between rounded-lg border border-dashed px-4 py-2 mt-1">
                <span className="text-sm font-semibold text-muted-foreground">Total break time</span>
                <span className="text-sm font-bold">
                  {fmtDur(breaks.reduce((s, b) => s + (b.duration_minutes ?? 0), 0))}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
