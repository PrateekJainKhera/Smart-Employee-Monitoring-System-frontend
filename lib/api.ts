import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

export interface Employee {
  id: number;
  name: string;
  department: string;
  designation: string;
  email: string;
  face_registered: boolean;
  created_at: string;
}

export interface Camera {
  id: number;
  name: string;
  location_label: string;
  rtsp_url: string;
  is_active: boolean;
}

export interface HealthStatus {
  status: string;
  storage: string;
  uptime_seconds: number;
  version: string;
}

// Health
export const getHealth = () => api.get<HealthStatus>("/health").then(r => r.data);

// Employees
export const getEmployees = () => api.get<Employee[]>("/api/v1/employees").then(r => r.data);
export const getEmployee = (id: number) => api.get<Employee>(`/api/v1/employees/${id}`).then(r => r.data);
export const createEmployee = (data: Omit<Employee, "id" | "face_registered" | "created_at">) =>
  api.post<Employee>("/api/v1/employees", data).then(r => r.data);
export const updateEmployee = (id: number, data: Partial<Employee>) =>
  api.put<Employee>(`/api/v1/employees/${id}`, data).then(r => r.data);
export const deleteEmployee = (id: number) =>
  api.delete(`/api/v1/employees/${id}`);
export const registerFace = async (id: number, file: File) => {
  const form = new FormData();
  form.append("file", file);
  const r = await api.post(`/api/v1/employees/${id}/face`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return r.data;
};
export const getFaceImageUrl = (id: number, photoIndex: number = 1) =>
  `${api.defaults.baseURL}/api/v1/employees/${id}/face/${photoIndex}`;

export const getFacePhotos = (id: number) =>
  api.get<{ total_photos: number; photos: { index: number; url: string }[] }>(
    `/api/v1/employees/${id}/faces`
  ).then(r => r.data);

export const deleteFacePhoto = (id: number, photoIndex: number) =>
  api.delete(`/api/v1/employees/${id}/face/${photoIndex}`).then(r => r.data);

// Cameras
export const getCameras = () => api.get<Camera[]>("/api/v1/cameras").then(r => r.data);
export const createCamera = (data: Omit<Camera, "id" | "is_active">) =>
  api.post<Camera>("/api/v1/cameras", data).then(r => r.data);
export const updateCamera = (id: number, data: Partial<Camera>) =>
  api.put<Camera>(`/api/v1/cameras/${id}`, data).then(r => r.data);
export const deleteCamera = (id: number) =>
  api.delete(`/api/v1/cameras/${id}`);

// New types
export interface AttendanceLog {
  id: number;
  employee_id: number;
  employee_name: string;
  check_in: string | null;
  check_out: string | null;
  total_hours: number | null;
  date: string;
  break_count: number;
  on_break: boolean;
}

export interface AttendanceStatus {
  status: "absent" | "inside" | "on_break" | "checked_out";
  check_in: string | null;
  check_out: string | null;
  total_hours?: number | null;
  total_hours_so_far?: number | null;
}

export interface DailyReport {
  date: string;
  total_employees: number;
  present: number;
  absent: number;
  inside: number;
  on_break: number;
  checked_out: number;
  avg_hours_worked: number;
  early_arrivals: { employee_id: number; name: string; check_in: string }[];
}

export interface MovementEvent {
  type: "check_in" | "check_out" | "break_start" | "break_end" | "detected";
  timestamp: string | null;
  camera?: string;
  location?: string;
  duration_min?: number;
  break_type?: string;
}

export interface WsEvent {
  event: "snapshot" | "checkin" | "checkout" | "break_start" | "break_end" | "detected" | "unknown";
  employee_id?: number;
  employee_name?: string;
  camera_id?: number;
  camera_label?: string;
  confidence?: number;
  total_hours?: number;
  duration_min?: number;
  break_type?: string;
  auto?: boolean;
  data?: AttendanceLog[];
  timestamp: string;
}

// New API functions
export const getTodayAttendance = () =>
  api.get<AttendanceLog[]>("/api/v1/attendance/today").then(r => r.data);

export const getAttendanceByDate = (date: string) =>
  api.get<AttendanceLog[]>(`/api/v1/attendance?date=${date}`).then(r => r.data);

export const getEmployeeStatus = (id: number) =>
  api.get<AttendanceStatus>(`/api/v1/attendance/status/${id}`).then(r => r.data);

export const getDailyReport = (date?: string) =>
  api.get<DailyReport>(`/api/v1/reports/daily${date ? `?date=${date}` : ""}`).then(r => r.data);

export const getMovementTimeline = (employeeId: number, date?: string) =>
  api.get<MovementEvent[]>(`/api/v1/reports/movement?employee_id=${employeeId}${date ? `&date=${date}` : ""}`).then(r => r.data);

export const getExportUrl = (date?: string) =>
  `${api.defaults.baseURL}/api/v1/reports/export${date ? `?date=${date}` : ""}`;

export interface BreakLog {
  id: number;
  employee_id: number;
  attendance_log_id: number;
  break_start: string | null;
  break_end: string | null;
  duration_minutes: number | null;
  break_type: string | null;
}

export const getBreaks = (attendanceLogId: number) =>
  api.get<BreakLog[]>(`/api/v1/attendance/breaks/${attendanceLogId}`).then(r => r.data);
