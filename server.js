const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const PRODUCTS_FILE = process.env.PRODUCTS_FILE || path.join(__dirname, 'products.json');
const INITIAL_PRODUCTS_FILE = path.join(__dirname, 'products.json');
const ADMIN_PASSWORD = '163859';
const CATEGORIES = ['المفروشات', 'ملابس بيت', 'خروج', 'لانجري', 'عروض خاصة'];

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

async function readProducts() {
  const products = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf8'));
  if (!Array.isArray(products)) throw new Error('Product database must be an array');
  return products;
}

async function writeProducts(products) {
  await fs.mkdir(path.dirname(PRODUCTS_FILE), { recursive: true });
  const temporaryFile = `${PRODUCTS_FILE}.${process.pid}.tmp`;
  await fs.writeFile(temporaryFile, `${JSON.stringify(products, null, 2)}\n`, 'utf8');
  await fs.rename(temporaryFile, PRODUCTS_FILE);
}

async function ensureProductsFile() {
  try {
    await fs.access(PRODUCTS_FILE);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await fs.mkdir(path.dirname(PRODUCTS_FILE), { recursive: true });
    await fs.copyFile(INITIAL_PRODUCTS_FILE, PRODUCTS_FILE);
  }
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
  if (!title || title.length > 120) return 'أدخل اسم منتج صحيحًا (120 حرفًا كحد أقصى)';
  if (!Number.isFinite(price) || price < 0 || price > 10000000) return 'أدخل سعرًا صحيحًا';
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
    const product = {
      id: crypto.randomUUID(),
      title: req.body.title.trim(),
      price: Number(req.body.price),
      category: req.body.category,
      image: req.body.image.trim(),
      description: typeof req.body.description === 'string' ? req.body.description.trim() : '',
      available: req.body.available !== false
    };
    const products = await readProducts();
    products.unshift(product);
    await writeProducts(products);
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/products/:id', requireAdmin, async (req, res, next) => {
  try {
    const products = await readProducts();
    const remaining = products.filter(product => product.id !== req.params.id);
    if (remaining.length === products.length) return res.status(404).json({ error: 'المنتج غير موجود' });
    await writeProducts(remaining);
    res.status(204).end();
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

ensureProductsFile().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Alghazal Stores is running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Could not initialize the product database:', error);
  process.exit(1);
});
