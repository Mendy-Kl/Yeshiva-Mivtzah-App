import React, { useMemo, useState } from 'react';
import { useAppStore } from '../AppContext';
import { Card } from './ui';
import { Filter, Search, BarChart3, TrendingUp, Presentation, Calendar, CalendarDays } from 'lucide-react';
import { StudentProfileView } from './StudentProfileView';
import { DateRangePicker } from './DateRangePicker';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface FlatRecord {
  lessonId: string;
  studentId: string;
  studentName: string;
  shiur: string;
  subject: string;
  onTime: number;
  late: number;
  unauthorizedAbsent: number;
  authorizedAbsent: number;
  learningSum: number;
  learningCount: number;
  time: number;
}

interface FlatExamRecord {
  examId: string;
  studentId: string;
  studentName: string;
  shiur: string;
  subject: string;
  score: number;
  time: number;
}

type GraphType = 'learning' | 'exams' | 'both';
type TimeframeType = 'sessions' | 'days' | 'weeks' | 'months';

export function ReportsView() {
  const { students, lessons, shiurim, subjects, exams } = useAppStore();
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedShiurim, setSelectedShiurim] = useState<string[]>([]); // empty means all
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  
  const [dateRange, setDateRange] = useState<{start: Date | null, end: Date | null}>({ start: null, end: null });

  // Graph state
  const [showGraph, setShowGraph] = useState(false);
  const [graphType, setGraphType] = useState<GraphType>('both');
  const [graphTimeframe, setGraphTimeframe] = useState<TimeframeType>('days');

  const finishedLessons = lessons.filter(l => !l.isActive);

  // Flatten all records into a single queryable list
  const flatRecords = useMemo(() => {
    const records: FlatRecord[] = [];
    finishedLessons.forEach(lesson => {
      const time = new Date(lesson.date).getTime();
      students.forEach(student => {
        if (!lesson.shiurim.includes(student.shiur)) return;
        const record = lesson.records[student.id];
        if (record) {
          const isAbsent = record.isAbsent || record.attendance === 'ABSENT';
          const isAuthorized = !!record.isAuthorizedAbsence;
          const minutesLate = record.minutesLate || 0;
          
          let onTime = 0, late = 0, unauthAbs = 0, authAbs = 0;
          if (isAbsent) {
            if (isAuthorized) authAbs = 1;
            else unauthAbs = 1;
          } else if (minutesLate > 0 || record.attendance === 'LATE') {
            late = 1;
          } else {
            onTime = 1;
          }
          
          let lSum = 0, lCount = 0;
          if (!authAbs) {
            [record.behavior1, record.behavior2].forEach(b => {
              if (b) {
                lCount++;
                if (b === 'LEARNING') lSum += 100;
                if (b === 'PARTIAL') lSum += 50;
                if (b === 'NONE') lSum += 0;
              }
            });
          }

          records.push({
            lessonId: lesson.id,
            studentId: student.id,
            studentName: student.name,
            shiur: student.shiur,
            subject: lesson.subject || 'כללי',
            onTime,
            late,
            unauthorizedAbsent: unauthAbs,
            authorizedAbsent: authAbs,
            learningSum: lSum,
            learningCount: lCount,
            time
          });
        }
      });
    });
    return records;
  }, [finishedLessons, students]);

  const filteredRecords = useMemo(() => {
    return flatRecords.filter(r => {
      if (selectedSubject !== 'all' && r.subject !== selectedSubject) return false;
      if (selectedShiurim.length > 0 && !selectedShiurim.includes(r.shiur)) return false;
      if (searchTerm && !r.studentName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (dateRange.start) {
        const s = dateRange.start.getTime();
        const e = dateRange.end ? dateRange.end.getTime() + 86400000 - 1 : s + 86400000 - 1; // End of day
        if (r.time < s || r.time > e) return false;
      }
      return true;
    });
  }, [flatRecords, selectedSubject, selectedShiurim, searchTerm, dateRange]);

  const flatExamRecords = useMemo(() => {
    const records: FlatExamRecord[] = [];
    exams.forEach(exam => {
       const time = new Date(exam.date).getTime();
       students.forEach(student => {
         if (!exam.shiurim.includes(student.shiur)) return;
         const grade = exam.grades[student.id];
         if (grade && grade.score && !isNaN(Number(grade.score))) {
           records.push({
             examId: exam.id,
             studentId: student.id,
             studentName: student.name,
             shiur: student.shiur,
             subject: exam.subject || 'כללי', // Treat subjects similarly
             score: Number(grade.score),
             time
           });
         }
       });
    });
    return records;
  }, [exams, students]);

  const filteredExamRecords = useMemo(() => {
    return flatExamRecords.filter(r => {
      if (selectedSubject !== 'all' && r.subject !== selectedSubject) return false;
      if (selectedShiurim.length > 0 && !selectedShiurim.includes(r.shiur)) return false;
      if (searchTerm && !r.studentName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (dateRange.start) {
        const s = dateRange.start.getTime();
        const e = dateRange.end ? dateRange.end.getTime() + 86400000 - 1 : s + 86400000 - 1; 
        if (r.time < s || r.time > e) return false;
      }
      return true;
    });
  }, [flatExamRecords, selectedSubject, selectedShiurim, searchTerm, dateRange]);

  const aggregate = (records: FlatRecord[]) => {
    const onTime = records.reduce((sum, r) => sum + r.onTime, 0);
    const late = records.reduce((sum, r) => sum + r.late, 0);
    const unauthAbs = records.reduce((sum, r) => sum + r.unauthorizedAbsent, 0);
    const authAbs = records.reduce((sum, r) => sum + r.authorizedAbsent, 0);
    
    // Authorized absences are ignored in attendance percentage calculation entirely
    const totalRelevantAttendance = onTime + late + unauthAbs; 
    const attendanceRate = totalRelevantAttendance > 0 ? ((onTime + late) / totalRelevantAttendance) * 100 : (records.length > 0 ? 100 : 0);
    
    const learningSum = records.reduce((sum, r) => sum + r.learningSum, 0);
    const learningCount = records.reduce((sum, r) => sum + r.learningCount, 0);
    const learningRate = learningCount > 0 ? (learningSum / learningCount) : (records.length > 0 ? 100 : 0);

    return { onTime, late, unauthAbs, authAbs, totalRelevantAttendance, attendanceRate, learningSum, learningCount, learningRate, totalRecords: records.length };
  };

  const aggregateExams = (records: FlatExamRecord[]) => {
    if (records.length === 0) return 0;
    const sum = records.reduce((acc, r) => acc + r.score, 0);
    return sum / records.length;
  };

  const generalStats = aggregate(filteredRecords);
  const generalExamAverage = aggregateExams(filteredExamRecords);

  const displayedStudents = useMemo(() => {
    return students
      .filter(s => selectedShiurim.length === 0 || selectedShiurim.includes(s.shiur))
      .filter(s => !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .map(s => {
        const sRecs = filteredRecords.filter(r => r.studentId === s.id);
        const sExamRecs = filteredExamRecords.filter(r => r.studentId === s.id);
        return { 
          student: s, 
          stats: aggregate(sRecs), 
          examAverage: aggregateExams(sExamRecs), 
          examCount: sExamRecs.length 
        };
      });
  }, [students, selectedShiurim, filteredRecords, filteredExamRecords, searchTerm]);

  const groupedStudents = useMemo(() => {
    return displayedStudents.reduce((acc, curr) => {
      if (!acc[curr.student.shiur]) acc[curr.student.shiur] = [];
      acc[curr.student.shiur].push(curr);
      return acc;
    }, {} as Record<string, typeof displayedStudents>);
  }, [displayedStudents]);

  const toggleShiur = (shiur: string) => {
    setSelectedShiurim(prev => 
      prev.includes(shiur) ? prev.filter(s => s !== shiur) : [...prev, shiur]
    );
  };

  const getWeekNumber = (d: Date) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  };

  const graphData = useMemo(() => {
    if (!showGraph) return [];

    const grouped: Record<string, { time: number, label: string, learningSum: number, learningCount: number, examSum: number, examCount: number }> = {};

    const processTime = (time: number) => {
      const d = new Date(time);
      if (graphTimeframe === 'sessions') return { key: `${time}`, label: d.toLocaleDateString('he-IL', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}), t: time };
      if (graphTimeframe === 'days') return { key: d.toLocaleDateString('en-CA'), label: d.toLocaleDateString('he-IL', {day:'2-digit', month:'2-digit'}), t: d.setHours(0,0,0,0) };
      if (graphTimeframe === 'weeks') {
        const w = getWeekNumber(d);
        return { key: `${d.getFullYear()}-W${w}`, label: `שבוע ${w}`, t: d.getTime() };
      }
      if (graphTimeframe === 'months') return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('he-IL', {month:'long', year:'2-digit'}), t: d.setDate(1) };
      return { key: `${time}`, label: '', t: time };
    };

    filteredRecords.forEach(r => {
      const { key, label, t } = processTime(r.time);
      if (!grouped[key]) grouped[key] = { time: t, label, learningSum: 0, learningCount: 0, examSum: 0, examCount: 0 };
      grouped[key].learningSum += r.learningSum;
      grouped[key].learningCount += r.learningCount;
    });

    filteredExamRecords.forEach(r => {
      const { key, label, t } = processTime(r.time);
      if (!grouped[key]) grouped[key] = { time: t, label, learningSum: 0, learningCount: 0, examSum: 0, examCount: 0 };
      grouped[key].examSum += r.score;
      grouped[key].examCount += 1;
    });

    return Object.values(grouped).sort((a, b) => a.time - b.time).map(g => ({
       label: g.label,
       learningRate: g.learningCount > 0 ? Number((g.learningSum / g.learningCount).toFixed(1)) : null,
       examAverage: g.examCount > 0 ? Number((g.examSum / g.examCount).toFixed(1)) : null
    }));
  }, [showGraph, filteredRecords, filteredExamRecords, graphTimeframe]);

  if (activeStudentId) {
    return <StudentProfileView studentId={activeStudentId} onClose={() => setActiveStudentId(null)} />;
  }

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-4">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">דוחות וסטטיסטיקות</h1>
        <p className="text-gray-600">סנן נתונים לפי מקצוע ושיעור כדי לראות מצב כללי וסטטיסטיקה פרטנית לפי בחור.</p>
      </div>

      <Card className="mb-4 bg-white/50 backdrop-blur-sm border-gray-200/60 p-4">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                <Filter size={14} />
                <span>סינון לפי מקצוע</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button 
                  onClick={() => setSelectedSubject('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedSubject === 'all' ? 'bg-[var(--color-primary)] text-orange-900 border border-orange-500 shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >כל המקצועות</button>
                {subjects.map(subj => (
                  <button 
                    key={subj}
                    onClick={() => setSelectedSubject(subj)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedSubject === subj ? 'bg-[var(--color-primary)] text-orange-900 border border-orange-500 shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >{subj}</button>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                <Filter size={14} />
                <span>סינון לפי שיעור</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button 
                  onClick={() => setSelectedShiurim([])}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedShiurim.length === 0 ? 'bg-blue-50 text-blue-800 border border-blue-500 shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >כל השיעורים</button>
                {shiurim.map(shiur => (
                  <button 
                    key={shiur}
                    onClick={() => toggleShiur(shiur)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedShiurim.includes(shiur) ? 'bg-blue-50 text-blue-800 border border-blue-500 shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >{shiur}</button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                <Filter size={14} />
                <span>סינון לפי תאריכים</span>
              </div>
              <div className="flex w-full sm:w-max">
                <DateRangePicker value={dateRange} onChange={setDateRange} />
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-start gap-8 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 w-auto">
                <Search size={14} />
                <span>חיפוש:</span>
              </div>
              <input
                type="text"
                placeholder="שם תלמיד..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 min-w-[200px] max-w-sm px-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                dir="rtl"
              />
            </div>

            <div className="flex items-center gap-2 text-sm w-full sm:w-auto mt-2 sm:mt-0">
              <span className="text-gray-500 font-bold text-xs"><TrendingUp size={14} className="inline mr-1"/> גרפים:</span>
              <button 
                onClick={() => setShowGraph(!showGraph)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showGraph ? 'bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {showGraph ? 'הסתר גרף התקדמות' : 'הצג גרף התקדמות'}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {showGraph && (
        <Card className="mb-4 bg-white/80 p-4 border border-black/5 shadow-sm">
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                 <div className="flex bg-gray-100 p-1 rounded-lg">
                   <button onClick={() => setGraphType('learning')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${graphType === 'learning' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>למידה</button>
                   <button onClick={() => setGraphType('exams')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${graphType === 'exams' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>מבחנים</button>
                   <button onClick={() => setGraphType('both')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${graphType === 'both' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>משולב</button>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                 <div className="text-xs font-bold text-gray-500 flex items-center gap-1"><CalendarDays size={14}/> סיכום כל:</div>
                 <select 
                    value={graphTimeframe}
                    onChange={(e) => setGraphTimeframe(e.target.value as TimeframeType)}
                    className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
                 >
                    <option value="sessions">סדרים/שיעורים</option>
                    <option value="days">ימים</option>
                    <option value="weeks">שבועות</option>
                    <option value="months">חודשים</option>
                 </select>
              </div>
           </div>

           <div className="h-[300px] w-full mt-4" dir="ltr">
             {graphData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-medium">אין מספיק נתונים להצגת גרף בתאריכים אלו</div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={graphData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorLearning" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExams" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} dy={10} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} dx={-10} />
                    <Tooltip 
                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontSize: '12px', textAlign: 'right' }} 
                       itemStyle={{ fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }}/>
                    
                    {(graphType === 'learning' || graphType === 'both') && (
                       <Area type="monotone" name="רמת למידה (%)" dataKey="learningRate" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorLearning)" activeDot={{ r: 6 }} connectNulls />
                    )}
                    {(graphType === 'exams' || graphType === 'both') && (
                       <Area type="monotone" name="ממוצע מבחנים (%)" dataKey="examAverage" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorExams)" activeDot={{ r: 6 }} connectNulls />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
             )}
           </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <Card className="flex flex-col items-center justify-center p-6 text-center shadow-sm">
          <div className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">נוכחות כללית ({selectedSubject === 'all' ? 'הכל' : selectedSubject})</div>
          <div className="text-5xl font-black text-gray-900 font-mono mb-4 tracking-tighter">
            {generalStats.attendanceRate.toFixed(1)}<span className="text-3xl text-gray-400">%</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs justify-center">
            <span className="text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200" title="בזמן">בזמן: <b>{generalStats.onTime}</b></span>
            <span className="text-green-700 bg-green-50 px-2.5 py-1 rounded-lg border border-green-100" title="חיסור באישור">אישור: <b>{generalStats.authAbs}</b></span>
            <span className="text-red-700 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100" title="חיסר (ללא אישור)">חיסר: <b>{generalStats.unauthAbs}</b></span>
            <span className="text-yellow-800 bg-yellow-50 px-2.5 py-1 rounded-lg border border-yellow-200" title="איחר">איחר: <b>{generalStats.late}</b></span>
          </div>
        </Card>
        
        <Card className="flex flex-col items-center justify-center p-6 text-center shadow-sm">
          <div className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">רמת למידה ({selectedSubject === 'all' ? 'הכל' : selectedSubject})</div>
          <div className="text-5xl font-black text-blue-600 font-mono mb-4 tracking-tighter">
            {generalStats.learningRate.toFixed(1)}<span className="text-3xl text-blue-300">%</span>
          </div>
          <div className="text-xs text-blue-800 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg">
            מבוסס על <b>{generalStats.learningCount}</b> רישומי התנהגות
          </div>
        </Card>

        <Card className="flex flex-col items-center justify-center p-6 text-center shadow-sm">
          <div className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">ממוצע מבחנים ({selectedSubject === 'all' ? 'הכל' : selectedSubject})</div>
          <div className="text-5xl font-black text-orange-600 font-mono mb-4 tracking-tighter">
            {filteredExamRecords.length > 0 ? generalExamAverage.toFixed(1) : '-'}<span className="text-3xl text-orange-300">%</span>
          </div>
          <div className="text-xs text-orange-800 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-lg">
            מבוסס על <b>{filteredExamRecords.length}</b> ציונים
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        {shiurim.map(shiur => {
          const studentsInShiur = groupedStudents[shiur];
          // Hide shiur table if it is not selected AND we are filtering by shiur
          if (selectedShiurim.length > 0 && !selectedShiurim.includes(shiur)) return null;
          if (!studentsInShiur || studentsInShiur.length === 0) return null;

          // Always sort by name initially for consistent UI
          studentsInShiur.sort((a,b) => a.student.name.localeCompare(b.student.name));
          
          return (
            <Card key={shiur} className="overflow-hidden p-0 shadow-sm border border-gray-200/60">
              <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800">שיעור {shiur}</h2>
                <div className="text-xs font-medium text-gray-500 bg-white px-2.5 py-1 rounded-full border border-gray-200 shadow-sm">
                  {studentsInShiur.length} תלמידים
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-600">
                  <thead className="text-xs text-gray-500 uppercase bg-white">
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 font-semibold text-gray-700">שם התלמיד</th>
                      <th className="px-4 py-3 font-semibold">שיעורים</th>
                      <th className="px-4 py-3 font-semibold">נוכחות הכללית</th>
                      <th className="px-4 py-3 font-semibold">אחוז למידה ממוצע (0-100)</th>
                      <th className="px-4 py-3 font-semibold">ממוצע מבחנים</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {studentsInShiur.map(({ student, stats, examAverage, examCount }) => {
                      if (stats.onTime === 0 && stats.late === 0 && stats.unauthAbs === 0 && stats.authAbs === 0 && stats.learningCount === 0 && examCount === 0) {
                         // Still show the student but with grayed out stats if no records found
                         return (
                           <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                              <td 
                                className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap cursor-pointer hover:text-[var(--color-primary)] transition-colors underline decoration-transparent hover:decoration-[var(--color-primary)] underline-offset-4"
                                onClick={() => setActiveStudentId(student.id)}
                              >
                                {student.name}
                              </td>
                              <td colSpan={4} className="px-4 py-3 text-gray-400 italic text-center">אין נתונים בסינון זה</td>
                           </tr>
                         )
                      }
                      return (
                        <tr key={student.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0">
                          <td 
                            className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap cursor-pointer hover:text-[var(--color-primary)] transition-colors underline decoration-transparent hover:decoration-[var(--color-primary)] underline-offset-4"
                            onClick={() => setActiveStudentId(student.id)}
                          >
                            {student.name}
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-500">{stats.totalRelevantAttendance + stats.authAbs}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-gray-900 font-mono">
                                {stats.attendanceRate.toFixed(0)}%
                              </span>
                              <div className="flex gap-1 text-[10px]">
                                <span className="text-gray-500" title="בזמן">{stats.onTime}</span>/
                                <span className="text-green-600" title="חיסור באישור">{stats.authAbs}</span>/
                                <span className="text-red-600" title="חיסר (ללא אישור)">{stats.unauthAbs}</span>/
                                <span className="text-yellow-600" title="איחר">{stats.late}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 font-mono text-lg">
                                {stats.learningCount > 0 ? stats.learningRate.toFixed(0) + '%' : '-'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-orange-600 font-mono text-lg">
                                {examCount > 0 ? examAverage.toFixed(0) + '%' : '-'}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                               מבוסס על {examCount} ציונים
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
