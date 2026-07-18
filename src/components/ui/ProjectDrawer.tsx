import React, { useEffect } from 'react';
import { X, MapPin, Calendar, Phone, User, Cloud, ExternalLink, Tag, Building2, FileText } from 'lucide-react';
import type { Project } from '../../contexts/ProjectContext';
import { useTranslation } from 'react-i18next';
import { getProgressColorClass, getBackendUrl } from '../../pages/ProjectsPage';

interface ProjectDrawerProps {
    project: Project | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit: (project: Project) => void;
}

const statusConfig = {
    'active':    { label: 'Active',     className: 'badge-active' },
    'completed': { label: 'Completed',  className: 'badge-completed' },
    'on-hold':   { label: 'On Hold',    className: 'badge-on-hold' },
};

const typeColors: Record<string, string> = {
    architectural: 'bg-blue-500',
    structural:    'bg-emerald-500',
    surveying:     'bg-amber-500',
    electrical:    'bg-yellow-500',
    mechanical:    'bg-orange-500',
    'supervision-industrial': 'bg-indigo-500',
    'supervision-client':     'bg-purple-500',
};

const renderFilesList = (value: string | undefined, defaultLabel: string, bgClass: string, IconComponent: any) => {
    if (!value) return null;
    let filesList: { name: string; url: string }[] = [];
    let isJson = false;
    if (value.startsWith('[') && value.endsWith(']')) {
        try {
            filesList = JSON.parse(value);
            isJson = true;
        } catch (e) {
            // Treat as single string link
        }
    }
    
    if (!isJson) {
        return (
            <a
                href={getBackendUrl(value)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-brand-600 hover:text-brand-800 hover:underline inline-flex items-center gap-1"
            >
                <span>{defaultLabel}</span>
                <ExternalLink className="w-3.5 h-3.5" />
            </a>
        );
    }

    return (
        <div className="flex flex-col gap-2 mt-2">
            {filesList.map((file: any, idx: number) => (
                <a
                    key={idx}
                    href={getBackendUrl(file.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-brand-600 hover:text-brand-800 hover:underline inline-flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-gold-300 transition-all dark:bg-brand-950/20 dark:border-brand-800"
                >
                    <IconComponent className="w-4 h-4 text-gold-500 flex-shrink-0" />
                    <span className="truncate max-w-[200px]">{file.name}</span>
                    <ExternalLink className="w-3 h-3 opacity-70 flex-shrink-0" />
                </a>
            ))}
        </div>
    );
};

export const ProjectDrawer: React.FC<ProjectDrawerProps> = ({ project, isOpen, onClose, onEdit }) => {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.dir() === 'rtl';

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    // Lock body scroll when open
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen || !project) return null;

    const status = statusConfig[project.status] || statusConfig['active'];
    const typeColor = typeColors[project.type] || 'bg-slate-500';

    const DetailRow: React.FC<{ icon: React.ElementType; label: string; value: string | undefined }> = ({ icon: Icon, label, value }) => {
        if (!value) return null;
        return (
            <div className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-brand-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-brand-700 break-words">{value}</p>
                </div>
            </div>
        );
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`fixed top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-drawer flex flex-col animate-drawer-in
                    ${isRTL ? 'left-0 border-r border-slate-100' : 'right-0 border-l border-slate-100'}`}
            >
                {/* Header */}
                <div className="relative bg-brand-600 p-6 text-white overflow-hidden flex-shrink-0">
                    <div className="mashrabiya-overlay absolute inset-0" />
                    <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-10 h-10 ${typeColor} rounded-xl flex items-center justify-center shadow-lg`}>
                                <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-brand-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-1 leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                            {project.name}
                        </h2>
                        {project.refNumber && (
                            <p className="text-xs font-mono text-gold-300 font-semibold tracking-wider mb-2">
                                {project.refNumber}
                            </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                            <span className={`${status.className}`}>
                                {status.label}
                            </span>
                            <span className="badge bg-white/20 text-white text-xs">
                                {t(`sections.${project.type}`)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Gold accent */}
                <div className="h-1 bg-gradient-to-r from-gold-400 to-gold-600 flex-shrink-0" />

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-1">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                        Project Details
                    </h3>

                    <DetailRow icon={User}     label="Client"   value={project.client} />
                    <DetailRow icon={Phone}    label="Phone"    value={project.clientPhone} />
                    <DetailRow icon={MapPin}   label="Location" value={project.location} />
                    <DetailRow icon={Calendar} label="Year"     value={project.year} />
                    {project.refNumber && <DetailRow icon={Tag}      label="Reference Number" value={project.refNumber} />}
                    <DetailRow icon={Tag}      label="Section"  value={t(`sections.${project.type}`)} />

                    {project.monthlyReportLink && (
                        <div className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
                            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <FileText className="w-4 h-4 text-brand-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5">Monthly Report</p>
                                {renderFilesList(project.monthlyReportLink, "Download Report", "bg-emerald-600", FileText)}
                            </div>
                        </div>
                    )}

                    {/* Progress Bar */}
                    <div className="py-3.5 border-b border-slate-50">
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            <span>Project Progress</span>
                            <span className="text-brand-700 font-bold font-mono">{project.progress || 0}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                                className={`${getProgressColorClass(project.progress || 0)} h-full rounded-full transition-all duration-500`}
                                style={{ width: `${project.progress || 0}%` }}
                            />
                        </div>
                    </div>

                    {project.createdAt && (
                        <div className="flex items-start gap-3 py-3 border-b border-slate-50">
                            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Calendar className="w-4 h-4 text-brand-500" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5">Added</p>
                                <p className="text-sm font-semibold text-brand-700">
                                    {new Date(project.createdAt).toLocaleDateString('en-US', {
                                        day: 'numeric', month: 'long', year: 'numeric'
                                    })}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                <div className="border-t border-slate-100 p-4 flex gap-3 flex-shrink-0 bg-surface">
                    {project.oneDriveLink && (
                        <a
                            href="https://1drv.ms/f/c/0a257d75be9315f7/IgB95m23bO8eSrIzf3_zEylXAZ-aggtJ7epk9VViAtFJ9fM?e=Rv2K7x"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-600 text-white rounded-xl font-semibold text-sm hover:bg-brand-700 transition-colors"
                        >
                            <Cloud className="w-4 h-4" />
                            View Files
                            <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                    )}
                    <button
                        onClick={() => { onEdit(project); onClose(); }}
                        className={`${project.oneDriveLink ? '' : 'flex-1'} flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-200 text-brand-700 rounded-xl font-semibold text-sm hover:bg-brand-50 hover:border-brand-200 transition-colors`}
                    >
                        Edit Project
                    </button>
                </div>
            </div>
        </>
    );
};
