"use client";

import { useEffect, useState } from "react";
import {
  getEmployees, createEmployee, deleteEmployee, updateEmployee, type Employee,
} from "@/lib/api";
import { Plus, Trash2, Pencil, X, Check, UserCheck, UserX } from "lucide-react";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [form, setForm] = useState({ name: "", department: "", designation: "", email: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    getEmployees()
      .then(setEmployees)
      .catch(() => setError("Failed to load employees."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ name: "", department: "", designation: "", email: "" });
    setShowForm(false);
    setEditId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      if (editId !== null) {
        await updateEmployee(editId, form);
      } else {
        await createEmployee(form);
      }
      resetForm();
      load();
    } catch {
      setError("Failed to save employee.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (emp: Employee) => {
    setForm({ name: emp.name, department: emp.department, designation: emp.designation, email: emp.email });
    setEditId(emp.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this employee?")) return;
    try {
      await deleteEmployee(id);
      load();
    } catch {
      setError("Failed to delete employee.");
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl font-bold text-gray-800">Employees</h2>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Add Employee
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">{employees.length} employee{employees.length !== 1 ? "s" : ""} registered</p>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between">
          {error}
          <button onClick={() => setError("")}><X size={14} /></button>
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            {editId !== null ? "Edit Employee" : "New Employee"}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-gray-500 mb-1">Full Name *</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Department</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Engineering"
                value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Designation</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Developer"
                value={form.designation}
                onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <input
                type="email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="john@company.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="col-span-2 flex gap-2 justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Check size={14} />
                {submitting ? "Saving..." : editId !== null ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>
      ) : employees.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No employees yet. Click &quot;Add Employee&quot; to get started.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Department</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Designation</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Face</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    <div>{emp.name}</div>
                    <div className="text-xs text-gray-400">{emp.email || "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{emp.department || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.designation || "—"}</td>
                  <td className="px-4 py-3">
                    {emp.face_registered ? (
                      <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                        <UserCheck size={13} /> Registered
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-400 text-xs">
                        <UserX size={13} /> Not set
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleEdit(emp)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(emp.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
