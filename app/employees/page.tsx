"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { getEmployees, createEmployee, deleteEmployee, updateEmployee, registerFace, getFaceImageUrl, getFacePhotos, deleteFacePhoto, type Employee } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Pencil, UserCheck, UserX, Camera, Upload, Video, FlipHorizontal, Images } from "lucide-react";

// ── Zod Schema ──────────────────────────────────────────────────────
const employeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  department: z.string(),
  designation: z.string(),
  email: z.union([z.email("Invalid email address"), z.literal("")]),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Face upload state
  const [faceUploadId, setFaceUploadId] = useState<number | null>(null);
  const [faceUploading, setFaceUploading] = useState(false);
  const [facePreview, setFacePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [facePhotoCount, setFacePhotoCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Registered photos gallery state
  const [photos, setPhotos] = useState<{ index: number; url: string }[]>([]);
  const [deletingPhoto, setDeletingPhoto] = useState<number | null>(null);

  // Webcam state
  type FaceMode = "upload" | "webcam" | "gallery";
  const [faceMode, setFaceMode] = useState<FaceMode>("upload");
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [captured, setCaptured] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startWebcam = async () => {
    setWebcamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setWebcamActive(true);
      setCaptured(false);
      setFacePreview(null);
      setSelectedFile(null);
    } catch {
      setWebcamError("Could not access webcam. Check browser permissions.");
    }
  };

  const stopWebcam = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setWebcamActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Mirror horizontally so the preview matches what the user sees
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], "webcam_capture.jpg", { type: "image/jpeg" });
      setSelectedFile(file);
      setFacePreview(URL.createObjectURL(blob));
      setCaptured(true);
      stopWebcam();
    }, "image/jpeg", 0.92);
  };

  const retakePhoto = () => {
    setSelectedFile(null);
    setFacePreview(null);
    setCaptured(false);
    startWebcam();
  };

  const closeFaceDialog = () => {
    stopWebcam();
    setFaceUploadId(null);
    setFacePreview(null);
    setSelectedFile(null);
    setFacePhotoCount(0);
    setPhotos([]);
    setFaceMode("upload");
    setCaptured(false);
    setWebcamError(null);
  };

  const switchMode = (mode: FaceMode) => {
    if (mode === faceMode) return;
    stopWebcam();
    setCaptured(false);
    setFacePreview(null);
    setSelectedFile(null);
    setWebcamError(null);
    setFaceMode(mode);
    if (mode === "webcam") setTimeout(startWebcam, 100);
    if (mode === "gallery" && faceUploadId) loadFacePhotos(faceUploadId);
  };

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { name: "", department: "", designation: "", email: "" },
  });

  const load = () => {
    setLoading(true);
    getEmployees()
      .then(setEmployees)
      .catch(() => toast.error("Failed to load employees."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    form.reset({ name: "", department: "", designation: "", email: "" });
    setEditId(null);
    setOpen(true);
  };

  const openEdit = (emp: Employee) => {
    form.reset({ name: emp.name, department: emp.department, designation: emp.designation, email: emp.email });
    setEditId(emp.id);
    setOpen(true);
  };

  const onSubmit = async (values: EmployeeFormValues) => {
    try {
      if (editId !== null) {
        await updateEmployee(editId, values);
        toast.success("Employee updated successfully");
      } else {
        await createEmployee(values);
        toast.success("Employee created successfully");
      }
      setOpen(false);
      load();
    } catch {
      toast.error("Failed to save employee. Please try again.");
    }
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;
    try {
      await deleteEmployee(deleteId);
      toast.success("Employee deleted");
      load();
    } catch {
      toast.error("Failed to delete employee.");
    } finally {
      setDeleteId(null);
    }
  };

  const loadFacePhotos = async (empId: number) => {
    try {
      const data = await getFacePhotos(empId);
      setFacePhotoCount(data.total_photos);
      setPhotos(data.photos);
    } catch {
      setFacePhotoCount(0);
      setPhotos([]);
    }
  };

  const openFaceUpload = async (emp: Employee) => {
    setFaceUploadId(emp.id);
    setFacePreview(null);
    setSelectedFile(null);
    setPhotos([]);
    if (emp.face_registered) {
      await loadFacePhotos(emp.id);
      setFaceMode("gallery");
    } else {
      setFacePhotoCount(0);
      setFaceMode("upload");
    }
  };

  const deletePhoto = async (photoIndex: number) => {
    if (!faceUploadId) return;
    setDeletingPhoto(photoIndex);
    try {
      await deleteFacePhoto(faceUploadId, photoIndex);
      toast.success(`Photo ${photoIndex} deleted`);
      await loadFacePhotos(faceUploadId);
      load();
    } catch {
      toast.error("Failed to delete photo.");
    } finally {
      setDeletingPhoto(null);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setFacePreview(URL.createObjectURL(file));
  };

  const submitFace = async () => {
    if (!faceUploadId || !selectedFile) return;
    setFaceUploading(true);
    try {
      const result = await registerFace(faceUploadId, selectedFile);
      const count = result.total_photos ?? facePhotoCount + 1;
      toast.success(`Photo ${count} registered — add more angles for better accuracy`);
      setSelectedFile(null);
      setFacePreview(null);
      setCaptured(false);
      await loadFacePhotos(faceUploadId);
      setFaceMode("gallery");
      load();
    } catch {
      toast.error("Face registration failed. Make sure the photo shows a clear face.");
    } finally {
      setFaceUploading(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Employees</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {loading ? "Loading..." : `${employees.length} employee${employees.length !== 1 ? "s" : ""} registered`}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus size={15} /> Add Employee
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Department</TableHead>
                <TableHead className="hidden md:table-cell">Designation</TableHead>
                <TableHead>Face</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                    No employees yet. Click &quot;Add Employee&quot; to get started.
                  </TableCell>
                </TableRow>
              ) : (
                employees.map(emp => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="font-medium">{emp.name}</div>
                      <div className="text-xs text-muted-foreground hidden sm:block">{emp.email || "—"}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{emp.department || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">{emp.designation || "—"}</TableCell>
                    <TableCell>
                      {emp.face_registered ? (
                        <Badge variant="default" className="gap-1 text-xs">
                          <UserCheck size={11} /> Registered
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <UserX size={11} /> Not set
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8"
                          title="Register face"
                          onClick={() => openFaceUpload(emp)}
                        >
                          <Camera size={13} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(emp)}>
                          <Pencil size={13} />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(emp.id)}
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
            <DialogTitle>{editId !== null ? "Edit Employee" : "New Employee"}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="department" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input placeholder="Engineering" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="designation" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Designation</FormLabel>
                    <FormControl>
                      <Input placeholder="Developer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@company.com" {...field} />
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

      {/* Face Registration Dialog */}
      <Dialog open={faceUploadId !== null} onOpenChange={closeFaceDialog}>
        <DialogContent className="sm:max-w-sm flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              Register Face
              {facePhotoCount > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {facePhotoCount} photo{facePhotoCount > 1 ? "s" : ""} stored
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 space-y-4 pt-2 pr-1">
            {/* Mode tabs */}
            <div className="flex rounded-lg border overflow-hidden text-sm font-medium">
              <button
                onClick={() => switchMode("gallery")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 transition-colors ${faceMode === "gallery" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
              >
                <Images size={13} /> Photos {facePhotoCount > 0 && <span className="bg-blue-500 text-white text-xs rounded-full px-1.5">{facePhotoCount}</span>}
              </button>
              <button
                onClick={() => switchMode("upload")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 transition-colors ${faceMode === "upload" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
              >
                <Upload size={13} /> Upload
              </button>
              <button
                onClick={() => switchMode("webcam")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 transition-colors ${faceMode === "webcam" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
              >
                <Video size={13} /> Camera
              </button>
            </div>

            {/* Gallery mode */}
            {faceMode === "gallery" && (
              <>
                {photos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm gap-2">
                    <Images size={32} className="opacity-30" />
                    <span>No photos registered yet</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map(photo => (
                      <div key={photo.index} className="relative group rounded-lg overflow-hidden border bg-gray-100" style={{ height: 100 }}>
                        <img
                          src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${photo.url}`}
                          alt={`Photo ${photo.index}`}
                          className="w-full h-full object-cover"
                        />
                        {/* Index badge */}
                        <span className="absolute top-1 left-1 bg-black/60 text-white text-xs rounded px-1">
                          #{photo.index}
                        </span>
                        {/* Delete button — shows on hover */}
                        <button
                          onClick={() => deletePhoto(photo.index)}
                          disabled={deletingPhoto === photo.index}
                          className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold gap-1"
                        >
                          {deletingPhoto === photo.index ? "Deleting..." : <><Trash2 size={13} /> Delete</>}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Hover over a photo to delete it. Use Upload or Camera tab to add more angles.
                </p>
              </>
            )}

            {/* Upload mode */}
            {faceMode === "upload" && (
              <>
                <div
                  className="w-full rounded-lg border-2 border-dashed border-muted flex items-center justify-center bg-muted/30 overflow-hidden cursor-pointer"
                  style={{ height: 260 }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {facePreview ? (
                    <img src={facePreview} alt="Face preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground text-sm">
                      <Camera size={32} />
                      <span>Click to select a photo</span>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                <p className="text-xs text-muted-foreground">
                  {facePhotoCount === 0 ? "Upload a clear front-facing photo." : "Add more angles (left, right, tilted) for better accuracy."}
                </p>
                {facePhotoCount > 0 && !selectedFile && (
                  <button className="w-full text-xs text-primary underline text-left" onClick={() => fileInputRef.current?.click()}>
                    + Add another angle ({facePhotoCount} stored)
                  </button>
                )}
              </>
            )}

            {/* Webcam mode */}
            {faceMode === "webcam" && (
              <>
                <div className="w-full rounded-lg border-2 border-dashed border-muted bg-black overflow-hidden relative flex items-center justify-center" style={{ height: 260 }}>
                  {/* Live feed — hidden once captured */}
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    style={{ display: webcamActive ? "block" : "none", transform: "scaleX(-1)" }}
                    muted
                    playsInline
                  />
                  {/* Captured preview */}
                  {facePreview && captured && (
                    <img src={facePreview} alt="Captured" className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  {/* Idle state */}
                  {!webcamActive && !captured && (
                    <div className="flex flex-col items-center gap-2 text-gray-400 text-sm">
                      <Video size={32} />
                      <span>{webcamError ?? "Camera not started"}</span>
                      {webcamError && (
                        <button onClick={startWebcam} className="text-xs text-blue-400 underline mt-1">Retry</button>
                      )}
                    </div>
                  )}
                </div>
                {/* Hidden canvas for capture */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Webcam controls */}
                <div className="flex gap-2">
                  {webcamActive && !captured && (
                    <Button className="flex-1 gap-2" onClick={capturePhoto}>
                      <Camera size={14} /> Capture
                    </Button>
                  )}
                  {captured && (
                    <Button variant="outline" className="flex-1 gap-2" onClick={retakePhoto}>
                      <FlipHorizontal size={14} /> Retake
                    </Button>
                  )}
                  {!webcamActive && !captured && !webcamError && (
                    <Button className="flex-1 gap-2" onClick={startWebcam}>
                      <Video size={14} /> Start Camera
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Face the camera directly. Good lighting improves recognition accuracy.
                </p>
              </>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={closeFaceDialog}>
              {facePhotoCount > 0 && !selectedFile ? "Done" : "Cancel"}
            </Button>
            {selectedFile && (
              <Button onClick={submitFace} disabled={faceUploading}>
                {faceUploading ? "Registering..." : facePhotoCount === 0 ? "Register" : "Add Photo"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the employee and all their data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
