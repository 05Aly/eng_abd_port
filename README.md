# Abdullah Adel Portfolio (React + Vite + Supabase)

بورتفوليو React فيه صفحة أدمن سرية لإضافة المشاريع (بالصور) من الموقع نفسه.
القاعدة والصور والحماية (RLS) على Supabase.

## 1) التشغيل على جهازك

```bash
npm install
cp .env.example .env      # على Windows: copy .env.example .env
npm run dev
```

افتح `http://localhost:5173`

## 2) إعداد Supabase (مرة واحدة)

1. أنشئ مشروع على https://supabase.com
2. من **Project Settings > API** انسخ `Project URL` و `anon public key` وحطهم في `.env`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
   لا تضع `service_role` key في أي مكان في المشروع.
3. من **SQL Editor** شغّل الملفين بالترتيب:
   1. `supabase/schema.sql`
   2. `supabase/storage.sql`
4. من **Authentication > Users > Add user** اعمل حسابك (إيميل + باسورد قوي).
5. في SQL Editor شغّل السطر ده (غيّر الإيميل):
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'YOUR_EMAIL_HERE';
   ```
6. من **Authentication > Providers > Email** اقفل **Allow new users to sign up** عشان محدش يسجل لنفسه.

## 3) صفحة الأدمن

| الرابط | الوظيفة |
|---|---|
| `/admin_add/login` | تسجيل الدخول |
| `/admin_add` | لوحة إضافة المشاريع (لو مش مسجل بيرجعك للموقع الرئيسي) |

من اللوحة: أضف مشروع (عنوان، تصنيف، سنة، وصف، تقنيات، لينكات، صورة من جهازك)، أخفِ/أظهِر، احذف.
الصور بتتخزن في Supabase Storage (bucket `project-images`) مش على السيرفر. الحد الأقصى 5MB، JPG/PNG/WebP.

## 4) النشر على Vercel

```bash
npm run build        # بيعمل مجلد dist
```

- ارفع المشروع على GitHub وربطه بـ Vercel (Framework: Vite).
- في **Settings > Environment Variables** أضف `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY`.
- `vercel.json` فيه إعادة التوجيه للـ SPA (عشان `/admin_add` يشتغل) وكل الـ security headers (CSP, HSTS, ...).

بعد النشر اعمل Redeploy لو غيّرت المتغيرات.

## 5) الأمان باختصار

- RLS مفعّل ومفروض على كل الجداول: الزوار بيقروا المشاريع المنشورة بس، والكتابة للأدمن بس (`is_admin()`).
- Storage: القراءة عامة بالروابط، والرفع/الحذف للأدمن بس، مع حد للحجم ونوع الملف.
- الجلسة في كوكيز `SameSite=Strict` (+ `Secure` على https). كوكيز المتصفح مش `HttpOnly`، فالحماية الأساسية هي RLS و CSP.
- تسجيل الدخول: رسالة خطأ موحدة وقفل مؤقت بعد 5 محاولات.
- كود الأدمن في ملفات منفصلة ومفيش أي رابط ليه في الواجهة العادية.

## تعديل المحتوى

- النصوص والمهارات: `src/pages/Home.jsx`
- الألوان والترانزيشنز: `src/styles.css`
- شاشات الأدمن: `src/extra.css`
