import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// هذي الواجهة عشان ندعم الكلاسات القديمة والجديدة ونضبط التوافق (Compatibility)
interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

// مكون NavLink المحسن؛ يمرر الـ Ref ويضبط وضع الكلاسات تلقائي
const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        // هنا المربط.. يشيك على حالة الرابط (شغّال ولا معلّق) ويجمع الكلاسات المناسبة
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...props}
      />
    );
  },
);

// نعطيه اسم عشان الديبق (Debugging) ما يتعبنا
NavLink.displayName = "NavLink";

export { NavLink };