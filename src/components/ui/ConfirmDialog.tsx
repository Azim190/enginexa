import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning';
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
    onConfirm,
    onCancel,
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
        >
            <div className="bg-white rounded-2xl shadow-card-lg w-full max-w-sm overflow-hidden animate-fade-scale-in">
                {/* Top accent */}
                <div className={`h-1.5 w-full ${variant === 'danger' ? 'bg-red-500' : 'bg-gold-500'}`} />

                <div className="p-6">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
                        variant === 'danger' ? 'bg-red-50 text-red-500' : 'bg-gold-50 text-gold-500'
                    }`}>
                        <AlertTriangle className="w-6 h-6" />
                    </div>

                    <h3
                        className="text-lg font-bold text-brand-700 mb-2"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                        {title}
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed mb-6">
                        {message}
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl font-medium text-sm transition-colors border border-slate-200"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`flex-1 px-4 py-2.5 text-white rounded-xl font-semibold text-sm transition-all active:scale-95 ${
                                variant === 'danger'
                                    ? 'bg-red-500 hover:bg-red-600 shadow-sm'
                                    : 'bg-gold-500 hover:bg-gold-600 shadow-sm'
                            }`}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
