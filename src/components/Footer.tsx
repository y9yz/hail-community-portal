import { Heart, GraduationCap, Users } from "lucide-react";

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start text-center md:text-right">
          
          {/* القسم الأول: معلومات المشروع */}
          <div className="space-y-4">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <div className="bg-primary p-1.5 rounded-lg">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-black text-xl text-primary tracking-tighter">بوابة مجتمع حائل</h3>
            </div>
            <p className="text-sm font-bold text-muted-foreground leading-relaxed max-w-xs mx-auto md:mx-0">
              مشروع تخرج علوم الحاسب والمعلومات.
              <br />
              مصمم لخدمة أهالي منطقة حائل.
            </p>
          </div>

          {/* القسم الثاني: فريق العمل (الأسماء بالعربي) */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-primary font-black">
              <Users className="w-5 h-5" />
              <span>فريق العمل</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {teamMembers.map((member, index) => (
                <p key={index} className="text-sm font-bold text-foreground/80 hover:text-primary transition-colors cursor-default">
                  {member}
                </p>
              ))}
            </div>
          </div>

          {/* القسم الثالث: الحقوق الأكاديمية */}
          <div className="flex flex-col items-center justify-center space-y-4 h-full">
            <div className="bg-muted px-6 py-4 rounded-[2rem] border-2 border-dashed border-primary/20">
              <p className="text-xs font-black text-muted-foreground mb-1 uppercase tracking-widest">جميع الحقوق محفوظة © 2026</p>
              <p className="text-sm font-black text-primary">جامعة حائل - كلية علوم الحاسب</p>
            </div>
            <p className="flex items-center gap-1.5 text-xs font-black text-muted-foreground/60 tracking-wide">
              صُنع في حائل <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;