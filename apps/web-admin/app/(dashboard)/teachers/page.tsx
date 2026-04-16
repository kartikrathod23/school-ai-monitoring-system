"use client";

import { useEffect, useState } from "react";
import {
  getSchools,
  getStandards,
  getSections,
  getTeachers,
  createTeacher,
  deleteTeacher,
  updateTeacher,
} from "@/services/teacher";
import { Pencil, Trash2, X } from "lucide-react";

export default function TeachersPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [standards, setStandards] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedStandard, setSelectedStandard] = useState("");
  const [selectedSections, setSelectedSections] = useState<string[]>([]);

  const [filterSchool, setFilterSchool] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    mobileNumber: "",
    password: "",
  });

  // ✅ CUSTOM TOAST
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    loadSchools();
    loadTeachers();
  }, []);

  const loadSchools = async () => {
    const data = await getSchools();
    setSchools(data);
  };

  const loadStandards = async (schoolId: string) => {
    const data = await getStandards(schoolId);
    setStandards(data);
  };

  const loadSections = async (standardId: string) => {
    const data = await getSections(standardId);
    setSections(data);
  };

  const loadTeachers = async () => {
    const data = await getTeachers({ page: 1, limit: 50 });
    setTeachers(data.teachers);
  };

  const resetForm = () => {
    setForm({
      firstName: "",
      lastName: "",
      mobileNumber: "",
      password: "",
    });
    setSelectedSchool("");
    setSelectedStandard("");
    setSelectedSections([]);
    setSections([]);
    setEditId(null);
  };

  const handleSubmit = async () => {
    try {
      if (selectedSections.length === 0) {
        return showToast("error", "Select at least one section");
      }

      if (editId) {
        await updateTeacher(editId, {
          firstName: form.firstName,
          lastName: form.lastName,
          mobileNumber: form.mobileNumber,
          password: form.password || undefined,
          sectionIds: selectedSections,
        });
        showToast("success", "Teacher updated successfully");
      } else {
        await createTeacher({
          ...form,
          sectionIds: selectedSections,
        });
        showToast("success", "Teacher created successfully");
      }

      resetForm();
      loadTeachers();
      setEditModalOpen(false);
    } catch (err: any) {
      showToast(
        "error",
        err.response?.data?.message || "Something went wrong"
      );
    }
  };

  const handleEdit = async (teacher: any) => {
    setEditModalOpen(true);
    setEditId(teacher.id);

    setForm({
      firstName: teacher.user.firstName || "",
      lastName: teacher.user.lastName || "",
      mobileNumber: teacher.user.mobileNumber || "",
      password: "",
    });

    const sectionIds = teacher.sections.map((s: any) => s.sectionId);
    setSelectedSections(sectionIds);

    const standardId = teacher.sections[0]?.section?.standardId;
    const schoolId = teacher.sections[0]?.section?.standard?.schoolId;

    if (schoolId) {
      setSelectedSchool(schoolId);
      await loadStandards(schoolId);
    }

    if (standardId) {
      setSelectedStandard(standardId);
      await loadSections(standardId);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTeacher(id);

      setTeachers((prev) => prev.filter((t) => t.id !== id));

      showToast("success", "Teacher deleted successfully");
    } catch(err:any) {
      showToast(
        "error",
        err.response?.data?.message || "Delete failed"
      );
    }
  };

  const filteredTeachers = filterSchool
    ? teachers.filter((t) =>
        t.sections.some(
          (s: any) => s.section?.standard?.schoolId === filterSchool
        )
      )
    : teachers;

  return (
    <div className="space-y-6">

      {toast && (
        <div className="fixed top-5 right-5 z-50">
          <div
            className={`px-4 py-2 rounded-lg shadow text-white text-sm ${
              toast.type === "success"
                ? "bg-green-600"
                : "bg-red-500"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}


      {/* FORM */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
        <h2 className="text-lg font-semibold mb-5">
          Teacher Registration
        </h2>

        <div className="grid grid-cols-2 gap-5">

          {/* FIRST NAME */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              First Name
            </label>
            <input
              className="input"
              value={form.firstName}
              onChange={(e) =>
                setForm({ ...form, firstName: e.target.value })
              }
            />
          </div>

          {/* LAST NAME */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Last Name
            </label>
            <input
              className="input"
              value={form.lastName}
              onChange={(e) =>
                setForm({ ...form, lastName: e.target.value })
              }
            />
          </div>

          {/* MOBILE */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Mobile Number
            </label>
            <input
              className="input"
              value={form.mobileNumber}
              onChange={(e) =>
                setForm({ ...form, mobileNumber: e.target.value })
              }
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Password
            </label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
            />
          </div>

          {/* SCHOOL */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              School
            </label>
            <select
              className="input"
              value={selectedSchool}
              onChange={(e) => {
                setSelectedSchool(e.target.value);
                loadStandards(e.target.value);
              }}
            >
              <option value="">Select School</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* STANDARD */}
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Standard
            </label>
            <select
              className="input"
              value={selectedStandard}
              onChange={(e) => {
                setSelectedStandard(e.target.value);
                loadSections(e.target.value);
              }}
            >
              <option value="">Select Standard</option>
              {standards.map((s) => (
                <option key={s.id} value={s.id}>
                  Std {s.value}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5">
          <label className="text-sm text-gray-600 mb-2 block">
            Select Sections
          </label>

          <div className="flex flex-wrap gap-2 border rounded-lg p-3 min-h-[50px]">
            {sections.length === 0 && (
              <span className="text-gray-400 text-sm">
                Select standard first
              </span>
            )}

            {sections.map((sec) => {
              const isSelected = selectedSections.includes(sec.id);

              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setSelectedSections((prev) =>
                        prev.filter((id) => id !== sec.id)
                      );
                    } else {
                      setSelectedSections((prev) => [
                        ...prev,
                        sec.id,
                      ]);
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-sm border transition ${
                    isSelected
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {sec.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg"
          >
            {editId ? "Update Teacher" : "Register Teacher"}
          </button>
        </div>
      </div>


      {/* FILTER */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
        <select
          className="input w-[300px]"
          value={filterSchool}
          onChange={(e) => setFilterSchool(e.target.value)}
        >
          <option value="">All Schools</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>


      {/* TABLE */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
        <h2 className="text-lg font-semibold mb-4">Teachers</h2>

        <table className="w-full text-sm">
          <thead className="text-gray-500 text-left">
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Mobile</th>
              <th>School</th>
              <th>Standard</th>
              <th>Sections</th>
              <th className="text-right pr-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredTeachers.map((t) => {
              const sections = t.sections.map(
                (s: any) => s.section.name
              );
              const standard =
                t.sections[0]?.section?.standard?.value;
              const school =
                t.sections[0]?.section?.standard?.school?.name;

              return (
                <tr key={t.id} className="border-t hover:bg-gray-50">
                  <td className="py-3 font-medium">
                    {t.user.firstName} {t.user.lastName}
                  </td>
                  <td>{t.user.userCode}</td>
                  <td>{t.user.mobileNumber}</td>
                  <td>{school}</td>
                  <td>{standard ? `Std ${standard}` : "-"}</td>

                  <td>{sections.join(", ")}</td>

                  <td className="flex justify-end gap-3 pr-4">
                    <button onClick={() => handleEdit(t)}>
                      <Pencil size={16} className="text-blue-500" />
                    </button>

                    <button onClick={() => handleDelete(t.id)}>
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* EDIT MODAL */}
    {editModalOpen && (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
        <div className="bg-white w-[600px] rounded-xl p-6 shadow-lg">
          
          <div className="flex justify-between mb-4">
            <h2 className="font-semibold text-lg">Edit Teacher</h2>
            <button onClick={() => setEditModalOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">

            {/* FIRST NAME */}
            <div>
              <label className="text-sm text-gray-600 mb-1 block">
                First Name
              </label>
              <input
                className="input"
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
              />
            </div>

            {/* LAST NAME */}
            <div>
              <label className="text-sm text-gray-600 mb-1 block">
                Last Name
              </label>
              <input
                className="input"
                value={form.lastName}
                onChange={(e) =>
                  setForm({ ...form, lastName: e.target.value })
                }
              />
            </div>


            <div>
              <label className="text-sm text-gray-600 mb-1 block">
                Password (optional)
              </label>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
              />
            </div>

            {/* MOBILE */}
            <div>
              <label className="text-sm text-gray-600 mb-1 block">
                Mobile Number
              </label>
              <input
                className="input"
                value={form.mobileNumber}
                onChange={(e) =>
                  setForm({ ...form, mobileNumber: e.target.value })
                }
              />
            </div>

            {/* SCHOOL */}
            <div>
              <label className="text-sm text-gray-600 mb-1 block">
                School
              </label>
              <select
                className="input"
                value={selectedSchool}
                onChange={async (e) => {
                  const val = e.target.value;
                  setSelectedSchool(val);
                  setSelectedStandard("");
                  setSelectedSections([]);
                  await loadStandards(val);
                }}
              >
                <option value="">Select School</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* STANDARD */}
            <div>
              <label className="text-sm text-gray-600 mb-1 block">
                Standard
              </label>
              <select
                className="input"
                value={selectedStandard}
                onChange={async (e) => {
                  const val = e.target.value;
                  setSelectedStandard(val);
                  setSelectedSections([]);
                  await loadSections(val);
                }}
              >
                <option value="">Select Standard</option>
                {standards.map((s) => (
                  <option key={s.id} value={s.id}>
                    Std {s.value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SECTIONS (same nice UI) */}
          <div className="mt-5">
            <label className="text-sm text-gray-600 mb-2 block">
              Sections
            </label>

            <div className="flex flex-wrap gap-2 border rounded-lg p-3 min-h-[50px]">
              {sections.length === 0 && (
                <span className="text-gray-400 text-sm">
                  Select standard first
                </span>
              )}

              {sections.map((sec) => {
                const isSelected = selectedSections.includes(sec.id);

                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedSections((prev) =>
                          prev.filter((id) => id !== sec.id)
                        );
                      } else {
                        setSelectedSections((prev) => [
                          ...prev,
                          sec.id,
                        ]);
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-sm border ${
                      isSelected
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100"
                    }`}
                  >
                    {sec.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 border rounded-lg"
            >
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg"
            >
              Update
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}