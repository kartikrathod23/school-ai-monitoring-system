"use client";

import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function DashboardLayout({ children }: any) {
    const router = useRouter();

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");

        if (!token) {
            router.push("/login");
        } else {
            setLoading(false);
        }
    }, []);

    if (loading) return null;

    return (
        <div className="flex h-screen">
            <Sidebar />

            <div className="flex-1 flex flex-col">
                <Header />
                <main className="flex-1 overflow-auto p-6 bg-gray-100">
                    {children}
                </main>
                <Footer />
            </div>
        </div>
    );
}