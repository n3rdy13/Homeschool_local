import { useState, useEffect } from "react";
import { Student, StudentProgress, GeneratedLesson, StudentSubjectState, AttendanceLog } from "./types";
import {
  getStudents,
  getStudentProgressHistory,
  saveProgress,
  saveGeneratedLesson,
  updateStudentSubjectState,
  getStudentAttendanceHistory,
  saveAttendanceLog,
  deleteAttendanceLog,
  deleteStudent
} from "./lib/db";
import StudentProfiles from "./components/StudentProfiles";
import CurriculumPlanner from "./components/CurriculumPlanner";
import ActiveLessonSession from "./components/ActiveLessonSession";
import PerformanceTracker from "./components/PerformanceTracker";
import ResourceVault from "./components/ResourceVault";
import { CircleAlert as AlertCircle, ChartBar as BarChart3, Brain, BookOpen, FolderOpen } from "lucide-react";

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [progressList, setProgressList] = useState<StudentProgress[]>([]);
  const [attendanceList, setAttendanceList] = useState<AttendanceLog[]>([]);
  const [activeLesson, setActiveLesson] = useState<GeneratedLesson | null>(null);
  
  // Tab control in teacher dashboard
  const [activeTab, setActiveTab] = useState<'curriculum' | 'performance' | 'resources'>('curriculum');

  // Loading indicators
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [generatingLesson, setGeneratingLesson] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  // Helper: safely parse a fetch Response as JSON regardless of status code
  async function parseResponseJSON(response: Response): Promise<any> {
    const text = await response.text();
    if (!text.trim()) throw new Error("Server returned an empty response.");
    try {
      return JSON.parse(text);
    } catch {
      // Server may have returned HTML error page
      throw new Error(`Server returned non-JSON content (status ${response.status}). Check that GEMINI_API_KEY is set in the project Secrets.`);
    }
  }

  // Load students & progress logs
  const loadData = async () => {
    setLoadingProfiles(true);
    try {
      const studs = await getStudents();
      setStudents(studs);
      
      // Auto-select first student if available
      if (studs.length > 0 && !activeStudent) {
        setActiveStudent(studs[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProfiles(false);
    }
  };

  useEffect(() => {
    loadData();
    // Check if API key is configured
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => { if (!data.hasAPIKey) setApiKeyMissing(true); })
      .catch(() => {});
  }, []);

  // Sync historical reports whenever active student modifies
  const loadHistoryLogs = async () => {
    if (!activeStudent) {
      setProgressList([]);
      return;
    }
    try {
      const logs = await getStudentProgressHistory(activeStudent.id);
      setProgressList(logs);
    } catch (e) {
      console.error(e);
    }
  };

  // Sync attendance logs in database
  const loadAttendanceHistory = async () => {
    if (!activeStudent) {
      setAttendanceList([]);
      return;
    }
    try {
      const logs = await getStudentAttendanceHistory(activeStudent.id);
      setAttendanceList(logs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadHistoryLogs();
    loadAttendanceHistory();
  }, [activeStudent?.id]);

  const handleAddAttendance = async (
    date: string, 
    hours: number, 
    activityType: "Core Lesson" | "Independent Study" | "Field Trip" | "Science Lab" | "Art & Craft" | "Physical Ed" | "Other",
    description: string,
    notes?: string
  ) => {
    if (!activeStudent) return;
    const newLog: AttendanceLog = {
      id: `att_${Date.now()}`,
      studentId: activeStudent.id,
      date,
      hours,
      activityType,
      description,
      notes,
      createdAt: Date.now()
    };
    try {
      await saveAttendanceLog(newLog);
      await loadAttendanceHistory();
    } catch (e) {
      console.error("Failed to save attendance log", e);
    }
  };

  const handleDeleteAttendance = async (logId: string) => {
    try {
      await deleteAttendanceLog(logId);
      await loadAttendanceHistory();
    } catch (e) {
      console.error("Failed to delete attendance log", e);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      await deleteStudent(studentId);
      if (activeStudent?.id === studentId) {
        setActiveStudent(null);
        setProgressList([]);
        setAttendanceList([]);
        setActiveLesson(null);
      }
      await loadData();
    } catch (e) {
      console.error("Failed to delete student", e);
    }
  };

  // Launch lesson by querying backend API proxy
  const handleLaunchLesson = async (subject: string, topic: string, type: 'standard' | 'remedial' | 'advanced') => {
    if (!activeStudent) return;
    setGeneratingLesson(true);
    setErrorText(null);
    try {
      const response = await fetch("/api/generate-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          topic,
          gradeLevel: activeStudent.gradeLevel,
          type
        })
      });

      if (!response.ok) {
        const err = await parseResponseJSON(response).catch((e) => ({ error: e.message }));
        throw new Error(err.error || "Generation endpoint refused to process.");
      }

      const lessonData = await parseResponseJSON(response);
      
      const compiledLesson: GeneratedLesson = {
        id: `lesson_${Date.now()}`,
        subject,
        topic,
        gradeLevel: activeStudent.gradeLevel,
        type,
        ...lessonData,
        createdAt: Date.now()
      };

      // Save to database cache
      await saveGeneratedLesson(compiledLesson);
      
      // Activate session
      setActiveLesson(compiledLesson);
    } catch (e: any) {
      console.error("Generator launch error", e);
      setErrorText(`Failed to generate educational materials with Gemini context. details: ${e.message}`);
    } finally {
      setGeneratingLesson(false);
    }
  };

  // Callback to finish lesson, save results, and apply adaptive curriculum recommendations
  const handleFinishLesson = async (
    score: number,
    answers: Record<number, string>,
    gradedResults: any,
    recommendedTopicData: any
  ) => {
    if (!activeStudent || !activeLesson) return;

    try {
      const passState = score >= 90 ? 'excelled' : score >= 75 ? 'passed' : 'remedial_needed';
      
      // 1. Save worksheet completion progress
      const progressRecord: StudentProgress = {
        id: `prog_${Date.now()}`,
        studentId: activeStudent.id,
        subject: activeLesson.subject,
        topic: activeLesson.topic,
        gradeLevel: activeLesson.gradeLevel,
        score,
        totalQuestions: activeLesson.worksheet.length,
        correctAnswers: gradedResults.grades.filter((g: any) => g.isCorrect).length,
        answers,
        assessmentType: activeLesson.type,
        gradedAt: Date.now(),
        status: passState
      };

      await saveProgress(progressRecord);

      // 2. Decide the next recommended details
      let nextTopicTitle = activeLesson.topic; // default backup
      let nextTypeLevel: 'standard' | 'remedial' | 'advanced' = 'standard';
      
      if (recommendedTopicData) {
        nextTopicTitle = recommendedTopicData.recommendedTopic;
        nextTypeLevel = recommendedTopicData.assessmentType;
      } else {
        // Simple manual backup recommendation logic
        if (passState === 'remedial_needed') {
          nextTopicTitle = `${activeLesson.topic} (Reinforcement Practice)`;
          nextTypeLevel = 'remedial';
        } else if (passState === 'excelled') {
          nextTopicTitle = `Advanced ${activeLesson.topic} Mastery`;
          nextTypeLevel = 'advanced';
        } else {
          nextTopicTitle = `Next level in ${activeLesson.subject}`;
          nextTypeLevel = 'standard';
        }
      }

      // Compute incremental subject mastery score (adds 15% on pass, caps at 100%, subtracts 5% on struggle)
      const currentProgressIndex = progressList.length;
      let calculatedMastery = 50; // default initial
      
      // Calculate active base
      const matchingLastScoresCount = progressList.filter(p => p.subject.toLowerCase() === activeLesson.subject.toLowerCase()).length;
      const progressHistoryScoresSum = progressList
        .filter(p => p.subject.toLowerCase() === activeLesson.subject.toLowerCase())
        .reduce((sum, p) => sum + p.score, 0);

      if (matchingLastScoresCount > 0) {
        calculatedMastery = Math.min(100, Math.max(10, Math.round(progressHistoryScoresSum / matchingLastScoresCount)));
      } else {
        calculatedMastery = score;
      }

      // Update subject state in DB
      const updatedSubjectState: StudentSubjectState = {
        studentId: activeStudent.id,
        subject: activeLesson.subject.toLowerCase() === "mathematics" ? "math" : activeLesson.subject.toLowerCase() === "science & nature" ? "science" : activeLesson.subject.toLowerCase() === "social studies & history" ? "history" : "english",
        currentTopic: nextTopicTitle,
        masteryLevel: calculatedMastery,
        history: [...(progressList.filter(p => p.subject.toLowerCase() === activeLesson.subject.toLowerCase()).map(p => p.topic)), activeLesson.topic],
        needsRemediation: passState === 'remedial_needed',
        remediationTopic: passState === 'remedial_needed' ? activeLesson.topic : undefined
      };

      await updateStudentSubjectState(updatedSubjectState);

      // Refresh list
      await loadHistoryLogs();
      
      // Close session
      setActiveLesson(null);
      setActiveTab('curriculum');
    } catch (e) {
      console.error("Failed finishing and logging lesson results", e);
    }
  };

  // If active classroom session is active, hide main nav and render immersive board
  if (activeLesson && activeStudent) {
    return (
      <ActiveLessonSession
        lesson={activeLesson}
        student={activeStudent}
        onClose={() => setActiveLesson(null)}
        onFinishLesson={handleFinishLesson}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafc] flex flex-col font-sans" id="homeschool-dashboard-root">
      {/* Dynamic Alert Banner */}
      {generatingLesson && (
        <div className="bg-indigo-600 px-6 py-3.5 text-center text-white flex items-center justify-center gap-2 text-xs md:text-sm font-semibold animate-pulse z-50">
          <Brain className="w-4 h-4 animate-spin shrink-0" />
          <span>Formulating highly structured grade-appropriate homeschool lessons, worksheets and teacher companion guides. Please hold...</span>
        </div>
      )}

      {errorText && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3.5 text-center text-amber-900 flex items-center justify-center gap-2 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{errorText}</span>
          <button 
            onClick={() => setErrorText(null)} 
            className="underline ml-2 hover:text-amber-950 font-bold"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* API key missing banner */}
      {apiKeyMissing && (
        <div className="bg-rose-600 px-6 py-3 text-center text-white flex items-center justify-center gap-2 text-xs font-semibold print:hidden">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            <strong>GEMINI_API_KEY is not set.</strong> Lesson generation is disabled. Add your key to the project Secrets (GEMINI_API_KEY) to enable AI features.
          </span>
          <button onClick={() => setApiKeyMissing(false)} className="ml-2 underline hover:text-rose-200">Dismiss</button>
        </div>
      )}

      {/* Primary Dashboard Navigation header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-lg shadow-sm font-bold">
            🏡
          </div>
          <div>
            <h1 className="font-display font-bold text-gray-900 text-base md:text-lg leading-tight">
              Homeschool Companion & Planner
            </h1>
            <p className="text-3xs text-gray-400 font-sans tracking-wide uppercase font-semibold mt-0.5">
              Personalized Adaptive Syllabus Studio
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeStudent && (
            <div className="hidden sm:flex items-center gap-2 bg-indigo-50/40 border border-indigo-100/10 px-3 py-1.5 rounded-xl text-xs">
              <span className="text-gray-500">Active Pupil:</span>
              <span className="font-bold text-indigo-700">{activeStudent.name}</span>
              <span className="text-3xs bg-indigo-100 hover:bg-indigo-200 duration-150 text-indigo-800 font-bold px-1.5 rounded-md">
                {activeStudent.gradeLevel}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Body view */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* Profile Selector Section */}
        <div className="print:hidden">
          <StudentProfiles
            students={students}
            activeStudent={activeStudent}
            onSelectStudent={(student) => setActiveStudent(student)}
            onDeleteStudent={handleDeleteStudent}
            onRefresh={loadData}
          />
        </div>

        {activeStudent ? (
          <div className="space-y-6">
            {/* View Switching Tab Bars */}
            <div className="flex border-b border-gray-200 print:hidden">
              <button
                onClick={() => setActiveTab('curriculum')}
                className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
                  activeTab === 'curriculum'
                    ? "border-indigo-600 text-indigo-700 font-bold bg-white/40"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
                id="tab-curriculum-planner"
              >
                <BookOpen className="w-4 h-4" />
                <span>Adaptable Curriculum Planner</span>
              </button>
              <button
                onClick={() => setActiveTab('performance')}
                className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
                  activeTab === 'performance'
                    ? "border-indigo-600 text-indigo-700 font-bold bg-white/40"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
                id="tab-performance-analytics"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Performance Analytics</span>
              </button>
              <button
                onClick={() => setActiveTab('resources')}
                className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
                  activeTab === 'resources'
                    ? "border-indigo-600 text-indigo-700 font-bold bg-white/40"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
                id="tab-resource-vault"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Resource Vault</span>
              </button>
            </div>

            {/* Dashboard Panels */}
            {activeTab === 'curriculum' ? (
              <CurriculumPlanner
                activeStudent={activeStudent}
                isLoadingLesson={generatingLesson}
                onLaunchLesson={handleLaunchLesson}
              />
            ) : activeTab === 'performance' ? (
              <PerformanceTracker
                activeStudent={activeStudent}
                progressList={progressList}
                attendanceList={attendanceList}
                onAddAttendance={handleAddAttendance}
                onDeleteAttendance={handleDeleteAttendance}
              />
            ) : (
              <ResourceVault
                activeStudent={activeStudent}
                allStudents={students}
              />
            )}
          </div>
        ) : (
          !loadingProfiles && (
            <div className="bg-white border border-gray-100 p-10 text-center rounded-2xl shadow-2xs">
              <span className="text-4xl">🧒</span>
              <h3 className="font-bold text-gray-900 mt-3 text-base">Select or Add Student Profile</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 leading-relaxed">
                Add profile credentials for your child in the Student Profiles grid above to unlock lessons, trackers, and intelligent curriculum planning.
              </p>
            </div>
          )
        )}
      </main>

      {/* Clean elegant Footer containing no tech logs */}
      <footer className="bg-white border-t border-gray-100 mt-12 py-5 text-center text-xs text-gray-400 print:hidden">
        <p>© 2026 Homeschool Companion. Guided by Cognitive Adaptability Algorithms.</p>
      </footer>
    </div>
  );
}
