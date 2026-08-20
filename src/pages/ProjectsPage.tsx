import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, FileText, Trash2, Edit2, Cloud, ExternalLink, Printer, ChevronDown } from 'lucide-react';
import { useProjects } from '../contexts/ProjectContext';
import { useToast } from '../contexts/ToastContext';
import type { ProjectType, Project, ProjectStatus } from '../contexts/ProjectContext';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ProjectDrawer } from '../components/ui/ProjectDrawer';
import { FileUploadZone } from '../components/ui/FileUploadZone';

interface ProjectsPageProps {
    title: string;
    type: ProjectType;
}

const STATUS_TABS: { key: ProjectStatus | 'all'; label: string }[] = [
    { key: 'all',       label: 'All' },
    { key: 'active',    label: 'Active' },
    { key: 'completed', label: 'Completed' },
    { key: 'on-hold',   label: 'On Hold' },
];

const statusColors: Record<string, { bg: string; dot: string; text: string }> = {
    'active':    { bg: 'bg-emerald-50 border-emerald-100', dot: 'bg-emerald-400', text: 'text-emerald-700' },
    'completed': { bg: 'bg-brand-50 border-brand-100',     dot: 'bg-brand-400',   text: 'text-brand-700' },
    'on-hold':   { bg: 'bg-amber-50 border-amber-100',     dot: 'bg-amber-400',   text: 'text-amber-700' },
};

const NEXT_REF_URL = import.meta.env.PROD
    ? '/api/projects/next-ref'
    : `http://${window.location.hostname}:3001/api/projects/next-ref`;

const defaultForm = {
    name: '',
    client: '',
    location: '',
    year: new Date().getFullYear().toString(),
    oneDriveLink: '',
    clientPhone: '',
    status: 'active' as ProjectStatus,
    refNumber: '',
    progress: 0,
    monthlyReportLink: '',
};

export const getProgressColorClass = (progress: number): string => {
    if (progress <= 0) return 'bg-slate-200';
    if (progress >= 1 && progress <= 15) return 'bg-red-500';
    if (progress > 15 && progress < 50) return 'bg-amber-400';
    if (progress >= 50 && progress < 70) return 'bg-emerald-400';
    return 'bg-emerald-600';
};

export const getBackendUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    
    const downloadEndpoint = `/api/projects/download-file?path=${encodeURIComponent(url)}`;
    
    if (import.meta.env.PROD) {
        return downloadEndpoint;
    }
    const hostname = window.location.hostname;
    return `http://${hostname}:3001${downloadEndpoint}`;
};

