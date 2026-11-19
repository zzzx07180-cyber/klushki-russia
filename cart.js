// ===== Корзина =====
// Покупатель складывает товары в корзину, выбирает доставку и способ оплаты, а корзина собирает
// один общий текст заказа для Telegram. Сама корзина никуда ничего не отправляет: список товаров
// хранится только в браузере покупателя (localStorage) — поэтому не пропадает при переходе между
// страницами и при следующем заходе на сайт.
// Товары штучные (каждая клюшка — одна), поэтому «количества» нет: товар либо в корзине, либо нет.
// Значок корзины стоит в шапке каждой страницы (кнопка #cartBtn), а выдвижное окно этот скрипт
// создаёт сам — править его нужно только здесь. Оформление — в style.css, блок «КОРЗИНА».
//
// Экраны окна: «Корзина» (список) → «Оформление» (1 твой заказ, 2 оформить заказ — где: Telegram
// или ВКонтакте) → «Готово» (текст заказа для Telegram / ВКонтакте).
//
// ⚠️ Сайт — ВИТРИНА (с 2026-11-19): ни доставки, ни оплаты на сайте не выбирают. В шаге «Оформить
// заказ» покупатель выбирает Telegram или ВКонтакте (над выбором — почему так: WHY_CHAT), корзина
// собирает текст заказа и открывает чат, а доставку и оплату согласуем в переписке.
// Адреса Telegram и ВКонтакте — в начале shop.js.
// Шаг «Доставка» (служба, город, пункт на карте, цена — всё из delivery.js) сохранён, но выключен:
// SHIP_STEP = false. Поставить true — он вернётся первым шагом оформления, а из него снова можно будет
// открыть «Пункты на карте».
// Окно оплаты картой / СБП (экран «Оплата», payView) сохранено, но выключено: ONLINE_PAY = false.
// Поставить ONLINE_PAY = true — и вернутся способы «Картой онлайн» и «СБП», кнопка «Оплатить N ₽»
// и окно оплаты. Деньги в нём по-прежнему не списываются (честно написано «скоро»); когда подключим
// платёжный сервис банка, вместо этой надписи появится переход на защищённую страницу банка:
// данные карты покупатель будет вводить там, а не на нашем сайте.

