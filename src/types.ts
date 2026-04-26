export type Shiur = string;

export interface Student {
  id: string;
  name: string;
  shiur: Shiur;
  room?: string;
  subjectLevels?: Record<string, string>;
  chavrusas?: Record<string, string>;
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

export interface PlannedAbsence {
  id: string;
  studentId: string;
  fromDate: string;
  toDate: string;
  fromTime?: string;
  toTime?: string;
  reason: string;
}

export interface StudentNightRecord {
  roomMinutesLate?: number; // 0 or undefined means on time (if not absent)
  isRoomAbsent?: boolean;
  hamapilMinutesLate?: number; // 0 or undefined means on time
  talking?: boolean; // talking during sleep time
  notes?: string;
}

export interface Treatment {
  id: string;
  studentId: string;
  date: string;
  handler: string;
  issue: string;
  treatment: string;
}

export interface NightRegistration {
  id: string;
  date: string;
  shiurim: Shiur[];
  isActive: boolean;
  records: Record<string, StudentNightRecord>; // mapping studentId to their record
}
