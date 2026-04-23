import React, { useState } from 'react';
import { useAppStore } from '../AppContext';
import { Card, Button, Input } from './ui';
import { Users, CheckCircle, XCircle, Clock, BookOpen, UserX, Activity, MessageSquare } from 'lucide-react';
import { StudentLessonRecord, Attendance, Behavior, Student } from '../types';
import { formatHebrewDate } from '../lib/dateUtils';

export function ActiveLessonView({ lessonId, onClose }: { lessonId: string, onClose?: () => void }) {
  const { lessons, students, updateLessonRecord, finishLesson, deleteLesson } = useAppStore();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  const lesson = lessons.find(l => l.id === lessonId);
  if (!lesson) return <div>Lesson not found</div>;

  // Filter students to only those in the participating shiurim
  const participatingStudents = students
    .filter(s => lesson.shiurim.includes(s.shiur))
    .sort((a, b) => a.shiur.localeCompare(b.shiur) || a.name.localeCompare(b.name));

  const groupedStudents = participatingStudents.reduce((acc, student) => {
    if (!acc[student.shiur]) acc[student.shiur] = [];
    acc[student.shiur].push(student);
    return acc;
  }, {} as Record<string, typeof participatingStudents>);

  const sortedShiurKeys = Object.keys(groupedStudents).sort((a, b) => a.localeCompare(b));

  const handleUpdate = (studentId: string, updates: Partial<StudentLessonRecord>) => {
    updateLessonRecord(lessonId, studentId, updates);
  };

  const handleFinish = () => {
    finishLesson(lesson.id);
    setSaveSuccess(true);
    setTimeout(() => {
      if (onClose) onClose();
    }, 1000);
  };

  const handleCancel = () => {
    deleteLesson(lesson.id);
    if (onClose) onClose();
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 pb-20">
      <Card className="bg-[var(--color-secondary)] text-white p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">שיעור: {lesson.subject}</h1>
          <p className="opacity-90 text-sm">
            {formatHebrewDate(lesson.date)} • משתתפים: {participatingStudents.length} • שיעורים: {lesson.shiurim.join(', ')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto relative">
          {lesson.isActive && (
            <div className="relative w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={() => setShowCancelConfirm(!showCancelConfirm)}
                className="w-full sm:w-auto border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all bg-white"
              >
                בטל סדר
              </Button>
              {showCancelConfirm && (
                <div className="absolute top-full mt-2 left-0 right-0 sm:right-auto sm:w-64 bg-white rounded-lg shadow-xl border border-black/10 p-3 z-50 text-[var(--color-text-main)]">
                  <p className="text-sm mb-3">האם אתה בטוח? הרישום יימחק כליל.</p>
                  <div className="flex gap-2">
                    <Button variant="danger" size="sm" className="flex-1" onClick={handleCancel}>כן, מחק</Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowCancelConfirm(false)}>חזור</Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <Button 
            variant={saveSuccess ? "success" : "primary"} 
            onClick={handleFinish} 
            disabled={saveSuccess}
            className="w-full sm:w-auto min-w-[160px] transition-all duration-300"
          >
            {saveSuccess ? 'נשמר בהצלחה ✓' : (lesson.isActive ? 'שמור וסיים סדר' : 'שמור וצא')}
          </Button>
        </div>
      </Card>

      <div className={`grid grid-cols-1 ${sortedShiurKeys.length > 1 ? 'xl:grid-cols-2' : ''} gap-6 items-start`}>
        {sortedShiurKeys.map(shiurKey => {
          const studentsInShiur = groupedStudents[shiurKey];
          return (
            <div key={shiurKey} className="flex flex-col gap-3">
              <h2 className="text-xl font-bold px-2">שיעור {shiurKey}</h2>
              <Card className="p-0 bg-[var(--color-card-bg)] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] border border-black/[0.02]">
                <div className="hidden lg:grid lg:grid-cols-[200px_1fr_1fr_1fr_40px] bg-gray-50/50 p-4 border-b border-black/5 text-xs font-bold text-gray-500 tracking-wide rounded-t-[24px]">
                  <div>תלמיד</div>
                  <div>נוכחות</div>
                  <div>ציון א' (למידה)</div>
                  <div>ציון ב' (למידה)</div>
                  <div></div>
                </div>
                <div className="flex flex-col divide-y divide-black/5">
                {studentsInShiur.map(student => {
                  const record = lesson.records[student.id] || { attendance: null, behavior1: null, behavior2: null };
                  
                  return (
                    <StudentRow 
                      key={student.id} 
                      student={student} 
                      record={record} 
                      handleUpdate={handleUpdate} 
                    />
                  );
                })}
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const StudentRow: React.FC<{ student: Student, record: any, handleUpdate: any }> = ({ student, record, handleUpdate }) => {
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isAbsenceNoteOpen, setIsAbsenceNoteOpen] = useState(false);
  const isAbsent = record.isAbsent || record.attendance === 'ABSENT';

  return (
    <>
      <div className="flex flex-col lg:grid lg:grid-cols-[200px_1fr_1fr_1fr_40px] lg:items-center gap-2 lg:gap-4 p-3 lg:p-4 hover:bg-black/[0.02] transition-colors border-b border-black/5 last:border-0 lg:border-0 relative">
        <div className="flex items-center gap-3 w-full pb-2 border-b border-black/5 lg:border-0 lg:pb-0">
          <div className="bg-black/5 w-8 h-8 rounded-full flex z-0 items-center justify-center font-bold text-gray-500 text-sm shrink-0">
            {student.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-[var(--color-text-main)] truncate">{student.name}</h3>
            <p className="text-[10px] text-gray-500">שיעור {student.shiur}</p>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 w-full lg:contents">
          {/* Attendance */}
          <div className="w-full flex flex-col gap-1 justify-center">
            <span className="text-[10px] font-bold text-gray-400 lg:hidden text-center">איחור / חיסור</span>
            <div className="flex items-center gap-1 bg-black/5 p-1 rounded-xl h-[34px] relative">
              {!isAbsent ? (
                <>
                  <div className="flex bg-white rounded-lg border border-black/10 overflow-hidden flex-1 shrink-0 h-full max-w-[60px]">
                    <MinutesInput record={record} studentId={student.id} handleUpdate={handleUpdate} />
                  </div>
                  <span className="text-[9px] text-gray-500 font-bold px-0.5 whitespace-nowrap">דק'</span>
                  <button
                    onClick={() => {
                      const nextAbsent = !isAbsent;
                      handleUpdate(student.id, { isAbsent: nextAbsent, attendance: nextAbsent ? 'ABSENT' : ((record.minutesLate || 0) > 0 ? 'LATE' : 'ON_TIME') });
                    }}
                    className={`flex-1 min-w-0 h-full text-[10px] font-bold rounded-lg transition-colors text-gray-500 hover:text-gray-800 hover:bg-black/5`}
                  >
                    חיסר
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      const nextAbsent = !isAbsent;
                      handleUpdate(student.id, { isAbsent: nextAbsent, attendance: nextAbsent ? 'ABSENT' : ((record.minutesLate || 0) > 0 ? 'LATE' : 'ON_TIME') });
                    }}
                    className={`flex-1 min-w-0 max-w-[60px] shrink-0 h-full text-[10px] font-bold rounded-lg transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.1)] ${record.isAuthorizedAbsence ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#fee2e2] text-[var(--color-danger)]'}`}
                  >
                    חיסר
                  </button>
                  <label className={`flex items-center justify-center gap-1 text-[10px] font-bold cursor-pointer flex-1 h-full rounded-lg transition-colors px-1 border border-transparent hover:border-black/5 ${record.isAuthorizedAbsence ? 'bg-[#dcfce7]/50 text-[#15803d] hover:bg-[#dcfce7]/80' : 'bg-white/50 text-gray-700 hover:bg-white'}`}>
                    <input
                      type="checkbox"
                      checked={record.isAuthorizedAbsence || false}
                      onChange={e => {
                        handleUpdate(student.id, { isAuthorizedAbsence: e.target.checked });
                        if (e.target.checked) setIsAbsenceNoteOpen(true);
                        else setIsAbsenceNoteOpen(false);
                      }}
                      className={`w-3 h-3 rounded appearance-none border border-gray-300 relative after:content-['✓'] after:absolute after:text-[8px] after:text-white after:left-[1px] after:top-[1.5px] checked:after:flex after:items-center after:justify-center after:hidden ${record.isAuthorizedAbsence ? 'checked:bg-[#15803d] checked:border-[#15803d]' : 'checked:bg-[var(--color-primary)] checked:border-[var(--color-primary)]'}`}
                    />
                    <span className="whitespace-nowrap">באישור</span>
                  </label>
                  
                  {record.isAuthorizedAbsence && (
                    <div className="relative h-full flex flex-col justify-center">
                      <button
                        onClick={() => setIsAbsenceNoteOpen(!isAbsenceNoteOpen)}
                        className={`flex items-center justify-center h-full rounded-lg transition-colors px-1.5 ${record.absenceNote ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'text-gray-400 hover:text-gray-800 hover:bg-black/5'}`}
                      >
                        <MessageSquare size={12} />
                      </button>
                      {isAbsenceNoteOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-[90]" 
                            onClick={() => setIsAbsenceNoteOpen(false)}
                          />
                          <div className="absolute top-full right-0 lg:right-auto lg:left-0 origin-top-left mt-2 w-48 max-w-[90vw] bg-white rounded-xl shadow-[0_10px_40px_-5px_rgba(0,0,0,0.2)] border border-black/10 z-[100] flex flex-col overflow-hidden">
                            <div className="p-2 border-b border-black/5 bg-[var(--color-surface)] flex justify-between items-center cursor-default">
                              <span className="text-[10px] font-bold text-[var(--color-text-main)] cursor-text">סיבת חיסור</span>
                              <button onClick={() => setIsAbsenceNoteOpen(false)} className="text-gray-400 hover:text-[var(--color-danger)] transition-colors p-0.5 rounded hover:bg-black/5">
                                <XCircle size={12} />
                              </button>
                            </div>
                            <div className="p-2 bg-white flex flex-col gap-2">
                              <textarea
                                className="w-full p-2 bg-black/[0.02] border border-black/5 rounded-lg min-h-[60px] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] resize-none text-xs"
                                placeholder="הקלד סיבת חיסור..."
                                value={record.absenceNote || ''}
                                autoFocus
                                onChange={e => handleUpdate(student.id, { absenceNote: e.target.value })}
                              />
                              <button 
                                onClick={() => setIsAbsenceNoteOpen(false)}
                                className="w-full bg-[var(--color-primary)] text-[var(--color-text-main)] text-[10px] font-bold py-1.5 rounded-lg hover:brightness-95 transition-all shadow-sm"
                              >
                                שמור
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Behavior 1 */}
          <div className="w-full flex flex-col gap-1 justify-center">
            <span className="text-[10px] font-bold text-gray-400 lg:hidden text-center">חלק א' (למידה)</span>
            <SegmentedControl 
              disabled={isAbsent}
              value={record.behavior1}
              onChange={(val: any) => handleUpdate(student.id, { behavior1: val })}
              options={[
                { value: 'LEARNING', label: 'מלא', activeClass: 'bg-[var(--color-primary)] text-[var(--color-text-main)] shadow-[0_1px_2px_rgba(0,0,0,0.1)]' },
                { value: 'PARTIAL', label: 'חלקי', activeClass: 'bg-[#fef3c7] text-[var(--color-warning)] shadow-[0_1px_2px_rgba(0,0,0,0.1)]' },
                { value: 'NONE', label: 'לא', activeClass: 'bg-[#fee2e2] text-[var(--color-danger)] shadow-[0_1px_2px_rgba(0,0,0,0.1)]' }
              ]}
            />
          </div>

          {/* Behavior 2 */}
          <div className="w-full flex flex-col gap-1 justify-center">
            <span className="text-[10px] font-bold text-gray-400 lg:hidden text-center">חלק ב' (למידה)</span>
            <SegmentedControl 
              disabled={isAbsent}
              value={record.behavior2}
              onChange={(val: any) => handleUpdate(student.id, { behavior2: val })}
              options={[
                { value: 'LEARNING', label: 'מלא', activeClass: 'bg-[var(--color-primary)] text-[var(--color-text-main)] shadow-[0_1px_2px_rgba(0,0,0,0.1)]' },
                { value: 'PARTIAL', label: 'חלקי', activeClass: 'bg-[#fef3c7] text-[var(--color-warning)] shadow-[0_1px_2px_rgba(0,0,0,0.1)]' },
                { value: 'NONE', label: 'לא', activeClass: 'bg-[#fee2e2] text-[var(--color-danger)] shadow-[0_1px_2px_rgba(0,0,0,0.1)]' }
              ]}
            />
          </div>

          {/* Note Button */}
          <div className="relative flex flex-col gap-1 justify-end lg:justify-center items-center pb-0.5 lg:pb-0 h-full">
            <button 
              onClick={() => setIsNoteModalOpen(!isNoteModalOpen)}
              className={`p-1.5 rounded-lg transition-colors flex items-center justify-center shrink-0 ${isNoteModalOpen || record.lessonNote ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'text-gray-400 hover:text-gray-800 hover:bg-black/5'} w-8 h-[34px]`}
              title="הערה על השיעור"
            >
              <MessageSquare size={16} />
            </button>
            {isNoteModalOpen && (
              <>
                <div 
                  className="fixed inset-0 z-[90]" 
                  onClick={() => setIsNoteModalOpen(false)}
                />
                <div className="absolute top-full left-0 origin-top-left mt-2 w-64 max-w-[90vw] bg-white rounded-xl shadow-[0_10px_40px_-5px_rgba(0,0,0,0.2)] border border-black/10 z-[100] flex flex-col overflow-hidden">
                  <div className="p-2 border-b border-black/5 bg-[var(--color-surface)] flex justify-between items-center cursor-default">
                    <span className="text-xs font-bold text-[var(--color-text-main)] cursor-text">הערה: {student.name}</span>
                    <button onClick={() => setIsNoteModalOpen(false)} className="text-gray-400 hover:text-[var(--color-danger)] transition-colors p-1">
                      <XCircle size={14} />
                    </button>
                  </div>
                  <div className="p-2 bg-white flex flex-col gap-2">
                    <textarea
                      className="w-full p-2 bg-black/[0.02] border border-black/5 rounded-lg min-h-[80px] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] resize-none text-xs"
                      placeholder="הקלד הערה..."
                      value={record.lessonNote || ''}
                      autoFocus
                      onChange={e => handleUpdate(student.id, { lessonNote: e.target.value })}
                    />
                    <button 
                      onClick={() => setIsNoteModalOpen(false)}
                      className="w-full bg-[var(--color-primary)] text-[var(--color-text-main)] text-xs font-bold py-1.5 rounded-lg hover:brightness-95 transition-all shadow-sm"
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

    </>
  );
}

function SegmentedControl({ options, value, onChange, disabled }: any) {
  return (
    <div className={`flex bg-black/5 p-1 rounded-xl ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      {options.map((opt: any) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 px-1 py-1.5 min-w-0 text-xs font-semibold rounded-lg transition-all text-center truncate ${
              isActive 
                ? opt.activeClass 
                : 'text-gray-500 hover:text-gray-900 hover:bg-black/5'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function MinutesInput({ record, studentId, handleUpdate }: any) {
  const minutesLate = record.minutesLate || 0;
  const disabled = record.isAbsent || record.attendance === 'ABSENT';
  const [localVal, setLocalVal] = useState(minutesLate.toString());
  const [isFocused, setIsFocused] = useState(false);

  React.useEffect(() => {
    if (!isFocused) {
      setLocalVal(minutesLate.toString());
    }
  }, [minutesLate, isFocused]);

  return (
    <input 
      type="number"
      min="0"
      className={`w-full text-center text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] ${disabled ? 'opacity-40' : ''}`}
      value={disabled ? '' : (isFocused ? localVal : minutesLate.toString())}
      disabled={disabled}
      onFocus={(e) => {
        setIsFocused(true);
        if (minutesLate === 0) {
          setLocalVal('');
        } else {
          setLocalVal(minutesLate.toString());
        }
      }}
      onChange={(e) => {
        setLocalVal(e.target.value);
        const val = parseInt(e.target.value);
        if (!isNaN(val) && val >= 0) {
          handleUpdate(studentId, { minutesLate: val, isAbsent: false, attendance: val > 0 ? 'LATE' : 'ON_TIME' });
        }
      }}
      onBlur={() => {
        setIsFocused(false);
      }}
    />
  );
}
