import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import StarRating from "./StarRating";
import type { Review } from "@/types/service";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { useTranslation } from "react-i18next";

interface ReviewSectionProps {
  serviceId: string;
}

/* مكون عرض قائمة التقييمات العامة للخدمة */
const ReviewSection = ({ serviceId }: ReviewSectionProps) => {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  /* جلب التقييمات المرتبطة بالخدمة مع جلب اسم العميل من جدول البروفايل */
  useEffect(() => {
    let mounted = true;

    const fetchReviews = async () => {
      try {
        const { data, error } = await supabase
          .from("reviews")
          .select("*, client:profiles!reviews_client_id_fkey(full_name)")
          .eq("service_id", serviceId)
          .order("created_at", { ascending: false });
        
        if (error) throw error;

        if (mounted) {
          setReviews((data as any) || []);
        }
      } catch (err) {
        console.error("Error fetching reviews:", err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (serviceId) {
      fetchReviews();
    }

    return () => {
      mounted = false; // صمام الأمان لإلغاء التحديثات عند الخروج من الصفحة
    };
  }, [serviceId]);

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg text-right">
        {t('review.title_count', { count: reviews.length })}
      </h3>
      
      {/* معالجة حالة التحميل */}
      {loading ? (
        <p className="text-muted-foreground text-sm text-right">{t('review.loading')}</p>
      ) : reviews.length === 0 ? (
        /* حالة عدم وجود بيانات */
        <p className="text-muted-foreground text-sm text-right">{t('review.empty')}</p>
      ) : (
        /* عرض قائمة التقييمات */
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id} className="rounded-xl border shadow-sm">
              <CardContent className="p-4 space-y-2 text-right">
                <div className="flex items-center justify-between gap-4">
                  {/* اسم العميل مع حماية التمدد النصي */}
                  <span className="font-bold text-sm text-foreground truncate">
                    {r.client?.full_name || t('review.client_fallback')}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0" dir="rtl">
                    {/* تحويل التاريخ إلى صيغة نسبية (مثل: منذ يومين) */}
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ar })}
                  </span>
                </div>
                {/* عرض النجوم بناءً على قيمة التقييم */}
                <div className="flex justify-start">
                  <StarRating rating={r.rating} />
                </div>
                {/* عرض التعليق النصي مع حماية التكسير الكلمي لمنع تشوه الواجهة */}
                {r.comment && (
                  <p className="text-sm text-foreground/90 font-medium leading-relaxed break-words whitespace-pre-wrap pt-1">
                    {r.comment}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewSection;