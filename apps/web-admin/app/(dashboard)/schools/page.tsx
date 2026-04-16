"use client";

import { useEffect, useState } from "react";
import { createSchool, getSchools,deleteSchoolApi,updateSchoolApi } from "@/services/school";
import { Pencil, Trash2 } from "lucide-react";

export default function SchoolsPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [editModal, setEditModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);

  const [form, setForm] = useState({
    name: "",
    address: "",
    district: "",
    state: "",
    pinCode: "",
    contactNumber: "",
    latitude: "",
    longitude: "",
    geoRadius: "",
  });

  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchSchools = async () => {
    try {
      const res = await getSchools();

      setSchools(
        Array.isArray(res) ? res : res.data || []
      );
      
    } catch (err) {
      console.error("Error fetching schools", err);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const handleSubmit = async () => {
    setSuccessMsg("");
    setErrorMsg("");

    if (!form.name.trim()) return setErrorMsg("School name is required");
    if (!form.address.trim()) return setErrorMsg("Address is required");
    if (!form.latitude || !form.longitude)
      return setErrorMsg("Latitude & Longitude required");

    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);

    if (isNaN(lat) || isNaN(lng))
      return setErrorMsg("Invalid latitude/longitude");

    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      district: form.district,
      state: form.state,
      pinCode: form.pinCode,
      contactNumber: form.contactNumber,
      latitude: lat,
      longitude: lng,
      geoRadius: form.geoRadius ? parseFloat(form.geoRadius) : 100,
    };

    try {
      setLoading(true);

      const res = await createSchool(payload);

      setToast({ type: "success", message: "School created successfully 🎉" });

        setTimeout(() => {
          setToast(null);
      }, 2500);

      // reset form
      setForm({
        name: "",
        address: "",
        district: "",
        state: "",
        pinCode: "",
        contactNumber: "",
        latitude: "",
        longitude: "",
        geoRadius: "",
      });

      const newSchool = res.data;
      setSchools((prev) => [newSchool, ...prev]);

    } catch (err: any) {
      console.log("ERROR:", err.response?.data);


      setToast({
        type: "error",
        message:
          err.response?.data?.errors?.[0]?.message ||
          err.response?.data?.message ||
          "Something went wrong",
      });

      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (school: any) => {
    setSelectedSchool(school);

    setForm({
      name: school.name || "",
      address: school.address || "",
      district: school.district || "",
      state: school.state || "",
      pinCode: school.pinCode || "",
      contactNumber: school.contactNumber || "",
      latitude: school.latitude?.toString() || "",
      longitude: school.longitude?.toString() || "",
      geoRadius: school.geoRadius?.toString() || "",
    });

    setEditModal(true);
  };


  const handleUpdate = async () => {
    try {
      const res = await updateSchoolApi(selectedSchool.id, {
        name: form.name,
        address: form.address,
        district: form.district,
        state: form.state,
        pinCode: form.pinCode,
        contactNumber: form.contactNumber,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        geoRadius: parseFloat(form.geoRadius),
      });

      const updatedSchool = res.data;

      setSchools((prev) =>
        prev.map((s) =>
          s.id === updatedSchool.id ? updatedSchool : s
        )
      );

      setToast({ type: "success", message: "School updated 🎉" });
      setTimeout(() => setToast(null), 2500);

      setEditModal(false);
    } catch (err: any) {
      setToast({
        type: "error",
        message: err.response?.data?.message || "Update failed",
      });
      setTimeout(() => setToast(null), 2500);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;

    try {
      await deleteSchoolApi(id);

      setToast({ type: "success", message: "School deleted" });

      setSchools((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      setToast({
        type: "error",
        message:
          err.response?.data?.message ||
          "Cannot delete. This school has linked data.",
      });
      setTimeout(() => setToast(null), 2500);
    }
  };

  return (
    <div className="space-y-6">

      {toast && (
        <div className="fixed top-5 right-5 z-50">
          <div
            className={`px-4 py-3 rounded-lg shadow-lg text-sm text-white transition-all duration-300 ${
              toast.type === "success" ? "bg-green-500" : "bg-red-500"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-base font-semibold mb-5">
          School Details
        </h2>

        <div className="grid grid-cols-2 gap-5">

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">
              School Name *
            </label>
            <div className="flex items-center border rounded-lg px-3 py-2">
              <span className="text-gray-400 mr-2">🏫</span>
              <input
                placeholder="Enter school name"
                className="w-full outline-none"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
              />
            </div>
          </div>


          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">
              Contact Number
            </label>
            <div className="flex items-center border rounded-lg px-3 py-2">
              <span className="text-gray-400 mr-2">📞</span>
              <input
                placeholder="Enter contact number"
                className="w-full outline-none"
                value={form.contactNumber}
                onChange={(e) =>
                  setForm({ ...form, contactNumber: e.target.value })
                }
              />
            </div>
          </div>

          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">
              Address *
            </label>
            <div className="flex items-start border rounded-lg px-3 py-2">
              <span className="text-gray-400 mr-2 mt-1">📍</span>
              <textarea
                placeholder="Enter full address"
                className="w-full outline-none resize-none h-20"
                value={form.address}
                onChange={(e) =>
                  setForm({ ...form, address: e.target.value })
                }
              />
            </div>
          </div>


          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">
              District
            </label>
            <input
              placeholder="Enter district"
              className="border rounded-lg px-3 py-2"
              value={form.district}
              onChange={(e) =>
                setForm({ ...form, district: e.target.value })
              }
            />
          </div>


          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">
              State
            </label>
            <input
              placeholder="Enter state"
              className="border rounded-lg px-3 py-2"
              value={form.state}
              onChange={(e) =>
                setForm({ ...form, state: e.target.value })
              }
            />
          </div>


          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">
              PIN Code
            </label>
            <input
              placeholder="Enter PIN code"
              className="border rounded-lg px-3 py-2"
              value={form.pinCode}
              onChange={(e) =>
                setForm({ ...form, pinCode: e.target.value })
              }
            />
          </div>

  
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">
              Latitude *
            </label>
            <input
              placeholder="e.g. 23.0225"
              className="border rounded-lg px-3 py-2"
              value={form.latitude}
              onChange={(e) =>
                setForm({ ...form, latitude: e.target.value })
              }
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">
              Longitude *
            </label>
            <input
              placeholder="e.g. 72.5714"
              className="border rounded-lg px-3 py-2"
              value={form.longitude}
              onChange={(e) =>
                setForm({ ...form, longitude: e.target.value })
              }
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">
              Geo Radius (meters)
            </label>
            <input
              placeholder="Default: 100"
              className="border rounded-lg px-3 py-2"
              value={form.geoRadius}
              onChange={(e) =>
                setForm({ ...form, geoRadius: e.target.value })
              }
            />
          </div>
        </div>

  
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() =>
              setForm({
                name: "",
                address: "",
                district: "",
                state: "",
                pinCode: "",
                contactNumber: "",
                latitude: "",
                longitude: "",
                geoRadius: "",
              })
            }
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Register School"}
          </button>
        </div>
      </div>


      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-sm font-semibold mb-4">
          Registered Schools ({schools.length})
        </h2>

        <table className="w-full text-sm">
          <thead className="text-gray-500 border-b">
            <tr>
              <th className="py-2 text-left">School Name</th>
              <th className="text-left">District</th>
              <th className="text-left">State</th>
              <th className="text-left">Contact</th>
              <th className="text-left">Latitude</th>
              <th className="text-left">Longitude</th>
              <th className="text-left">Status</th>
              <th className="text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {schools.map((s) => (
              <tr key={s.id} className="border-b hover:bg-gray-50">
                <td className="py-3 font-medium">{s.name}</td>
                <td>{s.district}</td>
                <td>{s.state}</td>
                <td>{s.contactNumber || '-'}</td>
                <td>{s.latitude}</td>
                <td>{s.longitude}</td>

                <td>
                  <span className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs">
                    Active
                  </span>
                </td>

                <td className="flex gap-3 items-center">
                  <Pencil onClick={() => openEdit(s)} size={16} className="cursor-pointer text-blue-500" />
                  <Trash2 onClick={() => handleDelete(s.id)} size={16} className="cursor-pointer text-red-500" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>


      {editModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[600px] shadow-lg">

            <h2 className="text-lg font-semibold mb-5">Edit School</h2>

            <div className="grid grid-cols-2 gap-4">

              {/* Name */}
              <div>
                <label className="text-sm text-gray-600">School Name</label>
                <input
                  className="border rounded-lg px-3 py-2 w-full"
                  value={form.name || ""}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />
              </div>

              {/* Contact */}
              <div>
                <label className="text-sm text-gray-600">Contact</label>
                <input
                  className="border rounded-lg px-3 py-2 w-full"
                  value={form.contactNumber || ""}
                  onChange={(e) =>
                    setForm({ ...form, contactNumber: e.target.value })
                  }
                />
              </div>

              {/* Address */}
              <div className="col-span-2">
                <label className="text-sm text-gray-600">Address</label>
                <textarea
                  className="border rounded-lg px-3 py-2 w-full h-20"
                  value={form.address || ""}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </div>

              {/* District */}
              <div>
                <label className="text-sm text-gray-600">District</label>
                <input
                  className="border rounded-lg px-3 py-2 w-full"
                  value={form.district || ""}
                  onChange={(e) =>
                    setForm({ ...form, district: e.target.value })
                  }
                />
              </div>

              {/* State */}
              <div>
                <label className="text-sm text-gray-600">State</label>
                <input
                  className="border rounded-lg px-3 py-2 w-full"
                  value={form.state || ""}
                  onChange={(e) =>
                    setForm({ ...form, state: e.target.value })
                  }
                />
              </div>

              {/* Lat */}
              <div>
                <label className="text-sm text-gray-600">Latitude</label>
                <input
                  className="border rounded-lg px-3 py-2 w-full"
                  value={form.latitude || ""}
                  onChange={(e) =>
                    setForm({ ...form, latitude: e.target.value })
                  }
                />
              </div>

              {/* Long */}
              <div>
                <label className="text-sm text-gray-600">Longitude</label>
                <input
                  className="border rounded-lg px-3 py-2 w-full"
                  value={form.longitude || ""}
                  onChange={(e) =>
                    setForm({ ...form, longitude: e.target.value })
                  }
                />
              </div>

              {/* Radius */}
              <div>
                <label className="text-sm text-gray-600">Geo Radius</label>
                <input
                  className="border rounded-lg px-3 py-2 w-full"
                  value={form.geoRadius || ""}
                  onChange={(e) =>
                    setForm({ ...form, geoRadius: e.target.value })
                  }
                />
              </div>

            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditModal(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleUpdate}
                className="bg-purple-600 text-white px-5 py-2 rounded-lg hover:bg-purple-700"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
        
      </div>
    </div>
  );
}