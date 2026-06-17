import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// تعريف الواجهة (Interface) لإضافة دعم للكلاسات النشطة والمعلقة بشكل مخصص
interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;         // الكلاسات الأساسية للرابط
  activeClassName?: string;   // كلاسات إضافية تُطبق عند نشاط الرابط
  pendingClassName?: string;  // كلاسات إضافية تُطبق عند تعليق الرابط (قيد التحميل)
}

// إنشاء المكون المحسن مع دعم تمرير الـ Ref للعناصر الخارجية
const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        // دالة ديناميكية لتحديد الكلاسات بناءً على حالة الرابط
        className={({ isActive, isPending }) =>
          cn(
            className, 
            isActive && activeClassName, 
            isPending && pendingClassName
          )
        }
        {...props}
      />
    );
  },
);

// تعيين اسم للمكون لسهولة تتبعه في أدوات تطوير React (React DevTools)
NavLink.displayName = "NavLink";

export { NavLink };
