"use client";

import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export default function DashboardLayout({children}:{children:React.ReactNode}){
    return(
        <div className="flex h-screen">
            <Sidebar/>

            <div className="flex-1 flex flex-col">
                <Header/>

                <main className="flex-1 overflow-auto p-6 bg-gray-100">
                    {children}
                </main>

                <Footer/>
            </div>
        </div>
    )
}