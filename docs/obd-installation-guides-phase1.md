# دليل تركيب جهاز مفك OBD-II - المرحلة الأولى

## نتيجة الفحص

- جدول المركبات الحالي هو `public.vehicles` وفيه الحقول الأساسية `user_id`, `make`, `model`, `year`, `plate_number`, `odometer_km`, `fuel_type`, `adapter_mac`, `health_score`, `image_url`.
- المركبات مرتبطة بالمستخدمين عبر `user_id -> public.users(id)`، وسياسات RLS الحالية تسمح للمستخدم بإدارة مركباته فقط وتسمح للإدارة بقراءة كل المركبات.
- لا توجد جداول مرجعية حالية للماركات أو الموديلات أو الأجيال، لذلك لا يوجد ما يكرر الغرض المطلوب.
- ملفات Supabase الحالية موجودة في `supabase1/supabase`، وأسلوبها SQL مباشر مع `create table if not exists`, `drop policy if exists`, وRLS.
- الاتصال بـ Supabase في الويب والجوال يتم عبر REST/Auth helpers داخل `artifacts/mfk-web/src/lib/supabase.ts` و`artifacts/mfk-mobile/lib/supabase.ts`.
- صفحة تفاصيل المركبة موجودة في الويب والجوال، لكن المرحلة الأولى لا تضيف UI حسب الطلب.
- تخزين الصور الحالي غير واضح كبنية Supabase Storage؛ الموجود الآن حقول URL نصية مثل `vehicles.image_url`. لذلك جعلت صور خطوات الدليل وبلاغات العملاء URL اختياري فقط، بدون bucket جديد.

## مخطط الجداول النهائي

- `vehicle_makes`: كتالوج الشركات.
- `vehicle_models`: كتالوج الموديلات المرتبطة بالشركات.
- `vehicle_model_aliases`: أسماء بديلة للموديلات مع normalized alias، لحل اختلافات مثل `إلنترا` و`إيلانترا`.
- `vehicle_generations`: الأجيال ونطاق السنوات والسوق `GCC`.
- `obd_installation_guides`: دليل واحد اختياري لكل جيل، يبدأ غير منشور `is_published = false`.
- `obd_installation_steps`: خطوات الدليل مرتبة.
- `obd_guide_feedback`: تقييم/بلاغ المستخدم بعد محاولة التركيب.
- أعمدة اختيارية على `vehicles`: `vehicle_model_id`, `vehicle_generation_id`, `market`.

## Migration المقترح

الملف:

`supabase1/supabase/20260802_obd_installation_guides_phase1.sql`

لم يتم تطبيقه على Supabase production. الملف قابل للمراجعة والتشغيل اليدوي بعد الموافقة.

## سياسات RLS

- المستخدم المصادق يقرأ كتالوج الشركات/الموديلات/الأجيال النشطة فقط.
- المستخدم يقرأ أدلة التركيب المنشورة فقط.
- المستخدم يقرأ خطوات الأدلة المنشورة فقط.
- المستخدم يضيف feedback فقط إذا كان `user_id = auth.uid()` والمركبة مملوكة له فعليًا في `vehicles`.
- المستخدم يقرأ feedback الخاص به فقط.
- الإدارة عبر `public.current_user_is_admin()` تستطيع إدارة الكتالوج، الأدلة، الخطوات، والبلاغات.
- لم يتم استخدام service role في الواجهة.

## بيانات Seed

تمت إضافة seed idempotent للدفعة الأولى:

- Toyota Land Cruiser 2008-2021 GCC
- Toyota Land Cruiser 2022-2026 GCC
- Nissan Patrol 2020-2024 GCC
- Nissan Patrol 2025-2026 GCC
- Hyundai Elantra 2021-2026 GCC
- Toyota Corolla 2023 GCC
- Ford Edge 2026 GCC
- Kia K8 2026 GCC
- Kia Sportage 2026 GCC

كل الأدلة الأولية غير منشورة، ولا تحتوي مواقع منافذ أو صور أو مصادر مخترعة.

## Rollback

الملف:

`supabase1/supabase/20260802_obd_installation_guides_phase1_rollback.sql`

يحذف فقط الجداول والدوال والأعمدة التي أضافتها هذه المرحلة.

## قرارات تحتاج موافقتك قبل المرحلة الثانية

- هل نعتمد مسار عرض الدليل في الويب أولًا أم الجوال أولًا؟
- هل تريد نشر بعض الأدلة يدويًا بعد إدخال مواقع منافذ موثقة، أم تبقى كلها `draft` إلى أن تضيفها الإدارة؟
- هل نضيف Supabase Storage bucket لاحقًا لصور الأدلة، أم نكتفي بروابط خارجية/داخلية موثقة؟
