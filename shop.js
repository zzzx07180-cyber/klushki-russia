// ===== Общий код магазина =====
// Нужен и каталогу (catalog.js), и странице товара (product.js):
// названия разделов, форматирование цены, характеристики, кнопка «Заказать».

window.Shop = (function () {
  const TELEGRAM = 'https://t.me/';

  // one — как назвать один товар раздела, если у него нет названия модели
  const CATEGORIES = [
    { id: 'sticks',  label: 'Клюшки',      one: 'Клюшка',      icon: '🏒' },
    { id: 'skates',  label: 'Коньки',      one: 'Коньки',      icon: '⛸️' },
    { id: 'elbows',  label: 'Налокотники', one: 'Налокотники', icon: '🛡️' },
    { id: 'gloves',  label: 'Краги',       one: 'Краги',       icon: '🧤' },
    { id: 'helmets', label: 'Шлемы',       one: 'Шлем',        icon: '⛑️' }
  ];
  const TYPES = [
    { id: 'all',      label: 'Все клюшки' },
    { id: 'original', label: 'Оригинальные' },
    { id: 'replica',  label: 'Реплики' },
    { id: 'restored', label: 'Восстановленные' }
  ];
  const TYPE_BADGE = { original: 'Оригинал', replica: 'Реплика', restored: 'Восстановленная' };
  // Место перелома у восстановленных клюшек
  const REPAIRS = [
    { id: 'blade', label: 'Перо' },
    { id: 'shaft', label: 'Труба' }
  ];
  const repairLabel = (id) => (REPAIRS.find((r) => r.id === id) || {}).label || '';

  // Экранируем текст, чтобы символы вроде < > не ломали страницу
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  // Цена: число → «4 500 ₽»; пусто (null) → «Цена по запросу»
  const hasPrice = (n) => typeof n === 'number' && n > 0;
  const price = (n) => hasPrice(n) ? n.toLocaleString('ru-RU') + ' ₽' : 'Цена по запросу';
  const category = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];

  // Название товара: модель, а если её нет — «Клюшка», «Краги» и т.п.
  // Вратарским клюшкам дописываем «(вратарская)».
  function title(p) {
    const base = p.name || category(p.category).one;
    return p.specs && p.specs.goalie ? base + ' (вратарская)' : base;
  }

  // Фото товара: новый формат photos: [...], старый — photo: "..."
  function photos(p) {
    if (Array.isArray(p.photos)) return p.photos.filter(Boolean);
    return p.photo ? [p.photo] : [];
  }

  // Короткая строка характеристик для карточки
  function specsText(p) {
    const s = p.specs || {};
    if (p.category === 'sticks') {
      return [s.paddle && 'Перо ' + s.paddle, s.curve && 'Загиб ' + s.curve, s.flex && 'Жёсткость ' + s.flex,
        s.hand && 'Хват ' + s.hand.toLowerCase()]
        .filter(Boolean).join(' · ');
    }
    return s.size ? 'Размер ' + s.size : '';
  }

  // Полная таблица характеристик для страницы товара: [['Загиб', 'P29'], ...]
  function specsTable(p) {
    const s = p.specs || {};
    const rows = [['Раздел', category(p.category).label], ['Бренд', p.brand]];
    if (p.type) rows.push(['Тип', TYPE_BADGE[p.type]]);
    if (s.goalie) rows.push(['Назначение', 'Вратарская']);
    if (s.paddle) rows.push(['Длина пера', s.paddle]);
    if (p.repair) rows.push(['Место перелома', repairLabel(p.repair)]);
    if (s.curve) rows.push(['Загиб', s.curve]);
    if (s.flex) rows.push(['Жёсткость', s.flex]);
    if (s.hand) rows.push(['Хват', s.hand]);
    if (s.length) rows.push(['Длина', s.length]);
    if (s.size) rows.push(['Размер', s.size]);
    rows.push(['Наличие', p.inStock ? 'В наличии' : 'Нет в наличии']);
    if (p.sku) rows.push(['Номер', '№' + p.sku]);
    return rows;
  }

  // ----- Всплывающая подсказка -----
  let toastTimer;
  function showToast(text) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = text;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 4500);
  }

  // ----- «Заказать» -----
  // Telegram не умеет подставлять текст в личный чат, поэтому копируем готовое
  // сообщение в буфер обмена — покупателю останется вставить его и отправить.
  function orderMessage(p) {
    const what = [p.brand, title(p), TYPE_BADGE[p.type] && '(' + TYPE_BADGE[p.type].toLowerCase() + ')'].filter(Boolean).join(' ');
    const sku = p.sku ? ' №' + p.sku + '.' : '';
    const repair = p.repair ? ' Ремонт: ' + repairLabel(p.repair).toLowerCase() + '.' : '';
    const specs = specsText(p) ? ' ' + specsText(p) + '.' : '';
    const cost = hasPrice(p.price) ? ` Цена на сайте ${price(p.price)}.` : ' Подскажите цену.';
    return p.inStock
      ? `Здравствуйте! Хочу заказать: ${what}.${sku}${specs}${repair}${cost} Ссылка: ${productURL(p)}`
      : `Здравствуйте! Сообщите, пожалуйста, когда появится: ${what}.${sku}${specs}${repair} Ссылка: ${productURL(p)}`;
  }

  function productURL(p) {
    return new URL('product.html?id=' + p.id, location.href).href;
  }

  function order(p) {
    const msg = orderMessage(p);
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(msg)
        .then(() => showToast('Текст заказа скопирован — вставь его в чат Telegram и отправь'))
        .catch(() => showToast('Открываем Telegram — напиши, какой товар тебя интересует'));
    } else {
      showToast('Открываем Telegram — напиши, какой товар тебя интересует');
    }
    // саму ссылку не останавливаем: Telegram откроется в новой вкладке
  }

  // Кнопка «Заказать» / «Узнать о поступлении» (HTML)
  function orderButton(p, extraClass) {
    const cls = 'btn' + (p.inStock ? '' : ' btn--dark') + (extraClass ? ' ' + extraClass : '');
    const text = p.inStock ? 'Заказать' : 'Узнать о поступлении';
    return `<a href="${TELEGRAM}" class="${cls}" target="_blank" rel="noopener" data-order="${p.id}">${text}</a>`;
  }

  // Ловим нажатия на любые кнопки «Заказать» внутри контейнера
  function bindOrderButtons(container) {
    container.addEventListener('click', (e) => {
      const link = e.target.closest('[data-order]');
      if (!link) return;
      const p = (window.PRODUCTS || []).find((x) => String(x.id) === link.dataset.order);
      if (p) order(p);
    });
  }

  return {
    TELEGRAM, CATEGORIES, TYPES, TYPE_BADGE, REPAIRS,
    repairLabel, esc, price, hasPrice, category, title, photos, specsText, specsTable,
    showToast, orderButton, bindOrderButtons
  };
})();
