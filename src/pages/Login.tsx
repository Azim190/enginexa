import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, ShieldCheck, ArrowLeft, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo.png';

export const Login = () => {
    const [name, setName] = useState('');
    const [idNumber, setIdNumber] = useState('');
    const [mfaPin, setMfaPin] = useState('');
    const [showId, setShowId] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [mfaError, setMfaError] = useState<string | null>(null);

    const { login, verifyMfa, mfaRequired, logout, error: authError } = useAuth();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();

    const isRTL = i18n.dir() === 'rtl';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMfaError(null);
        const result = await login(name, idNumber);
        setIsLoading(false);
        if (result.success) {
            navigate('/');
        }
    };

    const handleMfaSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMfaError(null);
        const success = await verifyMfa(mfaPin);
        setIsLoading(false);
        if (success) {
            navigate('/');
        } else {
            setMfaError(isRTL ? 'رمز التحقق غير صحيح. يرجى المحاولة مرة أخرى.' : 'Invalid verification code. Please try again.');
        }
    };

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en');
    };

    return (
        <div
            className="min-h-screen flex"
            dir={isRTL ? 'rtl' : 'ltr'}
            style={{ fontFamily: isRTL ? "'Cairo', sans-serif" : "'Syne', sans-serif" }}
        >
            {/* ── Left panel: branding + Islamic geometry ── */}
            <div className="hidden lg:flex lg:w-[52%] bg-brand-600 relative overflow-hidden flex-col items-center justify-center p-12">
                {/* Mashrabiya geometric texture */}
                <div className="absolute inset-0 mashrabiya-overlay" />

                {/* Large geometric rings */}
                <div className="absolute top-[-10%] right-[-10%] w-96 h-96 border border-white/5 rounded-full" />
                <div className="absolute top-[-5%] right-[-5%] w-72 h-72 border border-white/5 rounded-full" />
                <div className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] border border-white/5 rounded-full" />
                <div className="absolute bottom-[-10%] left-[-5%] w-80 h-80 border border-white/5 rounded-full" />

                {/* Gold diagonal slash */}
                <div
                    className="absolute inset-0 opacity-10"
                    style={{
                        background: 'linear-gradient(135deg, transparent 40%, rgba(200,150,62,0.4) 40%, rgba(200,150,62,0.4) 55%, transparent 55%)'
                    }}
                />

                {/* Content */}
                <div className="relative z-10 text-center max-w-md">
                    {/* Logo */}
                    <div className="w-28 h-28 bg-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl p-3">
                        <img src={logo} alt="Dar Makkah Logo" className="w-full h-full object-contain" />
                    </div>

                    {/* Brand name */}
                    <div className="gold-rule mb-6 mx-auto w-32" />
                    <h1
                        className="text-3xl font-bold text-white mb-3 leading-tight"
                        style={{ fontFamily: isRTL ? "'Cairo', sans-serif" : "'Playfair Display', serif" }}
                    >
                        {t('app.title')}
                    </h1>
                    <p className="text-brand-200 text-sm leading-relaxed mb-8">
                        {isRTL ? 'منظومة الإدارة التنفيذية للمكتب' : 'CEO Executive Management System'}
                    </p>
                    <div className="gold-rule mx-auto w-32 mb-8" />

                    {/* Tagline */}
                    <p className="text-brand-300 text-xs tracking-widest uppercase">
                        {isRTL ? 'إصدار المؤسسات والشركاء' : 'Enterprise Edition'}
                    </p>
                </div>

                {/* Bottom geometric elements */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3">
                    {['Jeddah', 'Mecca', 'Medina', 'Al Baha', 'Balgarshi'].map((_, i) => (
                        <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-white/30"
                            style={{ opacity: i === 1 ? 1 : 0.3 }}
                        />
                    ))}
                </div>
            </div>

            {/* ── Right panel: login / MFA form ── */}
            <div className="flex-1 flex flex-col bg-surface">
                {/* Mobile logo header */}
                <div className="lg:hidden bg-brand-600 p-6 text-center relative overflow-hidden">
                    <div className="mashrabiya-overlay absolute inset-0 pointer-events-none opacity-40" />
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 p-2 shadow-lg">
                            <img src={logo} alt="Dar Makkah" className="w-full h-full object-contain" />
                        </div>
                        <h2 className="text-white font-bold text-lg">{t('app.title')}</h2>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
                    <div className="w-full max-w-md">

                        {/* Language toggle */}
                        <div className="flex justify-end mb-8">
                            <button
                                onClick={toggleLanguage}
                                className="text-sm font-semibold text-brand-500 hover:text-brand-700 border border-brand-200 hover:border-brand-400 px-4 py-1.5 rounded-full transition-all"
                            >
                                {i18n.language === 'en' ? 'العربية' : 'English'}
                            </button>
                        </div>

                        <AnimatePresence mode="wait">
                            {!mfaRequired ? (
                                /* ── Standard Login Form ── */
                                <motion.div
                                    key="login-form"
                                    initial={{ opacity: 0, x: isRTL ? 40 : -40 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: isRTL ? -40 : 40 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="mb-8">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-8 h-0.5 bg-gold-400" />
                                            <span className="text-xs uppercase tracking-widest text-gold-500 font-semibold">
                                                {isRTL ? 'بوابة الوصول الآمن' : 'Secure Access Gateway'}
                                            </span>
                                        </div>
                                        <h2
                                            className="text-3xl font-bold text-brand-700 leading-tight"
                                            style={{ fontFamily: isRTL ? "'Cairo', sans-serif" : "'Playfair Display', serif" }}
                                        >
                                            {t('auth.welcome')}
                                        </h2>
                                        <p className="text-slate-400 text-sm mt-2">
                                            {isRTL ? 'سجل الدخول باستخدام الاسم ورقم الهوية الوطنية' : 'Sign in with your registered name and National ID'}
                                        </p>
                                    </div>

                                    {/* Error */}
                                    {authError && (
                                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                                            <div className="w-1 h-full bg-red-400 rounded-full flex-shrink-0 self-stretch" />
                                            <p className="text-sm text-red-600">{authError}</p>
                                        </div>
                                    )}

                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        {/* Name field */}
                                        <div>
                                            <label className="block text-xs font-semibold text-brand-600 uppercase tracking-wider mb-2">
                                                {isRTL ? 'الاسم الكامل' : 'Full Name'}
                                            </label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="input text-brand-700"
                                                placeholder={isRTL ? 'أدخل اسمك كما هو مسجل' : 'Enter your registered name'}
                                                required
                                                autoComplete="name"
                                            />
                                        </div>

                                        {/* ID Number field */}
                                        <div>
                                            <label className="block text-xs font-semibold text-brand-600 uppercase tracking-wider mb-2">
                                                {isRTL ? 'رقم الهوية الوطنية / الإقامة' : 'National ID / Iqama'}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showId ? 'text' : 'password'}
                                                    value={idNumber}
                                                    onChange={(e) => setIdNumber(e.target.value)}
                                                    className="input pr-12 text-brand-700"
                                                    placeholder={isRTL ? 'أدخل رقم الهوية' : 'Enter your ID number'}
                                                    required
                                                    autoComplete="current-password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowId(!showId)}
                                                    className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 transition-colors p-1 ${isRTL ? 'left-3' : 'right-3'}`}
                                                >
                                                    {showId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Submit */}
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full py-3.5 bg-brand-600 text-white rounded-xl font-bold text-sm
                                                       hover:bg-brand-700 active:scale-[0.98] transition-all duration-200
                                                       disabled:opacity-60 disabled:cursor-not-allowed
                                                       flex items-center justify-center gap-2 mt-2 shadow-md"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                                    </svg>
                                                    {isRTL ? 'جاري التحقق...' : 'Signing in...'}
                                                </>
                                            ) : (
                                                t('auth.signin')
                                            )}
                                        </button>
                                    </form>
                                </motion.div>
                            ) : (
                                /* ── MFA Verification Form ── */
                                <motion.div
                                    key="mfa-form"
                                    initial={{ opacity: 0, x: isRTL ? -40 : 40 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: isRTL ? 40 : -40 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="mb-8">
                                        <div className="flex items-center gap-3 mb-4">
                                            <ShieldCheck className="w-5 h-5 text-gold-500" />
                                            <span className="text-xs uppercase tracking-widest text-gold-500 font-semibold">
                                                {isRTL ? 'التحقق الثنائي (MFA)' : 'Two-Factor Authentication'}
                                            </span>
                                        </div>
                                        <h2
                                            className="text-3xl font-bold text-brand-700 leading-tight"
                                            style={{ fontFamily: isRTL ? "'Cairo', sans-serif" : "'Playfair Display', serif" }}
                                        >
                                            {isRTL ? 'رمز الأمان الإضافي' : 'Enter Security Code'}
                                        </h2>
                                        <p className="text-slate-400 text-sm mt-2">
                                            {isRTL 
                                                ? 'تم تفعيل حماية إضافية لحساب الإدارة التنفيذية. يرجى إدخال رمز التحقق الثنائي.' 
                                                : 'Executive management accounts require secondary authentication. Please input your code.'}
                                        </p>
                                    </div>

                                    {/* Error */}
                                    {mfaError && (
                                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                                            <div className="w-1 h-full bg-red-400 rounded-full flex-shrink-0 self-stretch" />
                                            <p className="text-sm text-red-600">{mfaError}</p>
                                        </div>
                                    )}

                                    {/* MFA Tester Helper Info Card */}
                                    <div className="mb-6 p-4 rounded-xl bg-gold-50 border border-gold-200/50 flex gap-3 text-xs text-gold-800">
                                        <KeyRound className="w-4 h-4 text-gold-600 flex-shrink-0" />
                                        <div>
                                            <span className="font-semibold">{isRTL ? 'بيانات التجربة للمشرف:' : 'Simulator Credentials:'}</span>{' '}
                                            {isRTL ? 'أدخل الرمز الافتراضي (123456) لإتمام الدخول.' : 'Enter default passkey (123456) to proceed.'}
                                        </div>
                                    </div>

                                    <form onSubmit={handleMfaSubmit} className="space-y-5">
                                        {/* MFA Input */}
                                        <div>
                                            <label className="block text-xs font-semibold text-brand-600 uppercase tracking-wider mb-2 text-center">
                                                {isRTL ? 'رمز التحقق المكون من 6 أرقام' : '6-Digit Verification PIN'}
                                            </label>
                                            <input
                                                type="text"
                                                maxLength={6}
                                                value={mfaPin}
                                                onChange={(e) => setMfaPin(e.target.value.replace(/\D/g, ''))}
                                                className="input text-center text-2xl font-bold tracking-[0.7em] text-brand-700 placeholder-slate-200"
                                                placeholder="••••••"
                                                required
                                                autoFocus
                                            />
                                        </div>

                                        {/* Buttons */}
                                        <div className="space-y-3">
                                            <button
                                                type="submit"
                                                disabled={isLoading || mfaPin.length < 6}
                                                className="w-full py-3.5 bg-brand-600 text-white rounded-xl font-bold text-sm
                                                           hover:bg-brand-700 active:scale-[0.98] transition-all duration-200
                                                           disabled:opacity-60 disabled:cursor-not-allowed
                                                           flex items-center justify-center gap-2 shadow-md"
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                                        </svg>
                                                        {isRTL ? 'جاري التحقق...' : 'Verifying Code...'}
                                                    </>
                                                ) : (
                                                    isRTL ? 'تأكيد ودخول' : 'Verify & Proceed'
                                                )}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={logout}
                                                className="w-full py-3 bg-white text-slate-500 rounded-xl font-semibold text-xs border border-slate-200
                                                           hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <ArrowLeft className="w-3.5 h-3.5" />
                                                <span>{isRTL ? 'العودة لبوابة الدخول' : 'Back to login portal'}</span>
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Footer */}
                        <p className="text-center text-xs text-slate-300 mt-10">
                            © {new Date().getFullYear()} Dar Makkah Engineering Consultants
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
