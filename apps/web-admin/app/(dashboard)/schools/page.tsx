"use client";

import { useEffect, useState } from "react";
import { createSchool, getSchools } from "@/services/school";
import { Pencil, Trash2 } from "lucide-react";

export default function SchoolsPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    geoRadius: "",
  });

  const fetchSchools = async () => {
    try {
      const data = await getSchools();
      setSchools(data);
    } catch (err) {
      console.error("Error fetching schools", err);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const handleSubmit = async () => {
    setMessage("");
    setErrorMsg("");

    try {

      if (!form.name.trim() || !form.address.trim()) {
        return setErrorMsg("Name and Address are required");
      }

      if (!form.latitude || !form.longitude) {
        return setErrorMsg("Latitude & Longitude required");
      }

      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        geoRadius: form.geoRadius
          ? parseFloat(form.geoRadius)
          : 100,
      };

      if (isNaN(payload.latitude) || isNaN(payload.longitude)) {
        return setErrorMsg("Invalid latitude/longitude");
      }

      setLoading(true);

      await createSchool(payload);

      setMessage("✅ School created successfully");

      setForm({
        name: "",
        address: "",
        latitude: "",
        longitude: "",
        geoRadius: "",
      });

      fetchSchools();
    } catch (err: any) {
      console.error("ERROR:", err.response?.data);

      setErrorMsg(
        err.response?.data?.message || "Failed to create school"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">School Registration</h1>
          <p className="text-sm text-gray-500">
            Step 1: Register schools and locations
          </p>
        </div>

        <button className="bg-purple-600 text-white px-4 py-2 rounded-lg">
          + Add New School
        </button>
      </div>

      {/* SUCCESS / ERROR */}
      {message && (
        <div className="bg-green-100 text-green-700 px-4 py-2 rounded">
          {message}
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-100 text-red-600 px-4 py-2 rounded">
          {errorMsg}
        </div>
      )}

      {/* FORM */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-sm font-semibold mb-4">School Details</h2>

        <div className="grid grid-cols-2 gap-4">

          <input
            placeholder="School Name"
            className="input"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />

          {/* ❌ Removed School Code (correct decision) */}

          <textarea
            placeholder="Location / Address"
            className="col-span-2 input h-20"
            value={form.address}
            onChange={(e) =>
              setForm({ ...form, address: e.target.value })
            }
          />

          <input
            placeholder="Latitude"
            className="input"
            value={form.latitude}
            onChange={(e) =>
              setForm({ ...form, latitude: e.target.value })
            }
          />

          <input
            placeholder="Longitude"
            className="input"
            value={form.longitude}
            onChange={(e) =>
              setForm({ ...form, longitude: e.target.value })
            }
          />

          <input
            placeholder="Geo Radius (optional)"
            className="input"
            value={form.geoRadius}
            onChange={(e) =>
              setForm({ ...form, geoRadius: e.target.value })
            }
          />
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={() =>
              setForm({
                name: "",
                address: "",
                latitude: "",
                longitude: "",
                geoRadius: "",
              })
            }
            className="px-4 py-2 border rounded-lg"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50"
          >
            {loading ? "Creating..." : "Register School"}
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-sm font-semibold mb-4">
          Registered Schools ({schools.length})
        </h2>

        <table className="w-full text-sm">
          <thead className="text-gray-500">
            <tr>
              <th className="py-2 text-left">School Name</th>
              <th className="text-left">Location</th>
              <th className="text-left">Latitude</th>
              <th className="text-left">Longitude</th>
              <th className="text-left">Status</th>
              <th className="text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {schools.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="py-3 font-medium text-left">
                  {s.name}
                </td>

                <td className="text-left">{s.address}</td>
                <td className="text-left">{s.latitude}</td>
                <td className="text-left">{s.longitude}</td>

                <td className="text-left">
                  <span className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs">
                    Active
                  </span>
                </td>

                <td className="flex gap-3 items-center text-left">
                  <Pencil
                    size={16}
                    className="cursor-pointer text-blue-500"
                  />
                  <Trash2
                    size={16}
                    className="cursor-pointer text-red-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}