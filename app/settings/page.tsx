"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Shirt, ScanFace, Info } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Settings {
  recognition_mode: string;
  reid_similarity_threshold: number;
  reid_time_window_min: number;
  reid_same_camera_only: boolean;
}

const MODES = [
  {
    id: "face_only",
    label: "Face Only",
    icon: ScanFace,
    badge: "Recommended for uniforms",
    badgeColor: "bg-blue-100 text-blue-700",
    description: "Attendance is marked purely by face recognition. Clothing is completely ignored. Best for companies with uniforms where everyone wears similar colors.",
  },
  {
    id: "face_clothing",
    label: "Face + Clothing Assist",
    icon: Shirt,
    badge: "Casual office",
    badgeColor: "bg-green-100 text-green-700",
    description: "Face recognition is the primary identifier. Clothing color histogram is used to link anonymous tracks to a later-identified person — giving more accurate first-sighting check-in times.",
  },
  {
    id: "face_reid",
    label: "Face + Full ReID",
    icon: ShieldCheck,
    badge: "Coming soon",
    badgeColor: "bg-gray-100 text-gray-500",
    description: "Face recognition + OSNet deep ReID model for maximum tracking accuracy. Handles complex scenarios like same-color uniforms with pattern differences. (Not yet available)",
    disabled: true,
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string>("face_only");

  useEffect(() => {
    fetch(`${API}/api/v1/settings`)
      .then(r => r.json())
      .then((data: Settings) => {
        setSettings(data);
        setSelected(data.recognition_mode);
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!settings || selected === settings.recognition_mode) return;
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/v1/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recognition_mode: selected }),
      });
      if (!r.ok) throw new Error();
      const updated: Settings = await r.json();
      setSettings(updated);
      setSelected(updated.recognition_mode);
      toast.success("Recognition mode updated — takes effect immediately");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const changed = settings && selected !== settings.recognition_mode;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Configure recognition pipeline behaviour
        </p>
      </div>

      {/* Recognition Mode */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recognition Mode</CardTitle>
          <p className="text-sm text-muted-foreground">
            Controls how the system identifies employees. Changes take effect immediately.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))
          ) : (
            MODES.map(mode => {
              const Icon = mode.icon;
              const isSelected = selected === mode.id;
              return (
                <button
                  key={mode.id}
                  disabled={mode.disabled}
                  onClick={() => !mode.disabled && setSelected(mode.id)}
                  className={`w-full text-left rounded-xl border-2 p-4 transition-all
                    ${mode.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-gray-400"}
                    ${isSelected ? "border-black bg-gray-50" : "border-gray-200"}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 p-1.5 rounded-lg ${isSelected ? "bg-black text-white" : "bg-gray-100 text-gray-500"}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{mode.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${mode.badgeColor}`}>
                          {mode.badge}
                        </span>
                        {isSelected && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-black text-white font-medium">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {mode.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* ReID Parameters — shown only when face_clothing is selected */}
      {selected === "face_clothing" && settings && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info size={15} className="text-muted-foreground" />
              Clothing Assist Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b">
              <div>
                <p className="font-medium">Similarity Threshold</p>
                <p className="text-xs text-muted-foreground">Min clothing match score to link tracks</p>
              </div>
              <Badge variant="outline" className="font-mono">{settings.reid_similarity_threshold}</Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <div>
                <p className="font-medium">Time Window</p>
                <p className="text-xs text-muted-foreground">Max minutes back to search for matching track</p>
              </div>
              <Badge variant="outline" className="font-mono">{settings.reid_time_window_min} min</Badge>
            </div>
            <div className="flex justify-between items-center py-2">
              <div>
                <p className="font-medium">Same Camera Only</p>
                <p className="text-xs text-muted-foreground">Only link tracks from the same camera</p>
              </div>
              <Badge variant={settings.reid_same_camera_only ? "default" : "secondary"}>
                {settings.reid_same_camera_only ? "Yes" : "No"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              To change these values, update the backend .env file and restart the server.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={save} disabled={!changed || saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