window.Cart = (function () {
  const S = window.Shop;
  const D = window.Delivery;
  const { esc, price, hasPrice, title, photos, category, specsText } = S;
  const PRODUCTS = window.PRODUCTS || [];
  const KEY = 'klushki-cart';                       // под этим именем корзина лежит в браузере
  // Как считается доставка выбранной службы (подробно — в начале delivery.js):
  //  byIndex — Почта России по её настоящему калькулятору: покупатель вводит индекс, сайт показывает цену и срок;
  //  byMap   — СДЭК в режимах demo / live: город из подсказок, пункты на карте, цена;
  //  ни то, ни другое — служба выбрана, а пункт и цену уточняем в чате (режим off).
  // Шаг «Доставка» в оформлении: false — витрина (так сейчас), доставку согласуем в чате, на сайте её
  // не выбирают и не считают; true — вернуть выбор службы, города, пункта и расчёт цены.
  const SHIP_STEP = false;
  const smart = D.MODE !== 'off';
  const byIndex = () => SHIP_STEP && state.delivery === 'post' && D.postCalc;
  const byMap = () => SHIP_STEP && smart && !byIndex();
  const indexOk = () => /^\d{6}$/.test(state.index);
  // Оплата на сайте: false — витрина, заказ оформляем в Telegram / ВКонтакте (так сейчас);
  // true — вернуть окно оплаты картой / СБП (подробно — в начале файла).
  const ONLINE_PAY = false;
  // Способы оплаты. online: true — оплата на сайте (окно «Оплата»); chat — оформляем в переписке:
  // tg — в Telegram, vk — во ВКонтакте. off — вариант виден, но выбрать нельзя (ВКонтакте, пока нет адреса).
  // chips — значки платёжных систем справа (просто надписи, без чужих логотипов).
  // Пока ONLINE_PAY = false, способов с online: true в списке нет.
  const PAYMENT = [
    { id: 'card', label: 'Картой онлайн', note: 'Карта МИР',                     chips: ['МИР'], online: true, inText: 'картой онлайн' },
    { id: 'sbp',  label: 'СБП',           note: 'По QR-коду в приложении банка', chips: ['СБП'], online: true, inText: 'СБП' },
    { id: 'chat', label: 'Telegram',  chat: 'tg', note: S.TELEGRAM_NAME || 'Оформить в Telegram', inText: 'обсудим в чате' },
    { id: 'vk',   label: 'ВКонтакте', chat: 'vk', note: S.VK ? 'Отправишь заказ в сообщения' : 'Скоро',
      inText: 'обсудим в чате', off: !S.VK }
  ].filter((m) => ONLINE_PAY || !m.online);
  const FIRST_PAY = PAYMENT.find((m) => !m.off).id;   // что выбрано, пока покупатель ничего не менял
  const TG_PAY = PAYMENT.find((m) => m.chat === 'tg');
  const WORDS = ['товар', 'товара', 'товаров'];
  const DAYS = ['день', 'дня', 'дней'];

  // 1 товар, 2 товара, 5 товаров
  const plural = (n, w) => w[n % 10 === 1 && n % 100 !== 11 ? 0
    : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 1 : 2];
  const find = (id) => PRODUCTS.find((p) => String(p.id) === String(id));
  const fullName = (p) => [p.brand, title(p)].filter(Boolean).join(' ');
  // строка из поля ввода: без лишних пробелов и не длиннее n знаков
  const clean = (s, n) => typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, n) : '';
  const norm = (s) => String(s).toLowerCase().replace(/ё/g, 'е').trim();

  const ICON_CART = '<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4.5h3.4l3 13.2h12.6l2.6-9.4H6.8"/><circle cx="11" cy="22.6" r="1.7"/><circle cx="20" cy="22.6" r="1.7"/></svg>';
  const ICON_TG = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M21.5 3.6 2.9 10.8c-1.3.5-1.3 1.2-.2 1.6l4.8 1.5 1.8 5.6c.2.6.4.8.8.8.4 0 .6-.2.9-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.1-14.8c.3-1.3-.5-1.9-1.4-1.5ZM8.7 13.6l9.4-5.9c.5-.3.9-.1.5.2l-7.9 7.2-.3 3.3-1.7-4.8Z"/></svg>';
  const ICON_DONE = '<svg class="cart-done__icon" viewBox="0 0 96 96" fill="none" aria-hidden="true"><circle class="cart-done__ring" cx="48" cy="48" r="42" stroke-width="4"/><path class="cart-done__check" d="M30 49.5 43 62l24-27" stroke-width="6"/></svg>';
  const ICON_LOCK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="1.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>';
  const ICON_SOON = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/></svg>';
  const ICON_VK = '<b class="cart-vk" aria-hidden="true">VK</b>';   // надпись, а не логотип
  const ICON_PIN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.8" r="2.4"/></svg>';

  // ----- Что лежит в корзине -----
  // items — номера товаров (id) в том порядке, в каком их добавляли;
  // delivery — служба (cdek / post), method — способ (pvz — пункт выдачи / отделение, door — курьер до двери),
  // city / cityId — город (название и номер в справочнике службы), index — почтовый индекс (для Почты),
  // point — выбранный пункт (на карте), pointText — пункт СДЭК, вписанный покупателем вручную,
  // street / flat — адрес для курьера, pay — способ оплаты.
  const state = { items: [], delivery: '', method: 'pvz', city: '', cityId: '', index: '', point: null, pointText: '', street: '', flat: '', pay: FIRST_PAY };

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
      state.items = Array.isArray(d.items) ? [...new Set(d.items.map(String))] : [];
      state.delivery = D.service(d.delivery) ? d.delivery : '';
      state.method = d.method === 'door' ? 'door' : 'pvz';
      state.city = clean(d.city, 60);
      state.cityId = clean(d.cityId, 40);
      state.index = /^\d{1,6}$/.test(d.index) ? d.index : '';
      const p = d.point;
      state.point = p && typeof p === 'object' && clean(p.id, 80)
        ? { id: clean(p.id, 80), name: clean(p.name, 120), address: clean(p.address, 200), hours: clean(p.hours, 120) }
        : null;
      state.street = clean(d.street, 120);
      state.pointText = clean(d.pointText, 150);
      state.flat = clean(d.flat, 20);
      state.pay = PAYMENT.some((x) => x.id === d.pay && !x.off) ? d.pay : FIRST_PAY;
    } catch (e) { /* хранилище выключено (режим «инкогнито») — корзина проживёт до закрытия страницы */ }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* то же самое */ }
  }

  // Товар могли купить, пока он лежал в корзине: убираем то, чего уже нет в каталоге или в наличии.
  // Если каталог не загрузился совсем — ничего не трогаем, иначе стёрли бы всю корзину.
  let notice = '';
  function dropSold() {
    if (!PRODUCTS.length) return;
    const before = state.items.length;
    state.items = state.items.filter((id) => { const p = find(id); return p && p.inStock; });
    const gone = before - state.items.length;
    if (!gone) return;
    notice = `${gone} ${plural(gone, WORDS)} из корзины уже ${gone === 1 ? 'продан — убрали его' : 'проданы — убрали их'}.`;
    save();
  }

  const has = (id) => state.items.includes(String(id));
  const items = () => state.items.map(find).filter(Boolean);
  function totals(list) {
    const priced = list.filter((p) => hasPrice(p.price));
    return { count: list.length, sum: priced.reduce((s, p) => s + p.price, 0), ask: list.length - priced.length };
  }

  // Оплатить на сайте можно, только когда оплата включена (ONLINE_PAY) и у всех товаров есть цена:
  // «цену по запросу» сначала уточняем в чате
  const canPayOnline = (t) => ONLINE_PAY && t.count > 0 && t.ask === 0 && t.sum > 0;
  // Какой способ оплаты действует сейчас: онлайн недоступен — значит, через Telegram
  function payMethod(t) {
    const m = PAYMENT.find((x) => x.id === state.pay && !x.off) || PAYMENT.find((x) => !x.off);
    return m.online && !canPayOnline(t) ? TG_PAY : m;
  }

  // Номер заказа — чтобы покупателю и нам было на что ссылаться в переписке. Появляется на экране
  // «Оформление»; поменялся состав корзины — при следующем оформлении будет новый номер.
  let orderNo = '';
  const newOrderNo = () => String(Date.now()).slice(-6);

  // ----- Цена доставки (только в «умном» режиме) -----
  // Спрашиваем у delivery.js, когда известны служба, способ и город. Ответ приходит не сразу —
  // пока ждём, пишем «Считаем доставку…». key — для каких условий посчитано.
  let quoteNow = { key: '', status: 'idle' };
  function quoteKey() {
    if (!SHIP_STEP || !state.delivery) return '';
    const base = [state.delivery, state.method, state.items.join(',')];
    if (byIndex()) return indexOk() ? base.concat('#' + state.index).join('|') : '';
    return byMap() && state.cityId ? base.concat(state.cityId).join('|') : '';
  }

  function requestQuote() {
    const key = quoteKey();
    if (key === quoteNow.key) return;
    if (!key) { quoteNow = { key: '', status: 'idle' }; return; }
    quoteNow = { key, status: 'loading' };
    D.quote({ service: state.delivery, method: state.method, city: state.cityId, index: state.index, parcels: D.parcels(items()) })
      .then((q) => {
        if (quoteNow.key !== key) return;
        const cost = Math.round(Number(q && q.price));
        quoteNow = cost >= 0
          ? { key, status: 'ok', price: cost, days: [Number(q.daysMin), Number(q.daysMax)], office: q.office || null }
          : { key, status: 'error' };
        paintQuote();
      }, (e) => {
        if (quoteNow.key !== key) return;
        quoteNow = { key, status: 'error', reason: e && e.message };   // heavy / index / slow — для подсказки
        paintQuote();
      });
  }
  // Посчитанная цена доставки или null, если её пока нет
  const shipCost = () => quoteNow.status === 'ok' && quoteNow.key === quoteKey() ? quoteNow.price : null;
  const rub = (n) => n ? price(n) : 'бесплатно';
  function daysText(d) {
    const [a, b] = d || [];
    if (!(a > 0)) return '';
    return (b > a ? a + '–' + b : a) + ' ' + plural(b > a ? b : a, DAYS);
  }

  // Доставка одной строкой: «СДЭК, пункт выдачи, Пункт СДЭК №3 — Казань, ул. Мира, 24»
  function shipText() {
    if (!SHIP_STEP) return '';                       // доставку на сайте не выбирают — договоримся в чате
    const s = D.service(state.delivery);
    if (!s) return state.city ? 'город ' + state.city : '';
    const parts = [s.label, D.method(state.delivery, state.method).text];
    const office = byIndex() && state.method === 'pvz' && shipCost() !== null && quoteNow.office;
    if (byIndex() && state.index) parts.push('индекс ' + state.index);
    if (office) parts.push('отделение «' + office.name + '», ' + office.address);
    else if (state.method === 'pvz' && byMap() && state.point) parts.push(state.point.name + ' — ' + state.point.address);
    else if (state.city) parts.push('г. ' + state.city);
    if (state.method === 'pvz' && !byMap() && !byIndex() && state.pointText) parts.push('пункт: ' + state.pointText);
    if (state.method === 'door' && state.street) parts.push(state.street + (state.flat ? ', кв./офис ' + state.flat : ''));
    return parts.join(', ');
  }

  // ----- Изменения корзины -----
  let undo = null;        // что вернуть по кнопке «Вернуть»: { items: прежний список, text: подпись }

  function add(id, fromEl) {
    const p = find(id);
    if (!p || !p.inStock || has(id)) return;
    state.items.push(String(id));
    undo = null;
    orderNo = '';
    save();
    refresh();
    flyPuck(fromEl);
  }
  function remove(id) {
    const p = find(id);
    undo = { items: state.items.slice(), text: p ? 'Убрали «' + fullName(p) + '»' : 'Товар убран' };
    state.items = state.items.filter((x) => x !== String(id));
    orderNo = '';
    save();
    refresh();
  }
  function clear(keepUndo) {
    undo = keepUndo ? { items: state.items.slice(), text: 'Корзина очищена' } : null;
    state.items = [];
    orderNo = '';
    save();
    refresh();
  }
  function restore() {
    if (!undo) return;
    state.items = undo.items.filter((id) => { const p = find(id); return p && p.inStock; });
    undo = null;
    orderNo = '';
    save();
    refresh();
  }

  // ----- Кнопка «В корзину» под товаром -----
  // Товар уже в корзине — кнопка превращается в «В корзине ✓», а повторное нажатие убирает его
  // из корзины (просьба владельца 2026-11-19; раньше оно открывало корзину). Сама корзина — значок в шапке.
  const IN_CART_HINT = 'Нажми ещё раз — уберём из корзины';
  function button(p, extraClass) {
    const inCart = has(p.id);
    return `<button type="button" class="btn${inCart ? ' btn--in-cart' : ''}${extraClass ? ' ' + extraClass : ''}" ` +
      `data-cart-add="${esc(p.id)}"${inCart ? ` title="${IN_CART_HINT}"` : ''}>${inCart ? 'В корзине' : 'В корзину'}</button>`;
  }
  function paintButton(b) {
    const inCart = has(b.dataset.cartAdd);
    b.classList.toggle('btn--in-cart', inCart);
    b.title = inCart ? IN_CART_HINT : '';
    b.textContent = inCart ? 'В корзине' : 'В корзину';
  }

  // ----- Значок в шапке -----
  const headBtn = document.getElementById('cartBtn');
  const headCount = document.getElementById('cartCount');

  // Обновить всё, что показывает корзину: число на значке, кнопки под товарами, открытое окно
  function refresh() {
    const n = state.items.length;
    if (headCount) { headCount.textContent = n; headCount.hidden = n === 0; }
    if (headBtn) headBtn.setAttribute('aria-label', n ? `Корзина: ${n} ${plural(n, WORDS)}` : 'Корзина пуста');
    document.querySelectorAll('[data-cart-add]').forEach(paintButton);
    // Кнопки «Перейти в корзину» (например, в подборе клюшки): видны, только когда в корзине что-то есть
    document.querySelectorAll('[data-cart-go]').forEach((b) => {
      b.hidden = n === 0;
      const c = b.querySelector('[data-cart-go-count]');
      if (c) c.textContent = n;
    });
    if (isOpen) render();
  }

  function bump() {
    if (!headBtn) return;
    headBtn.classList.remove('is-bump');
    void headBtn.offsetWidth;                        // «перезагружаем» анимацию, чтобы сыграла ещё раз
    headBtn.classList.add('is-bump');
  }

  // Маленькая шайба летит от кнопки к значку корзины — видно, куда делся товар
  function flyPuck(fromEl) {
    const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fromEl || !headBtn || !fromEl.animate || still) { bump(); return; }
    const a = fromEl.getBoundingClientRect();
    const b = headBtn.getBoundingClientRect();
    const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2;
    const x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
    const dot = document.createElement('span');
    dot.className = 'cart-fly';
    document.body.appendChild(dot);
    const done = () => { dot.remove(); bump(); };
    try {
      dot.animate([
        { transform: `translate(${x0}px, ${y0}px) scale(.6)`, opacity: 0 },
        { transform: `translate(${x0 + (x1 - x0) * .25}px, ${y0 + (y1 - y0) * .45 - 30}px) scale(1.15)`, opacity: 1, offset: .3 },
        { transform: `translate(${x1}px, ${y1}px) scale(.45)`, opacity: .9 }
      ], { duration: 620, easing: 'cubic-bezier(.3, .1, .3, 1)' }).onfinish = done;
    } catch (e) { done(); }
  }

  // ----- Текст заказа -----
  function message() {
    const list = items();
    const t = totals(list);
    const lines = [orderNo ? `Здравствуйте! Хочу оформить заказ № ${orderNo}:` : 'Здравствуйте! Хочу заказать:', ''];
    list.forEach((p, i) => {
      const type = S.TYPE_BADGE[p.type] ? ', ' + S.TYPE_BADGE[p.type].toLowerCase() : '';
      const details = [specsText(p), p.repair && 'Ремонт: ' + S.repairLabel(p.repair).toLowerCase()].filter(Boolean).join(' · ');
      lines.push((list.length > 1 ? (i + 1) + ') ' : '') + fullName(p) + type + (p.sku ? ' — №' + p.sku : ''));
      if (details) lines.push(details);
      lines.push(hasPrice(p.price) ? 'Цена на сайте: ' + price(p.price) : 'Цена: подскажите, пожалуйста');
      lines.push(S.productURL(p), '');
    });
    if (list.length > 1) {
      lines.push('Итого: ' + t.count + ' ' + plural(t.count, WORDS) +
        (t.sum ? ' на ' + price(t.sum) : '') +
        (t.sum && t.ask ? ' (ещё ' + t.ask + ' — цена по запросу)' : ''));
    }
    const ship = shipText();
    if (ship) lines.push('Доставка: ' + ship);
    const cost = shipCost();
    if (cost !== null) {
      const days = daysText(quoteNow.days);
      const how = byIndex() ? 'Доставка по тарифу Почты России: ' : 'Доставка по расчёту сайта: ';
      const note = byIndex() ? (D.postExample ? ' (пример: отправка из Москвы)' : '') : (D.MODE === 'demo' ? ' (демо-пример)' : '');
      lines.push(how + rub(cost) + (days ? ', ' + days : '') + note);
      if (t.sum) lines.push('Всего с доставкой: ' + price(t.sum + cost) + (t.ask ? ' (без товаров с ценой по запросу)' : ''));
    }
    if (ONLINE_PAY) lines.push('Способ оплаты: ' + payMethod(t).inText);   // у витрины выбора нет — об оплате договоримся в чате
    return lines.join('\n').trim();
  }

  // =====================================================================
  // Выдвижное окно
  // =====================================================================
  const root = document.createElement('div');
  root.className = 'cart';
  root.hidden = true;
  root.innerHTML = `
    <div class="cart__shade" data-cart-close></div>
    <div class="cart__panel" role="dialog" aria-modal="true" aria-labelledby="cartTitle" tabindex="-1">
      <div class="cart__head">
        <button type="button" class="cart__back" data-cart-back aria-label="Назад" hidden>‹</button>
        <h2 class="cart__title" id="cartTitle">Корзина</h2>
        <span class="cart__qty" hidden></span>
        <button type="button" class="cart__close" data-cart-close aria-label="Закрыть корзину">×</button>
      </div>
      <div class="cart__body"></div>
      <div class="cart__foot"></div>
    </div>`;
  document.body.appendChild(root);
  const panel = root.querySelector('.cart__panel');
  const el = {
    title: root.querySelector('.cart__title'), qty: root.querySelector('.cart__qty'),
    back: root.querySelector('.cart__back'), body: root.querySelector('.cart__body'),
    foot: root.querySelector('.cart__foot')
  };

  let isOpen = false;
  // какой экран показан: list — корзина, checkout — оформление, points — пункты на карте, pay — оплата, done — готово
  let view = 'list';
  let fresh = false;      // экран только что сменился — содержимое плавно появляется
  let copied = false;     // получилось ли скопировать текст заказа
  let sentVia = 'tg';     // куда покупатель отправил заказ: tg — Telegram, vk — ВКонтакте

  // ----- Экран «Корзина» -----
  function itemHTML(p) {
    const url = 'product.html?id=' + encodeURIComponent(p.id);
    const first = photos(p)[0];
    const pic = first
      ? `<img src="${esc(first)}" alt="" loading="lazy">`
      : `<span aria-hidden="true">${category(p.category).icon}</span>`;
    const tag = [S.TYPE_BADGE[p.type], p.repair && S.repairLabel(p.repair).toLowerCase()].filter(Boolean).join(' · ');
    const name = fullName(p);
    return `
      <li class="cart-item">
        <a href="${url}" class="cart-item__pic" tabindex="-1" aria-hidden="true">${pic}</a>
        <div class="cart-item__info">
          <p class="cart-item__brand">${esc(p.brand || '')}</p>
          <a href="${url}" class="cart-item__name">${esc(title(p))}</a>
          <p class="cart-item__specs">${esc([tag, specsText(p)].filter(Boolean).join(' · '))}</p>
          <p class="cart-item__price">${price(p.price)}</p>
        </div>
        <button type="button" class="cart-item__del" data-cart-del="${esc(p.id)}" aria-label="Убрать из корзины: ${esc(name)}">×</button>
      </li>`;
  }

  // extra — что прибавить к сумме товаров (доставку)
  function totalHTML(t, extra) {
    return `
      <div class="cart__total">
        <span>Итого <small>${t.count} ${plural(t.count, WORDS)}${extra !== undefined ? ' и доставка' : ''}</small></span>
        <b>${t.sum ? price(t.sum + (extra || 0)) : 'По запросу'}</b>
      </div>`;
  }

  // Пояснение под итогом: что в сумму не вошло. shipKnown — цена доставки уже посчитана
  function noteText(t, shipKnown) {
    if (t.sum && t.ask) {
      return `Без ${t.ask === 1 ? 'товара' : 'товаров'} с ценой по запросу${shipKnown ? '' : ' и без доставки'} — их посчитаем в чате.`;
    }
    if (shipKnown && byIndex()) return 'Доставка — по тарифу Почты России' + (D.postExample ? ' (для примера — отправка из Москвы).' : '.');
    if (shipKnown) return D.MODE === 'demo' ? 'Цена доставки — пример: включён демо-режим.' : '';
    return SHIP_STEP ? 'Доставка считается отдельно — зависит от города.' : 'Доставку посчитаем в чате — зависит от города.';
  }

  // Полоска-сообщение над списком: «Убрали … — Вернуть» или «Товар уже продан»
  function barsHTML() {
    return (notice ? `<p class="cart__bar">${esc(notice)}</p>` : '') +
      (undo ? `<p class="cart__bar"><span>${esc(undo.text)}</span><button type="button" data-cart-undo>Вернуть</button></p>` : '');
  }

  function listView(list, t) {
    if (!list.length) {
      return {
        title: 'Корзина',
        body: `${barsHTML()}
          <div class="cart-empty">
            ${ICON_CART}
            <p class="cart-empty__title">В корзине пусто</p>
            <p>Выбери клюшку или экипировку в каталоге — и возвращайся оформлять заказ.</p>
            <button type="button" class="btn" data-cart-shop>В каталог</button>
          </div>`,
        foot: ''
      };
    }
    return {
      title: 'Корзина',
      body: `${barsHTML()}
        <ul class="cart__list">${list.map(itemHTML).join('')}</ul>
        <button type="button" class="cart__clear" data-cart-clear>Очистить корзину</button>`,
      foot: `${totalHTML(t)}
        <p class="cart__note">${noteText(t, false)}</p>
        <button type="button" class="btn cart__cta" data-cart-go="checkout">Оформить заказ</button>`
    };
  }

  // Куда ведёт кнопка: Telegram — сразу с текстом заказа в поле сообщения (если он поместился в ссылку),
  // ВКонтакте — просто в чат (текст туда покупатель вставляет сам: мы его копируем)
  const chatLink = (ch, text) => ch === 'vk' ? S.VK : S.telegramLink(text);
  // Ссылка «отправить заказ в Telegram / ВКонтакте»: копирует текст заказа и показывает экран «Готово».
  // ch — куда: tg или vk
  const sendLink = (label, cls, ch) =>
    `<a href="${esc(chatLink(ch || 'tg', message()))}" class="${cls}" target="_blank" rel="noopener" data-cart-send="${ch || 'tg'}">${label}</a>`;

  // ----- Экран «Оформление», шаг 1: доставка -----
  const demoBadge = '<span class="cart-demo">Демо</span>';

  function shipHTML(no) {
    const svc = D.service(state.delivery);
    const m = svc && D.method(state.delivery, state.method);
    return `
      <p class="cart-step__label"><i>${no}</i> Доставка ${D.MODE === 'demo' ? demoBadge : ''}</p>
      ${D.MODE === 'demo' ? `<p class="cart-demo__note">Так доставка будет работать после договора со СДЭК: пункты на карте,
        цены и сроки СДЭК сейчас — примеры. Почта России считается по настоящим тарифам${D.postExample ? ' (для примера — отправка из Москвы)' : ''}.</p>` : ''}
      <div class="cart-ship">
        ${D.SERVICES.map((s) => `
          <button type="button" class="cart-ship__opt${s.id === state.delivery ? ' is-active' : ''}" data-cart-ship="${s.id}" aria-pressed="${s.id === state.delivery}">
            <b>${s.label}</b><span>${s.note}</span>
          </button>`).join('')}
      </div>
      ${svc ? `
        <div class="cart-seg" role="group" aria-label="Способ доставки">
          ${svc.methods.map((x) => `
            <button type="button" class="cart-seg__opt${x.id === m.id ? ' is-active' : ''}" data-cart-method="${x.id}" aria-pressed="${x.id === m.id}">${x.label}</button>`).join('')}
        </div>
        ${byIndex() ? `
        <div class="cart-addr cart-addr--index">
          <label class="cart-field"><span>Город</span>
            <input type="text" id="cartCity" maxlength="60" autocomplete="address-level2" placeholder="Например, Казань" value="${esc(state.city)}"></label>
          <label class="cart-field"><span>Индекс</span>
            <input type="text" id="cartIndex" inputmode="numeric" maxlength="6" autocomplete="postal-code" placeholder="420015" value="${esc(state.index)}"></label>
        </div>` : `
        <div class="cart-city">
          <label class="cart-field">
            <span>Город</span>
            <input type="text" id="cartCity" maxlength="60" placeholder="Например, Казань" value="${esc(state.city)}"
              ${byMap() ? 'autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="cartSug"' : 'autocomplete="address-level2"'}>
          </label>
          ${byMap() ? '<ul class="cart-sug" id="cartSug" role="listbox" aria-label="Подсказки города" hidden></ul>' : ''}
        </div>`}
        <div data-ship-more>${moreHTML()}</div>
        <p class="cart-quote" data-quote aria-live="polite">${quoteHTML()}</p>` : ''}
      <p class="cart-step__need" role="alert"></p>`;
  }

  // Под городом: пункт выдачи (кнопка «на карте» / выбранный пункт) или адрес для курьера
  function moreHTML() {
    const m = D.method(state.delivery, state.method);
    if (!m) return '';
    if (state.method === 'door') {
      return `
        <div class="cart-addr">
          <label class="cart-field"><span>Улица и дом</span>
            <input type="text" id="cartStreet" maxlength="120" autocomplete="address-line1" placeholder="ул. Ленина, 10" value="${esc(state.street)}"></label>
          <label class="cart-field"><span>Кв. / офис</span>
            <input type="text" id="cartFlat" maxlength="20" autocomplete="address-line2" placeholder="15" value="${esc(state.flat)}"></label>
        </div>
        <p class="cart-hint">Имя и телефон для курьера спросим в чате.</p>`;
    }
    if (byIndex()) {
      return `<p class="cart-hint">Индекс — номер почтового отделения, где удобно получить посылку.
        Не знаешь его — <a href="https://www.pochta.ru/offices" target="_blank" rel="noopener">найди на сайте Почты</a>.</p>`;
    }
    if (!byMap() && state.delivery === 'cdek') {
      // договора со СДЭК ещё нет — пункт покупатель находит на сайте СДЭК и вписывает сам
      return `
        <label class="cart-field"><span>Пункт выдачи СДЭК</span>
          <input type="text" id="cartPoint" maxlength="150" autocomplete="off" placeholder="Адрес пункта, например ул. Ленина, 10" value="${esc(state.pointText)}"></label>
        <p class="cart-hint">Выбери удобный пункт на <a href="https://www.cdek.ru/ru/offices" target="_blank" rel="noopener">карте СДЭК</a>
          и впиши его адрес. Не знаешь — подберём вместе в чате.</p>`;
    }
    if (!byMap()) {
      return `<p class="cart-hint">${state.delivery === 'post' ? 'Ближайшее отделение' : 'Удобный пункт выдачи'} подберём вместе в чате.</p>`;
    }
    if (state.point) {
      return `
        <div class="cart-point">
          ${ICON_PIN}
          <span><b>${esc(state.point.name)}</b>${esc(state.point.address)}${state.point.hours ? `<small>${esc(state.point.hours)}</small>` : ''}</span>
          <button type="button" data-cart-points>Изменить</button>
        </div>`;
    }
    return `
      <button type="button" class="cart-pick" data-cart-points${state.cityId ? '' : ' disabled'}>${ICON_PIN} ${m.pick} на карте</button>
      ${state.cityId ? '' : '<p class="cart-hint">Сначала выбери город из подсказок.</p>'}`;
  }

  // Строка с ценой и сроком доставки
  function quoteHTML() {
    if (byIndex()) return postQuoteHTML();
    if (!byMap()) return 'Стоимость доставки посчитаем в чате — зависит от города и способа.';
    if (!state.cityId) return 'Выбери город — посчитаем стоимость и срок.';
    if (quoteNow.status === 'loading') return '<span class="cart-quote__wait">Считаем доставку…</span>';
    if (quoteNow.status === 'error') return 'Не получилось посчитать доставку — посчитаем в чате.';
    if (quoteNow.status !== 'ok') return '';
    const days = daysText(quoteNow.days);
    return `Доставка: <b>${rub(quoteNow.price)}</b>${days ? ' · ' + days : ''}`;
  }

  // То же для Почты России: цена и срок по индексу, а для «в отделение» — ещё и адрес отделения от Почты
  function postQuoteHTML() {
    if (!indexOk()) return 'Введи индекс — посчитаем стоимость и срок по тарифам Почты России.';
    if (quoteNow.status === 'loading') return '<span class="cart-quote__wait">Считаем по тарифам Почты…</span>';
    if (quoteNow.status === 'error') {
      return quoteNow.reason === 'heavy' ? 'Посылка тяжелее, чем принимает Почта, — доставку посчитаем в чате.'
        : quoteNow.reason === 'slow' ? 'Почта не отвечает — доставку посчитаем в чате.'
        : 'Почта не нашла этот индекс или не возит туда — проверь его или напиши нам в Telegram.';
    }
    if (quoteNow.status !== 'ok') return '';
    const o = state.method === 'pvz' && quoteNow.office;
    const days = daysText(quoteNow.days);
    return (o ? `<span class="cart-quote__office">${ICON_PIN}<span>Отделение ${esc(state.index)} · ${esc(o.name)}, ${esc(o.address)}</span></span>` : '') +
      `Доставка: <b>${rub(quoteNow.price)}</b>${days ? ' · ' + days : ''}`;
  }

  // Итог под списком товаров: «Товары / Доставка / Итого»
  function sumHTML(t) {
    const ship = shipCost();
    const note = noteText(t, ship !== null);
    return (ship === null ? '' : `
      <ul class="cart-sum cart-sum--sub">
        <li><span>Товары</span><b>${t.sum ? price(t.sum) : 'по запросу'}</b></li>
        <li><span>Доставка</span><b>${rub(ship)}</b></li>
      </ul>`) +
      totalHTML(t, ship === null ? undefined : ship) +
      (note ? `<p class="cart__note">${note}</p>` : '');
  }

  // ----- Экран «Оформление» -----
  // Почему заказ оформляем в переписке, а не на сайте, — объясняем покупателю прямо над выбором чата.
  // ship: true — пункт про доставку (нужен, только пока на сайте выключен шаг «Доставка»)
  const WHY_CHAT = [
    { text: 'Проверим товар перед отправкой и пришлём живые фото — увидишь, что именно покупаешь' },
    { text: 'Подберём доставку — СДЭК или Почта России, до пункта выдачи или до двери — и посчитаем её цену', ship: true },
    { text: 'Платишь, только когда всё согласовали' }
  ];

  // Подпись под кнопкой «Заказать через …»: что будет дальше
  function sendNote(pm) {
    return pm.chat === 'tg' && S.telegramLink(message()) !== S.TELEGRAM
      ? 'Текст заказа сам появится в чате — останется нажать «Отправить».'
      : 'Скопируем текст заказа — останется вставить его в чат и отправить.';
  }

  function checkoutView(list, t) {
    const online = canPayOnline(t);
    const pm = payMethod(t);
    const toPay = t.sum + (shipCost() || 0);
    // Порядок шагов. С оплатой на сайте: [доставка] → оплата → состав заказа (итог прямо над «Оплатить»).
    // Витрина: [доставка] → состав заказа → оформить заказ (выбор чата прямо над кнопкой «Заказать через …»).
    const steps = (SHIP_STEP ? ['ship'] : []).concat(ONLINE_PAY ? ['pay', 'sum'] : ['sum', 'pay']);
    const html = {
      ship: (no) => `<section class="cart-step" data-step="ship">${shipHTML(no)}</section>`,
      pay: (no) => payStepHTML(no, t, online, pm),
      sum: (no) => `
        <section class="cart-step">
          <p class="cart-step__label"><i>${no}</i> Твой заказ <small class="cart-step__no">№ ${orderNo}</small></p>
          <ul class="cart-sum">
            ${list.map((p) => `<li><span>${esc(fullName(p))}</span><b>${hasPrice(p.price) ? price(p.price) : 'по запросу'}</b></li>`).join('')}
          </ul>
          <div data-sum>${sumHTML(t)}</div>
        </section>`
    };
    return {
      title: 'Оформление',
      body: steps.map((s, i) => html[s](i + 1)).join(''),
      foot: pm.online
        ? `<button type="button" class="btn cart__cta" data-cart-go="pay">${ICON_LOCK} Оплатить ${price(toPay)}</button>
           ${sendLink('Есть вопрос? Написать в Telegram', 'cart__alt')}`
        : `${sendLink((pm.chat === 'vk' ? ICON_VK : ICON_TG) + ' Заказать через ' + pm.label, 'btn cart__cta', pm.chat)}
           <p class="cart__note cart__note--center">${sendNote(pm)}</p>`
    };
  }

  // Шаг «Оформить заказ» (витрина: почему в чате + выбор Telegram / ВКонтакте)
  // или «Оплата» (если включена оплата на сайте: картой / СБП / в чате)
  function payStepHTML(no, t, online, pm) {
    const why = ONLINE_PAY ? '' : `
      <p class="cart-step__text">${SHIP_STEP ? 'Оплату' : 'Доставку и оплату'} согласуем в переписке — так надёжнее:</p>
      <ul class="cart-why">${WHY_CHAT.filter((w) => !(w.ship && SHIP_STEP)).map((w) => `<li>${w.text}</li>`).join('')}</ul>
      <p class="cart-step__text cart-why__ask">Где тебе удобнее?</p>`;
    return `
        <section class="cart-step">
          <p class="cart-step__label"><i>${no}</i> ${ONLINE_PAY ? 'Оплата' : 'Оформить заказ'}</p>
          ${why}
          <div class="cart-pm">
            ${PAYMENT.map((m) => {
              const off = m.off || (m.online && !online);
              const on = m.id === pm.id;
              return `
              <button type="button" class="cart-pm__opt${on ? ' is-active' : ''}" data-cart-pay="${m.id}" aria-pressed="${on}"${off ? ' disabled' : ''}>
                <span class="cart-pm__dot" aria-hidden="true"></span>
                <span class="cart-pm__text"><b>${m.label}</b><small>${esc(m.note)}</small></span>
                ${m.chips ? `<span class="cart-pm__chips" aria-hidden="true">${m.chips.map((c) => `<i>${c}</i>`).join('')}</span>`
                  : `<span class="cart-pm__tg" aria-hidden="true">${m.chat === 'vk' ? ICON_VK : ICON_TG}</span>`}
              </button>`;
            }).join('')}
          </div>
          ${!ONLINE_PAY || online ? '' : `<p class="cart-step__text cart-pm__why">У ${t.count === 1 ? 'товара' : 'части товаров'} цена по запросу —
            сначала уточним её в Telegram, потом расскажем, как оплатить.</p>`}
        </section>`;
  }

  // ----- Экран «Пункты на карте» -----
  // Пункты выдачи / отделения выбранного города: сверху карта, под ней список. Нажал на пункт —
  // внизу появляется его адрес и кнопка «Забрать здесь».
  let spots = { key: '', status: 'idle', list: [] };
  let pending = '';       // пункт, на который нажали (ещё не подтверждён кнопкой)

  function pointsView() {
    const m = D.method(state.delivery, 'pvz');
    const chosen = spots.list.find((p) => p.id === pending);
    let list;
    if (spots.status === 'loading') list = '<p class="cart-hint cart-points__msg">Загружаем пункты…</p>';
    else if (spots.status === 'error') {
      list = `<p class="cart-hint cart-points__msg">Не получилось загрузить пункты.</p>
        <button type="button" class="cart__alt" data-cart-points>Попробовать ещё раз</button>`;
    } else if (!spots.list.length) {
      list = '<p class="cart-hint cart-points__msg">В этом городе пунктов не нашли — выбери «Курьером до двери» или напиши нам в Telegram.</p>';
    } else {
      list = `<ul class="cart-plist">${spots.list.map((p) => `
        <li><button type="button" class="cart-pt${p.id === pending ? ' is-active' : ''}" data-cart-point="${esc(p.id)}" aria-pressed="${p.id === pending}">
          <b>${esc(p.name)}</b><span>${esc(p.address)}</span>${p.hours ? `<small>${esc(p.hours)}</small>` : ''}
        </button></li>`).join('')}</ul>`;
    }
    return {
      title: m.title,
      body: `
        ${D.MODE === 'demo' ? `<p class="cart-demo__bar">${demoBadge} Пункты и адреса — примеры, не настоящие</p>` : ''}
        ${spots.status === 'ok' && spots.list.length ? '<div class="cart-map" id="cartMap"><p class="cart-map__wait">Загружаем карту…</p></div>' : ''}
        ${list}`,
      foot: chosen
        ? `<div class="cart-chosen">${ICON_PIN}<span><b>${esc(chosen.name)}</b>${esc(chosen.address)}${chosen.hours ? `<small>${esc(chosen.hours)}</small>` : ''}</span></div>
           <button type="button" class="btn cart__cta" data-cart-point-ok>${state.delivery === 'post' ? 'Получить здесь' : 'Забрать здесь'}</button>`
        : '<p class="cart__note cart__note--center">Нажми на пункт на карте или в списке</p>'
    };
  }

  // Карта живёт, пока открыт экран с пунктами; при любой перерисовке окна — убираем её
  let mapCtl = null;
  let mapSeq = 0;
  function unmountMap() {
    mapSeq++;
    if (mapCtl) { mapCtl.destroy(); mapCtl = null; }
  }
  function mountMap() {
    const box = el.body.querySelector('#cartMap');
    if (!box) return;
    const seq = ++mapSeq;
    D.map(box, spots.list, pending, (id) => pickPoint(id, false)).then((ctl) => {
      if (seq !== mapSeq) { ctl.destroy(); return; }
      mapCtl = ctl;
      box.classList.add('is-ready');
    }, () => {
      const wait = box.querySelector('.cart-map__wait');
      if (seq === mapSeq && wait) wait.textContent = 'Карта не загрузилась — выбери пункт из списка ниже.';
    });
  }

  function openPoints() {
    if (!byMap() || !state.cityId) return;
    const key = state.delivery + '|' + state.cityId;
    pending = state.point ? state.point.id : '';
    if (spots.key !== key || spots.status === 'error') {
      spots = { key, status: 'loading', list: [] };
      D.points(state.delivery, state.cityId).then((list) => {
        if (spots.key !== key) return;
        const ok = (Array.isArray(list) ? list : []).map((p) => ({
          id: String(p.id), name: String(p.name || ''), address: String(p.address || ''),
          hours: String(p.hours || ''), lat: Number(p.lat), lon: Number(p.lon)
        })).filter((p) => p.id && isFinite(p.lat) && isFinite(p.lon));
        spots = { key, status: 'ok', list: ok };
        if (view === 'points') render();
      }, () => {
        if (spots.key !== key) return;
        spots = { key, status: 'error', list: [] };
        if (view === 'points') render();
      });
    }
    show('points');
  }

  // Нажали на пункт — на карте (fromList = false) или в списке (true)
  function pickPoint(id, fromList) {
    pending = id;
    el.body.querySelectorAll('[data-cart-point]').forEach((b) => {
      const on = b.dataset.cartPoint === id;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on);
      if (on && !fromList) b.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    if (mapCtl) mapCtl.select(id, fromList);
    el.foot.innerHTML = pointsView().foot;
  }

  function confirmPoint() {
    const p = spots.list.find((x) => x.id === pending);
    if (!p) return;
    state.point = { id: p.id, name: p.name, address: p.address, hours: p.hours };
    save();
    show('checkout');
  }

  // ----- Экран «Оплата» -----
  // ⚠️ Сейчас выключен (ONLINE_PAY = false, сайт — витрина), но сохранён — чтобы вернуться к нему позже.
  // Окно оплаты: сумма, номер заказа, способ. Приём платежей ещё не подключён — честно пишем «скоро»
  // и предлагаем отправить заказ в Telegram. Когда подключим банк — здесь будет кнопка перехода
  // на его защищённую страницу оплаты (см. начало файла).
  function payView(list, t) {
    const pm = payMethod(t);
    const ship = shipCost();
    const where = shipText();
    return {
      title: 'Оплата',
      body: `
        <div class="cart-pay">
          <div class="cart-pay__top">
            <span class="cart-pay__secure">${ICON_LOCK} Защищённая оплата</span>
            <span>Заказ № ${orderNo}</span>
          </div>
          <p class="cart-pay__label">К оплате</p>
          <p class="cart-pay__sum">${price(t.sum + (ship || 0))}</p>
          <ul class="cart-pay__rows">
            <li><span>Товары · ${t.count}</span><b>${price(t.sum)}</b></li>
            <li><span>Доставка${ship !== null && daysText(quoteNow.days) ? ' · ' + daysText(quoteNow.days) : ''}</span>
              <b>${ship === null ? 'посчитаем в чате' : rub(ship)}</b></li>
          </ul>
          ${where ? `<p class="cart-pay__for">${ICON_PIN}<span>${esc(where)}</span></p>` : ''}
          <div class="cart-pay__method">
            <span><b>${pm.label}</b><small>${pm.note}</small></span>
            <button type="button" data-cart-back>Изменить</button>
          </div>
        </div>
        <div class="cart-soon">
          ${ICON_SOON}
          <div>
            <p class="cart-soon__title">Онлайн-оплата скоро заработает</p>
            <p>Мы подключаем приём платежей — сейчас деньги не списываются. Отправь заказ в Telegram:
              подтвердим наличие, ${ship === null ? 'посчитаем доставку' : 'проверим доставку'} и пришлём, как оплатить.</p>
          </div>
        </div>`,
      foot: `
        ${sendLink(ICON_TG + ' Заказать через Telegram', 'btn cart__cta')}
        <button type="button" class="cart__alt" data-cart-back>Выбрать другой способ оплаты</button>`
    };
  }

  // ----- Экран «Готово» -----
  function doneView() {
    const msg = message();
    const vk = sentVia === 'vk';
    const app = vk ? 'ВКонтакте' : 'Telegram';
    const prefilled = !vk && S.telegramLink(msg) !== S.TELEGRAM;   // текст сам подставился в чат
    const text = prefilled
      ? 'Текст заказа уже в поле сообщения Telegram — осталось нажать «Отправить». Если поле пустое — вставь текст' +
        (copied ? ': мы его скопировали.' : ' ниже.')
      : copied
        ? `Мы скопировали текст заказа. Вставь его в чат ${app} и отправь — ответим и обо всём договоримся.`
        : `Скопируй текст заказа, вставь его в чат ${app} и отправь — ответим и обо всём договоримся.`;
    return {
      title: 'Готово',
      body: `
        <div class="cart-done">
          ${ICON_DONE}
          <p class="cart-done__title">${copied ? 'Заказ скопирован' : 'Заказ собран'}</p>
          ${orderNo ? `<p class="cart-done__no">Заказ № ${orderNo}</p>` : ''}
          <p class="cart-done__text">${text}</p>
          <pre class="cart-done__msg" tabindex="0" aria-label="Текст заказа">${esc(msg)}</pre>
          <p class="cart-done__ask">Сообщение уже отправлено?</p>
          <button type="button" class="cart__clear" data-cart-finish>Да — очистить корзину</button>
        </div>`,
      foot: `
        <a href="${esc(chatLink(sentVia, msg))}" class="btn cart__cta" target="_blank" rel="noopener">${vk ? ICON_VK : ICON_TG} Открыть ${app}</a>
        <button type="button" class="cart__alt" data-cart-copy>${copied ? 'Скопировать текст ещё раз' : 'Скопировать текст'}</button>`
    };
  }

  const VIEWS = { list: listView, checkout: checkoutView, points: pointsView, pay: payView, done: doneView };

  function render() {
    unmountMap();
    const list = items();
    if (!list.length) view = 'list';                 // корзину очистили — возвращаемся к списку
    const t = totals(list);
    if (view === 'pay' && !payMethod(t).online) view = 'checkout';   // онлайн-оплата стала недоступна
    if (view === 'points' && !(byMap() && state.cityId && state.method === 'pvz')) view = 'checkout';
    if (view !== 'list' && !orderNo) orderNo = newOrderNo();
    if (view !== 'list') requestQuote();
    const v = VIEWS[view](list, t);
    el.title.textContent = v.title;
    el.qty.textContent = t.count;
    el.qty.hidden = view !== 'list' || !t.count;
    el.back.hidden = view === 'list';
    el.body.innerHTML = v.body;
    el.foot.innerHTML = v.foot;
    el.body.classList.toggle('is-fresh', fresh);
    el.body.classList.toggle('is-points', view === 'points');
    // на телефоне в «Оформлении» кнопка «Оплатить» не прилеплена к низу, а стоит в конце страницы:
    // тогда прокручивается всё окно целиком (style.css, .cart__panel.is-flow)
    panel.classList.toggle('is-flow', view === 'checkout');
    if (fresh) { el.body.scrollTop = 0; panel.scrollTop = 0; }
    fresh = false;
    if (view === 'points') mountMap();
    // нажатую кнопку могли только что стереть (например, «×» у товара) — возвращаем фокус в окно
    if (!panel.contains(document.activeElement)) panel.focus({ preventScroll: true });
  }

  function show(v) {
    view = v;
    fresh = true;
    undo = null;
    render();
  }

  // Перерисовать текущий экран, не сбивая прокрутку и кнопку, на которой стоял фокус
  // что сейчас прокручивается: всё окно (телефон, «Оформление») или только его середина
  const scroller = () => getComputedStyle(panel).overflowY === 'auto' ? panel : el.body;

  function renderKeep() {
    const top = scroller().scrollTop;
    const a = document.activeElement;
    let again = '';
    if (a && root.contains(a)) {
      if (a.id) again = '#' + a.id;
      else ['cartShip', 'cartMethod', 'cartPay'].forEach((k) => {
        if (k in a.dataset) again = `[data-${k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}="${a.dataset[k]}"]`;
      });
    }
    render();
    scroller().scrollTop = top;
    const target = again && root.querySelector(again);
    if (target) target.focus({ preventScroll: true });
  }

  // Пришла цена доставки: обновляем строку цены, итог и кнопку — поля ввода не трогаем,
  // чтобы не сбить человека, который как раз печатает адрес
  function paintQuote() {
    if (!isOpen) return;
    if (view === 'pay') { renderKeep(); return; }
    if (view !== 'checkout') return;
    const list = items();
    const t = totals(list);
    const q = el.body.querySelector('[data-quote]');
    if (q) q.innerHTML = quoteHTML();
    const s = el.body.querySelector('[data-sum]');
    if (s) s.innerHTML = sumHTML(t);
    el.foot.innerHTML = checkoutView(list, t).foot;
  }
  function paintMore() {
    const box = el.body.querySelector('[data-ship-more]');
    if (box) box.innerHTML = moreHTML();
  }

  // ----- Открыть / закрыть -----
  // Пока окно открыто, страница под ним не прокручивается. На компьютере при этом исчезает полоса
  // прокрутки — добавляем отступ такой же ширины, чтобы страница не «прыгала» вбок.
  function lockScroll(on) {
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = on ? 'hidden' : '';
    document.body.style.paddingRight = on && gap > 0 ? gap + 'px' : '';
  }

  // Кнопка «Назад» на телефоне должна закрывать корзину, а не уводить со страницы. Для этого при
  // открытии кладём в историю браузера «закладку», а при закрытии — убираем её (history.back).
  let inHistory = false;
  let afterClose = null;  // что сделать, когда закладка убрана (например, прокрутить к каталогу)
  let lastFocus = null;
  let hideTimer = 0;

  function open(restored) {
    if (isOpen) return;
    isOpen = true;
    lastFocus = document.activeElement;
    view = 'list';
    fresh = true;
    undo = null;
    clearTimeout(hideTimer);
    render();
    root.hidden = false;
    lockScroll(true);
    void root.offsetWidth;                           // чтобы окно выехало плавно, а не появилось сразу
    root.classList.add('is-open');
    panel.focus({ preventScroll: true });
    inHistory = !!restored;
    if (!restored) {
      try { history.pushState({ cart: true }, ''); inHistory = true; } catch (e) { /* браузер не дал — обойдёмся без закладки */ }
    }
  }

  function runAfterClose() {
    const fn = afterClose;
    afterClose = null;
    if (fn) fn();
  }

  function hide(then, fromHistory) {
    if (!isOpen) { if (then) then(); return; }
    isOpen = false;
    root.classList.remove('is-open');
    lockScroll(false);
    hideTimer = setTimeout(() => { root.hidden = true; unmountMap(); }, 420);
    undo = null;
    notice = '';
    hideSug();
    if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    const back = inHistory && !fromHistory;
    inHistory = false;
    if (back) {
      afterClose = then || null;
      history.back();
      setTimeout(runAfterClose, 400);                // на случай, если браузер промолчит
    } else if (then) {
      then();
    }
  }

  window.addEventListener('popstate', (e) => {
    if (isOpen) hide(null, true);                              // нажали «Назад» — закрываем
    else if (e.state && e.state.cart) open(true);              // нажали «Вперёд» — открываем снова
    setTimeout(runAfterClose, 0);
  });

  // «В каталог» из пустой корзины: на главной — прокрутить к каталогу, на странице товара — перейти
  function goShopping() {
    hide(() => {
      const section = document.getElementById('catalog');
      if (section) section.scrollIntoView();
      else if (!document.getElementById('catalogApp')) location.href = 'catalog.html';
    });
  }

  // «Отправить в Telegram / ВКонтакте»: копируем текст и показываем экран «Готово».
  // Саму ссылку не останавливаем — чат откроется в новой вкладке.
  function send(ch) {
    sentVia = ch === 'vk' ? 'vk' : 'tg';
    S.copyText(message()).then((ok) => setTimeout(() => { copied = ok; show('done'); }, 0));
  }

  function copyAgain(btn) {
    S.copyText(message()).then((ok) => {
      copied = copied || ok;
      btn.textContent = ok ? 'Скопировано!' : 'Не получилось — выдели текст и скопируй вручную';
    });
  }

  // Покупатель дописал адрес — обновляем текст заказа в ссылке на Telegram (у ВКонтакте текста в ссылке нет)
  function syncSendLink() {
    const href = S.telegramLink(message());
    root.querySelectorAll('[data-cart-send="tg"]').forEach((a) => { a.href = href; });
  }

  // ----- Выбор доставки -----
  function pickService(id) {
    if (id === state.delivery) return;
    state.delivery = id;
    state.point = null;
    state.cityId = '';            // у каждой службы свой справочник городов — найдём город заново
    save();
    renderKeep();
    resolveCity();
  }

  function pickMethod(id) {
    if (id === state.method) return;
    state.method = id;
    save();
    renderKeep();
  }

  // Город уже вписан, а номера в справочнике службы нет (сменили службу) — ищем его по названию
  function resolveCity() {
    const name = state.city, sid = state.delivery;
    if (!byMap() || !name || !sid) return;
    D.cities(sid, name).then((list) => {
      const c = (list || []).find((x) => norm(x.name) === norm(name));
      if (!c || state.delivery !== sid || state.city !== name || state.cityId) return;
      state.cityId = String(c.id);
      save();
      if (view !== 'checkout') return;
      if (state.method === 'pvz') paintMore();        // для курьера там поля адреса — их не трогаем
      requestQuote();
      paintQuote();
    }, () => {});
  }

  // Подсказки города
  let sugList = [];
  let sugSeq = 0;
  let sugTimer = 0;

  function searchCity() {
    clearTimeout(sugTimer);
    const q = state.city, seq = ++sugSeq;
    if (q.length < 2) { hideSug(); return; }
    sugTimer = setTimeout(() => {
      D.cities(state.delivery, q).then((list) => { if (seq === sugSeq) showSug(list); }, () => { if (seq === sugSeq) showSug([]); });
    }, 200);
  }

  function showSug(list) {
    const ul = root.querySelector('#cartSug');
    const input = root.querySelector('#cartCity');
    if (!ul || !input) return;
    sugList = (list || []).slice(0, 8);
    ul.innerHTML = sugList.length
      ? sugList.map((c, i) => `<li role="option"><button type="button" data-cart-city="${i}"><b>${esc(c.name)}</b><small>${esc(c.region || '')}</small></button></li>`).join('')
      : `<li class="cart-sug__none">Не нашли такой город${D.MODE === 'demo' ? ' (в демо — только крупные города)' : ''} — проверь название или напиши нам в Telegram</li>`;
    ul.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function hideSug() {
    sugSeq++;
    clearTimeout(sugTimer);
    sugList = [];
    const ul = root.querySelector('#cartSug');
    const input = root.querySelector('#cartCity');
    if (ul) { ul.hidden = true; ul.innerHTML = ''; }
    if (input) input.setAttribute('aria-expanded', 'false');
  }

  function onCityInput(input) {
    state.city = clean(input.value, 60);
    if (byMap() && state.cityId) {                   // город поменяли руками — прежний выбор больше не действует
      state.cityId = '';
      state.point = null;
      requestQuote();
      paintMore();
      paintQuote();
    }
    if (byMap()) searchCity();
  }

  // Почтовый индекс: только цифры; набрали все 6 — спрашиваем у Почты цену и срок
  function onIndexInput(input) {
    const v = input.value.replace(/\D/g, '').slice(0, 6);
    if (v !== input.value) input.value = v;
    if (v === state.index) return;
    state.index = v;
    if (indexOk()) needShip('');
    requestQuote();
    paintQuote();
  }

  function pickCity(i) {
    const c = sugList[i];
    if (!c) return;
    if (String(c.id) !== state.cityId) state.point = null;
    state.city = clean(c.name, 60);
    state.cityId = String(c.id);
    hideSug();
    save();
    if (document.activeElement && document.activeElement.id === 'cartCity') document.activeElement.blur();   // на телефоне прячем клавиатуру
    renderKeep();
  }

  // «Оплатить», а доставка заполнена не до конца — показываем, чего не хватает
  function missing() {
    if (!SHIP_STEP) return null;                     // шага «Доставка» нет — и требовать нечего
    if (!state.delivery) return ['Выбери службу доставки — СДЭК или Почта России', ''];
    if (byIndex()) {
      if (!indexOk()) return ['Укажи почтовый индекс — 6 цифр', '#cartIndex'];
      if (quoteNow.status === 'error' && quoteNow.reason === 'index' && quoteNow.key === quoteKey()) {
        return ['Почта не нашла этот индекс — проверь его', '#cartIndex'];
      }
    } else if (!state.city || (byMap() && !state.cityId)) {
      return [byMap() ? 'Выбери город из подсказок' : 'Укажи город', '#cartCity'];
    }
    if (state.method === 'door' && !state.street) return ['Укажи улицу и дом — куда привезти заказ', '#cartStreet'];
    if (state.method === 'pvz' && state.delivery === 'cdek' && !byMap() && !state.pointText) {
      return ['Впиши адрес пункта выдачи СДЭК', '#cartPoint'];
    }
    if (state.method === 'pvz' && byMap() && !state.point) {
      return [(state.delivery === 'post' ? 'Выбери отделение' : 'Выбери пункт выдачи') + ' на карте', '[data-cart-points]'];
    }
    return null;
  }

  function needShip(msg, focusOn) {
    const step = root.querySelector('[data-step="ship"]');
    if (!step) return;
    const box = step.querySelector('.cart-step__need');
    step.classList.remove('is-need');
    if (box) box.textContent = msg;
    if (!msg) return;
    void step.offsetWidth;                           // чтобы «встряска» сыграла и при повторном нажатии
    step.classList.add('is-need');
    const target = focusOn && step.querySelector(focusOn);
    (target || box).scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (target && !target.disabled) target.focus({ preventScroll: true });
  }

  function goPay() {
    const miss = missing();
    if (miss) { needShip(miss[0], miss[1]); return; }
    show('pay');
  }

  // Способ оплаты: подсвечиваем выбранный и меняем главную кнопку внизу
  // («Оплатить», «Заказать через Telegram» или «Заказать через ВКонтакте»)
  function pickPay(id) {
    state.pay = id;
    save();
    root.querySelectorAll('[data-cart-pay]').forEach((b) => {
      const on = b.dataset.cartPay === id;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on);
    });
    const list = items();
    el.foot.innerHTML = checkoutView(list, totals(list)).foot;
  }

  // ----- Нажатия внутри окна -----
  root.addEventListener('click', (e) => {
    const t = e.target.closest('button, a, [data-cart-close]');
    if (!t || !root.contains(t) || t.closest('.leaflet-container')) return;   // нажатия по карте — её дело
    const d = t.dataset;
    if ('cartClose' in d) hide();
    else if ('cartBack' in d) show(view === 'checkout' ? 'list' : 'checkout');
    else if ('cartDel' in d) remove(d.cartDel);
    else if ('cartUndo' in d) restore();
    else if ('cartClear' in d) clear(true);
    else if ('cartGo' in d) { if (d.cartGo === 'pay') goPay(); else show(d.cartGo); }
    else if ('cartShip' in d) pickService(d.cartShip);
    else if ('cartMethod' in d) pickMethod(d.cartMethod);
    else if ('cartCity' in d) pickCity(Number(d.cartCity));
    else if ('cartPoints' in d) openPoints();
    else if ('cartPoint' in d) pickPoint(d.cartPoint, true);
    else if ('cartPointOk' in d) confirmPoint();
    else if ('cartPay' in d) pickPay(d.cartPay);
    else if ('cartSend' in d) send(d.cartSend);
    else if ('cartCopy' in d) copyAgain(t);
    else if ('cartShop' in d) goShopping();
    else if ('cartFinish' in d) {
      clear(false);
      hide();
      S.showToast('Спасибо за заказ! Ответим ' + (sentVia === 'vk' ? 'во ВКонтакте' : 'в Telegram'));
    }
  });

  // Нажатие на подсказку не должно уводить фокус из поля города (иначе список исчезнет раньше времени)
  root.addEventListener('mousedown', (e) => { if (e.target.closest('.cart-sug')) e.preventDefault(); });

  root.addEventListener('input', (e) => {
    const id = e.target.id;
    if (id === 'cartCity') onCityInput(e.target);
    else if (id === 'cartStreet') { state.street = clean(e.target.value, 120); if (state.street) needShip(''); }
    else if (id === 'cartFlat') state.flat = clean(e.target.value, 20);
    else if (id === 'cartIndex') onIndexInput(e.target);
    else if (id === 'cartPoint') { state.pointText = clean(e.target.value, 150); if (state.pointText) needShip(''); }
    else return;
    save();
    syncSendLink();
  });

  root.addEventListener('focusin', (e) => {
    if (e.target.id === 'cartCity' && byMap() && !state.cityId) searchCity();
  });
  root.addEventListener('focusout', (e) => {
    if (e.target.id !== 'cartCity') return;
    setTimeout(() => { if (document.activeElement !== e.target) hideSug(); }, 150);
  });

  // Клавиатура: Esc закрывает, Tab ходит по кругу только внутри окна, Enter в поле города — первая подсказка
  root.addEventListener('keydown', (e) => {
    e.stopPropagation();                             // стрелки не должны листать фото товара под окном
    if (e.target.id === 'cartCity' && sugList.length && (e.key === 'Enter' || e.key === 'Escape')) {
      e.preventDefault();
      if (e.key === 'Enter') pickCity(0); else hideSug();
      return;
    }
    if (e.key === 'Escape') { hide(); return; }
    if (e.key !== 'Tab') return;
    const f = Array.from(panel.querySelectorAll('a[href], button:not([disabled]), input, [tabindex="0"]')).filter((x) => x.offsetParent !== null);
    if (!f.length) { e.preventDefault(); return; }
    const first = f[0], last = f[f.length - 1], now = document.activeElement;
    if (e.shiftKey && (now === first || now === panel)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && now === last) { e.preventDefault(); first.focus(); }
  });
  document.addEventListener('keydown', (e) => { if (isOpen && e.key === 'Escape') hide(); });

  // ----- Нажатия на странице: «В корзину» под товаром и значок в шапке -----
  document.addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-cart-add]');
    if (addBtn) {
      const id = addBtn.dataset.cartAdd;
      if (has(id)) { remove(id); undo = null; } else add(id, addBtn);   // второе нажатие — убрать из корзины
      return;
    }
    if (e.target.closest('[data-cart-open]')) open();
  });

  // Корзину изменили в другой вкладке или вернулись на страницу кнопкой «Назад» — сверяемся
  window.addEventListener('storage', (e) => { if (e.key === KEY) { load(); refresh(); } });
  window.addEventListener('pageshow', (e) => { if (e.persisted) { load(); dropSold(); refresh(); } });

  // ----- Запуск -----
  load();
  dropSold();
  refresh();
  // Вернулись «Назад» на страницу, где корзина была открыта, — открываем её снова
  if (history.state && history.state.cart) open(true);

  return { has, add, remove, clear, open, close: hide, button, count: () => state.items.length };
})();
