import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../AppContext';
import { Card, Button, Badge } from './ui';
import { ArrowLeft, BookOpen, Clock, AlertTriangle, GraduationCap, BarChart, FileText, MessageSquare, Moon, TrendingUp } from 'lucide-react';
import { getHebrewDateOnly } from '../lib/dateUtils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

export function StudentProfileView({ studentId, onClose }: { studentId: string, onClose: () => void }) {
  const { students, lessons, exams, subjects, nightRegistrations } = useAppStore();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const student = students.find(s => s.id === studentId);

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

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto" dir="rtl">
      <div className="max-w-5xl mx-auto w-full p-4 md:p-6 pb-24">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-6 rounded-[24px] shadow-sm border border-black/5 mb-6">
           <div className="flex items-center gap-4">
             <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-2xl font-bold">{student.name.charAt(0)}</div>
             <div><h2 className="text-2xl font-bold text-gray-900">{student.name}</h2><p className="text-gray-500">שיעור {student.shiur}</p></div>
           </div>
           <Button variant="ghost" onClick={onClose} className="rounded-xl px-4! border border-gray-200"><ArrowLeft className="ml-2" size={18} /> חזור</Button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-2 mb-6 pb-2 no-scrollbar">
           <button onClick={() => setActiveTab('all')} className={`px-5 py-2.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${activeTab === 'all' ? 'bg-gray-800 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-black/5'}`}>מבט כללי</button>
           {availableSubjects.map(sub => (
             <button key={sub} onClick={() => setActiveTab(sub)} className={`px-5 py-2.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${activeTab === sub ? (sub==='night' ? 'bg-indigo-900 text-white' : 'bg-[var(--color-primary)] text-orange-950') : 'bg-white text-gray-600 hover:bg-gray-100 border border-black/5'}`}>
               {sub === 'night' ? 'מעקב לילה' : sub}
             </button>
           ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
           <Card className="p-0 overflow-hidden border border-black/5 bg-white shadow-sm">
             <div className="bg-gray-50/50 px-6 py-4 border-b border-black/5 font-bold text-gray-800 text-lg flex items-center gap-2">נוכחות וזמנים</div>
             <div className="px-6 py-2">
               {activeTab !== 'night' && (
                 <>
                   <StatRow icon={<AlertTriangle className="text-red-500" size={24} />} label="חיסורים (ללא אישור)" value={metrics.totalAbsents} />
                   <StatRow icon={<Clock className="text-orange-500" size={24} />} label="איחורי סדרים (דקות)" value={metrics.totalMinutesLate} subLabel={`${metrics.totalLates} איחורים סה״כ`} />
                   <StatRow icon={<BarChart className="text-blue-500" size={24} />} label="אחוזי נוכחות" value={`${metrics.attendancePercentage}%`} subLabel={`מתוך ${metrics.totalLessonsCount} שיעורים`} />
                 </>
               )}
               {(activeTab === 'all' || activeTab === 'night') && (
                 <>
                   <StatRow icon={<Moon className="text-indigo-500" size={24} />} label="איחורי המפיל / חדרים" value={metrics.nightLatesSum} subLabel={`${metrics.totalNightMissingHamapil} איחורים סה״כ`} />
                 </>
               )}
             </div>
           </Card>
           
           {activeTab !== 'night' && (
             <Card className="p-0 overflow-hidden border border-black/5 bg-white shadow-sm h-min">
               <div className="bg-gray-50/50 px-6 py-4 border-b border-black/5 font-bold text-gray-800 text-lg flex items-center gap-2">הישגים ולמידה</div>
               <div className="px-6 py-2 flex flex-col gap-2 h-full">
                 <StatRow icon={<BookOpen className="text-green-600" size={24} />} label="אחוזי למידה ומדדים" value={`${metrics.learningPercentage}%`} />
                 <StatRow icon={<GraduationCap className="text-purple-500" size={24} />} label="ממוצע ציוני מבחנים" value={metrics.averageExamScore} subLabel={`מתוך ${metrics.validScoresCount} ציונים`} />
               </div>
             </Card>
           )}
        </div>

        {/* Full-width Graph */}
        {activeTab !== 'night' && graphData.length > 0 && (
          <Card className="p-5 mb-6 border border-black/5 bg-white shadow-sm">
            <div className="flex items-center gap-2 font-bold text-gray-800 text-lg mb-6 w-full justify-start">
              <TrendingUp className="text-blue-500" size={20} />
              <span>התקדמות למידה ומבחנים</span>
            </div>
            <div className="w-full h-[280px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
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
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} dy={10} />
                    <YAxis domain={[0,100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} dx={-10} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontSize: '12px', textAlign: 'right' }} 
                      itemStyle={{ fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }}/>
                    
                    <Area type="monotone" name="רמת למידה (%)" dataKey="learningRate" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorL)" activeDot={{ r: 6 }} connectNulls />
                    <Area type="monotone" name="ממוצע מבחנים (%)" dataKey="examAverage" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorE)" activeDot={{ r: 6 }} connectNulls />
                 </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Dynamic Matrix Record specific to this student */}
        <Card className="p-0 border border-black/5 overflow-hidden shadow-sm">
          <div className="bg-gray-50/50 px-6 py-4 border-b border-black/5 font-bold text-gray-800 text-lg flex justify-between items-center">
            <span>היסטוריית נתונים מפורטת</span>
            {activeTab !== 'all' && <Badge variant="primary">{activeTab === 'night' ? 'מעקב לילה' : activeTab}</Badge>}
          </div>
          <div className="px-4 py-2 bg-white flex justify-end">
             {matrixEvents.dayKeys.length === 0 ? (
               <div className="py-12 w-full text-center text-gray-400 font-medium font-bold">אין נתונים זמינים</div>
             ) : (
                <div className="overflow-x-auto w-full pb-4 hide-scrollbar">
                   <table className="border-collapse" dir="rtl">
                      <thead>
                        <tr>
                          {matrixEvents.dayKeys.map(dayKey => {
                            const dayEvents = matrixEvents.groupedByDay[dayKey];
                            const dateObj = new Date(dayEvents[0].dataList[0].date);
                            return (
                              <th key={dayKey} colSpan={dayEvents.length} className="py-2 bg-white border-l-2 border-l-slate-300 border-b-2 border-b-slate-200 text-right font-bold text-slate-800">
                                <div className="flex flex-row items-baseline justify-start gap-1 pr-2 truncate">
                                  <span className="text-[15px] font-extrabold text-slate-800">{dateObj.toLocaleDateString('he-IL', { weekday: 'long' })}</span>
                                  <span className="text-[13px] font-bold text-orange-950">{getHebrewDateOnly(dayEvents[0].dataList[0].date)}</span>
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
                                <th key={`${dayKey}-${i}`} className={`bg-white border-b border-gray-200 text-center font-medium w-[110px] min-w-[110px] max-w-[110px] p-0 ${isLastInDay ? 'border-l-2 border-l-slate-300' : 'border-l border-gray-200'}`}>
                                  <div className={`py-1.5 px-1 truncate text-[11px] font-bold w-full h-full ${ev.type === 'night' ? 'text-indigo-800 bg-indigo-50/60' : 'text-orange-800 bg-orange-50/60'}`}>
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
                                <td key={`${dayKey}-${i}`} className={`p-0 align-top ${isLastInDay ? 'border-l-2 border-l-slate-300' : 'border-l border-gray-100/60'}`}>
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
      </div>
    </div>
  );
}

function StatRow({ icon, label, value, subLabel }: any) {
  return (
    <div className="flex justify-between items-center py-4 border-b border-black/5 last:border-0">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gray-50 rounded-xl border border-black/5 flex items-center justify-center">{icon}</div>
        <div><div className="text-gray-900 font-bold">{label}</div>{subLabel && <div className="text-sm text-gray-500 mt-0.5 font-medium">{subLabel}</div>}</div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
