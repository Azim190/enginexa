import React, { useState, useEffect, useCallback } from 'react';
import {
    UserPlus, Trash2, Edit2, Shield, User, Search,
    ChevronDown, Users, BadgeCheck, RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Navigate } from 'react-router-dom';

/* ── Types ─────────────────────────────────────────────────────────────── */
type UserRole = 'admin' | 'user';
type SectionType = 'architectural' | 'structural' | 'surveying' | 'electrical' | 'mechanical' | '';

interface SystemUser {
    id: number;
    name: string;
    id_number: string;
    role: UserRole;
    section: SectionType | null;
}

const SECTIONS: { value: SectionType; label: string }[] = [
    { value: 'architectural', label: 'Architectural' },
    { value: 'structural',    label: 'Structural' },
    { value: 'surveying',     label: 'Surveying' },
    { value: 'electrical',    label: 'Electrical' },
    { value: 'mechanical',    label: 'Mechanical' },
];

const roleColors = {
    admin: 'bg-gold-50 text-gold-700 border-gold-200',
    user:  'bg-brand-50 text-brand-700 border-brand-200',
};

const API_USERS = import.meta.env.PROD
    ? '/api/users'
    : `http://${window.location.hostname}:3001/api/users`;

const defaultForm = { name: '', id_number: '', role: 'user' as UserRole, section: '' as SectionType };

