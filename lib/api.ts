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

// Cameras
export const getCameras = () => api.get<Camera[]>("/api/v1/cameras").then(r => r.data);
export const createCamera = (data: Omit<Camera, "id" | "is_active">) =>
  api.post<Camera>("/api/v1/cameras", data).then(r => r.data);
export const updateCamera = (id: number, data: Partial<Camera>) =>
  api.put<Camera>(`/api/v1/cameras/${id}`, data).then(r => r.data);
export const deleteCamera = (id: number) =>
  api.delete(`/api/v1/cameras/${id}`);
