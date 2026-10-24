import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/button";

type Shot = { src: string; w: number; h: number; en: string; ar: string };
const SHOTS: Record<string, Shot[]> = {
  account: [
    { src: "/demo/signup-ar.jpg", w: 1440, h: 900, en: "Sign up (Arabic)", ar: "إنشاء حساب" },
    { src: "/demo/account.jpg", w: 1280, h: 1042, en: "My account: orders and saved designs", ar: "حسابي: الطلبات والتصاميم المحفوظة" },
    { src: "/demo/order-en.jpg", w: 1280, h: 1598, en: "Order tracking", ar: "تتبع الطلب" },
    { src: "/demo/pay-ar.jpg", w: 390, h: 2642, en: "Pay box on phone (Arabic)", ar: "الدفع على الهاتف" },
  ],
  checkout: [{ src: "/demo/checkout.jpg", w: 1280, h: 1666, en: "Checkout", ar: "إتمام الطلب" }],
  admin: [
    { src: "/demo/admin-list.jpg", w: 1280, h: 1226, en: "Admin: orders list", ar: "الإدارة: قائمة الطلبات" },
    { src: "/demo/admin-order.jpg", w: 1280, h: 2025, en: "Admin: order detail", ar: "الإدارة: تفاصيل الطلب" },
  ],
};

export function DemoNotice({ locale, area }: { locale: string; area: "account" | "checkout" | "admin" }) {
  const ar = locale === "ar";
  const shots = area === "checkout" ? [...SHOTS.checkout!, ...SHOTS.account!.slice(2)] : SHOTS[area]!;
  return (
    <div className="container-page py-10 lg:py-14">
      <p className="text-sm font-semibold text-brand-700">{ar ? "معاينة" : "Preview"}</p>
      <h1 className="mt-2 text-h2 font-semibold text-navy-950 text-balance">
        {ar ? "هذا الجزء يعمل على الموقع الحقيقي" : "This part runs on the live website"}
      </h1>
      <p className="mt-3 max-w-2xl text-ink-muted">
        {ar
          ? "الحسابات والطلبات والدفع ولوحة الإدارة تحتاج إلى خادم الموقع وقاعدة البيانات، لذلك لا تعمل في هذه المعاينة. تم بناؤها واختبارها، وهذا شكلها:"
          : "Accounts, orders, payment and the admin area need the website's server and database, so they don't run in this preview. They are built and tested. Here is how they look:"}
      </p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {shots.map((s) => (
          <figure key={s.src} className="overflow-hidden rounded-2xl bg-white ring-1 ring-line">
            <div className="max-h-[560px] overflow-auto bg-navy-50">
              <Image src={s.src} alt={ar ? s.ar : s.en} width={s.w} height={s.h} className={s.w < 500 ? "mx-auto w-full max-w-[340px]" : "w-full"} />
            </div>
            <figcaption className="px-4 py-3 text-sm font-medium text-navy-900">{ar ? s.ar : s.en}</figcaption>
          </figure>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/thesis-builder" className={buttonClasses("primary", "md")}>{ar ? "جرّب أداة التصميم ثلاثية الأبعاد" : "Try the 3D builder"}</Link>
        <Link href="/" className={buttonClasses("secondary", "md")}>{ar ? "الصفحة الرئيسية" : "Home"}</Link>
      </div>
    </div>
  );
}
