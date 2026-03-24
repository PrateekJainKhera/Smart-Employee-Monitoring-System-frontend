"use client";

import { useEffect, useState } from "react";
import { getHealth, getEmployees, getCameras, type HealthStatus } from "@/lib/api";
import { Activity, Users, Camera, Clock } from "lucide-react";

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [cameraCount, setCameraCount] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getHealth(), getEmployees(), getCameras()])
      .then(([h, emps, cams]) => {
        setHealth(h);
        setEmployeeCount(emps.length);
        setCameraCount(cams.length);
      })
      .catch(() => setError("Cannot reach backend. Make sure the server is running on port 8000."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Connecting to backend...
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Dashboard</h2>
      <p className="text-sm text-gray-500 mb-8">System overview — Phase 1</p>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
        <StatCard
          icon={<Activity size={20} className="text-green-500" />}
          label="Backend"
          value={health ? "Online" : "Offline"}
          sub={health ? `v${health.version}` : "—"}
          accent={health ? "green" : "red"}
        />
        <StatCard
          icon={<Clock size={20} className="text-blue-500" />}
          label="Uptime"
          value={health ? formatUptime(health.uptime_seconds) : "—"}
          sub={health?.storage ?? "—"}
          accent="blue"
        />
        <StatCard
          icon={<Users size={20} className="text-purple-500" />}
          label="Employees"
          value={String(employeeCount)}
          sub="registered"
          accent="purple"
        />
        <StatCard
          icon={<Camera size={20} className="text-orange-500" />}
          label="Cameras"
          value={String(cameraCount)}
          sub="configured"
          accent="orange"
        />
      </div>

      {/* System Info */}
      {health && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">System Info</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Info label="Status" value={health.status} />
            <Info label="Storage" value={health.storage} />
            <Info label="Version" value={health.version} />
            <Info label="Uptime" value={formatUptime(health.uptime_seconds)} />
          </dl>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon, label, value, sub, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: "green" | "blue" | "purple" | "orange" | "red";
}) {
  const bg: Record<string, string> = {
    green: "bg-green-50 border-green-100",
    blue: "bg-blue-50 border-blue-100",
    purple: "bg-purple-50 border-purple-100",
    orange: "bg-orange-50 border-orange-100",
    red: "bg-red-50 border-red-100",
  };
  return (
    <div className={`rounded-xl border p-4 ${bg[accent]}`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs font-medium text-gray-500">{label}</span></div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="font-medium text-gray-700 mt-0.5">{value}</dd>
    </div>
  );
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
