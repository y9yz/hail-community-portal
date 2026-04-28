import { Heart, GraduationCap, Users, Star } from "lucide-react";

const Footer = () => {
  const teamMembers = [
    "فواز زياد اللحيد",
    "طارق محمد الشمري",
    "حمد نبيل المطيري",
    "محمد سعدي الرشيدي",
    "يزيد متعب الشمري"
  ];

  return (
    <footer className="w-full py-12 mt-auto border-t-2 bg-card/30 backdrop-blur-md" dir="rtl">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 items-start text-center md:text-right">
          
          {/* القسم الأول: معلومات المشروع */}
          <div className="space-y-4">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <div className="bg-primary p-1.5 rounded-lg shadow-lg shadow-primary/20">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-black text-xl text-primary tracking-tighter">بوابة مجتمع حائل</h3>
            </div>
            <p className="text-sm font-bold text-muted-foreground leading-relaxed max-w-xs mx-auto md:mx-0">
              مشروع تخرج علوم الحاسب والمعلومات.
              <br />
              مصمم لخدمة أهالي منطقة حائل، بجودة مهنية ومعايير أكاديمية.
            </p>
          </div>

          {/* القسم الثاني: فريق العمل (تحت إشراف الدكتور) */}
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="flex items-center gap-2 text-primary font-black mb-1">
                <Users className="w-5 h-5" />
                <span className="text-sm uppercase tracking-widest">فريق العمل</span>
              </div>
              <h4 className="text-lg font-black text-foreground bg-primary/5 px-6 py-2 rounded-full border-2 border-primary/20 shadow-sm">
                طلاب <span className="text-primary">د. زياد المخلافي</span>
              </h4>
            </div>
            
            <div className="grid grid-cols-1 gap-1.5 pt-2">
              {teamMembers.map((member, index) => (
                <div key={index} className="group flex items-center justify-center md:justify-start gap-2">
                  <Star className="w-3 h-3 text-primary/40 group-hover:text-primary transition-colors" />
                  <p className="text-sm font-bold text-foreground/80 group-hover:text-primary transition-colors cursor-default">
                    {member}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* القسم الثالث: الحقوق الأكاديمية */}
          <div className="flex flex-col items-center justify-center space-y-4 h-full">
            <div className="bg-muted px-8 py-5 rounded-[2.5rem] border-2 border-dashed border-primary/20 shadow-inner">
              <p className="text-[10px] font-black text-muted-foreground mb-1 uppercase tracking-[0.2em]">جميع الحقوق محفوظة © 2026</p>
              <p className="text-sm font-black text-primary">جامعة حائل - كلية علوم الحاسب</p>
            </div>
            <p className="flex items-center gap-1.5 text-xs font-black text-muted-foreground/60 tracking-wide">
              صُنع حائل <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;