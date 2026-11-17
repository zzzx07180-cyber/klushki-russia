// ===== Общий код магазина =====
// Нужен каталогу (catalog.js), странице товара (product.js) и корзине (cart.js):
// названия разделов, форматирование цены, характеристики, ссылка в Telegram, копирование текста.

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
  // Реплик в каталоге нет — владелец убрал их (2026-11-16). Чтобы вернуть, нужно добавить сюда
  // { id: 'replica', label: 'Реплики' }, в TYPE_BADGE — replica: 'Реплика',
  // и включить SHOW_REPLICAS в tools/import_table.py.
  const TYPES = [
    { id: 'all',      label: 'Все клюшки' },
    { id: 'original', label: 'Оригинальные' },
    { id: 'restored', label: 'Восстановленные' }
  ];
  const TYPE_BADGE = { original: 'Оригинал', restored: 'Восстановленная' };
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

  // ----- Telegram и копирование текста -----
  // Ссылка на чат. Когда в адресе Telegram стоит настоящее имя (t.me/имя), текст сам появляется
  // в поле сообщения — покупателю остаётся нажать «Отправить». Пока имя условное (просто t.me/),
  // так не получится, поэтому текст ещё и копируется: его можно вставить в чат.
  // Длинный текст (больше 1500 знаков) в ссылку не кладём — Telegram его обрежет.
  const TELEGRAM_HAS_NAME = /t\.me\/\w{3,}/.test(TELEGRAM);
  function telegramLink(text) {
    return TELEGRAM_HAS_NAME && text && text.length <= 1500
      ? TELEGRAM + '?text=' + encodeURIComponent(text)
      : TELEGRAM;
  }

  // Копируем текст в буфер обмена. Отвечает «получилось / не получилось» (true / false).
  // Сначала старый способ: он срабатывает сразу, прямо в момент нажатия — это важно, потому что
  // следом открывается Telegram и страница уходит на задний план. Новый способ — запасной.
  function copyText(text) {
    let ok = false;
    const active = document.activeElement;
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');                       // чтобы на телефоне не выскакивала клавиатура
    ta.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;font-size:16px;';
    document.body.appendChild(ta);
    try {
      ta.focus({ preventScroll: true });
      ta.select();
      ta.setSelectionRange(0, text.length);
      ok = document.execCommand('copy');
    } catch (e) { ok = false; }
    ta.remove();
    if (active && active.focus) active.focus({ preventScroll: true });
    if (ok) return Promise.resolve(true);
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(() => true, () => false);
    }
    return Promise.resolve(false);
  }

  function productURL(p) {
    return new URL('product.html?id=' + p.id, location.href).href;
  }

  // ----- «Узнать о поступлении» (товара нет в наличии) -----
  // Товары в наличии заказывают через корзину (cart.js). Для остальных — готовое сообщение в Telegram.
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

  function order(p) {
    copyText(orderMessage(p)).then((ok) => showToast(ok
      ? 'Текст скопирован — вставь его в чат Telegram и отправь'
      : 'Открываем Telegram — напиши, какой товар тебя интересует'));
    // саму ссылку не останавливаем: Telegram откроется в новой вкладке
  }

  // Кнопка под товаром. Есть в наличии — «В корзину» (её рисует cart.js),
  // нет в наличии — «Узнать о поступлении» (ссылка в Telegram).
  function orderButton(p, extraClass) {
    if (p.inStock && window.Cart) return window.Cart.button(p, extraClass);
    const cls = 'btn' + (p.inStock ? '' : ' btn--dark') + (extraClass ? ' ' + extraClass : '');
    const text = p.inStock ? 'Заказать' : 'Узнать о поступлении';
    return `<a href="${esc(telegramLink(orderMessage(p)))}" class="${cls}" target="_blank" rel="noopener" data-order="${esc(p.id)}">${text}</a>`;
  }

  // Ловим нажатия на кнопки-ссылки «Узнать о поступлении» внутри контейнера
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
    showToast, telegramLink, copyText, productURL, orderButton, bindOrderButtons
  };
})();
