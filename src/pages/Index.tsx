import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import ServiceCard from "@/components/ServiceCard";
import { categories } from "@/data/categories";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Service } from "@/types/service";
import heroImage from "@/assets/hero-hail.jpg";

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { role, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("newest");

  /* 
      1. توجيه المستخدمين (Role-based Redirect): 
      المتجر مخصص للعملاء والزوار فقط؛ المشرف والمزود يتم تحويلهم فوراً.
  */
  useEffect(() => {
    if (authLoading) return;
    if (role === "admin") { navigate("/admin", { replace: true }); return; }
    if (role === "provider") { navigate("/provider", { replace: true }); return; }
  }, [role, authLoading, navigate]);

  /* 
      2. جلب الخدمات المعتمدة فقط مع صمام أمان لمنع وميض البيانات والـ Memory Leaks
  */
  useEffect(() => {
    let mounted = true;

    const fetchServices = async () => {
      try {
        const { data: svcData } = await supabase
          .from("services")
          .select("*, provider:profiles!services_provider_id_fkey(full_name)")
          .eq("admin_status", "approved" as any)
          .order("created_at", { ascending: false });

        const svcs = (svcData as any[]) || [];

        if (svcs.length > 0) {
          const serviceIds = svcs.map((s) => s.id);
          const { data: reviewData } = await supabase
            .from("reviews")
            .select("service_id, rating")
            .in("service_id", serviceIds);

          // بناء خارطة (Map) لإحصائيات التقييم لرفع كفاءة المعالجة
          const reviewStats: Record<string, { sum: number; count: number }> = {};
          (reviewData || []).forEach((r: any) => {
            if (!reviewStats[r.service_id]) reviewStats[r.service_id] = { sum: 0, count: 0 };
            reviewStats[r.service_id].sum += r.rating;
            reviewStats[r.service_id].count += 1;
          });

          // دمج النتائج مع مصفوفة الخدمات الأساسية
          svcs.forEach((s) => {
            const stats = reviewStats[s.id];
            s.avg_rating = stats ? stats.sum / stats.count : 0;
            s.review_count = stats ? stats.count : 0;
          });
        }

        if (mounted) {
          setServices(svcs);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching services:", error);
        if (mounted) setLoading(false);
      }
    };

    // 🚀 صمام الأمان: لا تجلب الخدمات من السيرفر إذا كان المستخدم سيتم طرده (أدمن أو مزود)
    if (!authLoading && role !== "admin" && role !== "provider") {
      fetchServices();
    }

    return () => {
      mounted = false; // إلغاء تفعيل التحديثات الخلفية عند الخروج من الصفحة
    };
  }, [authLoading, role]);

  /* 
      3. التصفية والفرز الصارم والمقاوم للتلاعب الواجهي
  */
  const filtered = useMemo(() => {
    let result = services.filter((s) => {
      const lowerQuery = searchQuery.toLowerCase();
      const matchesSearch = s.title.toLowerCase().includes(lowerQuery);
      const matchesCategory = activeCategory === "all" || s.category === activeCategory;
      return matchesSearch && matchesCategory;
    });

    if (sortBy === "rating") {
      result = [...result].sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
    } else if (sortBy === "newest") {
      // 🚀 ترتيب حتمي صارم يعتمد على الطابع الزمني للخدمة عند التبديل العكسي
      result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [services, searchQuery, activeCategory, sortBy]);

  // حاجز عرض مؤقت لمنع وميض الهيكل الإنشائي أثناء تحديد الرتبة الصارمة
  if (authLoading || role === "admin" || role === "provider") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* قسم الـ Hero: واجهة ترحيبية بتأثير Gradient لتحسين قراءة النصوص */}
      <section className="relative h-72 md:h-96 overflow-hidden">
        <img src={heroImage} alt="مدينة حائل" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-3xl md:text-5xl font-extrabold text-foreground mb-3 drop-shadow-sm">
            {t('home.hero_title')}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-lg">
            {t('home.hero_subtitle')}
          </p>
        </div>
      </section>

      <div className="container py-6">
        {/* أدوات التحكم: تصفية حسب التصنيف وترتيب النتائج */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <Badge
                key={cat.id}
                variant={activeCategory === cat.id ? "default" : "outline"}
                className="cursor-pointer text-sm px-4 py-2 rounded-xl transition-colors"
                onClick={() => setActiveCategory(cat.id)}
              >
                {t(cat.label)}
              </Badge>
            ))}
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48 rounded-xl">
              <SelectValue placeholder={t('home.sort_by_placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t('home.sort_newest')}</SelectItem>
              <SelectItem value="rating">{t('home.sort_rating')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <main className="container pb-16">
        {loading ? (
          <p className="text-center text-muted-foreground py-16">{t('home.loading')}</p>
        ) : (
          <>
            {/* عرض شبكة الخدمات المستجيبة (Responsive Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
            
            {/* حالة عدم وجود نتائج */}
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-16 text-lg">
                {t('home.no_services')}
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Index;