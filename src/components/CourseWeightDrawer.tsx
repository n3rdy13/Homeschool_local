import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Save, SlidersHorizontal, CircleAlert as AlertCircle, CircleCheck as CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Student, CourseWeightSettings, SubjectWeightConfig } from "../types";
import { getCourseWeightSettings, saveCourseWeightSettings } from "../lib/db";

interface CourseWeightDrawerProps {
  student: Student;
  open: boolean;
  onClose: () => void;
  onSaved: (settings: CourseWeightSettings) => void;
}

const DEFAULT_SUBJECTS = ["math", "science", "history", "english", "pe"];

const DEFAULT_CONFIG: SubjectWeightConfig = {
  creditHours: 1.0,
  testWeight: 50,
  quizWeight: 30,
  homeworkWeight: 20,
};

const SUBJECT_LABELS: Record<string, string> = {
  math: "Mathematics",
  science: "Science",
  history: "History / Social Studies",
  english: "English / Language Arts",
  pe: "Physical Education",
};

function WeightRow({
  subjectKey,
  label,
  config,
  onChange,
  onRemove,
  canRemove,
}: {
  subjectKey: string;
  label: string;
  config: SubjectWeightConfig;
  onChange: (key: string, updated: SubjectWeightConfig) => void;
  onRemove?: () => void;
  canRemove?: boolean;
}) {
  const total = config.testWeight + config.quizWeight + config.homeworkWeight;
  const valid = total === 100;

  const update = (field: keyof SubjectWeightConfig, value: number) => {
    onChange(subjectKey, { ...config, [field]: value });
  };

  return (
    <div className="bg-slate-50 border border-gray-100 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-gray-800">{label}</span>
          <div className="flex items-center gap-2 mt-1">
            <label className="text-3xs uppercase tracking-wider text-gray-400 font-sans font-bold">
              Credit Hours:
            </label>
            <select
              value={config.creditHours}
              onChange={(e) => update("creditHours", parseFloat(e.target.value))}
              className="text-xs font-bold bg-white border border-gray-200 rounded-lg px-2 py-0.5 text-indigo-700 focus:outline-none"
            >
              {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-black px-2 py-0.5 rounded-md font-mono ${
            valid
              ? "bg-emerald-50 border border-emerald-100 text-emerald-700"
              : "bg-amber-50 border border-amber-200 text-amber-700"
          }`}>
            {total}% {valid ? "✓" : "≠ 100"}
          </span>
          {canRemove && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(
          [
            { field: "testWeight", label: "Tests" },
            { field: "quizWeight", label: "Quizzes" },
            { field: "homeworkWeight", label: "Homework" },
          ] as { field: keyof SubjectWeightConfig; label: string }[]
        ).map(({ field, label: wLabel }) => (
          <div key={field} className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-3xs uppercase tracking-wider font-bold text-gray-400 font-sans">
                {wLabel}
              </label>
              <span className="text-3xs font-black text-indigo-600 font-mono">
                {config[field]}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={config[field] as number}
              onChange={(e) => update(field, parseInt(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CourseWeightDrawer({
  student,
  open,
  onClose,
  onSaved,
}: CourseWeightDrawerProps) {
  const [subjects, setSubjects] = useState<Record<string, SubjectWeightConfig>>({});
  const [customSubjectName, setCustomSubjectName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getCourseWeightSettings(student.id).then((existing) => {
      if (existing) {
        setSubjects(existing.subjects);
      } else {
        const defaults: Record<string, SubjectWeightConfig> = {};
        DEFAULT_SUBJECTS.forEach((s) => {
          defaults[s] = {
            ...DEFAULT_CONFIG,
            creditHours: s === "pe" ? 0.5 : 1.0,
          };
        });
        setSubjects(defaults);
      }
      setLoading(false);
    });
  }, [open, student.id]);

  const handleChange = (key: string, updated: SubjectWeightConfig) => {
    setSubjects((prev) => ({ ...prev, [key]: updated }));
  };

  const handleRemove = (key: string) => {
    setSubjects((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleAddCustom = () => {
    const key = customSubjectName.trim().toLowerCase().replace(/\s+/g, "_");
    if (!key || subjects[key]) return;
    setSubjects((prev) => ({ ...prev, [key]: { ...DEFAULT_CONFIG } }));
    setCustomSubjectName("");
  };

  const allValid = Object.values(subjects).every(
    (c) => c.testWeight + c.quizWeight + c.homeworkWeight === 100
  );

  const handleSave = async () => {
    if (!allValid) return;
    setSaving(true);
    const settings: CourseWeightSettings = {
      id: student.id,
      studentId: student.id,
      subjects,
      updatedAt: Date.now(),
    };
    await saveCourseWeightSettings(settings);
    setSaving(false);
    setSaved(true);
    onSaved(settings);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-gray-900 text-base">
                    Course Weight & Credit Hours
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">{student.name}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                Assign credit hours and grade weighting per subject. Weights for Tests, Quizzes, and Homework must sum to exactly 100% per subject.
              </p>

              {loading ? (
                <div className="py-12 text-center text-gray-400 text-sm">Loading settings...</div>
              ) : (
                <>
                  {Object.entries(subjects).map(([key, cfg]) => (
                    <WeightRow
                      key={key}
                      subjectKey={key}
                      label={SUBJECT_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      config={cfg}
                      onChange={handleChange}
                      onRemove={() => handleRemove(key)}
                      canRemove={!DEFAULT_SUBJECTS.includes(key)}
                    />
                  ))}

                  {/* Add custom subject */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Add custom subject (e.g. Music)"
                      value={customSubjectName}
                      onChange={(e) => setCustomSubjectName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
                      className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 focus:border-indigo-400 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustom}
                      disabled={!customSubjectName.trim()}
                      className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-bold rounded-xl transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 shrink-0">
              {!allValid && (
                <div className="flex items-center gap-2 mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  One or more subjects have weights that do not add up to 100%.
                </div>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !allValid || loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-bold rounded-xl transition active:scale-95"
              >
                {saved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Saved!
                  </>
                ) : saving ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Course Weight Settings
                  </>
                )}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
