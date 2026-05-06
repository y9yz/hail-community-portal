// This file is updated to ensure stability on window focus
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// التحقق من وجود القيم لضمان عدم تعليق التطبيق قبل التشغيل
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error("Missing Supabase environment variables! Check your .env file.");
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: window.localStorage, // تحديد window لضمان الوصول للـ storage في جميع الظروف
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // مهم جداً عند استخدام الروابط التي تحتوي على أكواد أو توكن
    flowType: 'pkce', // يفضل استخدامه لزيادة الأمان ومنع مشاكل الـ Redirect
  },
  // إضافة إعدادات الـ Global للتأكد من عدم تعليق الـ Fetch
  global: {
    headers: { 'x-application-name': 'hail-service-hub' },
  },
});