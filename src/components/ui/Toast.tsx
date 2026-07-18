import React from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToast, type Toast } from '../../contexts/ToastContext';

const iconMap = {
    success: CheckCircle2,
    error:   XCircle,
    info:    Info,
    warning: AlertTriangle,
};

const colorMap = {
    success: {
        bar:  'bg-emerald-500',
        icon: 'text-emerald-500',
        bg:   'bg-white',
        border: 'border-emerald-100',
    },
    error: {
        bar:  'bg-red-500',
        icon: 'text-red-500',
        bg:   'bg-white',
        border: 'border-red-100',
    },
    info: {
        bar:  'bg-brand-500',
        icon: 'text-brand-500',
        bg:   'bg-white',
        border: 'border-brand-100',
    },
    warning: {
        bar:  'bg-gold-500',
        icon: 'text-gold-500',
        bg:   'bg-white',
        border: 'border-gold-100',
    },
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
    const Icon = iconMap[toast.type];
    const colors = colorMap[toast.type];

    return (
        <div
            className={`
                relative flex items-start gap-3 p-4 rounded-2xl border shadow-card-lg
                ${colors.bg} ${colors.border}
                ${toast.leaving ? 'animate-toast-out' : 'animate-toast-in'}
                min-w-[280px] max-w-[380px] overflow-hidden
            `}
            role="alert"
        >
            {/* Left accent bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${colors.bar}`} />

            {/* Icon */}
            <div className={`mt-0.5 flex-shrink-0 ${colors.icon}`}>
                <Icon className="w-5 h-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-brand-700 leading-snug" style={{ fontFamily: "'Syne', sans-serif" }}>
                    {toast.title}
                </p>
                {toast.message && (
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {toast.message}
                    </p>
                )}
            </div>

            {/* Dismiss */}
            <button
                onClick={() => onDismiss(toast.id)}
                className="flex-shrink-0 p-1 text-slate-300 hover:text-slate-500 transition-colors rounded-lg hover:bg-slate-100"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

export const ToastContainer: React.FC = () => {
    const { toasts, dismiss } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div
            className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 no-print"
            aria-live="polite"
        >
            {toasts.map(t => (
                <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
            ))}
        </div>
    );
};
