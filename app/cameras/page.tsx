"use client";

import { useEffect, useState } from "react";
import {
  getCameras, createCamera, deleteCamera, updateCamera, type Camera,
} from "@/lib/api";
import { Plus, Trash2, Pencil, X, Check, Wifi, WifiOff } from "lucide-react";

const LOCATION_LABELS = ["entry", "exit", "floor_1", "floor_2", "parking", "cafeteria", "lobby"];

export default function CamerasPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [form, setForm] = useState({ name: "", location_label: "entry", rtsp_url: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    getCameras()
      .then(setCameras)
      .catch(() => setError("Failed to load cameras."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ name: "", location_label: "entry", rtsp_url: "" });
    setShowForm(false);
    setEditId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.rtsp_url.trim()) return;
    setSubmitting(true);
    try {
      if (editId !== null) {
        await updateCamera(editId, form);
      } else {
        await createCamera(form);
      }
      resetForm();
      load();
    } catch {
      setError("Failed to save camera.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (cam: Camera) => {
    setForm({ name: cam.name, location_label: cam.location_label, rtsp_url: cam.rtsp_url });
    setEditId(cam.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this camera?")) return;
    try {
      await deleteCamera(id);
      load();
    } catch {
      setError("Failed to delete camera.");
    }
  };

  const handleToggleActive = async (cam: Camera) => {
    try {
      await updateCamera(cam.id, { is_active: !cam.is_active });
      load();
    } catch {
      setError("Failed to update camera.");
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl font-bold text-gray-800">Cameras</h2>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Add Camera
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        {cameras.length} camera{cameras.length !== 1 ? "s" : ""} &nbsp;·&nbsp;
        {cameras.filter(c => c.is_active).length} active
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between">
          {error}
          <button onClick={() => setError("")}><X size={14} /></button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            {editId !== null ? "Edit Camera" : "New Camera"}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Camera Name *</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Entry Camera 1"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Location Label *</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={form.location_label}
                onChange={e => setForm(f => ({ ...f, location_label: e.target.value }))}
              >
                {LOCATION_LABELS.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">RTSP URL *</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="rtsp://192.168.1.1/stream1"
                value={form.rtsp_url}
                onChange={e => setForm(f => ({ ...f, rtsp_url: e.target.value }))}
                required
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
      ) : cameras.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No cameras yet. Click &quot;Add Camera&quot; to register one.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Location</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">RTSP URL</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cameras.map(cam => (
                <tr key={cam.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{cam.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">
                      {cam.location_label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs truncate max-w-[180px]">
                    {cam.rtsp_url}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(cam)}
                      className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full transition-colors ${
                        cam.is_active
                          ? "bg-green-50 text-green-600 hover:bg-green-100"
                          : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                      }`}
                    >
                      {cam.is_active ? <Wifi size={12} /> : <WifiOff size={12} />}
                      {cam.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleEdit(cam)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(cam.id)}
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
