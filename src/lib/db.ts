import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  addDoc,
  deleteDoc
} from "firebase/firestore";
import { db } from "./firebase";
import { Student, StudentProgress, GeneratedLesson, StudentSubjectState, AttendanceLog, CourseWeightSettings, StudentResource } from "../types";

// LocalStorage key fallbacks
const LOCAL_STUDENTS_KEY = "hs_students";
const LOCAL_PROGRESS_KEY = "hs_progress";
const LOCAL_LESSONS_KEY = "hs_lessons";
const LOCAL_STATES_KEY = "hs_states";
const LOCAL_ATTENDANCE_KEY = "hs_attendance";

// Safe JSON parser helper
function getLocalData<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Local storage read error", e);
    return [];
  }
}

function saveLocalData<T>(key: string, data: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Local storage write error", e);
  }
}

// 1. Student Profiles
export async function seedSampleData(): Promise<Student> {
  const sampleStudent: Student = {
    id: "student_sample_arthur",
    name: "Arthur (Sample Profile)",
    gradeLevel: "Grade 5",
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000
  };

  const sampleProgress: StudentProgress[] = [
    {
      id: "prog_sample_1",
      studentId: "student_sample_arthur",
      subject: "Science",
      topic: "The Water Cycle",
      gradeLevel: "Grade 5",
      score: 85,
      totalQuestions: 4,
      correctAnswers: 3,
      answers: {
        0: "Evaporation, Condensation, Precipitation, Collection",
        1: "Warm temperatures increase water vapor capacity in air",
        2: "Sublimation from solid ice to gaseous atmosphere",
        3: "Gravity driving surface runoff downhill"
      },
      assessmentType: "standard",
      gradedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
      status: "passed",
      teacherFeedback: "Arthur did excellently. He clearly understood how solar radiation drives cycle stages. Next, he can explore modern weather systems."
    },
    {
      id: "prog_sample_2",
      studentId: "student_sample_arthur",
      subject: "Math",
      topic: "Introduction to Fractions",
      gradeLevel: "Grade 5",
      score: 55,
      totalQuestions: 4,
      correctAnswers: 2,
      answers: {
        0: "1/4",
        1: "Incorrectly added numerator and denominator",
        2: "2/3",
        3: "Misidentified visual representation"
      },
      assessmentType: "standard",
      gradedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      status: "remedial_needed",
      teacherFeedback: "Arthur struggled with visual fractions and identifying denominators. We triggered a modular remedial helper lesson to build intuition."
    },
    {
      id: "prog_sample_3",
      studentId: "student_sample_arthur",
      subject: "Math",
      topic: "Visual Fractions Mastery",
      gradeLevel: "Grade 5",
      score: 95,
      totalQuestions: 4,
      correctAnswers: 4,
      answers: {
        0: "Shaded three regions of the quadrant map",
        1: "Identified visual fraction correctly",
        2: "Identified correct equivalent fraction block",
        3: "True. Visual model shows perfect matching"
      },
      assessmentType: "remedial",
      gradedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
      status: "excelled",
      teacherFeedback: "Brilliant adaptation! Arthur responded exceptionally well to interactive sensory fractional pieces. Ready to resume standard syllabus."
    }
  ];

  const sampleStates: StudentSubjectState[] = [
    {
      studentId: "student_sample_arthur",
      subject: "science",
      currentTopic: "The Carbon Cycle",
      masteryLevel: 85,
      history: ["The Water Cycle"],
      needsRemediation: false
    },
    {
      studentId: "student_sample_arthur",
      subject: "math",
      currentTopic: "Adding Fractions with Like Denominators",
      masteryLevel: 75,
      history: ["Introduction to Fractions", "Visual Fractions Mastery"],
      needsRemediation: false
    },
    {
      studentId: "student_sample_arthur",
      subject: "history",
      currentTopic: "Ancient Egypt Civilizations",
      masteryLevel: 0,
      history: [],
      needsRemediation: false
    },
    {
      studentId: "student_sample_arthur",
      subject: "english",
      currentTopic: "Understanding Parts of Speech",
      masteryLevel: 0,
      history: [],
      needsRemediation: false
    }
  ];

  try {
    await setDoc(doc(db, "students", sampleStudent.id), sampleStudent);
    for (const prog of sampleProgress) {
      await setDoc(doc(db, "progress", prog.id), prog);
    }
    for (const state of sampleStates) {
      await setDoc(doc(db, "subjectStates", `${state.studentId}_${state.subject}`), state);
    }
  } catch (err) {
    console.warn("Could not seed Firestore with sample profile (probably offline); using localStorage instead", err);
  }

  // Save/merge to LocalStorage
  const existingLocalStudents = getLocalData<Student>(LOCAL_STUDENTS_KEY);
  if (!existingLocalStudents.some(s => s.id === sampleStudent.id)) {
    existingLocalStudents.push(sampleStudent);
    saveLocalData(LOCAL_STUDENTS_KEY, existingLocalStudents);
  }

  const existingLocalProgress = getLocalData<StudentProgress>(LOCAL_PROGRESS_KEY);
  for (const prog of sampleProgress) {
    if (!existingLocalProgress.some(p => p.id === prog.id)) {
      existingLocalProgress.push(prog);
    }
  }
  saveLocalData(LOCAL_PROGRESS_KEY, existingLocalProgress);

  const existingLocalStates = getLocalData<StudentSubjectState>(LOCAL_STATES_KEY);
  for (const state of sampleStates) {
    const filtered = existingLocalStates.filter(s => !(s.studentId === state.studentId && s.subject === state.subject));
    filtered.push(state);
    saveLocalData(LOCAL_STATES_KEY, filtered);
  }

  return sampleStudent;
}

