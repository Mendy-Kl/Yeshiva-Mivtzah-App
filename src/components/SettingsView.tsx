import React, { useState, useEffect } from 'react';
import { useAppStore } from '../AppContext';
import { Button, Card, Input } from './ui';
import { Settings, Users, BookOpen, Trash2, LibraryBig, LogOut, Home, X, Plus } from 'lucide-react';

export function SettingsView() {
  const { shiurim, addShiur, removeShiur, students, addStudent, updateStudent, removeStudent, subjects, addSubject, removeSubject, rooms, addRoom, removeRoom, subjectClasses, addSubjectClass, removeSubjectClass, logout } = useAppStore();
  const [newShiur, setNewShiur] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [selectedShiur, setSelectedShiur] = useState('');
  const [newRoom, setNewRoom] = useState('');
  
  const [activeRoomManager, setActiveRoomManager] = useState<string | null>(null);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [activeSubjectManager, setActiveSubjectManager] = useState<string | null>(null);
  const [activeClassManager, setActiveClassManager] = useState<{subject: string, className: string} | null>(null);
  const [classSearchQuery, setClassSearchQuery] = useState('');
  const [newClassName, setNewClassName] = useState('');

  useEffect(() => {
    if (!selectedShiur && shiurim.length > 0) {
      setSelectedShiur(shiurim[0]);
    }
  }, [shiurim, selectedShiur]);

  const handleAddShiur = (e: React.FormEvent) => {
    e.preventDefault();
    if (newShiur.trim()) {
      addShiur(newShiur.trim());
      setNewShiur('');
    }
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubject.trim()) {
      addSubject(newSubject.trim());
      setNewSubject('');
    }
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStudentName.trim() && selectedShiur) {
      addStudent(newStudentName.trim(), selectedShiur);
      setNewStudentName('');
    }
  };

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoom.trim()) {
      addRoom(newRoom.trim());
      setNewRoom('');
    }
  };

  const handleAddClass = (e: React.FormEvent, subject: string) => {
    e.preventDefault();
    if (newClassName.trim()) {
      addSubjectClass(subject, newClassName.trim());
      setNewClassName('');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-start px-1">
        <button 
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-medium transition-colors cursor-pointer"
        >
          <LogOut size={16} />
          <span>התנתק מהענן</span>
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-7xl mx-auto w-full">
        {/* Shiurim Manager */}
      <Card className="flex flex-col h-full">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="text-gray-400" />
          <h2 className="text-xl font-bold text-gray-800">ניהול שיעורים</h2>
        </div>
        
        <form onSubmit={handleAddShiur} className="flex gap-2 mb-6">
          <Input 
            placeholder="שם השיעור (לדוגמה: א', ב', קיבוץ)" 
            value={newShiur}
            onChange={e => setNewShiur(e.target.value)}
          />
          <Button type="submit">הוסף</Button>
        </form>

        <div className="flex-1 overflow-auto">
          {shiurim.length === 0 ? (
            <p className="text-gray-500 text-center mt-8">אין שיעורים מוגדרים עדיין.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {shiurim.map(shiur => (
                <div key={shiur} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 flex items-center justify-between gap-4">
                  <span className="font-semibold text-gray-700">שיעור {shiur}</span>
                  <button onClick={() => removeShiur(shiur)} className="text-red-400 hover:text-red-600 transition-colors cursor-pointer">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Subjects Manager */}
      <Card className="flex flex-col h-full">
        <div className="flex items-center gap-3 mb-6">
          <LibraryBig className="text-gray-400" />
          <h2 className="text-xl font-bold text-gray-800">ניהול מקצועות</h2>
        </div>
        
        <form onSubmit={handleAddSubject} className="flex gap-2 mb-6">
          <Input 
            placeholder="שם מקצוע (למשל: סדר בוקר, בבא קמא)" 
            value={newSubject}
            onChange={e => setNewSubject(e.target.value)}
          />
          <Button type="submit">הוסף</Button>
        </form>

        <div className="flex-1 overflow-auto">
          {subjects?.length === 0 ? (
            <p className="text-gray-500 text-center mt-8">אין מקצועות. הוסף מקצוע להתחלה.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {subjects?.map(subject => (
                <div key={subject} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-100 transition-colors shadow-sm" onClick={() => setActiveSubjectManager(subject)}>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800 text-lg">{subject}</span>
                    <span className="text-xs text-gray-500 font-medium">{subjectClasses[subject]?.length || 0} כיתות מוגדרות</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); removeSubject(subject); }} className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer p-1">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Rooms Manager */}
      <Card className="flex flex-col h-full">
        <div className="flex items-center gap-3 mb-6">
          <Home className="text-gray-400" />
          <h2 className="text-xl font-bold text-gray-800">ניהול חדרים</h2>
        </div>
        
        <form onSubmit={handleAddRoom} className="flex gap-2 mb-6">
          <Input 
            placeholder="מספר חדר (למשל: 304, א-2)" 
            value={newRoom}
            onChange={e => setNewRoom(e.target.value)}
          />
          <Button type="submit">הוסף</Button>
        </form>

        <div className="flex-1 overflow-auto">
          {rooms?.length === 0 ? (
             <p className="text-gray-500 text-center mt-8">אין חדרים במערכת.</p>
          ) : (
             <div className="flex flex-wrap gap-2">
               {rooms?.map(room => (
                 <div key={room} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-100 transition-colors shadow-sm" onClick={() => setActiveRoomManager(room)}>
                   <div className="flex flex-col">
                     <span className="font-bold text-gray-800 text-lg">חדר {room}</span>
                     <span className="text-xs text-gray-500 font-medium">{students.filter(s => s.room === room).length} תלמידים</span>
                   </div>
                   <button onClick={(e) => { e.stopPropagation(); removeRoom(room); }} className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer p-1">
                     <Trash2 size={18} />
                   </button>
                 </div>
               ))}
             </div>
          )}
        </div>
      </Card>

      {/* Students Manager */}
      <Card className="flex flex-col h-full">
        <div className="flex items-center gap-3 mb-6">
          <Users className="text-gray-400" />
          <h2 className="text-xl font-bold text-gray-800">ניהול תלמידים</h2>
        </div>
        
        <form onSubmit={handleAddStudent} className="flex flex-col gap-3 mb-6">
          <div className="flex gap-2">
            <Input 
              placeholder="שם התלמיד" 
              value={newStudentName}
              onChange={e => setNewStudentName(e.target.value)}
            />
            <select 
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all cursor-pointer min-w-[120px]"
              value={selectedShiur}
              onChange={e => setSelectedShiur(e.target.value)}
            >
              {shiurim.length === 0 && <option value="" disabled>אין שיעורים</option>}
              {shiurim.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <Button type="submit" className="w-full" disabled={!selectedShiur}>הוסף תלמיד</Button>
        </form>

        <div className="flex-1 overflow-auto max-h-[400px]">
          {students.length === 0 ? (
            <p className="text-gray-500 text-center mt-8">לא הוזנו תלמידים.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {students.map(student => (
                <div key={student.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{student.name}</div>
                    <div className="text-sm text-gray-500">שיעור {student.shiur}{student.room ? ` • חדר ${student.room}` : ''}</div>
                  </div>
                  <button onClick={() => removeStudent(student.id)} className="text-red-400 hover:text-red-600 transition-colors p-2 cursor-pointer">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
      </div>

      {/* Modals */}
      {activeRoomManager && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-xl w-full max-h-[80vh] flex flex-col pt-4">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Home className="text-gray-400" size={24} />
                ניהול חדר {activeRoomManager}
              </h2>
              <button 
                onClick={() => { setActiveRoomManager(null); setRoomSearchQuery(''); }} 
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X size={20}/>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-1">
              <p className="text-sm text-gray-500 mb-4">בחר את התלמידים שיוגדרו בחדר זה. כדי להסיר תלמיד, בטל את הסימון.</p>
              
              <div className="mb-4">
                <Input 
                  placeholder="חיפוש בחור..." 
                  value={roomSearchQuery}
                  onChange={(e) => setRoomSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                {students.filter(s => s.name.includes(roomSearchQuery)).map(s => {
                  const isInRoom = s.room === activeRoomManager;
                  return (
                    <label key={s.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isInRoom ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                        checked={isInRoom}
                        onChange={(e) => {
                          if (e.target.checked) updateStudent(s.id, { room: activeRoomManager });
                          else updateStudent(s.id, { room: '' });
                        }}
                      />
                      <div className="font-semibold text-gray-800">{s.name} <span className="text-xs text-gray-500 font-normal">שיעור {s.shiur}</span></div>
                      {s.room && s.room !== activeRoomManager && <span className="text-xs bg-gray-100 text-gray-600 px-2 rounded ml-auto">בחדר {s.room}</span>}
                    </label>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeSubjectManager && (
         <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
          <Card className="max-w-md w-full flex flex-col pt-4">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <LibraryBig className="text-gray-400" size={24} />
                כיתות - {activeSubjectManager}
              </h2>
              <button onClick={() => setActiveSubjectManager(null)} className="text-gray-400 hover:text-gray-600 p-2"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-auto p-1 max-h-[60vh]">
              <form onSubmit={(e) => handleAddClass(e, activeSubjectManager)} className="flex gap-2 mb-6">
                <Input 
                  placeholder="הוסף כיתה (למשל: רמה א')" 
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                />
                <Button type="submit">הוסף</Button>
              </form>
              <div className="flex flex-col gap-2">
                {subjectClasses[activeSubjectManager]?.length === 0 || !subjectClasses[activeSubjectManager] ? (
                  <p className="text-gray-500 text-center py-4">לא הוגדרו כיתות/רמות.</p>
                ) : (
                  subjectClasses[activeSubjectManager].map(cls => (
                    <div key={cls} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-100 transition-colors shadow-sm" onClick={() => setActiveClassManager({ subject: activeSubjectManager, className: cls })}>
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-800 text-lg">{cls}</span>
                        <span className="text-xs text-gray-500 font-medium">{students.filter(s => (s.subjectLevels || {})[activeSubjectManager] === cls).length} תלמידים</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); removeSubjectClass(activeSubjectManager, cls); }} className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer p-1">
                         <Trash2 size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeClassManager && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="max-w-xl w-full max-h-[80vh] flex flex-col pt-4">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="text-gray-400" size={24} />
                תלמידים - {activeClassManager.className} ({activeClassManager.subject})
              </h2>
              <button 
                onClick={() => { setActiveClassManager(null); setClassSearchQuery(''); }} 
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X size={20}/>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-1">
              <p className="text-sm text-gray-500 mb-4">סמן תלמידים ששייכים לכיתה/רמה זו. ההגדרה מתעדכנת אוטומטית.</p>

              <div className="mb-4">
                <Input 
                  placeholder="חיפוש בחור..." 
                  value={classSearchQuery}
                  onChange={(e) => setClassSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                {students.filter(s => s.name.includes(classSearchQuery)).map(s => {
                  const isInClass = (s.subjectLevels || {})[activeClassManager.subject] === activeClassManager.className;
                  const currentClass = (s.subjectLevels || {})[activeClassManager.subject];
                  return (
                    <label key={s.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isInClass ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                        checked={isInClass}
                        onChange={(e) => {
                          const updatedLevels = { ...(s.subjectLevels || {}) };
                          if (e.target.checked) {
                            updatedLevels[activeClassManager.subject] = activeClassManager.className;
                          } else {
                            delete updatedLevels[activeClassManager.subject];
                          }
                          updateStudent(s.id, { subjectLevels: updatedLevels });
                        }}
                      />
                      <div className="font-semibold text-gray-800">{s.name} <span className="text-xs text-gray-500 font-normal">שיעור {s.shiur}</span></div>
                      {currentClass && currentClass !== activeClassManager.className && <span className="text-xs bg-gray-100 text-gray-600 px-2 rounded ml-auto">בכיתה: {currentClass}</span>}
                    </label>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
