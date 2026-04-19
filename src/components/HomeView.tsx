import React, { useState } from 'react';
import { useAppStore } from '../AppContext';
import { Card, Button, Input, Badge } from './ui';
import { PlayCircle, Users, BookOpen, BarChart3 } from 'lucide-react';
import { Shiur } from '../types';

export function HomeView({ onStart }: { onStart: (id: string) => void }) {
  const { students, shiurim, subjects, lessons, startLesson } = useAppStore();
  const [subject, setSubject] = useState('');
  const [selectedShiurim, setSelectedShiurim] = useState<Shiur[]>([]);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const activeLesson = lessons.find(l => l.isActive);
  const finishedLessons = lessons.filter(l => !l.isActive).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (subject.trim() && selectedShiurim.length > 0) {
      const id = startLesson(subject.trim(), selectedShiurim);
      onStart(id);
      setShowStartModal(false);
      setSubject('');
      setSelectedShiurim([]);
    }
  };

  const toggleShiur = (s: Shiur) => {
    if (selectedShiurim.includes(s)) {
      setSelectedShiurim(selectedShiurim.filter(x => x !== s));
    } else {
      setSelectedShiurim([...selectedShiurim, s]);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Welcome & Start Lesson Card */}
        <Card className="md:col-span-2 bg-[var(--color-primary)] flex flex-col justify-center">
          <h1 className="text-2xl font-bold text-[var(--color-text-main)] mb-2">מעקב השגחה - ישיבה</h1>
          <p className="opacity-80 mb-8 max-w-lg">
            ניהול נוכחות והשגחה על תלמידים בצורה פשוטה, חכמה ומהירה.
          </p>
          
          {activeLesson ? (
            <Button size="lg" variant="secondary" className="self-start" onClick={() => onStart(activeLesson.id)}>
              <PlayCircle className="ml-2" /> חזור לשיעור הפעיל ({activeLesson.subject})
            </Button>
          ) : (
            <Button size="lg" variant="secondary" className="self-start" onClick={() => setShowStartModal(true)}>
              <PlayCircle className="ml-2" /> התחל שיעור חדש
            </Button>
          )}
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-4">
          <Card className="flex items-center gap-4 bg-[var(--color-secondary)] text-white">
            <div>
              <div className="opacity-80 text-sm font-medium">תלמידים במערכת</div>
              <div className="text-[32px] font-bold mt-1 leading-none">{students.length}</div>
            </div>
          </Card>
          <Card 
            className={`flex items-center gap-4 text-white cursor-pointer hover:opacity-90 transition-opacity ${showHistory ? 'bg-gray-800' : 'bg-[var(--color-text-main)]'}`}
            onClick={() => { setShowHistory(!showHistory); setShowStartModal(false); }}
          >
            <div>
              <div className="opacity-80 text-sm font-medium">שיעורים שהושלמו</div>
              <div className="text-[32px] font-bold mt-1 leading-none">{finishedLessons.length}</div>
            </div>
          </Card>
        </div>
      </div>

      {/* Start Lesson Modal (Embedded) */}
      {showStartModal && !activeLesson && (
        <Card className="border-2 border-[var(--color-primary)]">
          <h2 className="text-2xl font-bold mb-6">פרטי השיעור</h2>
          <form onSubmit={handleStart} className="flex flex-col gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">נושא / מקצוע השיעור</label>
              {subjects?.length === 0 ? (
                <p className="text-sm text-red-500 mb-2">יש להגדיר מקצועות בהגדרות המערכת תחילה.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {subjects?.map(s => {
                    const isSelected = subject === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSubject(isSelected ? '' : s)}
                        className={`px-4 py-2 rounded-[12px] border text-sm font-medium transition-all cursor-pointer ${
                          isSelected 
                          ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-text-main)]' 
                          : 'bg-transparent border-black/10 text-[var(--color-text-main)] hover:bg-black/5'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">שיעורים משתתפים</label>
              {shiurim.length === 0 ? (
                <p className="text-sm text-red-500">יש להגדיר שיעורים בהגדרות המערכת תחילה.</p>
              ) : (
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
                  {shiurim.map(shiur => {
                    const isSelected = selectedShiurim.includes(shiur);
                    return (
                      <button
                        key={shiur}
                        type="button"
                        onClick={() => toggleShiur(shiur)}
                        className={`px-4 py-2 rounded-[12px] border text-sm font-medium transition-all cursor-pointer ${
                          isSelected 
                          ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-text-main)]' 
                          : 'bg-transparent border-black/10 text-[var(--color-text-main)] hover:bg-black/5'
                        }`}
                      >
                        שיעור {shiur}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-4">
              <Button type="submit" size="lg" disabled={!subject.trim() || selectedShiurim.length === 0}>
                התחל עכשיו
              </Button>
              <Button type="button" variant="ghost" size="lg" onClick={() => setShowStartModal(false)}>
                ביטול
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* History Modal (Embedded) */}
      {showHistory && (
        <Card className="border-2 border-[var(--color-text-main)] overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">היסטוריית שיעורים</h2>
            <Button variant="ghost" onClick={() => setShowHistory(false)}>סגור</Button>
          </div>
          {finishedLessons.length === 0 ? (
            <p className="text-gray-500 text-center py-8">אין שיעורים היסטוריים להצגה.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {finishedLessons.map(lesson => (
                <div 
                  key={lesson.id} 
                  onClick={() => onStart(lesson.id)}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-black/5 hover:bg-black/10 rounded-xl cursor-pointer transition-colors"
                >
                  <div>
                    <h3 className="font-bold text-lg">{lesson.subject}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(lesson.date).toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} • שיעורים: {lesson.shiurim.join(', ')}
                    </p>
                  </div>
                  <Button variant="secondary" className="mt-4 sm:mt-0" onClick={(e) => { e.stopPropagation(); onStart(lesson.id); }}>
                    פתח לעריכה
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
