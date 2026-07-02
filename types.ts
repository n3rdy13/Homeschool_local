export interface Student {
  id: string;
  name: string;
  gradeLevel: string; // e.g., "3rd Grade", "Middle School"
  createdAt: number;
}

export interface StudentProgress {
  id: string;
  studentId: string;
  subject: string; // Math, Science, History, English
  topic: string; // e.g., "Intro to Fractions"
  score: number; // 0 - 100
  assessmentType: "quiz" | "worksheet" | "test";
  status: "remedial_needed" | "satisfactory" | "excelled";
  gradedAt: number;
}

export interface GeneratedLesson {
  id: string;
  subject: string;
  topic: string;
  pacingType: "standard" | "remedial" | "advanced";
  sections: {
    title: string;
    content: string;
  }[];
  quiz: {
    question: string;
    options: string[];
    answerIndex: number;
  }[];
}

export interface StudentSubjectState {
  id: string; // "studentId_subject"
  studentId: string;
  subject: string;
  currentLevel: "standard" | "remedial" | "advanced";
  remedialTriggerCount: number;
}

export interface AttendanceLog {
  id: string;
  studentId: string;
  date: string; // ISO format e.g., "2026-06-22"
  hours: number; // Decimal hours studied, e.g., 3.5
  activityType: "Core Lesson" | "Independent Study" | "Field Trip" | "Science Lab" | "Art & Craft" | "Physical Ed" | "Other";
  description: string; // Brief activity description
  notes?: string; // Optional longer comments
  createdAt: number;
}