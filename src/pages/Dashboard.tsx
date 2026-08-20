import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Building2, Ruler, Map, Zap, Building,
    Search, Phone, User, Calendar, MapPin,
    Clock, ArrowRight, FolderOpen, Factory, Briefcase,
    Cloud, FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProjects, type Project } from '../contexts/ProjectContext';
import { StatCard } from '../components/ui/StatCard';
import { getProgressColorClass, renderFileLinks } from './ProjectsPage';

interface DashboardContext {
    openSupport: () => void;
}

const sectionConfig = [
    {
        id: 'arch',
        title_key: 'sections.architectural',
        icon: Building2,
        color: 'bg-sky-600',
        link: '/architectural',
        sectionId: 'architectural',
        gradient: 'from-sky-600 to-sky-800',
        category: 'design',
    },
    {
        id: 'struct',
        title_key: 'sections.structural',
        icon: Ruler,
        color: 'bg-emerald-600',
        link: '/structural',
        sectionId: 'structural',
        gradient: 'from-emerald-600 to-emerald-800',
        category: 'design',
    },
    {
        id: 'survey',
        title_key: 'sections.surveying',
        icon: Map,
        color: 'bg-amber-600',
        link: '/surveying',
        sectionId: 'surveying',
        gradient: 'from-amber-600 to-amber-800',
        category: 'design',
    },
    {
        id: 'electrical',
        title_key: 'sections.electrical',
        icon: Zap,
        color: 'bg-yellow-600',
        link: '/electrical',
        sectionId: 'electrical',
        gradient: 'from-yellow-600 to-yellow-800',
        category: 'design',
    },
    {
        id: 'mechanical',
        title_key: 'sections.mechanical',
        icon: Building,
        color: 'bg-orange-600',
        link: '/mechanical',
        sectionId: 'mechanical',
        gradient: 'from-orange-600 to-orange-800',
        category: 'design',
    },
    {
        id: 'supervision-industrial',
        title_key: 'sections.supervision-industrial',
        icon: Factory,
        color: 'bg-indigo-600',
        link: '/supervision/industrial',
        sectionId: 'supervision-industrial',
        gradient: 'from-indigo-600 to-indigo-800',
        category: 'supervision',
    },
    {
        id: 'supervision-client',
        title_key: 'sections.supervision-client',
        icon: Briefcase,
        color: 'bg-purple-600',
        link: '/supervision/client',
        sectionId: 'supervision-client',
        gradient: 'from-purple-600 to-purple-800',
        category: 'supervision',
    },
];

const statusColors: Record<string, string> = {
    'active':    'bg-emerald-100 text-emerald-700',
    'completed': 'bg-brand-100 text-brand-700',
    'on-hold':   'bg-amber-100 text-amber-700',
};

