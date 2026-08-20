import React, { useState } from 'react';
import { useProjects, type ProjectStatus, type ProjectType } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { 
    FileText, Search, ChevronDown, Printer, RefreshCw 
} from 'lucide-react';

const statusColors: Record<string, { bg: string; dot: string; text: string }> = {
    'active':    { bg: 'bg-emerald-50 border-emerald-100', dot: 'bg-emerald-400', text: 'text-emerald-700' },
    'completed': { bg: 'bg-brand-50 border-brand-100',     dot: 'bg-brand-400',   text: 'text-brand-700' },
    'on-hold':   { bg: 'bg-amber-50 border-amber-100',     dot: 'bg-amber-400',   text: 'text-amber-700' },
};

export const LogSheet: React.FC = () => {
    const { projects, loading } = useProjects();
    const { user } = useAuth();
    const { t, i18n } = useTranslation();
    const isRTL = i18n.dir() === 'rtl';
    const roleLower = user?.role?.toLowerCase() || '';
    const isAdminOrCeo = roleLower === 'admin' || roleLower === 'ceo';

    // Filters state
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
    const [deptFilter, setDeptFilter] = useState<ProjectType | 'all'>('all');
    const [yearFilter, setYearFilter] = useState('all');

    // Filter projects based on user access and filter inputs
    const visibleProjects = projects.filter(project => {
        // Enforce department access restrictions for non-admin/non-ceo users
        if (!isAdminOrCeo) {
            const userDept = user?.section?.toLowerCase();
            if (project.type !== userDept) return false;
        }

        // Search match
        const q = searchTerm.toLowerCase();
        const matchSearch = !searchTerm || (
            project.name.toLowerCase().includes(q) ||
            project.client.toLowerCase().includes(q) ||
            (project.refNumber?.toLowerCase().includes(q))
        );

        // Status match
        const matchStatus = statusFilter === 'all' || project.status === statusFilter;

        // Department match (only relevant for admins)
        const matchDept = deptFilter === 'all' || project.type === deptFilter;

        // Year match
        const matchYear = yearFilter === 'all' || project.year === yearFilter;

        return matchSearch && matchStatus && matchDept && matchYear;
    });

    // Extract dynamic years for filter dropdown
    const availableYears = [...new Set(projects.map(p => p.year))].sort((a, b) => parseInt(b) - parseInt(a));

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-5 h-0.5 bg-gold-400" />
                        <span className="text-xs uppercase tracking-widest text-gold-500 font-semibold">
                            Reports & Records
                        </span>
                    </div>
                    <h2
                        className="text-2xl font-bold text-brand-700"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                        Project Log Sheet
                    </h2>
                    <p className="text-slate-400 text-sm mt-0.5">
                        {visibleProjects.length} records found
                    </p>
                </div>

                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-brand-600 border border-brand-200 rounded-xl hover:bg-brand-50 transition-colors no-print shadow-sm"
                >
                    <Printer className="w-4 h-4" />
                    <span>Print Log Sheet</span>
                </button>
            </div>

            {/* ── Filters bar ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4 space-y-3 no-print">
                <div className="flex flex-col md:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 rtl:left-auto rtl:right-3" />
                        <input
                            type="text"
                            placeholder="Search by project name, client, ref number..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="input pl-10 rtl:pl-4 rtl:pr-10 h-10 text-sm"
                        />
                    </div>

                    {/* Department Filter (Only for Admins/CEOs) */}
                    {isAdminOrCeo && (
                        <div className="relative min-w-[160px]">
                            <select
                                value={deptFilter}
                                onChange={e => setDeptFilter(e.target.value as any)}
                                className="input h-10 pr-8 text-sm appearance-none cursor-pointer"
                            >
                                <option value="all">{isRTL ? 'جميع الأقسام' : 'All Departments'}</option>
                                <option value="architectural">{t('sections.architectural')}</option>
                                <option value="structural">{t('sections.structural')}</option>
                                <option value="surveying">{t('sections.surveying')}</option>
                                <option value="electrical">{t('sections.electrical')}</option>
                                <option value="mechanical">{t('sections.mechanical')}</option>
                                <option value="supervision-industrial">{t('sections.supervision-industrial')}</option>
                                <option value="supervision-client">{t('sections.supervision-client')}</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    )}

                    {/* Year Filter */}
                    <div className="relative min-w-[120px]">
                        <select
                            value={yearFilter}
                            onChange={e => setYearFilter(e.target.value)}
                            className="input h-10 pr-8 text-sm appearance-none cursor-pointer"
                        >
                            <option value="all">All Years</option>
                            {availableYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Status Filter */}
                    <div className="relative min-w-[130px]">
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as any)}
                            className="input h-10 pr-8 text-sm appearance-none cursor-pointer"
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="on-hold">On Hold</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* ── Table Sheet ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden print:border-0 print:shadow-none">
                {loading ? (
                    <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Loading records...</span>
                    </div>
                ) : visibleProjects.length === 0 ? (
                    <div className="text-center py-16 no-print">
                        <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm font-medium">No records matching the filters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto print:overflow-visible">
                        {/* Printable layout header (only visible during print) */}
                        <div className="hidden print:block text-center py-6 border-b border-slate-200 mb-6">
                            <h1 className="text-2xl font-bold text-brand-700 uppercase" style={{ fontFamily: "'Playfair Display', serif" }}>
                                EngiNexa
                            </h1>
                            <p className="text-slate-500 text-sm mt-1">Project Log Sheet — {isAdminOrCeo ? 'All Departments' : `${user?.section} Department`}</p>
                            <p className="text-xs text-slate-400 mt-0.5">Date generated: {new Date().toLocaleDateString()}</p>
                        </div>

                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-surface border-b border-slate-100 print:bg-slate-50 print:border-b-2 print:border-slate-300">
                                    <th className="text-left rtl:text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider print:px-3 print:py-2">
                                        Reference Number
                                    </th>
                                    <th className="text-left rtl:text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider print:px-3 print:py-2">
                                        Project Name
                                    </th>
                                    <th className="text-left rtl:text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider print:px-3 print:py-2">
                                        Client Name
                                    </th>
                                    {isAdminOrCeo && (
                                        <th className="text-left rtl:text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider print:px-3 print:py-2">
                                            Department
                                        </th>
                                    )}
                                    <th className="text-left rtl:text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider print:px-3 print:py-2">
                                        Year
                                    </th>
                                    <th className="text-left rtl:text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider print:px-3 print:py-2">
                                        Progress
                                    </th>
                                    <th className="text-left rtl:text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider print:px-3 print:py-2">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 print:divide-slate-200">
                                {visibleProjects.map(p => {
                                    const sc = statusColors[p.status || 'active'] || statusColors['active'];
                                    return (
                                        <tr key={p.id} className="hover:bg-surface/30 transition-colors print:hover:bg-transparent">
                                            <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-semibold text-brand-700 print:px-3 print:py-2">
                                                {p.refNumber || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-slate-800 print:px-3 print:py-2">
                                                {p.name}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 print:px-3 print:py-2">
                                                {p.client}
                                            </td>
                                            {isAdminOrCeo && (
                                                <td className="px-6 py-4 whitespace-nowrap print:px-3 print:py-2 text-slate-500 text-xs">
                                                    {t(`sections.${p.type}`)}
                                                </td>
                                            )}
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-500 print:px-3 print:py-2">
                                                {p.year}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-semibold text-brand-600 print:px-3 print:py-2">
                                                {p.progress || 0}%
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap print:px-3 print:py-2">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} print:border-0 print:p-0`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} print:hidden`} />
                                                    {(p.status || 'active').replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
