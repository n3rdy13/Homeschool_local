import React, { useState, useRef, useEffect } from "react";
import { GeneratedLesson, Student } from "../types";
import { 
  X, 
  BookOpen, 
  HelpCircle, 
  Award, 
  ChevronRight, 
  ArrowLeft, 
  BookOpenCheck,
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Clock, 
  Sparkles,
  Loader2,
  ThumbsUp,
  Printer,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Square,
  Paintbrush,
  Eraser,
  Trash2
} from "lucide-react";

interface ActiveLessonSessionProps {
  lesson: GeneratedLesson;
  student: Student;
  onClose: () => void;
  onFinishLesson: (score: number, answers: Record<number, string>, gradedResults: any, recommendedTopicData: any) => void;
}

export default function ActiveLessonSession({
  lesson,
  student,
  onClose,
  onFinishLesson
}: ActiveLessonSessionProps) {
  const [activeTab, setActiveTab] = useState<'teach' | 'worksheet' | 'homework'>('teach');
  
  // Interactive Worksheet states
  const [studentAnswers, setStudentAnswers] = useState<Record<number, string>>({});
  const [grading, setGrading] = useState(false);
  const [gradedResults, setGradedResults] = useState<any | null>(null);
  const [submittingProgress, setSubmittingProgress] = useState(false);

  const handleSelectOption = (qIdx: number, option: string) => {
    if (gradedResults) return; // locked once graded
    setStudentAnswers(prev => ({
      ...prev,
      [qIdx]: option
    }));
  };

  const handleTextChange = (qIdx: number, val: string) => {
    if (gradedResults) return; // locked once graded
    setStudentAnswers(prev => ({
      ...prev,
      [qIdx]: val
    }));
  };

  // Automated AI grading integration
  const handleAutoGrade = async () => {
    setGrading(true);
    try {
      const response = await fetch("/api/grade-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: lesson.worksheet,
          studentAnswers
        })
      });
      if (!response.ok) throw new Error("Grading service error");
      const gradeData = await response.json();
      setGradedResults(gradeData);
    } catch (e) {
      console.error("Failed to grade automatically", e);
      // Client-side simple fallback if server fails
      let score = 0;
      const fallbackGrades = lesson.worksheet.map((q, idx) => {
        const studentAns = studentAnswers[idx] || "";
        const isMatch = studentAns.trim().toLowerCase() === q.answer.trim().toLowerCase();
        if (isMatch) score += 10;
        return {
          questionIndex: idx,
          isCorrect: isMatch,
          scorePoints: isMatch ? 10 : 0,
          feedback: isMatch ? "Correct answer! Well done." : `Needs Review. Guideline: ${q.answer}`
        };
      });
      const overall = Math.round((score / (lesson.worksheet.length * 10)) * 100);
      setGradedResults({
        grades: fallbackGrades,
        overallScorePercentage: overall
      });
    } finally {
      setGrading(false);
    }
  };

  // Complete lesson & fetch adaptive recommendations
  const handleCompleteAndSync = async () => {
    if (!gradedResults) return;
    setSubmittingProgress(true);
    let adaptiveRecommendation = null;
    
    try {
      const resp = await fetch("/api/recommend-next-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: student.name,
          subject: lesson.subject,
          currentTopic: lesson.topic,
          gradeLevel: lesson.gradeLevel,
          currentType: lesson.type,
          score: gradedResults.overallScorePercentage
        })
      });
      if (resp.ok) {
        adaptiveRecommendation = await resp.json();
      }
    } catch (e) {
      console.error("Could not fetch next recommended topic", e);
    }

    // Call state callback to trigger database persists and layout refresh
    onFinishLesson(
      gradedResults.overallScorePercentage,
      studentAnswers,
      gradedResults,
      adaptiveRecommendation
    );
    setSubmittingProgress(false);
  };

  // --- Text-To-Speech (TTS) Engine ---
  const [isPlayingSpeech, setIsPlayingSpeech] = useState(false);
  const [isPausedSpeech, setIsPausedSpeech] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);

  // Stop utility
  const stopSpeech = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingSpeech(false);
    setIsPausedSpeech(false);
  };

  // Start / Pause toggle
  const speakReadingMaterial = () => {
    if (!("speechSynthesis" in window)) {
      alert("Text-to-speech option is not natively supported by your browser software.");
      return;
    }

    if (isPlayingSpeech) {
      if (isPausedSpeech) {
        window.speechSynthesis.resume();
        setIsPausedSpeech(false);
      } else {
        window.speechSynthesis.pause();
        setIsPausedSpeech(true);
      }
      return;
    }

    // Strip out Markdown formatting to ensure smooth pronunciation
    const cleanedText = lesson.reading_material
      .replace(/[#*`_-]/g, " ")
      .replace(/\s+/g, " ");

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.rate = speechRate;
    
    // Choose high quality English default voice
    const voices = window.speechSynthesis.getVoices();
    const targetVoice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural"))) || voices[0];
    if (targetVoice) {
      utterance.voice = targetVoice;
    }

    utterance.onend = () => {
      setIsPlayingSpeech(false);
      setIsPausedSpeech(false);
    };

    utterance.onerror = () => {
      setIsPlayingSpeech(false);
      setIsPausedSpeech(false);
    };

    setIsPlayingSpeech(true);
    setIsPausedSpeech(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleRateChange = (newRate: number) => {
    setSpeechRate(newRate);
    if (isPlayingSpeech) {
      stopSpeech();
      setTimeout(() => {
        const cleanedText = lesson.reading_material.replace(/[#*`_-]/g, " ");
        const utterance = new SpeechSynthesisUtterance(cleanedText);
        utterance.rate = newRate;
        const voices = window.speechSynthesis.getVoices();
        const targetVoice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural"))) || voices[0];
        if (targetVoice) utterance.voice = targetVoice;
        utterance.onend = () => { setIsPlayingSpeech(false); setIsPausedSpeech(false); };
        setIsPlayingSpeech(true);
        window.speechSynthesis.speak(utterance);
      }, 50);
    }
  };

  // Clean speaking synthesizers when changing tabs or routes
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [activeTab]);

  // --- Interactive Classroom Drawing Sandbox ---
  const [isSketchpadOpen, setIsSketchpadOpen] = useState(false);
  const [brushColor, setBrushColor] = useState('#4f46e5');
  const [brushWidth, setBrushWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  // Initialize sketch board canvas scale
  useEffect(() => {
    if (!isSketchpadOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    canvas.style.width = `${canvas.offsetWidth}px`;
    canvas.style.height = `${canvas.offsetHeight}px`;

    const context = canvas.getContext("2d");
    if (context) {
      context.scale(2, 2);
      context.lineCap = "round";
      context.strokeStyle = brushColor;
      context.lineWidth = brushWidth;
      contextRef.current = context;
    }
  }, [isSketchpadOpen]);

  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = brushColor;
      contextRef.current.lineWidth = brushWidth;
    }
  }, [brushColor, brushWidth]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!contextRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      if (e.cancelable) e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    contextRef.current.lineTo(x, y);
    contextRef.current.stroke();
  };

  const stopDrawing = () => {
    if (!contextRef.current) return;
    contextRef.current.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!canvasRef.current || !contextRef.current) return;
    const canvas = canvasRef.current;
    // Account for 2x scale scaling clear rect area
    contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
  };

  const getTierColorClass = () => {
    if (lesson.type === 'remedial') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (lesson.type === 'advanced') return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-indigo-100 text-indigo-800 border-indigo-200';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" id="active-session-module">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
            title="Leave classroom"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="h-6 w-px bg-gray-200" />
 
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-gray-950 text-base md:text-lg">
                Active Study Session
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-3xs font-bold uppercase border ${getTierColorClass()}`}>
                {lesson.type} tier
              </span>
            </div>
            <p className="text-xs text-gray-500 font-sans mt-0.5">
              Subject: <span className="font-semibold text-gray-700">{lesson.subject}</span> • Student: <span className="font-semibold text-indigo-600">{student.name}</span> ({lesson.gradeLevel})
            </p>
          </div>
        </div>
 
        <div className="flex items-center gap-2">
          {/* Real-time board whiteboard canvas button */}
          <button
            onClick={() => setIsSketchpadOpen(!isSketchpadOpen)}
            className={`flex items-center gap-1.5 px-3.5 py-2 border text-xs font-semibold rounded-lg transition ${
              isSketchpadOpen 
                ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold" 
                : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
            }`}
            title="Open math & scribble sandbox chalk board"
          >
            <Paintbrush className="w-4 h-4 text-indigo-600 animate-pulse" />
            <span>{isSketchpadOpen ? "Hide Sandbox Board" : "Sandbox Board"}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg transition"
            title="Print worksheet & reading package"
          >
            <Printer className="w-4 h-4 text-indigo-600" />
            <span>Print Worksheet</span>
          </button>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg transition"
          >
            <X className="w-4 h-4" />
            <span>Abandon Classroom</span>
          </button>
        </div>
      </header>

      {/* Main Educational Workspace split */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 p-6 print:hidden">
        {/* Left Side: Teacher Assistant Rail (Guides, Plans, Stumbles) */}
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5">
              <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-md">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="font-display font-semibold text-sm text-gray-900">
                Teacher's Lesson Assistant
              </h3>
            </div>

            {/* Lesson Hook */}
            <div className="space-y-1.5">
              <span className="text-3xs font-bold text-indigo-600 uppercase tracking-wider block">
                Lesson Hook (Introduce)
              </span>
              <p className="text-xs leading-relaxed text-gray-600 bg-indigo-50/30 border border-indigo-100/10 p-3 rounded-lg">
                {lesson.teacher_guide.split('\n')[0] || lesson.teacher_guide}
              </p>
            </div>

            {/* Lesson Pacing Plan */}
            <div className="space-y-2 pt-3 border-t border-gray-100">
              <span className="text-3xs font-bold text-slate-500 uppercase tracking-wider block">
                Direct teaching instructions
              </span>
              <div className="text-xs text-gray-600 space-y-2 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto pr-1">
                {lesson.teacher_guide}
              </div>
            </div>

            {/* Key Pacing Stages */}
            <div className="space-y-2 pt-3 border-t border-gray-100">
              <span className="text-3xs font-bold text-slate-500 uppercase tracking-wider block">
                Lesson pacing timeline
              </span>
              <div className="text-xs text-gray-600 space-y-2 whitespace-pre-line leading-relaxed">
                {lesson.lesson_plan}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Educational Stage (Book, Worksheets, Homework) */}
        <div className={`${isSketchpadOpen ? 'xl:col-span-6' : 'xl:col-span-9'} flex flex-col bg-white border border-gray-200 rounded-2xl shadow-2xs overflow-hidden transition-all duration-300`}>
          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 bg-slate-50/50">
            <button
              onClick={() => setActiveTab('teach')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
                activeTab === 'teach'
                  ? 'border-indigo-600 bg-white text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>1. Read & Learn</span>
            </button>
            <button
              onClick={() => setActiveTab('worksheet')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
                activeTab === 'worksheet'
                  ? 'border-indigo-600 bg-white text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>2. Worksheet & Grading</span>
            </button>
            <button
              onClick={() => setActiveTab('homework')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
                activeTab === 'homework'
                  ? 'border-indigo-600 bg-white text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>3. Homework Tasks</span>
            </button>
          </div>

          {/* Core Scrollable Panel */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto max-h-[calc(100vh-220px)] prose prose-indigo max-w-none">
            {/* Tab 1: Teach Panel */}
            {activeTab === 'teach' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4 gap-y-2 border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <BookOpenCheck className="w-6 h-6" />
                    <h2 className="text-xl font-display font-bold text-gray-900 m-0">
                      Topic Reading: {lesson.topic}
                    </h2>
                  </div>

                  {/* Browser TTS Audio Player Ribbon */}
                  <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200/60 px-3.5 py-1.5 rounded-xl text-xs font-sans">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={speakReadingMaterial}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white text-[11px] font-semibold rounded-lg transition"
                      >
                        {isPlayingSpeech && !isPausedSpeech ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 text-emerald-450 fill-emerald-400" />}
                        <span>{isPlayingSpeech ? (isPausedSpeech ? "Resume" : "Mute Reader") : "Listen Aloud"}</span>
                      </button>

                      {isPlayingSpeech && (
                        <button
                          onClick={stopSpeech}
                          className="p-1.5 border border-gray-200 hover:bg-white text-gray-600 hover:text-red-650 rounded-lg transition"
                        >
                          <Square className="w-3 h-3 fill-current text-red-500" />
                        </button>
                      )}
                    </div>

                    <div className="h-4 w-px bg-slate-200" />

                    <div className="flex items-center gap-1 border border-gray-200 bg-white p-0.5 rounded-lg text-[10px]">
                      {[0.8, 1, 1.2].map((r) => (
                        <button
                          key={r}
                          onClick={() => handleRateChange(r)}
                          className={`px-2 py-0.5 font-bold rounded-sm transition ${
                            speechRate === r 
                              ? "bg-indigo-150 text-indigo-700 font-extrabold" 
                              : "text-gray-500 hover:bg-gray-100"
                          }`}
                        >
                          {r}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div 
                  className="text-gray-700 font-sans leading-relaxed text-base space-y-4 m-0 border-l-4 border-indigo-100 pl-4 whitespace-pre-line"
                  id="reading-material-pane"
                >
                  {lesson.reading_material}
                </div>

                <div className="flex justify-end pt-8">
                  <button
                    onClick={() => setActiveTab('worksheet')}
                    className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition shadow-xs"
                  >
                    <span>Proceed to Worksheet</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Worksheet Panel */}
            {activeTab === 'worksheet' && (
              <div className="space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-xl font-display font-bold text-gray-900 m-0">Interactive Assessment</h2>
                    <p className="text-xs text-gray-500 mt-1">Complete the quiz below to check subject mastery and compute adaptive milestones.</p>
                  </div>

                  {gradedResults && (
                    <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                      <Clock className="w-5 h-5 text-indigo-600" />
                      <div>
                        <span className="block text-3xs font-bold text-indigo-600 uppercase tracking-wider">Overall Score</span>
                        <span className="text-xl font-display font-bold text-indigo-900">{gradedResults.overallScorePercentage}%</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-8">
                  {lesson.worksheet.map((q, idx) => {
                    const isGraded = gradedResults?.grades?.[idx] !== undefined;
                    const gradeDetail = gradedResults?.grades?.[idx];
                    const selectedAns = studentAnswers[idx] || "";

                    return (
                      <div 
                        key={idx} 
                        className={`p-5 rounded-2xl border transition ${
                          isGraded 
                            ? gradeDetail?.isCorrect 
                              ? 'border-emerald-200 bg-emerald-50/20' 
                              : 'border-red-200 bg-red-50/20'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex items-center justify-center w-6 h-6 bg-slate-100 rounded-full text-xs font-semibold text-slate-700 mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-sm md:text-base m-0 mb-3 leading-snug">
                              {q.question}
                            </h4>

                            {/* Render based on Question Type */}
                            {q.type === 'multiple_choice' ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                {q.options.map((option, optIdx) => {
                                  const isSelected = selectedAns === option;
                                  return (
                                    <button
                                      key={optIdx}
                                      type="button"
                                      disabled={gradedResults !== null}
                                      onClick={() => handleSelectOption(idx, option)}
                                      className={`p-3.5 rounded-xl border text-left text-xs font-medium transition duration-150 ${
                                        isSelected
                                          ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                                          : "bg-white border-gray-100 hover:border-gray-200 text-gray-700 hover:bg-slate-50"
                                      }`}
                                    >
                                      {option}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="mt-4">
                                <textarea
                                  value={selectedAns}
                                  disabled={gradedResults !== null}
                                  onChange={(e) => handleTextChange(idx, e.target.value)}
                                  placeholder="Type your structured educational response here..."
                                  rows={q.type === 'essay' ? 5 : 2}
                                  className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm md:text-xs font-medium focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-inner"
                                />
                              </div>
                            )}

                            {/* Grading Feedbacks */}
                            {isGraded && gradeDetail && (
                              <div className={`mt-4 p-3 rounded-lg flex gap-2.5 items-start text-xs ${
                                gradeDetail.isCorrect 
                                  ? 'bg-emerald-50 text-emerald-800' 
                                  : 'bg-red-50 text-red-800'
                              }`}>
                                {gradeDetail.isCorrect ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                                )}
                                <div>
                                  <div className="font-bold flex items-center gap-1.5">
                                    <span>{gradeDetail.isCorrect ? "Correct" : "Corrective Feedback"}</span>
                                    <span>•</span>
                                    <span className="text-3xs tracking-wider uppercase bg-white/60 px-1.5 py-0.5 rounded-sm">
                                      Score: {gradeDetail.scorePoints}/10
                                    </span>
                                  </div>
                                  <p className="mt-1 leading-relaxed opacity-90">{gradeDetail.feedback}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Worksheet actions */}
                <div className="pt-6 border-t border-gray-100 flex flex-wrap gap-3 items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {!gradedResults ? (
                      <span>Complete all answers above and trigger AI evaluation check.</span>
                    ) : (
                      <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                        <ThumbsUp className="w-4 h-4" />
                        <span>AI check complete! Results can now be saved below.</span>
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!gradedResults ? (
                      <button
                        onClick={handleAutoGrade}
                        disabled={grading || Object.keys(studentAnswers).length < Math.min(2, lesson.worksheet.length)}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition shadow-xs"
                      >
                        {grading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Grading...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Validate answers with AI</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={handleCompleteAndSync}
                        disabled={submittingProgress}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition shadow-sm"
                      >
                        {submittingProgress ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Syncing Database...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Finish & Record Lesson</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Homework Panel */}
            {activeTab === 'homework' && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Award className="w-6 h-6" />
                  <h2 className="text-xl font-display font-bold text-gray-900 m-0">
                    Independent Study & Homework
                  </h2>
                </div>

                <div 
                  className="bg-slate-50 border border-slate-150 rounded-2xl p-6 text-gray-700 font-sans leading-relaxed text-sm whitespace-pre-line"
                  id="homework-pane"
                >
                  {lesson.homework}
                </div>

                <div className="flex justify-end gap-3 pt-8">
                  <button
                    onClick={() => setActiveTab('worksheet')}
                    className="px-5 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-xs uppercase tracking-wider rounded-xl transition"
                  >
                    Return to Worksheet
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Classroom Sandbox Drawing Sketchpad */}
        {isSketchpadOpen && (
          <div className="xl:col-span-3 flex flex-col bg-slate-900 border border-slate-950 rounded-2xl shadow-sm text-white overflow-hidden h-[calc(100vh-230px)] min-h-[400px]">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paintbrush className="w-4 h-4 text-indigo-400 animate-pulse" />
                <h3 className="font-display font-black text-xs uppercase tracking-wider text-slate-100">Sandbox Draw Panel</h3>
              </div>
              <button 
                onClick={() => setIsSketchpadOpen(false)}
                className="text-slate-400 hover:text-slate-100 p-1 bg-slate-900 rounded-md text-3xs font-bold font-sans uppercase"
              >
                Hide
              </button>
            </div>

            {/* Drawing Canvas Area wrapper */}
            <div className="flex-1 relative bg-slate-950 p-2 min-h-[160px] flex items-center justify-center">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-full bg-slate-950 border border-dashed border-slate-800 rounded-lg cursor-crosshair touch-none"
              />
            </div>

            {/* Drawing controls toolbar bottom overlay */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-3 font-sans">
              {/* Palette chooser */}
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">Pens</span>
                <div className="flex gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg">
                  {[
                    { color: '#4f46e5', label: 'Indigo' },     // Indigo
                    { color: '#10b981', label: 'Emerald' },    // Emerald
                    { color: '#f43f5e', label: 'Rose' },       // Rose
                    { color: '#ffffff', label: 'White' }       // White
                  ].map((item) => (
                    <button
                      key={item.color}
                      onClick={() => setBrushColor(item.color)}
                      style={{ backgroundColor: item.color }}
                      className={`w-4.5 h-4.5 rounded-full border transition-all ${
                        brushColor === item.color 
                          ? 'border-white scale-110 ring-2 ring-indigo-500/30' 
                          : 'border-transparent hover:scale-105'
                      }`}
                      title={item.label}
                    />
                  ))}
                  {/* Eraser preset (background-matching) */}
                  <button
                    onClick={() => setBrushColor('#020617')} 
                    className={`p-1 rounded-md text-slate-300 transition ${
                      brushColor === '#020617' 
                        ? 'bg-indigo-650 text-white font-bold ring-1 ring-white/10' 
                        : 'hover:bg-slate-850 text-gray-400'
                    }`}
                    title="Eraser tool"
                  >
                    <Eraser className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Stroke Size choice */}
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">Width</span>
                <div className="flex items-center gap-1">
                  {[1.5, 3, 6].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setBrushWidth(sz)}
                      className={`px-2 py-0.5 text-[9px] font-bold rounded-sm bg-slate-900 border border-slate-800 transition ${
                        brushWidth === sz 
                          ? 'border-indigo-500 text-indigo-400 font-extrabold' 
                          : 'text-slate-450 hover:bg-slate-800'
                      }`}
                    >
                      {sz === 1.5 ? 'Fine' : sz === 3 ? 'Mid' : 'Thick'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action utilities */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[9px] text-slate-500 italic max-w-[120px] leading-tight">
                  Sketch diagrams or math equations!
                </span>
                
                <button
                  onClick={clearCanvas}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-red-400 hover:text-red-150 bg-red-950/40 hover:bg-red-950 border border-red-900/40 rounded-lg transition"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Wipe</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Printable Paper Version (Visible ONLY during media print) */}
      <div className="hidden print:block font-serif text-black p-10 max-w-4xl mx-auto space-y-8 bg-white min-h-screen" id="printable-area">
        {/* Header Block */}
        <div className="border-b-4 border-double border-black pb-4 text-center">
          <div className="text-[10px] tracking-widest font-sans font-bold uppercase text-gray-500 mb-1">
            Standard Curriculum Study Worksheet
          </div>
          <h1 className="text-3xl font-bold tracking-tight uppercase font-serif">
            {lesson.subject} Work Pack
          </h1>
          <p className="text-sm italic mt-1 font-sans">
            Syllabus Unit: {lesson.topic} ({lesson.gradeLevel}) • Level: {lesson.type.toUpperCase()} Pathway
          </p>
          
          <div className="grid grid-cols-2 gap-4 mt-6 text-left text-xs font-sans">
            <div className="border-b border-black pb-1">
              <strong>Student Name:</strong> <span className={student.name ? "font-serif text-sm font-semibold text-gray-900" : ""}>{student.name || "___________________________"}</span>
            </div>
            <div className="border-b border-black pb-1">
              <strong>Date:</strong> <span className="font-serif text-sm text-gray-900">{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="col-span-2 flex justify-between items-center bg-gray-50 p-2 mt-2 rounded">
              <span><strong>Total Assessment Questions:</strong> {lesson.worksheet.length}</span>
              {gradedResults ? (
                <span className="font-bold text-sm bg-gray-200 px-2.5 py-0.5 rounded">
                  Evaluation Score: {gradedResults.overallScorePercentage}%
                </span>
              ) : (
                <span className="text-[10px] italic text-gray-500 uppercase font-bold tracking-tight">Blank Worksheet for Student Completion</span>
              )}
            </div>
          </div>
        </div>

        {/* Part 1: Comprehensive Reading Material */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold border-b-2 border-black pb-1 font-sans uppercase tracking-wide">
            I. Instructional Reading Assignment
          </h2>
          <div className="text-sm leading-relaxed whitespace-pre-line text-justify pl-2 font-serif text-gray-950">
            {lesson.reading_material}
          </div>
        </div>

        {/* Part 2: Formative Assessment Worksheet */}
        <div className="space-y-6 print-break-before pt-6">
          <h2 className="text-lg font-bold border-b-2 border-black pb-1 font-sans uppercase tracking-wide">
            II. Worksheet Exercises & Practice
          </h2>
          <p className="text-xs italic text-gray-600 font-sans">
            Instructions: Answer each of the prompts below clearly. Refer to section I concepts to justify your answers.
          </p>
          
          <div className="space-y-6">
            {lesson.worksheet.map((q, idx) => {
              const selectedAns = studentAnswers[idx] || "";
              const hasGrades = gradedResults?.grades?.[idx] !== undefined;
              const gradeDetail = gradedResults?.grades?.[idx];

              return (
                <div key={idx} className="space-y-3 print-avoid-break">
                  <div className="text-sm font-bold">
                    Question {idx + 1}: {q.question}
                  </div>
                  
                  {q.type === 'multiple_choice' ? (
                    <div className="grid grid-cols-2 gap-3 pl-4 text-xs font-serif">
                      {q.options.map((option, optIdx) => {
                        const letter = String.fromCharCode(65 + optIdx); // A, B, C, D
                        const isStudentChoice = selectedAns === option;
                        return (
                          <div key={optIdx} className="flex items-start gap-2">
                            <span className={`inline-block border text-center text-[10px] leading-4 w-5 h-5 rounded-md ${
                              isStudentChoice 
                                ? 'border-black font-bold bg-gray-200 text-black' 
                                : 'border-gray-400 text-gray-500'
                            }`}>
                              {letter}
                            </span>
                            <span className={isStudentChoice ? "font-bold underline" : ""}>
                              {option}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Written Responses */
                    <div className="pl-4 space-y-1">
                      {selectedAns ? (
                        <div className="bg-gray-50 border border-gray-200 p-3 rounded font-serif italic text-sm text-gray-800 whitespace-pre-line">
                          {selectedAns}
                        </div>
                      ) : (
                        <div className="space-y-2.5 pt-1">
                          <div className="border-b border-dashed border-gray-400 h-6"></div>
                          {q.type === 'essay' && (
                            <>
                              <div className="border-b border-dashed border-gray-400 h-6"></div>
                              <div className="border-b border-dashed border-gray-400 h-6"></div>
                              <div className="border-b border-dashed border-gray-400 h-6"></div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Grading results for printed reports */}
                  {hasGrades && gradeDetail && (
                    <div className="ml-4 mt-2 p-2.5 border border-gray-400 bg-gray-50 rounded text-3xs font-sans space-y-1">
                      <div className="flex justify-between items-center font-bold">
                        <span>AI EVALUATION STATUS: <span className={gradeDetail.isCorrect ? "text-emerald-800 font-bold" : "text-amber-850 font-bold"}>{gradeDetail.isCorrect ? "ACCEPTED / CORRECT" : "NEEDS REVISION / STUMBLE DETECTED"}</span></span>
                        <span>SCORE POINTS: {gradeDetail.scorePoints}/10</span>
                      </div>
                      <p className="italic text-gray-700 font-serif text-[11px]"><strong>Teacher Feedback:</strong> {gradeDetail.feedback}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Part 3: Homework Exercises */}
        <div className="space-y-4 print-break-before pt-6 pb-8">
          <h2 className="text-lg font-bold border-b-2 border-black pb-1 font-sans uppercase tracking-wide">
            III. Independent Homework Task
          </h2>
          <div className="text-sm leading-relaxed whitespace-pre-line pl-4 font-serif text-gray-950 border-l-4 border-gray-500">
            {lesson.homework}
          </div>
        </div>
      </div>

      {/* Styled overrides for paper layout */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          html, body {
            background-color: white !important;
            color: black !important;
            font-family: Georgia, Cambria, "Times New Roman", Times, serif !important;
          }
          #root, #active-session-module {
            background: white !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          @page {
            size: letter;
            margin: 0.8in;
          }
          .print-break-before {
            page-break-before: always !important;
            break-before: page !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}} />
    </div>
  );
}
