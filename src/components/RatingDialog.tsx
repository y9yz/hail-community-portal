import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import StarRating from "./StarRating";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setRating(0);
      setComment("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!user || rating === 0) {
      toast.error(t('rating.select_stars_error'));
      return;
    }

    setSubmitting(true);
    try {
      const { error: reviewError } = await supabase.from("reviews").insert({
        service_id: serviceId,
        client_id: user.id,
        rating,
        comment: comment.trim() || null,
      } as any);

      if (reviewError) throw reviewError;

      const { error: bookingError } = await supabase
        .from("bookings")
        .update({ has_review: true } as any)
        .eq("id", bookingId);

      if (bookingError) throw bookingError;

      toast.success(t('rating.submitted_success'));
      
      onSubmitted?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Rating Error:", err.message);
      toast.error(t('rating.save_error'));
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
            {t('rating.title', { service: serviceTitle })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground font-bold">{t('rating.prompt')}</p>
            <div className="bg-muted/30 p-4 rounded-2xl">
              <StarRating rating={rating} size="md" interactive onRate={setRating} />
            </div>
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder={t('rating.comment_placeholder')}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              dir="rtl"
              className="rounded-2xl min-h-30 border-2 focus-visible:ring-primary resize-none p-4"
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={submitting || rating === 0} 
            className="w-full h-14 rounded-2xl text-lg font-black shadow-lg shadow-primary/20 transition-all active:scale-95"
          >
            {submitting ? t('rating.saving') : t('rating.submit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RatingDialog;