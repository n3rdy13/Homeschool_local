import { useState, useEffect } from "react";
import { Student, StudentProgress, AttendanceLog, CourseWeightSettings } from "../types";
import { TrendingUp, BookOpen, CircleCheck as CheckCircle, Octagon as XOctagon, Calendar, Tag, Circle as HelpCircle, TriangleAlert as AlertTriangle, ChevronDown, ChevronUp, Award, ShieldCheck, Brain, Flame, Lock, Printer, Clock, UserCheck, FileDown, Plus, Minus, FileSpreadsheet, SlidersHorizontal, BookMarked } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getCourseWeightSettings } from "../lib/db";
import AnnualHeatmap from "./AnnualHeatmap";
import CourseWeightDrawer from "./CourseWeightDrawer";

interface PerformanceTrackerProps {
  activeStudent: Student;
  progressList: StudentProgress[];
  attendanceList?: AttendanceLog[];
  onAddAttendance?: (
    date: string,
    hours: number,
    activityType:
      | "Core Lesson"
      | "Independent Study"
      | "Field Trip"
      | "Science Lab"
      | "Art & Craft"
      | "Physical Ed"
      | "Other",
    description: string,
    notes?: string
  ) => Promise<void>;
  onDeleteAttendance?: (logId: string) => Promise<void>;
}

