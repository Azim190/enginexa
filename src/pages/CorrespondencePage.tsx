import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    Search, Printer, Plus, RefreshCw, Mail, ExternalLink, X, FileText, Calendar, Clock, User, Link2, Tag
} from 'lucide-react';

interface Correspondence {
    id: number;
    type: 'incoming' | 'outgoing';
    sender: string;
    recipient: string;
    dateSent: string;
    timeSent: string;
    refNumber: string;
    subject: string;
    description: string;
    fileLink: string;
    remarks: string;
    createdAt: string;
}

interface CorrespondencePageProps {
    type: 'incoming' | 'outgoing';
}

export const CorrespondencePage: React.FC<CorrespondencePageProps> = ({ type }) => {
    const { i18n } = useTranslation();
    const isRTL = i18n.dir() === 'rtl';

    const [mailLogs, setMailLogs] = useState<Correspondence[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters & search state
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form fields
    const [sender, setSender] = useState('');
    const [recipient, setRecipient] = useState('');
    const [dateSent, setDateSent] = useState(new Date().toISOString().split('T')[0]);
    const [timeSent, setTimeSent] = useState(new Date().toTimeString().split(' ')[0].substring(0, 5));
    const [refNumber, setRefNumber] = useState('');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [fileLink, setFileLink] = useState('');
    const [remarks, setRemarks] = useState('');

    const API_URL = import.meta.env.PROD
        ? '/api/correspondence'
        : `http://${window.location.hostname}:3001/api/correspondence`;

    const fetchLogs = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}?type=${type}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Failed to fetch correspondence logs');
            const data = await response.json();
            setMailLogs(data);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to load mail logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [type]);

    const handlePrint = () => {
        window.print();
    };

    const handleOpenModal = () => {
        setSender('');
        setRecipient('');
        setDateSent(new Date().toISOString().split('T')[0]);
        setTimeSent(new Date().toTimeString().split(' ')[0].substring(0, 5));
        setRefNumber('');
        setSubject('');
        setDescription('');
        setFileLink('');
        setRemarks('');
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const token = localStorage.getItem('token');
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    type,
                    sender,
                    recipient,
                    dateSent,
                    timeSent,
                    refNumber: refNumber || undefined,
                    subject,
                    description,
                    fileLink,
                    remarks
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to archive correspondence');
            }

            setShowModal(false);
            fetchLogs();
        } catch (err: any) {
            alert(err.message || 'Failed to submit mail details');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredLogs = mailLogs.filter(log => {
        const q = searchTerm.toLowerCase();
        return (
            !searchTerm ||
            log.refNumber.toLowerCase().includes(q) ||
            log.sender.toLowerCase().includes(q) ||
            log.recipient.toLowerCase().includes(q) ||
            log.dateSent.includes(q) ||
            log.subject.toLowerCase().includes(q)
        );
    });

    const pageTitle = type === 'incoming' 
        ? (isRTL ? 'البريد الوارد' : 'Incoming Mail') 
        : (isRTL ? 'البريد الصادر' : 'Outgoing Mail');

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-5 h-0.5 bg-gold-400" />
                        <span className="text-xs uppercase tracking-widest text-gold-500 font-semibold">
                            {isRTL ? 'إدارة المراسلات والمخاطبات' : 'Correspondence Logs'}
                        </span>
                    </div>
                    <h2
                        className="text-2xl font-bold text-brand-700 capitalize"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                        {pageTitle}
                    </h2>
                    <p className="text-slate-400 text-sm mt-0.5">
                        {filteredLogs.length} {isRTL ? 'سجلات تم العثور عليها' : 'records found'}
                    </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto no-print">
                    <button
                        onClick={handlePrint}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-brand-600 border border-brand-200 rounded-xl hover:bg-brand-50 transition-colors shadow-sm"
                    >
                        <Printer className="w-4 h-4" />
                        <span>{isRTL ? 'طباعة السجل' : 'Print Log'}</span>
                    </button>
                    <button
                        onClick={handleOpenModal}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gold-500 rounded-xl hover:bg-gold-600 transition-colors shadow-lg"
                    >
                        <Plus className="w-4 h-4" />
                        <span>{isRTL ? 'أرشفة بريد جديد' : 'Add New Mail'}</span>
                    </button>
                </div>
            </div>

            {/* ── Search Bar ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4 no-print">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 rtl:left-auto rtl:right-3" />
                    <input
                        type="text"
                        placeholder={isRTL ? 'البحث بواسطة الرقم المرجعي، المرسل، المستقبل، أو التاريخ...' : 'Search by reference number, sender, recipient, or date...'}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="input pl-10 rtl:pl-4 rtl:pr-10 h-10 text-sm"
                    />
                </div>
            </div>

            {/* ── Data Logs Table ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden print:border-0 print:shadow-none">
                {loading ? (
                    <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span className="text-sm">{isRTL ? 'جاري تحميل السجلات...' : 'Loading records...'}</span>
                    </div>
                ) : error ? (
                    <div className="text-center py-16 text-red-500 font-semibold">
                        <p>{error}</p>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="text-center py-16 no-print">
                        <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm font-medium">{isRTL ? 'لا توجد سجلات مطابقة للبحث' : 'No records matching the search.'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto print:overflow-visible">
                        {/* Printable Header */}
                        <div className="hidden print:block text-center py-6 border-b border-slate-200 mb-6">
                            <h1 className="text-2xl font-bold text-brand-700 uppercase" style={{ fontFamily: "'Playfair Display', serif" }}>
                                EngiNexa Engineering Consultants
                            </h1>
                            <p className="text-slate-500 text-sm mt-1">{pageTitle} Log Sheet</p>
                            <p className="text-xs text-slate-400 mt-0.5">Date generated: {new Date().toLocaleDateString()}</p>
                        </div>

                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-surface border-b border-slate-100 print:bg-slate-50 print:border-b-2 print:border-slate-300">
                                    <th className="text-center px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider print:px-2 print:py-1">#</th>
                                    <th className="text-left rtl:text-right px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider print:px-2 print:py-1">{isRTL ? 'الرقم المرجعي' : 'Ref Number'}</th>
                                    <th className="text-left rtl:text-right px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider print:px-2 print:py-1">{isRTL ? 'المرسل' : 'From'}</th>
                                    <th className="text-left rtl:text-right px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider print:px-2 print:py-1">{isRTL ? 'المستقبل' : 'To'}</th>
                                    <th className="text-left rtl:text-right px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider print:px-2 print:py-1">{isRTL ? 'تاريخ الإرسال' : 'Date Sent'}</th>
                                    <th className="text-left rtl:text-right px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider print:px-2 print:py-1">{isRTL ? 'وقت الإرسال' : 'Time Sent'}</th>
                                    <th className="text-left rtl:text-right px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider print:px-2 print:py-1">{isRTL ? 'الموضوع' : 'Subject'}</th>
                                    <th className="text-left rtl:text-right px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider print:px-2 print:py-1">{isRTL ? 'الوصف' : 'Description'}</th>
                                    <th className="text-center px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider print:px-2 print:py-1 no-print">{isRTL ? 'رابط الملف' : 'File Link'}</th>
                                    <th className="text-left rtl:text-right px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider print:px-2 print:py-1">{isRTL ? 'ملاحظات' : 'Remarks'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 print:divide-slate-200">
                                {filteredLogs.map((log, index) => (
                                    <tr key={log.id} className="hover:bg-surface/30 transition-colors print:hover:bg-transparent">
                                        <td className="px-4 py-4 text-center font-mono text-xs text-slate-400 print:px-2 print:py-1">
                                            {index + 1}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap font-mono text-xs font-semibold text-brand-700 print:px-2 print:py-1">
                                            {log.refNumber}
                                        </td>
                                        <td className="px-4 py-4 font-medium text-slate-800 print:px-2 print:py-1">
                                            {log.sender}
                                        </td>
                                        <td className="px-4 py-4 font-medium text-slate-800 print:px-2 print:py-1">
                                            {log.recipient}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-slate-600 print:px-2 print:py-1">
                                            {log.dateSent}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-slate-500 print:px-2 print:py-1">
                                            {log.timeSent}
                                        </td>
                                        <td className="px-4 py-4 font-semibold text-brand-800 print:px-2 print:py-1">
                                            {log.subject}
                                        </td>
                                        <td className="px-4 py-4 text-slate-600 max-w-xs truncate print:max-w-none print:whitespace-normal print:px-2 print:py-1">
                                            {log.description || '-'}
                                        </td>
                                        <td className="px-4 py-4 text-center whitespace-nowrap no-print">
                                            {log.fileLink ? (
                                                <a 
                                                    href={log.fileLink} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center p-1.5 bg-brand-50 text-brand-600 hover:bg-brand-100 rounded-lg transition-colors"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-4 text-slate-500 text-xs italic print:px-2 print:py-1">
                                            {log.remarks || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Modal Form ── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in no-print">
                    <div className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-100 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-brand-600 border-b border-brand-700 flex items-center justify-between">
                            <div className="flex items-center gap-2.5 text-white">
                                <Mail className="w-5 h-5 text-gold-400 animate-pulse" />
                                <span className="font-bold text-base" style={{ fontFamily: "'Playfair Display', serif" }}>
                                    {isRTL ? 'أرشفة بريد إلكتروني جديد' : 'Archive New Email'}
                                </span>
                            </div>
                            <button 
                                onClick={() => setShowModal(false)}
                                className="p-1.5 text-brand-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body / Form */}
                        <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                {/* From */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5 text-gold-500" />
                                        {isRTL ? 'المرسل (From)' : 'Sender (From)'}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={sender}
                                        onChange={e => setSender(e.target.value)}
                                        placeholder={isRTL ? 'مثال: sayed@makkah.com' : 'e.g. sayed@makkah.com'}
                                        className="input h-10 text-sm"
                                    />
                                </div>

                                {/* To */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5 text-gold-500" />
                                        {isRTL ? 'المستقبل (To)' : 'Recipient (To)'}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={recipient}
                                        onChange={e => setRecipient(e.target.value)}
                                        placeholder={isRTL ? 'مثال: client@domain.com' : 'e.g. client@domain.com'}
                                        className="input h-10 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Date Sent */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-gold-500" />
                                        {isRTL ? 'تاريخ الإرسال' : 'Date Sent'}
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={dateSent}
                                        onChange={e => setDateSent(e.target.value)}
                                        className="input h-10 text-sm"
                                    />
                                </div>

                                {/* Time Sent */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-gold-500" />
                                        {isRTL ? 'وقت الإرسال' : 'Time Sent'}
                                    </label>
                                    <input
                                        type="time"
                                        required
                                        value={timeSent}
                                        onChange={e => setTimeSent(e.target.value)}
                                        className="input h-10 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Ref Number */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                                        <Tag className="w-3.5 h-3.5 text-gold-500" />
                                        {isRTL ? 'رقم الخطاب المرجعي' : 'Ref Number'}
                                    </label>
                                    <input
                                        type="text"
                                        value={refNumber}
                                        onChange={e => setRefNumber(e.target.value)}
                                        placeholder={isRTL ? 'توليد تلقائي إذا تركت فارغة' : 'Auto-generated if empty'}
                                        className="input h-10 text-sm font-mono"
                                    />
                                </div>

                                {/* File Link */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                                        <Link2 className="w-3.5 h-3.5 text-gold-500" />
                                        {isRTL ? 'رابط الملف المؤرشف' : 'File Link / Attachment'}
                                    </label>
                                    <input
                                        type="url"
                                        value={fileLink}
                                        onChange={e => setFileLink(e.target.value)}
                                        placeholder="https://onedrive.live.com/..."
                                        className="input h-10 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Subject */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                    {isRTL ? 'الموضوع' : 'Subject'}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    placeholder={isRTL ? 'عنوان أو موضوع البريد' : 'Email subject line'}
                                    className="input h-10 text-sm font-semibold"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                    {isRTL ? 'الوصف / محتوى البريد' : 'Description / Mail Content'}
                                </label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder={isRTL ? 'اكتب ملخصًا لمحتوى الرسالة...' : 'Write a summary of the email content...'}
                                    className="input py-2 text-sm min-h-[70px] resize-y"
                                />
                            </div>

                            {/* Remarks */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                    {isRTL ? 'ملاحظات إضافية' : 'Remarks'}
                                </label>
                                <textarea
                                    value={remarks}
                                    onChange={e => setRemarks(e.target.value)}
                                    placeholder={isRTL ? 'أي ملاحظات للمراجعة...' : 'Any remarks for internal audit review...'}
                                    className="input py-2 text-sm min-h-[60px] resize-y"
                                />
                            </div>

                            {/* Modal Footer Buttons */}
                            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    {isRTL ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2.5 text-sm font-semibold text-white bg-gold-500 rounded-xl hover:bg-gold-600 transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Plus className="w-4 h-4" />
                                    )}
                                    <span>{isRTL ? 'حفظ الأرشيف' : 'Save Mail'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
