import React, { useState, useMemo, useEffect, useRef } from 'react';
import { HDate } from '@hebcal/core';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, X } from 'lucide-react';
import { getHebrewDateOnly } from '../lib/dateUtils';

interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const WEEKDAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const HEBREW_DAYS = ['', 'א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ז׳', 'ח׳', 'ט׳', 'י׳', 'י״א', 'י״ב', 'י״ג', 'י״ד', 'ט״ו', 'ט״ז', 'י״ז', 'י״ח', 'י״ט', 'כ׳', 'כ״א', 'כ״ב', 'כ״ג', 'כ״ד', 'כ״ה', 'כ״ו', 'כ״ז', 'כ״ח', 'כ״ט', 'ל׳'];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'hebrew' | 'gregorian'>('hebrew');
  const [viewDate, setViewDate] = useState(new Date());
  
  // Local state for the selected range in the popover
  const [tempValue, setTempValue] = useState<DateRange>({ start: null, end: null });
  
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync tempValue when popover opens
  useEffect(() => {
    if (isOpen) {
      setTempValue(value);
    }
  }, [isOpen, value]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('mousedown', handleGlobalClick);
      return () => window.removeEventListener('mousedown', handleGlobalClick);
    }
  }, [isOpen]);

  const handleDayClick = (d: Date) => {
    // Standardize to start of day for comparison
    d.setHours(0, 0, 0, 0);

    if (!tempValue.start || (tempValue.start && tempValue.end)) {
      setTempValue({ start: d, end: null });
    } else {
      const vStart = new Date(tempValue.start);
      vStart.setHours(0,0,0,0);
      
      if (d.getTime() < vStart.getTime()) {
        setTempValue({ start: d, end: vStart });
      } else {
        setTempValue({ start: vStart, end: d });
      }
    }
  };

  const nextMonth = () => {
    if (mode === 'gregorian') {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    } else {
      const hd = new HDate(viewDate);
      let nextM = hd.getMonth() + 1;
      let nextY = hd.getFullYear();
      if (nextM > 13 || (nextM === 13 && !new HDate(1, 1, nextY).isLeapYear())) {
        nextM = 1; // Nissan
      }
      if (nextM === 7) nextY++; // Tishrei is start of new year number
      // Special logic: The hebcal library handles months. Actually easiest way is to add 30 days and set to start of month
      const nextMonthFirst = new HDate(15, hd.getMonth(), hd.getFullYear()).add(30, 'd');
      setViewDate(new HDate(1, nextMonthFirst.getMonth(), nextMonthFirst.getFullYear()).greg());
    }
  };

  const prevMonth = () => {
    if (mode === 'gregorian') {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    } else {
      const hd = new HDate(viewDate);
      const prevMonthFirst = new HDate(15, hd.getMonth(), hd.getFullYear()).subtract(30, 'd');
      setViewDate(new HDate(1, prevMonthFirst.getMonth(), prevMonthFirst.getFullYear()).greg());
    }
  };

  const isSelected = (d: Date) => {
    d.setHours(0,0,0,0);
    const dTime = d.getTime();
    
    if (tempValue.start && tempValue.end) {
      const s = new Date(tempValue.start).setHours(0,0,0,0);
      const e = new Date(tempValue.end).setHours(0,0,0,0);
      return dTime >= s && dTime <= e;
    }
    
    if (tempValue.start) {
      return dTime === new Date(tempValue.start).setHours(0,0,0,0);
    }
    
    return false;
  };
  
  const isStartHover = (d: Date) => {
     d.setHours(0,0,0,0);
     if (tempValue.start && !tempValue.end) {
        return d.getTime() === new Date(tempValue.start).setHours(0,0,0,0);
     }
     if (tempValue.start && tempValue.end) {
        return d.getTime() === new Date(tempValue.start).setHours(0,0,0,0) || d.getTime() === new Date(tempValue.end).setHours(0,0,0,0);
     }
     return false;
  }

  const renderGrid = () => {
    const cells = [];
    let title = '';

    if (mode === 'gregorian') {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      title = viewDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
      
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let i = 0; i < firstDay; i++) {
        cells.push(<div key={`empty-start-${i}`} className="h-8"></div>);
      }

      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        const selected = isSelected(new Date(d));
        const highlighted = isStartHover(new Date(d));
        
        cells.push(
          <button
            key={`greg-${i}`}
            onClick={(e) => { e.stopPropagation(); handleDayClick(new Date(d)); }}
            className={`h-8 w-8 rounded-full text-sm flex items-center justify-center transition-colors 
              ${highlighted ? 'bg-orange-500 text-white font-bold' : selected ? 'bg-orange-100 text-orange-950 font-medium' : 'hover:bg-slate-100 text-slate-700'}`}
          >
            {i}
          </button>
        );
      }
    } else {
      const hd = new HDate(viewDate);
      const hMonth = hd.getMonth();
      const hYear = hd.getFullYear();
      const firstDayHd = new HDate(1, hMonth, hYear);
      
      title = `${hd.renderGematriya().split(' ').slice(1).join(' ')}`; // Removes the day part to just leave month and year

      const firstDay = firstDayHd.getDay();
      const daysInMonth = firstDayHd.daysInMonth();

      for (let i = 0; i < firstDay; i++) {
        cells.push(<div key={`empty-start-h-${i}`} className="h-8"></div>);
      }

      for (let i = 1; i <= daysInMonth; i++) {
        const hdDay = new HDate(i, hMonth, hYear);
        const gregD = hdDay.greg();
        const selected = isSelected(new Date(gregD));
        const highlighted = isStartHover(new Date(gregD));

        cells.push(
          <button
            key={`heb-${i}`}
            onClick={(e) => { e.stopPropagation(); handleDayClick(new Date(gregD)); }}
            className={`h-8 w-8 rounded-full text-[13px] flex items-center justify-center transition-colors
              ${highlighted ? 'bg-orange-500 text-white font-bold' : selected ? 'bg-orange-100 text-orange-950 font-medium' : 'hover:bg-slate-100 text-slate-700'}`}
          >
            {HEBREW_DAYS[i]}
          </button>
        );
      }
    }

    return (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={(e) => { e.stopPropagation(); nextMonth(); }} className="p-1 hover:bg-slate-100 rounded-full"><ChevronRight size={16} /></button>
          <div className="font-bold text-slate-800 text-sm">{title}</div>
          <button onClick={(e) => { e.stopPropagation(); prevMonth(); }} className="p-1 hover:bg-slate-100 rounded-full"><ChevronLeft size={16} /></button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {WEEKDAYS.map(wd => (
            <div key={wd} className="text-xs font-semibold text-slate-400">{wd}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1 place-items-center">
          {cells}
        </div>
      </div>
    );
  };

  return (
    <div className="relative" ref={popoverRef}>
      <div 
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white/80 backdrop-blur px-3 py-2 rounded-lg border border-orange-200/50 shadow-sm text-sm font-semibold text-orange-950 cursor-pointer hover:bg-orange-50/50 transition-colors w-full lg:w-fit min-w-[200px]"
      >
        <CalendarIcon size={14} className="text-orange-900/60 shrink-0" />
        <div className="flex-1 whitespace-nowrap text-right lg:text-center overflow-hidden text-ellipsis">
        {value.start ? (
          <span>
            {getHebrewDateOnly(value.start.toISOString())} 
            {(value.end && value.end.getTime() !== value.start.getTime()) ? ` - ${getHebrewDateOnly(value.end.toISOString())}` : ''}
          </span>
        ) : 'סנן לפי תאריכים'}
        </div>
        {value.start && (
          <div 
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange({ start: null, end: null }); setTempValue({ start: null, end: null }); }}
            className="ml-1 hover:bg-orange-100/80 p-0.5 rounded-full text-orange-800 transition-colors shrink-0"
          >
            <X size={12} />
          </div>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 z-[999] bg-white rounded-xl shadow-xl border border-gray-100 p-4 w-72 animate-in fade-in zoom-in duration-150" dir="rtl">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setMode('hebrew')} 
              className={`flex-1 text-sm py-1.5 font-medium rounded-md transition-colors ${mode === 'hebrew' ? 'bg-white shadow-sm text-orange-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              עברי
            </button>
            <button 
              onClick={() => setMode('gregorian')} 
              className={`flex-1 text-sm py-1.5 font-medium rounded-md transition-colors ${mode === 'gregorian' ? 'bg-white shadow-sm text-orange-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              לועזי
            </button>
          </div>
          
          {renderGrid()}
          
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
            <button 
              onClick={(e) => { e.stopPropagation(); onChange(tempValue); setIsOpen(false); }}
              className="px-4 py-1.5 bg-orange-600 outline-none hover:bg-orange-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              מאשר
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
