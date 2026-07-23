"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Camera, Activity,
  ClipboardList, BarChart2, ScanFace, Settings, Menu, X,
} from "lucide-react";

const navItems = [
  { href: "/",            label: "Dashboard",  icon: LayoutDashboard },
  { href: "/monitoring",  label: "Monitoring", icon: Activity },
  { href: "/attendance",  label: "Attendance", icon: ClipboardList },
  { href: "/employees",   label: "Employees",  icon: Users },
  { href: "/cameras",     label: "Cameras",    icon: Camera },
  { href: "/reports",     label: "Reports",    icon: BarChart2 },
  { href: "/snapshots",   label: "Snapshots",  icon: ScanFace },
  { href: "/settings",    label: "Settings",   icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <Icon size={17} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  return (
    <div className="px-6 py-4 border-t border-gray-700">
      <p className="text-xs text-gray-500">Phase 6 — Complete</p>
      <p className="text-xs text-gray-600">v6.0.0</p>
    </div>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* ── Desktop sidebar (md and above) ─────────────────────────── */}
      <aside className="hidden md:flex w-60 shrink-0 bg-gray-900 text-white flex-col">
        <div className="px-6 py-5 border-b border-gray-700">
          <h1 className="text-sm font-bold uppercase tracking-widest text-blue-400">
            Smart Monitor
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Employee System</p>
        </div>
        <NavLinks />
        <SidebarFooter />
      </aside>

      {/* ── Mobile hamburger button ─────────────────────────────────── */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-gray-900 text-white p-2 rounded-lg shadow-lg"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* ── Mobile drawer overlay ───────────────────────────────────── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="md:hidden fixed inset-y-0 left-0 w-60 bg-gray-900 text-white flex flex-col z-50 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-700">
              <div>
                <h1 className="text-sm font-bold uppercase tracking-widest text-blue-400">
                  Smart Monitor
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">Employee System</p>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-gray-400 hover:text-white"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
            <SidebarFooter />
          </aside>
        </>
      )}
    </>
  );
}
