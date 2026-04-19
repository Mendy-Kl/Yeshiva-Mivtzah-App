import React, { useState } from 'react';
import { useAppStore } from '../AppContext';
import { Card, Button, Input } from './ui';
import { MessageSquare, XCircle } from 'lucide-react';
import { Student } from '../types';

export function ActiveExamView({ examId, onClose }: { examId: string, onClose: () => void }) {
  const { exams, students, updateExamGrade } = useAppStore();
  
  const exam = exams.find(e => e.id === examId);
  if (!exam) return <div>Exam not found</div>;

  const participatingStudents = students
    .filter(s => exam.shiurim.includes(s.shiur))
    .sort((a, b) => a.shiur.localeCompare(b.shiur) || a.name.localeCompare(b.name));

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 pb-20">
      <Card className="bg-[var(--color-secondary)] text-white p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">מבחן: {exam.subject}</h1>
          <p className="opacity-90 text-sm mb-1">
            {new Date(exam.date).toLocaleDateString('he-IL')} • נבחנים: {participatingStudents.length} • שיעורים: {exam.shiurim.join(', ')}
          </p>
          {exam.material && (
             <p className="opacity-80 text-xs">חומר: {exam.material}</p>
          )}
        </div>
        <Button 
          variant="primary" 
          onClick={onClose} 
          className="w-full sm:w-auto min-w-[160px]"
        >
          שמור וצא
        </Button>
      </Card>

      <Card className="p-0 bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] border border-black/[0.02]">
        <div className="flex items-center justify-between gap-3 p-3 bg-black/[0.02] border-b border-black/5 font-bold text-xs text-gray-500 rounded-t-[24px]">
          <div className="w-1/2">תלמיד</div>
          <div className="flex items-center gap-2 pr-2">
            <div className="w-14 text-center">ציון</div>
            <div className="w-9 text-center">הערה</div>
          </div>
        </div>
        <div className="flex flex-col divide-y divide-black/5">
          {participatingStudents.map(student => {
            const grade = exam.grades[student.id] || { score: '', note: '' };
            return (
              <ExamStudentRow 
                key={student.id} 
                student={student} 
                grade={grade} 
                examId={exam.id} 
              />
            );
          })}
        </div>
      </Card>
    </div>
  );
}

const ExamStudentRow: React.FC<{ student: Student, grade: any, examId: string }> = ({ student, grade, examId }) => {
  const { updateExamGrade } = useAppStore();
  const [isNoteOpen, setIsNoteOpen] = useState(false);

  return (
    <div className="flex items-center justify-between gap-3 p-3 border-b border-black/5 hover:bg-black/[0.02] transition-colors relative">
      <div className="flex items-center gap-3 w-1/2 min-w-0">
        <div className="bg-black/5 w-8 h-8 rounded-full flex z-0 items-center justify-center font-bold text-gray-500 text-sm shrink-0">
          {student.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-[var(--color-text-main)] truncate">{student.name}</h3>
          <p className="text-[10px] text-gray-500">שיעור {student.shiur}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <input 
          className="w-14 h-9 text-center font-bold text-base bg-white border border-black/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.05)] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none min-w-0"
          style={{ MozAppearance: 'textfield' }} // standard css for firefox
          placeholder="-"
          type="number"
          min="0"
          max="100"
          value={grade.score}
          onChange={(e) => updateExamGrade(examId, student.id, { score: e.target.value })}
        />
        
        <div className="relative flex flex-col items-center justify-center h-full">
          <button 
             onClick={() => setIsNoteOpen(!isNoteOpen)}
             className={`p-1.5 h-9 w-9 rounded-lg transition-colors flex items-center justify-center shrink-0 ${grade.note ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'text-gray-400 bg-white border border-black/10 hover:text-gray-800 hover:bg-black/5'} shadow-[0_1px_2px_rgba(0,0,0,0.05)]`}
          >
            <MessageSquare size={16} />
          </button>

          {isNoteOpen && (
            <>
              <div 
                className="fixed inset-0 z-[90]" 
                onClick={() => setIsNoteOpen(false)}
              />
              <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-[0_10px_40px_-5px_rgba(0,0,0,0.2)] border border-black/10 z-[100] flex flex-col overflow-hidden origin-top-left">
                <div className="p-2 border-b border-black/5 bg-[var(--color-surface)] flex justify-between items-center cursor-default">
                  <span className="text-[10px] font-bold text-[var(--color-text-main)] cursor-text">הערה לציון</span>
                  <button onClick={() => setIsNoteOpen(false)} className="text-gray-400 hover:text-[var(--color-danger)] transition-colors p-0.5 rounded hover:bg-black/5">
                    <XCircle size={14} />
                  </button>
                </div>
                <div className="p-2 bg-white flex flex-col gap-2">
                  <textarea
                    className="w-full p-2 bg-black/[0.02] border border-black/5 rounded-lg min-h-[60px] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] resize-none text-xs"
                    placeholder="הקלד הערה במידת הצורך..."
                    value={grade.note || ''}
                    autoFocus
                    onChange={e => updateExamGrade(examId, student.id, { note: e.target.value })}
                  />
                  <button 
                    onClick={() => setIsNoteOpen(false)}
                    className="w-full bg-[var(--color-primary)] text-[var(--color-text-main)] text-[10px] font-bold py-1.5 rounded-lg hover:brightness-95 transition-all shadow-sm"
                  >
                    שמור
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
