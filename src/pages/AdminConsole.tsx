import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
    Building2, FolderTree, Users, Settings, History, Plus,
    Edit2, Trash2, Shield, ToggleLeft, ToggleRight, Search,
    Filter, RefreshCw, X, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface Branch {
    id: string;
    name_en: string;
    name_ar: string;
    theme_color: string;
    working_hours: string;
    createdAt: string;
}

interface Department {
    id: string;
    name_en: string;
    name_ar: string;
    branch_id: string;
    createdAt: string;
}

interface Employee {
    id: number;
    name: string;
    id_number: string;
    role: string;
    branch_id: string | null;
    department_id: string | null;
    reporting_line_id: number | null;
    mfa_enabled: number;
    mfa_pin: string;
    status: string;
    createdAt: string;
    branch_name_en: string | null;
    branch_name_ar: string | null;
    dept_name_en: string | null;
    dept_name_ar: string | null;
    reporting_line_name: string | null;
}

interface AuditLog {
    id: number;
    user_id: number | null;
    user_name: string;
    action: string;
    module: string;
    details: string;
    ip_address: string;
    user_agent: string;
    timestamp: string;
}

export const AdminConsole = () => {
    const { token, user: currentUser } = useAuth();
    const { toast } = useToast();
    const { i18n } = useTranslation();
    const isRTL = i18n.dir() === 'rtl';

    // Tabs state
    const [activeTab, setActiveTab] = useState<'users' | 'branches' | 'departments' | 'settings' | 'audit'>('users');

    // Data lists
    const [branches, setBranches] = useState<Branch[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

    // Load states
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Search and filters
    const [userSearch, setUserSearch] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState('all');
    const [branchFilter, setBranchFilter] = useState('all');

    const [auditSearchAction, setAuditSearchAction] = useState('');
    const [auditModuleFilter, setAuditModuleFilter] = useState('all');
    const auditLimit = 25;
    const auditOffset = 0;

    // Modals
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
    const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);

    // Editing records
    const [editingUser, setEditingUser] = useState<Employee | null>(null);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [editingDept, setEditingDept] = useState<Department | null>(null);

    // Form inputs
    const [userForm, setUserForm] = useState({
        name: '',
        id_number: '',
        role: 'Engineer',
        branch_id: '',
        department_id: '',
        reporting_line_id: '',
        mfa_enabled: false,
        mfa_pin: '123456',
        status: 'active'
    });

    const [branchForm, setBranchForm] = useState({
        id: '',
        name_en: '',
        name_ar: '',
        theme_color: '#0B3D4E',
        working_hours: '08:00-16:00'
    });

    const [deptForm, setDeptForm] = useState({
        id: '',
        name_en: '',
        name_ar: '',
        branch_id: ''
    });

    const [settingsForm, setSettingsForm] = useState({
        language_default: 'ar',
        working_hours: { start: '08:00', end: '16:00', weekend: [5, 6] },
        holidays: []
    });

    // ── Fetchers ─────────────────────────────────────────────────────────────

    const fetchBranches = useCallback(async () => {
        try {
            const res = await fetch('/api/hierarchy/branches', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setBranches(await res.json());
        } catch (e) {
            console.error('Fetch branches failed', e);
        }
    }, [token]);

    const fetchDepartments = useCallback(async () => {
        try {
            const res = await fetch('/api/hierarchy/departments', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setDepartments(await res.json());
        } catch (e) {
            console.error('Fetch departments failed', e);
        }
    }, [token]);

    const fetchEmployees = useCallback(async () => {
        try {
            const res = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setEmployees(await res.json());
        } catch (e) {
            console.error('Fetch employees failed', e);
        }
    }, [token]);

    const fetchAuditLogs = useCallback(async () => {
        try {
            let url = `/api/audit-logs?limit=${auditLimit}&offset=${auditOffset}`;
            if (auditSearchAction) url += `&action=${encodeURIComponent(auditSearchAction)}`;
            if (auditModuleFilter !== 'all') url += `&module=${encodeURIComponent(auditModuleFilter)}`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAuditLogs(data.logs);
            }
        } catch (e) {
            console.error('Fetch audit failed', e);
        }
    }, [token, auditLimit, auditOffset, auditSearchAction, auditModuleFilter]);

    const fetchSettings = useCallback(async () => {
        try {
            const res = await fetch('/api/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSettingsForm({
                    language_default: data.language_default || 'ar',
                    working_hours: data.working_hours || { start: '08:00', end: '16:00', weekend: [5, 6] },
                    holidays: data.holidays || []
                });
            }
        } catch (e) {
            console.error('Fetch settings failed', e);
        }
    }, [token]);

    const loadAllData = useCallback(async () => {
        setLoading(true);
        await Promise.all([
            fetchBranches(),
            fetchDepartments(),
            fetchEmployees(),
            fetchSettings(),
            fetchAuditLogs()
        ]);
        setLoading(false);
    }, [fetchBranches, fetchDepartments, fetchEmployees, fetchSettings, fetchAuditLogs]);

    useEffect(() => {
        if (token) {
            loadAllData();
        }
    }, [token, loadAllData]);

    useEffect(() => {
        if (token && activeTab === 'audit') {
            fetchAuditLogs();
        }
    }, [activeTab, auditLimit, auditOffset, fetchAuditLogs, token]);

    // ── CRUD Actions ─────────────────────────────────────────────────────────

    // User Form Submit
    const handleUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
            const method = editingUser ? 'PUT' : 'POST';

            const payload = {
                ...userForm,
                reporting_line_id: userForm.reporting_line_id ? parseInt(userForm.reporting_line_id) : null
            };

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'User submission failed');

            toast('success', editingUser ? (isRTL ? 'تم التعديل بنجاح' : 'Employee Updated') : (isRTL ? 'تمت الإضافة بنجاح' : 'Employee Created'), '');
            setIsUserModalOpen(false);
            setEditingUser(null);
            fetchEmployees();
            fetchAuditLogs();
        } catch (err: any) {
            toast('error', isRTL ? 'خطأ في العملية' : 'Action Failed', err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // User Delete
    const handleUserDelete = async (id: number, name: string) => {
        if (!window.confirm(isRTL ? `هل أنت متأكد من حذف الموظف: ${name}؟` : `Are you sure you want to delete employee: ${name}?`)) return;
        try {
            const res = await fetch(`/api/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete user');

            toast('success', isRTL ? 'تم حذف المستخدم بنجاح' : 'User Deleted successfully', '');
            fetchEmployees();
            fetchAuditLogs();
        } catch (err: any) {
            toast('error', isRTL ? 'خطأ في الحذف' : 'Deletion Failed', err.message);
        }
    };

    // Branch Form Submit
    const handleBranchSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const url = editingBranch ? `/api/hierarchy/branches/${editingBranch.id}` : '/api/hierarchy/branches';
            const method = editingBranch ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(branchForm)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Branch submission failed');

            toast('success', editingBranch ? (isRTL ? 'تم تحديث الفرع' : 'Branch Updated') : (isRTL ? 'تم إضافة الفرع' : 'Branch Created'), '');
            setIsBranchModalOpen(false);
            setEditingBranch(null);
            fetchBranches();
            fetchAuditLogs();
        } catch (err: any) {
            toast('error', isRTL ? 'خطأ في فرع' : 'Branch Action Failed', err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Branch Delete
    const handleBranchDelete = async (id: string, name: string) => {
        if (!window.confirm(isRTL ? `هل أنت متأكد من حذف فرع: ${name}؟ سيتم حذف الأقسام التابعة له.` : `Are you sure you want to delete branch: ${name}? All its departments will be deleted.`)) return;
        try {
            const res = await fetch(`/api/hierarchy/branches/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete branch');

            toast('success', isRTL ? 'تم الحذف بنجاح' : 'Branch deleted successfully', '');
            fetchBranches();
            fetchDepartments();
            fetchEmployees();
            fetchAuditLogs();
        } catch (err: any) {
            toast('error', isRTL ? 'خطأ في حذف الفرع' : 'Branch Deletion Failed', err.message);
        }
    };

    // Department Form Submit
    const handleDeptSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const url = editingDept ? `/api/hierarchy/departments/${editingDept.id}` : '/api/hierarchy/departments';
            const method = editingDept ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(deptForm)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Department submission failed');

            toast('success', editingDept ? (isRTL ? 'تم تعديل القسم' : 'Department Updated') : (isRTL ? 'تم إضافة القسم' : 'Department Created'), '');
            setIsDeptModalOpen(false);
            setEditingDept(null);
            fetchDepartments();
            fetchAuditLogs();
        } catch (err: any) {
            toast('error', isRTL ? 'خطأ في عملية القسم' : 'Department Action Failed', err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Department Delete
    const handleDeptDelete = async (id: string, name: string) => {
        if (!window.confirm(isRTL ? `هل تريد حذف قسم: ${name}؟` : `Are you sure you want to delete department: ${name}?`)) return;
        try {
            const res = await fetch(`/api/hierarchy/departments/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete department');

            toast('success', isRTL ? 'تم حذف القسم' : 'Department Deleted successfully', '');
            fetchDepartments();
            fetchEmployees();
            fetchAuditLogs();
        } catch (err: any) {
            toast('error', isRTL ? 'خطأ في الحذف' : 'Deletion Failed', err.message);
        }
    };

    // Save Global Settings
    const handleSettingsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(settingsForm)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Settings update failed');
            toast('success', isRTL ? 'تم حفظ الإعدادات العامة بنجاح' : 'Global Settings saved successfully', '');
            fetchAuditLogs();
        } catch (err: any) {
            toast('error', isRTL ? 'خطأ في الحفظ' : 'Failed to save settings', err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Helper functions for options
    const openAddUser = () => {
        setEditingUser(null);
        setUserForm({
            name: '',
            id_number: '',
            role: 'Engineer',
            branch_id: branches[0]?.id || '',
            department_id: '',
            reporting_line_id: '',
            mfa_enabled: false,
            mfa_pin: '123456',
            status: 'active'
        });
        setIsUserModalOpen(true);
    };

    const openEditUser = (user: Employee) => {
        setEditingUser(user);
        setUserForm({
            name: user.name,
            id_number: user.id_number,
            role: user.role,
            branch_id: user.branch_id || '',
            department_id: user.department_id || '',
            reporting_line_id: user.reporting_line_id ? String(user.reporting_line_id) : '',
            mfa_enabled: user.mfa_enabled === 1,
            mfa_pin: user.mfa_pin || '123456',
            status: user.status
        });
        setIsUserModalOpen(true);
    };

    const openAddBranch = () => {
        setEditingBranch(null);
        setBranchForm({ id: '', name_en: '', name_ar: '', theme_color: '#0B3D4E', working_hours: '08:00-16:00' });
        setIsBranchModalOpen(true);
    };

    const openEditBranch = (b: Branch) => {
        setEditingBranch(b);
        setBranchForm({ id: b.id, name_en: b.name_en, name_ar: b.name_ar, theme_color: b.theme_color, working_hours: b.working_hours });
        setIsBranchModalOpen(true);
    };

    const openAddDept = () => {
        setEditingDept(null);
        setDeptForm({ id: '', name_en: '', name_ar: '', branch_id: branches[0]?.id || '' });
        setIsDeptModalOpen(true);
    };

    const openEditDept = (d: Department) => {
        setEditingDept(d);
        // Extracts the clean department id segment (e.g. 'jeddah-structural' -> 'structural')
        const deptPart = d.id.includes('-') ? d.id.split('-').slice(1).join('-') : d.id;
        setDeptForm({ id: deptPart, name_en: d.name_en, name_ar: d.name_ar, branch_id: d.branch_id });
        setIsDeptModalOpen(true);
    };

    // Filter employees based on search & selectors
    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = !userSearch || emp.name.toLowerCase().includes(userSearch.toLowerCase()) || emp.id_number.includes(userSearch);
        const matchesRole = userRoleFilter === 'all' || emp.role === userRoleFilter;
        const matchesBranch = branchFilter === 'all' || emp.branch_id === branchFilter;
        return matchesSearch && matchesRole && matchesBranch;
    });

    const isAuthorized = currentUser?.role === 'Admin' || currentUser?.role === 'CEO';

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-surface rounded-3xl border border-slate-100 shadow-sm">
                <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-brand-700 font-display mb-2">
                    {isRTL ? 'غير مصرح بالوصول' : 'Access Restricted'}
                </h2>
                <p className="text-slate-400 text-sm max-w-md">
                    {isRTL 
                        ? 'هذه المنظومة الإدارية مخصصة للمدير التنفيذي والمشرفين فقط. يرجى العودة للوحة التحكم الرئيسية.' 
                        : 'This administrative workspace is restricted to the CEO and system administrators only.'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-0.5 bg-gold-400" />
                        <span className="text-xs uppercase tracking-widest text-gold-500 font-semibold font-sans">
                            {isRTL ? 'إدارة الهيكل والنظام' : 'EMS Admin Panel'}
                        </span>
                    </div>
                    <h2 className="text-2xl font-bold text-brand-700 font-display">
                        {isRTL ? 'منظومة التحكم التنفيذي (EMS Console)' : 'Executive Control Console'}
                    </h2>
                </div>

                <button
                    onClick={loadAllData}
                    className="p-2 border border-slate-200 text-slate-500 hover:text-brand-600 rounded-xl hover:bg-white transition-all flex items-center gap-2 self-start md:self-auto text-xs"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{isRTL ? 'تحديث البيانات' : 'Sync Panel'}</span>
                </button>
            </div>

            {/* Main Tabs Navigation */}
            <div className="flex border-b border-slate-200 overflow-x-auto pb-px gap-1">
                {[
                    { id: 'users', label: isRTL ? 'الموظفين والمستخدمين' : 'Employees & Staff', icon: Users },
                    { id: 'branches', label: isRTL ? 'الفروع الجغرافية' : 'Branches', icon: Building2 },
                    { id: 'departments', label: isRTL ? 'الأقسام الإدارية' : 'Departments', icon: FolderTree },
                    { id: 'settings', label: isRTL ? 'الإعدادات العامة' : 'Global Settings', icon: Settings },
                    { id: 'audit', label: isRTL ? 'سجلات الرقابة والتدقيق' : 'Audit Logs', icon: History }
                ].map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-semibold text-xs transition-all whitespace-nowrap font-sans
                                ${activeTab === tab.id 
                                    ? 'border-gold-500 text-gold-600 bg-gold-50/20' 
                                    : 'border-transparent text-slate-400 hover:text-brand-600 hover:border-slate-300'}`}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Loading Indicator */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm gap-3">
                    <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
                    <p className="text-slate-400 text-xs">{isRTL ? 'جاري جلب البيانات والتراخيص...' : 'Fetching directory metadata...'}</p>
                </div>
            ) : (
                <div className="min-h-[50vh]">
                    <AnimatePresence mode="wait">
                        {/* ── TAB 1: USERS ── */}
                        {activeTab === 'users' && (
                            <motion.div
                                key="users"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                {/* Filters */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="relative">
                                        <Search className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            value={userSearch}
                                            onChange={(e) => setUserSearch(e.target.value)}
                                            placeholder={isRTL ? 'ابحث عن موظف...' : 'Search employee...'}
                                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white text-brand-700 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <select
                                            value={userRoleFilter}
                                            onChange={(e) => setUserRoleFilter(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-brand-700 outline-none cursor-pointer"
                                        >
                                            <option value="all">{isRTL ? 'كل الرتب والوظائف' : 'All Roles'}</option>
                                            <option value="CEO">CEO</option>
                                            <option value="Admin">Admin</option>
                                            <option value="Branch Manager">Branch Manager</option>
                                            <option value="Department Head">Department Head</option>
                                            <option value="Engineer">Engineer</option>
                                            <option value="Secretary">Secretary</option>
                                            <option value="Client-facing staff">Client-facing staff</option>
                                        </select>
                                    </div>
                                    <div>
                                        <select
                                            value={branchFilter}
                                            onChange={(e) => setBranchFilter(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-brand-700 outline-none cursor-pointer"
                                        >
                                            <option value="all">{isRTL ? 'كل الفروع الجغرافية' : 'All Branches'}</option>
                                            {branches.map(b => (
                                                <option key={b.id} value={b.id}>{isRTL ? b.name_ar : b.name_en}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        onClick={openAddUser}
                                        className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-2 px-4 text-xs font-bold font-sans shadow-md"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>{isRTL ? 'إضافة موظف جديد' : 'New Employee'}</span>
                                    </button>
                                </div>

                                {/* Employee Grid */}
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    <table className="w-full border-collapse text-start">
                                        <thead>
                                            <tr className="bg-slate-50 text-brand-600 font-sans font-bold text-[10px] uppercase border-b border-slate-100">
                                                <th className="px-5 py-4 text-start">{isRTL ? 'الاسم الكامل' : 'Employee Details'}</th>
                                                <th className="px-4 py-4 text-start">{isRTL ? 'رقم الهوية الوطنية' : 'National ID'}</th>
                                                <th className="px-4 py-4 text-start">{isRTL ? 'الرتبة والوظيفة' : 'Role'}</th>
                                                <th className="px-4 py-4 text-start">{isRTL ? 'الفرع والقسم' : 'Branch / Department'}</th>
                                                <th className="px-4 py-4 text-start">{isRTL ? 'المدير المباشر' : 'Reports To'}</th>
                                                <th className="px-4 py-4 text-center">{isRTL ? 'التحقق الثنائي' : 'MFA'}</th>
                                                <th className="px-4 py-4 text-center">{isRTL ? 'حالة الحساب' : 'Status'}</th>
                                                <th className="px-5 py-4 text-center">{isRTL ? 'العمليات' : 'Actions'}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs">
                                            {filteredEmployees.map(emp => (
                                                <tr key={emp.id} className="hover:bg-slate-50/50 text-slate-700 transition-colors">
                                                    <td className="px-5 py-4 font-semibold text-brand-700">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center font-bold text-brand-600">
                                                                {emp.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-brand-800">{emp.name}</p>
                                                                <p className="text-[10px] text-slate-400">ID: #{emp.id}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 font-mono font-semibold">{emp.id_number}</td>
                                                    <td className="px-4 py-4">
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-bold bg-slate-50 text-brand-600 border-slate-200">
                                                            <Shield className="w-3 h-3 text-gold-500" />
                                                            {emp.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <p className="font-medium text-slate-800">{isRTL ? emp.branch_name_ar : emp.branch_name_en}</p>
                                                        <p className="text-[10px] text-slate-400">{isRTL ? emp.dept_name_ar : emp.dept_name_en}</p>
                                                    </td>
                                                    <td className="px-4 py-4 text-slate-500">
                                                        {emp.reporting_line_name || <span className="text-slate-300">—</span>}
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border
                                                            ${emp.mfa_enabled === 1 
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                                : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                                            {emp.mfa_enabled === 1 ? (isRTL ? 'مفعل' : 'Enabled') : (isRTL ? 'معطل' : 'Disabled')}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border
                                                            ${emp.status === 'active' 
                                                                ? 'bg-brand-50 text-brand-700 border-brand-200' 
                                                                : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                            {emp.status === 'active' ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'موقوف' : 'Suspended')}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
                                                                onClick={() => openEditUser(emp)}
                                                                className="p-1.5 border border-slate-200 rounded-lg hover:border-brand-400 hover:text-brand-600 transition-colors bg-white shadow-sm"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleUserDelete(emp.id, emp.name)}
                                                                className="p-1.5 border border-slate-200 rounded-lg hover:border-red-400 hover:text-red-600 transition-colors bg-white shadow-sm"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {/* ── TAB 2: BRANCHES ── */}
                        {activeTab === 'branches' && (
                            <motion.div
                                key="branches"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                <div className="flex justify-end bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                    <button
                                        onClick={openAddBranch}
                                        className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-2 px-4 text-xs font-bold font-sans shadow-md"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>{isRTL ? 'إضافة فرع جديد' : 'New Branch'}</span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {branches.map(b => (
                                        <div key={b.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between relative overflow-hidden">
                                            <div className="absolute top-0 end-0 w-24 h-24 rounded-full bg-slate-50 opacity-20 transform translate-x-8 -translate-y-8" />
                                            <div>
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: b.theme_color || '#0B3D4E' }} />
                                                    <h3 className="text-base font-bold text-brand-700 font-display">
                                                        {isRTL ? b.name_ar : b.name_en}
                                                    </h3>
                                                </div>

                                                <div className="space-y-1.5 text-xs text-slate-500 mb-6 font-sans">
                                                    <p>Branch Code: <span className="font-semibold text-brand-600 font-mono">{b.id}</span></p>
                                                    <p>Hours: <span className="font-semibold text-brand-600">{b.working_hours}</span></p>
                                                    <p>Created: <span className="font-semibold">{new Date(b.createdAt).toLocaleDateString()}</span></p>
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                                <button
                                                    onClick={() => openEditBranch(b)}
                                                    className="px-3 py-1.5 text-[11px] font-bold border border-slate-200 text-slate-500 hover:text-brand-600 hover:border-brand-300 rounded-lg flex items-center gap-1.5 transition-all bg-white"
                                                >
                                                    <Edit2 className="w-3 h-3" />
                                                    <span>{isRTL ? 'تعديل' : 'Edit'}</span>
                                                </button>
                                                <button
                                                    onClick={() => handleBranchDelete(b.id, isRTL ? b.name_ar : b.name_en)}
                                                    className="px-3 py-1.5 text-[11px] font-bold border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-300 rounded-lg flex items-center gap-1.5 transition-all bg-white"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                    <span>{isRTL ? 'حذف' : 'Delete'}</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* ── TAB 3: DEPARTMENTS ── */}
                        {activeTab === 'departments' && (
                            <motion.div
                                key="departments"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                <div className="flex justify-end bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                    <button
                                        onClick={openAddDept}
                                        className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-2 px-4 text-xs font-bold font-sans shadow-md"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>{isRTL ? 'إضافة قسم جديد' : 'New Department'}</span>
                                    </button>
                                </div>

                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    <table className="w-full border-collapse text-start">
                                        <thead>
                                            <tr className="bg-slate-50 text-brand-600 font-sans font-bold text-[10px] uppercase border-b border-slate-100">
                                                <th className="px-5 py-4 text-start">{isRTL ? 'رمز القسم' : 'Dept Code'}</th>
                                                <th className="px-4 py-4 text-start">{isRTL ? 'اسم القسم (عربي)' : 'Arabic Name'}</th>
                                                <th className="px-4 py-4 text-start">{isRTL ? 'اسم القسم (إنجليزي)' : 'English Name'}</th>
                                                <th className="px-4 py-4 text-start">{isRTL ? 'الفرع الجغرافي' : 'Associated Branch'}</th>
                                                <th className="px-4 py-4 text-start">{isRTL ? 'تاريخ الإنشاء' : 'Date Created'}</th>
                                                <th className="px-5 py-4 text-center">{isRTL ? 'العمليات' : 'Actions'}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs">
                                            {departments.map(d => (
                                                <tr key={d.id} className="hover:bg-slate-50/50 text-slate-700">
                                                    <td className="px-5 py-4 font-mono font-semibold text-brand-700">{d.id}</td>
                                                    <td className="px-4 py-4 font-semibold">{d.name_ar}</td>
                                                    <td className="px-4 py-4 font-semibold">{d.name_en}</td>
                                                    <td className="px-4 py-4 font-medium text-slate-500">{d.branch_id}</td>
                                                    <td className="px-4 py-4 text-slate-400">{new Date(d.createdAt).toLocaleDateString()}</td>
                                                    <td className="px-5 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
                                                                onClick={() => openEditDept(d)}
                                                                className="p-1.5 border border-slate-200 rounded-lg hover:border-brand-400 hover:text-brand-600 bg-white"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeptDelete(d.id, isRTL ? d.name_ar : d.name_en)}
                                                                className="p-1.5 border border-slate-200 rounded-lg hover:border-red-400 hover:text-red-600 bg-white"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {/* ── TAB 4: SETTINGS ── */}
                        {activeTab === 'settings' && (
                            <motion.div
                                key="settings"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 max-w-2xl"
                            >
                                <form onSubmit={handleSettingsSubmit} className="space-y-6">
                                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                                        <Settings className="w-5 h-5 text-gold-500" />
                                        <h3 className="text-base font-bold text-brand-700 font-display">
                                            {isRTL ? 'إعدادات المنظومة الإدارية العامة' : 'Global System Configurations'}
                                        </h3>
                                    </div>

                                    {/* Default Lang */}
                                    <div>
                                        <label className="block text-xs font-semibold text-brand-600 uppercase tracking-wider mb-2">
                                            {isRTL ? 'اللغة الافتراضية للنظام' : 'Default System Language'}
                                        </label>
                                        <select
                                            value={settingsForm.language_default}
                                            onChange={(e) => setSettingsForm({ ...settingsForm, language_default: e.target.value })}
                                            className="input text-brand-700 cursor-pointer"
                                        >
                                            <option value="ar">العربية (Arabic RTL)</option>
                                            <option value="en">English (English LTR)</option>
                                        </select>
                                    </div>

                                    {/* Default Working Hours */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-brand-600 uppercase tracking-wider mb-2">
                                                {isRTL ? 'ساعة بدء الدوام' : 'Working Hours Start'}
                                            </label>
                                            <input
                                                type="time"
                                                value={settingsForm.working_hours.start}
                                                onChange={(e) => setSettingsForm({
                                                    ...settingsForm,
                                                    working_hours: { ...settingsForm.working_hours, start: e.target.value }
                                                })}
                                                className="input text-brand-700"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-brand-600 uppercase tracking-wider mb-2">
                                                {isRTL ? 'ساعة نهاية الدوام' : 'Working Hours End'}
                                            </label>
                                            <input
                                                type="time"
                                                value={settingsForm.working_hours.end}
                                                onChange={(e) => setSettingsForm({
                                                    ...settingsForm,
                                                    working_hours: { ...settingsForm.working_hours, end: e.target.value }
                                                })}
                                                className="input text-brand-700"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="py-3 px-6 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold font-sans flex items-center gap-2 shadow-md transition-all disabled:opacity-60"
                                    >
                                        {submitting ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ إعدادات النظام' : 'Save Configurations')}
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {/* ── TAB 5: AUDIT LOGS ── */}
                        {activeTab === 'audit' && (
                            <motion.div
                                key="audit"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                {/* Filters */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="relative">
                                        <Search className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            value={auditSearchAction}
                                            onChange={(e) => setAuditSearchAction(e.target.value)}
                                            placeholder={isRTL ? 'ابحث عن عملية (مثال: CREATE_USER)...' : 'Search action (e.g. CREATE_USER)...'}
                                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white text-brand-700 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <select
                                            value={auditModuleFilter}
                                            onChange={(e) => setAuditModuleFilter(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-brand-700 outline-none cursor-pointer"
                                        >
                                            <option value="all">{isRTL ? 'جميع الأنظمة الإدارية' : 'All Modules'}</option>
                                            <option value="Identity & Auth">Identity & Auth</option>
                                            <option value="Organization Hierarchy">Organization Hierarchy</option>
                                            <option value="System Settings">System Settings</option>
                                            <option value="Projects Module">Projects Module</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={fetchAuditLogs}
                                        className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-2 px-4 text-xs font-bold font-sans shadow-md"
                                    >
                                        <Filter className="w-4 h-4" />
                                        <span>{isRTL ? 'تصفية السجلات' : 'Filter Logs'}</span>
                                    </button>
                                </div>

                                {/* Audit table */}
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    <table className="w-full border-collapse text-start">
                                        <thead>
                                            <tr className="bg-slate-50 text-brand-600 font-sans font-bold text-[10px] uppercase border-b border-slate-100">
                                                <th className="px-5 py-4 text-start w-[180px]">{isRTL ? 'التاريخ والوقت' : 'Timestamp'}</th>
                                                <th className="px-4 py-4 text-start w-[140px]">{isRTL ? 'المستخدم' : 'Operator'}</th>
                                                <th className="px-4 py-4 text-start w-[150px]">{isRTL ? 'العملية' : 'Action'}</th>
                                                <th className="px-4 py-4 text-start w-[150px]">{isRTL ? 'النظام التابع' : 'Module'}</th>
                                                <th className="px-4 py-4 text-start">{isRTL ? 'التفاصيل والمعطيات' : 'Security Log Details'}</th>
                                                <th className="px-4 py-4 text-start w-[130px]">{isRTL ? 'عنوان IP' : 'IP Address'}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-[11px] font-sans">
                                            {auditLogs.map(log => (
                                                <tr key={log.id} className="hover:bg-slate-50/50 text-slate-600">
                                                    <td className="px-5 py-3.5 font-mono text-slate-400 whitespace-nowrap">
                                                        {new Date(log.timestamp).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3.5 font-semibold text-brand-700">
                                                        {log.user_name}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className="inline-block px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-slate-500 font-medium">
                                                        {log.module}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-slate-500 max-w-sm truncate" title={log.details}>
                                                        {log.details}
                                                    </td>
                                                    <td className="px-4 py-3.5 font-mono text-slate-400">
                                                        {log.ip_address}
                                                    </td>
                                                </tr>
                                            ))}
                                            {auditLogs.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="text-center py-10 text-slate-400">
                                                        {isRTL ? 'لا توجد سجلات مطابقة للبحث' : 'No audit trail logs recorded.'}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* ── USER MODAL ── */}
            {isUserModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 w-full max-w-lg"
                    >
                        <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                            <h3 className="text-base font-bold text-brand-700 font-display">
                                {editingUser ? (isRTL ? 'تعديل بيانات موظف' : 'Edit Employee Profile') : (isRTL ? 'إضافة موظف جديد للمكتب' : 'Register New Employee')}
                            </h3>
                            <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUserSubmit} className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-brand-600 uppercase mb-1.5">{isRTL ? 'الاسم الكامل' : 'Employee Name'}</label>
                                    <input
                                        type="text"
                                        value={userForm.name}
                                        onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                                        className="input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-brand-600 uppercase mb-1.5">{isRTL ? 'الهوية الوطنية / الإقامة' : 'National ID'}</label>
                                    <input
                                        type="text"
                                        value={userForm.id_number}
                                        onChange={(e) => setUserForm({ ...userForm, id_number: e.target.value })}
                                        className="input font-mono"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-brand-600 uppercase mb-1.5">{isRTL ? 'الدور والترخيص' : 'Role Hierarchy'}</label>
                                    <select
                                        value={userForm.role}
                                        onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                                        className="input cursor-pointer"
                                    >
                                        <option value="CEO">CEO</option>
                                        <option value="Admin">Admin</option>
                                        <option value="Branch Manager">Branch Manager</option>
                                        <option value="Department Head">Department Head</option>
                                        <option value="Engineer">Engineer</option>
                                        <option value="Secretary">Secretary</option>
                                        <option value="Client-facing staff">Client-facing staff</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-brand-600 uppercase mb-1.5">{isRTL ? 'الفرع التابع' : 'Office Branch'}</label>
                                    <select
                                        value={userForm.branch_id}
                                        onChange={(e) => setUserForm({ ...userForm, branch_id: e.target.value })}
                                        className="input cursor-pointer"
                                    >
                                        <option value="">{isRTL ? 'بدون فرع' : 'No Branch'}</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{isRTL ? b.name_ar : b.name_en}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-brand-600 uppercase mb-1.5">{isRTL ? 'القسم المختص' : 'Section Department'}</label>
                                    <select
                                        value={userForm.department_id}
                                        onChange={(e) => setUserForm({ ...userForm, department_id: e.target.value })}
                                        className="input cursor-pointer"
                                    >
                                        <option value="">{isRTL ? 'بدون قسم' : 'No Department'}</option>
                                        {departments.filter(d => !userForm.branch_id || d.branch_id === userForm.branch_id).map(d => (
                                            <option key={d.id} value={d.id}>{isRTL ? d.name_ar : d.name_en}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-brand-600 uppercase mb-1.5">{isRTL ? 'المدير المسؤول مباشراً' : 'Line Manager'}</label>
                                    <select
                                        value={userForm.reporting_line_id}
                                        onChange={(e) => setUserForm({ ...userForm, reporting_line_id: e.target.value })}
                                        className="input cursor-pointer"
                                    >
                                        <option value="">{isRTL ? 'لا يوجد (مدير أعلى)' : 'No Supervisor (Top Level)'}</option>
                                        {employees.filter(emp => !editingUser || emp.id !== editingUser.id).map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setUserForm({ ...userForm, mfa_enabled: !userForm.mfa_enabled })}
                                        className="text-gold-500 hover:text-gold-600 transition-colors"
                                    >
                                        {userForm.mfa_enabled ? <ToggleRight className="w-9 h-9" /> : <ToggleLeft className="w-9 h-9 text-slate-300" />}
                                    </button>
                                    <div>
                                        <p className="font-bold text-brand-700">{isRTL ? 'تفعيل رمز الأمان الثنائي' : 'Enable MFA Code'}</p>
                                        <p className="text-[10px] text-slate-400">{isRTL ? 'طلب PIN عند تسجيل الدخول' : 'Force 2FA code verification'}</p>
                                    </div>
                                </div>
                                {userForm.mfa_enabled && (
                                    <div>
                                        <label className="block text-[10px] font-bold text-brand-600 uppercase mb-1.5">{isRTL ? 'رمز PIN الثنائي للموظف' : 'Secondary PIN Code'}</label>
                                        <input
                                            type="text"
                                            maxLength={6}
                                            value={userForm.mfa_pin}
                                            onChange={(e) => setUserForm({ ...userForm, mfa_pin: e.target.value.replace(/\D/g, '') })}
                                            className="input text-center font-bold tracking-widest text-brand-700"
                                            required
                                        />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-brand-600 uppercase mb-1.5">{isRTL ? 'حالة الموظف' : 'Account Status'}</label>
                                <select
                                    value={userForm.status}
                                    onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}
                                    className="input cursor-pointer"
                                >
                                    <option value="active">{isRTL ? 'نشط وفعال' : 'Active and Enabled'}</option>
                                    <option value="suspended">{isRTL ? 'موقوف إدارياً' : 'Suspended / On Leave'}</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold font-sans mt-4 shadow-md flex items-center justify-center gap-2"
                            >
                                {submitting ? (isRTL ? 'جاري التنفيذ...' : 'Executing...') : (isRTL ? 'حفظ البيانات والتأكيد' : 'Save Employee Details')}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* ── BRANCH MODAL ── */}
            {isBranchModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 w-full max-w-md"
                    >
                        <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                            <h3 className="text-base font-bold text-brand-700 font-display">
                                {editingBranch ? (isRTL ? 'تعديل بيانات فرع' : 'Edit Branch Detail') : (isRTL ? 'إضافة فرع جغرافي جديد' : 'Register New Branch Office')}
                            </h3>
                            <button onClick={() => setIsBranchModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleBranchSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-[10px] font-bold text-brand-600 uppercase mb-1.5">{isRTL ? 'معرف الفرع (كود فريد)' : 'Branch Code (eg: jeddah)'}</label>
                                <input
                                    type="text"
                                    value={branchForm.id}
                                    onChange={(e) => setBranchForm({ ...branchForm, id: e.target.value })}
                                    className="input font-mono"
                                    disabled={!!editingBranch}
                                    required
                                    placeholder="jeddah"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-brand-600 uppercase mb-1.5">{isRTL ? 'اسم الفرع (باللغة الإنجليزية)' : 'Branch Name (English)'}</label>
                                <input
                                    type="text"
                                    value={branchForm.name_en}
                                    onChange={(e) => setBranchForm({ ...branchForm, name_en: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-brand-600 uppercase mb-1.5">{isRTL ? 'اسم الفرع (باللغة العربية)' : 'Branch Name (Arabic)'}</label>
                                <input
                                    type="text"
                                    value={branchForm.name_ar}
                                    onChange={(e) => setBranchForm({ ...branchForm, name_ar: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-brand-600 uppercase mb-1.5">{isRTL ? 'لون السمة المميز' : 'Theme Accent Color'}</label>
                                    <input
                                        type="color"
                                        value={branchForm.theme_color}
                                        onChange={(e) => setBranchForm({ ...branchForm, theme_color: e.target.value })}
                                        className="w-full h-10 border border-slate-200 rounded-xl cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-brand-600 uppercase mb-1.5">{isRTL ? 'أوقات العمل المعتمدة' : 'Working Hours Slot'}</label>
                                    <input
                                        type="text"
                                        value={branchForm.working_hours}
                                        onChange={(e) => setBranchForm({ ...branchForm, working_hours: e.target.value })}
                                        className="input"
                                        placeholder="08:00-16:00"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold font-sans mt-4 shadow-md flex items-center justify-center gap-2"
                            >
                                {submitting ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ وإضافة الفرع' : 'Save Branch Details')}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* ── DEPARTMENT MODAL ── */}
            {isDeptModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 w-full max-w-md"
                    >
                        <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                            <h3 className="text-base font-bold text-brand-700 font-display">
                                {editingDept ? (isRTL ? 'تعديل قسم إداري' : 'Edit Department Detail') : (isRTL ? 'إضافة قسم إداري جديد' : 'Register New Department')}
                            </h3>
                            <button onClick={() => setIsDeptModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleDeptSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-[10px] font-bold text-brand-600 uppercase mb-1.5">{isRTL ? 'الفرع الجغرافي الحاضن' : 'Host Branch Office'}</label>
                                <select
                                    value={deptForm.branch_id}
                                    onChange={(e) => setDeptForm({ ...deptForm, branch_id: e.target.value })}
                                    className="input cursor-pointer"
                                    disabled={!!editingDept}
                                    required
                                >
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{isRTL ? b.name_ar : b.name_en}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-brand-600 uppercase mb-1.5">{isRTL ? 'رمز القسم (مثال: structural)' : 'Department Code ID'}</label>
                                <input
                                    type="text"
                                    value={deptForm.id}
                                    onChange={(e) => setDeptForm({ ...deptForm, id: e.target.value })}
                                    className="input font-mono"
                                    disabled={!!editingDept}
                                    required
                                    placeholder="structural"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-brand-600 uppercase mb-1.5">{isRTL ? 'اسم القسم (عربي)' : 'Department Name (Arabic)'}</label>
                                <input
                                    type="text"
                                    value={deptForm.name_ar}
                                    onChange={(e) => setDeptForm({ ...deptForm, name_ar: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-brand-600 uppercase mb-1.5">{isRTL ? 'اسم القسم (إنجليزي)' : 'Department Name (English)'}</label>
                                <input
                                    type="text"
                                    value={deptForm.name_en}
                                    onChange={(e) => setDeptForm({ ...deptForm, name_en: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold font-sans mt-4 shadow-md flex items-center justify-center gap-2"
                            >
                                {submitting ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ وتأكيد القسم' : 'Save Department')}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};
