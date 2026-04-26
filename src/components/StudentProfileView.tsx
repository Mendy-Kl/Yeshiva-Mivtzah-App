import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '../AppContext';
import { Card, Button, Badge } from './ui';
import { ArrowLeft, BookOpen, Clock, AlertTriangle, GraduationCap, BarChart, FileText, MessageSquare, Moon, TrendingUp, Plus, X, Trash2, Users } from 'lucide-react';
import { getHebrewDateOnly } from '../lib/dateUtils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

export function StudentProfileView({ studentId, onClose }: { studentId: string, onClose: () => void }) {
  const { students, lessons, exams, subjects, nightRegistrations, treatments, addTreatment, deleteTreatment, updateStudent, rooms, subjectClasses } = useAppStore();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRoom, setEditRoom] = useState('');
  const [editLevels, setEditLevels] = useState<Record<string, string>>({});

  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [tDate, setTDate] = useState('');
  const [tHandler, setTHandler] = useState('');
  const [tIssue, setTIssue] = useState('');
  const [tTreatment, setTTreatment] = useState('');

  const openTreatmentForm = () => {
    setTDate(new Date().toISOString().slice(0, 10));
    setTHandler('');
    setTIssue('');
    setTTreatment('');
    setShowTreatmentModal(true);
  };

  const submitTreatment = async () => {
    if (!tDate || !tHandler || !tIssue || !tTreatment) return;
    await addTreatment({ studentId, date: tDate, handler: tHandler, issue: tIssue, treatment: tTreatment });
    setShowTreatmentModal(false);
  };

  const student = students.find(s => s.id === studentId);

  const openEditProfile = () => {
    if (student) {
      setEditRoom(student.room || '');
      setEditLevels(student.subjectLevels || {});
      setShowEditModal(true);
    }
  };

  const submitEditProfile = async () => {
    if (student) {
      await updateStudent(student.id, {
        room: editRoom,
        subjectLevels: editLevels
      });
      setShowEditModal(false);
    }
  };

  useEffect(() => {
    const handleGlobalClick = () => setActiveNoteId(null);
    if (activeNoteId) {
      window.addEventListener('click', handleGlobalClick);
      return () => window.removeEventListener('click', handleGlobalClick);
    }
  }, [activeNoteId]);

  const metrics = useMemo(() => {
    const relevantLessons = lessons.filter(l => !l.isActive && (activeTab === 'all' || l.subject === activeTab));
    const relevantExams = exams.filter(e => activeTab === 'all' || e.subject === activeTab);
    const relevantNights = (activeTab === 'all' || activeTab === 'night') ? nightRegistrations.filter(n => !n.isActive) : [];

    let totalLates = 0, totalAbsents = 0, totalLessonsCount = 0, totalLearning = 0, totalBehaviorsCount = 0, totalMinutesLate = 0;
    
    relevantLessons.forEach(lesson => {
      const record = lesson.records[studentId];
      if (record) {
        if (record.attendance === 'ABSENT' && record.isAuthorizedAbsence) return;
        totalLessonsCount++;
        if (record.attendance === 'LATE') {
          totalLates++;
          if (record.minutesLate) totalMinutesLate += record.minutesLate;
        }
        if (record.attendance === 'ABSENT') totalAbsents++;
        if (record.behavior1) { totalBehaviorsCount++; totalLearning += record.behavior1 === 'LEARNING' ? 1 : record.behavior1 === 'PARTIAL' ? 0.5 : 0; }
        if (record.behavior2) { totalBehaviorsCount++; totalLearning += record.behavior2 === 'LEARNING' ? 1 : record.behavior2 === 'PARTIAL' ? 0.5 : 0; }
      }
    });

    let totalNightMissingRoom = 0, totalNightMissingHamapil = 0, nightLatesSum = 0;
    relevantNights.forEach(n => {
       const rec = n.records[studentId];
       if (rec) {
          if (rec.isRoomAbsent) totalNightMissingRoom++;
          else if (rec.roomMinutesLate) nightLatesSum += rec.roomMinutesLate;
          
          if (rec.hamapilMinutesLate !== undefined && rec.hamapilMinutesLate > 0) {
             totalNightMissingHamapil++;
             nightLatesSum += rec.hamapilMinutesLate;
          }
       }
    });

    const attendancePercentage = totalLessonsCount === 0 ? 100 : Math.round(((totalLessonsCount - totalAbsents) / totalLessonsCount) * 100);
    const learningPercentage = totalBehaviorsCount === 0 ? 100 : Math.round((totalLearning / totalBehaviorsCount) * 100);

    let totalScore = 0, validScoresCount = 0;
    relevantExams.forEach(exam => {
      const grade = exam.grades[studentId]?.score;
      if (grade && !isNaN(Number(grade))) { totalScore += Number(grade); validScoresCount++; }
    });

    const averageExamScore = validScoresCount === 0 ? '-' : Math.round(totalScore / validScoresCount);

    return { totalLates, totalAbsents, attendancePercentage, learningPercentage, averageExamScore, totalLessonsCount, validScoresCount, totalMinutesLate, totalNightMissingRoom, totalNightMissingHamapil, nightLatesSum };
  }, [lessons, exams, nightRegistrations, studentId, activeTab]);

  const graphData = useMemo(() => {
    const grouped: Record<string, { time: number, label: string, learningSum: number, learningCount: number, examSum: number, examCount: number }> = {};
    const relevantLessons = lessons.filter(l => !l.isActive && (activeTab === 'all' || l.subject === activeTab));
    const relevantExams = exams.filter(e => activeTab === 'all' || e.subject === activeTab);

    relevantLessons.forEach(l => {
      const t = new Date(l.date).setHours(0,0,0,0);
      const d = new Date(t);
      const key = d.toLocaleDateString('en-CA');
      const rec = l.records[studentId];
      if (rec && rec.attendance !== 'ABSENT') {
        if (!grouped[key]) grouped[key] = { time: t, label: d.toLocaleDateString('he-IL', {day:'2-digit', month:'2-digit'}), learningSum: 0, learningCount: 0, examSum: 0, examCount: 0 };
        [rec.behavior1, rec.behavior2].forEach(b => {
          if (b) {
            grouped[key].learningCount++;
            grouped[key].learningSum += b === 'LEARNING' ? 100 : b === 'PARTIAL' ? 50 : 0;
          }
        });
      }
    });
    relevantExams.forEach(e => {
      const t = new Date(e.date).setHours(0,0,0,0);
      const d = new Date(t);
      const key = d.toLocaleDateString('en-CA');
      const grade = e.grades[studentId];
      if (grade && grade.score && !isNaN(Number(grade.score))) {
        if (!grouped[key]) grouped[key] = { time: t, label: d.toLocaleDateString('he-IL', {day:'2-digit', month:'2-digit'}), learningSum: 0, learningCount: 0, examSum: 0, examCount: 0 };
        grouped[key].examCount++;
        grouped[key].examSum += Number(grade.score);
      }
    });
    return Object.values(grouped).sort((a,b)=>a.time-b.time).map(g => ({
       label: g.label,
       learningRate: g.learningCount > 0 ? Number((g.learningSum/g.learningCount).toFixed(1)) : null,
       examAverage: g.examCount > 0 ? Number((g.examSum/g.examCount).toFixed(1)) : null
    }));
  }, [lessons, exams, studentId, activeTab]);

  const matrixEvents = useMemo(() => {
    let rawEvents = [
      ...lessons.map(l => ({ type: 'lesson' as const, data: l, time: new Date(l.date).getTime(), label: l.subject, shiurim: l.shiurim })),
      ...nightRegistrations.map(n => ({ type: 'night' as const, data: n, time: new Date(n.date).getTime(), label: 'רישום לילה', shiurim: n.shiurim }))
    ];

    if (activeTab !== 'all') {
      if (activeTab === 'night') rawEvents = rawEvents.filter(ev => ev.type === 'night');
      else rawEvents = rawEvents.filter(ev => ev.type === 'lesson' && ev.label === activeTab);
    }

    rawEvents.sort((a, b) => a.time - b.time); // Earliest first to mirror GeneralMatrix
    const groupedByDay: Record<string, any[]> = {};
    rawEvents.forEach(ev => {
      const dayStr = new Date(ev.time).toLocaleDateString('en-CA');
      if (!groupedByDay[dayStr]) groupedByDay[dayStr] = [];
      let merged = false;
      for (const existing of groupedByDay[dayStr]) {
        if (existing.label === ev.label) {
          const existingShiurim = new Set(existing.dataList.flatMap((d:any) => d.shiurim));
          if (!ev.shiurim.some(s => existingShiurim.has(s))) {
            existing.dataList.push(ev.data);
            merged = true; break;
          }
        }
      }
      if (!merged) groupedByDay[dayStr].push({ id: `${ev.type}-${ev.data.id}`, type: ev.type, dataList: [ev.data], time: ev.time, label: ev.label });
    });

    return { allEvents: Object.values(groupedByDay).flat(), groupedByDay, dayKeys: Object.keys(groupedByDay).sort((a,b)=>a.localeCompare(b)) };
  }, [lessons, nightRegistrations, activeTab]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      setTimeout(() => {
        if (!container) return;
        container.scrollLeft = -container.scrollWidth;
        if (container.scrollLeft === 0 && container.scrollWidth > container.clientWidth) {
          container.scrollLeft = container.scrollWidth;
        }
      }, 50);
    }
  }, [matrixEvents.allEvents.length, activeTab]);

  if (!student) return null;

  const studentSubjects = new Set<string>();
  lessons.forEach(l => { if (l.records[studentId]) studentSubjects.add(l.subject); });
  exams.forEach(e => { if (e.grades[studentId]) studentSubjects.add(e.subject); });
  nightRegistrations.forEach(n => { if (n.records[studentId]) studentSubjects.add('night'); }); // virtual subject

  const availableSubjects = Array.from(studentSubjects).filter(s => s !== 'night').sort();
  if (studentSubjects.has('night')) availableSubjects.push('night'); // Put night at the end

  const renderCellContent = (ev: any) => {
    const dataItem = ev.dataList.find((d:any) => d.shiurim.includes(student.shiur));
    if (!dataItem) return <div className="text-gray-300 w-[110px] min-w-[110px] h-[46px] bg-white flex items-center justify-center">-</div>;
    const record = dataItem.records[student.id];
    if (!record) return <div className="text-gray-300 w-[110px] min-w-[110px] h-[46px] bg-white flex items-center justify-center">-</div>;
    
    const cellId = `${ev.type}-${ev.time}-${student.id}`;
    const isActiveNote = activeNoteId === cellId;
    const hasNote = ev.type === 'lesson' ? !!record.absenceNote || !!record.lessonNote : !!record.notes;
    const allNotes = ev.type === 'lesson' ? [record.absenceNote, record.lessonNote].filter(Boolean).join('\n') : record.notes;
    
    const popover = isActiveNote && hasNote && (
       <div className="absolute top-[80%] left-1/2 -translate-x-1/2 z-[999] bg-white border border-slate-200 shadow-xl rounded-lg p-3 w-56 animate-in fade-in zoom-in duration-150 cursor-auto" onClick={e => e.stopPropagation()}>
           <h4 className="font-bold text-gray-800 text-[13px] leading-tight mb-1" dir="rtl">{ev.label} • {getHebrewDateOnly(dataItem.date)}</h4>
           <div className="text-gray-600 text-[12px] whitespace-pre-wrap leading-relaxed max-h-[150px] overflow-y-auto" dir="rtl">{allNotes}</div>
       </div>
    );

    const baseProps = { onClick: (e:any) => { e.stopPropagation(); if(hasNote) setActiveNoteId(isActiveNote ? null : cellId); }, dir: "rtl" as const };
    
    if (ev.type === 'lesson') {
       if (record.isAbsent || record.attendance === 'ABSENT') {
         return (
           <div {...baseProps} className={`relative flex w-[110px] min-w-[110px] h-[46px] ${hasNote?'cursor-pointer hover:bg-orange-50':''} bg-white items-center justify-center outline outline-1 outline-gray-100/50`}>
             {hasNote && <div className="absolute top-0.5 left-0.5 text-orange-500"><FileText size={10} /></div>}
             <span className={`text-[15px] font-bold ${record.isAuthorizedAbsence ? 'text-emerald-600' : 'text-red-600'}`}>{record.isAuthorizedAbsence ? 'אישור' : 'חיסר'}</span>
             {popover}
           </div>
         );
       }
       const isLate = (record.minutesLate||0)>0 || record.attendance === 'LATE';
       let learningBg = 'bg-gray-50'; let learningTextColor = 'text-gray-400'; let learningText = '-';
       const s1 = record.behavior1 === 'LEARNING' ? 2 : record.behavior1 === 'PARTIAL' ? 1 : record.behavior1 === 'NONE' ? 0 : null;
       const s2 = record.behavior2 === 'LEARNING' ? 2 : record.behavior2 === 'PARTIAL' ? 1 : record.behavior2 === 'NONE' ? 0 : null;
       if (s1 !== null || s2 !== null) {
         const p = (((s1||0)+(s2||0))/4)*100;
         learningText = `${p}%`;
         if (p===100) { learningBg = 'bg-emerald-100/60'; learningTextColor = 'text-emerald-700'; }
         else if (p>=75) { learningBg = 'bg-emerald-50'; learningTextColor = 'text-emerald-600'; }
         else if (p===50) { learningBg = 'bg-gray-100/60'; learningTextColor = 'text-gray-600'; }
         else { learningBg = 'bg-rose-100/60'; learningTextColor = 'text-rose-700'; }
       }
       return (
         <div {...baseProps} className={`relative flex w-[110px] min-w-[110px] h-[46px] text-[14px] ${hasNote?'cursor-pointer hover:bg-orange-50 outline-orange-200':'outline-gray-100/50'} bg-white items-center justify-between px-1.5 outline outline-1 gap-1.5 rounded-sm`}>
           {hasNote && <div className="absolute top-[2px] left-[2px] text-orange-500 z-10"><FileText size={10} strokeWidth={3} /></div>}
           <div className={`w-7 text-center shrink-0 ${isLate ? 'text-red-500 font-bold' : 'text-emerald-500 font-bold'}`}>{isLate ? `-${record.minutesLate||0}` : '0'}</div>
           <div className={`flex-1 flex items-center justify-center p-1 h-[36px] rounded-md text-[13px] font-bold ${learningBg} ${learningTextColor}`}>{learningText}</div>
           {popover}
         </div>
       );
    } else {
       if (record.roomMinutesLate === undefined && record.hamapilMinutesLate === undefined && !record.isRoomAbsent && !record.talking && !hasNote) {
         return <div className="text-gray-300 w-[110px] min-w-[110px] h-[46px] bg-white flex items-center justify-center">-</div>;
       }
       const roomText = record.isRoomAbsent ? 'חיסר בחדר' : (record.roomMinutesLate ? `חדר -${record.roomMinutesLate}` : 'חדר 0');
       const roomClasses = record.isRoomAbsent ? 'text-red-600 font-bold' : (record.roomMinutesLate ? 'text-red-500' : 'text-emerald-500 font-bold');
       const hText = record.hamapilMinutesLate === undefined ? 'המפיל -' : record.hamapilMinutesLate === 0 ? 'המפיל 0' : `המפיל -${record.hamapilMinutesLate}`;
       const hClasses = record.hamapilMinutesLate === undefined ? 'text-gray-400' : record.hamapilMinutesLate === 0 ? 'text-emerald-500 font-bold' : 'text-red-500';
       return (
         <div {...baseProps} className={`relative flex flex-col w-[110px] min-w-[110px] h-[46px] justify-center px-2 py-1 text-[11px] font-semibold bg-slate-50 ${hasNote?'cursor-pointer bg-slate-50 outline-indigo-200':'outline-gray-100/50'} outline outline-1 rounded-sm leading-tight`}>
           {hasNote && <div className="absolute top-[2px] left-[2px] text-indigo-500 z-10"><FileText size={10} strokeWidth={3} /></div>}
           <div className="flex justify-between items-center gap-1"><span className={`${roomClasses} truncate`}>{roomText}</span>{record.talking && <MessageSquare className="text-red-500 shrink-0" size={12} />}</div>
           <div className={`${hClasses} truncate`}>{hText}</div>
           {popover}
         </div>
       );
    }
  };

  const roommates = student.room ? students.filter(s => s.room === student.room && s.id !== student.id) : [];

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4">
          <Button variant="ghost" onClick={onClose} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 pr-0 mb-2">
            <ArrowLeft size={20} className="rotate-180" /> חזור לרשימת התלמידים
          </Button>
        </div>
        <div className="flex flex-col md:flex-row gap-6 max-w-7xl mx-auto w-full px-4 md:px-6 pb-24 items-start">
        
        {/* Sidebar */}
        <div className="w-full md:w-80 shrink-0 flex flex-col gap-6 sticky top-6">
          <Card className="p-6 bg-white shadow-sm flex flex-col items-center text-center border-0 border-t-4 border-t-[var(--color-primary)]">
             <div className="w-24 h-24 bg-orange-50 text-orange-600 rounded-full flex shrink-0 items-center justify-center text-4xl font-extrabold mb-4 shadow-inner">{student.name.charAt(0)}</div>
             <h2 className="text-2xl font-black text-gray-900 mb-1">{student.name}</h2>
             <div className="flex items-center justify-center flex-wrap gap-2 text-gray-600 font-medium mb-4">
               <Badge variant="secondary" className="bg-gray-100 text-gray-700">שיעור {student.shiur}</Badge>
               {student.room && <Badge variant="secondary" className="bg-blue-50 text-blue-700">חדר {student.room}</Badge>}
             </div>
             
             {roommates.length > 0 && (
               <div className="w-full text-right text-sm bg-blue-50/50 p-3 rounded-xl mb-4 text-blue-800 border border-blue-100/50">
                 <strong className="block mb-1">שותפים לחדר:</strong>
                 {roommates.map(r => r.name).join(', ')}
               </div>
             )}

             {student.subjectLevels && Object.keys(student.subjectLevels).length > 0 && (
               <div className="w-full text-right text-sm bg-purple-50/50 p-3 rounded-xl mb-4 text-purple-800 border border-purple-100/50">
                 <strong className="block mb-1">רמות לימוד:</strong>
                 {Object.entries(student.subjectLevels).map(([sub, level]) => (
                   <div key={sub} className="flex justify-between items-center py-1 border-b border-purple-100/30 last:border-0">
                     <span>{sub}</span>
                     <span className="font-bold">{level}</span>
                   </div>
                 ))}
               </div>
             )}

             <button onClick={openEditProfile} className="text-sm font-bold bg-[var(--color-primary)] text-orange-950 hover:bg-orange-600 hover:text-white w-full py-2.5 rounded-xl transition-all shadow-sm mt-2">
               ערוך פרטים
             </button>

             <button 
               onClick={() => setActiveTab('treatments')} 
               className={`text-sm font-bold w-full py-2.5 rounded-xl transition-all shadow-sm mt-3 flex justify-between items-center px-4 ${activeTab === 'treatments' ? 'bg-purple-800 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
             >
               <span>טיפול בעיות</span>
               {treatments.filter(t => t.studentId === studentId).length > 0 && (
                 <Badge variant="secondary" className={`text-current ${activeTab === 'treatments' ? 'bg-white/30' : 'bg-white/20'}`}>{treatments.filter(t => t.studentId === studentId).length}</Badge>
               )}
             </button>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-6 min-w-0 overflow-hidden">
          
          {/* Top Horizontal Tabs */}
          <div className="flex overflow-x-auto gap-2 no-scrollbar bg-white p-2 rounded-2xl shadow-sm border border-gray-100 items-center justify-start sticky top-6 z-10 w-full mb-2">
             <button onClick={() => setActiveTab('all')} className={`px-5 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${activeTab === 'all' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>מבט כללי</button>
             <div className="w-px h-6 bg-slate-200 shrink-0 mx-1"></div>
             {availableSubjects.map(sub => (
               <button key={sub} onClick={() => setActiveTab(sub)} className={`px-5 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${activeTab === sub ? (sub==='night' ? 'bg-indigo-600 text-white shadow-md' : 'bg-[var(--color-primary)] text-orange-950 shadow-md') : 'text-slate-600 hover:bg-slate-50'}`}>
                 {sub === 'night' ? 'מעקב לילה' : sub}
               </button>
             ))}
          </div>

        {activeTab === 'treatments' ? (
           <div className="space-y-4">
             <div className="flex justify-between items-center mb-2 px-2">
               <h3 className="text-2xl font-black text-gray-900">היסטוריית טיפולים</h3>
               <button onClick={openTreatmentForm} className="px-5 py-2.5 rounded-xl font-bold transition-all bg-gray-900 hover:bg-gray-800 text-white shadow-md flex items-center gap-2 cursor-pointer">
                 <Plus size={18} />
                 תיעוד חדש
               </button>
             </div>
             {treatments.filter(t => t.studentId === studentId).sort((a,b) => b.date.localeCompare(a.date)).map(t => (
               <Card key={t.id} className="p-6 border-0 bg-white shadow-sm flex flex-col gap-3 rounded-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-2 h-full bg-purple-500"></div>
                 <div className="flex justify-between items-start pl-2">
                   <div className="flex gap-4 text-sm text-gray-500 font-bold mb-2">
                     <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100"><Clock size={16} className="text-gray-400" />{getHebrewDateOnly(t.date)}  <span className="text-gray-300 mx-1">|</span>  {new Date(t.date).toLocaleDateString('he-IL')}</div>
                     <div className="flex items-center gap-1 bg-purple-50 px-3 py-1 rounded-lg text-purple-700 border border-purple-100">{t.handler}</div>
                   </div>
                   <button onClick={() => { if(confirm('האם למחוק?')) deleteTreatment(t.id); }} className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors p-2 cursor-pointer"><Trash2 size={18}/></button>
                 </div>
                 <div className="mt-1">
                   <div className="font-extrabold text-xl text-gray-900 tracking-tight">{t.issue}</div>
                   <div className="text-gray-600 mt-3 whitespace-pre-wrap leading-relaxed bg-gray-50 p-4 rounded-xl text-[15px]">{t.treatment}</div>
                 </div>
               </Card>
             ))}
             {treatments.filter(t => t.studentId === studentId).length === 0 && (
               <div className="text-center py-20 text-gray-400 font-medium bg-white rounded-3xl shadow-sm border border-dashed border-gray-200">
                 <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                 אין היסטוריית טיפולים לתלמיד זה
               </div>
             )}
           </div>
        ) : (
          <>
            {/* Quick Stats Grid */}
            {activeTab !== 'night' ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <StatCard icon={<AlertTriangle className="text-red-500" size={20} />} label="חיסורים" value={metrics.totalAbsents} />
                <StatCard icon={<Clock className="text-orange-500" size={20} />} label="דקות איחור" value={metrics.totalMinutesLate} />
                <StatCard icon={<BarChart className="text-blue-500" size={20} />} label="אחוזי נוכחות" value={`${metrics.attendancePercentage}%`} />
                <StatCard icon={<BookOpen className="text-green-600" size={20} />} label="אחוזי למידה" value={`${metrics.learningPercentage}%`} />
                {metrics.averageExamScore !== '-' ? (
                  <StatCard icon={<GraduationCap className="text-purple-500" size={20} />} label="ממוצע ציונים" value={metrics.averageExamScore} />
                ) : (
                  <StatCard icon={<GraduationCap className="text-purple-500 opacity-50" size={20} />} label="ממוצע ציונים" value="-" />
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                 <StatCard icon={<Moon className="text-indigo-500" size={24} />} label="סך הכל דקות איחור" value={metrics.nightLatesSum} />
                 <StatCard icon={<AlertTriangle className="text-red-500" size={24} />} label="חיסורים (חדר / המפיל)" value={`${metrics.totalNightMissingRoom} / ${metrics.totalNightMissingHamapil}`} />
              </div>
            )}

            {/* Subject Info (Level & Chavrusa) */}
            {activeTab !== 'all' && activeTab !== 'night' && (
              <Card className="p-5 border border-purple-100 bg-purple-50/30 shadow-sm rounded-2xl flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-purple-900 mb-1.5 flex items-center gap-2 animate-in slide-in-from-right-2">
                    <BookOpen size={16} /> רמת לימוד
                  </label>
                  <select
                    value={student.subjectLevels?.[activeTab] || ''}
                    onChange={(e) => updateStudent(studentId, { subjectLevels: { ...student.subjectLevels, [activeTab]: e.target.value } })}
                    className="w-full bg-white border border-purple-100 rounded-xl px-4 py-2.5 text-slate-800 font-medium outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-sm appearance-none"
                  >
                    <option value="">ללא רמה / כללי</option>
                    {(subjectClasses[activeTab] || []).map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-purple-900 mb-1.5 flex items-center gap-2 animate-in slide-in-from-right-2">
                    <Users size={16} /> חברותא
                  </label>
                  <input
                    type="text"
                    list={`chavrusas-list-${activeTab}`}
                    placeholder="חפש ובחר מהשמות..."
                    value={student.chavrusas?.[activeTab] || ''}
                    onChange={(e) => {
                      const newChavrusaName = e.target.value;
                      updateStudent(studentId, { chavrusas: { ...student.chavrusas, [activeTab]: newChavrusaName } });
                      
                      // Auto update the other student's chavrusa if valid
                      const otherStudent = students.find(s => s.name === newChavrusaName);
                      if (otherStudent) {
                        updateStudent(otherStudent.id, { chavrusas: { ...otherStudent.chavrusas, [activeTab]: student.name } });
                      }
                    }}
                    className="w-full bg-white border border-purple-100 rounded-xl px-4 py-2.5 text-slate-800 font-medium outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-sm"
                  />
                  <datalist id={`chavrusas-list-${activeTab}`}>
                    {students.filter(s => s.id !== studentId).map(s => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </div>
              </Card>
            )}

            {/* Exams History Section */}
            {activeTab !== 'night' && activeTab !== 'treatments' && (
              <Card className="p-0 border-0 overflow-hidden shadow-sm rounded-3xl bg-white mb-2">
                <div className="bg-slate-50/50 px-6 py-5 border-b border-slate-100 text-slate-800 flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-xs"><GraduationCap className="text-purple-600" size={24} /></div>
                  <span className="font-black text-xl">היסטוריית מבחנים {activeTab !== 'all' ? ` - ${activeTab}` : ''}</span>
                </div>
                {(() => {
                  const examsHistory = exams
                    .filter(e => activeTab === 'all' || e.subject === activeTab)
                    .filter(e => e.grades[studentId])
                    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  
                  if (examsHistory.length === 0) {
                    return (
                      <div className="px-6 py-12 text-center flex flex-col items-center justify-center font-bold text-gray-400">
                        <FileText size={40} className="mb-3 opacity-20" />
                        לא נמצאו נתוני מבחנים זמינים
                      </div>
                    );
                  }

                  return (
                    <div className="px-6 py-4 overflow-x-auto">
                      <table className="w-full text-right whitespace-nowrap" dir="rtl">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="py-3 px-2 font-bold text-slate-400 text-sm">תאריך</th>
                            <th className="py-3 px-2 font-bold text-slate-400 text-sm">נושא</th>
                            <th className="py-3 px-2 font-bold text-slate-400 text-sm">הספק / חומר</th>
                            <th className="py-3 px-2 font-bold text-slate-400 text-sm text-center">ציון</th>
                            <th className="py-3 px-2 font-bold text-slate-400 text-sm">הערה</th>
                          </tr>
                        </thead>
                        <tbody>
                          {examsHistory.map(exam => {
                            const grade = exam.grades[studentId];
                            return (
                              <tr key={exam.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 px-2 font-bold text-slate-700">{new Date(exam.date).toLocaleDateString('he-IL')}</td>
                                <td className="py-4 px-2 text-slate-700 font-medium">{exam.subject}</td>
                                <td className="py-4 px-2 text-slate-500 text-sm max-w-[200px] truncate" title={exam.material}>{exam.material}</td>
                                <td className="py-4 px-2 text-center text-sm">
                                  <span className="bg-purple-100 text-purple-800 font-bold px-3 py-1.5 rounded-lg inline-flex justify-center min-w-[3.5rem] shadow-sm">{grade.score}</span>
                                </td>
                                <td className="py-4 px-2 text-slate-500 text-sm truncate max-w-[150px]" title={grade.note}>{grade.note || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </Card>
            )}

            {/* Dynamic Matrix Record specific to this student */}
            <Card className="p-0 border-0 overflow-hidden shadow-sm rounded-3xl bg-white mb-2">
              <div className="bg-slate-50/50 px-6 py-5 border-b border-slate-100 text-slate-800 flex justify-between items-center">
                <span className="font-black text-xl flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-xs"><BarChart className="text-blue-500" size={24} /></div>
                  היסטוריית נוכחות ונתונים
                </span>
                {activeTab !== 'all' && <Badge variant="primary" className="bg-indigo-100 text-indigo-800 px-3 py-1 text-sm border-0">{activeTab === 'night' ? 'מעקב לילה' : activeTab}</Badge>}
              </div>
              <div className="px-4 py-4 bg-white flex justify-end">
                 {matrixEvents.dayKeys.length === 0 ? (
                   <div className="py-12 w-full text-center text-gray-400 font-medium font-bold flex flex-col items-center">
                      <Clock size={40} className="mb-3 opacity-20" />
                      אין נתונים זמינים
                   </div>
                 ) : (
                    <div ref={scrollRef} className="overflow-x-auto w-full pb-4 hide-scrollbar">
                       <table className="border-collapse" dir="rtl">
                          <thead>
                            <tr>
                              {matrixEvents.dayKeys.map(dayKey => {
                                const dayEvents = matrixEvents.groupedByDay[dayKey];
                                const dateObj = new Date(dayEvents[0].dataList[0].date);
                                return (
                                  <th key={dayKey} colSpan={dayEvents.length} className="py-3 bg-white border-l-2 border-l-slate-200 border-b-2 border-b-slate-100 text-right">
                                    <div className="flex flex-row items-baseline justify-start gap-1 pr-2 truncate">
                                      <span className="text-[14px] font-black text-slate-800">{dateObj.toLocaleDateString('he-IL', { weekday: 'long' })}</span>
                                      <span className="text-[12px] font-bold text-slate-500">{getHebrewDateOnly(dayEvents[0].dataList[0].date)}</span>
                                      <span className="text-[11px] font-medium text-slate-400 mr-1">{dateObj.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                                    </div>
                                  </th>
                                );
                              })}
                            </tr>
                            <tr>
                              {matrixEvents.dayKeys.map(dayKey => {
                                return matrixEvents.groupedByDay[dayKey].map((ev, i) => {
                                  const isLastInDay = i === matrixEvents.groupedByDay[dayKey].length - 1;
                                  return (
                                    <th key={`${dayKey}-${i}`} className={`bg-white border-b border-slate-100 text-center font-medium w-[110px] min-w-[110px] max-w-[110px] p-0 ${isLastInDay ? 'border-l-2 border-l-slate-200' : 'border-l border-slate-50'}`}>
                                      <div className={`py-2 px-1 truncate text-[11px] font-bold w-full h-full ${ev.type === 'night' ? 'text-indigo-700 bg-indigo-50/80 tracking-tight' : 'text-slate-600 bg-slate-50/80 tracking-tight'}`}>
                                        {ev.label}
                                      </div>
                                    </th>
                                  );
                                });
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              {matrixEvents.dayKeys.map(dayKey => {
                                const dayEvents = matrixEvents.groupedByDay[dayKey];
                                return dayEvents.map((ev, i) => {
                                  const isLastInDay = i === dayEvents.length - 1;
                                  return (
                                    <td key={`${dayKey}-${i}`} className={`p-0 align-top ${isLastInDay ? 'border-l-2 border-l-slate-200' : 'border-l border-slate-50'}`}>
                                       {renderCellContent(ev)}
                                    </td>
                                  );
                                });
                              })}
                            </tr>
                          </tbody>
                       </table>
                    </div>
                 )}
              </div>
            </Card>

        {/* Full-width Graph */}
        {activeTab !== 'night' && graphData.length > 0 && (
          <Card className="p-6 border-0 bg-white shadow-sm rounded-3xl">
            <div className="flex items-center gap-2 font-black text-slate-800 text-xl mb-6 w-full justify-start">
              <TrendingUp className="text-blue-500" size={24} />
              <span>התקדמות למידה ומבחנים</span>
            </div>
            <div className="w-full h-[280px]" dir="ltr">
              <ResponsiveContainer w="100%" h="100%">
                 <AreaChart data={graphData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorL" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorE" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} dy={10} />
                    <YAxis domain={[0,100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} dx={-10} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', fontSize: '13px', textAlign: 'right', padding: '12px 16px' }} 
                      itemStyle={{ fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: 'bold' }}/>
                    
                    <Area type="monotone" name="רמת למידה (%)" dataKey="learningRate" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorL)" activeDot={{ r: 6, strokeWidth: 0 }} connectNulls />
                    <Area type="monotone" name="ממוצע מבחנים (%)" dataKey="examAverage" stroke="#f97316" strokeWidth={4} fillOpacity={1} fill="url(#colorE)" activeDot={{ r: 6, strokeWidth: 0 }} connectNulls />
                 </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
        </>
        )}
      </div>
      </div>

      {/* Treatment Modal */}
      {showTreatmentModal && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex flex-col items-center justify-start p-4 pt-[10vh] overflow-y-auto">
          <Card className="max-w-md w-full bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200" dir="rtl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">תיעוד בעיה / טיפול - {student.name}</h3>
              <button onClick={() => setShowTreatmentModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-bold text-gray-700">תאריך</label>
                  <span className="text-xs font-bold text-purple-600">{getHebrewDateOnly(tDate)}</span>
                </div>
                <input type="date" value={tDate} onChange={e => setTDate(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">גורם מטפל - מי מדווח על הבעיה/טיפול?</label>
                <input type="text" value={tHandler} onChange={e => setTHandler(e.target.value)} placeholder="שם המשגיח / איש צוות" className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">איזו בעיה?</label>
                <input type="text" value={tIssue} onChange={e => setTIssue(e.target.value)} placeholder="כותרת הבעיה (לדוגמה: היעדרות ממושכת, תלונה ממשגיח)" className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">פירוט הטיפול / הבעיה</label>
                <textarea value={tTreatment} onChange={e => setTTreatment(e.target.value)} rows={4} placeholder="פירוט מלא של המקרה, מה סוכם ואיזה טיפול נעשה" className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"></textarea>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
              <Button variant="ghost" onClick={() => setShowTreatmentModal(false)}>ביטול</Button>
              <Button variant="primary" onClick={submitTreatment} disabled={!tDate || !tHandler || !tIssue || !tTreatment} className="bg-purple-600 border-purple-600 hover:bg-purple-700 text-white">שמור תיעוד</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex flex-col items-center justify-center p-4">
          <Card className="max-w-md w-full bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">עריכת פרטים - {student.name}</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">חדר פנימיה</label>
                <select value={editRoom} onChange={e => setEditRoom(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] bg-white appearance-none">
                  <option value="">ללא חדר</option>
                  {rooms.map(room => (
                    <option key={room} value={room}>חדר {room}</option>
                  ))}
                </select>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-bold text-gray-700 mb-3">רמות לפי מקצועות</label>
                {subjects.map(sub => (
                  <div key={sub} className="flex items-center gap-3 mb-3">
                    <div className="w-24 text-gray-600 font-medium">{sub}</div>
                    <select 
                      value={editLevels[sub] || ''} 
                      onChange={e => setEditLevels(prev => ({...prev, [sub]: e.target.value}))} 
                      className="flex-1 border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] bg-white appearance-none"
                    >
                      <option value="">ללא רמה / כללי</option>
                      {(subjectClasses[sub] || []).map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>
                ))}
                {subjects.length === 0 && <div className="text-sm text-gray-500">לא הוגדרו מקצועות במערכת.</div>}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
              <Button variant="ghost" onClick={() => setShowEditModal(false)}>ביטול</Button>
              <Button variant="primary" onClick={submitEditProfile}>שמור שינויים</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, subLabel }: any) {
  return (
    <Card className="p-4 flex flex-col items-center justify-center text-center shadow-sm border-0 bg-white rounded-2xl w-full">
      <div className="mb-2 p-2.5 bg-slate-50 text-slate-500 rounded-xl">{icon}</div>
      <div className="text-2xl font-black text-slate-800 mb-0.5">{value}</div>
      <div className="text-xs font-bold text-slate-400">{label}</div>
    </Card>
  );
}
