import React, { useMemo, useState } from 'react';
import { useAppStore } from '../AppContext';
import { Card } from './ui';
import { formatHebrewDate, getHebrewDateOnly } from '../lib/dateUtils';
import { Check, X, Clock, MessageSquare, AlertCircle, FileText, Filter } from 'lucide-react';
import { Lesson, NightRegistration, Student } from '../types';
import { DateRangePicker } from './DateRangePicker';

type TimelineEvent = { 
  id: string; // unique combo id for react
  type: 'lesson' | 'night'; 
  dataList: any[]; // List of Lesson or NightRegistration objects combined into this column
  time: number; 
  label: string;
};

export function GeneralMatrixView() {
  const { students, lessons, nightRegistrations, shiurim, subjects } = useAppStore();
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [filterShiur, setFilterShiur] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{start: Date | null, end: Date | null}>({ start: null, end: null });

  // Close active note by clicking anywhere outside
  React.useEffect(() => {
    const handleGlobalClick = () => setActiveNoteId(null);
    if (activeNoteId) {
      window.addEventListener('click', handleGlobalClick);
      return () => window.removeEventListener('click', handleGlobalClick);
    }
  }, [activeNoteId]);

  // Sort and group events by date
  const events = useMemo(() => {
    let rawEvents = [
      ...lessons.map(l => ({ type: 'lesson' as const, data: l, time: new Date(l.date).getTime(), label: l.subject, shiurim: l.shiurim })),
      ...nightRegistrations.map(n => ({ type: 'night' as const, data: n, time: new Date(n.date).getTime(), label: 'רישום לילה', shiurim: n.shiurim }))
    ];

    // Apply subject filter: if "all" do nothing, otherwise filter. 
    // Always include night events unless specifically choosing a subject, in which case exclude them, OR 
    // allow a special filter "night" if we add it. We'll simply let subject filter mean "Show only this subject".
    if (filterSubject !== 'all') {
      if (filterSubject === 'night') {
        rawEvents = rawEvents.filter(ev => ev.type === 'night');
      } else {
        rawEvents = rawEvents.filter(ev => ev.type === 'lesson' && ev.label === filterSubject);
      }
    }

    if (dateRange.start) {
      const s = dateRange.start.getTime();
      const e = dateRange.end ? dateRange.end.getTime() + 86400000 - 1 : s + 86400000 - 1; // End of the day
      rawEvents = rawEvents.filter(ev => ev.time >= s && ev.time <= e);
    }

    rawEvents.sort((a, b) => a.time - b.time); // Earliest first

    const groupedByDay: Record<string, TimelineEvent[]> = {};
    rawEvents.forEach(ev => {
      const dayStr = new Date(ev.time).toLocaleDateString('en-CA'); // YYYY-MM-DD
      if (!groupedByDay[dayStr]) groupedByDay[dayStr] = [];
      
      // Attempt to merge with an existing event in the SAME DAY that has the SAME LABEL and NON-OVERLAPPING Shiurim
      let merged = false;
      for (const existing of groupedByDay[dayStr]) {
        if (existing.label === ev.label) {
          // Check for shiurim overlap
          const existingShiurim = new Set(existing.dataList.flatMap(d => d.shiurim));
          const hasOverlap = ev.shiurim.some(s => existingShiurim.has(s));
          if (!hasOverlap) {
            existing.dataList.push(ev.data);
            merged = true;
            break;
          }
        }
      }
      
      if (!merged) {
        groupedByDay[dayStr].push({
          id: `${ev.type}-${ev.data.id}`,
          type: ev.type,
          dataList: [ev.data],
          time: ev.time,
          label: ev.label
        });
      }
    });

    // Flatten back to total merged events
    const allEvents = Object.values(groupedByDay).flat();

    return {
      allEvents,
      groupedByDay,
      dayKeys: Object.keys(groupedByDay).sort((a, b) => a.localeCompare(b)) // Earliest days first (appears on the right in RTL)
    };
  }, [lessons, nightRegistrations, filterSubject, dateRange]);

  const studentsByShiur = useMemo(() => {
    const groups: Record<string, Student[]> = {};
    const filteredStudents = filterShiur === 'all' ? students : students.filter(s => s.shiur === filterShiur);

    filteredStudents.forEach(s => {
      if (!groups[s.shiur]) groups[s.shiur] = [];
      groups[s.shiur].push(s);
    });
    const sortedKeys = Object.keys(groups).sort((a, b) => a.localeCompare(b));
    sortedKeys.forEach(k => {
      groups[k].sort((a, b) => a.name.localeCompare(b.name));
    });
    return { groups, sortedKeys };
  }, [students, filterShiur]);

  const renderLessonCell = (record: any, ev: TimelineEvent, student: Student) => {
    if (!record) return <div className="text-gray-300 w-[110px] h-[46px] bg-white flex items-center justify-center">-</div>;

    const isAbsent = record.isAbsent || record.attendance === 'ABSENT';
    const isLate = (record.minutesLate || 0) > 0 || record.attendance === 'LATE';

    const allNotes = [record.absenceNote, record.lessonNote].filter(Boolean).join('\n\n');
    const hasNote = !!allNotes;
    const cellId = `lesson-${ev.time}-${student.id}`;
    const isActiveNote = activeNoteId === cellId;

    const wrapperProps = hasNote ? {
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation(); // prevent window click from immediately closing it
        setActiveNoteId(isActiveNote ? null : cellId);
      },
      className: "relative flex w-[110px] min-w-[110px] h-[46px] transition-all bg-white hover:bg-orange-50/50 cursor-pointer outline outline-1 outline-orange-200/50 hover:shadow-inner items-center justify-center rounded-sm",
    } : {
      className: "relative flex w-[110px] min-w-[110px] h-[46px] transition-colors bg-white items-center justify-center outline outline-1 outline-gray-100/50",
    };

    const renderNotePopover = () => {
      if (!isActiveNote || !hasNote) return null;
      return (
        <div 
          className="absolute top-[80%] left-1/2 -translate-x-1/2 z-[999] bg-white border border-orange-200 shadow-xl rounded-lg p-3 w-56 animate-in fade-in zoom-in duration-150 cursor-auto"
          onClick={e => e.stopPropagation()}
        >
           <h4 className="font-bold text-gray-800 text-[13px] leading-tight mb-1" dir="rtl">{ev.label} • {getHebrewDateOnly(ev.data.date)}</h4>
           <div className="text-gray-600 text-[12px] whitespace-pre-wrap leading-relaxed max-h-[150px] overflow-y-auto custom-scrollbar" dir="rtl">
             {allNotes}
           </div>
        </div>
      );
    };

    if (isAbsent) {
      const textColor = record.isAuthorizedAbsence ? 'text-emerald-600' : 'text-red-600';
      const text = record.isAuthorizedAbsence ? 'אישור' : 'חיסר';
      return (
        <div {...wrapperProps} dir="rtl">
          {hasNote && <div className="absolute top-0.5 left-0.5 text-orange-500 bg-white/90 rounded-sm p-0.5 shadow-sm"><FileText size={10} /></div>}
          <span className={`text-[15px] font-bold ${textColor}`}>{text}</span>
          {renderNotePopover()}
        </div>
      );
    }

    // Calculate Lateness Text Right side
    let latenessText: any = '0';
    let latenessTextColor = 'text-emerald-500 font-bold';

    if (isLate) {
      latenessTextColor = 'text-red-500 font-bold';
      latenessText = `-${record.minutesLate || 0}`;
    }

    // Calculate Learning Percent Box Left side
    let learningBg = 'bg-transparent';
    let learningTextColor = 'text-transparent';
    let learningText = '';

    const getScore = (b: any) => b === 'LEARNING' ? 2 : b === 'PARTIAL' ? 1 : b === 'NONE' ? 0 : null;
    const s1 = getScore(record.behavior1);
    const s2 = getScore(record.behavior2);

    if (s1 !== null || s2 !== null) {
      const total = (s1 || 0) + (s2 || 0);
      const percent = (total / 4) * 100;
      learningText = `${percent}%`;

      if (percent === 100) {
        learningBg = 'bg-emerald-100/60';
        learningTextColor = 'text-emerald-700';
      } else if (percent === 75) {
        learningBg = 'bg-emerald-50';
        learningTextColor = 'text-emerald-600';
      } else if (percent === 50) {
        learningBg = 'bg-gray-100/60';
        learningTextColor = 'text-gray-600';
      } else if (percent === 25) {
        learningBg = 'bg-rose-50';
        learningTextColor = 'text-rose-600';
      } else {
        learningBg = 'bg-rose-100/60';
        learningTextColor = 'text-rose-700';
      }
    } else {
       learningText = '-';
       learningBg = 'bg-gray-50';
       learningTextColor = 'text-gray-400';
    }

    wrapperProps.className = hasNote 
      ? "relative flex w-[110px] min-w-[110px] h-[46px] text-[14px] transition-all bg-white hover:bg-orange-50/50 cursor-pointer items-center justify-between px-1.5 outline outline-1 outline-orange-200 hover:shadow-inner gap-1.5 rounded-sm"
      : "relative flex w-[110px] min-w-[110px] h-[46px] text-[14px] transition-colors bg-white items-center justify-between px-1.5 outline outline-1 outline-gray-100/50 gap-1.5";

    return (
      <div {...wrapperProps} dir="rtl">
        {hasNote && <div className="absolute top-[2px] left-[2px] text-orange-500 bg-white/90 rounded-sm p-[1px] shadow-[0_1px_2px_rgba(0,0,0,0.1)] z-10"><FileText size={10} strokeWidth={3} /></div>}
        <div className={`w-7 text-center shrink-0 ${latenessTextColor}`}>
          {latenessText}
        </div>
        <div className={`flex-1 flex items-center justify-center p-1 h-[36px] rounded-md text-[13px] font-bold ${learningBg} ${learningTextColor}`}>
          {learningText}
        </div>
        {renderNotePopover()}
      </div>
    );
  };

  const renderNightCell = (record: any, ev: TimelineEvent, student: Student) => {
    if (!record) return <div className="text-gray-300 w-[110px] min-w-[110px] h-[46px] bg-white flex items-center justify-center">-</div>;

    const allNotes = record.notes;
    const hasNote = !!allNotes;
    const cellId = `night-${ev.time}-${student.id}`;
    const isActiveNote = activeNoteId === cellId;

    const wrapperProps = hasNote ? {
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveNoteId(isActiveNote ? null : cellId);
      },
      className: "relative flex w-[110px] min-w-[110px] h-[46px] transition-all bg-slate-50 hover:bg-indigo-50/50 cursor-pointer outline outline-1 outline-indigo-200/50 hover:shadow-inner items-center justify-center rounded-sm",
    } : {
      className: "relative flex w-[110px] min-w-[110px] h-[46px] transition-colors bg-slate-50 items-center justify-center outline outline-1 outline-gray-100/50",
    };

    const renderNotePopover = () => {
      if (!isActiveNote || !hasNote) return null;
      return (
        <div 
          className="absolute top-[80%] left-1/2 -translate-x-1/2 z-[999] bg-white border border-indigo-200 shadow-xl rounded-lg p-3 w-56 animate-in fade-in zoom-in duration-150 cursor-auto"
          onClick={e => e.stopPropagation()}
        >
           <h4 className="font-bold text-gray-800 text-[13px] leading-tight mb-1" dir="rtl">{ev.label} • {getHebrewDateOnly(ev.data.date)}</h4>
           <div className="text-gray-600 text-[12px] whitespace-pre-wrap leading-relaxed max-h-[150px] overflow-y-auto custom-scrollbar" dir="rtl">
             {allNotes}
           </div>
        </div>
      );
    };

    // Use a clean minimal layout for Night cells just like Lessons, but text summary
    const roomText = record.isRoomAbsent ? 'חיסר בחדר' : (record.roomMinutesLate ? `חדר -${record.roomMinutesLate}` : 'חדר 0');
    const roomClasses = record.isRoomAbsent ? 'text-red-600 font-bold' : (record.roomMinutesLate ? 'text-red-500' : 'text-emerald-500 font-bold');
    
    // If BOTH are undefined, it means this record doesn't track this yet or hasn't started
    if (record.roomMinutesLate === undefined && record.hamapilMinutesLate === undefined && !record.isRoomAbsent && !record.talking && !hasNote) {
       return <div className="text-gray-300 w-[110px] min-w-[110px] h-[46px] bg-white flex items-center justify-center">-</div>;
    }

    const hText = record.hamapilMinutesLate === undefined ? 'המפיל -' : record.hamapilMinutesLate === 0 ? 'המפיל 0' : `המפיל -${record.hamapilMinutesLate}`;
    const hClasses = record.hamapilMinutesLate === undefined ? 'text-gray-400' : record.hamapilMinutesLate === 0 ? 'text-emerald-500 font-bold' : 'text-red-500';

    wrapperProps.className = hasNote
      ? "relative flex flex-col w-[110px] min-w-[110px] h-[46px] justify-center px-2 py-1 text-[11px] font-semibold bg-slate-50 hover:bg-indigo-50/50 cursor-pointer outline outline-1 outline-indigo-200 hover:shadow-inner leading-tight rounded-sm block"
      : "relative flex flex-col w-[110px] min-w-[110px] h-[46px] justify-center px-2 py-1 text-[11px] font-semibold bg-slate-50 border-r-2 border-indigo-100/50 leading-tight";

    return (
      <div {...wrapperProps} dir="rtl">
        {hasNote && <div className="absolute top-[2px] left-[2px] text-indigo-500 bg-white/90 rounded-sm p-[1px] shadow-[0_1px_2px_rgba(0,0,0,0.1)] z-10"><FileText size={10} strokeWidth={3} /></div>}
        <div className="flex justify-between items-center gap-1">
          <span className={`${roomClasses} truncate`}>{roomText}</span>
          {record.talking && <MessageSquare className="text-red-500 shrink-0" size={12} />}
        </div>
        <div className={`${hClasses} truncate`}>
           {hText}
        </div>
        {renderNotePopover()}
      </div>
    );
  };

  return (
    <div className="w-full mx-auto space-y-6">
      <Card className="bg-[var(--color-primary)] text-orange-950 p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 rounded-xl relative z-[100]">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertCircle size={24} /> מצב כללי
          </h1>
          <p className="opacity-90 text-sm mt-1">טבלה מרוכזת של נוכחות, איחורים ולמידה לפי ימים וסדרים.</p>
        </div>
        <div className="flex flex-wrap lg:flex-nowrap items-center justify-end gap-3 w-full lg:w-auto" dir="rtl">
          <div className="flex-1 lg:flex-none w-full lg:w-auto">
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
          
          <div className="bg-white/80 backdrop-blur px-3 py-2 rounded-lg border border-orange-200/50 flex items-center gap-2 shadow-sm flex-1 sm:flex-none">
             <Filter size={14} className="text-orange-900/60" />
             <select 
               value={filterShiur} 
               onChange={(e) => setFilterShiur(e.target.value)}
               className="bg-transparent border-none text-sm font-semibold text-orange-950 focus:ring-0 cursor-pointer outline-none w-full appearance-none"
             >
               <option value="all">כל השיעורים</option>
               {shiurim.map(s => <option key={s} value={s}>שיעור {s}</option>)}
             </select>
          </div>
          <div className="bg-white/80 backdrop-blur px-3 py-2 rounded-lg border border-orange-200/50 flex items-center gap-2 shadow-sm flex-1 sm:flex-none">
             <Filter size={14} className="text-orange-900/60" />
             <select 
               value={filterSubject} 
               onChange={(e) => setFilterSubject(e.target.value)}
               className="bg-transparent border-none text-sm font-semibold text-orange-950 focus:ring-0 cursor-pointer outline-none w-full appearance-none max-w-[120px] truncate"
             >
               <option value="all">כל המקצועות</option>
               {subjects.map(s => <option key={s} value={s}>{s}</option>)}
               <option value="night">רישום לילה</option>
             </select>
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden bg-white shadow-sm border border-black/5 rounded-xl">
        <div className="overflow-auto max-h-[calc(100vh-250px)]" dir="rtl">
          {events.allEvents.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm font-medium bg-white">
              {filterSubject !== 'all' ? 'לא נמצאו שיעורים התואמים את המקצוע שבחרת.' : 'אין עדיין רישומים במערכת להצגה.'}
            </div>
          ) : (
            <table className="w-full text-sm border-collapse min-w-max table-fixed" dir="rtl">
              <colgroup>
                <col className="w-[150px] min-w-[150px] max-w-[150px]" />
                {events.allEvents.map((_, i) => (
                  <col key={i} className="w-[110px] min-w-[110px] max-w-[110px]" />
                ))}
              </colgroup>
              <thead className="relative z-30 shadow-[0_1px_2px_rgba(0,0,0,0.03)] rounded-xl overflow-hidden">
                {/* Days Header */}
                <tr className="z-[50] relative">
                  <th rowSpan={2} className="px-4 bg-white border-l-2 border-slate-300 border-b-2 border-b-slate-200 font-bold text-gray-500 text-xs sticky right-0 z-[60] top-0 w-[150px] min-w-[150px] shadow-[inset_1px_0_2px_rgba(0,0,0,0.05)] align-middle">תלמיד / סדר</th>
                  {events.dayKeys.map(dayKey => {
                    const dayEvents = events.groupedByDay[dayKey];
                    const dateObj = new Date(dayEvents[0].dataList[0].date);
                    const hebrewWeekday = dateObj.toLocaleDateString('he-IL', { weekday: 'long' });
                    const hebrewStr = getHebrewDateOnly(dayEvents[0].dataList[0].date);
                    const gregStr = dateObj.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' });
                    return (
                      <th 
                        key={dayKey} 
                        colSpan={dayEvents.length} 
                        className="py-2 bg-[#f8fafc] border-l-2 border-l-slate-300 border-b-2 border-b-slate-200 text-right font-bold text-slate-800 sticky top-0 z-[40]"
                      >
                        <div className="flex flex-row items-baseline justify-start gap-1 pr-2 truncate">
                          <span className="text-[15px] font-extrabold text-slate-800">{hebrewWeekday}</span>
                          <span className="text-[13px] font-bold text-orange-950">{hebrewStr}</span>
                          <span className="text-[11px] font-medium text-slate-400 mr-1">{gregStr}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
                {/* Events Header */}
                <tr className="z-[40] relative">
                  {events.dayKeys.map(dayKey => {
                    return events.groupedByDay[dayKey].map((ev, i) => {
                      const isLastInDay = i === events.groupedByDay[dayKey].length - 1;
                      const borderLeft = isLastInDay ? 'border-l-2 border-l-slate-300' : 'border-l border-gray-200';
                      return (
                        <th key={`${dayKey}-${i}`} className={`bg-white border-b border-gray-200 text-center font-medium w-[110px] min-w-[110px] max-w-[110px] sticky top-[42px] z-[30] ${borderLeft} p-0`}>
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
                {studentsByShiur.sortedKeys.length === 0 ? (
                  <tr>
                    <td colSpan={events.allEvents.length + 1} className="p-12 text-center text-slate-500 font-medium bg-white">לא נמצאו נתונים תואמים את סינון השיעור</td>
                  </tr>
                ) : studentsByShiur.sortedKeys.map((shiurKey) => (
                  <React.Fragment key={shiurKey}>
                    {/* Shiur Header Row */}
                    <tr>
                      <td colSpan={events.allEvents.length + 1} className="bg-slate-50/60 text-slate-500 font-semibold text-xs py-2 pr-4 text-right sticky right-0 z-[25] border-y border-gray-100 shadow-[inset_0_-1px_0_rgba(0,0,0,0.02)]">
                        שיעור {shiurKey}
                      </td>
                    </tr>
                    {/* Students Rows */}
                    {studentsByShiur.groups[shiurKey].map(student => (
                      <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="w-[150px] min-w-[150px] max-w-[150px] px-3 py-1.5 border-l border-b border-gray-100 font-medium text-[13.5px] text-gray-800 sticky right-0 bg-white z-[25] shadow-[inset_1px_0_2px_rgba(0,0,0,0.02)] whitespace-nowrap">
                          {student.name}
                        </td>
                        {events.dayKeys.map(dayKey => {
                          const dayEvents = events.groupedByDay[dayKey];
                          return dayEvents.map((ev, i) => {
                            // Check if ANY of the data items include this student's shiur
                            const dataItemIndex = ev.dataList.findIndex(d => d.shiurim.includes(student.shiur));
                            const isIncluded = dataItemIndex !== -1;
                            const isLastInDay = i === dayEvents.length - 1;
                            const borderLeft = isLastInDay ? 'border-l-2 border-l-slate-300' : 'border-l border-gray-100/60';
                            
                            if (!isIncluded) {
                              return <td key={`${dayKey}-${i}`} className={`p-0 border-b border-gray-100/60 bg-gray-50/20 align-middle w-[110px] min-w-[110px] max-w-[110px] relative ${borderLeft}`}><div className="flex items-center justify-center w-full h-[46px] text-[11px] text-gray-300">-</div></td>;
                            }
                            
                            const dataItem = ev.dataList[dataItemIndex];
                            const record = dataItem.records[student.id];
                            
                            return (
                              <td key={`${dayKey}-${i}`} className={`p-0 border-b border-gray-100/60 bg-white align-middle w-[110px] min-w-[110px] max-w-[110px] relative ${borderLeft}`}>
                                {ev.type === 'lesson' 
                                  // Pass single dataItem wrapping inside generic TimelineEvent format to reuse existing renderers without big changes
                                  ? renderLessonCell(record, { type: ev.type, data: dataItem, time: ev.time, label: ev.label } as any, student) 
                                  : renderNightCell(record, { type: ev.type, data: dataItem, time: ev.time, label: ev.label } as any, student)}
                              </td>
                            );
                          });
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
