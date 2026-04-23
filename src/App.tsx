import React, { useState } from 'react';
import { AppProvider, useAppStore } from './AppContext';
import { SettingsView } from './components/SettingsView';
import { HomeView } from './components/HomeView';
import { ActiveLessonView } from './components/ActiveLessonView';
import { ActiveNightView } from './components/ActiveNightView';
import { ReportsView } from './components/ReportsView';
import { ExamsView } from './components/ExamsView';
import { MivtzaView } from './components/MivtzaView';
import { GeneralMatrixView } from './components/GeneralMatrixView';
import { LayoutDashboard, Settings, FileText, BookOpen, GraduationCap, Award, Grid } from 'lucide-react';

function AppContent() {
  const [currentView, setCurrentView] = useState<'home' | 'settings' | 'reports' | 'exams' | 'mivtza' | 'matrix'>('home');
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [activeNightId, setActiveNightId] = useState<string | null>(null);
  const { lessons, nightRegistrations } = useAppStore();

  if (activeLessonId) {
    const isActuallyActive = lessons.find(l => l.id === activeLessonId)?.isActive;
    return (
      <div className="min-h-screen p-4 md:p-6">
        <ActiveLessonView lessonId={activeLessonId} onClose={() => setActiveLessonId(null)} />
        <button 
          onClick={() => setActiveLessonId(null)}
          className="fixed bottom-6 right-6 bg-[var(--color-card-bg)] shadow-xl px-6 py-3 rounded-full font-bold text-[var(--color-text-main)] border border-black/5 hover:opacity-80 cursor-pointer"
        >
          {isActuallyActive ? 'חזרה החוצה (השיעור ימשיך ברקע)' : 'חזור למסך הראשי'}
        </button>
      </div>
    );
  }

  if (activeNightId) {
    const isActuallyActive = nightRegistrations.find(n => n.id === activeNightId)?.isActive;
    return (
      <div className="min-h-screen p-4 md:p-6">
        <ActiveNightView nightId={activeNightId} onClose={() => setActiveNightId(null)} />
        <button 
          onClick={() => setActiveNightId(null)}
          className="fixed bottom-6 right-6 bg-[var(--color-card-bg)] shadow-xl px-6 py-3 rounded-full font-bold text-[var(--color-text-main)] border border-black/5 hover:opacity-80 cursor-pointer z-40"
        >
          {isActuallyActive ? 'חזרה החוצה (הרישום ימשיך ברקע)' : 'חזור למסך הראשי'}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar Navigation */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[var(--color-primary)] p-2 rounded-xl text-orange-900">
              <BookOpen size={24} />
            </div>
            <span className="font-bold text-xl text-gray-900">השגחה</span>
          </div>

          <nav className="flex items-center gap-1 sm:gap-2">
            <NavButton 
              active={currentView === 'home'} 
              onClick={() => setCurrentView('home')}
              icon={<LayoutDashboard size={18} />}
              label="ראשי"
            />
            <NavButton 
              active={currentView === 'exams'} 
              onClick={() => setCurrentView('exams')}
              icon={<GraduationCap size={18} />}
              label="מבחנים"
            />
            <NavButton 
              active={currentView === 'reports'} 
              onClick={() => setCurrentView('reports')}
              icon={<FileText size={18} />}
              label="דוחות"
            />
            <NavButton 
              active={currentView === 'matrix'} 
              onClick={() => setCurrentView('matrix')}
              icon={<Grid size={18} />}
              label="מצב כללי"
            />
            <NavButton 
              active={currentView === 'mivtza'} 
              onClick={() => setCurrentView('mivtza')}
              icon={<Award size={18} />}
              label="מבצע"
              activeClass="bg-[#dcfce7] text-[#15803d]"
              inactiveClass="bg-[#dcfce7]/50 text-[#15803d] hover:bg-[#dcfce7]"
            />
            <NavButton 
              active={currentView === 'settings'} 
              onClick={() => setCurrentView('settings')}
              icon={<Settings size={18} />}
              label="הגדרות"
            />
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 overflow-hidden max-w-full">
        {currentView === 'home' && <HomeView onStart={setActiveLessonId} onStartNight={setActiveNightId} onNavigate={setCurrentView} />}
        {currentView === 'mivtza' && <MivtzaView />}
        {currentView === 'exams' && <ExamsView />}
        {currentView === 'settings' && <SettingsView />}
        {currentView === 'reports' && <ReportsView />}
        {currentView === 'matrix' && <GeneralMatrixView />}
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon, label, activeClass, inactiveClass }: any) {
  const baseClass = "flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-medium transition-colors cursor-pointer text-sm sm:text-base";
  const defaultActive = "bg-[var(--color-primary)] text-orange-950";
  const defaultInactive = "text-gray-600 hover:bg-gray-100";
  
  return (
    <button
      onClick={onClick}
      className={`${baseClass} ${active ? (activeClass || defaultActive) : (inactiveClass || defaultInactive)}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