export const Dashboard = () => {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.dir() === 'rtl';
    const { openSupport } = useOutletContext<DashboardContext>();
    const { projects, getProjectsByType, getRecentProjects } = useProjects();
    const [searchQuery, setSearchQuery] = useState('');
    const { user } = useAuth();
    const roleLower = user?.role?.toLowerCase() || '';
    const isAdminCeoOrManager = roleLower === 'admin' || roleLower === 'ceo' || roleLower === 'branch manager';
    const showAllSections = ['admin', 'ceo', 'branch manager', 'secretary'].includes(roleLower);

    const sections = sectionConfig.filter(section => {
        if (!user) return false;
        if (showAllSections) return true;
        return section.sectionId === user.section?.toLowerCase();
    });

    const designSections = sections.filter(s => s.category === 'design');
    const supervisionSections = sections.filter(s => s.category === 'supervision');

    const filteredProjects = projects.filter(project => {
        if (!searchQuery) return false;
        const query = searchQuery.toLowerCase();
        return (
            project.name.toLowerCase().includes(query) ||
            project.client.toLowerCase().includes(query) ||
            (project.clientPhone?.includes(query)) ||
            project.location.toLowerCase().includes(query) ||
            (project.refNumber?.toLowerCase().includes(query))
        );
    });

    // Stats
    const totalProjects = projects.length;
    const uniqueClients = new Set(projects.map(p => p.client.toLowerCase())).size;
    const years = projects.map(p => parseInt(p.year)).filter(Boolean);
    const yearSpan = years.length > 0 ? (Math.max(...years) - Math.min(...years) + 1) : 0;

    const recentProjects = isAdminCeoOrManager ? getRecentProjects(5) : [];

    return (
        <div className="space-y-8">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-6 h-0.5 bg-gold-400" />
                        <span className="text-xs uppercase tracking-widest text-gold-500 font-semibold">
                            {t('app.dashboard')}
                        </span>
                    </div>
                    <h2
                        className="text-3xl font-bold text-brand-700 leading-tight"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                        {t('app.welcome_message')}
                    </h2>
                </div>

                {/* Search */}
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 rtl:left-auto rtl:right-4" />
                    <input
                        type="text"
                        placeholder={t('actions.search')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input pl-11 rtl:pl-4 rtl:pr-11 shadow-sm"
                    />
                </div>
            </div>

            {searchQuery ? (
                /* ── Search Results ── */
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-brand-700" style={{ fontFamily: "'Playfair Display', serif" }}>
                            Search Results
                        </h3>
                        <span className="badge bg-brand-50 text-brand-600">
                            {filteredProjects.length} found
                        </span>
                    </div>

                    {filteredProjects.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredProjects.map((project: Project) => (
                                <div
                                    key={project.id}
                                    className="card p-5 hover:shadow-card-lg transition-all duration-300 hover:-translate-y-0.5"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
                                            <Building2 className="w-4 h-4" />
                                        </div>
                                        <div className="flex gap-2">
                                            <span className={`badge ${statusColors[project.status] || 'bg-slate-100 text-slate-600'} text-xs`}>
                                                {project.status || 'active'}
                                            </span>
                                            <span className="badge badge-section">
                                                {t(`sections.${project.type}`)}
                                            </span>
                                        </div>
                                    </div>
                                    {project.refNumber && (
                                        <div className="mb-1.5">
                                            <span className="text-[9px] font-mono font-semibold tracking-wider text-gold-600 bg-gold-50 border border-gold-100 px-1.5 py-0.5 rounded uppercase">
                                                {project.refNumber}
                                            </span>
                                        </div>
                                    )}
                                    <h3 className="text-base font-bold text-brand-700 mb-3 leading-tight line-clamp-2">
                                        {project.name}
                                    </h3>
                                    <div className="space-y-2 text-xs text-slate-500">
                                        <div className="flex items-center gap-2">
                                            <User className="w-3.5 h-3.5 text-slate-400" />
                                            <span>{project.client}</span>
                                        </div>
                                        {project.clientPhone && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                <span>{project.clientPhone}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                            <span>{project.location}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            <span>{project.year}</span>
                                        </div>
                                    </div>
                                    
                                    {/* Progress bar */}
                                    <div className="mt-4 space-y-1.5">
                                        <div className="flex justify-between text-xs font-semibold text-slate-500">
                                            <span>Progress</span>
                                            <span className="text-brand-600 font-mono">{project.progress || 0}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className={`${getProgressColorClass(project.progress || 0)} h-full rounded-full transition-all duration-500 ease-out`}
                                                style={{ width: `${project.progress || 0}%` }}
                                            />
                                        </div>
                                    </div>
                                    {(project.oneDriveLink || project.monthlyReportLink) && (
                                        <div className="mt-4 flex flex-col gap-1.5">
                                            {renderFileLinks(project.oneDriveLink, "View Files", "bg-brand-600", Cloud)}
                                            {renderFileLinks(project.monthlyReportLink, "Monthly Report", "bg-emerald-600", FileText)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                            <Search className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-400 text-sm">No projects found for "<strong>{searchQuery}</strong>"</p>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* ── Stat Cards ── */}
                    {isAdminCeoOrManager && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <StatCard
                                value={totalProjects}
                                label="Total Projects"
                                icon={FolderOpen}
                                color="bg-brand-600"
                                delay={0}
                            />
                            <StatCard
                                value={uniqueClients}
                                label="Unique Clients"
                                icon={User}
                                color="bg-gold-500"
                                delay={100}
                            />
                            <StatCard
                                value={yearSpan}
                                label="Years of Archive"
                                icon={Calendar}
                                color="bg-emerald-600"
                                delay={200}
                            />
                        </div>
                    )}

                    {/* ── Section Cards ── */}
                    {designSections.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-brand-700 uppercase tracking-widest flex items-center gap-2" style={{ fontFamily: "'Syne', sans-serif" }}>
                                <FolderOpen className="w-4 h-4 text-gold-500" />
                                {t('sections.design-projects')}
                            </h3>
                            <div className="gold-rule mb-6" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                                {designSections.map((section, i) => {
                                    const sectionProjects = getProjectsByType(section.sectionId as any);
                                    const totalCount = sectionProjects.length;
                                    const activeCount = sectionProjects.filter(p => p.status === 'active').length;
                                    const completedCount = sectionProjects.filter(p => p.status === 'completed').length;
                                    const onHoldCount = sectionProjects.filter(p => p.status === 'on-hold').length;

                                    return (
                                        <Link
                                            key={section.id}
                                            to={section.link}
                                            className={`group relative overflow-hidden rounded-2xl bg-brand-600 text-white p-5 shadow-card
                                                        hover:shadow-card-lg hover:-translate-y-1 transition-all duration-300
                                                        stagger-${Math.min(i + 1, 5)} animate-count-up`}
                                        >
                                            {/* Texture */}
                                            <div className="mashrabiya-overlay absolute inset-0" />
                                            {/* Gradient overlay */}
                                            <div className={`absolute inset-0 bg-gradient-to-br ${section.gradient} opacity-80`} />

                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`w-10 h-10 ${section.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                                        <section.icon className="w-5 h-5 text-white" />
                                                    </div>
                                                    <p className="text-3xl font-bold text-white font-mono leading-none">
                                                        {totalCount}
                                                    </p>
                                                </div>

                                                <p className="text-sm font-bold text-white/90">
                                                    {t(section.title_key)}
                                                </p>

                                                {/* Project Status Detail Grid */}
                                                <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-3 text-center gap-1">
                                                    <div>
                                                        <p className="text-xs font-bold text-white font-mono">{activeCount}</p>
                                                        <p className="text-[9px] text-white/60 uppercase tracking-wider">{isRTL ? 'نشط' : 'Active'}</p>
                                                    </div>
                                                    <div className="border-x border-white/10">
                                                        <p className="text-xs font-bold text-white font-mono">{completedCount}</p>
                                                        <p className="text-[9px] text-white/60 uppercase tracking-wider">{isRTL ? 'مكتمل' : 'Done'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-white font-mono">{onHoldCount}</p>
                                                        <p className="text-[9px] text-white/60 uppercase tracking-wider">{isRTL ? 'معلق' : 'Hold'}</p>
                                                    </div>
                                                </div>

                                                <div className="mt-3 flex items-center gap-1 text-[10px] text-white/50 group-hover:text-white/80 transition-colors">
                                                    <span>{t('actions.view')}</span>
                                                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Supervision Projects Section ── */}
                    {supervisionSections.length > 0 && (
                        <div className="space-y-4 pt-8">
                            <h3 className="text-sm font-bold text-brand-700 uppercase tracking-widest flex items-center gap-2" style={{ fontFamily: "'Syne', sans-serif" }}>
                                <Building className="w-4 h-4 text-gold-500" />
                                {t('sections.supervision-projects')}
                            </h3>
                            <div className="gold-rule mb-6" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
                                {supervisionSections.map((section, i) => {
                                    const sectionProjects = getProjectsByType(section.sectionId as any);
                                    const totalCount = sectionProjects.length;
                                    const activeCount = sectionProjects.filter(p => p.status === 'active').length;
                                    const completedCount = sectionProjects.filter(p => p.status === 'completed').length;
                                    const onHoldCount = sectionProjects.filter(p => p.status === 'on-hold').length;

                                    return (
                                        <Link
                                            key={section.id}
                                            to={section.link}
                                            className={`group relative overflow-hidden rounded-2xl bg-brand-600 text-white p-5 shadow-card
                                                        hover:shadow-card-lg hover:-translate-y-1 transition-all duration-300
                                                        stagger-${Math.min(i + 1, 5)} animate-count-up`}
                                        >
                                            {/* Texture */}
                                            <div className="mashrabiya-overlay absolute inset-0" />
                                            {/* Gradient overlay */}
                                            <div className={`absolute inset-0 bg-gradient-to-br ${section.gradient} opacity-80`} />

                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`w-10 h-10 ${section.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                                        <section.icon className="w-5 h-5 text-white" />
                                                    </div>
                                                    <p className="text-3xl font-bold text-white font-mono leading-none">
                                                        {totalCount}
                                                    </p>
                                                </div>

                                                <p className="text-sm font-bold text-white/90">
                                                    {t(section.title_key)}
                                                </p>

                                                {/* Project Status Detail Grid */}
                                                <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-3 text-center gap-1">
                                                    <div>
                                                        <p className="text-xs font-bold text-white font-mono">{activeCount}</p>
                                                        <p className="text-[9px] text-white/60 uppercase tracking-wider">{isRTL ? 'نشط' : 'Active'}</p>
                                                    </div>
                                                    <div className="border-x border-white/10">
                                                        <p className="text-xs font-bold text-white font-mono">{completedCount}</p>
                                                        <p className="text-[9px] text-white/60 uppercase tracking-wider">{isRTL ? 'مكتمل' : 'Done'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-white font-mono">{onHoldCount}</p>
                                                        <p className="text-[9px] text-white/60 uppercase tracking-wider">{isRTL ? 'معلق' : 'Hold'}</p>
                                                    </div>
                                                </div>

                                                <div className="mt-3 flex items-center gap-1 text-[10px] text-white/50 group-hover:text-white/80 transition-colors">
                                                    <span>{t('actions.view')}</span>
                                                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Admin: Recent Activity Feed ── */}
                    {isAdminCeoOrManager && recentProjects.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gold-500" />
                                    <h3 className="font-bold text-brand-700 text-sm uppercase tracking-wider">
                                        Recent Activity
                                    </h3>
                                </div>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {recentProjects.map((project: Project) => (
                                    <div key={project.id} className="px-6 py-4 flex items-center gap-4 hover:bg-surface/50 transition-colors">
                                        <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                                            <Building2 className="w-4 h-4 text-brand-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="text-sm font-semibold text-brand-700 truncate">{project.name}</p>
                                                {project.refNumber && (
                                                    <span className="text-[9px] font-mono font-medium text-gold-600 bg-gold-50 border border-gold-100 px-1 rounded uppercase flex-shrink-0">
                                                        {project.refNumber}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 truncate">{project.client} · {project.location}</p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="badge badge-section text-xs">
                                                {t(`sections.${project.type}`)}
                                            </span>
                                            <span className="text-xs text-slate-300">
                                                {new Date(project.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Support Banner ── */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-50 via-white to-gold-50/60 dark:from-brand-800 dark:via-brand-900 dark:to-brand-950 p-6 md:p-8 border border-gold-200/80 dark:border-brand-700 shadow-sm text-brand-900 dark:text-white">
                        <div className="mashrabiya-overlay absolute inset-0 opacity-20 dark:opacity-10 pointer-events-none" />
                        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3
                                    className="text-xl font-bold mb-1 text-brand-900 dark:text-white"
                                    style={{ fontFamily: isRTL ? "'Cairo', sans-serif" : "'Playfair Display', serif" }}
                                >
                                    {t('app.need_help')}
                                </h3>
                                <p className="text-slate-600 dark:text-brand-200 text-sm max-w-md">{t('app.need_help_desc')}</p>
                            </div>
                            <button
                                onClick={openSupport}
                                className="px-6 py-2.5 bg-gold-500 text-white rounded-xl font-semibold text-sm hover:bg-gold-600 transition-all shadow-md active:scale-95 flex-shrink-0"
                            >
                                {t('app.contact_support')}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
