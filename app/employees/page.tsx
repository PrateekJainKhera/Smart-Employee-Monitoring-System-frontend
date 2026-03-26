"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { getEmployees, createEmployee, deleteEmployee, updateEmployee, registerFace, getFaceImageUrl, type Employee } from "@/lib/api";
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
import { Plus, Trash2, Pencil, UserCheck, UserX, Camera } from "lucide-react";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const openFaceUpload = (emp: Employee) => {
    setFaceUploadId(emp.id);
    setFacePreview(emp.face_registered ? getFaceImageUrl(emp.id) : null);
    setSelectedFile(null);
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
      await registerFace(faceUploadId, selectedFile);
      toast.success("Face registered successfully");
      setFaceUploadId(null);
      setSelectedFile(null);
      setFacePreview(null);
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

      {/* Face Upload Dialog */}
      <Dialog open={faceUploadId !== null} onOpenChange={() => { setFaceUploadId(null); setFacePreview(null); setSelectedFile(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Register Face</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Preview */}
            <div
              className="w-full aspect-square rounded-lg border-2 border-dashed border-muted flex items-center justify-center bg-muted/30 overflow-hidden cursor-pointer"
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />
            <p className="text-xs text-muted-foreground">
              Use a clear, front-facing photo. The face must be fully visible.
            </p>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => { setFaceUploadId(null); setFacePreview(null); setSelectedFile(null); }}>
              Cancel
            </Button>
            <Button onClick={submitFace} disabled={!selectedFile || faceUploading}>
              {faceUploading ? "Registering..." : "Register"}
            </Button>
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
