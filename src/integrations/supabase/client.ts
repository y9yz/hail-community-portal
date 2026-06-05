// استيراد دالة إنشاء عميل Supabase وأنواع البيانات الخاصة بقاعدة البيانات
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// جلب روابط ومفاتيح الاتصال من متغيرات البيئة المخفية
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// التحقق من توفر مفاتيح الاتصال وطباعة خطأ في حال عدم وجودها لمنع توقف التطبيق
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error("Missing Supabase environment variables! Check your .env file.");
}

// تهيئة وتصدير عميل Supabase لاستخدامه في باقي أجزاء التطبيق
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // حفظ جلسة المستخدم في التخزين المحلي للمتصفح
    storage: window.localStorage, 
    // إبقاء المستخدم مسجلاً للدخول حتى عند تحديث أو إغلاق الصفحة
    persistSession: true,
    // تجديد رمز التحقق (Token) تلقائياً في الخلفية
    autoRefreshToken: true,
    // استخراج بيانات الجلسة من رابط الصفحة (مهم لروابط توثيق الحساب واستعادة كلمة المرور)
    detectSessionInUrl: true, 
    // استخدام معيار PKCE لزيادة أمان عملية تسجيل الدخول
    flowType: 'pkce', 
  },
  global: {
    // إرسال اسم التطبيق كترويسة (Header) مع كل طلب لتمييز مصدر الطلبات
    headers: { 'x-application-name': 'hail-service-hub' },
  },
});