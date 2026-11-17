// ===== Корзина =====
// Покупатель складывает товары в корзину, а при оформлении она собирает один общий текст заказа
// для Telegram. Оплаты на сайте нет, и сама корзина никуда ничего не отправляет: список товаров
// хранится только в браузере покупателя (localStorage) — поэтому не пропадает при переходе между
// страницами и при следующем заходе на сайт.
// Товары штучные (каждая клюшка — одна), поэтому «количества» нет: товар либо в корзине, либо нет.
// Значок корзины стоит в шапке каждой страницы (кнопка #cartBtn), а выдвижное окно этот скрипт
// создаёт сам — править его нужно только здесь. Оформление — в style.css, блок «КОРЗИНА».
//
// В окне три экрана: «Корзина» (список) → «Оформление» (доставка, итог) → «Готово» (текст заказа).

window.Cart = (function () {
  const S = window.Shop;
  const { esc, price, hasPrice, title, photos, category, specsText } = S;
  const PRODUCTS = window.PRODUCTS || [];
  const KEY = 'klushki-cart';                       // под этим именем корзина лежит в браузере
  const PHONE = { href: 'tel:+70000000000', text: '+7 (000) 000-00-00' };
  const DELIVERY = [
    { id: 'cdek', label: 'СДЭК',         note: 'До пункта выдачи или курьером' },
    { id: 'post', label: 'Почта России', note: 'В любое отделение страны' }
  ];
  const WORDS = ['товар', 'товара', 'товаров'];

  // 1 товар, 2 товара, 5 товаров
  const plural = (n, w) => w[n % 10 === 1 && n % 100 !== 11 ? 0
    : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 1 : 2];
  const find = (id) => PRODUCTS.find((p) => String(p.id) === String(id));
  const fullName = (p) => [p.brand, title(p)].filter(Boolean).join(' ');
  const cleanCity = (s) => String(s).replace(/\s+/g, ' ').trim().slice(0, 60);

  const ICON_CART = '<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4.5h3.4l3 13.2h12.6l2.6-9.4H6.8"/><circle cx="11" cy="22.6" r="1.7"/><circle cx="20" cy="22.6" r="1.7"/></svg>';
  const ICON_TG = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M21.5 3.6 2.9 10.8c-1.3.5-1.3 1.2-.2 1.6l4.8 1.5 1.8 5.6c.2.6.4.8.8.8.4 0 .6-.2.9-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.1-14.8c.3-1.3-.5-1.9-1.4-1.5ZM8.7 13.6l9.4-5.9c.5-.3.9-.1.5.2l-7.9 7.2-.3 3.3-1.7-4.8Z"/></svg>';
  const ICON_DONE = '<svg class="cart-done__icon" viewBox="0 0 96 96" fill="none" aria-hidden="true"><circle class="cart-done__ring" cx="48" cy="48" r="42" stroke-width="4"/><path class="cart-done__check" d="M30 49.5 43 62l24-27" stroke-width="6"/></svg>';

  // ----- Что лежит в корзине -----
  // items — номера товаров (id) в том порядке, в каком их добавляли
  const state = { items: [], delivery: '', city: '' };

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
      state.items = Array.isArray(d.items) ? [...new Set(d.items.map(String))] : [];
      state.delivery = DELIVERY.some((x) => x.id === d.delivery) ? d.delivery : '';
      state.city = typeof d.city === 'string' ? cleanCity(d.city) : '';
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

  // ----- Изменения корзины -----
  let undo = null;        // что вернуть по кнопке «Вернуть»: { items: прежний список, text: подпись }

  function add(id, fromEl) {
    const p = find(id);
    if (!p || !p.inStock || has(id)) return;
    state.items.push(String(id));
    undo = null;
    save();
    refresh();
    flyPuck(fromEl);
  }
  function remove(id) {
    const p = find(id);
    undo = { items: state.items.slice(), text: p ? 'Убрали «' + fullName(p) + '»' : 'Товар убран' };
    state.items = state.items.filter((x) => x !== String(id));
    save();
    refresh();
  }
  function clear(keepUndo) {
    undo = keepUndo ? { items: state.items.slice(), text: 'Корзина очищена' } : null;
    state.items = [];
    save();
    refresh();
  }
  function restore() {
    if (!undo) return;
    state.items = undo.items.filter((id) => { const p = find(id); return p && p.inStock; });
    undo = null;
    save();
    refresh();
  }

  // ----- Кнопка «В корзину» под товаром -----
  // Товар уже в корзине — кнопка превращается в «В корзине ✓» и открывает корзину.
  function button(p, extraClass) {
    const inCart = has(p.id);
    return `<button type="button" class="btn${inCart ? ' btn--in-cart' : ''}${extraClass ? ' ' + extraClass : ''}" ` +
      `data-cart-add="${esc(p.id)}">${inCart ? 'В корзине' : 'В корзину'}</button>`;
  }
  function paintButton(b) {
    const inCart = has(b.dataset.cartAdd);
    b.classList.toggle('btn--in-cart', inCart);
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
    const lines = ['Здравствуйте! Хочу заказать:', ''];
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
    const ship = DELIVERY.find((d) => d.id === state.delivery);
    if (ship || state.city) {
      lines.push('Доставка: ' + [ship && ship.label, state.city && 'город ' + state.city].filter(Boolean).join(', '));
    }
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
  let view = 'list';      // какой экран показан: list — корзина, checkout — оформление, done — готово
  let fresh = false;      // экран только что сменился — содержимое плавно появляется
  let copied = false;     // получилось ли скопировать текст заказа

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

  function totalHTML(t) {
    return `
      <div class="cart__total">
        <span>Итого <small>${t.count} ${plural(t.count, WORDS)}</small></span>
        <b>${t.sum ? price(t.sum) : 'По запросу'}</b>
      </div>`;
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
        <p class="cart__note">${t.sum && t.ask
          ? `Без ${t.ask === 1 ? 'товара' : 'товаров'} с ценой по запросу и без доставки — их посчитаем в чате.`
          : 'Доставка считается отдельно — зависит от города.'}</p>
        <button type="button" class="btn cart__cta" data-cart-go="checkout">Оформить заказ</button>`
    };
  }

  // ----- Экран «Оформление» -----
  function checkoutView(list, t) {
    return {
      title: 'Оформление',
      body: `
        <section class="cart-step">
          <p class="cart-step__label"><i>1</i> Доставка</p>
          <div class="cart-ship">
            ${DELIVERY.map((d) => `
              <button type="button" class="cart-ship__opt${d.id === state.delivery ? ' is-active' : ''}" data-cart-ship="${d.id}" aria-pressed="${d.id === state.delivery}">
                <b>${d.label}</b><span>${d.note}</span>
              </button>`).join('')}
          </div>
          <label class="cart-field">
            <span>Город <small>— если уже знаешь</small></span>
            <input type="text" id="cartCity" maxlength="60" autocomplete="address-level2" placeholder="Например, Казань" value="${esc(state.city)}">
          </label>
        </section>

        <section class="cart-step">
          <p class="cart-step__label"><i>2</i> Твой заказ</p>
          <ul class="cart-sum">
            ${list.map((p) => `<li><span>${esc(fullName(p))}</span><b>${hasPrice(p.price) ? price(p.price) : 'по запросу'}</b></li>`).join('')}
          </ul>
          ${totalHTML(t)}
        </section>

        <section class="cart-step">
          <p class="cart-step__label"><i>3</i> Отправка</p>
          <p class="cart-step__text">Оплаты на сайте нет. Нажми кнопку — заказ соберётся в одно сообщение
            и откроется Telegram. Мы ответим, пришлём живые фото и посчитаем доставку.</p>
        </section>`,
      foot: `
        <a href="${esc(S.telegramLink(message()))}" class="btn cart__cta" target="_blank" rel="noopener" data-cart-send>${ICON_TG} Отправить в Telegram</a>
        <a href="${PHONE.href}" class="cart__alt">или позвонить: ${PHONE.text}</a>`
    };
  }

  // ----- Экран «Готово» -----
  function doneView() {
    const msg = message();
    const prefilled = S.telegramLink(msg) !== S.TELEGRAM;   // текст сам подставился в чат
    const text = prefilled
      ? 'Текст заказа уже в поле сообщения Telegram — осталось нажать «Отправить». Если поле пустое — вставь текст: мы его скопировали.'
      : copied
        ? 'Мы скопировали текст заказа. Вставь его в чат Telegram и отправь — ответим и посчитаем доставку.'
        : 'Скопируй текст заказа, вставь его в чат Telegram и отправь — ответим и посчитаем доставку.';
    return {
      title: 'Готово',
      body: `
        <div class="cart-done">
          ${ICON_DONE}
          <p class="cart-done__title">${copied ? 'Заказ скопирован' : 'Заказ собран'}</p>
          <p class="cart-done__text">${text}</p>
          <pre class="cart-done__msg" tabindex="0" aria-label="Текст заказа">${esc(msg)}</pre>
          <p class="cart-done__ask">Сообщение уже отправлено?</p>
          <button type="button" class="cart__clear" data-cart-finish>Да — очистить корзину</button>
        </div>`,
      foot: `
        <a href="${esc(S.telegramLink(msg))}" class="btn cart__cta" target="_blank" rel="noopener">${ICON_TG} Открыть Telegram</a>
        <button type="button" class="cart__alt" data-cart-copy>${copied ? 'Скопировать текст ещё раз' : 'Скопировать текст'}</button>`
    };
  }

  const VIEWS = { list: listView, checkout: checkoutView, done: doneView };

  function render() {
    const list = items();
    if (!list.length) view = 'list';                 // корзину очистили — возвращаемся к списку
    const t = totals(list);
    const v = VIEWS[view](list, t);
    el.title.textContent = v.title;
    el.qty.textContent = t.count;
    el.qty.hidden = view !== 'list' || !t.count;
    el.back.hidden = view === 'list';
    el.body.innerHTML = v.body;
    el.foot.innerHTML = v.foot;
    el.body.classList.toggle('is-fresh', fresh);
    if (fresh) el.body.scrollTop = 0;
    fresh = false;
    // нажатую кнопку могли только что стереть (например, «×» у товара) — возвращаем фокус в окно
    if (!panel.contains(document.activeElement)) panel.focus({ preventScroll: true });
  }

  function show(v) {
    view = v;
    fresh = true;
    undo = null;
    render();
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
    hideTimer = setTimeout(() => { root.hidden = true; }, 420);
    undo = null;
    notice = '';
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

  // «Отправить в Telegram»: копируем текст и показываем экран «Готово».
  // Саму ссылку не останавливаем — Telegram откроется в новой вкладке.
  function send() {
    S.copyText(message()).then((ok) => setTimeout(() => { copied = ok; show('done'); }, 0));
  }

  function copyAgain(btn) {
    S.copyText(message()).then((ok) => {
      copied = copied || ok;
      btn.textContent = ok ? 'Скопировано!' : 'Не получилось — выдели текст и скопируй вручную';
    });
  }

  function pickDelivery(id) {
    state.delivery = state.delivery === id ? '' : id;   // повторное нажатие снимает выбор
    save();
    root.querySelectorAll('[data-cart-ship]').forEach((b) => {
      const on = b.dataset.cartShip === state.delivery;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on);
    });
    syncSendLink();
  }
  function syncSendLink() {
    const a = root.querySelector('[data-cart-send]');
    if (a) a.href = S.telegramLink(message());
  }

  // ----- Нажатия внутри окна -----
  root.addEventListener('click', (e) => {
    const t = e.target.closest('button, a, [data-cart-close]');
    if (!t || !root.contains(t)) return;
    const d = t.dataset;
    if ('cartClose' in d) hide();
    else if ('cartBack' in d) show(view === 'done' ? 'checkout' : 'list');
    else if ('cartDel' in d) remove(d.cartDel);
    else if ('cartUndo' in d) restore();
    else if ('cartClear' in d) clear(true);
    else if ('cartGo' in d) show(d.cartGo);
    else if ('cartShip' in d) pickDelivery(d.cartShip);
    else if ('cartSend' in d) send();
    else if ('cartCopy' in d) copyAgain(t);
    else if ('cartShop' in d) goShopping();
    else if ('cartFinish' in d) {
      clear(false);
      hide();
      S.showToast('Спасибо за заказ! Ответим в Telegram');
    }
  });

  root.addEventListener('input', (e) => {
    if (e.target.id !== 'cartCity') return;
    state.city = cleanCity(e.target.value);
    save();
    syncSendLink();
  });

  // Клавиатура: Esc закрывает, Tab ходит по кругу только внутри окна
  root.addEventListener('keydown', (e) => {
    e.stopPropagation();                             // стрелки не должны листать фото товара под окном
    if (e.key === 'Escape') { hide(); return; }
    if (e.key !== 'Tab') return;
    const f = Array.from(panel.querySelectorAll('a[href], button, input, [tabindex="0"]')).filter((x) => x.offsetParent !== null);
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
      if (has(addBtn.dataset.cartAdd)) open(); else add(addBtn.dataset.cartAdd, addBtn);
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
