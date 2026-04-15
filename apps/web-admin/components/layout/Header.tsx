"use client";

import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  const routeConfig: any = {
    "/dashboard": {
      title: "Admin Dashboard",
      subtitle: "Phase 1: Onboarding & Registration",
    },
    "/schools": {
      title: "School Registration",
      subtitle: "Step 1: Register schools and locations",
    },
    "/standards": {
      title: "Standards & Sections",
      subtitle: "Step 2: Create class structure",
    },
    "/teachers": {
      title: "Teacher Registration",
      subtitle: "Step 3: Register teachers",
    },
    "/students": {
      title: "Student Registration",
      subtitle: "Step 4: Register students",
    },
    "/face-status": {
      title: "Face Scan Status",
      subtitle: "Step 5: Monitor face registration",
    },
  };

  const current = routeConfig[pathname] || {
    title: "Admin Panel",
    subtitle: "",
  };

  return (
    <div className="h-16 bg-white shadow-sm flex items-center justify-between px-6">
      
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          {current.title}
        </h1>
        <p className="text-sm text-gray-500">
          {current.subtitle}
        </p>
      </div>

      <img src="/logos/uit.jpg" alt="UIT" className="h-8" />
    </div>
  );
}