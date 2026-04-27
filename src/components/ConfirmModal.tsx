import React from 'react';
import { Button } from './ui';

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: { isOpen: boolean, title: string, message: string, onConfirm: () => void, onCancel: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <Button variant="danger" className="flex-1" onClick={onConfirm}>מחק</Button>
          <Button variant="secondary" className="flex-1" onClick={onCancel}>ביטול</Button>
        </div>
      </div>
    </div>
  );
}
