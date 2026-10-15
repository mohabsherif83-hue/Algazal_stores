const CATEGORIES = ['الكل', 'المفروشات', 'ملابس بيت', 'خروج', 'لانجري', 'عروض خاصة'];
const STORE_WHATSAPP = '201275529199';
const LOGO_DRIVE_URL = 'https://drive.google.com/file/d/1RDcDFMWaIqC6K891s4sWlf5mdUq2vIKW/view?usp=drivesdk';
const state = {
  products: [],
  category: 'الكل',
  query: '',
  cart: new Map(),
  adminPassword: '',
  toastTimer: null
};
const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));
const formatPrice = price => `${new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(Number(price) || 0)} ج.م`;
const parseLocalizedInteger = value => {
  const westernDigits = String(value).replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  return Number(westernDigits) || 1;
};

function driveImageUrl(value) {
  const url = String(value || '').trim();
  try {
    const parsed = new URL(url);
    if (!/^(www\.)?drive\.google\.com$/i.test(parsed.hostname)) return url;
    const pathMatch = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
    const id = pathMatch?.[1] || parsed.searchParams.get('id');
    return id && /^[a-zA-Z0-9_-]+$/.test(id)
      ? `https://lh3.googleusercontent.com/d/${id}`
      : url;
  } catch {
    return url;
  }
}

function setLogoUrl() {
  const logo = $('.brand-logo');
  logo.src = driveImageUrl(LOGO_DRIVE_URL);
  logo.addEventListener('error', () => {
    logo.hidden = true;
    $('.brand-name').classList.add('brand-name-only');
  }, { once: true });
}

function renderCategories() {
  $('#category-filters').innerHTML = CATEGORIES.map(category => `
    <button class="filter-chip${category === state.category ? ' active' : ''}" type="button" data-category="${escapeHtml(category)}" aria-pressed="${category === state.category}">${escapeHtml(category)}</button>
  `).join('');
  $('#category-nav').innerHTML = CATEGORIES.slice(1).map(category => `
    <a class="${category === state.category ? 'active' : ''}" href="#shop" data-nav-category="${escapeHtml(category)}">${escapeHtml(category)}</a>
  `).join('');
}

function filteredProducts() {
  const query = state.query.trim().toLocaleLowerCase('ar');
  return state.products.filter(product => {
    const matchesCategory = state.category === 'الكل' || product.category === state.category;
    const searchable = `${product.title} ${product.category} ${product.description || ''}`.toLocaleLowerCase('ar');
    return matchesCategory && (!query || searchable.includes(query));
  });
}

function renderProducts() {
  const products = filteredProducts();
  $('#product-count').textContent = `${new Intl.NumberFormat('ar-EG').format(products.length)} منتجات`;
  $('#empty-state').hidden = products.length > 0;
  $('#products-grid').innerHTML = products.map((product, index) => `
    <article class="product-card" style="animation-delay:${Math.min(index * 45, 300)}ms">
      <div class="product-image-wrap">
        <img class="product-image" src="${escapeHtml(driveImageUrl(product.image))}" alt="${escapeHtml(product.title)}" loading="lazy" data-fallback="${index % 2 ? 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80' : 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80'}">
        <span class="product-badge">${escapeHtml(product.category)}</span>
        <button class="quick-view-button" type="button" data-quick-view="${escapeHtml(product.id)}">نظرة سريعة</button>
      </div>
      <div class="product-info">
        <span class="product-category">${escapeHtml(product.category)}</span>
        <h3 class="product-title">${escapeHtml(product.title)}</h3>
        <p class="product-price">${formatPrice(product.price)}</p>
        <div class="product-actions"><button class="add-button" type="button" data-add="${escapeHtml(product.id)}"><span aria-hidden="true">+</span> أضف للسلة</button></div>
      </div>
    </article>
  `).join('');
  $('#products-grid').querySelectorAll('img[data-fallback]').forEach(image => image.addEventListener('error', () => {
    image.src = image.dataset.fallback;
    image.removeAttribute('data-fallback');
  }, { once: true }));
}

