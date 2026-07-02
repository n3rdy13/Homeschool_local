export interface Student {
  id: string;
  name: string;
  gradeLevel: string; // "Grade 3" through "Grade 12"
  createdAt: number;
}

export interface StudentProgress {
  id: string;
  studentId: string;
  subject: string;
  topic: string;
  gradeLevel: string;
  score: number; // Percentage, e.g., 85
  totalQuestions: number;
  correctAnswers: number;
  answers: Record<number, string>; // question index -> user answer
  assessmentType: 'standard' | 'remedial' | 'advanced';
  teacherFeedback?: string;
  gradedAt: number;
  status: 'passed' | 'remedial_needed' | 'excelled';
}

export interface WorksheetQuestion {
  question: string;
  type: 'multiple_choice' | 'short_answer' | 'essay';
  options: string[]; // empty if short_answer or essay
  answer: string; // correct option text, or rubric details
}

export interface GeneratedLesson {
  id: string;
  subject: string;
  topic: string;
  gradeLevel: string;
  type: 'standard' | 'remedial' | 'advanced';
  teacher_guide: string;
  lesson_plan: string;
  reading_material: string;
  worksheet: WorksheetQuestion[];
  homework: string;
  createdAt: number;
}

export interface StudentSubjectState {
  studentId: string;
  subject: string;
  currentTopic: string;
  masteryLevel: number; // 0 to 100
  history: string[]; // List of completed topics
  needsRemediation: boolean;
  remediationTopic?: string;
}

export interface AttendanceLog {
  id: string;
  studentId: string;
  date: string; // ISO format e.g., "2026-06-22"
  hours: number; // Decimal hours studied, e.g., 3.5
  activityType: "Core Lesson" | "Independent Study" | "Field Trip" | "Science Lab" | "Art & Craft" | "Physical Ed" | "Other";
  description: string; // Brief detail
  notes?: string; // Optional longer comments
  createdAt: number;
}

export interface SubjectWeightConfig {
  creditHours: number; // e.g. 1.0, 0.5
  testWeight: number;  // percentage 0-100 (tests + quizzes + homework must = 100)
  quizWeight: number;
  homeworkWeight: number;
}

export interface CourseWeightSettings {
  id: string;
  studentId: string;
  subjects: Record<string, SubjectWeightConfig>; // key = subject name lowercase
  updatedAt: number;
}

export type ResourceType = 'link' | 'isbn' | 'file';

export interface StudentResource {
  id: string;
  studentId: string;
  type: ResourceType;
  title: string;
  description?: string;
  url?: string;
  isbn?: string;
  fileData?: string; // base64 encoded
  fileName?: string;
  fileSize?: number;
  createdAt: number;
}

