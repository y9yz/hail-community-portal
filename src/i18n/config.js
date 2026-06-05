// استيراد مكتبات الترجمة الأساسية وأداة اكتشاف لغة المتصفح
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// استيراد ملفات النصوص المترجمة (الإنجليزية والعربية)
import translationEN from './en.json';
import translationAR from './ar.json';

// تجميع نصوص اللغات في كائن واحد لربطها بالمكتبة
const resources = {
  en: { translation: translationEN },
  ar: { translation: translationAR }
};

// تهيئة وإعداد مكتبة الترجمة
i18n
  .use(LanguageDetector) // تفعيل ميزة اكتشاف لغة المتصفح تلقائياً
  .use(initReactI18next) // ربط مكتبة الترجمة مع إطار عمل React
  .init({
    resources, // تمرير ملفات الترجمة
    fallbackLng: 'ar', // تحديد العربية كلغة افتراضية في حال عدم توفر لغة المتصفح
    interpolation: {
      escapeValue: false // تعطيل حماية نصوص HTML لأن React يقوم بحمايتها تلقائياً
    }
  });

// مراقبة تغيير اللغة لتحديث اتجاه الصفحة (يمين/يسار) وسمة لغة المستند (HTML lang) تلقائياً
i18n.on('languageChanged', (lng) => {
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
});

// تصدير الإعدادات لاستخدامها في باقي أجزاء التطبيق
export default i18n;