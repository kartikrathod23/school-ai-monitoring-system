"use client";

import { useEffect, useState } from "react";
import { getDashboardStats } from "@/services/admin";
import Card from "@/components/ui/Card";
import StatusCard from "@/components/ui/StatusCard";
import { School, Layers, Users, UserPlus, ScanFace } from "lucide-react";
import { Plus, GraduationCap, Eye } from "lucide-react";

export default function DashboardPage() {
    const [stats, setStats] = useState<any>(null);

    const steps = [
        { title: "School Registration", icon: School, color: "blue" },
        { title: "Standards & Sections", icon: Layers, color: "green" },
        { title: "Teacher Registration", icon: Users, color: "purple" },
        { title: "Student Registration", icon: UserPlus, color: "pink" },
        { title: "Face Scan Status", icon: ScanFace, color: "yellow" },
    ];

    useEffect(() => {
        const fetch = async () => {
            const data = await getDashboardStats();
            setStats(data);
        };
        fetch();
    }, []);

    if (!stats) return <p>Loading...</p>;

    return (
        <div className="space-y-6">

            <div className="bg-purple-50 border border-purple-100 p-4 rounded-lg text-base text-purple-700">
                <strong>Administrator Responsibilities</strong>
                <p>
                    Manage system setup and stakeholder registration. Complete onboarding:
                    School → Standards & Sections → Teachers → Students.
                </p>
            </div>

            <div className="grid grid-cols-5 gap-4">
                <Card title="Schools" value={stats.totalSchools} color="blue" />
                <Card title="Standards" value={stats.totalStandards || 0} color="green" />
                <Card title="Sections" value={stats.totalSections || 0} color="yellow" />
                <Card title="Teachers" value={stats.totalTeachers} color="purple" />
                <Card title="Students" value={stats.totalStudents} color="pink" />
            </div>


            {/* 3. ONBOARDING */}
            <div className="bg-white p-5 rounded-xl shadow-sm">
                <h2 className="text-base font-semibold mb-4">Onboarding Workflow</h2>

                <div className="grid grid-cols-5 gap-4">
                    {steps.map((step, i) => {
                        const Icon = step.icon;

                        return (
                            <div
                                key={i}
                                className="p-4 rounded-lg border hover:shadow-sm transition"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <Icon size={20} className="text-purple-500" />
                                    <span className="text-xs text-gray-400">Step {i + 1}</span>
                                </div>

                                <p className="text-base font-medium">{step.title}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 4. FACE STATUS */}
            <div className="grid grid-cols-3 gap-4">
                <StatusCard title="Registered" value={785} color="green" />
                <StatusCard title="Pending" value={95} color="yellow" />
                <StatusCard title="Re-scan Required" value={20} color="red" />
            </div>


            {/* 5. QUICK ACTIONS */}
            <div className="grid grid-cols-2 gap-4">

                <button className="flex items-center gap-2 border p-3 rounded-lg text-base hover:bg-gray-50">
                    <Plus size={16} /> Add New School
                </button>

                <button className="flex items-center gap-2 border p-3 rounded-lg text-base hover:bg-gray-50">
                    <UserPlus size={16} /> Register Teacher
                </button>

                <button className="flex items-center gap-2 border p-3 rounded-lg text-base hover:bg-gray-50">
                    <GraduationCap size={16} /> Register Student
                </button>

                <button className="flex items-center gap-2 border p-3 rounded-lg text-base hover:bg-gray-50">
                    <Eye size={16} /> View Face Scan Status
                </button>

            </div>


        </div>
    );
}