import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link2, BookOpen, FileText, Plus, Trash2, Search, Upload, X, ExternalLink, Copy, Check } from "lucide-react";
import { Student, StudentResource, ResourceType } from "../types";
import { getStudentResources, saveStudentResource, deleteStudentResource } from "../lib/db";

interface ResourceVaultProps {
  activeStudent: Student;
  allStudents: Student[];
}

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

function ResourceTypeIcon({ type }: { type: ResourceType }) {
  if (type === "link") return <Link2 className="w-5 h-5 text-indigo-500" />;
  if (type === "isbn") return <BookOpen className="w-5 h-5 text-amber-500" />;
  return <FileText className="w-5 h-5 text-emerald-500" />;
}

function typeBadge(type: ResourceType) {
  if (type === "link") return "bg-indigo-50 text-indigo-700 border-indigo-100";
  if (type === "isbn") return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-emerald-50 text-emerald-700 border-emerald-100";
}

function typeLabel(type: ResourceType) {
  if (type === "link") return "Web Link";
  if (type === "isbn") return "Book (ISBN)";
  return "File / PDF";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ResourceVault({ activeStudent, allStudents }: ResourceVaultProps) {
  const [resources, setResources] = useState<StudentResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<ResourceType | "all">("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add form state
  const [addType, setAddType] = useState<ResourceType>("link");
  const [addTitle, setAddTitle] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [addIsbn, setAddIsbn] = useState("");
  const [addFile, setAddFile] = useState<{ name: string; data: string; size: number } | null>(null);
  const [fileSizeWarning, setFileSizeWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadResources = async () => {
    setLoading(true);
    const list = await getStudentResources(activeStudent.id);
    setResources(list);
    setLoading(false);
  };

  useEffect(() => {
    loadResources();
  }, [activeStudent.id]);

  const filtered = resources.filter((r) => {
    if (filterType !== "all" && r.type !== filterType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        (r.isbn ?? "").toLowerCase().includes(q) ||
        (r.url ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleFileChange = (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      setFileSizeWarning(true);
      setAddFile(null);
      return;
    }
    setFileSizeWarning(false);
    const reader = new FileReader();
    reader.onload = (e) => {
      setAddFile({ name: file.name, data: e.target!.result as string, size: file.size });
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setAddType("link");
    setAddTitle("");
    setAddDesc("");
    setAddUrl("");
    setAddIsbn("");
    setAddFile(null);
    setFileSizeWarning(false);
    setShowAddForm(false);
  };

  const handleSubmit = async () => {
    if (!addTitle.trim()) return;
    setSubmitting(true);

    const resource: StudentResource = {
      id: `res_${Date.now()}`,
      studentId: activeStudent.id,
      type: addType,
      title: addTitle.trim(),
      description: addDesc.trim() || undefined,
      url: addType === "link" ? addUrl.trim() || undefined : undefined,
      isbn: addType === "isbn" ? addIsbn.trim() || undefined : undefined,
      fileData: addType === "file" ? (addFile?.data ?? undefined) : undefined,
      fileName: addType === "file" ? (addFile?.name ?? undefined) : undefined,
      fileSize: addType === "file" ? (addFile?.size ?? undefined) : undefined,
      createdAt: Date.now(),
    };

    await saveStudentResource(resource);
    await loadResources();
    setSubmitting(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this resource from the vault?")) return;
    await deleteStudentResource(id);
    setResources((prev) => prev.filter((r) => r.id !== id));
  };

  const handleCopyToStudent = async (resource: StudentResource, targetStudentId: string) => {
    const copy: StudentResource = {
      ...resource,
      id: `res_${Date.now()}`,
      studentId: targetStudentId,
      createdAt: Date.now(),
    };
    await saveStudentResource(copy);
    setCopiedId(resource.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-gray-900 text-base md:text-lg">
                Curriculum Resource Vault
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {activeStudent.name} — links, books, and reference files
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition active:scale-95"
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddForm ? "Cancel" : "Add Resource"}
          </button>
        </div>

        {/* Add form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-slate-50 border border-gray-100 rounded-2xl p-5 space-y-4 mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">New Resource</h4>

                {/* Type selector */}
                <div className="flex gap-2">
                  {(["link", "isbn", "file"] as ResourceType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAddType(t)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                        addType === t
                          ? typeBadge(t) + " border"
                          : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      <ResourceTypeIcon type={t} />
                      {typeLabel(t)}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-3xs uppercase tracking-wider font-bold text-gray-400 block mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={addTitle}
                      onChange={(e) => setAddTitle(e.target.value)}
                      placeholder="e.g. Khan Academy Fractions"
                      className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:border-indigo-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-3xs uppercase tracking-wider font-bold text-gray-400 block mb-1">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      value={addDesc}
                      onChange={(e) => setAddDesc(e.target.value)}
                      placeholder="Brief note about this resource"
                      className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:border-indigo-400 outline-none"
                    />
                  </div>
                </div>

                {addType === "link" && (
                  <div>
                    <label className="text-3xs uppercase tracking-wider font-bold text-gray-400 block mb-1">URL</label>
                    <input
                      type="url"
                      value={addUrl}
                      onChange={(e) => setAddUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:border-indigo-400 outline-none font-mono"
                    />
                  </div>
                )}

                {addType === "isbn" && (
                  <div>
                    <label className="text-3xs uppercase tracking-wider font-bold text-gray-400 block mb-1">ISBN</label>
                    <input
                      type="text"
                      value={addIsbn}
                      onChange={(e) => setAddIsbn(e.target.value)}
                      placeholder="e.g. 978-0-06-112008-4"
                      className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:border-indigo-400 outline-none font-mono"
                    />
                  </div>
                )}

                {addType === "file" && (
                  <div>
                    <label className="text-3xs uppercase tracking-wider font-bold text-gray-400 block mb-1">
                      File (PDF or image, max 2 MB)
                    </label>
                    <div
                      className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-300 transition"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const f = e.dataTransfer.files[0];
                        if (f) handleFileChange(f);
                      }}
                    >
                      <Upload className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                      {addFile ? (
                        <p className="text-xs text-emerald-600 font-bold">{addFile.name} ({formatBytes(addFile.size)})</p>
                      ) : (
                        <p className="text-xs text-gray-400">Drag & drop or click to browse</p>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileChange(f);
                        }}
                      />
                    </div>
                    {fileSizeWarning && (
                      <p className="text-xs text-red-600 mt-1">File exceeds 2 MB limit. Please choose a smaller file.</p>
                    )}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={
                    submitting ||
                    !addTitle.trim() ||
                    (addType === "file" && !addFile)
                  }
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-100 disabled:text-gray-400 text-white text-xs font-bold rounded-xl transition active:scale-95"
                >
                  {submitting ? "Saving..." : "Save to Vault"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search + Filter */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 relative min-w-48">
            <Search className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search resources..."
              className="w-full text-xs border border-gray-200 rounded-xl pl-9 pr-3 py-2 focus:border-indigo-400 outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {(["all", "link", "isbn", "file"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  filterType === t
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                }`}
              >
                {t === "all" ? "All" : typeLabel(t as ResourceType)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Resource grid */}
      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Loading vault...</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center bg-white border border-dashed border-gray-200 rounded-2xl">
          <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-500">
            {resources.length === 0 ? "Vault is empty" : "No results match your search"}
          </p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
            {resources.length === 0
              ? "Add links, book ISBNs, or upload PDFs and worksheets to build an evidence portfolio."
              : "Try a different keyword or filter."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence initial={false}>
            {filtered.map((resource) => (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs hover:shadow-sm hover:border-gray-200 transition flex flex-col gap-3"
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-2 rounded-xl shrink-0 border ${typeBadge(resource.type)}`}>
                      <ResourceTypeIcon type={resource.type} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate leading-tight">
                        {resource.title}
                      </p>
                      <span className={`text-3xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${typeBadge(resource.type)}`}>
                        {typeLabel(resource.type)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(resource.id)}
                    className="shrink-0 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Description */}
                {resource.description && (
                  <p className="text-xs text-gray-500 leading-relaxed">{resource.description}</p>
                )}

                {/* Type-specific details */}
                {resource.type === "link" && resource.url && (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium truncate"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{resource.url}</span>
                  </a>
                )}

                {resource.type === "isbn" && resource.isbn && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1 font-mono">
                    <BookOpen className="w-3.5 h-3.5 shrink-0" />
                    ISBN: {resource.isbn}
                  </div>
                )}

                {resource.type === "file" && resource.fileName && (
                  <div className="flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1">
                    <span className="flex items-center gap-1.5 truncate font-medium">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{resource.fileName}</span>
                    </span>
                    {resource.fileSize && (
                      <span className="text-3xs text-emerald-500 shrink-0 ml-1 font-mono">
                        {formatBytes(resource.fileSize)}
                      </span>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
                  <span className="text-3xs text-gray-400 font-sans">
                    {new Date(resource.createdAt).toLocaleDateString()}
                  </span>
                  {/* Copy to another student */}
                  {allStudents.filter((s) => s.id !== activeStudent.id).length > 0 && (
                    <div className="relative group">
                      <button className="flex items-center gap-1 text-3xs text-gray-400 hover:text-indigo-600 font-bold transition">
                        {copiedId === resource.id ? (
                          <><Check className="w-3 h-3 text-emerald-500" /> Copied!</>
                        ) : (
                          <><Copy className="w-3 h-3" /> Copy to...</>
                        )}
                      </button>
                      <div className="absolute bottom-full right-0 mb-1 bg-slate-900 text-white rounded-xl py-1 w-40 hidden group-hover:block z-20 shadow-xl">
                        {allStudents
                          .filter((s) => s.id !== activeStudent.id)
                          .map((s) => (
                            <button
                              key={s.id}
                              onClick={() => handleCopyToStudent(resource, s.id)}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-800 truncate"
                            >
                              {s.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
