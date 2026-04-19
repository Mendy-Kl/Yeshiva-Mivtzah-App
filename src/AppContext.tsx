import React, { createContext, useContext } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Student, Shiur, Lesson, StudentLessonRecord, Exam, ExamGrade } from './types';

interface AppState {
  students: Student[];
  shiurim: Shiur[];
  subjects: string[];
  lessons: Lesson[];
  exams: Exam[];
  addStudent: (name: string, shiur: Shiur) => void;
  removeStudent: (id: string) => void;
  addShiur: (s: Shiur) => void;
  removeShiur: (s: Shiur) => void;
  addSubject: (s: string) => void;
  removeSubject: (s: string) => void;
  startLesson: (subject: string, shiurim: Shiur[]) => string;
  updateLessonRecord: (lessonId: string, studentId: string, updates: Partial<StudentLessonRecord>) => void;
  finishLesson: (lessonId: string) => void;
  deleteLesson: (lessonId: string) => void;
  addExam: (exam: Omit<Exam, 'id' | 'grades'>) => string;
  updateExamGrade: (examId: string, studentId: string, grade: Partial<ExamGrade>) => void;
  deleteExam: (examId: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [students, setStudents] = useLocalStorage<Student[]>('yeshiva-students', []);
  const [shiurim, setShiurim] = useLocalStorage<Shiur[]>('yeshiva-shiurim', []);
  const [subjects, setSubjects] = useLocalStorage<string[]>('yeshiva-subjects', []);
  const [lessons, setLessons] = useLocalStorage<Lesson[]>('yeshiva-lessons', []);
  const [exams, setExams] = useLocalStorage<Exam[]>('yeshiva-exams', []);

  const addStudent = (name: string, shiur: Shiur) => {
    const id = Date.now().toString();
    setStudents([...students, { id, name, shiur }]);
  };

  const removeStudent = (id: string) => {
    setStudents(students.filter(s => s.id !== id));
  };

  const addShiur = (s: Shiur) => {
    if (!shiurim.includes(s)) {
      setShiurim([...shiurim, s]);
    }
  };

  const removeShiur = (s: Shiur) => {
    setShiurim(shiurim.filter(shiur => shiur !== s));
  };

  const addSubject = (s: string) => {
    if (!subjects.includes(s)) {
      setSubjects([...subjects, s]);
    }
  };

  const removeSubject = (s: string) => {
    setSubjects(subjects.filter(subj => subj !== s));
  };

  const startLesson = (subject: string, selectedShiurim: Shiur[]) => {
    const newLesson: Lesson = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      subject,
      shiurim: selectedShiurim,
      records: {},
      isActive: true,
    };
    setLessons([...lessons, newLesson]);
    return newLesson.id;
  };

  const updateLessonRecord = (lessonId: string, studentId: string, updates: Partial<StudentLessonRecord>) => {
    setLessons(lessons.map(lesson => {
      if (lesson.id === lessonId) {
        const currentRecord = lesson.records[studentId] || { attendance: null, behavior1: null, behavior2: null };
        return {
          ...lesson,
          records: {
            ...lesson.records,
            [studentId]: { ...currentRecord, ...updates }
          }
        };
      }
      return lesson;
    }));
  };

  const finishLesson = (lessonId: string) => {
    setLessons(lessons.map(lesson => 
      lesson.id === lessonId ? { ...lesson, isActive: false } : lesson
    ));
  };

  const deleteLesson = (lessonId: string) => {
    setLessons(lessons.filter(lesson => lesson.id !== lessonId));
  };

  const addExam = (examArgs: Omit<Exam, 'id' | 'grades'>) => {
    const newExam: Exam = {
      ...examArgs,
      id: Date.now().toString(),
      grades: {}
    };
    setExams([...exams, newExam]);
    return newExam.id;
  };

  const updateExamGrade = (examId: string, studentId: string, grade: Partial<ExamGrade>) => {
    setExams(exams.map(exam => {
      if (exam.id === examId) {
        const currentGrade = exam.grades[studentId] || { score: '', note: '' };
        return {
          ...exam,
          grades: {
            ...exam.grades,
            [studentId]: { ...currentGrade, ...grade }
          }
        };
      }
      return exam;
    }));
  };

  const deleteExam = (examId: string) => {
    setExams(exams.filter(exam => exam.id !== examId));
  };

  return (
    <AppContext.Provider value={{
      students, shiurim, subjects, lessons, exams,
      addStudent, removeStudent, addShiur, removeShiur,
      addSubject, removeSubject,
      startLesson, updateLessonRecord, finishLesson, deleteLesson,
      addExam, updateExamGrade, deleteExam
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppStore must be used within AppProvider");
  return context;
}