export async function getStudents(): Promise<Student[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "students"));
    const students: Student[] = [];
    querySnapshot.forEach((doc) => {
      students.push({ id: doc.id, ...doc.data() } as Student);
    });

    if (students.length === 0) {
      const sample = await seedSampleData();
      students.push(sample);
    }

    // Sync with local memory as backup
    saveLocalData(LOCAL_STUDENTS_KEY, students);
    return students;
  } catch (error) {
    console.warn("Firestore offline, loading from localStorage", error);
    const local = getLocalData<Student>(LOCAL_STUDENTS_KEY);
    if (local.length === 0) {
      const sample = await seedSampleData();
      local.push(sample);
      saveLocalData(LOCAL_STUDENTS_KEY, local);
    }
    return local;
  }
}

export async function createStudent(name: string, gradeLevel: string): Promise<Student> {
  const newStudent: Student = {
    id: `student_${Date.now()}`,
    name,
    gradeLevel,
    createdAt: Date.now()
  };

  try {
    await setDoc(doc(db, "students", newStudent.id), newStudent);
  } catch (error) {
    console.warn("Firestore offline, creating student locally", error);
  }

  // Always update client-side cache
  const local = getLocalData<Student>(LOCAL_STUDENTS_KEY);
  local.push(newStudent);
  saveLocalData(LOCAL_STUDENTS_KEY, local);

  return newStudent;
}

export async function deleteStudent(studentId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "students", studentId));
    // Remove associated data
    const progressQ = query(collection(db, "progress"), where("studentId", "==", studentId));
    const progressSnap = await getDocs(progressQ);
    for (const d of progressSnap.docs) await deleteDoc(d.ref);

    const attendanceQ = query(collection(db, "attendance"), where("studentId", "==", studentId));
    const attendanceSnap = await getDocs(attendanceQ);
    for (const d of attendanceSnap.docs) await deleteDoc(d.ref);

    const resourcesQ = query(collection(db, "resources"), where("studentId", "==", studentId));
    const resourcesSnap = await getDocs(resourcesQ);
    for (const d of resourcesSnap.docs) await deleteDoc(d.ref);
  } catch (error) {
    console.warn("Firestore offline, deleting student locally", error);
  }

  // Purge from all localStorage caches
  const students = getLocalData<Student>(LOCAL_STUDENTS_KEY);
  saveLocalData(LOCAL_STUDENTS_KEY, students.filter((s) => s.id !== studentId));

  const progress = getLocalData<StudentProgress>(LOCAL_PROGRESS_KEY);
  saveLocalData(LOCAL_PROGRESS_KEY, progress.filter((p) => p.studentId !== studentId));

  const attendance = getLocalData<AttendanceLog>(LOCAL_ATTENDANCE_KEY);
  saveLocalData(LOCAL_ATTENDANCE_KEY, attendance.filter((a) => a.studentId !== studentId));
}

// 2. Generated Lessons
export async function saveGeneratedLesson(lesson: GeneratedLesson): Promise<void> {
  try {
    await setDoc(doc(db, "lessons", lesson.id), lesson);
  } catch (error) {
    console.warn("Firestore offline, saving lesson locally", error);
  }

  const local = getLocalData<GeneratedLesson>(LOCAL_LESSONS_KEY);
  // Prevent duplicate keys
  const filtered = local.filter((l) => l.id !== lesson.id);
  filtered.push(lesson);
  saveLocalData(LOCAL_LESSONS_KEY, filtered);
}

