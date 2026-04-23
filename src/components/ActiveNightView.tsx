import React, { useState } from 'react';
import { useAppStore } from '../AppContext';
import { Card, Button, Input } from './ui';
import { CheckCircle, XCircle, MessageSquare, Moon } from 'lucide-react';
import { StudentNightRecord } from '../types';
import { formatHebrewDate } from '../lib/dateUtils';

export function ActiveNightView({ nightId, onClose }: { nightId: string, onClose?: () => void }) {
  const { nightRegistrations, students, updateNightRecord, finishNightRegistration, deleteNightRegistration } = useAppStore();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [activeNoteStudent, setActiveNoteStudent] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');
  
  const night = nightRegistrations.find(n => n.id === nightId);
  if (!night) return <div>Night Registration not found</div>;

  // Filter students to only those in the participating shiurim
  const participatingStudents = students
    .filter(s => night.shiurim.includes(s.shiur))
    .sort((a, b) => a.shiur.localeCompare(b.shiur) || a.name.localeCompare(b.name));

  const groupedStudents = participatingStudents.reduce((acc, student) => {
    if (!acc[student.shiur]) acc[student.shiur] = [];
    acc[student.shiur].push(student);
    return acc;
  }, {} as Record<string, typeof participatingStudents>);

  const sortedShiurKeys = Object.keys(groupedStudents).sort((a, b) => a.localeCompare(b));

  const handleUpdate = (studentId: string, updates: Partial<StudentNightRecord>) => {
    updateNightRecord(nightId, studentId, updates);
  };

  const handleFinish = () => {
    finishNightRegistration(night.id);
    setSaveSuccess(true);
    setTimeout(() => {
      if (onClose) onClose();
    }, 1000);
  };

  const handleCancel = () => {
    deleteNightRegistration(night.id);
    if (onClose) onClose();
  };

  const openNote = (studentId: string) => {
    setActiveNoteStudent(studentId);
    setNoteInput(night.records[studentId]?.notes || '');
  };

  const saveNote = () => {
    if (activeNoteStudent) {
      handleUpdate(activeNoteStudent, { notes: noteInput });
      setActiveNoteStudent(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 pb-20">
      <Card className="bg-[var(--color-text-main)] text-white p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2"><Moon size={24} /> רישום לילה</h1>
          <p className="opacity-90 text-sm">
            {formatHebrewDate(night.date)} • תלמידים: {participatingStudents.length} • שיעורים: {night.shiurim.join(', ')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto relative">
          {night.isActive && (
            <div className="relative w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={() => setShowCancelConfirm(!showCancelConfirm)}
                className="w-full sm:w-auto border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all bg-white"
              >
                בטל רישום
              </Button>
              {showCancelConfirm && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-black/10 p-3 z-50 text-[var(--color-text-main)] min-w-[200px]">
                  <p className="text-sm font-bold mb-2">לבטל את הרישום?</p>
                  <p className="text-xs text-gray-500 mb-3">הרישום ימחק כליל ולא ישמר.</p>
                  <div className="flex gap-2">
                     <Button variant="danger" size="sm" className="flex-1" onClick={handleCancel}>כן, בטל</Button>
                     <Button variant="secondary" size="sm" className="flex-1" onClick={() => setShowCancelConfirm(false)}>חזור</Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <Button 
            variant="primary" 
            onClick={night.isActive ? handleFinish : onClose} 
            className="w-full sm:w-auto min-w-[160px]"
          >
            {saveSuccess ? <span className="flex items-center gap-2"><CheckCircle size={18} /> נשמר בהצלחה</span> : (night.isActive ? 'שמור וסיים' : 'חזור')}
          </Button>
        </div>
      </Card>

      <div className={`grid grid-cols-1 ${sortedShiurKeys.length > 1 ? 'xl:grid-cols-2' : ''} gap-6 items-start`}>
        {sortedShiurKeys.map(shiurKey => {
          const studentsInShiur = groupedStudents[shiurKey];
          return (
            <div key={shiurKey} className="flex flex-col gap-3">
              <h2 className="text-xl font-bold px-2">שיעור {shiurKey}</h2>
              <Card className="p-0 bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] border border-black/[0.02]">
                <div className="overflow-x-auto">
                  <table className="w-full text-right" dir="rtl">
                    <thead>
                      <tr className="bg-black/[0.02] border-b border-black/5">
                        <th className="px-4 py-3 font-bold text-gray-500 text-sm whitespace-nowrap min-w-[120px]">תלמיד</th>
                        <th className="px-4 py-3 font-bold text-gray-500 text-sm w-[25%] min-w-[200px]">חדרים</th>
                        <th className="px-4 py-3 font-bold text-gray-500 text-sm w-[25%] min-w-[200px]">המפיל</th>
                        <th className="px-4 py-3 font-bold text-gray-500 text-sm text-center min-w-[100px]">דיבורים</th>
                        <th className="px-4 py-3 font-bold text-gray-500 text-sm text-center min-w-[80px]">הערות</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {studentsInShiur.map(student => {
                        const record = night.records[student.id] || {};
                        
                        return (
                          <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 align-middle">
                              <div className="font-bold text-gray-900">{student.name}</div>
                              <div className="text-xs text-gray-500">שיעור {student.shiur}</div>
                            </td>

                            {/* החדרים */}
                            <td className="px-4 py-3 align-middle">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant={record.isRoomAbsent ? 'danger' : 'outline'}
                                  className={`px-3 py-1.5 h-auto text-xs ${record.isRoomAbsent ? '' : 'text-red-500 border-red-500/30 hover:bg-red-50 hover:border-red-500'}`}
                                  onClick={() => handleUpdate(student.id, { isRoomAbsent: !record.isRoomAbsent, roomMinutesLate: undefined })}
                                >
                                  חיסור
                                </Button>
                                <div className="relative flex-1">
                                  <Input 
                                    type="number"
                                    min="0"
                                    placeholder="דק׳ איחור"
                                    disabled={record.isRoomAbsent}
                                    value={record.roomMinutesLate !== undefined ? record.roomMinutesLate : ''}
                                    onChange={(e) => handleUpdate(student.id, { roomMinutesLate: e.target.value ? Number(e.target.value) : undefined, isRoomAbsent: false })}
                                    className={`text-center ${record.isRoomAbsent ? 'opacity-50 line-through' : ''}`}
                                    dir="ltr"
                                  />
                                </div>
                              </div>
                            </td>

                            {/* המפיל */}
                            <td className="px-4 py-3 align-middle">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  className="px-3 py-1.5 h-auto text-xs border-green-500 text-green-600 hover:bg-green-50"
                                  onClick={() => handleUpdate(student.id, { hamapilMinutesLate: 0 })}
                                >
                                  בזמן
                                </Button>
                                <div className="relative flex-1">
                                  <Input 
                                    type="number"
                                    min="0"
                                    placeholder="דק׳ איחור"
                                    value={record.hamapilMinutesLate !== undefined ? record.hamapilMinutesLate : ''}
                                    onChange={(e) => handleUpdate(student.id, { hamapilMinutesLate: e.target.value ? Number(e.target.value) : undefined })}
                                    className="text-center"
                                    dir="ltr"
                                  />
                                </div>
                              </div>
                            </td>

                            {/* דיבורים */}
                            <td className="px-4 py-3 align-middle text-center">
                              <button
                                onClick={() => handleUpdate(student.id, { talking: !record.talking })}
                                className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                  record.talking 
                                    ? 'bg-red-100 text-red-600 border-2 border-red-500' 
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 border-2 border-transparent'
                                }`}
                                title={record.talking ? 'דיבר' : 'סמן שדיבר'}
                              >
                                {record.talking ? <XCircle size={20} /> : <div className="w-3 h-3 rounded-full bg-gray-300"></div>}
                              </button>
                            </td>

                            {/* הערות */}
                            <td className="px-4 py-3 align-middle text-center">
                              <button
                                onClick={() => openNote(student.id)}
                                className={`mx-auto p-2 rounded-xl transition-all ${
                                  record.notes
                                  ? 'bg-[var(--color-primary)] text-orange-950 shadow-sm'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                title={record.notes || 'הוסף הערה'}
                              >
                                <MessageSquare size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Note Modal */}
      {activeNoteStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" dir="rtl">
          <Card className="max-w-md w-full scale-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-4">הערות רישום לילה</h3>
            <p className="text-gray-500 text-sm mb-4">
              הזן הערות מילוליות עבור התלמיד לתאריך {formatHebrewDate(night.date)}.
            </p>
            <textarea
              className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] min-h-[120px] resize-y mb-4"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="הקלד הערה כאן..."
            />
            <div className="flex gap-3">
              <Button onClick={saveNote} className="flex-1">שמור הערה</Button>
              <Button variant="ghost" onClick={() => setActiveNoteStudent(null)} className="flex-1">ביטול</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
