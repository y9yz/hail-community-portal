import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

/* إعدادات فحص الكود */
export default tseslint.config(
  /* تجاهل ملفات البناء */
  { ignores: ["dist"] },
  {
    /* القواعد القياسية للجافاسكريبت والتايب سكريبت */
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    
    /* تحديد الملفات المشمولة بالفحص */
    files: ["**/*.{ts,tsx}"],
    
    languageOptions: {
      ecmaVersion: 2020,
      /* تعريف متغيرات البيئة للمتصفح */
      globals: globals.browser,
    },
    
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    
    rules: {
      /* تطبيق قوانين الـ Hooks */
      ...reactHooks.configs.recommended.rules,
      
      /* تنظيم تصدير المكونات لتحديثها بسرعة */
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      
      /* إيقاف تنبيه المتغيرات غير المستخدمة */
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
);