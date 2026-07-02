import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Student } from "../types";
import { createStudent, deleteStudent } from "../lib/db";
import { Plus, User, BookOpen, ChevronRight, CircleUser as UserCircle, Trash2, TriangleAlert as AlertTriangle, X, GripVertical } from "lucide-react";

interface StudentProfilesProps {
  students: Student[];
  activeStudent: Student | null;
  onSelectStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => Promise<void>;
  onRefresh: () => void;
}

export default function StudentProfiles({
  students,
  activeStudent,
  onSelectStudent,
  onDeleteStudent,
  onRefresh,
}: StudentProfilesProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("Grade 5");
  const [loading, setLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Resizable panel: null = auto, otherwise explicit px height
  const [panelHeight, setPanelHeight] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  const gradeLevels = Array.from({ length: 10 }, (_, i) => `Grade ${i + 3}`);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const newStudent = await createStudent(name.trim(), gradeLevel);
      setName("");
      setShowAddForm(false);
      onRefresh();
      onSelectStudent(newStudent);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await onDeleteStudent(confirmDeleteId);
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  const studentToDelete = students.find((s) => s.id === confirmDeleteId);

  // Resize drag handler
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = panelHeight ?? (document.getElementById("student-profiles-panel")?.offsetHeight ?? 320);
    setIsResizing(true);

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientY - startY;
      setPanelHeight(Math.max(180, startH + delta));
    };
    const onUp = () => {
      setIsResizing(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <>
      {/* Delete confirmation modal */}
      <AnimatePresence>
        {confirmDeleteId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => !deleting && setConfirmDeleteId(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-gray-900 text-base">Delete Profile?</h3>
                      <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    disabled={deleting}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mb-5">
                  Permanently delete <span className="font-bold text-gray-900">{studentToDelete?.name}</span>'s profile, all lesson history, attendance records, and subject progress data?
                </p>

                <div className="flex gap-2.5">
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    disabled={deleting}
                    className="flex-1 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={deleting}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete Profile
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main panel */}
      <div
        id="student-profiles-panel"
        className={`bg-white border border-gray-100 rounded-2xl shadow-xs flex flex-col overflow-hidden select-none ${isResizing ? "cursor-ns-resize" : ""}`}
        style={panelHeight ? { height: panelHeight } : undefined}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 pt-5 pb-4 shrink-0">
          <div>
            <h2 className="text-xl font-display font-bold text-gray-900">Student Profiles</h2>
            <p className="text-sm text-gray-500">Select or manage active children profiles</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition duration-150 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Profile</span>
          </button>
        </div>

        {/* Add form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden shrink-0 px-6"
            >
              <form onSubmit={handleSubmit} className="mb-4 p-4 bg-gray-50 border border-gray-100 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                      Child's Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Emily Richardson"
                      className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                      Grade / Academic Year
                    </label>
                    <select
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    >
                      {gradeLevels.map((lvl) => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3.5 py-1.5 border border-gray-200 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
                  >
                    {loading ? "Creating..." : "Save Profile"}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile grid — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0">
          {students.length === 0 ? (
            <div className="text-center py-10 px-4 border border-dashed border-gray-200 rounded-xl bg-gray-50">
              <UserCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium mb-1">No student profiles found</p>
              <p className="text-sm text-gray-400 max-w-xs mx-auto">
                Get started by adding a profile for your homeschool student to design adaptive plans.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {students.map((student) => {
                const isActive = activeStudent?.id === student.id;
                return (
                  <motion.div
                    key={student.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => onSelectStudent(student)}
                    className={`group relative p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                      isActive
                        ? "border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600"
                        : "border-gray-100 hover:border-gray-200 hover:bg-gray-50/50"
                    }`}
                  >
                    {/* Delete button — top right, appears on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(student.id);
                      }}
                      className="absolute top-2.5 right-2.5 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 text-gray-300 transition-all duration-150"
                      title="Delete profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-start justify-between pr-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg ${isActive ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"}`}>
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                            {student.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 font-medium">
                            <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                            <span>{student.gradeLevel}</span>
                          </div>
                        </div>
                      </div>
                      {isActive && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-indigo-100 text-indigo-800">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100/80 flex justify-between items-center text-xs text-gray-500">
                      <span>Joined {new Date(student.createdAt).toLocaleDateString()}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 translate-x-0 group-hover:translate-x-1 transition-all duration-200" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={startResize}
          className="shrink-0 flex items-center justify-center h-5 cursor-ns-resize hover:bg-gray-50 border-t border-gray-100 group transition"
          title="Drag to resize"
        >
          <GripVertical className="w-4 h-4 text-gray-300 group-hover:text-gray-400 rotate-90 transition" />
        </div>
      </div>
    </>
  );
}
