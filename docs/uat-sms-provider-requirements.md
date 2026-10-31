# متطلبات تفعيل SMS لبيئة UAT

حاليًا يستخدم التطبيق Phone Auth عبر Supabase فقط، ولا يرسل SMS ولا يملك مسار Mock OTP في النسخ الموزعة.

قبل التفعيل:

1. تفعيل Phone Auth داخل مشروع Supabase UAT فقط.
2. ربط مزود SMS معتمد داخل إعدادات Auth في UAT، مع قوالب ورسائل وحدود إرسال واضحة.
3. اختبار `POST /auth/v1/otp` و`POST /auth/v1/verify` بحساب UAT غير إنتاجي.
4. ضبط `EXPO_PUBLIC_AUTH_OTP_MODE=sms` في EAS وعدم إضافة رموز اختبار.
5. اختبار إعادة الإرسال، انتهاء الرمز، فشل الشبكة، والحدود الزمنية.
6. التحقق من Access Token وissuer وaudience مع Render UAT.
7. إبقاء Production ومفاتيحه ومزود SMS الخاص به خارج هذا الإعداد.

لا يتطلب التطبيق SQL أو Migration لتفعيل مسار Supabase Phone Auth نفسه.
