import React, { useState, useMemo } from 'react';
import { useAppStore } from '../AppContext';
import { Card, Input } from './ui';
import { Search, Award, Trophy } from 'lucide-react';
import { Student } from '../types';

export function MivtzaView() {
  const { students, lessons, exams, shiurim } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShiur, setSelectedShiur] = useState<string>('all');

  const studentPoints = useMemo(() => {
    const pointsMap: Record<string, number> = {};
    
    students.forEach(student => {
      let points = 900;
      
      lessons.forEach(lesson => {
        if (!lesson.shiurim.includes(student.shiur)) return;
        
        const record = lesson.records[student.id];
        if (!record) {
          // If no record is marked for this student, do not add or subtract any points.
          return;
        }

        const isAbsent = record.isAbsent || record.attendance === 'ABSENT';
        const isAuthorized = record.isAuthorizedAbsence;

        if (isAbsent) {
          if (!isAuthorized) points -= 90;
          return;
        }

        // Latetime penalties
        const lateMins = record.minutesLate || 0;
        if (lateMins >= 1 && lateMins <= 4) points -= 10;
        else if (lateMins >= 5 && lateMins <= 9) points -= 20;
        else if (lateMins >= 10) points -= 30;

        // Behavior translation (LEARNING=2, PARTIAL=1, NONE=0)
        let bVal = 0;
        let partsMarked = 0;
        
        if (record.behavior1) {
          partsMarked++;
          bVal += (record.behavior1 === 'NONE' ? 0 : record.behavior1 === 'PARTIAL' ? 1 : 2);
        }
        if (record.behavior2) {
          partsMarked++;
          bVal += (record.behavior2 === 'NONE' ? 0 : record.behavior2 === 'PARTIAL' ? 1 : 2);
        }
        
        if (partsMarked > 0) {
          // Ex: If only one behavior part was marked, scale it up to act as total lesson behavior
          if (partsMarked === 1) {
            bVal = bVal * 2;
          }
          if (bVal === 4) points += 10; // 100%
          else if (bVal === 3) points += 5; // 75%
          else if (bVal === 2) points += 0; // 50%
          else if (bVal === 1) points -= 10; // 25%
          else if (bVal === 0) points -= 20; // 0%
        }
      });

      exams.forEach(exam => {
        if (!exam.shiurim.includes(student.shiur)) return;
        const grade = exam.grades[student.id];
        if (grade && grade.score) {
           const score = parseFloat(grade.score);
           if (!isNaN(score)) {
              if (score >= 100) points += 20;
              else if (score >= 90) points += 10;
              else if (score >= 70) points += 0;
              else {
                 points -= Math.ceil((70 - score) / 5) * 10;
              }
           }
        }
      });
      
      pointsMap[student.id] = points;
    });
    
    return pointsMap;
  }, [students, lessons, exams]);

  const filteredStudents = useMemo(() => {
    return students
      .filter(s => selectedShiur === 'all' || s.shiur === selectedShiur)
      .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => studentPoints[b.id] - studentPoints[a.id]); // Highest points first
  }, [students, selectedShiur, searchTerm, studentPoints]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#dcfce7] text-[#15803d] p-6 rounded-[24px] shadow-sm border border-[#bbf7d0]">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Award /> מבצע השגחה</h2>
          <p className="opacity-90 text-sm mt-1">כל תלמיד מתחיל עם 900 נקודות, הנקודות עולות או יורדות על סמך נוכחות בשיעורים, רמת למידה וציונים במבחנים לפי התקנון.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="חיפוש בחור..."
            className="pr-12 bg-white"
          />
        </div>
        <select
          value={selectedShiur}
          onChange={(e) => setSelectedShiur(e.target.value)}
          className="px-4 py-2 bg-white border border-black/5 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-bold text-gray-700"
        >
          <option value="all">כל השיעורים</option>
          {shiurim.map(s => (
            <option key={s} value={s}>שיעור {s}</option>
          ))}
        </select>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-black/5 border-b border-black/5 font-bold text-sm text-gray-500">
          <div>מיקום ושם הבחור</div>
          <div className="text-left w-24">ניקוד מצטבר</div>
        </div>
        <div className="flex flex-col divide-y divide-black/5">
          {filteredStudents.map((student, idx) => (
             <div key={student.id} className="flex items-center justify-between p-4 hover:bg-black/[0.02] transition-colors">
               <div className="flex items-center gap-3">
                 <div className="text-gray-400 font-bold w-4 text-xs">{idx + 1}.</div>
                 <div className="bg-[#15803d]/10 w-10 h-10 rounded-full flex items-center justify-center font-bold text-[#15803d]">
                   {student.name.charAt(0)}
                 </div>
                 <div>
                   <h3 className="font-bold text-[var(--color-text-main)] leading-tight">{student.name}</h3>
                   <span className="text-[10px] text-gray-500 font-medium">שיעור {student.shiur}</span>
                 </div>
               </div>
               <div className="flex items-center gap-2">
                 {idx < 3 && studentPoints[student.id] > 900 && <Trophy size={16} className={idx === 0 ? "text-yellow-500" : idx === 1 ? "text-gray-400" : "text-amber-600"} />}
                 <span className="font-bold text-lg text-[#15803d] min-w-[50px] text-left" dir="ltr">
                   {studentPoints[student.id].toLocaleString()}
                 </span>
               </div>
             </div>
          ))}
          {filteredStudents.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              לא נמצאו בחורים בהתאם לסינון
            </div>
          )}
        </div>
      </Card>
      
      <Card className="bg-orange-50 border border-orange-100 text-orange-900 mt-8 shadow-none">
        <h3 className="font-bold mb-2">תקנון הניקוד:</h3>
        <ul className="text-sm space-y-1 opacity-80 list-disc list-inside">
          <li><strong>משתתף בסדר ולומד מלא (100%):</strong> +10 נק'</li>
          <li><strong>לומד רק 75% מהזמן:</strong> +5 נק'</li>
          <li><strong>לומד רק 50% מהזמן:</strong> 0 נק'</li>
          <li><strong>לומד רק 25% מהזמן:</strong> -10 נק'</li>
          <li><strong>לא למד בכלל בשיעור (0%):</strong> -20 נק'</li>
          <li><strong>איחור 1-4 דק':</strong> -10 נק'</li>
          <li><strong>איחור 5-9 דק':</strong> -20 נק'</li>
          <li><strong>איחור 10+ דק':</strong> -30 נק'</li>
          <li><strong>חיסור ללא אישור:</strong> -90 נק'</li>
          <li className="mt-2 text-xs font-bold pt-2 border-t border-orange-900/10">ציוני מבחנים:</li>
          <li><strong>מבחן 100 ומעלה:</strong> +20 נק'</li>
          <li><strong>מבחן 90-99:</strong> +10 נק'</li>
          <li><strong>מבחן 70-89:</strong> 0 נק'</li>
          <li><strong>לנכשלים (מתחת מ-70):</strong> -10 נק' על כל 5% חסרים (לדוג' 60% = מינוס 20)</li>
        </ul>
      </Card>
    </div>
  );
}
