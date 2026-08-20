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
                "welcome": "Welcome back",
                "sign_in_tab": "Sign In",
                "register_org_tab": "Register Organization",
                "org_name": "Organization Name",
                "org_name_placeholder": "e.g. Apex Engineering Consultants",
                "org_slug": "Organization Code / Identifier",
                "org_slug_placeholder": "e.g. apex-eng",
                "org_slug_optional": "Organization Code (Optional for default)",
                "admin_name": "Admin Full Name",
                "admin_name_placeholder": "e.g. Fahad Al-Otaibi",
                "id_number": "ID Number / National ID",
                "id_number_placeholder": "Enter 10-digit ID",
                "register_btn": "Register & Launch Platform",
                "already_registered": "Already have an account? Sign in",
                "new_to_platform": "Want EngiNexa for your organization? Register now"
            },
            "org": {
                "profile": "Organization Profile",
                "branding": "Branding & Customization",
                "subscription": "Subscription & Plan",
                "code": "Organization Code",
                "branches_count": "Active Branches",
                "users_count": "Team Members",
                "projects_count": "Managed Projects"
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
                "welcome": "أهلاً بك",
                "sign_in_tab": "تسجيل الدخول",
                "register_org_tab": "تسجيل منظمة جديدة",
                "org_name": "اسم المنظمة / المكتب الهندسي",
                "org_name_placeholder": "مثال: دار الاستشارات الهندسية",
                "org_slug": "رمز المنظمة / المعرّف",
                "org_slug_placeholder": "مثال: dar-consult",
                "org_slug_optional": "رمز المنظمة (اختياري للنظام الافتراضي)",
                "admin_name": "اسم المدير المسؤول",
                "admin_name_placeholder": "مثال: م. فهد العتيبي",
                "id_number": "رقم الهوية / الإقامة",
                "id_number_placeholder": "أدخل رقم الهوية (10 أرقام)",
                "register_btn": "تسجيل وإطلاق المنظومة",
                "already_registered": "هل لديك حساب بالفعل؟ سجل دخولك",
                "new_to_platform": "هل ترغب في نظام EngiNexa لمنظمتك؟ سجل الآن"
            },
            "org": {
                "profile": "ملف المنظمة",
                "branding": "الهوية والتخصيص",
                "subscription": "الاشتراك والباقة",
                "code": "رمز المنظمة",
                "branches_count": "الفروع المفعلة",
                "users_count": "أعضاء الفريق",
                "projects_count": "المشاريع المدارة"
            }
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: "ar", // Default to Arabic
        fallbackLng: "en",
        interpolation: {
            escapeValue: false
        },
        react: {
            useSuspense: false
        }
    });

export default i18n;