/* ── Page ─────────────────────────────────────────────────────────────── */
export const UsersPage: React.FC = () => {
    const { user: currentUser } = useAuth();
    const { toast } = useToast();

    const [users,      setUsers]      = useState<SystemUser[]>([]);
    const [loading,    setLoading]    = useState(true);
    const [search,     setSearch]     = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');

    const [isModalOpen,   setIsModalOpen]   = useState(false);
    const [editingUser,   setEditingUser]   = useState<SystemUser | null>(null);
    const [deletingId,    setDeletingId]    = useState<number | null>(null);
    const [formError,     setFormError]     = useState('');
    const [submitting,    setSubmitting]    = useState(false);
    const [formData,      setFormData]      = useState(defaultForm);

    // Guard: admin only
    if (currentUser?.role !== 'admin') return <Navigate to="/" replace />;

    /* ── Fetch ── */
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(API_USERS);
            if (!res.ok) throw new Error('Failed to fetch users');
            const data = await res.json();
            setUsers(data);
        } catch {
            toast('error', 'Failed to load users', 'Could not reach the server.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    /* ── Filtered list ── */
    const filtered = users.filter(u => {
        const q = search.toLowerCase();
        const matchSearch = !search || (
            u.name.toLowerCase().includes(q) ||
            u.id_number.includes(q) ||
            (u.section || '').toLowerCase().includes(q)
        );
        const matchRole = roleFilter === 'all' || u.role === roleFilter;
        return matchSearch && matchRole;
    });

    const adminCount = users.filter(u => u.role === 'admin').length;
    const userCount  = users.filter(u => u.role === 'user').length;

    /* ── Modal helpers ── */
    const openAddModal = () => {
        setEditingUser(null);
        setFormData(defaultForm);
        setFormError('');
        setIsModalOpen(true);
    };

    const openEditModal = (u: SystemUser) => {
        setEditingUser(u);
        setFormData({ name: u.name, id_number: u.id_number, role: u.role, section: u.section || '' });
        setFormError('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');

        // Validation
        if (formData.role === 'user' && !formData.section) {
            setFormError('Please select a section for regular users.');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                name:      formData.name.trim(),
                id_number: formData.id_number.trim(),
                role:      formData.role,
                section:   formData.role === 'admin' ? null : formData.section || null,
            };

            const url    = editingUser ? `${API_USERS}/${editingUser.id}` : API_USERS;
            const method = editingUser ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                setFormError(data.error || 'Operation failed');
                return;
            }

            if (editingUser) {
                setUsers(prev => prev.map(u => u.id === editingUser.id ? data : u));
                toast('success', 'User updated', `${data.name} has been updated.`);
            } else {
                setUsers(prev => [...prev, data]);
                toast('success', 'User added', `${data.name} can now log in.`);
            }
            setIsModalOpen(false);
        } catch {
            setFormError('Network error — could not reach the server.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (deletingId === null) return;
        const target = users.find(u => u.id === deletingId);
        try {
            const res = await fetch(`${API_USERS}/${deletingId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            setUsers(prev => prev.filter(u => u.id !== deletingId));
            toast('success', 'User removed', `${target?.name} has been deleted.`);
        } catch {
            toast('error', 'Delete failed', 'Could not remove this user.');
        } finally {
            setDeletingId(null);
        }
    };

    /* ── Render ── */
    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-5 h-0.5 bg-gold-400" />
                        <span className="text-xs uppercase tracking-widest text-gold-500 font-semibold">
                            Admin Panel
                        </span>
                    </div>
                    <h2
                        className="text-2xl font-bold text-brand-700"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                        User Management
                    </h2>
                    <p className="text-slate-400 text-sm mt-0.5">
                        {users.length} total · {adminCount} admins · {userCount} engineers
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={fetchUsers}
                        className="p-2.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 border border-slate-200 rounded-xl transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        <span>Add User</span>
                    </button>
                </div>
            </div>

            {/* ── Stats strip ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Total Users', value: users.length, icon: Users,      color: 'bg-brand-600' },
                    { label: 'Admins',      value: adminCount,   icon: Shield,     color: 'bg-gold-500' },
                    { label: 'Engineers',   value: userCount,    icon: BadgeCheck,  color: 'bg-emerald-600' },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-card flex items-center gap-3">
                        <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                            <s.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-brand-700" style={{ fontFamily: "'Playfair Display', serif" }}>
                                {s.value}
                            </p>
                            <p className="text-xs text-slate-400 font-medium">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Filters ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name, ID, or section..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="input pl-10 h-10 text-sm"
                    />
                </div>
                <div className="relative">
                    <select
                        value={roleFilter}
                        onChange={e => setRoleFilter(e.target.value as any)}
                        className="input h-10 pr-8 text-sm appearance-none cursor-pointer min-w-[140px]"
                    >
                        <option value="all">All Roles</option>
                        <option value="admin">Admins</option>
                        <option value="user">Engineers</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* ── Table ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Loading users...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm font-medium">No users found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-surface border-b border-slate-100">
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">ID Number</th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Section</th>
                                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map(u => (
                                    <tr key={u.id} className="group hover:bg-surface/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0
                                                    ${u.role === 'admin' ? 'bg-gold-100 text-gold-700' : 'bg-brand-100 text-brand-700'}`}>
                                                    {u.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-semibold text-brand-700">{u.name}</span>
                                                {u.id === currentUser?.id && (
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded-full font-semibold">You</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <code className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-mono">
                                                {u.id_number}
                                            </code>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${roleColors[u.role]}`}>
                                                {u.role === 'admin'
                                                    ? <Shield className="w-3 h-3" />
                                                    : <User className="w-3 h-3" />
                                                }
                                                {u.role === 'admin' ? 'Admin' : 'Engineer'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.section ? (
                                                <span className="badge badge-section capitalize">{u.section}</span>
                                            ) : (
                                                <span className="text-slate-300 text-xs">All sections</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => openEditModal(u)}
                                                    className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                                    title="Edit user"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => u.id !== currentUser?.id && setDeletingId(u.id)}
                                                    disabled={u.id === currentUser?.id}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                    title={u.id === currentUser?.id ? "Can't delete your own account" : "Delete user"}
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
                )}
            </div>

            {/* ── Add / Edit Modal ── */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={e => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
                >
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-card-lg overflow-hidden animate-fade-scale-in">
                        {/* Header */}
                        <div className="relative bg-brand-600 px-6 py-5 overflow-hidden">
                            <div className="mashrabiya-overlay absolute inset-0" />
                            <div className="relative z-10 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                                        {editingUser ? <Edit2 className="w-4 h-4 text-white" /> : <UserPlus className="w-4 h-4 text-white" />}
                                    </div>
                                    <h3
                                        className="text-lg font-bold text-white"
                                        style={{ fontFamily: "'Playfair Display', serif" }}
                                    >
                                        {editingUser ? 'Edit User' : 'Add New User'}
                                    </h3>
                                </div>
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
                            {/* Server-side / validation error */}
                            {formError && (
                                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 flex items-start gap-2">
                                    <span className="w-1 rounded-full bg-red-400 self-stretch flex-shrink-0 mt-0.5" />
                                    {formError}
                                </div>
                            )}

                            {/* Name */}
                            <div>
                                <label className="block text-xs font-semibold text-brand-600 uppercase tracking-wider mb-1.5">
                                    Full Name *
                                </label>
                                <input
                                    required
                                    className="input"
                                    placeholder="Employee's full name"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            {/* ID Number */}
                            <div>
                                <label className="block text-xs font-semibold text-brand-600 uppercase tracking-wider mb-1.5">
                                    ID Number *
                                </label>
                                <input
                                    required
                                    className="input font-mono"
                                    placeholder="National / Employee ID"
                                    value={formData.id_number}
                                    onChange={e => setFormData({ ...formData, id_number: e.target.value })}
                                />
                                <p className="text-xs text-slate-400 mt-1">This is used as the login password.</p>
                            </div>

                            {/* Role */}
                            <div>
                                <label className="block text-xs font-semibold text-brand-600 uppercase tracking-wider mb-1.5">
                                    Role *
                                </label>
                                <div className="relative">
                                    <select
                                        className="input appearance-none pr-8 cursor-pointer"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value as UserRole, section: '' })}
                                    >
                                        <option value="user">Engineer (section access only)</option>
                                        <option value="admin">Admin (full access)</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Section — only for engineers */}
                            {formData.role === 'user' && (
                                <div>
                                    <label className="block text-xs font-semibold text-brand-600 uppercase tracking-wider mb-1.5">
                                        Section *
                                    </label>
                                    <div className="relative">
                                        <select
                                            className="input appearance-none pr-8 cursor-pointer"
                                            value={formData.section}
                                            onChange={e => setFormData({ ...formData, section: e.target.value as SectionType })}
                                        >
                                            <option value="">Select a section</option>
                                            {SECTIONS.map(s => (
                                                <option key={s.value} value={s.value}>{s.label}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Engineers can only view and manage their own section.</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-ghost border border-slate-200">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary flex items-center gap-2" disabled={submitting}>
                                    {submitting ? (
                                        <>
                                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                            </svg>
                                            Saving...
                                        </>
                                    ) : editingUser ? 'Save Changes' : 'Add User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Confirm Delete ── */}
            <ConfirmDialog
                isOpen={deletingId !== null}
                title="Delete User?"
                message="This user will no longer be able to log in. This action cannot be undone."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setDeletingId(null)}
            />
        </div>
    );
};
