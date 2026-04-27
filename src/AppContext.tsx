import React, { createContext, useContext, useEffect, useState } from 'react';
import { Student, Shiur, Lesson, StudentLessonRecord, Exam, ExamGrade, NightRegistration, StudentNightRecord, Treatment, PlannedAbsence } from './types';
import { auth, db, login, loginRedirect, logout } from './firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, getDoc, getDocs } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

export interface StaffMember {
  id: string;
  email: string;
  role: 'admin' | 'teacher';
  name: string;
}

interface AppState {
  user: any;
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
  staffRole: 'admin' | 'teacher' | null;
  staffDirectory: StaffMember[];
  addStaff: (email: string, name: string, role: 'admin'|'teacher') => Promise<void>;
  removeStaff: (id: string, email: string) => Promise<void>;
  updateStaffRole: (id: string, newRole: 'admin'|'teacher') => Promise<void>;
  switchInstitution: () => void;
  currentInstitution: {id: string, name: string} | null;
  institutions: {id: string, name: string, role: string}[];
  updateInstitutionName: (newName: string) => Promise<void>;
  deleteInstitution: () => Promise<void>;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, loading] = useAuthState(auth);
  
  const [baseUid, setBaseUid] = useState<string | null>(null);
  const [staffRole, setStaffRole] = useState<'admin'|'teacher'|null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [institutions, setInstitutions] = useState<{id: string, name: string, role: string}[]>([]);
  const [showInstitutionSelector, setShowInstitutionSelector] = useState(false);

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
  const [staffDirectory, setStaffDirectory] = useState<StaffMember[]>([]);

  useEffect(() => {
    if (!user) {
      setBaseUid(null);
      setStaffRole(null);
      setAccessDenied(false);
      setInstitutions([]);
      setShowInstitutionSelector(false);
      return;
    }

    if (user.email) {
      const qOwned = query(collection(db, 'institutions'), where('ownerId', '==', user.uid));
      const qStaff = query(collection(db, 'staffDirectory'), where('email', '==', user.email.toLowerCase()));
      
      Promise.all([getDocs(qOwned), getDocs(qStaff)]).then(([snapOwned, snapStaff]) => {
        const ownedInsts = snapOwned.docs.map(d => ({
          id: d.id,
          name: d.data().name || "מוסד",
          role: 'admin'
        }));

        const fetchedInsts = snapStaff.docs.map(d => ({
          id: d.data().adminUid,
          name: d.data().institutionName || 'מוסד (צוות)',
          role: d.data().role
        }));
        
        let allInsts = [...ownedInsts, ...fetchedInsts];
        
        if (ownedInsts.length === 0 && fetchedInsts.length === 0) {
           // Default fallback so they have somewhere to start
           allInsts.push({
             id: user.uid,
             name: "המוסד שלי",
             role: 'admin'
           });
        } else if (ownedInsts.length === 0 && user.email === 'mmkl770@gmail.com') {
           allInsts.push({
             id: user.uid,
             name: "המוסד שלי (מנהל על)",
             role: 'admin'
           });
        } else if (ownedInsts.length === 0) {
            // Check if they had previous data using their UID somehow?
            // If we want to strictly keep their user.uid available, we can always push it:
            allInsts.push({
               id: user.uid,
               name: "המוסד שלי",
               role: 'admin'
            });
        }

        // Remove duplicates if any
        allInsts = allInsts.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
        setInstitutions(allInsts);

        const savedInstId = localStorage.getItem('selectedInstitution');
        const found = allInsts.find(i => i.id === savedInstId);

        if (found) {
          setBaseUid(found.id);
          setStaffRole(found.role as 'admin'|'teacher');
          setAccessDenied(false);
          setShowInstitutionSelector(false);
        } else if (allInsts.length > 1) {
          setBaseUid(null);
          setAccessDenied(false);
          setShowInstitutionSelector(true);
        } else if (allInsts.length === 1) {
          // Just one institution (theirs)
          setBaseUid(allInsts[0].id);
          setStaffRole(allInsts[0].role as 'admin'|'teacher');
          setAccessDenied(false);
          setShowInstitutionSelector(false);
        } else {
          setAccessDenied(true);
        }
      }).catch(err => {
        console.error("Failed to fetch institutions", err);
        setBaseUid(user.uid);
        setStaffRole('admin');
        setInstitutions([{ id: user.uid, name: "המוסד שלי", role: 'admin' }]);
        setShowInstitutionSelector(false);
      });
    } else {
      setBaseUid(user.uid);
      setStaffRole('admin');
      setInstitutions([{ id: user.uid, name: "המוסד שלי", role: 'admin' }]);
      setShowInstitutionSelector(false);
    }
  }, [user]);

  const selectInstitution = (id: string, role: string) => {
    localStorage.setItem('selectedInstitution', id);
    setBaseUid(id);
    setStaffRole(role as 'admin'|'teacher');
    setShowInstitutionSelector(false);
  };

  useEffect(() => {
    if (!baseUid) return;

    const userId = baseUid;

    const qStudents = query(collection(db, `users/${userId}/students`), where('ownerId', '==', userId));
    const unsubStudents = onSnapshot(qStudents, snap => {
      setStudents(snap.docs.map(d => ({ ...(d.data() as any), id: d.id } as Student)));
    }, err => console.error("Students snapshot err:", err));

    const qLessons = query(collection(db, `users/${userId}/lessons`), where('ownerId', '==', userId));
    const unsubLessons = onSnapshot(qLessons, snap => {
      setLessons(snap.docs.map(d => ({ ...(d.data() as any), id: d.id } as Lesson)));
    }, err => console.error("Lessons snapshot err:", err));

    const qExams = query(collection(db, `users/${userId}/exams`), where('ownerId', '==', userId));
    const unsubExams = onSnapshot(qExams, snap => {
      setExams(snap.docs.map(d => ({ ...(d.data() as any), id: d.id } as Exam)));
    }, err => console.error("Exams snapshot err:", err));

    const qNights = query(collection(db, `users/${userId}/nightRegistrations`), where('ownerId', '==', userId));
    const unsubNights = onSnapshot(qNights, snap => {
      setNightRegistrations(snap.docs.map(d => ({ ...(d.data() as any), id: d.id } as NightRegistration)));
    }, err => console.error("Nights snapshot err:", err));

    const qTreatments = query(collection(db, `users/${userId}/treatments`), where('ownerId', '==', userId));
    const unsubTreatments = onSnapshot(qTreatments, snap => {
      setTreatments(snap.docs.map(d => ({ ...(d.data() as any), id: d.id } as Treatment)));
    }, err => console.error("Treatments snapshot err:", err));

    const qPlannedAbsences = query(collection(db, `users/${userId}/plannedAbsences`), where('ownerId', '==', userId));
    const unsubPlannedAbsences = onSnapshot(qPlannedAbsences, snap => {
      setPlannedAbsences(snap.docs.map(d => ({ ...(d.data() as any), id: d.id } as PlannedAbsence)));
    }, err => console.error("PlannedAbsences snapshot err:", err));

    let unsubStaff = () => {};
    if (staffRole === 'admin') {
      const qStaff = query(collection(db, 'staffDirectory'), where('adminUid', '==', userId));
      unsubStaff = onSnapshot(qStaff, snap => {
        setStaffDirectory(snap.docs.map(d => ({ 
          id: d.id, 
          email: d.data().email || d.id.replace(userId + '_', ''), 
          ...d.data() 
        } as StaffMember)));
      }, err => console.error("Staff err", err));
    }

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
    }, err => console.error("Settings snapshot err:", err));

    return () => {
      unsubStudents();
      unsubLessons();
      unsubExams();
      unsubNights();
      unsubTreatments();
      unsubPlannedAbsences();
      unsubStaff();
      unsubSettings();
    };
  }, [baseUid, staffRole]);

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
    if (!user || !baseUid) return;
    const ref = doc(db, `users/${baseUid}/settings/global`);
    await setDoc(ref, {
      shiurim: newShiurim,
      subjects: newSubjects,
      rooms: newRooms,
      subjectClasses: newSubjectClasses,
      ownerId: baseUid,
      updatedAt: Date.now()
    }, { merge: true });
  };

  const addStudent = async (name: string, shiur: Shiur) => {
    if (!user || !baseUid) return;
    const id = Date.now().toString();
    await setDoc(doc(db, `users/${baseUid}/students/${id}`), {
      name,
      shiur,
      ownerId: baseUid,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  };

  const updateStudent = async (id: string, updates: Partial<Student>) => {
    if (!user || !baseUid) return;
    await updateDoc(doc(db, `users/${baseUid}/students/${id}`), {
      ...updates,
      updatedAt: Date.now()
    });
  };

  const removeStudent = async (id: string) => {
    if (!user || !baseUid) return;
    try {
      await deleteDoc(doc(db, `users/${baseUid}/students/${id}`));
      console.log('student deleted', id);
    } catch (e: any) {
      console.error("remove student error", e);
      alert("שגיאה במחיקת תלמיד: " + (e.message || ""));
    }
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
      // Check if student belongs to selected shiurim or selected subject classes
      const matchesShiur = selectedShiurim.includes(student.shiur);
      const matchesClass = subjectClasses[subject] ? selectedShiurim.includes(student.subjectLevels?.[subject] || '') : false;

      if (!matchesShiur && !matchesClass) return;

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
    
    setDoc(doc(db, `users/${baseUid}/lessons/${id}`), {
      ...newLesson,
      ownerId: baseUid,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    return id;
  };

  const updateLessonRecord = async (lessonId: string, studentId: string, updates: Partial<StudentLessonRecord>) => {
    if (!user || !baseUid) return;
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) return;

    const currentRecord = lesson.records[studentId] || { attendance: null, behavior1: null, behavior2: null };
    const newRecords = {
      ...lesson.records,
      [studentId]: { ...currentRecord, ...updates }
    };

    await updateDoc(doc(db, `users/${baseUid}/lessons/${lessonId}`), {
      records: newRecords,
      updatedAt: Date.now()
    });
  };

  const finishLesson = async (lessonId: string) => {
    if (!user || !baseUid) return;
    await updateDoc(doc(db, `users/${baseUid}/lessons/${lessonId}`), {
      isActive: false,
      updatedAt: Date.now()
    });
  };

  const deleteLesson = async (lessonId: string) => {
    if (!user || !baseUid) return;
    try {
      await deleteDoc(doc(db, `users/${baseUid}/lessons/${lessonId}`));
    } catch (e: any) {
      console.error("delete lesson error", e);
      alert("שגיאה במחיקת שיעור: " + (e.message || ""));
    }
  };

  const addExam = (examArgs: Omit<Exam, 'id' | 'grades'>) => {
    if (!user) return "";
    const id = Date.now().toString();
    
    setDoc(doc(db, `users/${baseUid}/exams/${id}`), {
      ...examArgs,
      grades: {},
      ownerId: baseUid,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    return id;
  };

  const updateExamGrade = async (examId: string, studentId: string, grade: Partial<ExamGrade>) => {
    if (!user || !baseUid) return;
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;

    const currentGrade = exam.grades[studentId] || { score: '', note: '' };
    const newGrades = {
      ...exam.grades,
      [studentId]: { ...currentGrade, ...grade }
    };

    await updateDoc(doc(db, `users/${baseUid}/exams/${examId}`), {
      grades: newGrades,
      updatedAt: Date.now()
    });
  };

  const deleteExam = async (examId: string) => {
    if (!user || !baseUid) return;
    await deleteDoc(doc(db, `users/${baseUid}/exams/${examId}`));
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
          isAuthorizedAbsence: true,
          notes: absence.reason
        };
      }
    });

    const id = Date.now().toString();
    setDoc(doc(db, `users/${baseUid}/nightRegistrations/${id}`), {
      date: now.toISOString(),
      shiurim: selectedShiurim,
      records: activeRecords,
      isActive: true,
      ownerId: baseUid,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    return id;
  };

  const updateNightRecord = async (nightId: string, studentId: string, updates: Partial<StudentNightRecord>) => {
    if (!user || !baseUid) return;
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

    await updateDoc(doc(db, `users/${baseUid}/nightRegistrations/${nightId}`), {
      records: newRecords,
      updatedAt: Date.now()
    });
  };

  const finishNightRegistration = async (nightId: string) => {
    if (!user || !baseUid) return;
    await updateDoc(doc(db, `users/${baseUid}/nightRegistrations/${nightId}`), {
      isActive: false,
      updatedAt: Date.now()
    });
  };

  const deleteNightRegistration = async (nightId: string) => {
    if (!user || !baseUid) return;
    try {
      await deleteDoc(doc(db, `users/${baseUid}/nightRegistrations/${nightId}`));
    } catch (e: any) {
      console.error("delete night error", e);
      alert("שגיאה במחיקת רישום: " + (e.message || ""));
    }
  };

  const addTreatment = async (t: Omit<Treatment, 'id'>) => {
    if (!user || !baseUid) return;
    const id = Date.now().toString();
    await setDoc(doc(db, `users/${baseUid}/treatments/${id}`), {
      ...t,
      ownerId: baseUid,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  };

  const deleteTreatment = async (id: string) => {
    if (!user || !baseUid) return;
    await deleteDoc(doc(db, `users/${baseUid}/treatments/${id}`));
  };

  const addPlannedAbsence = async (a: Omit<PlannedAbsence, 'id'>) => {
    if (!user || !baseUid) return;
    const id = Date.now().toString();
    await setDoc(doc(db, `users/${baseUid}/plannedAbsences/${id}`), {
      ...a,
      ownerId: baseUid,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  };

  const deletePlannedAbsence = async (id: string) => {
    if (!user || !baseUid) return;
    await deleteDoc(doc(db, `users/${baseUid}/plannedAbsences/${id}`));
  };

  const switchInstitution = () => {
    localStorage.removeItem('selectedInstitution');
    setShowInstitutionSelector(true);
    setBaseUid(null);
  };

  const addStaff = async (email: string, name: string, role: 'admin'|'teacher') => {
    if (!user || staffRole !== 'admin' || !baseUid) return;
    const lowerEmail = email.toLowerCase();
    const staffId = `${baseUid}_${lowerEmail}`;
    const currentInst = institutions.find(i => i.id === baseUid);
    const instName = currentInst ? currentInst.name : 'מוסד (צוות)';
    await setDoc(doc(db, `staffDirectory/${staffId}`), {
      adminUid: baseUid,
      email: lowerEmail,
      name,
      role,
      institutionName: instName,
      createdAt: Date.now()
    });
  };

  const removeStaff = async (id: string, email: string) => {
    if (!user || staffRole !== 'admin' || !baseUid) return;
    await deleteDoc(doc(db, `staffDirectory/${id}`));
  };

  const updateStaffRole = async (id: string, newRole: 'admin'|'teacher') => {
    if (!user || staffRole !== 'admin' || !baseUid) return;
    await updateDoc(doc(db, `staffDirectory/${id}`), {
      role: newRole
    });
  };

  const updateInstitutionName = async (newName: string) => {
    if (!user || staffRole !== 'admin' || !baseUid) return;
    if (baseUid === user.uid) return; // Cannot edit default placeholder name right now if it isn't a doc, unless we create it
    await updateDoc(doc(db, `institutions/${baseUid}`), {
      name: newName,
      updatedAt: Date.now()
    });
    setInstitutions(prev => prev.map(i => i.id === baseUid ? { ...i, name: newName } : i));
  };

  const deleteInstitution = async () => {
    if (!user || staffRole !== 'admin' || !baseUid) return;
    if (baseUid === user.uid) return; // Cannot delete the placeholder
    await deleteDoc(doc(db, `institutions/${baseUid}`));
    // Also log out naturally for safety or just switch institution back to selector
    switchInstitution();
  };

  const currentInstitution = institutions.find(i => i.id === baseUid) || null;

  const [newInstitutionName, setNewInstitutionName] = useState('');
  const [isCreatingInstitution, setIsCreatingInstitution] = useState(false);

  // ... (inside the component body)

  const createInstitution = async () => {
    if (!user || !newInstitutionName.trim()) return;
    setIsCreatingInstitution(true);
    try {
      // Create random doc ID
      const docRef = doc(collection(db, 'institutions'));
      await setDoc(docRef, {
        ownerId: user.uid,
        name: newInstitutionName.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      // Immediately add it to local state and select it
      const newInst = { id: docRef.id, name: newInstitutionName.trim(), role: 'admin' };
      setInstitutions(prev => [...prev, newInst]);
      selectInstitution(newInst.id, newInst.role);
    } catch (err) {
      console.error("Failed to create institution", err);
    } finally {
      setIsCreatingInstitution(false);
      setNewInstitutionName('');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>;
  }

  if (showInstitutionSelector) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{user?.email === 'mmkl770@gmail.com' ? 'מרכז ניהולי' : 'בחר מוסד'}</h1>
          <p className="text-gray-500">
            יש לך גישה למספר מוסדות. תחת איזה מוסד תרצה לפעול כעת?
          </p>
          <div className="space-y-3 mt-4 max-h-[300px] overflow-y-auto pl-2 mb-4">
            {institutions.map(inst => (
              <button 
                key={inst.id}
                onClick={() => selectInstitution(inst.id, inst.role)}
                className="w-full text-right p-4 border border-gray-200 hover:border-blue-500 hover:bg-blue-50 rounded-xl transition-all cursor-pointer flex justify-between items-center"
              >
                <div className="font-bold text-gray-800">{inst.name}</div>
                <div className={`text-xs px-2 py-1 rounded-full font-bold ${inst.role === 'admin' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                   {inst.role === 'admin' ? 'מנהל' : 'מורה לחשבון / ר"מ'}
                </div>
              </button>
            ))}
          </div>

          {user?.email === 'mmkl770@gmail.com' && (
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-right">
             <div className="font-bold text-gray-800 mb-2">צור מוסד חדש</div>
             <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newInstitutionName}
                  onChange={e => setNewInstitutionName(e.target.value)}
                  placeholder="שם המוסד החדש..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <button 
                  onClick={createInstitution}
                  disabled={isCreatingInstitution || !newInstitutionName.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  הוסף
                </button>
             </div>
          </div>
          )}

          <div className="mt-6 border-t border-gray-100 pt-4">
            <button 
              onClick={logout}
              className="text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors"
            >
              התנתק מהמערכת
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-6" dir="rtl">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100 max-w-sm w-full text-center space-y-8">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center transform hover:scale-105 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">ברוכים הבאים</h1>
              <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
                המערכת מסונכרנת לענן לאבטחת נתונים. נא להתחבר כדי להמשיך.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={login}
              className="w-full bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 py-3 rounded-xl font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              התחברות עם חשבון גוגל
            </button>
            <button 
              onClick={loginRedirect}
              className="w-full bg-zinc-100 text-zinc-700 hover:bg-zinc-200 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm"
            >
              התחברות חלופית (אם כפתור עליון לא עובד)
            </button>
          </div>

          <div className="pt-4 border-t border-zinc-100">
             <div className="text-[13px] text-zinc-500 mb-3 font-medium">
               גולש ממכשיר נייד דרך וואטסאפ או דפדפן פנימי?
             </div>
             <button 
               onClick={() => window.open(window.location.href, '_blank')}
               className="w-full text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors active:scale-[0.98]"
             >
               פתיחת האתר בדפדפן מערכת מלא
             </button>
          </div>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center space-y-6">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">אין הרשאה</h1>
          <p className="text-gray-500">
            האימייל <b>{user?.email}</b> אינו מוגדר כאיש צוות במערכת. פנה למנהל הישיבה כדי לקבל גישה.
          </p>
          <button 
            onClick={logout}
            className="w-full bg-gray-100 text-gray-700 hover:bg-gray-200 py-3 rounded-xl font-bold transition-colors cursor-pointer"
          >
            התנתק 
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{
      user,
      students, shiurim, subjects, rooms, subjectClasses, lessons, exams, nightRegistrations, treatments, plannedAbsences,
      addStudent, updateStudent, removeStudent, addShiur, removeShiur,
      addSubject, removeSubject, addRoom, removeRoom, addSubjectClass, removeSubjectClass,
      startLesson, updateLessonRecord, finishLesson, deleteLesson,
      addExam, updateExamGrade, deleteExam, 
      startNightRegistration, updateNightRecord, finishNightRegistration, deleteNightRegistration,
      addTreatment, deleteTreatment, addPlannedAbsence, deletePlannedAbsence,
      logout, staffRole, staffDirectory, addStaff, removeStaff, updateStaffRole, switchInstitution, currentInstitution, institutions, updateInstitutionName, deleteInstitution
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
