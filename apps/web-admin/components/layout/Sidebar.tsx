"use client";

import {
  LayoutDashboard,
  School,
  Layers,
  Users,
  UserPlus,
  ScanFace,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const menu = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "School Registration", path: "/schools", icon: School },
    { name: "Standards & Sections", path: "/standards", icon: Layers },
    { name: "Teacher Registration", path: "/teachers", icon: Users },
    { name: "Student Registration", path: "/students", icon: UserPlus },
    { name: "Face Scan Status", path: "/face-status", icon: ScanFace },
  ];

  return (
    <div className="w-64 bg-gradient-to-b from-purple-800 to-purple-700 text-white flex flex-col justify-between">
      
      {/* Top */}
      <div>
        <div className="p-5">
          <h1 className="text-lg font-semibold">Admin Portal</h1>
          <p className="text-xs opacity-70">System Setup</p>
        </div>

        <nav className="mt-4 space-y-1 px-2">
          {menu.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm transition ${
                  isActive
                    ? "bg-purple-500 shadow-md"
                    : "hover:bg-purple-600"
                }`}
              >
                <Icon size={18} />
                {item.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom */}
      <div className="p-4 border-t border-purple-600">
        <p className="text-sm font-medium">System Admin</p>
        <p className="text-xs opacity-70">admin@system.gov</p>

        <button className="mt-3 text-red-300 hover:text-red-400 text-sm">
          Logout
        </button>
      </div>
    </div>
  );
}