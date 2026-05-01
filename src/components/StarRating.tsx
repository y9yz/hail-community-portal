import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: "sm" | "md";
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

/* مكون عرض وتفاعل النجوم للتقييمات */
const StarRating = ({ rating, maxStars = 5, size = "sm", interactive = false, onRate }: StarRatingProps) => {
  /* تحديد فئة القياس بناءً على الخصائص الممررة */
  const sizeClass = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    /* dir="ltr" لضمان ترتيب النجوم من اليسار لليمين دائماً */
    <div className="flex items-center gap-0.5" dir="ltr">
      {/* توليد مصفوفة النجوم بناءً على العدد الأقصى */}
      {Array.from({ length: maxStars }, (_, i) => {
        /* تحديد حالة النجمة (ملونة أو فارغة) بناءً على قيمة التقييم */
        const filled = i < Math.round(rating);
        return (
          <Star
            key={i}
            className={cn(
              sizeClass,
              filled ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30",
              /* تفعيل تأثيرات الماوس في حال كان المكون مخصصاً للإدخال */
              interactive && "cursor-pointer hover:text-yellow-400 transition-colors"
            )}
            /* تنفيذ دالة التقييم عند النقر في الوضع التفاعلي */
            onClick={() => interactive && onRate?.(i + 1)}
          />
        );
      })}
    </div>
  );
};

export default StarRating;