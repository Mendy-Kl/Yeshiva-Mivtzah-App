import React, { useState, useEffect } from 'react';
import { useAppStore } from '../AppContext';
import { Button, Card, Input } from './ui';
import { Settings, Users, BookOpen, Trash2, LibraryBig, LogOut } from 'lucide-react';

export function SettingsView() {
  const { shiurim, addShiur, removeShiur, students, addStudent, removeStudent, subjects, addSubject, removeSubject, logout } = useAppStore();
  const [newShiur, setNewShiur] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [selectedShiur, setSelectedShiur] = useState('');

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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto w-full">
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
                <div key={subject} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 flex items-center justify-between gap-4">
                  <span className="font-semibold text-gray-700">{subject}</span>
                  <button onClick={() => removeSubject(subject)} className="text-red-400 hover:text-red-600 transition-colors cursor-pointer">
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
                    <div className="text-sm text-gray-500">שיעור {student.shiur}</div>
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
    </div>
  );
}
