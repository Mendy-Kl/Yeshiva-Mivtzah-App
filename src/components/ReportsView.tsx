import React, { useMemo } from 'react';
import { useAppStore } from '../AppContext';
import { Card, Badge } from './ui';

export function ReportsView() {
  const { students, lessons, shiurim } = useAppStore();

  const finishedLessons = lessons.filter(l => !l.isActive);

  // Calculate stats per student
  const stats = useMemo(() => {
    return students.map(student => {
      let totalLessons = 0;
      let onTime = 0;
      let late = 0;
      let unauthorizedAbsent = 0;
      let authorizedAbsent = 0;
      
      let sumLearningPercent = 0;
      let countLearningRecords = 0;

      finishedLessons.forEach(lesson => {
        if (lesson.shiurim.includes(student.shiur)) {
          totalLessons++;
          const record = lesson.records[student.id];
          if (record) {
            const isAbsent = record.isAbsent || record.attendance === 'ABSENT';
            const minutesLate = record.minutesLate || 0;
            
            if (isAbsent) {
              if (record.isAuthorizedAbsence) {
                authorizedAbsent++;
              } else {
                unauthorizedAbsent++;
              }
            } else if (minutesLate > 0 || record.attendance === 'LATE') {
              late++;
            } else {
              onTime++; // 0 default
            }

            [record.behavior1, record.behavior2].forEach(b => {
              if (b) {
                countLearningRecords++;
                if (b === 'LEARNING') sumLearningPercent += 100;
                if (b === 'PARTIAL') sumLearningPercent += 50;
                if (b === 'NONE') sumLearningPercent += 0;
              }
            });
          }
        }
      });

      return {
        ...student,
        stats: {
          totalLessons,
          onTime,
          late,
          unauthorizedAbsent,
          authorizedAbsent,
          sumLearningPercent,
          countLearningRecords,
          attendanceRate: totalLessons > 0 ? ((onTime + late) / totalLessons) * 100 : 0,
          learningRate: countLearningRecords > 0 ? (sumLearningPercent / countLearningRecords) : 0
        }
      };
    });
  }, [students, finishedLessons]);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-4">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">דוחות וסטטיסטיקות המערכת</h1>
        <p className="text-gray-600">נתונים מצטברים של נוכחות ורמת למידה לכלל התלמידים.</p>
      </div>

      <div className="grid gap-4">
        {shiurim.map(shiur => {
          const shiurStudents = stats.filter(s => s.shiur === shiur);
          if (shiurStudents.length === 0) return null;

          return (
            <Card key={shiur} className="overflow-hidden">
              <h2 className="text-xl font-bold mb-4">שיעור {shiur}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-600">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 rounded-lg">
                    <tr>
                      <th className="px-4 py-3 font-semibold">שם התלמיד</th>
                      <th className="px-4 py-3 font-semibold">שיעורים</th>
                      <th className="px-4 py-3 font-semibold">נוכחות הכללית</th>
                      <th className="px-4 py-3 font-semibold">אחוז למידה ממוצע (0-100)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shiurStudents.map(student => (
                      <tr key={student.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                          {student.name}
                        </td>
                        <td className="px-4 py-3 font-mono">{student.stats.totalLessons}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-gray-900 font-mono">
                              {student.stats.attendanceRate.toFixed(0)}%
                            </span>
                            <div className="flex gap-1 text-[10px]">
                              <span className="text-gray-500" title="בזמן">{student.stats.onTime}</span>/
                              <span className="text-green-600" title="חיסור באישור">{student.stats.authorizedAbsent}</span>/
                              <span className="text-red-600" title="חיסר (ללא אישור)">{student.stats.unauthorizedAbsent}</span>/
                              <span className="text-yellow-600" title="איחר">{student.stats.late}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                             <span className="font-bold text-gray-900 font-mono text-lg">
                               {student.stats.learningRate.toFixed(0)}%
                             </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
        {shiurim.length === 0 || stats.length === 0 ? (
          <p className="text-gray-500 text-center py-8">אין נתונים להציג כרגע.</p>
        ) : null}
      </div>
    </div>
  );
}
