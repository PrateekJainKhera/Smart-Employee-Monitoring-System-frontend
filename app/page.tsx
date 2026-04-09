"use client";

import { useEffect, useState } from "react";
import { getHealth, getEmployees, getCameras, getDailyReport, type HealthStatus, type Employee, type Camera, type DailyReport } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Users, Camera as CameraIcon, Clock, Wifi } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getHealth(), getEmployees(), getCameras(), getDailyReport()])
      .then(([h, emps, cams, rpt]) => {
        setHealth(h);
        setEmployees(emps);
        setCameras(cams);
        setReport(rpt);
      })
      .catch(() => setError(`Cannot reach backend. Make sure the server is running at ${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}.`))
      .finally(() => setLoading(false));
  }, []);

  const faceRegistered = employees.filter(e => e.face_registered).length;
  const activeCameras = cameras.filter(c => c.is_active).length;

  return (
    <div className="max-w-6xl space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground text-sm mt-1">System overview — Phase 6 · SQL Server</p>
      </div>

      {error && (
        <div className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-5 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard
              icon={<Activity size={18} />}
              label="Backend"
              value={health ? "Online" : "Offline"}
              sub={health ? `v${health.version}` : "unreachable"}
              badge={health ? "default" : "destructive"}
            />
            <StatCard
              icon={<Clock size={18} />}
              label="Uptime"
              value={health ? formatUptime(health.uptime_seconds) : "—"}
              sub={health?.storage ?? "—"}
              badge="secondary"
            />
            <StatCard
              icon={<Users size={18} />}
              label="Employees"
              value={String(employees.length)}
              sub={`${faceRegistered} face registered`}
              badge="default"
            />
            <StatCard
              icon={<CameraIcon size={18} />}
              label="Cameras"
              value={String(cameras.length)}
              sub={`${activeCameras} active`}
              badge="default"
            />
          </>
        )}
      </div>

      {/* Chart + System Info row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Attendance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Today&apos;s Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={report ? [
                    { day: "Present", count: report.present },
                    { day: "Absent", count: report.absent },
                    { day: "Inside", count: report.inside },
                    { day: "On Break", count: report.on_break },
                    { day: "Checked Out", count: report.checked_out },
                  ] : []}
                  barCategoryGap="30%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e5e7eb" }}
                  />
                  <Bar dataKey="count" name="Count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">System Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))
            ) : health ? (
              <>
                <InfoRow label="Status" value={health.status} />
                <InfoRow label="Storage" value={health.storage} />
                <InfoRow label="Version" value={health.version} />
                <InfoRow label="Uptime" value={formatUptime(health.uptime_seconds)} />
                <InfoRow label="Cameras" value={`${activeCameras}/${cameras.length} active`} />
                <InfoRow label="Face Reg." value={`${faceRegistered}/${employees.length}`} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Backend offline</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Camera Status */}
      {!loading && cameras.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Camera Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {cameras.map(cam => (
                <div key={cam.id} className="flex items-center gap-2 p-3 rounded-lg border bg-white">
                  <Wifi size={14} className={cam.is_active ? "text-green-500" : "text-gray-300"} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{cam.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{cam.location_label}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub, badge }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  badge: "default" | "secondary" | "destructive";
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-muted-foreground">{icon}</span>
          <Badge variant={badge} className="text-xs">{label}</Badge>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