export async function getLesson(subject: string, topic: string, gradeLevel: string, type: 'standard' | 'remedial' | 'advanced'): Promise<GeneratedLesson | null> {
  try {
    const q = query(
      collection(db, "lessons"), 
      where("subject", "==", subject),
      where("topic", "==", topic),
      where("gradeLevel", "==", gradeLevel),
      where("type", "==", type)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data();
      return { id: querySnapshot.docs[0].id, ...data } as GeneratedLesson;
    }
  } catch (error) {
    console.warn("Firestore offline, checking cache for lesson", error);
  }

  const local = getLocalData<GeneratedLesson>(LOCAL_LESSONS_KEY);
  const found = local.find(
    (l) => 
      l.subject.toLowerCase() === subject.toLowerCase() && 
      l.topic.toLowerCase() === topic.toLowerCase() && 
      l.gradeLevel === gradeLevel && 
      l.type === type
  );
  return found || null;
}

// 3. Student Subject State (Tracks current mastery & adaptive recommendations)
export async function getStudentSubjectState(studentId: string, subject: string): Promise<StudentSubjectState> {
  const defaultState: StudentSubjectState = {
    studentId,
    subject,
    currentTopic: getInitialTopicForSubject(subject),
    masteryLevel: 0,
    history: [],
    needsRemediation: false
  };

  try {
    const docRef = doc(db, "subjectStates", `${studentId}_${subject}`);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as StudentSubjectState;
    }
  } catch (error) {
    console.warn("Firestore offline, reading subject states from cache", error);
  }

  const local = getLocalData<StudentSubjectState>(LOCAL_STATES_KEY);
  const found = local.find((s) => s.studentId === studentId && s.subject.toLowerCase() === subject.toLowerCase());
  return found || defaultState;
}

export async function updateStudentSubjectState(state: StudentSubjectState): Promise<void> {
  try {
    const docRef = doc(db, "subjectStates", `${state.studentId}_${state.subject}`);
    await setDoc(docRef, state);
  } catch (error) {
    console.warn("Firestore offline, saving subject state locally", error);
  }

  const local = getLocalData<StudentSubjectState>(LOCAL_STATES_KEY);
  const filtered = local.filter((s) => !(s.studentId === state.studentId && s.subject.toLowerCase() === state.subject.toLowerCase()));
  filtered.push(state);
  saveLocalData(LOCAL_STATES_KEY, filtered);
}

// Helper to offer default topics list
function getInitialTopicForSubject(subject: string): string {
  switch (subject.toLowerCase()) {
    case "math":
      return "Introduction to Fractions";
    case "science":
      return "The Water Cycle";
    case "history":
      return "Ancient Egypt Civilizations";
    case "english":
      return "Understanding Parts of Speech";
    default:
      return "Basic Principles";
  }
}

// 4. Student Progress Logs (Historical grading results)
export async function saveProgress(progress: StudentProgress): Promise<void> {
  try {
    await setDoc(doc(db, "progress", progress.id), progress);
  } catch (error) {
    console.warn("Firestore offline, logging progress locally", error);
  }

  const local = getLocalData<StudentProgress>(LOCAL_PROGRESS_KEY);
  const filtered = local.filter((p) => p.id !== progress.id);
  filtered.push(progress);
  saveLocalData(LOCAL_PROGRESS_KEY, filtered);
}