export default function PerformanceTracker({
  activeStudent,
  progressList,
  attendanceList = [],
  onAddAttendance,
  onDeleteAttendance,
}: PerformanceTrackerProps) {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [weightDrawerOpen, setWeightDrawerOpen] = useState(false);
  const [courseWeights, setCourseWeights] = useState<CourseWeightSettings | null>(null);

  // Print portfolio mode: null = normal, 'portfolio' = full binder print
  const [printMode, setPrintMode] = useState<null | "portfolio">(null);

  const [attendanceDate, setAttendanceDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );
  const [attendanceHours, setAttendanceHours] = useState<number>(3);
  const [attendanceType, setAttendanceType] = useState<
    | "Core Lesson"
    | "Independent Study"
    | "Field Trip"
    | "Science Lab"
    | "Art & Craft"
    | "Physical Ed"
    | "Other"
  >("Independent Study");
  const [attendanceDesc, setAttendanceDesc] = useState<string>("");
  const [attendanceNotes, setAttendanceNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [targetAcademicDays, setTargetAcademicDays] = useState<number>(180);
  const [schoolYear, setSchoolYear] = useState<string>("2025-2026 Academic Session");
  const [tutorNotes, setTutorNotes] = useState<string>(
    "The student has adapted exceptionally well to high-comprehension curriculum pacing. Remedial segments successfully closed conceptual gaps, and the student consistently excels on adaptive worksheets and quizzes."
  );
  const [parentName, setParentName] = useState<string>("Parent Educator / Private Tutor");

  useEffect(() => {
    getCourseWeightSettings(activeStudent.id).then((w) => {
      if (w) setCourseWeights(w);
    });
  }, [activeStudent.id]);

  const parseLocalDate = (dateStr: string) => {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2])
      ).toDateString();
    }
    return new Date(dateStr).toDateString();
  };

  const supplementalHours = attendanceList.reduce((acc, curr) => acc + curr.hours, 0);
  const uniqueLogDates = Array.from(
    new Set(attendanceList.map((a) => parseLocalDate(a.date)))
  );
  const additionalAttendanceDays = uniqueLogDates.length;

  const totalLessons = progressList.length;

  // Weighted GPA: uses courseWeights if available, else flat average
  const computeWeightedAvg = (): number => {
    if (totalLessons === 0) return 0;
    if (!courseWeights) {
      return Math.round(
        progressList.reduce((acc, curr) => acc + curr.score, 0) / totalLessons
      );
    }
    // Weight each subject's average by its credit hours
    const subjectsToSummarize = ["math", "science", "history", "english"];
    let totalCredits = 0;
    let weightedSum = 0;
    subjectsToSummarize.forEach((subj) => {
      const list = progressList.filter(
        (p) => p.subject.toLowerCase() === subj || p.subject.toLowerCase().includes(subj)
      );
      if (list.length === 0) return;
      const cfg = courseWeights.subjects[subj];
      const credits = cfg?.creditHours ?? 1;
      const avg = list.reduce((s, p) => s + p.score, 0) / list.length;
      weightedSum += avg * credits;
      totalCredits += credits;
    });
    if (totalCredits === 0) {
      return Math.round(
        progressList.reduce((acc, curr) => acc + curr.score, 0) / totalLessons
      );
    }
    return Math.round(weightedSum / totalCredits);
  };

  const avgScore = computeWeightedAvg();

  const remedialReviewNeeded = progressList.filter((p) => p.status === "remedial_needed");
  const excelledUnits = progressList.filter((p) => p.status === "excelled");

  const coreHours = progressList.length * 1.5;
  const totalHours = Math.round((coreHours + supplementalHours) * 10) / 10;

  const uniqueStudyDates = Array.from(
    new Set(progressList.map((p) => new Date(p.gradedAt).toDateString()))
  );
  const coreDays = uniqueStudyDates.length;
  const attendedDays = coreDays + additionalAttendanceDays;
  const attendanceRate =
    targetAcademicDays > 0
      ? Math.min(100, Math.round((attendedDays / targetAcademicDays) * 100))
      : 100;

  const getLetterGrade = (score: number) => {
    if (score >= 90)
      return { grade: "A", color: "text-emerald-600 bg-emerald-50 border-emerald-100" };
    if (score >= 80)
      return { grade: "B", color: "text-indigo-600 bg-indigo-50 border-indigo-100" };
    if (score >= 70)
      return { grade: "C", color: "text-amber-600 bg-amber-50 border-amber-100" };
    if (score >= 60)
      return {
        grade: "D",
        color: "text-orange-600 bg-orange-50 border-orange-100 text-orange-850",
      };
    return { grade: "F", color: "text-red-650 bg-red-50 border-red-100" };
  };

  const subjectsToSummarize = ["Math", "Science", "History", "English"];
  const subjectSummaries = subjectsToSummarize.map((subj) => {
    const list = progressList.filter(
      (p) =>
        p.subject.toLowerCase() === subj.toLowerCase() ||
        (subj === "History" && p.subject.toLowerCase().includes("history"))
    );
    const units = list.length;
    const avg =
      units > 0
        ? Math.round(list.reduce((sum, p) => sum + p.score, 0) / units)
        : 0;
    const estimatedHours = units * 1.5;
    const cfg = courseWeights?.subjects[subj.toLowerCase()];
    return {
      name: subj,
      units,
      avgScore: avg,
      estimatedHours,
      letterGrade: units > 0 ? getLetterGrade(avg).grade : "N/A",
      creditHours: cfg?.creditHours ?? 1.0,
    };
  });

  const chartData = [...progressList]
    .reverse()
    .map((p) => ({
      date: new Date(p.gradedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      score: p.score,
      subject: p.subject,
      topic: p.topic,
    }));

  const toggleExpandLog = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const getStreak = () => {
    if (progressList.length === 0) return 0;
    const sortedDates = [...progressList]
      .map((p) => new Date(p.gradedAt).toDateString())
      .filter((v, i, self) => self.indexOf(v) === i)
      .map((d) => new Date(d).getTime())
      .sort((a, b) => b - a);

    if (sortedDates.length === 0) return 0;

    const oneDayMs = 24 * 60 * 60 * 1000;
    const todayStr = new Date().toDateString();
    const todayMs = new Date(todayStr).getTime();

    if (sortedDates[0] < todayMs - oneDayMs) {
      return 0;
    }

    let streak = 1;
    let prevTime = sortedDates[0];
    for (let i = 1; i < sortedDates.length; i++) {
      if (prevTime - sortedDates[i] === oneDayMs) {
        streak++;
        prevTime = sortedDates[i];
      } else if (prevTime - sortedDates[i] > oneDayMs) {
        break;
      }
    }
    return streak;
  };

  const streak = getStreak();

  const badges = [
    {
      id: "first_step",
      name: "First Landmark",
      description: "Successfully graded the initial work package",
      unlocked: totalLessons > 0,
      icon: "🚩",
      color: "from-blue-500 to-indigo-600",
    },
    {
      id: "math_wizard",
      name: "Fraction & Formula Oracle",
      description: "Scored 80%+ on any Mathematics worksheet",
      unlocked: progressList.some(
        (p) => p.subject.toLowerCase() === "math" && p.score >= 80
      ),
      icon: "📐",
      color: "from-amber-450 to-orange-500",
    },
    {
      id: "science_hero",
      name: "Atmospheric Explorer",
      description: "Scored 80%+ on any Science lesson",
      unlocked: progressList.some(
        (p) => p.subject.toLowerCase() === "science" && p.score >= 80
      ),
      icon: "🧪",
      color: "from-emerald-450 to-teal-500",
    },
    {
      id: "history_scholar",
      name: "Chronological Historian",
      description: "Scored 80%+ on any Historical unit",
      unlocked: progressList.some(
        (p) => p.subject.toLowerCase() === "history" && p.score >= 80
      ),
      icon: "🏛️",
      color: "from-rose-500 to-pink-600",
    },
    {
      id: "literacy_star",
      name: "Creative Synthesizer",
      description: "Completed English study reading assignments with high accolades",
      unlocked: progressList.some(
        (p) => p.subject.toLowerCase() === "english" && p.score >= 80
      ),
      icon: "✍️",
      color: "from-cyan-500 to-blue-500",
    },
    {
      id: "remedial_champ",
      name: "Resilient Adapting Sage",
      description: "Achieved 90%+ score on a custom Remedial intervention track",
      unlocked: progressList.some(
        (p) => p.assessmentType === "remedial" && p.score >= 90
      ),
      icon: "🛡️",
      color: "from-amber-500 to-yellow-600",
    },
    {
      id: "streak_star",
      name: "Homeschool Pioneer",
      description: "Maintained a 2+ day daily lesson streak",
      unlocked: streak >= 2,
      icon: "🔥",
      color: "from-red-500 to-orange-500",
    },
  ];

  // Portfolio print handler
  const handlePrintPortfolio = () => {
    setPrintMode("portfolio");
    setTimeout(() => {
      window.print();
      setPrintMode(null);
    }, 150);
  };

  // Build monthly attendance calendar for portfolio print
  const buildMonthlyCalendar = () => {
    const year = new Date().getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => {
      const daysInMonth = new Date(year, i + 1, 0).getDate();
      const days = Array.from({ length: daysInMonth }, (_, d) => {
        const dateStr = `${year}-${String(i + 1).padStart(2, "0")}-${String(d + 1).padStart(2, "0")}`;
        const logs = attendanceList.filter((a) => a.date === dateStr);
        return { day: d + 1, dateStr, hours: logs.reduce((s, l) => s + l.hours, 0), logged: logs.length > 0 };
      });
      return { month: new Date(year, i, 1).toLocaleString("default", { month: "long" }), days };
    });
    return months;
  };

  const monthlyCalendar = buildMonthlyCalendar();

  return (
    <>
      <div className="space-y-6" id="performance-tracker-module">
        {/* Transcript Exporter header */}
        <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-xs flex flex-col space-y-6 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
                <FileSpreadsheet className="w-6 h-6 shrink-0" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-gray-900 text-base md:text-lg">
                  Academic Transcript & PDF Progress Exporter
                </h3>
                <p className="text-xs text-gray-500 font-sans mt-0.5">
                  Generate official offline records. Track total logged hours, custom extra-curricular studies, and day attendance registers.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setWeightDrawerOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl transition cursor-pointer active:scale-95 duration-100"
              >
                <SlidersHorizontal className="w-4 h-4 shrink-0" />
                <span>Course Weights</span>
              </button>
              <button
                onClick={handlePrintPortfolio}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition cursor-pointer shadow-xs active:scale-95 duration-100"
              >
                <BookMarked className="w-4 h-4 shrink-0" />
                <span>Print Full Portfolio</span>
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition cursor-pointer shadow-xs active:scale-95 duration-100"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>Export Transcript</span>
              </button>
            </div>
          </div>

          {/* 2-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <h4 className="text-2xs font-bold tracking-wider uppercase text-gray-400 font-sans">
                Transcript Metrics Tuner
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 bg-slate-50/55 p-3.5 rounded-xl border border-gray-100 flex flex-col justify-between">
                  <div>
                    <label className="text-3xs font-bold font-sans uppercase text-gray-400 tracking-wider block">
                      Supplemental Hours Logged
                    </label>
                    <p className="text-xl font-black text-indigo-700 font-mono mt-1">
                      {supplementalHours} Hours
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-500 font-sans mt-2 leading-normal">
                    Driven by active session logs. Add gym, independent projects, or textbook studies below.
                  </p>
                </div>

                <div className="space-y-1 bg-slate-50/55 p-3.5 rounded-xl border border-gray-100 flex flex-col justify-between">
                  <div>
                    <label className="text-3xs font-bold font-sans uppercase text-gray-400 tracking-wider block">
                      Enrichment Days Present
                    </label>
                    <p className="text-xl font-black text-indigo-700 font-mono mt-1">
                      {additionalAttendanceDays} Days
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-500 font-sans mt-2 leading-normal">
                    Derived from unique calendar dates logged in your registry database below.
                  </p>
                </div>

                <div className="space-y-1 bg-slate-50/55 p-3 rounded-xl border border-gray-100">
                  <label className="text-3xs font-bold font-sans uppercase text-gray-500 tracking-wider block">
                    Target Academic Days
                  </label>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="range"
                      min="30"
                      max="220"
                      value={targetAcademicDays}
                      onChange={(e) =>
                        setTargetAcademicDays(parseInt(e.target.value) || 180)
                      }
                      className="w-full select-none cursor-pointer accent-indigo-650 text-indigo-700"
                    />
                    <span className="text-xs font-black font-mono whitespace-nowrap bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md text-indigo-700 font-sans">
                      {targetAcademicDays} Days
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 font-sans mt-1 leading-normal">
                    The baseline academic duration, standardly set at 180 days.
                  </p>
                </div>

                <div className="space-y-1 bg-slate-50/55 p-3 rounded-xl border border-gray-100">
                  <label className="text-3xs font-bold font-sans uppercase text-gray-500 tracking-wider block">
                    Session Term / School Year
                  </label>
                  <input
                    type="text"
                    value={schoolYear}
                    onChange={(e) => setSchoolYear(e.target.value)}
                    placeholder="e.g., 2025-26 Academic Year"
                    className="w-full text-xs font-semibold bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 bg-slate-50/55 p-3 rounded-xl border border-gray-100">
                  <label className="text-3xs font-bold font-sans uppercase text-gray-500 tracking-wider block">
                    Educator / Proctor Name
                  </label>
                  <input
                    type="text"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full text-xs font-bold bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus:border-indigo-500 font-sans text-gray-800"
                  />
                </div>

                <div className="space-y-1 bg-slate-50/55 p-3 rounded-xl border border-gray-100">
                  <label className="text-3xs font-bold font-sans uppercase text-gray-500 tracking-wider block">
                    Appraisal Notes commentary
                  </label>
                  <textarea
                    rows={2}
                    value={tutorNotes}
                    onChange={(e) => setTutorNotes(e.target.value)}
                    className="w-full text-xs font-sans leading-relaxed text-gray-700 bg-white border border-gray-200 rounded-lg p-2 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Course weight info banner */}
              {courseWeights && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                  <SlidersHorizontal className="w-4 h-4 shrink-0" />
                  <span>
                    Weighted GPA active — {Object.keys(courseWeights.subjects).length} subjects configured.{" "}
                    <button
                      onClick={() => setWeightDrawerOpen(true)}
                      className="underline font-bold"
                    >
                      Edit weights
                    </button>
                  </span>
                </div>
              )}
            </div>

            {/* Real-Time Projection Card */}
            <div className="lg:col-span-5 bg-gradient-to-br from-indigo-950 to-slate-900 text-white rounded-2xl p-5 border border-indigo-900/60 shadow-inner flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-widest block font-sans">
                  Real-Time Transcript Projection
                </span>
                <h4 className="font-display font-black text-white text-base md:text-lg mt-0.5">
                  {activeStudent.name}
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5 font-sans uppercase tracking-wider">
                  Official Certification Metric Bundle
                </p>
              </div>

              <div className="space-y-3 font-sans">
                <div className="flex items-center justify-between border-b border-indigo-900/40 pb-2.5">
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-slate-300">Total Hours Study Log</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-indigo-300 block">
                      {totalHours} Hours
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      ({coreHours} hrs Core + {supplementalHours} hrs Supp)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-indigo-900/40 pb-2.5">
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-slate-300">Attendance Register</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-indigo-300 block">
                      {attendedDays} present / {targetAcademicDays}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      ({coreDays} core class + {additionalAttendanceDays} custom)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-indigo-900/40 pb-2.5">
                  <div className="flex items-center gap-2 text-xs">
                    <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-slate-300">Attendance Rate</span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-sm font-black block ${
                        attendanceRate >= 90
                          ? "text-emerald-400"
                          : attendanceRate >= 80
                          ? "text-indigo-300"
                          : "text-amber-400"
                      }`}
                    >
                      {attendanceRate}%
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {attendanceRate >= 90 ? "Excellent Compliance" : "Satisfactory Stand"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <div className="flex items-center gap-2 text-xs">
                    <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-slate-300">
                      {courseWeights ? "Weighted GPA" : "Cumulative GPA Average"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-emerald-400 block">
                      {avgScore}% ({getLetterGrade(avgScore).grade})
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {courseWeights ? "Credit-weighted average" : `Grades average of ${progressList.length} units`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-800/30 p-2.5 rounded-xl text-3xs leading-relaxed text-slate-400 font-sans italic text-center">
                Press "Print Full Portfolio" for a complete multi-page binder, or "Export Transcript" for the single-page summary.
              </div>
            </div>
          </div>
        </div>

        {/* Annual Heatmap */}
        <AnnualHeatmap
          attendanceList={attendanceList}
          targetDays={targetAcademicDays}
          academicYearLabel={schoolYear}
        />

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-100 p-5 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                Overall Average Score
              </span>
              <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm">📈</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-display font-bold text-gray-900">{avgScore}%</span>
              <span className="text-xs text-emerald-600 font-medium">
                {courseWeights ? "Weighted" : "Auto-computed"}
              </span>
            </div>
            <p className="text-2xs text-gray-400 mt-1">Goal benchmark is set to 75%</p>
          </div>

          <div className="bg-white border border-gray-100 p-5 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                Lessons Finished
              </span>
              <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm">📚</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-display font-bold text-gray-900">{totalLessons}</span>
              <span className="text-xs text-indigo-500 font-medium">completed units</span>
            </div>
            <p className="text-2xs text-gray-400 mt-1">Includes diagnostic adaptive trials</p>
          </div>

          <div className="bg-white border border-gray-100 p-5 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                Remedial Interventions
              </span>
              <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm">🛡️</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-display font-bold text-gray-900">
                {remedialReviewNeeded.length}
              </span>
              <span
                className={`text-xs font-semibold ${
                  remedialReviewNeeded.length > 0 ? "text-amber-600" : "text-gray-400"
                }`}
              >
                {remedialReviewNeeded.length > 0 ? "remediations active" : "none needed"}
              </span>
            </div>
            <p className="text-2xs text-gray-400 mt-1">Triggered automatically by scorer</p>
          </div>

          <div className="bg-white border border-gray-100 p-5 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                Advanced Triumphs
              </span>
              <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm">🌟</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-display font-bold text-gray-900">
                {excelledUnits.length}
              </span>
              <span className="text-xs text-emerald-600 font-medium">excelled (score &ge; 90)</span>
            </div>
            <p className="text-2xs text-gray-400 mt-1">Qualifies for honors content</p>
          </div>
        </div>

        {/* Streak + Badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-amber-50 to-orange-100 border border-orange-200/65 p-5 rounded-2xl flex items-center justify-between shadow-2xs">
            <div className="space-y-1">
              <span className="text-3xs font-bold text-orange-700 uppercase tracking-widest block font-sans">
                Daily Homeschool Streak
              </span>
              <h3 className="font-display font-extrabold text-gray-900 text-lg leading-tight">
                Consecutive Study Days
              </h3>
              <p className="text-[11px] text-orange-800 leading-relaxed font-sans">
                Complete daily worksheets to advance lessons and retain standard schedules!
              </p>
            </div>
            <div className="text-center bg-white/75 backdrop-blur-xs py-3 px-5 rounded-xl border border-orange-200/30">
              <Flame
                className={`w-8 h-8 mx-auto animate-bounce ${
                  streak > 0 ? "text-orange-500 fill-orange-500" : "text-gray-300"
                }`}
              />
              <span className="block mt-1 font-display font-black text-2xl text-gray-950">
                {streak}
              </span>
              <span className="text-[10px] tracking-tight font-bold text-gray-500 uppercase font-sans">
                Days
              </span>
            </div>
          </div>

          <div className="md:col-span-2 bg-white border border-gray-100 p-5 rounded-2xl shadow-2xs">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                <h3 className="font-display font-bold text-gray-950 text-sm md:text-base">
                  Student Accolades & Trophies
                </h3>
              </div>
              <span className="text-2xs font-semibold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100 font-sans">
                {badges.filter((b) => b.unlocked).length} of {badges.length} unlocked
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className="group relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-250 cursor-help"
                >
                  <div
                    className={`relative w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-xs transition-transform group-hover:scale-110 ${
                      badge.unlocked
                        ? `bg-gradient-to-br ${badge.color} text-white`
                        : "bg-gray-100 border border-gray-200 text-gray-400 font-normal"
                    }`}
                  >
                    {badge.unlocked ? (
                      badge.icon
                    ) : (
                      <Lock className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] mt-1.5 font-bold text-center tracking-tight truncate w-full ${
                      badge.unlocked
                        ? "text-gray-900 font-sans"
                        : "text-gray-400 font-medium font-sans"
                    }`}
                  >
                    {badge.name.split(" ")[0]}
                  </span>

                  <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute z-30 bottom-16 bg-slate-900 text-white text-[11px] font-sans p-2.5 rounded-lg shadow-lg w-48 text-center leading-normal">
                    <div className="font-bold border-b border-white/10 pb-1 mb-1">
                      {badge.name}
                    </div>
                    <p className="text-[10px] text-gray-305">{badge.description}</p>
                    <p className="text-[9px] mt-1 font-semibold uppercase text-indigo-300">
                      {badge.unlocked ? "★ Unlocked ★" : "🔒 Needs Achievement"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Attendance Registry */}
        <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-xs flex flex-col space-y-6 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
                <Calendar className="w-6 h-6 shrink-0" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-gray-900 text-base md:text-lg">
                  Interactive Attendance & Instruction Hours Register
                </h3>
                <p className="text-xs text-gray-500 font-sans mt-0.5">
                  Log homeschool days and hours studied. This dynamic log feeds directly into the GPA, transcript metrics, and official printable sheets in real-time.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!onAddAttendance) return;
                if (!attendanceDesc.trim()) return;
                if (attendanceHours <= 0) return;
                setIsSubmitting(true);
                try {
                  await onAddAttendance(
                    attendanceDate,
                    attendanceHours,
                    attendanceType,
                    attendanceDesc.trim(),
                    attendanceNotes.trim() || undefined
                  );
                  setAttendanceDesc("");
                  setAttendanceNotes("");
                } catch (err) {
                  console.error(err);
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="lg:col-span-5 bg-slate-50/50 hover:bg-slate-50 border border-gray-100 p-5 rounded-2xl space-y-4 duration-200"
            >
              <h4 className="text-xs font-bold uppercase text-indigo-850 tracking-wide flex items-center gap-1.5 font-sans">
                <span>✍️</span> Log Today's Study Details
              </h4>

              <div className="space-y-1">
                <label className="text-3xs font-bold uppercase text-gray-400 tracking-wider block font-sans">
                  Calendar Session Date
                </label>
                <input
                  type="date"
                  required
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="w-full text-xs font-semibold bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-800 focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-3xs font-bold uppercase text-gray-400 tracking-wider block font-sans">
                  Activity / Study classification
                </label>
                <select
                  value={attendanceType}
                  onChange={(e: any) => setAttendanceType(e.target.value)}
                  className="w-full text-xs font-semibold bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-800 focus:border-indigo-500 outline-hidden"
                >
                  <option value="Core Lesson">📚 Core Study Lesson</option>
                  <option value="Independent Study">📖 Independent Research Reading</option>
                  <option value="Field Trip">🚌 Educational Field Trip</option>
                  <option value="Science Lab">🧪 Home Laboratory Science</option>
                  <option value="Art & Craft">🎨 Arts, Crafts & Design</option>
                  <option value="Physical Ed">🏃 Physical Education (Gym)</option>
                  <option value="Other">🌟 Other Co-curricular Activities</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-3xs font-bold uppercase text-gray-400 tracking-wider block font-sans">
                    Instruction Duration (Hours)
                  </label>
                  <span className="text-2xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-mono">
                    {attendanceHours} Hrs
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="8.0"
                  step="0.5"
                  value={attendanceHours}
                  onChange={(e) => setAttendanceHours(parseFloat(e.target.value))}
                  className="w-full select-none cursor-pointer accent-indigo-600 focus:outline-hidden"
                />
                <div className="grid grid-cols-4 gap-1.5 pt-1.5 text-center">
                  {[1, 2, 4, 6].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setAttendanceHours(h)}
                      className={`px-1 py-1 rounded-lg border text-4xs font-sans font-bold transition duration-100 ${
                        attendanceHours === h
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-white border-gray-150 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {h} {h === 1 ? "Hour" : "Hours"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-3xs font-bold uppercase text-gray-400 tracking-wider block font-sans">
                  Topic or Activity Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fractions Workbook p24-28, Museum tour"
                  value={attendanceDesc}
                  onChange={(e) => setAttendanceDesc(e.target.value)}
                  className="w-full text-xs font-semibold bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-800 placeholder:text-gray-350 focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-3xs font-bold uppercase text-gray-400 tracking-wider block font-sans">
                  Supplementary Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Specific milestones, materials read, or notes..."
                  value={attendanceNotes}
                  onChange={(e) => setAttendanceNotes(e.target.value)}
                  className="w-full text-xs font-sans bg-white border border-gray-200 rounded-xl p-3 text-gray-800 placeholder:text-gray-350 focus:border-indigo-500 outline-hidden leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !attendanceDesc.trim()}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed duration-150 active:scale-95 text-white rounded-xl text-xs font-bold cursor-pointer font-sans shadow-sm tracking-wider uppercase font-semibold block text-center"
              >
                {isSubmitting ? "Syncing Attendance..." : "➕ Log Session & Hours"}
              </button>
            </form>

            <div className="lg:col-span-7 space-y-3">
              <h4 className="text-2xs font-bold uppercase text-gray-400 tracking-wider font-sans">
                Attendance & Study Ledger ({attendanceList.length} total events)
              </h4>

              {attendanceList.length === 0 ? (
                <div className="py-24 text-center border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/20 text-gray-400 flex flex-col items-center justify-center p-6">
                  <span className="text-3xl mb-2">📅</span>
                  <p className="font-semibold text-xs text-gray-700">No session logs completed yet</p>
                  <p className="text-3xs text-gray-400 mt-1 max-w-xs leading-normal">
                    Use the entry form on the left to add supplemental hours, field trips, laboratory studies, or independent textbooks to compile a beautiful record.
                  </p>
                </div>
              ) : (
                <div className="max-h-[460px] overflow-y-auto space-y-2 pr-1.5 scrollbar-thin">
                  {attendanceList.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between p-3.5 bg-white border border-gray-100 rounded-xl shadow-2xs hover:border-gray-200 transition duration-150 font-sans"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-50/80 text-indigo-700 rounded-lg text-xs leading-none shrink-0 font-medium">
                          {log.activityType === "Core Lesson"
                            ? "📚"
                            : log.activityType === "Independent Study"
                            ? "📖"
                            : log.activityType === "Field Trip"
                            ? "🚌"
                            : log.activityType === "Science Lab"
                            ? "🧪"
                            : log.activityType === "Art & Craft"
                            ? "🎨"
                            : log.activityType === "Physical Ed"
                            ? "🏃"
                            : "🌟"}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 pb-0.5">
                            <span className="text-2xs font-black text-gray-800 font-sans leading-none">
                              {log.description}
                            </span>
                            <span className="text-2xs text-gray-500 font-bold bg-indigo-50 rounded px-1.5 py-0.5 whitespace-nowrap leading-none font-mono">
                              {log.hours} Hrs
                            </span>
                          </div>
                          <p className="text-3xs text-gray-400 font-semibold">
                            {log.activityType} •{" "}
                            {new Date(log.date + "T00:00:00").toLocaleDateString(undefined, {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          {log.notes && (
                            <p className="mt-1.5 text-3xs text-gray-600 bg-slate-50 border-l border-gray-200 p-2 rounded-r italic whitespace-pre-wrap leading-relaxed">
                              {log.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      {onDeleteAttendance && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this attendance log?")) {
                              onDeleteAttendance(log.id);
                            }
                          }}
                          className="p-1 text-gray-450 hover:text-red-500 duration-100 hover:bg-red-50 rounded-lg text-xs shrink-0 cursor-pointer"
                          title="Delete record"
                        >
                          <XOctagon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Charts + Adaptive Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-gray-100 p-5 rounded-2xl shadow-2xs">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <h3 className="font-display font-bold text-gray-900 text-sm md:text-base">
                Chronological Score Mastery Path
              </h3>
            </div>

            {chartData.length === 0 ? (
              <div className="py-24 text-center text-gray-400 border border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500">
                  Progress charts will display after completing the first worksheet.
                </p>
              </div>
            ) : (
              <div className="h-64 mt-4 text-xs font-sans">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="date" stroke="#9ca3af" />
                    <YAxis domain={[0, 100]} stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        borderColor: "#f1f5f9",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                      }}
                      formatter={(value) => [`${value}% Mastery`, "Score"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      dot={{ r: 6, fill: "#4f46e5", strokeWidth: 2, stroke: "#ffffff" }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-2xs space-y-4">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-600" />
              <h3 className="font-display font-bold text-gray-900 text-sm md:text-base">
                System Adaptive Logic Logs
              </h3>
            </div>

            <div className="space-y-3.5 max-h-68 overflow-y-auto pr-1">
              {progressList.length === 0 ? (
                <p className="text-xs text-gray-400 py-10 text-center">
                  No system adaptation logs compiled yet.
                </p>
              ) : (
                progressList.map((log) => {
                  let text = "";
                  let typeColor = "";
                  switch (log.status) {
                    case "remedial_needed":
                      text = `Remedial loop triggered on "${log.topic}". Materials auto-configured with simplified vocabulary to reinforce fundamentals.`;
                      typeColor = "border-amber-400 bg-amber-50 text-amber-800";
                      break;
                    case "excelled":
                      text = `Outstanding performance on "${log.topic}". Prompted immediate skipping to Advanced tier content with challenge problems.`;
                      typeColor = "border-purple-400 bg-purple-50 text-purple-800";
                      break;
                    default:
                      text = `Course units for "${log.topic}" completed successfully. Progressed standard pacing to next topic.`;
                      typeColor = "border-emerald-400 bg-emerald-50 text-emerald-800";
                  }

                  return (
                    <div
                      key={log.id}
                      className="p-3 border-l-3 rounded-r-lg bg-slate-50 border-gray-100 space-y-1.5 text-xs"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-800">{log.subject}</span>
                        <span
                          className={`text-3xs uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-sm ${typeColor}`}
                        >
                          {log.status === "remedial_needed"
                            ? "remedial step"
                            : log.status === "excelled"
                            ? "advanced leap"
                            : "standard step"}
                        </span>
                      </div>
                      <p className="text-gray-600 font-sans leading-relaxed text-2xs">{text}</p>
                      <span className="block text-4xs text-gray-400">
                        {new Date(log.gradedAt).toLocaleString()}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Grading Dossiers */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-2xs">
          <h3 className="text-base font-display font-bold text-gray-950 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span>Completed Grading Dossiers & Answers</span>
          </h3>

          {progressList.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <HelpCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm">Worksheet files and grading logs will be stored here chronologically.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {progressList.map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <div
                    key={log.id}
                    className="border border-gray-100 rounded-xl hover:border-gray-200 transition overflow-hidden"
                  >
                    <div
                      onClick={() => toggleExpandLog(log.id)}
                      className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50/50 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-semibold">
                          {log.subject.toLowerCase() === "math"
                            ? "📐"
                            : log.subject.toLowerCase() === "science"
                            ? "🧪"
                            : log.subject.toLowerCase() === "history"
                            ? "🏛️"
                            : "✍️"}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm">{log.topic}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5 text-2xs text-gray-500">
                            <span>{log.subject}</span>
                            <span>•</span>
                            <span>{log.gradeLevel}</span>
                            <span>•</span>
                            <span>{new Date(log.gradedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="block text-xs font-semibold text-gray-400">Scorecard</span>
                          <span
                            className={`text-base font-bold ${
                              log.score >= 75 ? "text-emerald-600" : "text-amber-500"
                            }`}
                          >
                            {log.score}%
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-5 border-t border-gray-100 bg-white space-y-5 animate-slideDown">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-3 bg-indigo-50/30 rounded-lg border border-indigo-100/20 text-xs">
                            <span className="font-bold text-gray-800 block mb-1">Pacing Standard</span>
                            <span className="text-indigo-700 font-semibold uppercase tracking-wider">
                              {log.assessmentType} Tier
                            </span>
                          </div>
                          <div className="p-3 bg-emerald-50/30 rounded-lg border border-emerald-100/20 text-xs">
                            <span className="font-bold text-gray-800 block mb-1">Worksheet Quantities</span>
                            <span className="text-emerald-700 font-semibold">
                              {log.correctAnswers} / {log.totalQuestions} questions passed
                            </span>
                          </div>
                          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                            <span className="font-bold text-gray-800 block mb-1">Milestone Outcome</span>
                            <span className="capitalize text-slate-700 font-semibold">
                              {log.status.replace("_", " ")}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-4 pt-1">
                          <h5 className="text-xs font-bold text-gray-700 uppercase tracking-widest">
                            Question & Answers Dossier
                          </h5>
                          {Object.entries(log.answers).map(([key, value]) => {
                            const qIndex = Number(key);
                            return (
                              <div
                                key={qIndex}
                                className="p-4 bg-slate-50/40 rounded-xl border border-slate-100 space-y-2"
                              >
                                <span className="inline-block text-xs font-bold text-gray-500">
                                  Question {qIndex + 1}
                                </span>
                                <p className="text-xs font-semibold text-gray-800 m-0 leading-relaxed">
                                  {value ? `Answer recorded: "${value}"` : "(No answer given)"}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ======================================================
            STANDARD PRINT-ONLY TRANSCRIPT (single page)
            Shown when window.print() called without portfolio mode
            ====================================================== */}
        <div
          className={`bg-white text-black p-10 font-serif leading-relaxed text-xs max-w-4xl mx-auto border-4 border-double border-slate-900 rounded-lg select-all ${
            printMode === "portfolio" ? "hidden print:hidden" : "hidden print:block"
          }`}
        >
          <TranscriptPage
            activeStudent={activeStudent}
            parentName={parentName}
            schoolYear={schoolYear}
            totalHours={totalHours}
            coreHours={coreHours}
            supplementalHours={supplementalHours}
            attendedDays={attendedDays}
            coreDays={coreDays}
            additionalAttendanceDays={additionalAttendanceDays}
            targetAcademicDays={targetAcademicDays}
            attendanceRate={attendanceRate}
            avgScore={avgScore}
            getLetterGrade={getLetterGrade}
            subjectSummaries={subjectSummaries}
            progressList={progressList}
            totalLessons={totalLessons}
            tutorNotes={tutorNotes}
            showCreditHours={!!courseWeights}
          />
        </div>
      </div>

      {/* ======================================================
          PORTFOLIO PRINT BLOCK — Full multi-page binder
          Only rendered when printMode === 'portfolio'
          ====================================================== */}
      {printMode === "portfolio" && (
        <div className="hidden print:block bg-white text-black font-serif text-xs leading-relaxed">
          {/* Page 1: Core Transcript */}
          <div className="p-10 border-4 border-double border-slate-900 max-w-4xl mx-auto mb-0">
            <TranscriptPage
              activeStudent={activeStudent}
              parentName={parentName}
              schoolYear={schoolYear}
              totalHours={totalHours}
              coreHours={coreHours}
              supplementalHours={supplementalHours}
              attendedDays={attendedDays}
              coreDays={coreDays}
              additionalAttendanceDays={additionalAttendanceDays}
              targetAcademicDays={targetAcademicDays}
              attendanceRate={attendanceRate}
              avgScore={avgScore}
              getLetterGrade={getLetterGrade}
              subjectSummaries={subjectSummaries}
              progressList={progressList}
              totalLessons={totalLessons}
              tutorNotes={tutorNotes}
              showCreditHours={!!courseWeights}
            />
          </div>

          {/* Page 2: Appendix — detailed quiz results */}
          <div className="p-10 max-w-4xl mx-auto" style={{ pageBreakBefore: "always" }}>
            <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
              <div className="text-xl font-black tracking-widest uppercase">
                Appendix A — Individual Assessment Records
              </div>
              <div className="text-[9px] uppercase tracking-widest text-slate-500 font-sans mt-1">
                {activeStudent.name} | {schoolYear} | {new Date().toLocaleDateString()}
              </div>
            </div>

            {progressList.length === 0 ? (
              <p className="text-center text-slate-400 italic p-8">No assessment records on file.</p>
            ) : (
              <div className="space-y-4">
                {progressList.map((log, idx) => (
                  <div key={log.id} className="border border-slate-300 rounded-md p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-[9px] text-slate-400 font-sans font-bold uppercase tracking-wider">
                          Assessment #{idx + 1}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">{log.topic}</h4>
                        <p className="text-[10px] text-slate-500 font-sans">
                          {log.subject} • {log.gradeLevel} • {log.assessmentType.toUpperCase()} Tier •{" "}
                          {new Date(log.gradedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-black font-mono text-slate-900">{log.score}%</span>
                        <p className="text-[9px] text-slate-500 font-sans">
                          {log.correctAnswers}/{log.totalQuestions} correct
                        </p>
                        <p className="text-[9px] font-bold uppercase text-slate-600 font-sans">
                          {log.status.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                    {log.teacherFeedback && (
                      <p className="text-[10px] italic text-slate-600 border-l-2 border-slate-300 pl-3 mt-2">
                        {log.teacherFeedback}
                      </p>
                    )}
                    <table className="w-full border-collapse mt-3 text-[9px] font-sans">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border border-slate-300 px-2 py-1 text-left">Q#</th>
                          <th className="border border-slate-300 px-2 py-1 text-left">Response</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(log.answers).map(([k, v]) => (
                          <tr key={k}>
                            <td className="border border-slate-200 px-2 py-1 font-mono">{Number(k) + 1}</td>
                            <td className="border border-slate-200 px-2 py-1">{v || "(no answer)"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Page 3: Attendance Calendar */}
          <div className="p-10 max-w-4xl mx-auto" style={{ pageBreakBefore: "always" }}>
            <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
              <div className="text-xl font-black tracking-widest uppercase">
                Appendix B — Annual Attendance Calendar
              </div>
              <div className="text-[9px] uppercase tracking-widest text-slate-500 font-sans mt-1">
                {activeStudent.name} | {schoolYear} | Target: {targetAcademicDays} days
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {monthlyCalendar.map(({ month, days }) => (
                <div key={month} className="space-y-1">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-700 font-sans pb-1 border-b border-slate-200">
                    {month}
                  </h4>
                  <div className="grid grid-cols-7 gap-0.5">
                    {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                      <div key={i} className="text-center text-[7px] font-bold text-slate-400 py-0.5">
                        {d}
                      </div>
                    ))}
                    {/* Pad first week */}
                    {Array.from({
                      length: new Date(new Date().getFullYear(), monthlyCalendar.indexOf(monthlyCalendar.find((m) => m.month === month)!), 1).getDay(),
                    }).map((_, i) => (
                      <div key={`pad-${i}`} />
                    ))}
                    {days.map(({ day, logged, hours }) => (
                      <div
                        key={day}
                        className={`text-center text-[8px] py-0.5 rounded-sm font-mono font-bold ${
                          logged ? "bg-slate-800 text-white" : "text-slate-400"
                        }`}
                        title={logged ? `${hours}h` : ""}
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-slate-200 pt-4">
              <div className="grid grid-cols-4 gap-4 text-center text-[10px] font-sans">
                <div className="border border-slate-300 p-3 rounded">
                  <div className="font-black font-mono text-base">{attendanceList.length}</div>
                  <div className="text-slate-500 uppercase tracking-wide text-[8px]">Total Sessions</div>
                </div>
                <div className="border border-slate-300 p-3 rounded">
                  <div className="font-black font-mono text-base">{additionalAttendanceDays}</div>
                  <div className="text-slate-500 uppercase tracking-wide text-[8px]">Unique Days Logged</div>
                </div>
                <div className="border border-slate-300 p-3 rounded">
                  <div className="font-black font-mono text-base">{supplementalHours}</div>
                  <div className="text-slate-500 uppercase tracking-wide text-[8px]">Total Hours</div>
                </div>
                <div className="border border-slate-300 p-3 rounded">
                  <div className="font-black font-mono text-base">{attendanceRate}%</div>
                  <div className="text-slate-500 uppercase tracking-wide text-[8px]">Attendance Rate</div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8">
              <div className="text-center space-y-3">
                <div className="border-b border-dashed border-slate-700 h-8" />
                <div>
                  <span className="font-bold text-slate-800 block text-[10px]">{parentName}</span>
                  <span className="text-slate-500 text-[9px]">Primary Homeschool Instructor</span>
                </div>
              </div>
              <div className="text-center space-y-3">
                <div className="border-b border-dashed border-slate-700 h-8" />
                <div>
                  <span className="font-bold text-slate-800 block text-[10px]">{activeStudent.name}</span>
                  <span className="text-slate-500 text-[9px]">Enrolled Student Scholar</span>
                </div>
              </div>
            </div>

            <div className="text-center text-[8px] text-slate-400 font-sans tracking-wide mt-8 border-t border-slate-100 pt-3 uppercase">
              End of Portfolio. {activeStudent.name} | {schoolYear} | Generated {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      )}

      {/* Course Weight Drawer */}
      <CourseWeightDrawer
        student={activeStudent}
        open={weightDrawerOpen}
        onClose={() => setWeightDrawerOpen(false)}
        onSaved={(settings) => setCourseWeights(settings)}
      />
    </>
  );
}

// Extracted transcript page component to avoid duplication between standard and portfolio print
function TranscriptPage({
  activeStudent,
  parentName,
  schoolYear,
  totalHours,
  coreHours,
  supplementalHours,
  attendedDays,
  coreDays,
  additionalAttendanceDays,
  targetAcademicDays,
  attendanceRate,
  avgScore,
  getLetterGrade,
  subjectSummaries,
  progressList,
  totalLessons,
  tutorNotes,
  showCreditHours,
}: {
  activeStudent: Student;
  parentName: string;
  schoolYear: string;
  totalHours: number;
  coreHours: number;
  supplementalHours: number;
  attendedDays: number;
  coreDays: number;
  additionalAttendanceDays: number;
  targetAcademicDays: number;
  attendanceRate: number;
  avgScore: number;
  getLetterGrade: (score: number) => { grade: string; color: string };
  subjectSummaries: { name: string; units: number; avgScore: number; estimatedHours: number; letterGrade: string; creditHours: number }[];
  progressList: StudentProgress[];
  totalLessons: number;
  tutorNotes: string;
  showCreditHours: boolean;
}) {
  return (
    <>
      <div className="text-center border-b-2 border-slate-900 pb-5 mb-6 space-y-1">
        <div className="text-2xl font-black tracking-widest uppercase font-serif">
          🏫 Academica Homeschool Transcript
        </div>
        <div className="text-[10px] tracking-widest uppercase font-sans font-bold text-slate-700">
          OFFICIAL STUDENT PERFORMANCE RECORD & EXCEL MONITOR
        </div>
        <div className="text-[9px] text-slate-500 font-sans italic mt-1">
          Compliant with Independent Non-Public Educational Statutes and Record-keeping Standards
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 text-xs font-sans border-b border-slate-200 pb-5 mb-5">
        <div className="space-y-1.5">
          <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
            Student & Registry Particulars
          </h4>
          <div className="grid grid-cols-3 gap-y-1 font-medium">
            <span className="text-slate-400 font-semibold">Scholar Name:</span>
            <span className="col-span-2 text-slate-900 font-bold font-serif">{activeStudent.name}</span>
            <span className="text-slate-400 font-semibold">Assigned Stage:</span>
            <span className="col-span-2 text-slate-900 font-serif font-semibold">{activeStudent.gradeLevel}</span>
            <span className="text-slate-400 font-semibold">Enrolled Since:</span>
            <span className="col-span-2 text-slate-900 font-serif">
              {new Date(activeStudent.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
            Registrar & Proctor Metadata
          </h4>
          <div className="grid grid-cols-3 gap-y-1 font-medium">
            <span className="text-slate-400 font-semibold">Primary Tutor:</span>
            <span className="col-span-2 text-slate-900">{parentName}</span>
            <span className="text-slate-400 font-semibold">Academic term:</span>
            <span className="col-span-2 text-slate-900 font-bold">{schoolYear}</span>
            <span className="text-slate-400 font-semibold">Record Date:</span>
            <span className="col-span-2 text-slate-900">{new Date().toDateString()}</span>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-[10px] uppercase font-black text-slate-700 font-sans tracking-wider mb-2.5">
          Section I: Executive Academic Metric Ledger
        </h4>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Instructional Hours", value: `${totalHours} Hours`, sub: `(${coreHours} class / ${supplementalHours} supp)` },
            { label: "School Days Present", value: `${attendedDays} Days`, sub: `(${coreDays} core + ${additionalAttendanceDays} extra)` },
            { label: "Attendance Rate", value: `${attendanceRate}%`, sub: `of ${targetAcademicDays} annual days` },
            { label: "Cumulative Average GPA", value: `${avgScore}%`, sub: `Letter: ${getLetterGrade(avgScore).grade}` },
          ].map((item) => (
            <div key={item.label} className="border border-slate-900 p-3 rounded-md text-center bg-slate-50/50">
              <span className="text-[9px] font-bold text-slate-500 uppercase font-sans tracking-wide block">{item.label}</span>
              <span className="text-base font-black font-mono block mt-1">{item.value}</span>
              <span className="text-[8px] text-slate-400 block mt-0.5">{item.sub}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-[10px] uppercase font-black text-slate-700 font-sans tracking-wider mb-2">
          Section II: Co-Curricular & Core Subject Standing
        </h4>
        <table className="w-full border-collapse border border-slate-900 text-[11px] font-serif">
          <thead>
            <tr className="bg-slate-100 font-sans text-[9px] font-extrabold uppercase tracking-wider text-slate-800 border-b border-slate-900">
              <th className="border border-slate-900 px-3 py-1.5 text-left">Subject / Course</th>
              {showCreditHours && (
                <th className="border border-slate-900 px-3 py-1.5 text-center">Credit Hrs</th>
              )}
              <th className="border border-slate-900 px-3 py-1.5 text-center">Work Units</th>
              <th className="border border-slate-900 px-3 py-1.5 text-center">Instruction Log</th>
              <th className="border border-slate-900 px-3 py-1.5 text-center">Mastery Score</th>
              <th className="border border-slate-900 px-3 py-1.5 text-center">Letter Grade</th>
            </tr>
          </thead>
          <tbody>
            {subjectSummaries.map((subject) => (
              <tr key={subject.name} className="border-b border-slate-200">
                <td className="border border-slate-900 px-3 py-1.5 font-bold font-sans">
                  {subject.name} Course Track
                </td>
                {showCreditHours && (
                  <td className="border border-slate-900 px-3 py-1.5 text-center font-mono">
                    {subject.creditHours}
                  </td>
                )}
                <td className="border border-slate-900 px-3 py-1.5 text-center">{subject.units} Modules</td>
                <td className="border border-slate-900 px-3 py-1.5 text-center font-mono">
                  {subject.units > 0 ? `${subject.estimatedHours} Hours` : "0.0 Hours"}
                </td>
                <td className="border border-slate-900 px-3 py-1.5 text-center font-mono">
                  {subject.units > 0 ? `${subject.avgScore}%` : "—"}
                </td>
                <td className="border border-slate-900 px-3 py-1.5 text-center font-bold font-sans">
                  {subject.units > 0 ? subject.letterGrade : "N/A"}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-bold border-t border-slate-950 font-sans text-[10px]">
              <td className="border border-slate-900 px-3 py-2 font-black" colSpan={showCreditHours ? 2 : 1}>
                Report Summary Grand Total
              </td>
              <td className="border border-slate-900 px-3 py-2 text-center font-black">{totalLessons} Graded Units</td>
              <td className="border border-slate-900 px-3 py-2 text-center font-mono font-black">{totalHours} Hours</td>
              <td className="border border-slate-900 px-3 py-2 text-center font-mono font-black">{avgScore}%</td>
              <td className="border border-slate-900 px-3 py-2 text-center font-black">{getLetterGrade(avgScore).grade}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mb-6">
        <h4 className="text-[10px] uppercase font-black text-slate-700 font-sans tracking-wider mb-2">
          Section III: Detailed Coursework Ledger & Quiz History
        </h4>
        {progressList.length === 0 ? (
          <p className="p-3 text-center border text-slate-400 italic font-sans text-2xs">
            No graded worksheets have been logged for this scholar yet.
          </p>
        ) : (
          <table className="w-full border-collapse border border-slate-900 text-[10px] font-serif">
            <thead>
              <tr className="bg-slate-100 font-sans text-[8px] font-extrabold uppercase tracking-wider text-slate-800 border-b border-slate-900">
                <th className="border border-slate-900 px-2 py-1 text-left">Date</th>
                <th className="border border-slate-900 px-2 py-1 text-left">Subject</th>
                <th className="border border-slate-900 px-2 py-1 text-left">Topic</th>
                <th className="border border-slate-900 px-2 py-1 text-center">Score</th>
                <th className="border border-slate-900 px-2 py-1 text-center">Tier</th>
                <th className="border border-slate-900 px-2 py-1 text-center">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {progressList.map((log) => (
                <tr key={log.id} className="border-b border-slate-200">
                  <td className="border border-slate-900 px-2 py-1 font-mono text-[9px]">
                    {new Date(log.gradedAt).toLocaleDateString()}
                  </td>
                  <td className="border border-slate-900 px-2 py-1 font-sans">{log.subject}</td>
                  <td className="border border-slate-900 px-2 py-1 font-sans font-semibold">{log.topic}</td>
                  <td className="border border-slate-900 px-2 py-1 text-center font-bold font-mono text-[11px]">
                    {log.score}%
                  </td>
                  <td className="border border-slate-900 px-2 py-1 text-center font-mono text-[8px] text-slate-700">
                    {log.assessmentType.toUpperCase()}
                  </td>
                  <td className="border border-slate-900 px-2 py-1 text-center font-sans text-[8px] capitalize text-slate-600">
                    {log.status.replace("_", " ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="border border-slate-900 p-4 rounded-md mb-8 bg-slate-50/30">
        <h4 className="text-[9px] uppercase font-black tracking-wider text-slate-700 font-sans mb-1.5">
          Section IV: Proctor Narrative Appraisal Comments
        </h4>
        <p className="font-serif italic text-slate-800 leading-relaxed text-[11px] text-justify whitespace-pre-wrap">
          "{tutorNotes}"
        </p>
      </div>

      <div className="pt-8 border-t border-slate-350">
        <div className="grid grid-cols-3 gap-8 text-center text-[10px] font-sans">
          <div className="space-y-4">
            <div className="border-b border-dashed border-slate-900 h-8" />
            <div>
              <span className="font-bold text-slate-800 block">{parentName}</span>
              <span className="text-slate-500 block text-[9px]">Primary Homeschool Instructor</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="border-b border-dashed border-slate-900 h-8" />
            <div>
              <span className="font-bold text-slate-800 block">{activeStudent.name}</span>
              <span className="text-slate-500 block text-[9px]">Enrolled Student Scholar</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="border-b border-dashed border-slate-900 h-8" />
            <div>
              <span className="font-black text-slate-900 block font-serif">OFFICIAL ACADEMIC SEAL</span>
              <span className="text-slate-500 block text-[9px]">Certified Homeschool Recorder</span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center text-[8px] text-slate-400 font-sans tracking-wide mt-10 uppercase border-t border-slate-100 pt-3">
        End of Graded Record. Valid only upon physical proctor endorsement. Record generated strictly on{" "}
        {new Date().toLocaleDateString()}.
      </div>
    </>
  );
}
