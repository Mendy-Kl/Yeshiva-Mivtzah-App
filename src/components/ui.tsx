import React from 'react';
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

export function Badge({ children, variant = 'gray' }: { children: React.ReactNode, variant?: 'gray' | 'success' | 'warning' | 'danger' | 'primary' }) {
  const variants = {
    gray: 'bg-gray-100 text-gray-700',
    success: 'bg-[#dcfce7] text-[var(--color-success)]',
    warning: 'bg-[#fef3c7] text-[var(--color-warning)]',
    danger: 'bg-[#fee2e2] text-[var(--color-danger)]',
    primary: 'bg-[var(--color-primary)] text-[var(--color-text-main)]'
  }
  return (
    <span className={cn("px-3 py-1 text-xs font-semibold rounded-full", variants[variant])}>
      {children}
    </span>
  );
}