export async function getStudentProgressHistory(studentId: string): Promise<StudentProgress[]> {
  try {
    const q = query(
      collection(db, "progress"),
      where("studentId", "==", studentId),
      orderBy("gradedAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    const results: StudentProgress[] = [];
    querySnapshot.forEach((doc) => {
      results.push({ id: doc.id, ...doc.data() } as StudentProgress);
    });
    // Backup to local
    const local = getLocalData<StudentProgress>(LOCAL_PROGRESS_KEY);
    const updatedLocal = local.filter((p) => p.studentId !== studentId).concat(results);
    saveLocalData(LOCAL_PROGRESS_KEY, updatedLocal);
    
    return results;
  } catch (error) {
    console.warn("Firestore offline, fetching historical logs from local storage", error);
    const local = getLocalData<StudentProgress>(LOCAL_PROGRESS_KEY);
    return local
      .filter((p) => p.studentId === studentId)
      .sort((a, b) => b.gradedAt - a.gradedAt);
  }
}

// 5. Attendance & Hours Logs
export async function getStudentAttendanceHistory(studentId: string): Promise<AttendanceLog[]> {
  try {
    const q = query(
      collection(db, "attendance"),
      where("studentId", "==", studentId),
      orderBy("date", "desc")
    );
    const querySnapshot = await getDocs(q);
    const results: AttendanceLog[] = [];
    querySnapshot.forEach((doc) => {
      results.push({ id: doc.id, ...doc.data() } as AttendanceLog);
    });

    // Backup to local
    const local = getLocalData<AttendanceLog>(LOCAL_ATTENDANCE_KEY);
    const updatedLocal = local.filter((a) => a.studentId !== studentId).concat(results);
    saveLocalData(LOCAL_ATTENDANCE_KEY, updatedLocal);

    return results;
  } catch (error) {
    console.warn("Firestore offline, fetching attendance from local storage", error);
    const local = getLocalData<AttendanceLog>(LOCAL_ATTENDANCE_KEY);
    return local
      .filter((a) => a.studentId === studentId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }
}

export async function saveAttendanceLog(log: AttendanceLog): Promise<void> {
  try {
    await setDoc(doc(db, "attendance", log.id), log);
  } catch (error) {
    console.warn("Firestore offline, saving attendance log locally", error);
  }

  const local = getLocalData<AttendanceLog>(LOCAL_ATTENDANCE_KEY);
  const filtered = local.filter((a) => a.id !== log.id);
  filtered.push(log);
  saveLocalData(LOCAL_ATTENDANCE_KEY, filtered);
}

export async function deleteAttendanceLog(logId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "attendance", logId));
  } catch (error) {
    console.warn("Firestore offline, deleting attendance log locally", error);
  }

  const local = getLocalData<AttendanceLog>(LOCAL_ATTENDANCE_KEY);
  const filtered = local.filter((a) => a.id !== logId);
  saveLocalData(LOCAL_ATTENDANCE_KEY, filtered);
}

// 6. Course Weight Settings
const LOCAL_WEIGHTS_KEY = "hs_weights";

export async function getCourseWeightSettings(studentId: string): Promise<CourseWeightSettings | null> {
  try {
    const docRef = doc(db, "courseWeights", studentId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as CourseWeightSettings;
    }
  } catch (error) {
    console.warn("Firestore offline, reading weights from cache", error);
  }

  const local = getLocalData<CourseWeightSettings>(LOCAL_WEIGHTS_KEY);
  return local.find((w) => w.studentId === studentId) ?? null;
}

export async function saveCourseWeightSettings(settings: CourseWeightSettings): Promise<void> {
  try {
    await setDoc(doc(db, "courseWeights", settings.studentId), settings);
  } catch (error) {
    console.warn("Firestore offline, saving weights locally", error);
  }

  const local = getLocalData<CourseWeightSettings>(LOCAL_WEIGHTS_KEY);
  const filtered = local.filter((w) => w.studentId !== settings.studentId);
  filtered.push(settings);
  saveLocalData(LOCAL_WEIGHTS_KEY, filtered);
}

// 7. Student Resources (Resource Vault)
const LOCAL_RESOURCES_KEY = "hs_resources";

export async function getStudentResources(studentId: string): Promise<StudentResource[]> {
  try {
    const q = query(
      collection(db, "resources"),
      where("studentId", "==", studentId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    const results: StudentResource[] = [];
    querySnapshot.forEach((d) => {
      results.push({ id: d.id, ...d.data() } as StudentResource);
    });

    const local = getLocalData<StudentResource>(LOCAL_RESOURCES_KEY);
    const merged = local.filter((r) => r.studentId !== studentId).concat(results);
    saveLocalData(LOCAL_RESOURCES_KEY, merged);

    return results;
  } catch (error) {
    console.warn("Firestore offline, fetching resources from local storage", error);
    const local = getLocalData<StudentResource>(LOCAL_RESOURCES_KEY);
    return local
      .filter((r) => r.studentId === studentId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }
}

export async function saveStudentResource(resource: StudentResource): Promise<void> {
  try {
    await setDoc(doc(db, "resources", resource.id), resource);
  } catch (error) {
    console.warn("Firestore offline, saving resource locally", error);
  }

  const local = getLocalData<StudentResource>(LOCAL_RESOURCES_KEY);
  const filtered = local.filter((r) => r.id !== resource.id);
  filtered.push(resource);
  saveLocalData(LOCAL_RESOURCES_KEY, filtered);
}

export async function deleteStudentResource(resourceId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "resources", resourceId));
  } catch (error) {
    console.warn("Firestore offline, deleting resource locally", error);
  }

  const local = getLocalData<StudentResource>(LOCAL_RESOURCES_KEY);
  const filtered = local.filter((r) => r.id !== resourceId);
  saveLocalData(LOCAL_RESOURCES_KEY, filtered);
}
