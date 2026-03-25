"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { getCameras, createCamera, deleteCamera, updateCamera, type Camera } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Pencil, Wifi, WifiOff, Eye, EyeOff, ScanSearch, Crosshair } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const cameraSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  location_label: z.string().min(1, "Location label is required"),
  rtsp_url: z.string().min(1, "RTSP URL is required"),
});
type CameraFormValues = z.infer<typeof cameraSchema>;
const LOCATION_LABELS = ["entry", "exit", "floor_1", "floor_2", "parking", "cafeteria", "lobby"];

type StreamMode = "raw" | "detected" | "tracked";

const STREAM_ENDPOINT: Record<StreamMode, string> = {
  raw: "stream",
  detected: "stream/detected",
  tracked: "stream/tracked",
};

// ── Live Preview Component ───────────────────────────────────────────
function CameraPreview({ camera, mode }: { camera: Camera; mode: StreamMode }) {
  const [error, setError] = useState(false);
  const [key, setKey] = useState(0);

  const streamUrl = `${BASE_URL}/api/v1/cameras/${camera.id}/${STREAM_ENDPOINT[mode]}`;

  useEffect(() => {
    setError(false);
    setKey(k => k + 1);
  }, [mode, camera.id]);

  return (
    <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 text-sm gap-2">
          <WifiOff size={24} />
          <span>No frame available</span>
          <span className="text-xs">Camera may still be connecting...</span>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 text-xs h-7"
            onClick={() => { setError(false); setKey(k => k + 1); }}
          >
            Retry
          </Button>
        </div>
      ) : (
        <img
          key={key}
          src={streamUrl}
          alt={`${camera.name} live feed`}
          className="w-full h-full object-contain"
          onError={() => setError(true)}
        />
      )}
      {/* Overlay badges */}
      <div className="absolute top-2 left-2 flex gap-1.5">
        <Badge variant="default" className="text-xs bg-red-600 gap-1 animate-pulse">
          ● LIVE
        </Badge>
        {mode === "detected" && (
          <Badge variant="default" className="text-xs bg-blue-600 gap-1">
            <ScanSearch size={10} /> Detection
          </Badge>
        )}
        {mode === "tracked" && (
          <Badge variant="default" className="text-xs bg-purple-600 gap-1">
            <Crosshair size={10} /> Tracking
          </Badge>
        )}
      </div>
      <div className="absolute bottom-2 left-2">
        <Badge variant="secondary" className="text-xs font-mono opacity-80">
          {camera.name} · {camera.location_label}
        </Badge>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────
export default function CamerasPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [previewCam, setPreviewCam] = useState<Camera | null>(null);
  const [streamMode, setStreamMode] = useState<StreamMode>("raw");

  const form = useForm<CameraFormValues>({
    resolver: zodResolver(cameraSchema),
    defaultValues: { name: "", location_label: "entry", rtsp_url: "" },
  });

  const load = () => {
    setLoading(true);
    getCameras()
      .then(setCameras)
      .catch(() => toast.error("Failed to load cameras."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    form.reset({ name: "", location_label: "entry", rtsp_url: "" });
    setEditId(null);
    setOpen(true);
  };

  const openEdit = (cam: Camera) => {
    form.reset({ name: cam.name, location_label: cam.location_label, rtsp_url: cam.rtsp_url });
    setEditId(cam.id);
    setOpen(true);
  };

  const onSubmit = async (values: CameraFormValues) => {
    try {
      if (editId !== null) {
        await updateCamera(editId, values);
        toast.success("Camera updated");
      } else {
        const created = await createCamera(values);
        toast.success("Camera registered — starting stream...");
        // Auto-open preview for newly added camera
        setPreviewCam(created);
      }
      setOpen(false);
      load();
    } catch {
      toast.error("Failed to save camera.");
    }
  };

  const handleToggle = async (cam: Camera) => {
    try {
      await updateCamera(cam.id, { is_active: !cam.is_active });
      toast.success(`Camera ${cam.is_active ? "deactivated" : "activated"}`);
      if (!cam.is_active === false && previewCam?.id === cam.id) setPreviewCam(null);
      load();
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;
    try {
      await deleteCamera(deleteId);
      toast.success("Camera removed");
      if (previewCam?.id === deleteId) setPreviewCam(null);
      load();
    } catch {
      toast.error("Failed to delete camera.");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cameras</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {loading ? "Loading..." : `${cameras.length} configured · ${cameras.filter(c => c.is_active).length} active`}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus size={15} /> Add Camera
        </Button>
      </div>

      {/* Live Preview Panel */}
      {previewCam && (
        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Live Preview — {previewCam.name}</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={streamMode === "raw" ? "default" : "outline"}
                size="sm"
                className="gap-1.5 text-xs h-7"
                onClick={() => setStreamMode("raw")}
              >
                Raw
              </Button>
              <Button
                variant={streamMode === "detected" ? "default" : "outline"}
                size="sm"
                className="gap-1.5 text-xs h-7"
                onClick={() => setStreamMode("detected")}
              >
                <ScanSearch size={12} /> Detection
              </Button>
              <Button
                variant={streamMode === "tracked" ? "default" : "outline"}
                size="sm"
                className="gap-1.5 text-xs h-7"
                onClick={() => setStreamMode("tracked")}
              >
                <Crosshair size={12} /> Tracking
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs h-7"
                onClick={() => setPreviewCam(null)}
              >
                <EyeOff size={12} /> Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <CameraPreview camera={previewCam} mode={streamMode} />
          </CardContent>
        </Card>
      )}

      {/* Camera Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Location</TableHead>
                <TableHead className="hidden md:table-cell">Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : cameras.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                    No cameras yet. Click &quot;Add Camera&quot; to register one.
                  </TableCell>
                </TableRow>
              ) : (
                cameras.map(cam => (
                  <TableRow
                    key={cam.id}
                    className={previewCam?.id === cam.id ? "bg-blue-50" : ""}
                  >
                    <TableCell className="font-medium">{cam.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className="font-mono text-xs">{cam.location_label}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                      {cam.rtsp_url === "0" ? "Webcam (index 0)" : cam.rtsp_url}
                    </TableCell>
                    <TableCell>
                      <button onClick={() => handleToggle(cam)}>
                        <Badge
                          variant={cam.is_active ? "default" : "secondary"}
                          className="gap-1 cursor-pointer select-none"
                        >
                          {cam.is_active ? <Wifi size={11} /> : <WifiOff size={11} />}
                          {cam.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant={previewCam?.id === cam.id ? "default" : "ghost"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPreviewCam(previewCam?.id === cam.id ? null : cam)}
                          title="Preview"
                        >
                          <Eye size={13} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cam)}>
                          <Pencil size={13} />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(cam.id)}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId !== null ? "Edit Camera" : "New Camera"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Camera Name *</FormLabel>
                  <FormControl><Input placeholder="Entry Camera 1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="location_label" render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Label *</FormLabel>
                  <Select value={field.value} onValueChange={v => { if (v) field.onChange(v); }}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LOCATION_LABELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="rtsp_url" render={({ field }) => (
                <FormItem>
                  <FormLabel>Source *</FormLabel>
                  <FormControl>
                    <Input className="font-mono text-sm" placeholder="0  (webcam)  or  rtsp://192.168.1.1/stream" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Saving..." : editId !== null ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Camera</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the camera and stop its stream. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
