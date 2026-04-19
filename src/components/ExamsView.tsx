import React, { useState } from 'react';
import { useAppStore } from '../AppContext';
import { Card, Button, Input } from './ui';
import { FileEdit, Plus, Trash2 } from 'lucide-react';
import { ActiveExamView } from './ActiveExamView';

export function ExamsView() {
  const { exams, subjects, shiurim, addExam, deleteExam } = useAppStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [examToDeleteId, setExamToDeleteId] = useState<string | null>(null);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [subject, setSubject] = useState('');
  const [material, setMaterial] = useState('');
  const [selectedShiurim, setSelectedShiurim] = useState<string[]>([]);

  if (activeExamId) {
    return <ActiveExamView examId={activeExamId} onClose={() => setActiveExamId(null)} />;
  }

  const handleAddExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || selectedShiurim.length === 0) return;
    const examId = addExam({
      date,
      subject,
      material,
      shiurim: selectedShiurim,
    });
    setShowAddModal(false);
    // Reset form
    setDate(new Date().toISOString().split('T')[0]);
    setSubject('');
    setMaterial('');
    setSelectedShiurim([]);
    // Open new exam
    setActiveExamId(examId);
  };

  const toggleShiur = (shiur: string) => {
    setSelectedShiurim(prev => 
      prev.includes(shiur) ? prev.filter(s => s !== shiur) : [...prev, shiur]
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-[24px] shadow-sm border border-black/5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">ניהול מבחנים</h2>
          <p className="text-gray-500 text-sm">הוסף מבחנים חדשים, ציונים והערות לתלמידים.</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus size={18} /> הוסף מבחן
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exams.slice().reverse().map(exam => (
          <Card key={exam.id} className="cursor-pointer hover:border-[var(--color-primary)] transition-colors group" onClick={() => setActiveExamId(exam.id)}>
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-lg text-gray-900 line-clamp-1" title={exam.subject}>{exam.subject}</h3>
              <div className="bg-[var(--color-primary)]/10 text-[var(--color-primary)] p-2 rounded-xl group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors">
                <FileEdit size={18} />
              </div>
            </div>
            <div className="text-sm text-gray-500 mb-2">
              <span className="font-bold">תאריך:</span> {new Date(exam.date).toLocaleDateString('he-IL')}
            </div>
            <div className="text-sm text-gray-500 mb-2">
              <span className="font-bold">שיעורים:</span> {exam.shiurim.join(', ')}
            </div>
            {exam.material && (
               <div className="text-sm text-gray-500 line-clamp-2">
                 <span className="font-bold">חומר:</span> {exam.material}
               </div>
            )}
            <div className="mt-4 pt-4 border-t border-black/5 flex justify-between items-center relative" onClick={(e) => e.stopPropagation()}>
               <span className="text-xs font-bold text-gray-400">
                 {Object.keys(exam.grades).length} ציונים הוזנו
               </span>
               <div className="relative">
                 <button 
                    onClick={() => setExamToDeleteId(exam.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="מחק מבחן"
                 >
                   <Trash2 size={16} />
                 </button>

                 {examToDeleteId === exam.id && (
                   <div className="absolute bottom-full mb-2 left-0 w-48 bg-white rounded-lg shadow-[0_10px_40px_-5px_rgba(0,0,0,0.2)] border border-black/10 p-3 z-50 text-[var(--color-text-main)] origin-bottom-left cursor-default" onClick={(e) => e.stopPropagation()}>
                     <p className="text-sm mb-3">האם אתה בטוח? המבחן ימחק כליל.</p>
                     <div className="flex gap-2">
                       <Button 
                         variant="danger" 
                         size="sm" 
                         className="flex-1" 
                         onClick={() => {
                           deleteExam(exam.id);
                           setExamToDeleteId(null);
                         }}
                       >
                         מחק
                       </Button>
                       <Button 
                         variant="outline" 
                         size="sm" 
                         className="flex-1" 
                         onClick={() => setExamToDeleteId(null)}
                       >
                         חזור
                       </Button>
                     </div>
                   </div>
                 )}
               </div>
            </div>
          </Card>
        ))}
        {exams.length === 0 && !showAddModal && (
          <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-[24px] border border-black/5 border-dashed">
             אין עדיין מבחנים במערכת.
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">הוספת מבחן חדש</h2>
            </div>
            
            <form onSubmit={handleAddExam} className="flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">מקצוע / נושא</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {subjects.map(s => (
                      <span 
                        key={s}
                        onClick={() => setSubject(s)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 cursor-pointer px-2 py-1 rounded"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <Input 
                    required 
                    value={subject} 
                    onChange={e => setSubject(e.target.value)} 
                    placeholder="שם המבחן או הנושא"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">תאריך</label>
                  <Input 
                    type="date" 
                    required 
                    value={date} 
                    onChange={e => setDate(e.target.value)} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">שיעורים</label>
                <div className="flex flex-wrap gap-2 items-center">
                  {shiurim.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedShiurim.length === shiurim.length) {
                            setSelectedShiurim([]);
                          } else {
                            setSelectedShiurim([...shiurim]);
                          }
                        }}
                        className={`px-4 py-2 rounded-[12px] border text-sm font-bold transition-all cursor-pointer ${
                          selectedShiurim.length === shiurim.length
                          ? 'bg-[var(--color-text-main)] border-[var(--color-text-main)] text-white' 
                          : 'bg-transparent border-black/10 text-[var(--color-text-main)] hover:bg-black/5'
                        }`}
                      >
                        כל השיעורים
                      </button>
                      <div className="w-[1px] h-6 bg-gray-300 mx-1"></div>
                    </>
                  )}
                  {shiurim.map(shiur => (
                    <button
                      key={shiur}
                      type="button"
                      onClick={() => toggleShiur(shiur)}
                      className={`px-4 py-2 rounded-[12px] border text-sm font-medium transition-all cursor-pointer ${
                        selectedShiurim.includes(shiur)
                        ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-text-main)]' 
                        : 'bg-transparent border-black/10 text-[var(--color-text-main)] hover:bg-black/5'
                      }`}
                    >
                      שיעור {shiur}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">על מה החומר?</label>
                <textarea
                  className="w-full p-4 bg-black/5 border border-black/5 rounded-[12px] min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-y"
                  placeholder="פרט כאן את נושאי המבחן, דפים, מסכת וכדומה..."
                  value={material}
                  onChange={e => setMaterial(e.target.value)}
                />
              </div>

              <div className="flex gap-4 pt-4 mt-2 border-t border-black/5">
                <Button type="submit" size="lg" disabled={!subject.trim() || selectedShiurim.length === 0} className="flex-1">
                  פתח מבחן
                </Button>
                <Button type="button" variant="ghost" size="lg" onClick={() => setShowAddModal(false)} className="flex-1">
                  ביטול
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
