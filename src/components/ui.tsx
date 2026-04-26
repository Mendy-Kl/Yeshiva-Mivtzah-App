import React, { useState, useEffect } from 'react';
import { cn } from '../utils';

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("bg-[var(--color-card-bg)] rounded-[24px] p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-1px_rgba(0,0,0,0.03)] border border-black/[0.02] flex flex-col", className)} {...props}>
      {children}
    </div>
  );
}

export function Button({ className, variant = 'primary', size = 'md', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'warning' | 'outline', size?: 'sm' | 'md' | 'lg' }) {
  const variants = {
    primary: 'bg-[var(--color-primary)] text-[var(--color-text-main)] hover:opacity-80',
    secondary: 'bg-[var(--color-secondary)] text-white hover:opacity-80',
    danger: 'bg-[#fee2e2] text-[var(--color-danger)] hover:bg-red-200 border-red-200 border',
    success: 'bg-[#dcfce7] text-[var(--color-success)] hover:bg-green-200 border-green-200 border',
    warning: 'bg-[#fef3c7] text-[var(--color-warning)] hover:bg-yellow-200 border-yellow-200 border',
    ghost: 'bg-transparent text-[var(--color-text-main)] hover:bg-black/5',
    outline: 'bg-transparent border border-black/10 text-[var(--color-text-main)] hover:bg-black/5'
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-[12px] font-medium',
    md: 'px-4 py-2 rounded-[12px] text-sm font-medium',
    lg: 'px-6 py-3 rounded-[12px] text-base font-bold'
  };
  
  return (
    <button 
      className={cn("transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer", variants[variant], sizes[size], className)}
      {...props} 
    />
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input 
      className={cn("w-full px-4 py-2.5 bg-black/5 border border-black/5 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all", className)} 
      {...props} 
    />
  );
}

export function Badge({ children, variant = 'gray', className }: { children: React.ReactNode, variant?: 'gray' | 'success' | 'warning' | 'danger' | 'primary' | 'secondary', className?: string }) {
  const variants = {
    gray: 'bg-gray-100 text-gray-700',
    secondary: 'bg-indigo-50 text-indigo-700',
    success: 'bg-[#dcfce7] text-[var(--color-success)]',
    warning: 'bg-[#fef3c7] text-[var(--color-warning)]',
    danger: 'bg-[#fee2e2] text-[var(--color-danger)]',
    primary: 'bg-[var(--color-primary)] text-[var(--color-text-main)]'
  }
  return (
    <span className={cn("px-3 py-1 text-xs font-semibold rounded-full", variants[variant], className)}>
      {children}
    </span>
  );
}

export interface TimeInputProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

export function TimeInput({ value, onChange, className }: TimeInputProps) {
  const idValue = React.useId();
  const hourId = `time-input-hour-${idValue}`;
  const minId = `time-input-min-${idValue}`;

  // value is expected to be "HH:mm" or ""
  const h = value ? value.split(':')[0] : '';
  const m = value ? value.split(':')[1] : '';

  const [hour, setHour] = useState(h);
  const [minute, setMinute] = useState(m);

  useEffect(() => {
    if (value) {
      setHour(value.split(':')[0]);
      setMinute(value.split(':')[1]);
    } else {
      setHour('');
      setMinute('');
    }
  }, [value]);

  const updateValue = (newH: string, newM: string) => {
    if (!newH && !newM) {
      onChange('');
      return;
    }
    // Only pass up valid complete times
    if (newH.length === 2 && newM.length === 2) {
      onChange(`${newH}:${newM}`);
    } else {
      onChange('');
    }
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(0, 2);
    if (val.length === 2 && parseInt(val) > 23) val = '23';
    
    setHour(val);
    updateValue(val, minute);

    // Auto focus next input
    if (val.length === 2) {
      const nextInput = document.getElementById(minId) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(0, 2);
    if (val.length === 2 && parseInt(val) > 59) val = '59';
    
    setMinute(val);
    updateValue(hour, val);
  };

  const handleHourBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const currentVal = e.target.value;
    if (currentVal && currentVal.length === 1) {
      const val = `0${currentVal}`;
      setHour(val);
      updateValue(val, minute);
    }
  };

  const handleMinuteBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const currentVal = e.target.value;
    if (currentVal && currentVal.length === 1) {
      const val = `0${currentVal}`;
      setMinute(val);
      updateValue(hour, val);
    }
  };

  const overrideKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, isHour: boolean) => {
    if (e.key === 'Backspace') {
       if (isHour && hour === '') {
          // do nothing
       } else if (!isHour && minute === '') {
          const prevInput = document.getElementById(hourId) as HTMLInputElement;
          if (prevInput) {
             prevInput.focus();
          }
       }
    }
  };

  return (
    <div className={cn("flex flex-1 items-center bg-white border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-[var(--color-primary)] transition-all overflow-hidden px-3", className)} dir="rtl">
      <div className="flex items-center w-full justify-center" dir="ltr">
        <input
          id={hourId}
          type="text"
          inputMode="numeric"
          dir="ltr"
          className="w-[40px] py-1.5 bg-transparent outline-none text-center font-mono text-[16px] tracking-widest placeholder-gray-400"
          placeholder="22"
          value={hour}
          onChange={handleHourChange}
          onBlur={handleHourBlur}
          onKeyDown={(e) => overrideKeyDown(e, true)}
          maxLength={2}
        />
        <span className="text-gray-500 font-extrabold pb-1">:</span>
        <input
          id={minId}
          type="text"
          inputMode="numeric"
          dir="ltr"
          className="w-[40px] py-1.5 bg-transparent outline-none text-center font-mono text-[16px] tracking-widest placeholder-gray-400"
          placeholder="00"
          value={minute}
          onChange={handleMinuteChange}
          onBlur={handleMinuteBlur}
          onKeyDown={(e) => overrideKeyDown(e, false)}
          maxLength={2}
        />
      </div>
    </div>
  );
}
