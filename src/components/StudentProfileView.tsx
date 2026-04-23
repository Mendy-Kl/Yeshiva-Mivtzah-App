import React, { useState, useMemo } from 'react';
import { useAppStore } from '../AppContext';
import { Card, Button, Badge } from './ui';
import { ArrowLeft, BookOpen, Clock, AlertTriangle, GraduationCap, BarChart } from 'lucide-react';

export function StudentProfileView({ studentId, onClose }: { studentId: string, onClose: () => void }) {
  const { students, lessons, exams, subjects } = useAppStore();
  const [activeTab, setActiveTab] = useState<string>('all'); // 'all' or subject name

  const student = students.find(s => s.id === studentId);

  // Compute metrics for active tab
  const metrics = useMemo(() => {
    // filter lessons/exams by subject if not 'all'
    const relevantLessons = lessons.filter(l => !l.isActive && (activeTab === 'all' || l.subject === activeTab));
    const relevantExams = exams.filter(e => activeTab === 'all' || e.subject === activeTab);

    let totalLates = 0;
    let totalAbsents = 0;
    let totalLessonsCount = 0;
    let totalLearning = 0;
    let totalBehaviorsCount = 0;
    let totalMinutesLate = 0;

    relevantLessons.forEach(lesson => {
      const record = lesson.records[studentId];
      if (record) {
        // Skip excused absences completely so they don't harm attendance or learning metrics
        if (record.attendance === 'ABSENT' && record.isAuthorizedAbsence) {
          return;
        }

        totalLessonsCount++;
        if (record.attendance === 'LATE') {
          totalLates++;
          if (record.minutesLate) totalMinutesLate += record.minutesLate;
        }
        if (record.attendance === 'ABSENT') totalAbsents++;
        
        if (record.behavior1) totalBehaviorsCount++;
        if (record.behavior1 === 'LEARNING') totalLearning++;
        if (record.behavior1 === 'PARTIAL') totalLearning += 0.5; // Weight partial as 50%

        if (record.behavior2) totalBehaviorsCount++;
        if (record.behavior2 === 'LEARNING') totalLearning++;
        if (record.behavior2 === 'PARTIAL') totalLearning += 0.5;
      }
    });

    const attendancePercentage = totalLessonsCount === 0 ? 100 : Math.round(((totalLessonsCount - totalAbsents) / totalLessonsCount) * 100);
    const learningPercentage = totalBehaviorsCount === 0 ? 100 : Math.round((totalLearning / totalBehaviorsCount) * 100);

    let totalScore = 0;
    let validScoresCount = 0;
    relevantExams.forEach(exam => {
      const grade = exam.grades[studentId]?.score;
      if (grade && !isNaN(Number(grade))) {
        totalScore += Number(grade);
        validScoresCount++;
      }
    });

    const averageExamScore = validScoresCount === 0 ? '-' : Math.round(totalScore / validScoresCount);

    return { totalLates, totalAbsents, attendancePercentage, learningPercentage, averageExamScore, totalLessonsCount, validScoresCount, totalMinutesLate };
  }, [lessons, exams, studentId, activeTab]);

  if (!student) return null;

  // Find actual subjects this student has data for
  const studentSubjects = new Set<string>();
  lessons.forEach(l => {
    if (l.records[studentId]) studentSubjects.add(l.subject);
  });
  exams.forEach(e => {
    if (e.grades[studentId]) studentSubjects.add(e.subject);
  });

  const availableSubjects = Array.from(studentSubjects).sort();

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto" dir="rtl">
      <div className="max-w-4xl mx-auto w-full p-4 md:p-6 pb-24">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-6 rounded-[24px] shadow-sm border border-black/5 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-2xl font-bold">
              {student.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{student.name}</h2>
              <p className="text-gray-500">שיעור {student.shiur}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose} className="rounded-xl px-4! border border-gray-200">
            <ArrowLeft className="ml-2" size={18} /> חזור
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-2 mb-6 pb-2 no-scrollbar">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-2.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'all' ? 'bg-gray-800 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-black/5'
            }`}
          >
            מבט כללי
          </button>
          {availableSubjects.map(sub => (
            <button
              key={sub}
              onClick={() => setActiveTab(sub)}
              className={`px-5 py-2.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === sub ? 'bg-[var(--color-primary)] text-orange-950 shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-black/5'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* Stats Grid - List Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          
          {/* Attendance & Times Group */}
          <Card className="p-0 overflow-hidden border border-black/5 bg-white shadow-sm">
            <div className="bg-gray-50/50 px-6 py-4 border-b border-black/5 font-bold text-gray-800 text-lg">
              נוכחות וזמנים
            </div>
            <div className="px-6 py-2">
              <StatRow 
                icon={<AlertTriangle className="text-red-500" size={24} />} 
                label="חיסורים (ללא אישור)" 
                value={metrics.totalAbsents} 
              />
              <StatRow 
                icon={<Clock className="text-orange-500" size={24} />} 
                label="איחורים (סה״כ דקות)" 
                value={metrics.totalLates} 
                subLabel={metrics.totalMinutesLate > 0 ? `סה״כ ${metrics.totalMinutesLate} דקות` : undefined}
              />
              <StatRow 
                icon={<BarChart className="text-blue-500" size={24} />} 
                label="אחוזי נוכחות" 
                value={`${metrics.attendancePercentage}%`} 
                subLabel={`מתוך ${metrics.totalLessonsCount} שיעורים`} 
              />
            </div>
          </Card>

          {/* Learning & Achievements Group */}
          <Card className="p-0 overflow-hidden border border-black/5 bg-white shadow-sm">
            <div className="bg-gray-50/50 px-6 py-4 border-b border-black/5 font-bold text-gray-800 text-lg">
              הישגים ולמידה
            </div>
            <div className="px-6 py-2">
              <StatRow 
                icon={<BookOpen className="text-green-600" size={24} />} 
                label="אחוזי למידה ומדדים" 
                value={`${metrics.learningPercentage}%`} 
              />
              <StatRow 
                icon={<GraduationCap className="text-purple-500" size={24} />} 
                label="ממוצע ציוני מבחנים" 
                value={metrics.averageExamScore} 
                subLabel={`מתוך ${metrics.validScoresCount} ציונים`} 
              />
            </div>
          </Card>

        </div>

      </div>
    </div>
  );
}

function StatRow({ icon, label, value, subLabel }: any) {
  return (
    <div className="flex justify-between items-center py-4 border-b border-black/5 last:border-0">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gray-50 rounded-xl border border-black/5">{icon}</div>
        <div>
          <div className="text-gray-900 font-bold">{label}</div>
          {subLabel && <div className="text-sm text-gray-500 mt-0.5 font-medium">{subLabel}</div>}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
