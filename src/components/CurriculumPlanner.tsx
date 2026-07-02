import { useState, useEffect } from "react";
import { Student, StudentSubjectState } from "../types";
import { getStudentSubjectState, updateStudentSubjectState } from "../lib/db";
import { 
  Play, 
  BrainCircuit, 
  BookOpen, 
  RefreshCw, 
  History, 
  ShieldAlert, 
  Settings, 
  Sparkles 
} from "lucide-react";

interface CurriculumPlannerProps {
  activeStudent: Student;
  onLaunchLesson: (subject: string, topic: string, type: 'standard' | 'remedial' | 'advanced') => void;
  isLoadingLesson: boolean;
}

const SUBJECTS_LIST = [
  { id: "math", name: "Mathematics", icon: "📐", color: "from-blue-500 to-indigo-600", defaultTopic: "Introduction to Fractions" },
  { id: "science", name: "Science & Nature", icon: "🧪", color: "from-emerald-500 to-teal-600", defaultTopic: "The Water Cycle" },
  { id: "history", name: "Social Studies & History", icon: "🏛️", color: "from-amber-500 to-orange-600", defaultTopic: "Ancient Egypt Civilizations" },
  { id: "english", name: "Language Arts & English", icon: "✍️", color: "from-rose-500 to-pink-600", defaultTopic: "Understanding Parts of Speech" }
];

export default function CurriculumPlanner({
  activeStudent,
  onLaunchLesson,
  isLoadingLesson
}: CurriculumPlannerProps) {
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS_LIST[0]);
  const [subjectState, setSubjectState] = useState<StudentSubjectState | null>(null);
  const [loading, setLoading] = useState(false);
  const [useCustomTopic, setUseCustomTopic] = useState(false);
  const [customTopic, setCustomTopic] = useState("");
  const [selectedType, setSelectedType] = useState<'standard' | 'remedial' | 'advanced'>("standard");
  const [adaptationReasoning, setAdaptationReasoning] = useState<string>("");

  // Load subject state whenever active student or selected subject changes
  const loadState = async () => {
    setLoading(true);
    try {
      const state = await getStudentSubjectState(activeStudent.id, selectedSubject.id);
      setSubjectState(state);
      setCustomTopic(state.currentTopic);
      
      // Determine recommended assessment type
      if (state.needsRemediation) {
        setSelectedType("remedial");
        setAdaptationReasoning(
          `${activeStudent.name} is on a remedial path to reinforce foundational structures. We simplified the terminology and paced the steps slower to aid assimilation.`
        );
      } else if (state.masteryLevel >= 85) {
        setSelectedType("advanced");
        setAdaptationReasoning(
          `${activeStudent.name} showed exceptional mastery (rating ${state.masteryLevel}%). Standard topics were elevated to advanced challenge levels.`
        );
      } else {
        setSelectedType("standard");
        setAdaptationReasoning(
          `Standard curriculum path. Paced naturally at the student's standard academic grade level (${activeStudent.gradeLevel}).`
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadState();
  }, [activeStudent.id, selectedSubject.id]);

  const handleLaunch = () => {
    const topicToLaunch = useCustomTopic ? customTopic.trim() : (subjectState?.currentTopic || selectedSubject.defaultTopic);
    if (!topicToLaunch) return;
    onLaunchLesson(selectedSubject.name, topicToLaunch, selectedType);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="curriculum-planner-module">
      {/* Search/Filter Rails */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Subjects & Mastery</h3>
        <div className="flex flex-col gap-3">
          {SUBJECTS_LIST.map((subj) => {
            const isSel = selectedSubject.id === subj.id;
            return (
              <button
                key={subj.id}
                onClick={() => setSelectedSubject(subj)}
                className={`w-full flex items-center justify-between p-4 rounded-xl text-left border transition-all duration-150 ${
                  isSel
                    ? "bg-white border-indigo-600 shadow-sm ring-1 ring-indigo-100"
                    : "bg-white/60 border-gray-100 hover:border-gray-200 hover:bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{subj.icon}</span>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{subj.name}</h4>
                    <p className="text-2xs text-gray-400 mt-0.5">Homeschooling Syllabus</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Workspace Panel */}
      <div className="lg:col-span-8 bg-white border border-gray-100 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4 mb-6">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-md mb-2">
                <BrainCircuit className="w-3.5 h-3.5" />
                <span>Adaptive Recommendation Engine</span>
              </span>
              <h2 className="text-xl font-display font-bold text-gray-900">
                {selectedSubject.name} Curriculum Hub
              </h2>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Subject Mastery:</span>
              <div className="flex items-center gap-1.5">
                <div className="w-16 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 rounded-full" 
                    style={{ width: `${subjectState?.masteryLevel || 0}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-800">
                  {subjectState?.masteryLevel || 0}%
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-500" />
              <span>Analyzing student profile & logs...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Intelligent Adaptations Panel */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900">Adaptive Lesson Suggestion</h4>
                      <p className="text-xs text-slate-500 mt-0.5 font-sans">
                        Generated by AI rules based on {activeStudent.name}'s latest logs:
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-3xs font-bold uppercase tracking-wider ${
                    selectedType === 'remedial' 
                      ? "bg-amber-100 text-amber-800 border border-amber-200" 
                      : selectedType === 'advanced' 
                        ? "bg-purple-100 text-purple-800 border border-purple-200"
                        : "bg-indigo-100 text-indigo-800 border border-indigo-200"
                  }`}>
                    {selectedType} level
                  </span>
                </div>

                <div className="bg-white border border-slate-200/60 rounded-lg p-3">
                  <span className="block text-2xs font-semibold text-indigo-600 tracking-wider uppercase mb-1">
                    Recommended Concept Title
                  </span>
                  <div className="text-base font-bold text-gray-900">
                    {subjectState?.currentTopic || selectedSubject.defaultTopic}
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-gray-600 italic pl-1 border-l-2 border-indigo-500/40">
                  "{adaptationReasoning}"
                </p>
              </div>

              {/* Advanced Controls & Adjustments */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setUseCustomTopic(!useCustomTopic)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>{useCustomTopic ? "Use Recommendations" : "Manually Adjust Topic & Tier"}</span>
                </button>

                {useCustomTopic && (
                  <div className="p-4 border border-dashed border-gray-200 rounded-xl bg-gray-50/50 space-y-4 animate-slideDown">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Custom Focus Topic
                      </label>
                      <input
                        type="text"
                        value={customTopic}
                        onChange={(e) => setCustomTopic(e.target.value)}
                        placeholder="e.g. Solving Double Digit Equations"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Tier Level Override
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['remedial', 'standard', 'advanced'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setSelectedType(t)}
                            className={`py-2 text-xs font-medium rounded-lg capitalize border transition ${
                              selectedType === t
                                ? "bg-indigo-600 border-indigo-600 text-white"
                                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Topic History */}
              {subjectState && subjectState.history.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <History className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Unit History Learned
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {subjectState.history.map((histTopic, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg border border-gray-100"
                      >
                        ✅ {histTopic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-xs text-gray-400 font-sans">
            AI uses customized pedagogical structures matching <span className="font-semibold text-gray-500">{activeStudent.gradeLevel}</span>
          </div>

          <button
            onClick={handleLaunch}
            disabled={isLoadingLesson || loading || (useCustomTopic && !customTopic.trim())}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-xl transition duration-150 shadow-sm"
            id="btn-launch-lesson"
          >
            {isLoadingLesson ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Structuring Lesson...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Activate Instructor Launchpad</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
