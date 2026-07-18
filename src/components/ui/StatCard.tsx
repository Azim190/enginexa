import React, { useEffect, useRef, useState } from 'react';

interface StatCardProps {
    value: number;
    label: string;
    icon: React.ElementType;
    color?: string;
    delay?: number;
}

function useCountUp(target: number, duration = 1200, delay = 0) {
    const [count, setCount] = useState(0);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        let startTime: number | null = null;
        const startDelay = setTimeout(() => {
            const step = (timestamp: number) => {
                if (!startTime) startTime = timestamp;
                const elapsed = timestamp - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // Ease out cubic
                const eased = 1 - Math.pow(1 - progress, 3);
                setCount(Math.floor(eased * target));
                if (progress < 1) {
                    rafRef.current = requestAnimationFrame(step);
                }
            };
            rafRef.current = requestAnimationFrame(step);
        }, delay);

        return () => {
            clearTimeout(startDelay);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [target, duration, delay]);

    return count;
}

export const StatCard: React.FC<StatCardProps> = ({
    value,
    label,
    icon: Icon,
    color = 'bg-brand-600',
    delay = 0
}) => {
    const count = useCountUp(value, 1000, delay);

    return (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-card flex items-center gap-4 animate-count-up">
            <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-2xl font-bold text-brand-700" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {count.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                    {label}
                </p>
            </div>
        </div>
    );
};
