import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translations
const resources = {
    en: {
        translation: {
            "app": {
                "title": "EngiNexa",
                "login": "Login",
                "logout": "Logout",
                "dashboard": "Dashboard",
                "projects": "Projects",

                "support": "Support",
                "need_help": "Need Help?",
                "need_help_desc": "Contact our support team for any technical issues or inquiries about EngiNexa.",
                "contact_support": "Contact Support",
                "welcome_message": "Welcome to EngiNexa Project Archiving System"
            },
            "sections": {
                "architectural": "Architectural",
                "structural": "Structural",
                "surveying": "Surveying",
                "electromechanical": "Electromechanical",
                "electrical": "Electrical",
                "mechanical": "Mechanical",
                "design-projects": "Design Projects",
                "supervision-projects": "Supervision Projects",
                "supervision-industrial": "Industrial Cities Authority Projects",
                "supervision-client": "Client Projects"
            },
            "actions": {
                "add_project": "Add Project",
                "edit": "Edit",
                "delete": "Delete",
                "view": "View",
                "search": "Search projects...",
                "client_phone": "Client Phone Number"
            },
            "auth": {
                "email": "Email Address",
                "password": "Password",
                "signin": "Sign In",
                "welcome": "Welcome back"
            }
        }
    },
    ar: {
        translation: {
            "app": {
                "title": "EngiNexa",
                "login": "تسجيل الدخول",
                "logout": "تسجيل الخروج",
                "dashboard": "لوحة التحكم",
                "projects": "المشاريع",

                "support": "الدعم الفني",
                "need_help": "هل تحتاج مساعدة؟",
                "need_help_desc": "تواصل مع فريق الدعم الفني لأي استفسارات أو مشاكل تقنية في نظام EngiNexa.",
                "contact_support": "تواصل مع الدعم",
                "welcome_message": "مرحباً بك في نظام أرشفة وإدارة مشاريع EngiNexa"
            },
            "sections": {
                "architectural": "قسم المعماري",
                "structural": "قسم الإنشائي",
                "surveying": "قسم المساحة",
                "electromechanical": "قسم الإلكترومكانيك",
                "electrical": "قسم الكهرباء",
                "mechanical": "قسم الميكانيكية",
                "design-projects": "مشاريع التصميم",
                "supervision-projects": "مشاريع الإشراف",
                "supervision-industrial": "مشاريع هيئة المدن الصناعية",
                "supervision-client": "مشاريع العملاء"
            },
            "actions": {
                "add_project": "إضافة مشروع",
                "edit": "تعديل",
                "delete": "حذف",
                "view": "عرض",
                "search": "بحث عن مشروع...",
                "client_phone": "رقم هاتف العميل"
            },
            "auth": {
                "email": "البريد الإلكتروني",
                "password": "كلمة المرور",
                "signin": "دخول",
                "welcome": "أهلاً بك"
            }
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: "ar", // Default to Arabic as requested implicitly by company name (Mecca)
        fallbackLng: "en",
        interpolation: {
            escapeValue: false
        },
        react: {
            useSuspense: false
        }
    });

export default i18n;
