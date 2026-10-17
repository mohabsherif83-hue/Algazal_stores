# Algazal_stores
متجر إلكتروني احترافي لمفروشات العرايس والملابس الحريمي البيتي، مصمم لعرض التشكيلات وتسهيل الطلب المباشر عبر الواتساب

## التشغيل محليًا

يتطلب Node.js 18 أو أحدث.

```sh
npm install
npm start
```

افتحي `http://localhost:3000`. كلمة مرور لوحة التحكم هي `163859`. تتم قراءة المنتجات وإضافتها عبر Google Apps Script؛ لا تُحفظ المنتجات على نظام ملفات التطبيق.

## النشر

يتضمن المستودع `render.yaml` لإعداد خدمة Node على Render. لا يحتاج التطبيق إلى قرص دائم؛ المخزون محفوظ في تطبيق Google Apps Script. كلمة مرور الإدارة ثابتة على `163859` حسب إعداد المتجر؛ غيّريها في `server.js` قبل إتاحة المتجر للعامة.

يمكن تشغيل المشروع على أي استضافة Node.js تدعم Express، بما في ذلك Vercel serverless. ملف `products.json` المتبقي في المستودع لا يُقرأ أو يُكتب وقت التشغيل.

## واجهات API

- `GET /api/products` و`GET /api/admin/products` يقرآن من Google Apps Script. قراءة المخزون الإداري تتطلب ترويسة `x-admin-password`.
- `POST /api/products` يضيف المنتج إلى Google Apps Script ويتطلب ترويسة `x-admin-password`. يرسل التطبيق الحقول `id`, `name`, `category`, `price`, `discount_price`, `image_url`, `description`, و`in_stock` باستخدام `Content-Type: text/plain;charset=utf-8`. سعر العرض اختياري.
- حذف المنتجات غير موصول لأن واجهة Apps Script المحددة لا توضح عملية حذف.