async function loadProducts() {
  $('#load-error').hidden = true;
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error('تعذر تحميل المنتجات');
    state.products = await response.json();
    renderProducts();
    renderCart();
  } catch (error) {
    $('#load-error').hidden = false;
    showToast(error.message || 'تعذر الاتصال بالخادم');
  }
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function addToCart(id, quantity = 1) {
  if (!state.products.some(product => product.id === id)) return;
  state.cart.set(id, (state.cart.get(id) || 0) + quantity);
  renderCart();
  showToast('أُضيف المنتج إلى سلتكِ');
}

function cartTotals() {
  return [...state.cart.entries()].reduce((result, [id, quantity]) => {
    const product = state.products.find(item => item.id === id);
    if (!product) return result;
    result.quantity += quantity;
    result.total += Number(product.price) * quantity;
    return result;
  }, { quantity: 0, total: 0 });
}

function renderCart() {
  const entries = [...state.cart.entries()].filter(([id]) => state.products.some(product => product.id === id));
  const totals = cartTotals();
  $('#cart-count').textContent = new Intl.NumberFormat('ar-EG').format(totals.quantity);
  $('#cart-total').textContent = formatPrice(totals.total);
  $('#cart-empty').hidden = entries.length > 0;
  $('#cart-items').hidden = entries.length === 0;
  $('#checkout-open').disabled = entries.length === 0;
  $('#cart-items').innerHTML = entries.map(([id, quantity]) => {
    const product = state.products.find(item => item.id === id);
    return `<article class="cart-line">
      <img src="${escapeHtml(driveImageUrl(product.image))}" alt="" loading="lazy">
      <div class="cart-line-info"><span class="product-category">${escapeHtml(product.category)}</span><h3>${escapeHtml(product.title)}</h3><p>${formatPrice(product.price)}</p>
        <div class="cart-line-tools"><div class="qty-control"><button type="button" data-quantity="-1" data-id="${escapeHtml(id)}" aria-label="تقليل الكمية">−</button><span>${new Intl.NumberFormat('ar-EG').format(quantity)}</span><button type="button" data-quantity="1" data-id="${escapeHtml(id)}" aria-label="زيادة الكمية">+</button></div><button class="remove-button" type="button" data-remove="${escapeHtml(id)}">حذف</button></div>
      </div><span></span>
    </article>`;
  }).join('');
}

function openCart() {
  $('#overlay').hidden = false;
  requestAnimationFrame(() => $('#overlay').classList.add('visible'));
  $('#cart-drawer').classList.add('open');
  $('#cart-drawer').setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  $('#cart-drawer').classList.remove('open');
  $('#cart-drawer').setAttribute('aria-hidden', 'true');
  $('#overlay').classList.remove('visible');
  document.body.style.overflow = '';
  setTimeout(() => { if (!$('#cart-drawer').classList.contains('open')) $('#overlay').hidden = true; }, 260);
}

function showQuickView(id) {
  const product = state.products.find(item => item.id === id);
  if (!product) return;
  $('#quick-view-content').innerHTML = `
    <img class="quick-image" src="${escapeHtml(driveImageUrl(product.image))}" alt="${escapeHtml(product.title)}">
    <div class="quick-details"><span class="product-category">${escapeHtml(product.category)}</span><h2 id="quick-title">${escapeHtml(product.title)}</h2><p>${escapeHtml(product.description || 'قطعة مختارة بعناية من الغزال ستورز.')}</p><p class="quick-price">${formatPrice(product.price)}</p><div class="qty-control"><button type="button" data-quick-qty="-1" aria-label="تقليل الكمية">−</button><span id="quick-quantity">١</span><button type="button" data-quick-qty="1" aria-label="زيادة الكمية">+</button></div><button class="primary-button quick-add" type="button" data-quick-add="${escapeHtml(product.id)}">أضف للسلة</button></div>
  `;
  $('#quick-view-modal').showModal();
}

