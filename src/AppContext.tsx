import React, { createContext, useContext, useEffect, useState } from 'react';
import { Student, Shiur, Lesson, StudentLessonRecord, Exam, ExamGrade, NightRegistration, StudentNightRecord, Treatment, PlannedAbsence } from './types';
import { auth, db, login, logout } from './firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

interface AppState {
  students: Student[];
  shiurim: Shiur[];
  subjects: string[];
  rooms: string[];
  subjectClasses: Record<string, string[]>;
  lessons: Lesson[];
  exams: Exam[];
  nightRegistrations: NightRegistration[];
  treatments: Treatment[];
  plannedAbsences: PlannedAbsence[];
  addStudent: (name: string, shiur: Shiur) => void;
  updateStudent: (id: string, updates: Partial<Student>) => void;
  removeStudent: (id: string) => void;
  addShiur: (s: Shiur) => void;
  removeShiur: (s: Shiur) => void;
  addSubject: (s: string) => void;
  removeSubject: (s: string) => void;
  addRoom: (r: string) => void;
  removeRoom: (r: string) => void;
  addSubjectClass: (subject: string, className: string) => void;
  removeSubjectClass: (subject: string, className: string) => void;
  startLesson: (subject: string, shiurim: Shiur[]) => string;
  updateLessonRecord: (lessonId: string, studentId: string, updates: Partial<StudentLessonRecord>) => void;
  finishLesson: (lessonId: string) => void;
  deleteLesson: (lessonId: string) => void;
  addExam: (exam: Omit<Exam, 'id' | 'grades'>) => string;
  updateExamGrade: (examId: string, studentId: string, grade: Partial<ExamGrade>) => void;
  deleteExam: (examId: string) => void;
  startNightRegistration: (shiurim: Shiur[]) => string;
  updateNightRecord: (nightId: string, studentId: string, updates: Partial<StudentNightRecord>) => void;
  finishNightRegistration: (nightId: string) => void;
  deleteNightRegistration: (nightId: string) => void;
  addTreatment: (t: Omit<Treatment, 'id'>) => Promise<void>;
  deleteTreatment: (id: string) => Promise<void>;
  addPlannedAbsence: (a: Omit<PlannedAbsence, 'id'>) => Promise<void>;
  deletePlannedAbsence: (id: string) => Promise<void>;
  logout: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, loading] = useAuthState(auth);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [shiurim, setShiurim] = useState<Shiur[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [rooms, setRooms] = useState<string[]>([]);
  const [subjectClasses, setSubjectClasses] = useState<Record<string, string[]>>({});
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [nightRegistrations, setNightRegistrations] = useState<NightRegistration[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [plannedAbsences, setPlannedAbsences] = useState<PlannedAbsence[]>([]);

  useEffect(() => {
    if (!user) return;

    const userId = user.uid;

    const qStudents = query(collection(db, `users/${userId}/students`), where('ownerId', '==', userId));
    const unsubStudents = onSnapshot(qStudents, snap => {
      setStudents(snap.docs.map(d => ({ ...(d.data() as any), id: d.id } as Student)));
    });

    const qLessons = query(collection(db, `users/${userId}/lessons`), where('ownerId', '==', userId));
    const unsubLessons = onSnapshot(qLessons, snap => {
      setLessons(snap.docs.map(d => ({ ...(d.data() as any), id: d.id } as Lesson)));
    });

    const qExams = query(collection(db, `users/${userId}/exams`), where('ownerId', '==', userId));
    const unsubExams = onSnapshot(qExams, snap => {
      setExams(snap.docs.map(d => ({ ...(d.data() as any), id: d.id } as Exam)));
    });

    const qNights = query(collection(db, `users/${userId}/nightRegistrations`), where('ownerId', '==', userId));
    const unsubNights = onSnapshot(qNights, snap => {
      setNightRegistrations(snap.docs.map(d => ({ ...(d.data() as any), id: d.id } as NightRegistration)));
    });

    const qTreatments = query(collection(db, `users/${userId}/treatments`), where('ownerId', '==', userId));
    const unsubTreatments = onSnapshot(qTreatments, snap => {
      setTreatments(snap.docs.map(d => ({ ...(d.data() as any), id: d.id } as Treatment)));
    });

    const qPlannedAbsences = query(collection(db, `users/${userId}/plannedAbsences`), where('ownerId', '==', userId));
    const unsubPlannedAbsences = onSnapshot(qPlannedAbsences, snap => {
      setPlannedAbsences(snap.docs.map(d => ({ ...(d.data() as any), id: d.id } as PlannedAbsence)));
    });

    const unsubSettings = onSnapshot(doc(db, `users/${userId}/settings/global`), snap => {
      if (snap.exists()) {
        const data = snap.data();
        setShiurim(data.shiurim || []);
        setSubjects(data.subjects || []);
        setRooms(data.rooms || []);
        setSubjectClasses(data.subjectClasses || {});
      } else {
        // If settings doc doesn't exist, try local migration
        migrateLocalData(userId);
      }
    });

    return () => {
      unsubStudents();
      unsubLessons();
      unsubExams();
      unsubNights();
      unsubTreatments();
      unsubPlannedAbsences();
      unsubSettings();
    };
  }, [user]);

  const migrateLocalData = async (userId: string) => {
    try {
      const localStudents = JSON.parse(localStorage.getItem('yeshiva-students') || '[]');
      const localShiurim = JSON.parse(localStorage.getItem('yeshiva-shiurim') || '[]');
      const localSubjects = JSON.parse(localStorage.getItem('yeshiva-subjects') || '[]');
      const localLessons = JSON.parse(localStorage.getItem('yeshiva-lessons') || '[]');
      const localExams = JSON.parse(localStorage.getItem('yeshiva-exams') || '[]');

      if (localShiurim.length || localSubjects.length) {
        await setDoc(doc(db, `users/${userId}/settings/global`), {
          shiurim: localShiurim,
          subjects: localSubjects,
          ownerId: userId,
          updatedAt: Date.now()
        }, { merge: true });
        
        for (const s of localStudents) {
          const { id, ...data } = s;
          await setDoc(doc(db, `users/${userId}/students/${s.id}`), {
            ...data, ownerId: userId, createdAt: Date.now(), updatedAt: Date.now()
          });
        }
        for (const l of localLessons) {
          const { id, ...data } = l;
          await setDoc(doc(db, `users/${userId}/lessons/${l.id}`), {
            ...data, ownerId: userId, createdAt: Date.now(), updatedAt: Date.now()
          });
        }
        for (const e of localExams) {
          const { id, ...data } = e;
          await setDoc(doc(db, `users/${userId}/exams/${e.id}`), {
            ...data, ownerId: userId, createdAt: Date.now(), updatedAt: Date.now()
          });
        }
        
        // Mark as migrated
        localStorage.removeItem('yeshiva-students');
        console.log('Migration completed!');
      }
    } catch(err) {
      console.error(err);
    }
  };

  const updateSettings = async (newShiurim: string[], newSubjects: string[], newRooms: string[] = rooms, newSubjectClasses: Record<string, string[]> = subjectClasses) => {
    if (!user) return;
    const ref = doc(db, `users/${user.uid}/settings/global`);
    await setDoc(ref, {
      shiurim: newShiurim,
      subjects: newSubjects,
      rooms: newRooms,
      subjectClasses: newSubjectClasses,
      ownerId: user.uid,
      updatedAt: Date.now()
    }, { merge: true });
  };

  const addStudent = async (name: string, shiur: Shiur) => {
    if (!user) return;
    const id = Date.now().toString();
    await setDoc(doc(db, `users/${user.uid}/students/${id}`), {
      name,
      shiur,
      ownerId: user.uid,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  };

  const updateStudent = async (id: string, updates: Partial<Student>) => {
    if (!user) return;
    await updateDoc(doc(db, `users/${user.uid}/students/${id}`), {
      ...updates,
      updatedAt: Date.now()
    });
  };

  const removeStudent = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, `users/${user.uid}/students/${id}`));
  };

  const addShiur = async (s: Shiur) => {
    if (!shiurim.includes(s)) {
      await updateSettings([...shiurim, s], subjects);
    }
  };

  const removeShiur = async (s: Shiur) => {
    await updateSettings(shiurim.filter(shiur => shiur !== s), subjects);
  };

  const addSubject = async (s: string) => {
    if (!subjects.includes(s)) {
      await updateSettings(shiurim, [...subjects, s]);
    }
  };

  const removeSubject = async (s: string) => {
    const newClasses = { ...subjectClasses };
    delete newClasses[s];
    await updateSettings(shiurim, subjects.filter(subj => subj !== s), rooms, newClasses);
  };

  const addRoom = async (room: string) => {
    if (!rooms.includes(room)) {
      await updateSettings(shiurim, subjects, [...rooms, room], subjectClasses);
    }
  };

  const removeRoom = async (room: string) => {
    await updateSettings(shiurim, subjects, rooms.filter(r => r !== room), subjectClasses);
  };

  const addSubjectClass = async (subject: string, className: string) => {
    const currentClasses = subjectClasses[subject] || [];
    if (!currentClasses.includes(className)) {
      await updateSettings(shiurim, subjects, rooms, { ...subjectClasses, [subject]: [...currentClasses, className] });
    }
  };

  const removeSubjectClass = async (subject: string, className: string) => {
    const currentClasses = subjectClasses[subject] || [];
    await updateSettings(shiurim, subjects, rooms, { ...subjectClasses, [subject]: currentClasses.filter(c => c !== className) });
  };

  const startLesson = (subject: string, selectedShiurim: Shiur[]) => {
    if (!user) return "";
    
    // Check for planned absences
    const activeRecords: Record<string, StudentLessonRecord> = {};
    const now = new Date();
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    
    students.forEach(student => {
      // Check if student belongs to selected shiurim
      if (!selectedShiurim.includes(student.shiur)) return;

      const absence = plannedAbsences.find(pa => {
        if (pa.studentId !== student.id) return false;
        
        // Date check
        if (currentDateStr < pa.fromDate || currentDateStr > pa.toDate) return false;
        
        // Time check if defined and we are on the exact bounds
        if (pa.fromTime && currentDateStr === pa.fromDate && currentTimeStr < pa.fromTime) return false;
        if (pa.toTime && currentDateStr === pa.toDate && currentTimeStr > pa.toTime) return false;
        
        return true;
      });

      if (absence) {
        activeRecords[student.id] = {
          attendance: 'ABSENT',
          isAbsent: true,
          isAuthorizedAbsence: true,
          absenceNote: absence.reason,
          behavior1: null,
          behavior2: null
        };
      }
    });

    const id = Date.now().toString();
    const newLesson: Omit<Lesson, 'id'> = {
      date: now.toISOString(),
      subject,
      shiurim: selectedShiurim,
      records: activeRecords,
      isActive: true,
    };
    
    setDoc(doc(db, `users/${user.uid}/lessons/${id}`), {
      ...newLesson,
      ownerId: user.uid,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    return id;
  };

  const updateLessonRecord = async (lessonId: string, studentId: string, updates: Partial<StudentLessonRecord>) => {
    if (!user) return;
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) return;

    const currentRecord = lesson.records[studentId] || { attendance: null, behavior1: null, behavior2: null };
    const newRecords = {
      ...lesson.records,
      [studentId]: { ...currentRecord, ...updates }
    };

    await updateDoc(doc(db, `users/${user.uid}/lessons/${lessonId}`), {
      records: newRecords,
      updatedAt: Date.now()
    });
  };

  const finishLesson = async (lessonId: string) => {
    if (!user) return;
    await updateDoc(doc(db, `users/${user.uid}/lessons/${lessonId}`), {
      isActive: false,
      updatedAt: Date.now()
    });
  };

  const deleteLesson = async (lessonId: string) => {
    if (!user) return;
    await deleteDoc(doc(db, `users/${user.uid}/lessons/${lessonId}`));
  };

  const addExam = (examArgs: Omit<Exam, 'id' | 'grades'>) => {
    if (!user) return "";
    const id = Date.now().toString();
    
    setDoc(doc(db, `users/${user.uid}/exams/${id}`), {
      ...examArgs,
      grades: {},
      ownerId: user.uid,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    return id;
  };

  const updateExamGrade = async (examId: string, studentId: string, grade: Partial<ExamGrade>) => {
    if (!user) return;
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;

    const currentGrade = exam.grades[studentId] || { score: '', note: '' };
    const newGrades = {
      ...exam.grades,
      [studentId]: { ...currentGrade, ...grade }
    };

    await updateDoc(doc(db, `users/${user.uid}/exams/${examId}`), {
      grades: newGrades,
      updatedAt: Date.now()
    });
  };

  const deleteExam = async (examId: string) => {
    if (!user) return;
    await deleteDoc(doc(db, `users/${user.uid}/exams/${examId}`));
  };

  const startNightRegistration = (selectedShiurim: Shiur[]) => {
    if (!user) return "";
    
    // Check for planned absences
    const activeRecords: Record<string, StudentNightRecord> = {};
    const now = new Date();
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    
    students.forEach(student => {
      // Check if student belongs to selected shiurim
      if (!selectedShiurim.includes(student.shiur)) return;

      const absence = plannedAbsences.find(pa => {
        if (pa.studentId !== student.id) return false;
        
        // Date check
        if (currentDateStr < pa.fromDate || currentDateStr > pa.toDate) return false;
        
        // Time check if defined and we are on the exact bounds
        if (pa.fromTime && currentDateStr === pa.fromDate && currentTimeStr < pa.fromTime) return false;
        if (pa.toTime && currentDateStr === pa.toDate && currentTimeStr > pa.toTime) return false;
        
        return true;
      });

      if (absence) {
        activeRecords[student.id] = {
          isRoomAbsent: true,
          notes: absence.reason
        };
      }
    });

    const id = Date.now().toString();
    setDoc(doc(db, `users/${user.uid}/nightRegistrations/${id}`), {
      date: now.toISOString(),
      shiurim: selectedShiurim,
      records: activeRecords,
      isActive: true,
      ownerId: user.uid,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    return id;
  };

  const updateNightRecord = async (nightId: string, studentId: string, updates: Partial<StudentNightRecord>) => {
    if (!user) return;
    const night = nightRegistrations.find(n => n.id === nightId);
    if (!night) return;

    const currentRecord = night.records[studentId] || {};
    const mergedRecord = { ...currentRecord, ...updates };
    
    // Firebase doesn't support undefined values, so we delete keys that are explicitly undefined
    Object.keys(mergedRecord).forEach(key => {
      const k = key as keyof typeof mergedRecord;
      if (mergedRecord[k] === undefined) {
        delete mergedRecord[k];
      }
    });

    const newRecords = {
      ...night.records,
      [studentId]: mergedRecord
    };

    await updateDoc(doc(db, `users/${user.uid}/nightRegistrations/${nightId}`), {
      records: newRecords,
      updatedAt: Date.now()
    });
  };

  const finishNightRegistration = async (nightId: string) => {
    if (!user) return;
    await updateDoc(doc(db, `users/${user.uid}/nightRegistrations/${nightId}`), {
      isActive: false,
      updatedAt: Date.now()
    });
  };

  const deleteNightRegistration = async (nightId: string) => {
    if (!user) return;
    await deleteDoc(doc(db, `users/${user.uid}/nightRegistrations/${nightId}`));
  };

  const addTreatment = async (t: Omit<Treatment, 'id'>) => {
    if (!user) return;
    const id = Date.now().toString();
    await setDoc(doc(db, `users/${user.uid}/treatments/${id}`), {
      ...t,
      ownerId: user.uid,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  };

  const deleteTreatment = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, `users/${user.uid}/treatments/${id}`));
  };

  const addPlannedAbsence = async (a: Omit<PlannedAbsence, 'id'>) => {
    if (!user) return;
    const id = Date.now().toString();
    await setDoc(doc(db, `users/${user.uid}/plannedAbsences/${id}`), {
      ...a,
      ownerId: user.uid,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  };

  const deletePlannedAbsence = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, `users/${user.uid}/plannedAbsences/${id}`));
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center space-y-6">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ברוכים הבאים</h1>
          <p className="text-gray-500">המערכת עודכנה לגיבוי ענן! כדי שכל הנתונים יסתנכרו בין כל המכשירים שלך, יש להתחבר עם גוגל.</p>
          <button 
            onClick={login}
            className="w-full bg-orange-600 text-white hover:bg-orange-700 py-3 rounded-xl font-bold transition-colors shadow-lg hover:shadow-orange-600/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            התחברות מאובטחת
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{
      students, shiurim, subjects, rooms, subjectClasses, lessons, exams, nightRegistrations, treatments, plannedAbsences,
      addStudent, updateStudent, removeStudent, addShiur, removeShiur,
      addSubject, removeSubject, addRoom, removeRoom, addSubjectClass, removeSubjectClass,
      startLesson, updateLessonRecord, finishLesson, deleteLesson,
      addExam, updateExamGrade, deleteExam, 
      startNightRegistration, updateNightRecord, finishNightRegistration, deleteNightRegistration,
      addTreatment, deleteTreatment, addPlannedAbsence, deletePlannedAbsence,
      logout
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
