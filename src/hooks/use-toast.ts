import * as React from "react";

import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

// تحديد الحد الأقصى لعدد الإشعارات التي يمكن عرضها في نفس الوقت
const TOAST_LIMIT = 1;
// تحديد وقت التأخير (بالميلي ثانية) قبل إزالة الإشعار نهائياً من الذاكرة بعد إخفائه
const TOAST_REMOVE_DELAY = 1000000;

// تعريف واجهة بيانات الإشعار التي تمتد من الخصائص الأساسية وتضيف معرفاً وعناصر أخرى اختيارية
type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

// أنواع الإجراءات المتاحة للتحكم في حالة الإشعارات
const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

let count = 0;

// دالة لإنشاء معرفات فريدة للإشعارات بطريقة تسلسلية آمنة
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type ActionType = typeof actionTypes;

// تعريف الإجراءات التي يقبلها الـ Reducer والبيانات المرفقة مع كل إجراء
type Action =
  | {
      type: ActionType["ADD_TOAST"];
      toast: ToasterToast;
    }
  | {
      type: ActionType["UPDATE_TOAST"];
      toast: Partial<ToasterToast>;
    }
  | {
      type: ActionType["DISMISS_TOAST"];
      toastId?: ToasterToast["id"];
    }
  | {
      type: ActionType["REMOVE_TOAST"];
      toastId?: ToasterToast["id"];
    };

interface State {
  toasts: ToasterToast[];
}

// خريطة لتخزين المؤقتات الزمنية الخاصة بكل إشعار لمنع تكرار أو تداخل عمليات الحذف
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

// دالة لإضافة الإشعار إلى طابور الحذف لإزالته من الواجهة والذاكرة بعد انتهاء مدة العرض
const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

// الدالة المسؤولة عن تحديث حالة الإشعارات (State) بناءً على الإجراء (Action) الممرر
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        // إضافة الإشعار الجديد في البداية مع الالتزام بالحد الأقصى المسموح به
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t)),
      };

    case "DISMISS_TOAST": {
      const { toastId } = action;

      // التعامل مع التأثيرات الجانبية لإخفاء الإشعار
      // إذا تم تمرير معرف، يتم إخفاء إشعار محدد، وإلا يتم إخفاء جميع الإشعارات المفتوحة
      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t,
        ),
      };
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

// مصفوفة لتخزين دوال التحديث الخاصة بالمكونات التي تستخدم هذا الخطاف (Observer Pattern)
const listeners: Array<(state: State) => void> = [];

// الحالة المركزية للإشعارات خارج دورة حياة React لتكون متاحة من أي مكان في التطبيق
let memoryState: State = { toasts: [] };

// دالة لتنفيذ الإجراءات وتحديث الحالة المركزية، ثم تنبيه كافة المكونات المستمعة لتحديث نفسها
function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

type Toast = Omit<ToasterToast, "id">;

// الدالة الأساسية التي يتم استدعاؤها من أي مكان في التطبيق لإنشاء إشعار جديد
function toast({ ...props }: Toast) {
  const id = genId();

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    });
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return {
    id: id,
    dismiss,
    update,
  };
}

// الخطاف (Hook) المخصص لربط المكونات بالحالة المركزية للإشعارات
function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    // إضافة المكون الحالي إلى قائمة المستمعين عند التثبيت
    listeners.push(setState);
    return () => {
      // إزالة المكون من قائمة المستمعين عند التدمير لمنع تسريب الذاكرة
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

export { useToast, toast };