async function apiRequest(url, options = {}) {
  const headers = { ...(options.body ? { 'content-type': 'application/json' } : {}), ...(state.adminPassword ? { 'x-admin-password': state.adminPassword } : {}), ...options.headers };
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    let message = 'تعذر إتمام العملية';
    try { message = (await response.json()).error || message; } catch {}
    throw new Error(message);
  }
  return response.status === 204 ? null : response.json();
}

async function renderInventory() {
  renderInventoryFrom(await apiRequest('/api/admin/products'));
}

async function openAdmin() {
  $('#admin-modal').showModal();
  $('#admin-login-error').textContent = '';
  if (state.adminPassword) {
    try {
      await renderInventory();
      $('#admin-login-view').hidden = true;
      $('#admin-dashboard').hidden = false;
    } catch {
      state.adminPassword = '';
    }
  }
  if (!state.adminPassword) {
    $('#admin-login-view').hidden = false;
    $('#admin-dashboard').hidden = true;
    $('#admin-login-form').elements.password.value = '';
    $('#admin-login-form').elements.password.focus();
  }
}

function normalizePhone(phone) {
  return phone.replace(/[\s()-]/g, '').replace(/^00/, '+');
}

function buildOrderMessage(details) {
  const items = [...state.cart.entries()].map(([id, quantity]) => {
    const product = state.products.find(item => item.id === id);
    if (!product) return null;
    return `- ${product.title} | التصنيف: ${product.category} | الكمية: ${quantity} | السعر: ${formatPrice(product.price)}`;
  }).filter(Boolean).join('\n');
  return [
    '🛍️ طلب جديد من متجر الغزال ستورز',
    `👤 الاسم: ${details.name}`,
    `📞 الهاتف: ${details.phone}`,
    `📍 العنوان: ${details.address}`,
    `📝 ملاحظات: ${details.notes || 'لا توجد'}`,
    '',
    '🛒 المنتجات المطلوبة:',
    items,
    '',
    `💰 الإجمالي الكلي: ${formatPrice(cartTotals().total)}`
  ].join('\n');
}

