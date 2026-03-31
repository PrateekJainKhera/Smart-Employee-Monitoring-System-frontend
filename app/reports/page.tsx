"use client";

import { useEffect, useState } from "react";
import { getDailyReport, getExportUrl, type DailyReport } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Download, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function ReportsPage() {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const load = (d: string) => {
    setLoading(true);
    getDailyReport(d)
      .then(setReport)
      .catch(() => toast.error("Failed to load report."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(date); }, []);

  const chartData = report ? [
    { name: "Present", value: report.present, fill: "#3b82f6" },
    { name: "Absent", value: report.absent, fill: "#f87171" },
    { name: "Inside", value: report.inside, fill: "#22c55e" },
    { name: "On Break", value: report.on_break, fill: "#f59e0b" },
    { name: "Checked Out", value: report.checked_out, fill: "#6b7280" },
  ] : [];

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground text-sm mt-1">Daily attendance summary and exports</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-40 text-sm"
          />
          <Button variant="outline" size="sm" onClick={() => load(date)}>
            <Calendar size={14} className="mr-1" /> Load
          </Button>
          <a href={getExportUrl(date)} download>
            <Button size="sm">
              <Download size={14} className="mr-1" /> Export CSV
            </Button>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-5"><Skeleton className="h-8 w-12 mb-1" /><Skeleton className="h-3 w-20" /></CardContent></Card>
          ))
        ) : report ? (
          [
            { label: "Total", value: report.total_employees, color: "text-gray-900" },
            { label: "Present", value: report.present, color: "text-blue-600" },
            { label: "Absent", value: report.absent, color: "text-red-500" },
            { label: "On Break", value: report.on_break, color: "text-amber-600" },
            { label: "Avg Hours", value: `${report.avg_hours_worked}h`, color: "text-green-600" },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="pt-5">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </CardContent>
            </Card>
          ))
        ) : null}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Attendance Breakdown — {date}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e5e7eb" }} />
                <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {report && report.early_arrivals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Early Arrivals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.early_arrivals.map((e, i) => (
                <div key={e.employee_id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-5 text-xs">{i + 1}.</span>
                    <span className="font-medium">{e.name}</span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {new Date(e.check_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
