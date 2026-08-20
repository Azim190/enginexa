import { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { Globe, Headphones, Menu, Sun, Moon } from 'lucide-react';
import { SupportModal } from '../ui/SupportModal';
import { ToastContainer } from '../ui/Toast';

export const Layout = () => {
    const { user, organization } = useAuth();
    const { i18n, t } = useTranslation();
    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

    // Handle direction change
    useEffect(() => {
        document.documentElement.dir = i18n.dir();
        document.documentElement.lang = i18n.language;
    }, [i18n.language]);

    // Handle dark mode synchronization
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('darkMode', String(isDarkMode));
    }, [isDarkMode]);

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en');
    };

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="flex min-h-screen bg-surface">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <main className="flex-1 flex flex-col min-w-0">
                {/* ── Header ── */}
                <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 -ml-1 text-slate-500 hover:bg-slate-100 rounded-xl md:hidden transition-colors"
                            aria-label="Open menu"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        <div className="hidden md:flex items-center gap-3">
                            <div className="w-5 h-0.5 bg-gold-400" />
                            <h1
                                className="text-base font-bold text-brand-700 tracking-tight"
                                style={{ fontFamily: i18n.dir() === 'rtl' ? "'Cairo', sans-serif" : "'Playfair Display', serif" }}
                            >
                                {organization?.name || t('app.title')}
                            </h1>
                        </div>

                        {/* Mobile title */}
                        <h1 className="text-sm font-bold text-brand-700 md:hidden" style={{ fontFamily: "'Syne', sans-serif" }}>
                            {organization?.name || t('app.title')}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">
                        {/* Language toggle */}
                        <button
                            onClick={toggleLanguage}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 hover:border-brand-300 text-slate-600 hover:text-brand-600 text-xs font-semibold transition-all"
                        >
                            <Globe className="w-3.5 h-3.5" />
                            <span>{i18n.language === 'en' ? 'العربية' : 'English'}</span>
                        </button>

                        {/* Support */}
                        <button
                            onClick={() => setIsSupportOpen(true)}
                            className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors dark:hover:bg-white/10 dark:text-brand-300"
                            title={t('app.support')}
                        >
                            <Headphones className="w-4 h-4" />
                        </button>

                        {/* Dark/Light Mode Toggle */}
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors dark:hover:bg-white/10 dark:text-brand-300"
                            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            {isDarkMode ? <Sun className="w-4 h-4 text-gold-500" /> : <Moon className="w-4 h-4" />}
                        </button>

                        {/* User avatar */}
                        <div className="w-8 h-8 bg-gold-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* ── Content ── */}
                <div className="p-4 md:p-8 flex-1 overflow-auto">
                    <Outlet context={{ openSupport: () => setIsSupportOpen(true) }} />
                </div>

                <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
            </main>

            {/* Toast notifications */}
            <ToastContainer />
        </div>
    );
};