$('#category-filters').addEventListener('click', event => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  state.category = button.dataset.category;
  renderCategories();
  renderProducts();
});
$('#category-nav').addEventListener('click', event => {
  const link = event.target.closest('[data-nav-category]');
  if (!link) return;
  state.category = link.dataset.navCategory;
  renderCategories();
  renderProducts();
});
$('#search-input').addEventListener('input', event => {
  state.query = event.target.value;
  renderProducts();
});
$('#search-input').addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.currentTarget.value = ''; state.query = ''; renderProducts(); }
});
$('#products-grid').addEventListener('click', event => {
  const add = event.target.closest('[data-add]');
  const quick = event.target.closest('[data-quick-view]');
  if (add) addToCart(add.dataset.add);
  if (quick) showQuickView(quick.dataset.quickView);
});
$('#cart-open').addEventListener('click', openCart);
$('#overlay').addEventListener('click', closeCart);
$('#cart-items').addEventListener('click', event => {
  const quantityButton = event.target.closest('[data-quantity]');
  const removeButton = event.target.closest('[data-remove]');
  if (quantityButton) {
    const id = quantityButton.dataset.id;
    const next = (state.cart.get(id) || 0) + Number(quantityButton.dataset.quantity);
    if (next <= 0) state.cart.delete(id); else state.cart.set(id, next);
    renderCart();
  }
  if (removeButton) { state.cart.delete(removeButton.dataset.remove); renderCart(); }
});
$('#quick-view-content').addEventListener('click', event => {
  const quantityButton = event.target.closest('[data-quick-qty]');
  if (quantityButton) {
    const output = $('#quick-quantity');
    const quantity = Math.max(1, parseLocalizedInteger(output.textContent) + Number(quantityButton.dataset.quickQty));
    output.textContent = new Intl.NumberFormat('ar-EG').format(quantity);
  }
  const add = event.target.closest('[data-quick-add]');
  if (add) {
    const quantity = parseLocalizedInteger($('#quick-quantity').textContent);
    addToCart(add.dataset.quickAdd, quantity);
    $('#quick-view-modal').close();
  }
});
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', event => event.currentTarget.closest('dialog')?.close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
}));
$('#checkout-open').addEventListener('click', () => {
  closeCart();
  $('#order-error').textContent = '';
  $('#order-modal').showModal();
});
$('#order-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const details = {
    name: String(form.get('name')).trim(),
    phone: normalizePhone(String(form.get('phone')).trim()),
    address: String(form.get('address')).trim(),
    notes: String(form.get('notes')).trim()
  };
  if (!/^\+?[0-9]{8,15}$/.test(details.phone)) {
    $('#order-error').textContent = 'أدخلي رقم هاتف صحيحًا مع مفتاح الدولة عند الحاجة.';
    return;
  }
  const url = `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(buildOrderMessage(details))}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  $('#order-modal').close();
  event.currentTarget.reset();
  state.cart.clear();
  renderCart();
  showToast('تم تجهيز رسالة الطلب عبر واتساب');
});
$('#admin-open').addEventListener('click', openAdmin);
$('#admin-login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const password = String(new FormData(event.currentTarget).get('password'));
  state.adminPassword = password;
  try {
    await renderInventory();
    $('#admin-login-view').hidden = true;
    $('#admin-dashboard').hidden = false;
  } catch (error) {
    state.adminPassword = '';
    $('#admin-login-error').textContent = error.message;
  }
});

function renderInventoryFrom(products) {
  $('#inventory-count').textContent = `${new Intl.NumberFormat('ar-EG').format(products.length)} منتج`;
  $('#inventory-list').innerHTML = products.map(product => `
    <article class="inventory-item"><img src="${escapeHtml(driveImageUrl(product.image))}" alt="" loading="lazy"><div><h4>${escapeHtml(product.title)}</h4><p>${formatPrice(product.price)} · <span class="inventory-status${product.available === false ? ' off' : ''}"></span>${product.available === false ? 'غير متاح' : 'متاح'}</p></div><button type="button" data-delete-product="${escapeHtml(product.id)}">حذف المنتج</button></article>
  `).join('') || '<p class="empty-state">لا توجد منتجات.</p>';
}

$('#product-form').addEventListener('submit', async event => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const submitButton = formElement.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  $('#product-form-error').textContent = '';
  const product = {
    title: String(form.get('title')).trim(),
    price: Number(form.get('price')),
    category: String(form.get('category')),
    image: driveImageUrl(String(form.get('image'))),
    description: String(form.get('description')).trim(),
    available: form.get('available') === 'on'
  };
  try {
    await apiRequest('/api/products', { method: 'POST', body: JSON.stringify(product) });
    formElement.reset();
    formElement.elements.available.checked = true;
    await renderInventory();
    await loadProducts();
    showToast('تمت إضافة المنتج إلى المخزون');
  } catch (error) {
    $('#product-form-error').textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});
$('#inventory-list').addEventListener('click', async event => {
  const button = event.target.closest('[data-delete-product]');
  if (!button) return;
  if (!window.confirm('هل تريدين حذف هذا المنتج نهائيًا؟')) return;
  try {
    await apiRequest(`/api/products/${encodeURIComponent(button.dataset.deleteProduct)}`, { method: 'DELETE' });
    await renderInventory();
    await loadProducts();
    showToast('تم حذف المنتج');
  } catch (error) {
    showToast(error.message);
  }
});
$('#admin-logout').addEventListener('click', () => {
  state.adminPassword = '';
  $('#admin-modal').close();
  $('#admin-login-view').hidden = false;
  $('#admin-dashboard').hidden = true;
});
$('#retry-load').addEventListener('click', loadProducts);
document.addEventListener('keydown', event => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    $('#search-input').focus();
  }
  if (event.key === 'Escape' && $('#cart-drawer').classList.contains('open')) closeCart();
});
window.addEventListener('hashchange', () => {
  if (location.hash === '#admin') openAdmin();
});

$('#current-year').textContent = new Date().getFullYear();
setLogoUrl();
renderCategories();
loadProducts();
if (location.hash === '#admin') openAdmin();
