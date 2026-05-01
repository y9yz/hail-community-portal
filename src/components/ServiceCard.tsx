import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { Service } from "@/types/service";
import { categories } from "@/data/categories";
import StarRating from "./StarRating";
import { useAuth } from "@/hooks/useAuth";
import { Edit, Eye, CalendarCheck, MapPin } from "lucide-react";

const ServiceCard = ({ service }: { service: Service }) => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  
  // استخراج اسم التصنيف من ملف البيانات بناءً على معرف التصنيف
  const categoryLabel = categories.find((c) => c.id === service.category)?.label ?? service.category;

  // التحقق مما إذا كان المستخدم المسجل هو نفسه صاحب الخدمة
  const isOwner = user?.id === service.provider_id;

  return (
    <Card className="overflow-hidden rounded-3xl border-2 shadow-sm hover:shadow-xl transition-all duration-300 animate-fade-in group">
      
      {/* عرض صورة الخدمة مع تأثير التكبير عند تمرير الماوس وشارة التصنيف */}
      <div className="relative h-48 overflow-hidden">
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

      <CardContent className="p-5 space-y-4">
        {/* تفاصيل الخدمة: العنوان، اسم المزود، والموقع الجغرافي */}
        <div className="space-y-1">
          <h3 className="font-black text-lg text-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors">
            {service.title}
          </h3>
          <div className="flex flex-col gap-1">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              بواسطة: <span className="font-bold text-foreground/80">{service.provider?.full_name || "مزود موثق"}</span>
            </p>
            {service.address_name && (
              <p className="text-[11px] text-primary font-bold flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {service.address_name}
              </p>
            )}
          </div>
        </div>

        {/* عرض متوسط التقييمات وشارة "موثق" إذا تمت الموافقة من الإدارة */}
        <div className="flex items-center justify-between border-y py-2 border-dashed">
          <div className="flex items-center gap-1.5">
            <StarRating rating={service.avg_rating || 0} />
            <span className="text-[10px] text-muted-foreground font-bold">
              ({service.review_count || 0})
            </span>
          </div>
          
          {service.admin_status === 'approved' && (
             <Badge className="text-[9px] bg-emerald-500 text-white border-none px-2 py-0.5 rounded-full">
               موثق ✓
             </Badge>
          )}
        </div>

        {/* منطق الأزرار التفاعلية حسب نوع المستخدم:
            1. المزود صاحب الخدمة: يظهر له زر "تعديل".
            2. المشرف (Admin): يظهر له زر "إدارة".
            3. العميل/الزائر: يظهر له زر "حجز".
        */}
        <div className="pt-1 space-y-3">
          {role === 'provider' && isOwner ? (
            <Button 
              variant="outline" 
              className="w-full rounded-2xl h-11 gap-2 border-primary text-primary font-black hover:bg-primary hover:text-white transition-all shadow-sm"
              onClick={() => navigate(`/provider/service/${service.id}`)}
            >
              <Edit className="w-4 h-4" />
              تعديل الخدمة
            </Button>
          ) : role === 'admin' ? (
            <Button 
              variant="secondary" 
              className="w-full rounded-2xl h-11 gap-2 font-black shadow-sm"
              onClick={() => navigate(`/service/${service.id}`)}
            >
              <Eye className="w-4 h-4" />
              إدارة الخدمة
            </Button>
          ) : (
            <Button 
              className="w-full rounded-2xl h-11 gap-2 font-black shadow-lg shadow-primary/20 transition-all active:scale-95"
              onClick={() => navigate(`/service/${service.id}`)}
            >
              <CalendarCheck className="w-4 h-4" />
              حجز الخدمة الآن
            </Button>
          )}
          
          {/* نص توضيحي بأسفل البطاقة حول آلية الدفع */}
          <div className="flex items-center justify-center gap-1.5 opacity-60">
             <div className="h-px w-4 bg-muted-foreground/30"></div>
             <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
               دفع مباشر لمقدم الخدمة
             </p>
             <div className="h-px w-4 bg-muted-foreground/30"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceCard;