import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    LayoutDashboard,
    Building2,
    Zap,
    Map,
    LogOut,
    Building,
    X,
    Ruler,
    ChevronRight,
    UserCog,
    ClipboardList,
    Mail,
    Factory,
    Briefcase,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { clsx } from 'clsx';
import logo from '../../assets/logo.png';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
    const { t, i18n } = useTranslation();
    const { logout, user } = useAuth();
    const isRTL = i18n.dir() === 'rtl';
    const [isCorrOpen, setIsCorrOpen] = React.useState(false);
    const [isDesignOpen, setIsDesignOpen] = React.useState(true);
    const [isSupervisionOpen, setIsSupervisionOpen] = React.useState(false);

    const allNavItems = [
        { to: '/',              icon: LayoutDashboard, label: t('app.dashboard'),          section: 'all',   adminOnly: false },
        { to: '/log-sheet',     icon: ClipboardList,    label: isRTL ? 'سجل المشاريع' : 'Project Log Sheet', section: 'all', adminOnly: false },
        { to: '/admin-console', icon: UserCog,          label: isRTL ? 'منظومة التحكم والمراقبة' : 'Admin EMS Console', section: 'all', adminOnly: true },
    ];

    const navItems = allNavItems.filter(item => {
        if (!user) return false;
        const roleLower = user.role.toLowerCase();
        const isAdminOrCeo = roleLower === 'admin' || roleLower === 'ceo';
        if (item.adminOnly && !isAdminOrCeo) return false;
        if (isAdminOrCeo) return true;
        if (item.section === 'all') return true;
        return item.section === user.section?.toLowerCase();
    });

    const designItems = [
        { to: '/architectural', icon: Building2,        label: t('sections.architectural'), section: 'architectural' },
        { to: '/structural',    icon: Ruler,            label: t('sections.structural'),    section: 'structural' },
        { to: '/surveying',     icon: Map,              label: t('sections.surveying'),     section: 'surveying' },
        { to: '/electrical',    icon: Zap,              label: t('sections.electrical'),    section: 'electrical' },
        { to: '/mechanical',    icon: Building,         label: t('sections.mechanical'),    section: 'mechanical' },
    ];

    const filteredDesignItems = designItems.filter(item => {
        if (!user) return false;
        const roleLower = user.role.toLowerCase();
        const isAdminOrCeo = roleLower === 'admin' || roleLower === 'ceo';
        if (isAdminOrCeo) return true;
        return item.section === user.section?.toLowerCase();
    });

    const supervisionItems = [
        { to: '/supervision/industrial', icon: Factory,   label: t('sections.supervision-industrial') },
        { to: '/supervision/client',     icon: Briefcase, label: t('sections.supervision-client') },
    ];

    const roleLower = user?.role?.toLowerCase() || '';
    const canAccessSupervision = ['admin', 'ceo', 'branch manager', 'secretary'].includes(roleLower);

    return (
        <>
            <aside
                className={clsx(
                    'fixed inset-y-0 start-0 z-50 w-64 flex flex-col transition-all duration-300 ease-in-out',
                    'md:sticky md:top-0 md:h-screen md:!translate-x-0',
                    'bg-white dark:bg-[#04161c] border-r border-slate-200/80 dark:border-brand-800 rtl:border-r-0 rtl:border-l rtl:border-slate-200/80 rtl:dark:border-brand-800 shadow-sm',
                    isOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'
                )}
            >
                {/* Mashrabiya texture for dark mode */}
                <div className="mashrabiya-overlay absolute inset-0 pointer-events-none opacity-0 dark:opacity-100 transition-opacity" />

                {/* Subtle gradient overlay for dark mode */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-0 dark:opacity-100 transition-opacity"
                    style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.25) 100%)' }}
                />

                {/* ── Logo header ── */}
                <div className="relative z-10 px-5 py-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-50 dark:bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-100 dark:border-transparent p-1.5">
                            <img src={logo} alt="EngiNexa" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <p
                                className="text-brand-900 dark:text-white font-bold text-sm leading-tight"
                                style={{ fontFamily: isRTL ? "'Cairo', sans-serif" : "'Playfair Display', serif" }}
                            >
                                EngiNexa
                            </p>
                            <p className="text-slate-400 dark:text-brand-300 text-[10px] tracking-wider mt-0.5 font-medium">
                                {isRTL ? 'نظام الأرشفة الذكي' : 'Archiving System'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="md:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-brand-300 dark:hover:text-white dark:hover:bg-white/10 rounded-xl transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* ── Gold accent line ── */}
                <div className="relative z-10 h-px bg-gradient-to-r from-transparent via-gold-400/40 dark:via-gold-400/60 to-transparent" />

                {/* ── Navigation ── */}
                <nav className="relative z-10 flex-1 p-3.5 space-y-1 overflow-y-auto scrollbar-hide">
                    <p className="text-slate-400 dark:text-brand-300 text-[10px] uppercase tracking-widest font-bold px-3 mb-2">
                        {isRTL ? 'القائمة' : 'Navigation'}
                    </p>
                    {/* Render Dashboard Link (which is idx 0 in navItems) */}
                    {navItems.filter(i => i.to === '/').map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end
                            onClick={() => { if (window.innerWidth < 768) onClose(); }}
                            className={({ isActive }) => clsx(
                                'nav-link',
                                isActive && 'nav-link-active'
                            )}
                        >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-brand-200 flex-shrink-0">
                                <item.icon className="w-4 h-4" />
                            </div>
                            <span className="flex-1 text-sm">{item.label}</span>
                            <ChevronRight
                                className={clsx(
                                    'w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity',
                                    isRTL && 'rotate-180'
                                )}
                            />
                        </NavLink>
                    ))}

                    {/* Design Projects Collapsible Section */}
                    {filteredDesignItems.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                            <button
                                onClick={() => setIsDesignOpen(!isDesignOpen)}
                                className={clsx(
                                    'nav-link w-full text-start flex items-center justify-between',
                                    isDesignOpen && 'bg-slate-100/80 text-brand-700 font-semibold dark:bg-white/10 dark:text-white'
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-brand-200 flex-shrink-0">
                                        <Building2 className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-semibold">{t('sections.design-projects')}</span>
                                </div>
                                <ChevronRight
                                    className={clsx(
                                        'w-3.5 h-3.5 transition-transform duration-200 text-slate-400 dark:text-brand-300',
                                        isDesignOpen ? 'rotate-90' : (isRTL ? 'rotate-180' : '')
                                    )}
                                />
                            </button>
                            
                            {isDesignOpen && (
                                <div className="ps-8 mt-1 space-y-1 border-l-2 border-slate-100 dark:border-white/10 ms-4 rtl:border-l-0 rtl:border-r-2 rtl:border-slate-100 rtl:dark:border-white/10 rtl:pe-8 rtl:ps-0 rtl:me-4">
                                    {filteredDesignItems.map(item => (
                                        <NavLink
                                            key={item.to}
                                            to={item.to}
                                            onClick={() => { if (window.innerWidth < 768) onClose(); }}
                                            className={({ isActive }) => clsx(
                                                'nav-link py-2 px-3 text-xs text-slate-600 hover:text-brand-700 hover:bg-slate-100/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5',
                                                isActive && 'nav-link-active !opacity-100 font-semibold'
                                            )}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <item.icon className="w-3.5 h-3.5 text-slate-400 dark:text-brand-300" />
                                                <span>{item.label}</span>
                                            </div>
                                        </NavLink>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Supervision Projects Collapsible Section */}
                    {user && canAccessSupervision && (
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                            <button
                                onClick={() => setIsSupervisionOpen(!isSupervisionOpen)}
                                className={clsx(
                                    'nav-link w-full text-start flex items-center justify-between',
                                    isSupervisionOpen && 'bg-slate-100/80 text-brand-700 font-semibold dark:bg-white/10 dark:text-white'
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-brand-200 flex-shrink-0">
                                        <Building className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-semibold">{t('sections.supervision-projects')}</span>
                                </div>
                                <ChevronRight
                                    className={clsx(
                                        'w-3.5 h-3.5 transition-transform duration-200 text-slate-400 dark:text-brand-300',
                                        isSupervisionOpen ? 'rotate-90' : (isRTL ? 'rotate-180' : '')
                                    )}
                                />
                            </button>
                            
                            {isSupervisionOpen && (
                                <div className="ps-8 mt-1 space-y-1 border-l-2 border-slate-100 dark:border-white/10 ms-4 rtl:border-l-0 rtl:border-r-2 rtl:border-slate-100 rtl:dark:border-white/10 rtl:pe-8 rtl:ps-0 rtl:me-4">
                                    {supervisionItems.map(item => (
                                        <NavLink
                                            key={item.to}
                                            to={item.to}
                                            onClick={() => { if (window.innerWidth < 768) onClose(); }}
                                            className={({ isActive }) => clsx(
                                                'nav-link py-2 px-3 text-xs text-slate-600 hover:text-brand-700 hover:bg-slate-100/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5',
                                                isActive && 'nav-link-active !opacity-100 font-semibold'
                                            )}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <item.icon className="w-3.5 h-3.5 text-slate-400 dark:text-brand-300" />
                                                <span>{item.label}</span>
                                            </div>
                                        </NavLink>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Render Non-Dashboard Root Links (Log Sheet, Admin Console) */}
                    {navItems.filter(i => i.to !== '/').map((item) => (
                        <React.Fragment key={item.to}>
                            {/* Separator before the admin-only item */}
                            {item.adminOnly && (
                                <div className="my-2 h-px bg-slate-100 dark:bg-white/10" />
                            )}
                            <NavLink
                                to={item.to}
                                onClick={() => { if (window.innerWidth < 768) onClose(); }}
                                className={({ isActive }) => clsx(
                                    'nav-link',
                                    isActive && 'nav-link-active'
                                )}
                            >
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-brand-200 flex-shrink-0">
                                    <item.icon className="w-4 h-4" />
                                </div>
                                <span className="flex-1 text-sm">{item.label}</span>
                                <ChevronRight
                                    className={clsx(
                                        'w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity',
                                        isRTL && 'rotate-180'
                                    )}
                                />
                            </NavLink>
                        </React.Fragment>
                    ))}
                
                {/* Correspondence Collapsible Section */}
                {user && ['admin', 'ceo', 'branch manager', 'secretary'].includes(user.role.toLowerCase()) && (
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                        <button
                            onClick={() => setIsCorrOpen(!isCorrOpen)}
                            className={clsx(
                                'nav-link w-full text-start flex items-center justify-between',
                                isCorrOpen && 'bg-slate-100/80 text-brand-700 font-semibold dark:bg-white/10 dark:text-white'
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-brand-200 flex-shrink-0">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-semibold">{isRTL ? 'المراسلات والمكاتبات' : 'Correspondence'}</span>
                            </div>
                            <ChevronRight
                                className={clsx(
                                    'w-3.5 h-3.5 transition-transform duration-200 text-slate-400 dark:text-brand-300',
                                    isCorrOpen ? 'rotate-90' : (isRTL ? 'rotate-180' : '')
                                )}
                            />
                        </button>
                        
                        {isCorrOpen && (
                            <div className="ps-8 mt-1 space-y-1 border-l-2 border-slate-100 dark:border-white/10 ms-4 rtl:border-l-0 rtl:border-r-2 rtl:border-slate-100 rtl:dark:border-white/10 rtl:pe-8 rtl:ps-0 rtl:me-4">
                                <NavLink
                                    to="/correspondence/incoming"
                                    onClick={() => { if (window.innerWidth < 768) onClose(); }}
                                    className={({ isActive }) => clsx(
                                        'nav-link py-2 px-3 text-xs text-slate-600 hover:text-brand-700 hover:bg-slate-100/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5',
                                        isActive && 'nav-link-active !opacity-100 font-semibold'
                                    )}
                                >
                                    <span>{isRTL ? 'البريد الوارد' : 'Incoming Mail'}</span>
                                </NavLink>
                                <NavLink
                                    to="/correspondence/outgoing"
                                    onClick={() => { if (window.innerWidth < 768) onClose(); }}
                                    className={({ isActive }) => clsx(
                                        'nav-link py-2 px-3 text-xs text-slate-600 hover:text-brand-700 hover:bg-slate-100/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5',
                                        isActive && 'nav-link-active !opacity-100 font-semibold'
                                    )}
                                >
                                    <span>{isRTL ? 'البريد الصادر' : 'Outgoing Mail'}</span>
                                </NavLink>
                            </div>
                        )}
                    </div>
                )}
                </nav>

                {/* ── User info + logout ── */}
                <div className="relative z-10 border-t border-slate-100 dark:border-white/10 p-3.5 space-y-2">
                    {/* User card */}
                    <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-sm">
                        <div className="w-8 h-8 bg-gold-500 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                            {user?.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-slate-800 dark:text-white text-xs font-semibold truncate">{user?.name}</p>
                            <p className="text-slate-500 dark:text-brand-300 text-[10px] capitalize truncate">
                                {user?.role.toLowerCase() === 'admin' 
                                    ? (isRTL ? 'مدير النظام' : 'Administrator') 
                                    : user?.role.toLowerCase() === 'ceo'
                                        ? (isRTL ? 'الرئيس التنفيذي' : 'Chief Executive')
                                        : user?.section}
                            </p>
                        </div>
                    </div>

                    {/* Logout */}
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 w-full px-3 py-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-brand-300 dark:hover:bg-red-500/20 dark:hover:text-red-300 rounded-xl transition-all duration-200 text-xs font-medium"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>{t('app.logout')}</span>
                    </button>
                </div>
            </aside>

            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
                    onClick={onClose}
                />
            )}
        </>
    );
};
