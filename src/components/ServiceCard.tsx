// استيراد المكونات والأدوات الأساسية
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Service } from "@/types/service";
import StarRating from "./StarRating";
import { useAuth } from "@/hooks/useAuth";
import { Edit, Eye, CalendarCheck, MapPin, Lock } from "lucide-react";

// مكون بطاقة عرض الخدمة الواحدة في المتجر
const ServiceCard = ({ service }: { service: Service }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  
  // ترجمة التصنيف الحالي للخدمة
  const categoryLabel = t(`categories.${service.category}`) || service.category;

  // التحقق مما إذا كان المستخدم هو صاحب الخدمة الحالي
  const isOwner = user?.id === service.provider_id;

  return (
    // بطاقة الخدمة مع تأثيرات حركية عند تمرير الماوس
    <Card className="overflow-hidden rounded-3xl border-2 shadow-sm hover:shadow-xl transition-all duration-300 animate-fade-in group flex flex-col justify-between h-full bg-card">
      
      <div>
        {/* قسم الصورة: يحتوي على الصورة وشارة التصنيف */}
        <div className="relative h-48 overflow-hidden shrink-0">
          <img
            src={service.image_url || "/placeholder.svg"}
            alt={service.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            loading="lazy"
          />
          <Badge className="absolute top-3 start-3 bg-primary/90 backdrop-blur-sm text-primary-foreground border-none px-3 py-1 rounded-full text-[10px] font-bold">
            {categoryLabel}
          </Badge>
        </div>

        {/* قسم محتوى البطاقة: العنوان، المزود، الموقع */}
        <CardContent className="p-5 space-y-4">
          <div className="space-y-1 text-right">
            <h3 className="font-black text-lg text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors">
              {service.title}
            </h3>
            <div className="flex flex-col gap-1">
              {/* عرض اسم مقدم الخدمة */}
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                {t('service.by')} <span className="font-bold text-foreground/80 truncate">{service.provider?.full_name || t('service.verified_provider')}</span>
              </p>
              {/* عرض الموقع في حال توفره */}
              {service.address_name && (
                <p className="text-[11px] text-primary font-bold flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{service.address_name}</span>
                </p>
              )}
            </div>
          </div>

          {/* تقييم الخدمة وشارة التوثيق */}
          <div className="flex items-center justify-between border-y py-2 border-dashed">
            <div className="flex items-center gap-1.5">
              <StarRating rating={service.avg_rating || 0} />
              <span className="text-[10px] text-muted-foreground font-bold">
                ({service.review_count || 0})
              </span>
            </div>
            
            {/* عرض شارة موثق إذا كانت الإدارة قد وافقت على الخدمة */}
            {service.admin_status === 'approved' && (
               <Badge className="text-[9px] bg-emerald-500 text-white border-none px-2 py-0.5 rounded-full font-black">
                 {t('service.verified_badge')}
               </Badge>
            )}
          </div>
        </CardContent>
      </div>

      {/* قسم الأزرار التفاعلية أسفل البطاقة */}
      <div className="p-5 pt-0 shrink-0">
        <div className="space-y-3">
          
          {/* منطق عرض الزر بناءً على دور المستخدم (مزود، مدير، أو عميل) */}
          {role === 'provider' ? (
            isOwner ? (
              // زر تعديل الخدمة إذا كان المستخدم هو صاحبها
              <Button 
                variant="outline" 
                className="w-full rounded-2xl h-11 gap-2 border-primary text-primary font-black hover:bg-primary hover:text-white transition-all shadow-sm"
                onClick={() => navigate(`/provider/service/${service.id}`)}
              >
                <Edit className="w-4 h-4" />
                {t('service.edit_service')}
              </Button>
            ) : (
              // زر معطل إذا كان المستخدم مزود خدمة ولكن لا يملك هذه الخدمة
              <Button 
                variant="ghost" 
                disabled
                className="w-full rounded-2xl h-11 gap-2 bg-muted text-muted-foreground font-bold border-none cursor-not-allowed opacity-60"
              >
                <Lock className="w-4 h-4" />
                {t('service.booking_restricted')}
              </Button>
            )
          ) : role === 'admin' ? (
            // زر الإدارة للمدير
            <Button 
              variant="secondary" 
              className="w-full rounded-2xl h-11 gap-2 font-black shadow-sm"
              onClick={() => navigate(`/service/${service.id}`)}
            >
              <Eye className="w-4 h-4" />
              {t('service.manage_service')}
            </Button>
          ) : (
            // زر الحجز للعميل
            <Button 
              className="w-full rounded-2xl h-11 gap-2 font-black shadow-lg shadow-primary/20 transition-all active:scale-95"
              onClick={() => navigate(`/service/${service.id}`)}
            >
              <CalendarCheck className="w-4 h-4" />
              {t('service.book_now')}
            </Button>
          )}

          {/* ملاحظة الدفع */}
          <div className="flex items-center justify-center gap-1.5 opacity-60">
            <div className="h-px w-4 bg-muted-foreground/30"></div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
              {t('service.payment_note')}
            </p>
            <div className="h-px w-4 bg-muted-foreground/30"></div>
          </div>
        </div>
      </div>

    </Card>
  );
};

export default ServiceCard;