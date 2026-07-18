import React, { useRef, useState } from 'react';
import { UploadCloud, File, X, Loader2, Link } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface UploadedFile {
    name: string;
    url: string;
    size?: number;
}

interface FileUploadZoneProps {
    label: string;
    projectName: string;
    type: 'files' | 'reports';
    value: string; // Will store JSON array string or direct link
    onChange: (val: string) => void;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
    label,
    projectName,
    type,
    value,
    onChange
}) => {
    const { t, i18n } = useTranslation();
    const isRTL = i18n.dir() === 'rtl';
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragActive, setIsDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Parse files from value
    let files: UploadedFile[] = [];
    let isLegacyUrl = false;
    if (value) {
        if (value.startsWith('[') && value.endsWith(']')) {
            try {
                files = JSON.parse(value);
            } catch (e) {
                files = [{ name: 'Attached Link', url: value }];
                isLegacyUrl = true;
            }
        } else {
            files = [{ name: 'Attached Link', url: value }];
            isLegacyUrl = true;
        }
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setIsDragActive(true);
        } else if (e.type === "dragleave") {
            setIsDragActive(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            if (!projectName || !projectName.trim()) {
                alert(isRTL ? "يرجى إدخال اسم المشروع أولاً قبل رفع الملفات." : "Please enter the Project Name first before uploading files.");
                return;
            }
            openOneDrive();
            await uploadFiles(e.dataTransfer.files);
        }
    };

    const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            if (!projectName || !projectName.trim()) {
                alert(isRTL ? "يرجى إدخال اسم المشروع أولاً قبل رفع الملفات." : "Please enter the Project Name first before uploading files.");
                return;
            }
            openOneDrive();
            await uploadFiles(e.target.files);
        }
    };

    const openOneDrive = () => {
        window.open("https://1drv.ms/f/c/0a257d75be9315f7/IgB95m23bO8eSrIzf3_zEylXAZ-aggtJ7epk9VViAtFJ9fM?e=Rv2K7x", "_blank");
    };

    const uploadFiles = async (fileList: FileList) => {
        setUploading(true);

        const formData = new FormData();
        for (let i = 0; i < fileList.length; i++) {
            formData.append('files', fileList[i]);
        }
        formData.append('projectName', projectName.trim());
        formData.append('type', type);

        const token = localStorage.getItem('token');

        try {
            const res = await fetch('/api/projects/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success && data.files) {
                    const newFilesList = isLegacyUrl ? [...data.files] : [...files, ...data.files];
                    onChange(JSON.stringify(newFilesList));
                }
            } else {
                console.error("Failed to upload files");
            }
        } catch (error) {
            console.error("Upload error:", error);
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveFile = (index: number) => {
        const updated = files.filter((_, i) => i !== index);
        onChange(updated.length > 0 ? JSON.stringify(updated) : '');
    };

    return (
        <div className="space-y-2">
            <label className="block text-xs font-semibold text-brand-600 uppercase tracking-wider mb-1">
                {label}
            </label>

            {/* Drag Zone */}
            <div
                className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer
                    ${isDragActive ? 'border-gold-500 bg-brand-50/20' : 'border-slate-200 hover:border-gold-400 bg-slate-50/50 hover:bg-white'}
                    dark:border-brand-800 dark:bg-brand-950/40 dark:hover:bg-brand-950/80`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileInput}
                    multiple
                    className="hidden"
                />

                {uploading ? (
                    <div className="flex flex-col items-center space-y-2 py-2">
                        <Loader2 className="w-8 h-8 text-gold-500 animate-spin" />
                        <span className="text-xs text-slate-500 font-semibold dark:text-brand-300">
                            {isRTL ? 'جاري رفع الملفات وفتح OneDrive...' : 'Uploading files and opening OneDrive...'}
                        </span>
                    </div>
                ) : (
                    <div className="text-center space-y-2">
                        <UploadCloud className="w-9 h-9 text-gold-500 mx-auto transition-transform hover:scale-105" />
                        <div>
                            <span className="text-sm font-bold text-brand-700 dark:text-brand-100">
                                {isRTL ? 'اسحب الملفات هنا أو اضغط للاختيار' : 'Drag & drop files here, or click to browse'}
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-brand-400">
                            {isRTL 
                                ? 'سيتم فتح OneDrive تلقائياً لإنشاء المجلد ورفع الملفات' 
                                : 'OneDrive will open automatically to host your project folders'}
                        </p>
                    </div>
                )}
            </div>

            {/* Attached/Uploaded Files List */}
            {files.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                    {files.map((file, idx) => (
                        <div 
                            key={idx} 
                            className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-150 text-xs font-semibold text-brand-700 hover:border-gold-300 transition-all dark:bg-brand-900/60 dark:border-brand-800 dark:text-brand-100"
                        >
                            <div className="flex items-center gap-2 max-w-[85%] truncate">
                                {isLegacyUrl ? (
                                    <Link className="w-3.5 h-3.5 text-gold-500 flex-shrink-0" />
                                ) : (
                                    <File className="w-3.5 h-3.5 text-gold-500 flex-shrink-0" />
                                )}
                                <a 
                                    href={file.url.startsWith('/') ? file.url : `/api${file.url}`} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="hover:underline truncate"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {file.name}
                                </a>
                            </div>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveFile(idx);
                                }}
                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
