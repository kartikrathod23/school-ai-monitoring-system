"use client";

import { useEffect, useState } from "react";
import {
  getSchools,
  getStandards,
  getSections,
} from "@/services/teacher";

import { getStudent ,getStudents,updateStudent,deleteStudent,createStudent} from "@/services/student";
import { Pencil, Trash2, X } from "lucide-react";

export default function StudentsPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [standards, setStandards] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedStandard, setSelectedStandard] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  const [filterSchool, setFilterSchool] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

    // separate modal states
  const [editSchool, setEditSchool] = useState("");
  const [editStandard, setEditStandard] = useState("");
  const [editSection, setEditSection] = useState("");

  const [editStandards, setEditStandards] = useState<any[]>([]);
  const [editSections, setEditSections] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    mobileNumber: "",
    password: "",
    rollNumber: "",
  });

  const [toast, setToast] = useState<any>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    loadSchools();
    loadStudents();
  }, []);

  const loadSchools = async () => {
    const data = await getSchools();
    setSchools(data);
  };

  const loadStandards = async (id: string) => {
    const data = await getStandards(id);
    setStandards(data);
  };

  const loadSections = async (id: string) => {
    const data = await getSections(id);
    setSections(data);
  };

  const loadStudents = async () => {
    const res = await getStudents({ page: 1, limit: 50 });
    setStudents(res.students);
  };

  const handleSubmit = async () => {
    try {
      if (!selectedSection) {
        return showToast("error", "Select section");
      }

      const payload = {
        ...form,
        rollNumber: Number(form.rollNumber),
        sectionId: selectedSection,
      };

      if (editId) {
        await updateStudent(editId, payload);
        showToast("success", "Student updated");
      } else {
        await createStudent(payload);
        showToast("success", "Student created");
      }

      setForm({
        firstName: "",
        lastName: "",
        mobileNumber: "",
        password: "",
        rollNumber: "",
      })
      
      loadStudents();
      setEditModalOpen(false);
    } catch (err: any) {
      showToast("error", err.response?.data?.message || "Error");
    }
  };

  const handleEdit = async (s: any) => {
    setEditModalOpen(true);
    setEditId(s.id);

    setForm({
        firstName: s.user.firstName,
        lastName: s.user.lastName,
        mobileNumber: s.user.mobileNumber,
        password: "",
        rollNumber: s.rollNumber,
    });


    const sch = s.section?.standard?.school;
    const std = s.section?.standard;
    const sec = s.section;

    if (sch) {
        setEditSchool(sch.id);
        const stds = await getStandards(sch.id);
        setEditStandards(stds);
    }

    if (std) {
        setEditStandard(std.id);
        const secs = await getSections(std.id);
        setEditSections(secs);
    }

    if (sec) {
        setEditSection(sec.id);
    }
};

  const handleDelete = async (id: string) => {
    try {
      await deleteStudent(id);
      setStudents((prev) => prev.filter((s) => s.id !== id));
      showToast("success", "Deleted");
    } catch (err: any) {
      showToast("error", err.response?.data?.message || "Delete failed");
    }
  };

  const filtered = filterSchool
    ? students.filter(
        (s) =>
          s.section?.standard?.school?.id === filterSchool
      )
    : students;

  return (
    <div className="space-y-6">

      {/* TOAST */}
      {toast && (
        <div className="fixed top-5 right-5 z-50">
          <div
            className={`px-4 py-2 rounded-lg text-white ${
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
        <h2 className="font-semibold mb-5">Student Registration</h2>

        <div className="grid grid-cols-2 gap-5">

          <div>
            <label className="label">First Name</label>
            <input className="input" value={form.firstName}
              onChange={(e)=>setForm({...form,firstName:e.target.value})}/>
          </div>

          <div>
            <label className="label">Last Name</label>
            <input className="input" value={form.lastName}
              onChange={(e)=>setForm({...form,lastName:e.target.value})}/>
          </div>

          <div>
            <label className="label">Mobile</label>
            <input className="input" value={form.mobileNumber}
              onChange={(e)=>setForm({...form,mobileNumber:e.target.value})}/>
          </div>

          <div>
            <label className="label">Password</label>
            <input type="password" className="input"
              value={form.password}
              onChange={(e)=>setForm({...form,password:e.target.value})}/>
          </div>

          <div>
            <label className="label">Roll Number</label>
            <input className="input"
              value={form.rollNumber}
              onChange={(e)=>setForm({...form,rollNumber:e.target.value})}/>
          </div>

          <div>
            <label className="label">School</label>
            <select className="input"
              value={selectedSchool}
              onChange={(e)=>{
                setSelectedSchool(e.target.value);
                loadStandards(e.target.value);
              }}>
              <option value="">Select School</option>
              {schools.map(s=>(
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Standard</label>
            <select className="input"
              value={selectedStandard}
              onChange={(e)=>{
                setSelectedStandard(e.target.value);
                loadSections(e.target.value);
              }}>
              <option value="">Select Standard</option>
              {standards.map(s=>(
                <option key={s.id} value={s.id}>
                  Standard {s.value}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Section</label>
            <select className="input"
              value={selectedSection}
              onChange={(e)=>setSelectedSection(e.target.value)}>
              <option value="">Select Section</option>
              {sections.map(sec=>(
                <option key={sec.id} value={sec.id}>
                  {sec.name}
                </option>
              ))}
            </select>
          </div>

        </div>

        <div className="flex justify-end mt-6">
          <button onClick={handleSubmit}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg">
            {editId ? "Update Student" : "Register Student"}
          </button>
        </div>
      </div>

      {/* FILTER */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
        <select className="input w-[300px]"
          value={filterSchool}
          onChange={(e)=>setFilterSchool(e.target.value)}>
          <option value="">All Schools</option>
          {schools.map(s=>(
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
        <h2 className="font-semibold mb-4">Students</h2>

        <table className="w-full text-sm border-collapse">
        <thead>
            <tr className="text-left border-b bg-gray-50">
            <th className="py-3 px-2">Name</th>
            <th className="py-3 px-2">Code</th>
            <th className="py-3 px-2">Mobile</th>
            <th className="py-3 px-2">School</th>
            <th className="py-3 px-2">Std</th>
            <th className="py-3 px-2">Section</th>
            <th className="py-3 px-2">Roll</th>
            <th className="py-3 px-2">Face</th>
            <th className="py-3 px-2 text-right">Actions</th>
            </tr>
        </thead>

        <tbody>
            {filtered.map((s) => (
            <tr key={s.id} className="border-b hover:bg-gray-50">
                <td className="py-2 px-2 font-medium">
                {s.user.firstName} {s.user.lastName}
                </td>

                <td className="px-2">{s.user.userCode}</td>
                <td className="px-2">{s.user.mobileNumber}</td>

                <td className="px-2">
                {s.section?.standard?.school?.name || "-"}
                </td>

                <td className="px-2">
                Std {s.section?.standard?.value || "-"}
                </td>

                <td className="px-2">
                {s.section?.name || "-"}
                </td>

                <td className="px-2">{s.rollNumber}</td>

                <td className="px-2">
                <span
                    className={`text-xs px-2 py-1 rounded font-medium
                        ${
                        s.faceStatus === "ADDED"
                            ? "bg-green-100 text-green-700"
                            : s.faceStatus === "NOT_ADDED"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }
                    `}
                    >
                    {s.faceStatus}
                </span>
                </td>

                <td className="px-2 text-right flex justify-end gap-3">
                <Pencil size={16} onClick={() => handleEdit(s)} className="text-blue-600 cursor-pointer hover:scale-110 transition" />
                <Trash2 size={16} onClick={() => {
                    setDeleteId(s.id);
                    setDeleteModalOpen(true);
                }} 
                className="text-red-600 cursor-pointer hover:scale-110 transition"
                />

                </td>
            </tr>
            ))}
        </tbody>
        </table>
      </div>


    {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-[350px]">
            <h3 className="font-semibold mb-3">Delete Student?</h3>

            <div className="flex justify-end gap-3 mt-5">
                <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 border rounded-lg"
                >
                Cancel
                </button>

                <button
                onClick={async () => {
                    try {
                    await deleteStudent(deleteId!);
                    setStudents((prev) =>
                        prev.filter((s) => s.id !== deleteId)
                    );
                    showToast("success", "Deleted");
                    setDeleteModalOpen(false);
                    } catch (err: any) {
                    showToast("error", "Delete failed");
                    }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg"
                >
                Delete
                </button>
            </div>
            </div>
        </div>
    )}


    {editModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-[600px] relative">

            <X
                className="absolute top-4 right-4 cursor-pointer"
                onClick={() => setEditModalOpen(false)}
            />

            <h2 className="font-semibold mb-5">Edit Student</h2>

            <div className="grid grid-cols-2 gap-5">

                <input className="input"
                value={form.firstName}
                onChange={(e)=>setForm({...form,firstName:e.target.value})}
                placeholder="First Name"/>

                <input className="input"
                value={form.lastName}
                onChange={(e)=>setForm({...form,lastName:e.target.value})}
                placeholder="Last Name"/>

                <input className="input"
                value={form.mobileNumber}
                onChange={(e)=>setForm({...form,mobileNumber:e.target.value})}
                placeholder="Mobile"/>

                <input type="password" className="input"
                value={form.password}
                onChange={(e)=>setForm({...form,password:e.target.value})}
                placeholder="Password"/>

                <input className="input"
                value={form.rollNumber}
                onChange={(e)=>setForm({...form,rollNumber:e.target.value})}
                placeholder="Roll Number"/>

                {/* SCHOOL */}
                <select className="input"
                value={editSchool}
                onChange={async (e)=>{
                    setEditSchool(e.target.value);
                    const stds = await getStandards(e.target.value);
                    setEditStandards(stds);
                    setEditStandard("");
                    setEditSection("");
                }}>
                <option value="">Select School</option>
                {schools.map(s=>(
                    <option key={s.id} value={s.id}>{s.name}</option>
                ))}
                </select>

                {/* STANDARD */}
                <select className="input"
                value={editStandard}
                onChange={async (e)=>{
                    setEditStandard(e.target.value);
                    const secs = await getSections(e.target.value);
                    setEditSections(secs);
                    setEditSection("");
                }}>
                <option value="">Select Standard</option>
                {editStandards.map(s=>(
                    <option key={s.id} value={s.id}>
                    Std {s.value}
                    </option>
                ))}
                </select>

                {/* SECTION */}
                <select className="input"
                value={editSection}
                onChange={(e)=>setEditSection(e.target.value)}>
                <option value="">Select Section</option>
                {editSections.map(s=>(
                    <option key={s.id} value={s.id}>
                    {s.name}
                    </option>
                ))}
                </select>

            </div>

            <div className="flex justify-end gap-3 mt-6">
                <button
                onClick={()=>setEditModalOpen(false)}
                className="px-4 py-2 border rounded-lg"
                >
                Cancel
                </button>

                <button
                onClick={async ()=>{
                    try {
                    await updateStudent(editId!, {
                        ...form,
                        rollNumber: Number(form.rollNumber),
                        sectionId: editSection,
                    });

                    showToast("success","Updated");
                    setEditModalOpen(false);
                    loadStudents();

                    } catch (err:any) {
                    showToast("error","Update failed");
                    }
                }}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg"
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