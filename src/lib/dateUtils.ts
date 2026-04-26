import { HDate } from '@hebcal/core';

export function formatHebrewDate(dateStr: string) {
  const d = new Date(dateStr);
  const greg = d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  
  try {
    const hd = new HDate(d);
    // Render in Hebrew letters (e.g. "ד׳ באייר תשפ״ו")
    const heb = hd.renderGematriya();
    return `${greg} | ${heb}`;
  } catch (e) {
    return greg;
  }
}

export function getHebrewDateOnly(dateStr: string) {
  const d = new Date(dateStr);
  try {
    const hd = new HDate(d);
    return hd.renderGematriya();
  } catch (e) {
    return '';
  }
}

export function formatHebrewDateTime(dateStr: string) {
  const d = new Date(dateStr);
  const time = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateOnly = formatHebrewDate(dateStr);
  return `${dateOnly} ${time}`;
}
