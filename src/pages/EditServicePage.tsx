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
import { categories } from "@/data/categories";
import type { Service } from "@/types/service";

// Dedicated page that opens the existing service prefilled — avoids
// reusing the "Add service" form, which previously caused confusion.
const EditServicePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [addressName, setAddressName] = useState("");
  const [mapsLink, setMapsLink] = useState("");
  const [serviceImage, setServiceImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (role !== "provider") { navigate("/"); return; }
    if (!id) return;

    (async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) { toast.error("تعذّر تحميل الخدمة"); navigate("/provider"); return; }
      if ((data as any).provider_id !== user.id) { navigate("/permission-denied"); return; }
      const s = data as any;
      setService(s);
      setTitle(s.title);
      setCategory(s.category);
      setDescription(s.description);
      setAddressName(s.address_name || "");
      setMapsLink(s.maps_link || "");
      setLoading(false);
    })();
  }, [authLoading, user, role, id, navigate]);

  const isValidUrl = (url: string) => { try { new URL(url); return true; } catch { return false; } };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service || !user) return;
    if (mapsLink && !isValidUrl(mapsLink)) { toast.error("يرجى إدخال رابط خريطة صحيح"); return; }
    setSaving(true);
    try {
      let imageUrl = service.image_url;
      if (serviceImage) {
        const ext = serviceImage.name.split(".").pop();
        const path = `${user.id}/${Date.now()}-service.${ext}`;
        const { error: imgErr } = await supabase.storage.from("public-assets").upload(path, serviceImage);
        if (imgErr) throw imgErr;
        const { data: urlData } = supabase.storage.from("public-assets").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
      const { error } = await supabase.from("services").update({
        title, category, description,
        address_name: addressName,
        maps_link: mapsLink || null,
        image_url: imageUrl,
      } as any).eq("id", service.id);
      if (error) throw error;
      toast.success("تم حفظ التعديلات");
      navigate("/provider");
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-16 text-center text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/provider")}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-extrabold text-foreground">تعديل الخدمة</h1>
        </div>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label>عنوان الخدمة</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>التصنيف</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.id !== "all").map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>وصف الخدمة</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required className="min-h-[100px]" />
              </div>

              <div className="space-y-2 border rounded-xl p-4 border-border">
                <Label className="font-bold flex items-center gap-2">📍 الموقع</Label>
                <Input placeholder="عنوان المحل" value={addressName} onChange={(e) => setAddressName(e.target.value)} />
                <Input type="url" placeholder="https://maps.google.com/..." value={mapsLink} onChange={(e) => setMapsLink(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Image className="w-4 h-4 text-primary" />
                  صورة الخدمة (اختياري — للتحديث)
                </Label>
                {service?.image_url && !serviceImage && (
                  <img src={service.image_url} alt="حالية" className="rounded-xl h-32 w-full object-cover" />
                )}
                <div
                  className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary"
                  onClick={() => imageInputRef.current?.click()}
                >
                  {serviceImage ? (
                    <p className="text-sm font-medium">{serviceImage.name}</p>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-6 h-6 text-muted-foreground mx-auto" />
                      <p className="text-xs text-muted-foreground">اضغط لاستبدال الصورة</p>
                    </div>
                  )}
                </div>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setServiceImage(e.target.files?.[0] || null)} />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1 rounded-xl" disabled={saving}>
                  {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
                </Button>
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => navigate("/provider")}>
                  إلغاء
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
