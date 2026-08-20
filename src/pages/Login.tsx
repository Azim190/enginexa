import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, ShieldCheck, ArrowLeft, KeyRound, Building2, UserPlus, LogIn, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/logo.png';

export const Login = () => {
    const [mode, setMode] = useState<'signin' | 'register'>('signin');
    
    // Sign In State
    const [name, setName] = useState('');
    const [idNumber, setIdNumber] = useState('');
    const [orgSlug, setOrgSlug] = useState(() => localStorage.getItem('last_org_slug') || '');
    const [showId, setShowId] = useState(false);
    
    // Registration State
    const [regOrgName, setRegOrgName] = useState('');
    const [regOrgSlug, setRegOrgSlug] = useState('');
    const [regAdminName, setRegAdminName] = useState('');
    const [regIdNumber, setRegIdNumber] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regError, setRegError] = useState<string | null>(null);

    // MFA State
    const [mfaPin, setMfaPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mfaError, setMfaError] = useState<string | null>(null);

    const { login, registerOrganization, verifyMfa, mfaRequired, logout, error: authError } = useAuth();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();

    const isRTL = i18n.dir() === 'rtl';

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMfaError(null);
        if (orgSlug.trim()) {
            localStorage.setItem('last_org_slug', orgSlug.trim());
        }
        const result = await login(name, idNumber, orgSlug.trim() || undefined);
        setIsLoading(false);
        if (result.success) {
            navigate('/');
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setRegError(null);
        
        const cleanSlug = regOrgSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
        if (!cleanSlug) {
            setRegError(isRTL ? 'يرجى إدخال معرّف صحيح للمنظمة (أحرف إنجليزية وأرقام)' : 'Please enter a valid organization identifier code');
            setIsLoading(false);
            return;
        }

        const result = await registerOrganization({
            orgName: regOrgName,
            orgSlug: cleanSlug,
            adminName: regAdminName,
            idNumber: regIdNumber,
            password: regPassword || regIdNumber,
        });

        setIsLoading(false);
        if (result.success) {
            localStorage.setItem('last_org_slug', cleanSlug);
            navigate('/');
        } else {
            setRegError(result.error || (isRTL ? 'فشل إنشاء حساب المنظمة' : 'Failed to register organization'));
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
            {/* ── Left panel: branding + luxury geometric aesthetics ── */}
            <div className="hidden lg:flex lg:w-[50%] bg-gradient-to-br from-brand-900 via-brand-800 to-[#04161c] relative overflow-hidden flex-col items-center justify-center p-12 text-white">
                {/* Background overlay */}
                <div className="absolute inset-0 mashrabiya-overlay opacity-30 pointer-events-none" />

                {/* Decorative circles */}
                <div className="absolute top-[-10%] right-[-10%] w-96 h-96 border border-white/5 rounded-full" />
                <div className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] border border-white/5 rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Content */}
                <div className="relative z-10 text-center max-w-md">
                    {/* Logo container */}
                    <div className="w-28 h-28 bg-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl p-3 border border-white/20">
                        <img src={logo} alt="EngiNexa Logo" className="w-full h-full object-contain" />
                    </div>

                    {/* Brand name */}
                    <div className="gold-rule mb-6 mx-auto w-32" />
                    <h1
                        className="text-4xl font-bold text-white mb-3 tracking-tight leading-tight"
                        style={{ fontFamily: isRTL ? "'Cairo', sans-serif" : "'Playfair Display', serif" }}
                    >
                        EngiNexa
                    </h1>
                    <p className="text-brand-200 text-sm leading-relaxed mb-6 font-medium">
                        {isRTL ? 'منظومة إدارة وأرشفة المشاريع السحابية للمكاتب والشركات الهندسية' : 'Cloud Archiving & Multi-Tenant Project Management Platform'}
                    </p>
                    <div className="gold-rule mx-auto w-32 mb-8" />

                    {/* Features list */}
                    <div className="space-y-3 text-start bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 text-xs text-brand-100 mb-8">
                        <div className="flex items-center gap-2.5">
                            <Sparkles className="w-4 h-4 text-gold-400 flex-shrink-0" />
                            <span>{isRTL ? 'بيئة سحابية معزولة ومخصصة لكل منظمة ومكتب' : 'Fully isolated, branded cloud workspace for every organization'}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <Building2 className="w-4 h-4 text-gold-400 flex-shrink-0" />
                            <span>{isRTL ? 'إدارة الفروع، الأقسام، والمراسلات والمشاريع الذكية' : 'Manage branches, departments, correspondence & deliverables'}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <ShieldCheck className="w-4 h-4 text-gold-400 flex-shrink-0" />
                            <span>{isRTL ? 'صلاحيات دقيقة وتحقق ثنائي لحماية سجلات المشاريع' : 'Granular RBAC, audit logging & enterprise-grade security'}</span>
                        </div>
                    </div>

                    {/* Tagline */}
                    <p className="text-brand-300 text-[11px] tracking-widest uppercase font-semibold">
                        CONNECT • MANAGE • ACHIEVE
                    </p>
                </div>
            </div>

            {/* ── Right panel: form (Sign in / Register / MFA) ── */}
            <div className="flex-1 flex flex-col bg-surface overflow-y-auto">
                {/* Mobile header */}
                <div className="lg:hidden bg-brand-800 p-6 text-center relative overflow-hidden">
                    <div className="mashrabiya-overlay absolute inset-0 pointer-events-none opacity-30" />
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 p-2 shadow-lg">
                            <img src={logo} alt="EngiNexa" className="w-full h-full object-contain" />
                        </div>
                        <h2 className="text-white font-bold text-lg">EngiNexa</h2>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
                    <div className="w-full max-w-md">

                        {/* Top bar: Language toggle */}
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-gold-400 animate-pulse" />
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    {isRTL ? 'إصدار المنصات الهندسية' : 'SaaS Enterprise Edition'}
                                </span>
                            </div>
                            <button
                                onClick={toggleLanguage}
                                className="text-xs font-bold text-brand-600 hover:text-brand-800 border border-brand-200 hover:border-brand-400 px-3.5 py-1.5 rounded-full transition-all bg-white shadow-xs"
                            >
                                {i18n.language === 'en' ? 'العربية' : 'English'}
                            </button>
                        </div>

                        {/* Mode Switcher Tabs (Sign In vs Register Organization) */}
                        {!mfaRequired && (
                            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-8 border border-slate-200/80">
                                <button
                                    type="button"
                                    onClick={() => { setMode('signin'); setRegError(null); }}
                                    className={`py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                                        mode === 'signin'
                                            ? 'bg-white text-brand-900 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    <LogIn className="w-3.5 h-3.5" />
                                    <span>{t('auth.sign_in_tab')}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setMode('register'); setRegError(null); }}
                                    className={`py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                                        mode === 'register'
                                            ? 'bg-white text-brand-900 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    <Building2 className="w-3.5 h-3.5 text-gold-500" />
                                    <span>{t('auth.register_org_tab')}</span>
                                </button>
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            {mfaRequired ? (
                                /* ── MFA Verification Form ── */
                                <motion.div
                                    key="mfa-form"
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="mb-8">
                                        <div className="flex items-center gap-3 mb-4">
                                            <ShieldCheck className="w-5 h-5 text-gold-500" />
                                            <span className="text-xs uppercase tracking-widest text-gold-600 font-semibold">
                                                {isRTL ? 'التحقق الثنائي (MFA)' : 'Two-Factor Authentication'}
                                            </span>
                                        </div>
                                        <h2
                                            className="text-2xl font-bold text-brand-900 leading-tight"
                                            style={{ fontFamily: isRTL ? "'Cairo', sans-serif" : "'Playfair Display', serif" }}
                                        >
                                            {isRTL ? 'رمز الأمان الإضافي' : 'Enter Security Code'}
                                        </h2>
                                        <p className="text-slate-500 text-xs mt-2">
                                            {isRTL 
                                                ? 'تم تفعيل حماية إضافية لحسابك. يرجى إدخال رمز التحقق الثنائي للمتابعة.' 
                                                : 'Secondary authentication is enabled on your account. Please enter your PIN.'}
                                        </p>
                                    </div>

                                    {mfaError && (
                                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                                            <div className="w-1 h-full bg-red-400 rounded-full flex-shrink-0 self-stretch" />
                                            <p className="text-xs text-red-600">{mfaError}</p>
                                        </div>
                                    )}

                                    <div className="mb-6 p-4 rounded-xl bg-gold-50/80 border border-gold-200/60 flex gap-3 text-xs text-gold-900">
                                        <KeyRound className="w-4 h-4 text-gold-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-semibold">{isRTL ? 'رمز الاختبار الافتراضي:' : 'Simulator Passcode:'}</span>{' '}
                                            {isRTL ? 'أدخل (123456) لإتمام تسجيل الدخول.' : 'Enter default code (123456) to proceed.'}
                                        </div>
                                    </div>

                                    <form onSubmit={handleMfaSubmit} className="space-y-5">
                                        <div>
                                            <label className="block text-xs font-semibold text-brand-700 uppercase tracking-wider mb-2 text-center">
                                                {isRTL ? 'رمز التحقق (PIN)' : 'Verification PIN'}
                                            </label>
                                            <input
                                                type="text"
                                                maxLength={6}
                                                value={mfaPin}
                                                onChange={(e) => setMfaPin(e.target.value.replace(/\D/g, ''))}
                                                className="input text-center text-2xl font-bold tracking-[0.6em] text-brand-900 placeholder-slate-200"
                                                placeholder="••••••"
                                                required
                                                autoFocus
                                            />
                                        </div>

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
                                                    <span className="animate-pulse">{isRTL ? 'جاري التحقق...' : 'Verifying...'}</span>
                                                ) : (
                                                    isRTL ? 'تأكيد ودخول' : 'Verify & Proceed'
                                                )}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={logout}
                                                className="w-full py-3 bg-white text-slate-600 rounded-xl font-semibold text-xs border border-slate-200
                                                           hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <ArrowLeft className="w-3.5 h-3.5" />
                                                <span>{isRTL ? 'العودة لبوابة الدخول' : 'Back to login portal'}</span>
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            ) : mode === 'signin' ? (
                                /* ── Standard Multi-Tenant Sign In Form ── */
                                <motion.div
                                    key="signin-tab"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="mb-6">
                                        <h2
                                            className="text-2xl font-bold text-brand-900 leading-tight"
                                            style={{ fontFamily: isRTL ? "'Cairo', sans-serif" : "'Playfair Display', serif" }}
                                        >
                                            {t('auth.welcome')}
                                        </h2>
                                        <p className="text-slate-500 text-xs mt-1.5">
                                            {isRTL ? 'سجل الدخول باستخدام الاسم المسجل ورقم الهوية' : 'Sign in using your registered credentials'}
                                        </p>
                                    </div>

                                    {authError && (
                                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                                            <div className="w-1 h-full bg-red-400 rounded-full flex-shrink-0 self-stretch" />
                                            <p className="text-xs text-red-600">{authError}</p>
                                        </div>
                                    )}

                                    <form onSubmit={handleSignIn} className="space-y-4">
                                        {/* Organization Code (Optional for default tenant, explicit for multi-tenancy) */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                                {t('auth.org_slug_optional')}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={orgSlug}
                                                    onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                                    className="input text-brand-900 text-xs placeholder:text-slate-400"
                                                    placeholder={t('auth.org_slug_placeholder')}
                                                    autoComplete="organization"
                                                />
                                                <Building2 className={`w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-3' : 'right-3'}`} />
                                            </div>
                                        </div>

                                        {/* Name field */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                                {isRTL ? 'الاسم الكامل' : 'Full Name'}
                                            </label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="input text-brand-900 text-xs"
                                                placeholder={isRTL ? 'أدخل اسمك المسجل (مثال: Azim)' : 'Enter registered name'}
                                                required
                                                autoComplete="name"
                                            />
                                        </div>

                                        {/* ID Number field */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                                {isRTL ? 'رقم الهوية الوطنية / الإقامة' : 'National ID / Password'}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showId ? 'text' : 'password'}
                                                    value={idNumber}
                                                    onChange={(e) => setIdNumber(e.target.value)}
                                                    className="input pr-10 text-brand-900 text-xs"
                                                    placeholder={isRTL ? 'أدخل رقم الهوية المسجل' : 'Enter ID number'}
                                                    required
                                                    autoComplete="current-password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowId(!showId)}
                                                    className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 p-1 ${isRTL ? 'left-3' : 'right-3'}`}
                                                >
                                                    {showId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Submit Button */}
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full py-3.5 bg-brand-600 text-white rounded-xl font-bold text-xs
                                                       hover:bg-brand-700 active:scale-[0.98] transition-all duration-200
                                                       disabled:opacity-60 disabled:cursor-not-allowed
                                                       flex items-center justify-center gap-2 mt-4 shadow-sm"
                                        >
                                            {isLoading ? (
                                                <span className="animate-pulse">{isRTL ? 'جاري التحقق...' : 'Signing in...'}</span>
                                            ) : (
                                                t('auth.signin')
                                            )}
                                        </button>
                                    </form>
                                </motion.div>
                            ) : (
                                /* ── Self-Service Organization Registration Form ── */
                                <motion.div
                                    key="register-tab"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="mb-6">
                                        <div className="flex items-center gap-2 text-gold-600 font-semibold text-xs mb-1">
                                            <Sparkles className="w-4 h-4" />
                                            <span>{isRTL ? 'إطلاق مساحة عمل جديدة' : 'Launch New Workspace'}</span>
                                        </div>
                                        <h2
                                            className="text-2xl font-bold text-brand-900 leading-tight"
                                            style={{ fontFamily: isRTL ? "'Cairo', sans-serif" : "'Playfair Display', serif" }}
                                        >
                                            {isRTL ? 'تسجيل مكتب / منظمة جديدة' : 'Register Organization'}
                                        </h2>
                                        <p className="text-slate-500 text-xs mt-1.5">
                                            {isRTL ? 'أنشئ حساب منظمتك المخصص وابدأ إدارة مشاريعك في دقائق' : 'Create your dedicated workspace and start managing projects'}
                                        </p>
                                    </div>

                                    {regError && (
                                        <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                                            <div className="w-1 h-full bg-red-400 rounded-full flex-shrink-0 self-stretch" />
                                            <p className="text-xs text-red-600">{regError}</p>
                                        </div>
                                    )}

                                    <form onSubmit={handleRegister} className="space-y-3.5">
                                        {/* Organization Name */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                {t('auth.org_name')} <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={regOrgName}
                                                onChange={(e) => {
                                                    setRegOrgName(e.target.value);
                                                    if (!regOrgSlug) {
                                                        const autoSlug = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').substring(0, 15);
                                                        setRegOrgSlug(autoSlug);
                                                    }
                                                }}
                                                className="input text-brand-900 text-xs"
                                                placeholder={t('auth.org_name_placeholder')}
                                                required
                                            />
                                        </div>

                                        {/* Organization Code / Slug */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                {t('auth.org_slug')} <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={regOrgSlug}
                                                onChange={(e) => setRegOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                                                className="input text-brand-900 text-xs font-mono"
                                                placeholder={t('auth.org_slug_placeholder')}
                                                required
                                            />
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                {isRTL ? 'معرّف فريد يُستخدم لتعريف منظمتك أثناء تسجيل الدخول' : 'Unique identifier used for logging into your workspace'}
                                            </p>
                                        </div>

                                        {/* Admin Name */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                {t('auth.admin_name')} <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={regAdminName}
                                                onChange={(e) => setRegAdminName(e.target.value)}
                                                className="input text-brand-900 text-xs"
                                                placeholder={t('auth.admin_name_placeholder')}
                                                required
                                            />
                                        </div>

                                        {/* Admin ID Number */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                {t('auth.id_number')} <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={regIdNumber}
                                                onChange={(e) => setRegIdNumber(e.target.value)}
                                                className="input text-brand-900 text-xs"
                                                placeholder={t('auth.id_number_placeholder')}
                                                required
                                            />
                                        </div>

                                        {/* Password */}
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                {t('auth.password')}
                                            </label>
                                            <input
                                                type="password"
                                                value={regPassword}
                                                onChange={(e) => setRegPassword(e.target.value)}
                                                className="input text-brand-900 text-xs"
                                                placeholder={isRTL ? 'اختياري (الافتراضي نفس رقم الهوية)' : 'Optional (defaults to ID number)'}
                                            />
                                        </div>

                                        {/* Submit */}
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-xl font-bold text-xs
                                                       hover:from-brand-700 hover:to-brand-800 active:scale-[0.98] transition-all duration-200
                                                       disabled:opacity-60 disabled:cursor-not-allowed
                                                       flex items-center justify-center gap-2 mt-4 shadow-sm"
                                        >
                                            <UserPlus className="w-4 h-4 text-gold-300" />
                                            <span>
                                                {isLoading 
                                                    ? (isRTL ? 'جاري تجهيز المنظومة...' : 'Setting up workspace...') 
                                                    : t('auth.register_btn')}
                                            </span>
                                        </button>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Footer */}
                        <p className="text-center text-[11px] text-slate-400 mt-8">
                            © {new Date().getFullYear()} EngiNexa SaaS. {isRTL ? 'جميع الحقوق محفوظة' : 'All rights reserved.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
