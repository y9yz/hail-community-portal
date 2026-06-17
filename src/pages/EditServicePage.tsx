// استيراد المكتبات والمكونات الأساسية المطلوبة
import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Image, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';
import { categories } from "@/data/categories";
import type { Service } from "@/types/service";

// تعريف مكون صفحة تعديل الخدمة
const EditServicePage = () => {
  // جلب معرف الخدمة من الرابط وأدوات التنقل والترجمة
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  
  // تعريف متغيرات الحالة لتخزين تفاصيل الخدمة وحالة التحميل
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  // تعريف متغيرات الحالة الخاصة بحقول النموذج
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [addressName, setAddressName] = useState("");
  const [mapsLink, setMapsLink] = useState("");
  const [serviceImage, setServiceImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // جلب بيانات الخدمة والتأكد من أن المستخدم الحالي هو مالك الخدمة
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (role !== "provider") { navigate("/"); return; }
    if (!id) return;

    let mounted = true;

    const fetchServiceDetails = async () => {
      try {
        // الاستعلام عن بيانات الخدمة المحددة من قاعدة البيانات
        const { data, error } = await supabase
          .from("services")
          .select("*")
          .eq("id", id)
          .single();
        
        if (error || !data) {
          toast.error(t('service.load_failed'));
          navigate("/provider");
          return;
        }

        // منع المستخدم من تعديل خدمات لا يملكها
        if ((data as any).provider_id !== user.id) {
          navigate("/permission-denied");
          return;
        }

        // تعبئة حقول النموذج بالبيانات الحالية للخدمة
        if (mounted) {
          const s = data as any;
          setService(s);
          setTitle(s.title);
          setCategory(s.category);
          setDescription(s.description);
          setAddressName(s.address_name || "");
          setMapsLink(s.maps_link || "");
        }
      } catch (err) {
        console.error("Error loading service:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchServiceDetails();

    // إيقاف التحديثات عند مغادرة الصفحة
    return () => {
      mounted = false; 
    };
  }, [authLoading, user, role, id, navigate, t]);

  // دالة مساعدة للتحقق من صحة صيغة الرابط الإلكتروني
  const isValidUrl = (url: string) => { try { new URL(url); return true; } catch { return false; } };

  // معالجة حفظ التعديلات وإرسالها إلى قاعدة البيانات
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service || !user) return;
    
    // التحقق من صحة رابط الخريطة إذا تم إدخاله
    if (mapsLink && !isValidUrl(mapsLink)) { toast.error(t('service.invalid_map_link')); return; }
    
    setSaving(true);
    try {
      let imageUrl = service.image_url;
      
      // رفع الصورة الجديدة وتحديث الرابط إذا قام المستخدم باختيار صورة جديدة
      if (serviceImage) {
        const ext = serviceImage.name.split(".").pop();
        const path = `${user.id}/${Date.now()}-service.${ext}`;
        const { error: imgErr } = await supabase.storage.from("public-assets").upload(path, serviceImage);
        if (imgErr) throw imgErr;
        const { data: urlData } = supabase.storage.from("public-assets").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      // إرسال البيانات المحدثة إلى جدول الخدمات
      const { error } = await supabase.from("services").update({
        title, category, description,
        address_name: addressName,
        maps_link: mapsLink || null,
        image_url: imageUrl,
      } as any).eq("id", service.id);

      if (error) throw error;
      
      toast.success(t('service.saved'));
      navigate("/provider");
    } catch (err: any) {
      toast.error(err.message || t('service.generic_error'));
    } finally {
      setSaving(false);
    }
  };

  // واجهة التحميل التي تظهر قبل جاهزية البيانات
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Navbar />
        <div className="container py-16 text-center text-muted-foreground font-bold animate-pulse">{t('service.loading')}</div>
      </div>
    );
  }

  // واجهة الصفحة الرئيسية المكونة من نموذج التعديل
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      
      {/* الشريط العلوي لعنوان الصفحة وزر الرجوع */}
      <header className="sticky top-16 z-40 bg-card/80 backdrop-blur-lg border-b">
        <div className="container flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/provider")} className="rounded-full hover:bg-muted">
              <ArrowRight className="w-5 h-5 text-primary rtl:-scale-x-100" />
            </Button>
            <h1 className="text-2xl font-black text-foreground tracking-tighter">{t('service.edit_title')}</h1>
          </div>
        </div>
      </header>
      
      <div className="container py-6 max-w-2xl text-right">
        <Card className="rounded-2xl border-2 shadow-sm">
          <CardContent className="p-6">
            
            {/* نموذج إدخال وتعديل البيانات */}
            <form onSubmit={handleSave} className="space-y-4">
              
              <div className="space-y-2">
                <Label className="font-bold text-sm">{t('service.title_label')}</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl h-11" required />
              </div>
              
              <div className="space-y-2">
                <Label className="font-bold text-sm">{t('service.category_label')}</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.id !== "all").map(c => (
                      <SelectItem key={c.id} value={c.id} className="font-semibold">{t(c.label)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="font-bold text-sm">{t('service.description_label')}</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required className="min-h-[120px] rounded-xl resize-none p-3" />
              </div>

              {/* قسم تعديل تفاصيل الموقع والخريطة */}
              <div className="space-y-3 border-2 rounded-2xl p-4 bg-muted/10 border-dashed">
                <Label className="font-black text-sm flex items-center gap-2 text-primary">📍 {t('service.location_label')}</Label>
                <Input placeholder="عنوان المحل أو الحي (مثال: حي النقرة)" value={addressName} onChange={(e) => setAddressName(e.target.value)} className="rounded-xl h-11 bg-background" />
                <Input type="url" placeholder={t('service.map_placeholder')} value={mapsLink} onChange={(e) => setMapsLink(e.target.value)} className="rounded-xl h-11 bg-background" />
              </div>

              {/* قسم معاينة وتعديل صورة الخدمة */}
              <div className="space-y-2">
                <Label className="font-bold text-sm flex items-center gap-2">
                  <Image className="w-4 h-4 text-primary" />
                  {t('service.image_label')}
                </Label>
                
                {/* عرض معاينة الصورة الحالية أو الجديدة المختارة */}
                {(serviceImage || service?.image_url) && (
                  <div className="rounded-2xl h-40 w-full overflow-hidden border-2 mb-2 relative animate-in fade-in duration-300">
                    <img 
                      src={serviceImage ? URL.createObjectURL(serviceImage) : service?.image_url} 
                      alt={t('service.current_image_alt')} 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute bottom-2 start-2 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-xl text-[10px] font-bold">
                      {serviceImage ? "معاينة الملف المختار حالياً" : t('service.current_image_alt')}
                    </div>
                  </div>
                )}
                
                <div
                  className="border-2 border-dashed border-border rounded-2xl p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => imageInputRef.current?.click()}
                >
                  {serviceImage ? (
                      <p className="text-sm font-black text-primary italic truncate">✓ {serviceImage.name}</p>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-6 h-6 text-muted-foreground mx-auto animate-bounce" />
                      <p className="text-xs text-muted-foreground font-bold">{t('service.replace_image_prompt')}</p>
                    </div>
                  )}
                </div>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setServiceImage(e.target.files?.[0] || null)} />
              </div>

              {/* أزرار الحفظ والإلغاء */}
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1 rounded-xl h-12 font-black text-md shadow-md" disabled={saving}>
                  {saving ? t('service.saving') : t('service.save_btn')}
                </Button>
                <Button type="button" variant="outline" className="rounded-xl h-12 font-bold" onClick={() => navigate("/provider") }>
                  {t('common.back')}
                </Button>
              </div>
              
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditServicePage;
