import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import StarRating from "./StarRating";
import type { Review } from "@/types/service";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface ReviewSectionProps {
  serviceId: string;
}

/* مكون عرض قائمة التقييمات العامة للخدمة */
const ReviewSection = ({ serviceId }: ReviewSectionProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  /* جلب التقييمات المرتبطة بالخدمة مع جلب اسم العميل من جدول البروفايل */
  useEffect(() => {
    const fetchReviews = async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*, client:profiles!reviews_client_id_fkey(full_name)")
        .eq("service_id", serviceId)
        .order("created_at", { ascending: false });
      
      setReviews((data as any) || []);
      setLoading(false);
    };
    fetchReviews();
  }, [serviceId]);

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">التقييمات ({reviews.length})</h3>
      
      {/* معالجة حالة التحميل */}
      {loading ? (
        <p className="text-muted-foreground text-sm">جاري التحميل...</p>
      ) : reviews.length === 0 ? (
        /* حالة عدم وجود بيانات */
        <p className="text-muted-foreground text-sm">لا توجد تقييمات بعد</p>
      ) : (
        /* عرض قائمة التقييمات */
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id} className="rounded-xl">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{r.client?.full_name || "عميل"}</span>
                  <span className="text-xs text-muted-foreground">
                    {/* تحويل التاريخ إلى صيغة نسبية (مثل: منذ يومين) */}
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ar })}
                  </span>
                </div>
                {/* عرض النجوم بناءً على قيمة التقييم */}
                <StarRating rating={r.rating} />
                {/* عرض التعليق النصي إن وجد */}
                {r.comment && <p className="text-sm text-foreground">{r.comment}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewSection;