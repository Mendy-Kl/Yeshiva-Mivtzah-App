import React, { useState } from 'react';
import { useAppStore } from '../AppContext';
import { Card, Button, Input, Badge, TimeInput } from './ui';
import { PlayCircle, Users, BookOpen, BarChart3, Search, ChevronLeft, Moon, ChevronDown, Check } from 'lucide-react';
import { Shiur } from '../types';
import { StudentProfileView } from './StudentProfileView';
import { formatHebrewDateTime } from '../lib/dateUtils';
import { DateRangePicker } from './DateRangePicker';

export function HomeView({ onStart, onStartNight, onNavigate }: { onStart: (id: string) => void, onStartNight?: (id: string) => void, onNavigate?: (view: any) => void }) {
  const { students, shiurim, subjects, lessons, startLesson, nightRegistrations, startNightRegistration, addPlannedAbsence } = useAppStore();
  const [subject, setSubject] = useState('');
  const [selectedShiurim, setSelectedShiurim] = useState<Shiur[]>([]);
  const [showStartModal, setShowStartModal] = useState<'lesson' | 'night' | 'absence' | null>(null);
  
  // Absence Form State
  const [absStudentId, setAbsStudentId] = useState('');
  const [absStudentSearch, setAbsStudentSearch] = useState('');
  const [showAbsStudentDropdown, setShowAbsStudentDropdown] = useState(false);
  const [absDateRange, setAbsDateRange] = useState<{start: Date | null, end: Date | null}>({ start: null, end: null });
  const [absFromTime, setAbsFromTime] = useState('');
  const [absToTime, setAbsToTime] = useState('');
  const [absReason, setAbsReason] = useState('');
  
  const [showHistory, setShowHistory] = useState(false);
  const [showNightHistory, setShowNightHistory] = useState(false);
  const [showStudents, setShowStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [selectedShiurFilter, setSelectedShiurFilter] = useState<string>('all');

  if (activeStudentId) {
    return <StudentProfileView studentId={activeStudentId} onClose={() => setActiveStudentId(null)} />;
  }

  const activeLesson = lessons.find(l => l.isActive);
  const activeNight = nightRegistrations?.find(n => n.isActive);
  
  const finishedLessons = lessons.filter(l => !l.isActive).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const finishedNights = (nightRegistrations || []).filter(n => !n.isActive).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleStartLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (subject.trim() && selectedShiurim.length > 0) {
      const id = startLesson(subject.trim(), selectedShiurim);
      onStart(id);
      setShowStartModal(null);
      setSubject('');
      setSelectedShiurim([]);
    }
  };

  const handleStartNight = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedShiurim.length > 0 && onStartNight) {
      const id = startNightRegistration(selectedShiurim);
      onStartNight(id);
      setShowStartModal(null);
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

  const filteredStudents = students.filter(s => {
    const searchStr = (studentSearch || '').trim().toLowerCase();
    const matchesSearch = !searchStr || 
      (s.name || '').toLowerCase().includes(searchStr) || 
      (s.shiur || '').toLowerCase().includes(searchStr);
      
    const matchesShiur = selectedShiurFilter === 'all' || s.shiur === selectedShiurFilter;
    return matchesSearch && matchesShiur;
  });

  // Group students by shiur
  const groupedStudents = filteredStudents.reduce((acc, student) => {
    if (!acc[student.shiur]) {
      acc[student.shiur] = [];
    }
    acc[student.shiur].push(student);
    return acc;
  }, {} as Record<string, typeof students>);

  // Sort shiurim keys to display them consistently
  const sortedShiurKeys = Object.keys(groupedStudents).sort();

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-4">
      
      {/* Welcome & Start Lesson Card */}
      <Card className="bg-[var(--color-primary)] flex flex-col justify-center items-center text-center py-8 lg:py-10 shadow-sm relative overflow-hidden">
        <h1 className="text-2xl lg:text-3xl font-extrabold text-[var(--color-text-main)] mb-2">מעקב השגחה - ישיבה</h1>
        <p className="font-medium opacity-80 mb-6 max-w-lg mx-auto text-base">
          ניהול נוכחות והשגחה על תלמידים בצורה פשוטה, חכמה ומהירה.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-3 w-full max-w-xl mx-auto relative z-10">
          {activeLesson ? (
            <Button size="lg" variant="secondary" className="flex-1 text-[15px]" onClick={() => onStart(activeLesson.id)}>
              <PlayCircle className="ml-2" size={18} /> חזור לשיעור הפעיל ({activeLesson.subject})
            </Button>
          ) : (
            <Button size="lg" variant="secondary" className="flex-1 text-[15px]" onClick={() => setShowStartModal('lesson')}>
              <PlayCircle className="ml-2" size={18} /> התחל שיעור חדש
            </Button>
          )}

          {activeNight ? (
            <Button size="lg" className="flex-1 bg-indigo-900 text-white hover:bg-indigo-800 border-none text-[15px] shadow-sm" onClick={() => onStartNight && onStartNight(activeNight.id)}>
              <Moon className="ml-2" size={18} /> חזור לרישום הלילה
            </Button>
          ) : (
            <Button size="lg" className="flex-1 bg-indigo-900 text-white hover:bg-indigo-800 border-none text-[15px] shadow-sm" onClick={() => setShowStartModal('night')}>
              <Moon className="ml-2" size={18} /> רישום לילה
            </Button>
          )}
        </div>

        <div className="mt-3 w-full max-w-xl mx-auto relative z-10 flex flex-col sm:flex-row gap-3">
          <Button size="lg" variant="outline" className="flex-1 bg-white/60 border-orange-950/20 text-orange-950 font-bold hover:bg-white transition-all shadow-sm text-[15px]" onClick={() => onNavigate && onNavigate('matrix')}>
            <BarChart3 className="ml-2" size={18} /> תמונת מצב יומית
          </Button>
          <Button size="lg" variant="outline" className="flex-1 bg-white/60 border-orange-950/20 text-orange-950 font-bold hover:bg-white transition-all shadow-sm text-[15px]" onClick={() => setShowStartModal('absence')}>
            <Search className="ml-2" size={18} /> רישום היעדרות
          </Button>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card 
            className={`flex items-center gap-4 text-white cursor-pointer hover:opacity-90 transition-opacity ${showStudents ? 'bg-orange-600' : 'bg-[var(--color-secondary)]'}`}
            onClick={() => { setShowStudents(!showStudents); setShowHistory(false); setShowNightHistory(false); setShowStartModal(null); }}
          >
            <div>
              <div className="opacity-80 text-sm font-medium">תלמידים במערכת</div>
              <div className="text-[32px] font-bold mt-1 leading-none">{students.length}</div>
            </div>
          </Card>
          <Card 
            className={`flex items-center gap-4 text-white cursor-pointer hover:opacity-90 transition-opacity ${showHistory ? 'bg-gray-800' : 'bg-[var(--color-text-main)]'}`}
            onClick={() => { setShowHistory(!showHistory); setShowNightHistory(false); setShowStudents(false); setShowStartModal(null); }}
          >
            <div>
              <div className="opacity-80 text-sm font-medium">שיעורים שהושלמו</div>
              <div className="text-[32px] font-bold mt-1 leading-none">{finishedLessons.length}</div>
            </div>
          </Card>
          <Card 
            className={`flex items-center gap-4 text-white cursor-pointer hover:opacity-90 transition-opacity ${showNightHistory ? 'bg-indigo-700' : 'bg-indigo-900'}`}
            onClick={() => { setShowNightHistory(!showNightHistory); setShowHistory(false); setShowStudents(false); setShowStartModal(null); }}
          >
            <div>
              <div className="opacity-80 text-sm font-medium">רישומי לילה שהושלמו</div>
              <div className="text-[32px] font-bold mt-1 leading-none">{finishedNights.length}</div>
            </div>
          </Card>
        </div>

      {/* Start Lesson Modal (Embedded) */}
      {showStartModal === 'lesson' && !activeLesson && (
        <Card className="border-2 border-[var(--color-primary)]">
          <h2 className="text-2xl font-bold mb-6">פרטי השיעור</h2>
          <form onSubmit={handleStartLesson} className="flex flex-col gap-6">
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
                התחל שיעור
              </Button>
              <Button type="button" variant="ghost" size="lg" onClick={() => setShowStartModal(null)}>
                ביטול
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Start Night Modal (Embedded) */}
      {showStartModal === 'night' && !activeNight && (
        <Card className="border-2 border-indigo-900">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Moon className="text-indigo-900" />רישום לילה חדש</h2>
          <form onSubmit={handleStartNight} className="flex flex-col gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">עבור אילו שיעורים תרצה לבצע רישום לילה?</label>
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
                          ? 'bg-indigo-900 border-indigo-900 text-white' 
                          : 'bg-transparent border-black/10 text-indigo-950 hover:bg-black/5'
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
                          ? 'bg-indigo-100 border-indigo-600 text-indigo-900 font-bold' 
                          : 'bg-transparent border-black/10 text-indigo-950 hover:bg-black/5'
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
              <Button type="submit" size="lg" className="bg-indigo-900 text-white hover:bg-indigo-800 border-none" disabled={selectedShiurim.length === 0}>
                התחל למלא רישום
              </Button>
              <Button type="button" variant="ghost" size="lg" onClick={() => setShowStartModal(null)}>
                ביטול
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Absence Registration Modal (Embedded) */}
      {showStartModal === 'absence' && (
        <Card className="border-2 border-[var(--color-primary)]">
          <h2 className="text-2xl font-bold mb-6 text-[var(--color-primary)] flex items-center gap-2"><Search size={24} /> רישום היעדרות</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (absStudentId && absDateRange.start && absDateRange.end && absReason) {
              // Format correctly to local YYYY-MM-DD
              const startStr = new Date(absDateRange.start.getTime() - absDateRange.start.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
              const endStr = new Date(absDateRange.end.getTime() - absDateRange.end.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
              
              await addPlannedAbsence({
                studentId: absStudentId,
                fromDate: startStr,
                toDate: endStr,
                fromTime: absFromTime,
                toTime: absToTime,
                reason: absReason
              });
              setShowStartModal(null);
              setAbsStudentId('');
              setAbsStudentSearch('');
              setAbsDateRange({ start: null, end: null });
              setAbsReason('');
              setAbsFromTime('');
              setAbsToTime('');
            }
          }} className="flex flex-col gap-4">
            
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">תלמיד</label>
              <div 
                className="relative bg-white border border-gray-300 rounded-lg p-2 flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-orange-500"
                onClick={() => setShowAbsStudentDropdown(true)}
              >
                <div className="flex-1 flex items-center gap-2">
                  <Search size={16} className="text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="חיפוש תלמיד..."
                    value={absStudentSearch}
                    onChange={(e) => {
                      setAbsStudentSearch(e.target.value);
                      setShowAbsStudentDropdown(true);
                      if (absStudentId && !students.find(s => s.id === absStudentId)?.name.includes(e.target.value)) {
                        setAbsStudentId('');
                      }
                    }}
                    onFocus={() => setShowAbsStudentDropdown(true)}
                    className="w-full outline-none bg-transparent"
                  />
                </div>
                <ChevronDown size={18} className="text-gray-400" />
              </div>
              
              {showAbsStudentDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAbsStudentDropdown(false)} />
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                     {students
                      .filter(s => !absStudentSearch || s.name.includes(absStudentSearch) || s.shiur.includes(absStudentSearch))
                      .map(s => (
                        <div 
                          key={s.id}
                          className={`p-3 text-sm cursor-pointer flex items-center justify-between hover:bg-orange-50 transition-colors ${absStudentId === s.id ? 'bg-orange-50 font-bold text-orange-800' : 'text-gray-700'}`}
                          onClick={() => {
                            setAbsStudentId(s.id);
                            setAbsStudentSearch(s.name + ` (שיעור ${s.shiur})`);
                            setShowAbsStudentDropdown(false);
                          }}
                        >
                          <span>{s.name} <span className="text-gray-400 font-normal">({s.shiur})</span></span>
                          {absStudentId === s.id && <Check size={16} className="text-orange-600" />}
                        </div>
                     ))}
                     {students.filter(s => !absStudentSearch || s.name.includes(absStudentSearch) || s.shiur.includes(absStudentSearch)).length === 0 && (
                       <div className="p-3 text-sm text-gray-400 text-center">לא נמצאו תלמידים</div>
                     )}
                  </div>
                </>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">תאריכים</label>
              <div className="w-full relative">
                <DateRangePicker value={absDateRange} onChange={setAbsDateRange} placeholder="בחר תאריכים..." className="w-full" />
              </div>
            </div>

            {absDateRange.start && absDateRange.end && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">משעה (אופציונלי)</label>
                  <TimeInput value={absFromTime} onChange={setAbsFromTime} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">עד שעה (אופציונלי)</label>
                  <TimeInput value={absToTime} onChange={setAbsToTime} />
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">סיבת ההיעדרות</label>
              <Input type="text" placeholder="לדוגמה: חתונה של אח, תור לרופא..." value={absReason} onChange={e => setAbsReason(e.target.value)} required />
            </div>
            
            <div className="flex gap-4 mt-4">
              <Button type="submit" size="lg" className="bg-[var(--color-primary)] text-white hover:bg-orange-600 border-none" disabled={!absStudentId || !absReason || !absDateRange.start || !absDateRange.end}>
                הוסף רישום היעדרות
              </Button>
              <Button type="button" variant="ghost" size="lg" onClick={() => setShowStartModal(null)}>
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
                      {formatHebrewDateTime(lesson.date)} • שיעורים: {lesson.shiurim.join(', ')}
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

      {/* Night History Modal (Embedded) */}
      {showNightHistory && (
        <Card className="border-2 border-indigo-900 overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2"><Moon className="text-indigo-900" size={24} /> היסטוריית רישומי לילה</h2>
            <Button variant="ghost" onClick={() => setShowNightHistory(false)}>סגור</Button>
          </div>
          {finishedNights.length === 0 ? (
            <p className="text-gray-500 text-center py-8">אין רישומי לילה היסטוריים להצגה.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {finishedNights.map(night => (
                <div 
                  key={night.id} 
                  onClick={() => onStartNight && onStartNight(night.id)}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-indigo-50/50 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-xl cursor-pointer transition-colors"
                >
                  <div>
                    <h3 className="font-bold text-lg text-indigo-950">רישום לילה</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatHebrewDateTime(night.date)} • שיעורים: {night.shiurim.join(', ')}
                    </p>
                  </div>
                  {onStartNight && (
                    <Button variant="secondary" className="mt-4 sm:mt-0 bg-white border-indigo-200 text-indigo-900 hover:bg-indigo-50" onClick={(e) => { e.stopPropagation(); onStartNight(night.id); }}>
                      פתח לעריכה
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Students List Modal (Embedded) */}
      {showStudents && (
        <Card className="border-2 border-orange-600 overflow-hidden">
          <div className="flex flex-col mb-6 gap-4">
            <div className="flex justify-between items-start sm:items-center">
              <h2 className="text-2xl font-bold">רשימת תלמידים</h2>
              <Button variant="ghost" onClick={() => setShowStudents(false)}>סגור</Button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex overflow-x-auto gap-2 pb-2 sm:pb-0 w-full sm:w-auto no-scrollbar">
                <button
                  onClick={() => setSelectedShiurFilter('all')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors border ${
                    selectedShiurFilter === 'all' 
                      ? 'bg-orange-600 text-white border-orange-600' 
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  כל השיעורים
                </button>
                {shiurim.map(shiur => (
                  <button
                    key={shiur}
                    onClick={() => setSelectedShiurFilter(shiur)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors border ${
                      selectedShiurFilter === shiur 
                        ? 'bg-[var(--color-primary)] text-orange-950 border-[var(--color-primary)]' 
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    שיעור {shiur}
                  </button>
                ))}
              </div>
              
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                <input 
                  type="text"
                  placeholder="חיפוש חופשי..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="w-full pl-4 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm"
                />
              </div>
            </div>
          </div>
          
          {filteredStudents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">אין תלמידים תואמים לחיפוש.</p>
          ) : (
            <div className="flex flex-col max-h-[60vh] overflow-y-auto -mx-2 px-2 custom-scrollbar">
              {sortedShiurKeys.map((shiurKey, index) => (
                <div key={shiurKey} className={`pb-6 ${index > 0 ? 'pt-6 border-t border-black/5' : ''}`}>
                  <h3 className="font-bold text-lg text-gray-800 mb-3 flex items-center gap-2 sticky top-0 bg-white/95 backdrop-blur-sm z-10 py-1">
                    <span className="text-orange-600">שיעור {shiurKey}</span>
                    <span className="text-sm font-normal text-gray-500">
                      ({groupedStudents[shiurKey].length} תלמידים)
                    </span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
                    {groupedStudents[shiurKey].map(student => (
                      <div 
                        key={student.id} 
                        onClick={() => setActiveStudentId(student.id)}
                        className="flex justify-between items-center p-3 rounded-lg cursor-pointer hover:bg-orange-50 transition-colors border-b border-gray-100 last:border-b-0 md:last:border-b md:even:border-b-0 lg:last:border-b"
                      >
                        <div className="font-semibold text-gray-800">{student.name}</div>
                        <ChevronLeft size={16} className="text-gray-400 opacity-50" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
