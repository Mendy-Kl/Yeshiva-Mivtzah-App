export type Shiur = string;

export interface Student {
  id: string;
  name: string;
  shiur: Shiur;
}

export type Attendance = 'ON_TIME' | 'LATE' | 'ABSENT' | null;
export type Behavior = 'LEARNING' | 'PARTIAL' | 'NONE' | null;

export interface StudentLessonRecord {
  attendance: Attendance;
  minutesLate?: number;
  isAbsent?: boolean;
  isAuthorizedAbsence?: boolean;
  absenceNote?: string;
  lessonNote?: string;
  behavior1: Behavior;
  behavior2: Behavior;
}

export interface Lesson {
  id: string;
  date: string;
  subject: string;
  shiurim: Shiur[];
  records: Record<string, StudentLessonRecord>; // mapping studentId to their record
  isActive: boolean;
}

export interface ExamGrade {
  score: string;
  note: string;
}

export interface Exam {
  id: string;
  date: string;
  subject: string;
  material: string;
  shiurim: Shiur[];
  grades: Record<string, ExamGrade>; // mapping studentId to their grade
}
