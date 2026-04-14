"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginApi } from "@/services/auth";

export default function LoginPage() {
    const [id, setId] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();



    const handleLogin = async () => {
        try {
            const res = await loginApi({
                identifier: id,
                password,
            });

            console.log("res: ",res);

            const token = res.token;

            localStorage.setItem("token", token);

            router.push("/dashboard");
        } catch (err: any) {
            console.log("err: ",err);
            alert(err.response?.data?.message || "Login failed");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">

            <div className="bg-white shadow-lg rounded-xl p-8 w-[380px]">

                <div className="text-center mb-6">
                    <h1 className="text-xl font-semibold">Admin Portal</h1>
                    <p className="text-sm text-gray-500">
                        System Setup & Management
                    </p>
                </div>

                <div className="space-y-4">
                    <input
                        placeholder="Admin ID"
                        className="w-full border rounded-lg p-2"
                        value={id}
                        onChange={(e) => setId(e.target.value)}
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        className="w-full border rounded-lg p-2"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <button
                    onClick={handleLogin}
                    className="mt-5 w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
                >
                    Login to Admin Portal
                </button>

                <p className="text-center text-xs text-gray-400 mt-6">
                    Government School Monitoring System
                </p>
            </div>
        </div>
    );
}