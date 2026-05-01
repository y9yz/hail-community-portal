import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import StarRating from "./StarRating";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Star } from "lucide-react";

interface RatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string;
  serviceTitle: string;
  bookingId: string;
  onSubmitted?: () => void;
}

const RatingDialog = ({ open, onOpenChange, serviceId, serviceTitle, bookingId, onSubmitted }: RatingDialogProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* إعادة تعيين الحقول عند فتح النافذة */
  useEffect(() => {
    if (open) {
      setRating(0);
      setComment("");
    }
  }, [open]);

  /**
   * معالجة إرسال التقييم:
   * 1. إضافة سجل جديد في جدول التقييمات (reviews).
   * 2. تحديث سجل الطلب (bookings) لوسمه كـ "تم تقييمه" لمنع التكرار.
   */
  const handleSubmit = async () => {
    if (!user || rating === 0) {
      toast.error("يرجى اختيار تقييم (عدد النجوم)");
      return;
    }

    setSubmitting(true);
    try {
      /* الخطوة الأولى: حفظ التقييم والتعليق */
      const { error: reviewError } = await supabase.from("reviews").insert({
        service_id: serviceId,
        client_id: user.id,
        rating,
        comment: comment.trim() || null,
      } as any);

      if (reviewError) throw reviewError;

      /* الخطوة الثانية: تحديث حالة الطلب لإخفاء زر التقييم من واجهة المستخدم */
      const { error: bookingError } = await supabase
        .from("bookings")
        .update({ has_review: true } as any)
        .eq("id", bookingId);

      if (bookingError) throw bookingError;

      toast.success("شكراً لك! تم إرسال تقييمك بنجاح");
      onSubmitted?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Rating Error:", err.message);
      toast.error("حدث خطأ أثناء حفظ التقييم");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-2">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            قيّم خدمة: {serviceTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground font-bold">كيف كانت تجربتك مع المزود؟</p>
            <div className="bg-muted/30 p-4 rounded-2xl">
              {/* مكون النجوم التفاعلي */}
              <StarRating rating={rating} size="md" interactive onRate={setRating} />
            </div>
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder="اكتب تعليقك هنا (اختياري)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              dir="rtl"
              className="rounded-2xl min-h-[120px] border-2 focus-visible:ring-primary resize-none p-4"
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={submitting || rating === 0} 
            className="w-full h-14 rounded-2xl text-lg font-black shadow-lg shadow-primary/20 transition-all active:scale-95"
          >
            {submitting ? "جاري الحفظ..." : "تأكيد وإرسال التقييم"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RatingDialog;