"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createSectionApi,
  createStandardApi,
  getSchoolsListApi,
  getStandardsBySchoolApi,
  updateStandardApi,
  deleteStandardApi,
  updateSectionApi,
  deleteSectionApi,
} from "@/services/standard";
import { Pencil } from "lucide-react";

type School = {
  id: string;
  name: string;
};

type Section = {
  id: string;
  name: string;
};

type Standard = {
  id: string;
  name: string;
  sections?: Section[];
};

export default function StandardsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [standards, setStandards] = useState<Standard[]>([]);
  const [sectionStandards, setSectionStandards] = useState<Standard[]>([]);

  const [standardForm, setStandardForm] = useState({
    name: "",
    schoolId: "",
  });

  const [sectionForm, setSectionForm] = useState({
    schoolId: "",
    standardId: "",
    name: "",
  });

  const [editingStandardId, setEditingStandardId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<any>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  };

  const fetchSchools = async () => {
    const res = await getSchoolsListApi();
    setSchools(res.data || []);
  };

  const fetchStandards = async (schoolId: string) => {
    if (!schoolId) return setStandards([]);
    const res = await getStandardsBySchoolApi(schoolId);
    setStandards(res.data || []);
  };

  const fetchStandardsForSection = async (schoolId: string) => {
    if (!schoolId) return setSectionStandards([]);
    const res = await getStandardsBySchoolApi(schoolId);
    setSectionStandards(res.data || []);
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    if (selectedSchoolId) fetchStandards(selectedSchoolId);
  }, [selectedSchoolId]);

  const handleCreateStandard = async () => {
    if (!standardForm.schoolId || !standardForm.name.trim())
      return showToast("error", "Fill all fields");

    await createStandardApi(standardForm);

    showToast("success", "Standard created");

    setStandardForm({ name: "", schoolId: standardForm.schoolId });
    fetchStandards(standardForm.schoolId);
  };

  const handleCreateSection = async () => {
    if (!sectionForm.standardId || !sectionForm.name.trim())
      return showToast("error", "Fill all fields");

    await createSectionApi({
      standardId: sectionForm.standardId,
      name: sectionForm.name,
    });

    showToast("success", "Section created");

    setSectionForm({ ...sectionForm, name: "" });
    fetchStandards(sectionForm.schoolId);
  };

  const handleUpdateStandard = async (id: string) => {
    await updateStandardApi(id, editValue);
    setEditingStandardId(null);
    fetchStandards(selectedSchoolId);
  };

  const handleDeleteStandard = async (id: string) => {
    if (!confirm("Delete standard?")) return;
    await deleteStandardApi(id);
    fetchStandards(selectedSchoolId);
  };

  const handleUpdateSection = async (id: string) => {
    await updateSectionApi(id, editValue);
    setEditingSectionId(null);
    fetchStandards(selectedSchoolId);
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm("Delete section?")) return;
    await deleteSectionApi(id);
    fetchStandards(selectedSchoolId);
  };

  const currentSchoolName = useMemo(() => {
    return schools.find((s) => s.id === selectedSchoolId)?.name || "";
  }, [schools, selectedSchoolId]);

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

      {/* CREATE STANDARD */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
        <h2 className="font-semibold mb-4">Create Standard</h2>

        <div className="grid grid-cols-3 gap-4">
          <select
            value={standardForm.schoolId}
            onChange={(e) => {
              setStandardForm({ ...standardForm, schoolId: e.target.value });
              setSelectedSchoolId(e.target.value);
            }}
            className="border p-2 rounded"
          >
            <option value="">Select School</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <input
            placeholder="Standard Name"
            value={standardForm.name}
            onChange={(e) =>
              setStandardForm({ ...standardForm, name: e.target.value })
            }
            className="border p-2 rounded"
          />

          <button
            onClick={handleCreateStandard}
            className="bg-purple-600 text-white rounded"
          >
            Create
          </button>
        </div>
      </div>

      {/* CREATE SECTION */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
        <h2 className="font-semibold mb-4">Add Section</h2>

        <div className="grid grid-cols-4 gap-4">
          <select
            value={sectionForm.schoolId}
            onChange={(e) => {
              const id = e.target.value;
              setSectionForm({ schoolId: id, standardId: "", name: "" });
              fetchStandardsForSection(id);
            }}
            className="border p-2 rounded"
          >
            <option value="">Select School</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={sectionForm.standardId}
            onChange={(e) =>
              setSectionForm({ ...sectionForm, standardId: e.target.value })
            }
            className="border p-2 rounded"
          >
            <option value="">Select Standard</option>
            {sectionStandards.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <input
            placeholder="Section (A,B,C)"
            value={sectionForm.name}
            onChange={(e) =>
              setSectionForm({ ...sectionForm, name: e.target.value })
            }
            className="border p-2 rounded"
          />

          <button
            onClick={handleCreateSection}
            className="bg-green-600 text-white rounded"
          >
            Add
          </button>
        </div>
      </div>

      {/* STRUCTURE */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
        <h2 className="font-semibold mb-4">
          Structure ({currentSchoolName})
        </h2>

        <div className="grid grid-cols-4 gap-4">
          {standards.map((standard) => (
            <div key={standard.id} className="border p-4 rounded">
              <div className="flex justify-between mb-2">
                {editingStandardId === standard.id ? (
                  <input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="border px-1"
                  />
                ) : (
                  <h3>{standard.name}</h3>
                )}

                <div className="flex gap-2">
                  <Pencil
                    size={14}
                    onClick={() => {
                      setEditingStandardId(standard.id);
                      setEditValue(standard.name);
                    }}
                  />

                  <button onClick={() => handleDeleteStandard(standard.id)}>
                    ❌
                  </button>

                  {editingStandardId === standard.id && (
                    <button
                      onClick={() => handleUpdateStandard(standard.id)}
                    >
                      ✔
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {standard.sections?.map((sec) => (
                  <div key={sec.id} className="flex items-center gap-1">
                    {editingSectionId === sec.id ? (
                      <input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="border px-1 text-xs"
                      />
                    ) : (
                      <span className="bg-purple-100 px-2 text-xs rounded">
                        {sec.name}
                      </span>
                    )}

                    <Pencil
                      size={12}
                      onClick={() => {
                        setEditingSectionId(sec.id);
                        setEditValue(sec.name);
                      }}
                    />

                    <button onClick={() => handleDeleteSection(sec.id)}>
                      x
                    </button>

                    {editingSectionId === sec.id && (
                      <button
                        onClick={() => handleUpdateSection(sec.id)}
                      >
                        ✔
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}