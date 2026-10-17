const express = require('express');
const path = require('node:path');
const crypto = require('node:crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const PRODUCTS_API_URL = 'https://script.google.com/macros/s/AKfycbx3g4PqWGLJN-nzfIZB0ecVhoXC9fGqE0EO1eGOn1hip-GraGByccyDfoerisVaSlwY/exec';
const ADMIN_PASSWORD = '163859';
const CATEGORIES = ['المفروشات', 'ملابس بيت', 'خروج', 'لانجري', 'عروض خاصة'];

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function fromApiProduct(product) {
  return {
    id: String(product.id ?? ''),
    title: String(product.name ?? ''),
    category: String(product.category ?? ''),
    price: Number(product.discount_price !== null && product.discount_price !== undefined && product.discount_price !== ''
      ? product.discount_price
      : product.price) || 0,
    image: String(product.image_url ?? ''),
    description: String(product.description ?? ''),
    available: product.in_stock !== false
  };
}

function toApiProduct(product) {
  return {
    id: product.id,
    name: product.title.trim(),
    category: product.category,
    price: Number(product.price),
    discount_price: product.discountPrice === '' || product.discountPrice == null
      ? null
      : Number(product.discountPrice),
    image_url: product.image.trim(),
    description: typeof product.description === 'string' ? product.description.trim() : '',
    in_stock: product.available !== false
  };
}

async function requestProductsApi(options = {}) {
  const response = await fetch(PRODUCTS_API_URL, options);
  const responseText = await response.text();
  let result;
  try {
    result = responseText ? JSON.parse(responseText) : null;
  } catch {
    throw new Error('استجاب خادم المنتجات ببيانات غير صالحة');
  }
  if (!response.ok) throw new Error(result?.error || 'تعذر الاتصال بخادم المنتجات');
  return result;
}

async function readProducts() {
  const result = await requestProductsApi();
  const products = Array.isArray(result) ? result : result?.products;
  if (!Array.isArray(products)) throw new Error('استجاب خادم المنتجات بتنسيق غير متوقع');
  return products.map(fromApiProduct);
}

function requireAdmin(req, res, next) {
  const supplied = Buffer.from(req.get('x-admin-password') || '');
  const expected = Buffer.from(ADMIN_PASSWORD);
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
    return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
  }
  next();
}

function validateProduct(body) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const image = typeof body.image === 'string' ? body.image.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const price = Number(body.price);
  const discountPrice = body.discountPrice === '' || body.discountPrice == null ? null : Number(body.discountPrice);
  if (!title || title.length > 120) return 'أدخل اسم منتج صحيحًا (120 حرفًا كحد أقصى)';
  if (!Number.isFinite(price) || price < 0 || price > 10000000) return 'أدخل سعرًا صحيحًا';
  if (discountPrice !== null && (!Number.isFinite(discountPrice) || discountPrice < 0 || discountPrice > price)) return 'أدخل سعر عرض صحيحًا لا يتجاوز السعر الأساسي';
  if (!CATEGORIES.includes(body.category)) return 'اختر تصنيفًا صحيحًا';
  if (!/^https?:\/\//i.test(image) || image.length > 2048) return 'أدخل رابط صورة يبدأ بـ https:// أو http://';
  if (description.length > 2000) return 'الوصف طويل جدًا';
  return null;
}

app.get('/api/products', async (req, res, next) => {
  try {
    res.json((await readProducts()).filter(product => product.available !== false));
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/products', requireAdmin, async (req, res, next) => {
  try {
    res.json(await readProducts());
  } catch (error) {
    next(error);
  }
});

app.post('/api/products', requireAdmin, async (req, res, next) => {
  try {
    const validationError = validateProduct(req.body || {});
    if (validationError) return res.status(400).json({ error: validationError });
    const product = toApiProduct({ ...req.body, id: crypto.randomUUID() });
    const result = await requestProductsApi({
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(product)
    });
    res.status(201).json(result || product);
  } catch (error) {
    next(error);
  }
});

app.use('/api', (req, res) => res.status(404).json({ error: 'المسار غير موجود' }));
app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: 'حدث خطأ في الخادم' });
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Alghazal Stores is running on port ${PORT}`);
  });
}

module.exports = app;
