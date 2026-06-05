// استيراد أيقونة النجمة والمكتبة المساعدة لدمج كلاسات CSS
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

// تعريف الخصائص (Props) التي يستقبلها المكون
interface StarRatingProps {
  rating: number;       // التقييم الحالي
  maxStars?: number;    // الحد الأقصى للنجوم (الافتراضي 5)
  size?: "sm" | "md";   // حجم النجوم
  interactive?: boolean;// هل المكون قابل للتفاعل (للقراءة فقط أم للتقييم)
  onRate?: (rating: number) => void; // الدالة التي تُستدعى عند اختيار تقييم
}

// مكون لعرض النجوم والتحكم فيها
const StarRating = ({ rating, maxStars = 5, size = "sm", interactive = false, onRate }: StarRatingProps) => {
  // تحديد أبعاد الأيقونة بناءً على الحجم المختار
  const sizeClass = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    // استخدام dir="ltr" لضمان بقاء النجوم مرتبة من اليسار لليمين حتى في واجهات RTL
    <div className="flex items-center gap-0.5" dir="ltr">
      {/* إنشاء مصفوفة بناءً على عدد النجوم الأقصى وتوليد الأيقونات */}
      {Array.from({ length: maxStars }, (_, i) => {
        // تحديد ما إذا كانت النجمة يجب أن تكون ملونة (إذا كان ترتيبها أقل من أو يساوي التقييم)
        const filled = i < Math.round(rating);
        return (
          <Star
            key={i}
            className={cn(
              sizeClass,
              // تلوين النجمة بالذهبي إذا كانت ممتلئة، أو بالرمادي إذا كانت فارغة
              filled ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30",
              // إضافة تأثيرات بصرية عند التفاعل إذا كان المكون يدعم ذلك
              interactive && "cursor-pointer hover:text-yellow-400 transition-colors"
            )}
            // استدعاء دالة التقييم عند النقر على نجمة معينة
            onClick={() => interactive && onRate?.(i + 1)}
          />
        );
      })}
    </div>
  );
};

export default StarRating;