export const renderFileLinks = (value: string | undefined, defaultLabel: string, bgClass: string, IconComponent: any) => {
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
    
    // If it's the OneDrive "View Files" button, ALWAYS render the primary OneDrive folder link first
    if (defaultLabel === "View Files") {
        const onedriveUrl = "https://1drv.ms/f/c/0a257d75be9315f7/IgB95m23bO8eSrIzf3_zEylXAZ-aggtJ7epk9VViAtFJ9fM?e=Rv2K7x";
        return (
            <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                <a
                    href={onedriveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={`flex items-center justify-center gap-2 py-2 ${bgClass} text-white rounded-xl text-xs font-semibold hover:opacity-90 transition-colors no-print`}
                >
                    <IconComponent className="w-3.5 h-3.5" />
                    {defaultLabel}
                    <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
                
                {/* Render uploaded backup files below it if they exist */}
                {isJson && filesList.map((file, idx) => (
                    <a
                        key={idx}
                        href={getBackendUrl(file.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-between px-3 py-1.5 border border-slate-100 hover:border-gold-300 text-brand-700 bg-slate-50/50 dark:bg-brand-950/20 dark:border-brand-800 rounded-xl text-[10px] font-semibold hover:opacity-90 transition-colors no-print"
                    >
                        <span className="flex items-center gap-1.5 truncate max-w-[85%] font-medium">
                            <FileText className="w-3 h-3 flex-shrink-0 text-slate-400" />
                            <span className="truncate">{file.name}</span>
                        </span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-75 flex-shrink-0" />
                    </a>
                ))}
            </div>
        );
    }
    
    // For other links (like reports), render download chip directly
    if (!isJson) {
        return (
            <a
                href={getBackendUrl(value)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`flex items-center justify-center gap-2 py-2 ${bgClass} text-white rounded-xl text-xs font-semibold hover:opacity-90 transition-colors no-print`}
            >
                <IconComponent className="w-3.5 h-3.5" />
                {defaultLabel}
                <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
        );
    }

    return (
        <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
            {filesList.map((file, idx) => (
                <a
                    key={idx}
                    href={getBackendUrl(file.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={`flex items-center justify-between px-3 py-1.5 border border-slate-100 hover:border-gold-300 ${bgClass.replace('bg-', 'text-').replace('-600', '-700')} bg-slate-50/50 dark:bg-brand-950/20 dark:border-brand-800 rounded-xl text-xs font-semibold hover:opacity-90 transition-colors no-print`}
                >
                    <span className="flex items-center gap-1.5 truncate max-w-[85%]">
                        <IconComponent className="w-3.5 h-3.5 flex-shrink-0 text-gold-500" />
                        <span className="truncate">{file.name}</span>
                    </span>
                    <ExternalLink className="w-3 h-3 opacity-70 flex-shrink-0" />
                </a>
            ))}
        </div>
    );
};

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ title, type }) => {
    const { t } = useTranslation();
    const { getProjectsByType, deleteProject, addProject, updateProject } = useProjects();
    const { toast } = useToast();

    // Filters & sort
    const [searchTerm,    setSearchTerm]    = useState('');
    const [statusFilter,  setStatusFilter]  = useState<ProjectStatus | 'all'>('all');
    const [yearFilter,    setYearFilter]    = useState('all');
    const [sortBy,        setSortBy]        = useState<'date' | 'name' | 'year'>('date');

    // UI state
    const [isModalOpen,   setIsModalOpen]   = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [deletingId,    setDeletingId]    = useState<string | null>(null);
    const [drawerProject, setDrawerProject] = useState<Project | null>(null);
    const [isDrawerOpen,  setIsDrawerOpen]  = useState(false);

    // Form
    const [formData, setFormData] = useState(defaultForm);
    const [overrideRef, setOverrideRef] = useState(false);
    const [previewRef, setPreviewRef] = useState('');

    useEffect(() => {
        if (!isModalOpen) return;
        if (overrideRef) return;

        if (editingProject && editingProject.refNumber) {
            setPreviewRef(editingProject.refNumber);
            setFormData(prev => ({ ...prev, refNumber: editingProject.refNumber || '' }));
            return;
        }

        const controller = new AbortController();
        const fetchPreview = async () => {
            try {
                const query = new URLSearchParams({
                    client: formData.client,
                    year: formData.year,
                });
                if (editingProject) {
                    query.append('excludeId', editingProject.id);
                }
                const token = localStorage.getItem('token');
                const res = await fetch(`${NEXT_REF_URL}?${query.toString()}`, {
                    signal: controller.signal,
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    setPreviewRef(data.refNumber);
                    setFormData(prev => ({ ...prev, refNumber: data.refNumber }));
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error('Failed to fetch preview ref number', err);
                }
            }
        };

        const timeout = setTimeout(() => {
            fetchPreview();
        }, 300);

        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [formData.client, formData.year, overrideRef, isModalOpen, editingProject]);

    // ── Data ──
    const allTypeProjects = getProjectsByType(type);
    const allYears = [...new Set(allTypeProjects.map(p => p.year))].sort((a, b) => parseInt(b) - parseInt(a));

    const projects = allTypeProjects
        .filter(p => {
            const q = searchTerm.toLowerCase();
            const matchSearch = !searchTerm || (
                p.name.toLowerCase().includes(q) ||
                p.client.toLowerCase().includes(q) ||
                (p.clientPhone?.includes(q)) ||
                (p.refNumber?.toLowerCase().includes(q))
            );
            const matchStatus = statusFilter === 'all' || (p.status || 'active') === statusFilter;
            const matchYear   = yearFilter === 'all' || p.year === yearFilter;
            return matchSearch && matchStatus && matchYear;
        })
        .sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'year') return parseInt(b.year) - parseInt(a.year);
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

    // ── Handlers ──
    const handleOpenModal = (project?: Project) => {
        if (project) {
            setEditingProject(project);
            setFormData({
                name:        project.name,
                client:      project.client,
                location:    project.location,
                year:        project.year,
                oneDriveLink: project.oneDriveLink || '',
                clientPhone: project.clientPhone || '',
                status:      project.status || 'active',
                refNumber:   project.refNumber || '',
                progress:    project.progress !== undefined ? project.progress : 0,
                monthlyReportLink: project.monthlyReportLink || '',
            });
            setOverrideRef(false);
        } else {
            setEditingProject(null);
            setFormData(defaultForm);
            setOverrideRef(false);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { ...formData, type };

        if (editingProject) {
            const ok = await updateProject(editingProject.id, payload);
            if (ok) toast('success', 'Project updated', `"${formData.name}" has been saved.`);
            else    toast('error',   'Update failed',  'Could not save changes. Please try again.');
        } else {
            const created = await addProject(payload);
            if (created) toast('success', 'Project added', `"${formData.name}" was successfully created.`);
            else         toast('error',   'Add failed',    'Could not add the project. Please try again.');
        }
        setIsModalOpen(false);
    };

    const handleDeleteConfirm = async () => {
        if (!deletingId) return;
        const project = allTypeProjects.find(p => p.id === deletingId);
        const ok = await deleteProject(deletingId);
        if (ok) toast('success', 'Project deleted', `"${project?.name}" was removed.`);
        else    toast('error',   'Delete failed',   'Could not delete the project. Please try again.');
        setDeletingId(null);
    };

    const handlePrint = () => {
        window.print();
    };

    const openDrawer = (project: Project) => {
        setDrawerProject(project);
        setIsDrawerOpen(true);
    };

    // ── Render ──
    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-5 h-0.5 bg-gold-400" />
                        <span className="text-xs uppercase tracking-widest text-gold-500 font-semibold">
                            {t(`sections.${type}`)}
                        </span>
                    </div>
                    <h2
                        className="text-2xl font-bold text-brand-700"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                        {title}
                    </h2>
                    <p className="text-slate-400 text-sm mt-0.5">
                        {allTypeProjects.length} total · {projects.length} shown
                    </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-brand-600 border border-brand-200 rounded-xl hover:bg-brand-50 transition-colors no-print"
                        title="Print project list"
                    >
                        <Printer className="w-4 h-4" />
                        <span className="hidden sm:inline">Print</span>
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="btn-primary flex items-center gap-2 no-print"
                    >
                        <Plus className="w-4 h-4" />
                        <span>{t('actions.add_project')}</span>
                    </button>
                </div>
            </div>

            {/* ── Filters bar ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4 space-y-3 no-print">
                {/* Search + Sort */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 rtl:left-auto rtl:right-3" />
                        <input
                            type="text"
                            placeholder={t('actions.search')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-10 rtl:pl-4 rtl:pr-10 h-10 text-sm"
                        />
                    </div>

                    {/* Year filter */}
                    <div className="relative">
                        <select
                            value={yearFilter}
                            onChange={(e) => setYearFilter(e.target.value)}
                            className="input h-10 pr-8 rtl:pr-3.5 rtl:pl-8 text-sm appearance-none cursor-pointer min-w-[120px]"
                        >
                            <option value="all">All Years</option>
                            {allYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Sort */}
                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="input h-10 pr-8 rtl:pr-3.5 rtl:pl-8 text-sm appearance-none cursor-pointer min-w-[140px]"
                        >
                            <option value="date">Sort: Newest</option>
                            <option value="name">Sort: Name A–Z</option>
                            <option value="year">Sort: Year ↓</option>
                        </select>
                        <ChevronDown className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* Status tabs */}
                <div className="flex gap-1 flex-wrap">
                    {STATUS_TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setStatusFilter(tab.key)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                                statusFilter === tab.key
                                    ? 'bg-brand-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-brand-600'
                            }`}
                        >
                            {tab.label}
                            <span className={`ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] ${
                                statusFilter === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                            }`}>
                                {tab.key === 'all'
                                    ? allTypeProjects.length
                                    : allTypeProjects.filter(p => (p.status || 'active') === tab.key).length
                                }
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Grid ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {projects.length === 0 ? (
                    <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                        <FileText className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                        <p className="text-slate-400 text-sm font-medium">No projects found.</p>
                        <p className="text-slate-300 text-xs mt-1">Try adjusting your filters or add a new project.</p>
                    </div>
                ) : (
                    projects.map((project) => {
                        const sc = statusColors[project.status || 'active'] || statusColors['active'];
                        return (
                            <div
                                key={project.id}
                                className="card-hover p-5 flex flex-col group cursor-pointer"
                                onClick={() => openDrawer(project)}
                            >
                                {/* Card header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-lg">
                                        {project.name.charAt(0).toUpperCase()}
                                    </div>

                                    {/* Action buttons — only visible on hover */}
                                    <div
                                        className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity no-print"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            onClick={() => handleOpenModal(project)}
                                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => setDeletingId(project.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Name + client */}
                                {project.refNumber && (
                                    <div className="mb-1">
                                        <span className="text-[9px] font-mono font-semibold tracking-wider text-gold-600 bg-gold-50 border border-gold-100 px-1.5 py-0.5 rounded uppercase">
                                            {project.refNumber}
                                        </span>
                                    </div>
                                )}
                                <h3 className="text-base font-bold text-brand-700 mb-0.5 line-clamp-2 leading-tight">
                                    {project.name}
                                </h3>
                                <p className="text-xs text-slate-400 mb-4">{project.client}</p>

                                {/* Details */}
                                <div className="space-y-1.5 mb-4 text-xs text-slate-500">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Location</span>
                                        <span className="font-medium text-slate-700 text-right max-w-[55%] truncate">{project.location}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Year</span>
                                        <span className="font-medium text-slate-700">{project.year}</span>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="mb-4 space-y-1.5">
                                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                                        <span>Progress</span>
                                        <span className="text-brand-600 font-mono">{project.progress || 0}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                        <div
                                            className={`${getProgressColorClass(project.progress || 0)} h-full rounded-full transition-all duration-500 ease-out`}
                                            style={{ width: `${project.progress || 0}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Status badge */}
                                <div className="mt-auto">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                        {(project.status || 'active').replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                    </span>
                                    
                                    {/* File & Monthly Report links */}
                                    {(project.oneDriveLink || project.monthlyReportLink) && (
                                        <div className="pt-3 mt-3 border-t border-slate-50 flex flex-col gap-2">
                                            {renderFileLinks(project.oneDriveLink, "View Files", "bg-brand-600", Cloud)}
                                            {renderFileLinks(project.monthlyReportLink, "Monthly Report", "bg-emerald-600", FileText)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ── Add / Edit Modal ── */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
                >
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-card-lg overflow-hidden animate-fade-scale-in">
                        {/* Modal header */}
                        <div className="relative bg-brand-600 px-6 py-5 overflow-hidden">
                            <div className="mashrabiya-overlay absolute inset-0" />
                            <div className="relative z-10 flex justify-between items-center">
                                <h3
                                    className="text-lg font-bold text-white"
                                    style={{ fontFamily: "'Playfair Display', serif" }}
                                >
                                    {editingProject ? 'Edit Project' : t('actions.add_project')}
                                </h3>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-brand-200 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                        <div className="h-1 bg-gradient-to-r from-gold-400 to-gold-600" />

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Project name */}
                            <div>
                                <label className="block text-xs font-semibold text-brand-600 uppercase tracking-wider mb-1.5">
                                    Project Name *
                                </label>
                                <input
                                    required
                                    className="input"
                                    placeholder="Enter project name"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-brand-600 uppercase tracking-wider mb-1.5">
                                        Client *
                                    </label>
                                    <input
                                        required
                                        className="input"
                                        placeholder="Client name"
                                        value={formData.client}
                                        onChange={e => setFormData({ ...formData, client: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-brand-600 uppercase tracking-wider mb-1.5">
                                        {t('actions.client_phone')}
                                    </label>
                                    <input
                                        className="input"
                                        placeholder="05..."
                                        value={formData.clientPhone}
                                        onChange={e => setFormData({ ...formData, clientPhone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-brand-600 uppercase tracking-wider mb-1.5">
                                        Year *
                                    </label>
                                    <input
                                        required
                                        type="number"
                                        min="1990"
                                        max="2099"
                                        className="input"
                                        value={formData.year}
                                        onChange={e => setFormData({ ...formData, year: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-brand-600 uppercase tracking-wider mb-1.5">
                                        Status
                                    </label>
                                    <div className="relative">
                                        <select
                                            className="input appearance-none pr-8 cursor-pointer"
                                            value={formData.status}
                                            onChange={e => {
                                                const newStatus = e.target.value as ProjectStatus;
                                                setFormData(prev => {
                                                    const updates: any = { status: newStatus };
                                                    if (newStatus === 'completed') {
                                                        updates.progress = 100;
                                                    } else if (prev.progress === 100) {
                                                        updates.progress = 90;
                                                    }
                                                    return { ...prev, ...updates };
                                                });
                                            }}
                                        >
                                            <option value="active">Active</option>
                                            <option value="completed">Completed</option>
                                            <option value="on-hold">On Hold</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-semibold text-brand-600 uppercase tracking-wider">
                                        Project Reference Number
                                    </label>
                                    <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={overrideRef}
                                            onChange={(e) => {
                                                setOverrideRef(e.target.checked);
                                                if (!e.target.checked) {
                                                    setFormData(prev => ({ ...prev, refNumber: previewRef }));
                                                }
                                            }}
                                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-3.5 h-3.5"
                                        />
                                        <span>Override (for old projects)</span>
                                    </label>
                                </div>
                                <input
                                    type="text"
                                    disabled={!overrideRef}
                                    className={`input font-mono ${!overrideRef ? 'bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed' : ''}`}
                                    placeholder="e.g. MK-C001-026-001"
                                    value={formData.refNumber}
                                    onChange={e => setFormData({ ...formData, refNumber: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-brand-600 uppercase tracking-wider mb-1.5">
                                    Location *
                                </label>
                                <input
                                    required
                                    className="input"
                                    placeholder="City / Area"
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-xs font-semibold text-brand-600 uppercase tracking-wider">
                                        Project Progress
                                    </label>
                                    <span className="text-sm font-bold text-brand-600 font-mono">{formData.progress}%</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="5"
                                        className="w-full accent-brand-600 cursor-pointer h-2 bg-slate-100 rounded-lg appearance-none"
                                        value={formData.progress}
                                        onChange={e => {
                                            const newProgress = parseInt(e.target.value);
                                            setFormData(prev => {
                                                const updates: any = { progress: newProgress };
                                                if (newProgress === 100) {
                                                    updates.status = 'completed';
                                                } else if (prev.status === 'completed' && newProgress < 100) {
                                                    updates.status = 'active';
                                                }
                                                return { ...prev, ...updates };
                                            });
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <FileUploadZone
                                    label="Upload Files (OneDrive)"
                                    projectName={formData.name}
                                    type="files"
                                    value={formData.oneDriveLink}
                                    onChange={val => setFormData({ ...formData, oneDriveLink: val })}
                                />

                                {(type === 'supervision-industrial' || type === 'supervision-client') && (
                                    <FileUploadZone
                                        label="Upload Monthly Report (OneDrive)"
                                        projectName={formData.name}
                                        type="reports"
                                        value={formData.monthlyReportLink}
                                        onChange={val => setFormData({ ...formData, monthlyReportLink: val })}
                                    />
                                )}
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="btn-ghost border border-slate-200"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    {editingProject ? 'Save Changes' : 'Create Project'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Confirm Delete Dialog ── */}
            <ConfirmDialog
                isOpen={!!deletingId}
                title="Delete Project?"
                message="This will permanently remove the project and all its data. This action cannot be undone."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                variant="danger"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeletingId(null)}
            />

            {/* ── Project Detail Drawer ── */}
            <ProjectDrawer
                project={drawerProject}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onEdit={handleOpenModal}
            />
        </div>
    );
};
