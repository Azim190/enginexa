import React from 'react';
import { Mail, Phone, X, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SupportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.dir() === 'rtl';

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-scale-in"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-card-lg overflow-hidden">
                {/* Header */}
                <div className="relative bg-brand-600 px-6 py-6 overflow-hidden text-center">
                    <div className="mashrabiya-overlay absolute inset-0" />
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 rtl:right-auto rtl:left-4 p-1.5 text-brand-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors z-10"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="relative z-10">
                        <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Phone className="w-7 h-7 text-white" />
                        </div>
                        <h3
                            className="text-lg font-bold text-white"
                            style={{ fontFamily: isRTL ? "'Cairo', sans-serif" : "'Playfair Display', serif" }}
                        >
                            {t('app.support')}
                        </h3>
                    </div>
                </div>

                {/* Gold accent */}
                <div className="h-0.5 bg-gradient-to-r from-gold-400 to-gold-600" />

                {/* Body */}
                <div className="p-6">
                    <p className="text-slate-400 text-sm text-center mb-5">
                        Need assistance? Reach our technical support team via:
                    </p>

                    <div className="space-y-3">
                        <a
                            href="https://wa.me/966502537104"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-4 p-4 rounded-2xl border border-emerald-100 bg-emerald-50 hover:bg-emerald-100 transition-colors group"
                        >
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                                <MessageCircle className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <div className="font-bold text-sm text-emerald-800">WhatsApp</div>
                                <div className="text-xs text-emerald-600 mt-0.5">Instant Chat Support</div>
                            </div>
                        </a>

                        <a
                            href="mailto:support@darmakkah.com"
                            className="flex items-center gap-4 p-4 rounded-2xl border border-brand-100 bg-brand-50 hover:bg-brand-100 transition-colors group"
                        >
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                                <Mail className="w-5 h-5 text-brand-600" />
                            </div>
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <div className="font-bold text-sm text-brand-800">Email</div>
                                <div className="text-xs text-brand-500 mt-0.5">support@darmakkah.com</div>
                            </div>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
