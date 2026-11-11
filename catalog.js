// ===== Каталог: фильтры, сортировка, карточки =====
// Товары — из data/products.js (window.PRODUCTS), общий код — из shop.js (window.Shop).
// Выбранные фильтры попадают в адрес страницы (catalog.html?cat=sticks&type=restored&repair=blade),
// поэтому ссылкой на подборку можно поделиться.

(function () {
  // Каталог вставляется в <div id="catalogApp"> — и на главной, и на catalog.html
  const app = document.getElementById('catalogApp');
  if (!app) return;
  const syncAddress = app.hasAttribute('data-sync-url');   // на главной адрес не трогаем

  const PRODUCTS = window.PRODUCTS || [];
  const { CATEGORIES, TYPES, TYPE_BADGE, REPAIRS, esc, price, category, title, photos, specsText, repairLabel } = window.Shop;

  // ----- Разметка блока: панель фильтров + список товаров -----
  app.innerHTML = `
    <div class="panel filters">
      <p class="panel__label">Раздел</p>
      <div class="tabs" id="fCategory" role="tablist"></div>

      <div class="panel__sub" id="fTypeBox">
        <p class="panel__label">Тип клюшки</p>
        <div class="chips" id="fType"></div>
      </div>

      <!-- Появляется только при выборе «Восстановленные» -->
      <div class="panel__sub" id="fRepairBox" hidden>
        <p class="panel__label">Место перелома</p>
        <div class="chips" id="fRepair"></div>
      </div>

      <div class="filters__row">
        <div class="filters__group">
          <p class="panel__label">Бренд</p>
          <div class="chips chips--round" id="fBrand"></div>
        </div>

        <div class="filters__group" id="fHandBox">
          <p class="panel__label">Хват</p>
          <div class="chips chips--round" id="fHand"></div>
        </div>

        <div class="filters__right">
          <label class="toggle">
            <input type="checkbox" id="fStock">
            <span class="toggle__box" aria-hidden="true"></span>
            Только в наличии
          </label>

          <label class="sort">
            <span class="visually-hidden">Сортировка</span>
            <select id="fSort">
              <option value="default">Сначала новые</option>
              <option value="cheap">Сначала дешевле</option>
              <option value="expensive">Сначала дороже</option>
            </select>
          </label>
        </div>
      </div>
    </div>

    <p class="found" id="found" aria-live="polite"></p>
    <div class="products" id="products"></div>

    <div class="empty" id="empty" hidden>
      <p class="empty__title">Ничего не нашлось</p>
      <p>Попробуй убрать часть фильтров — или напиши нам, найдём под заказ.</p>
      <a href="https://t.me/" class="btn" target="_blank" rel="noopener">Написать в Telegram</a>
    </div>`;

  // Показываем только разделы и типы клюшек, в которых реально есть товары —
  // чтобы покупатель не попадал в пустой раздел. Появится товар — появится и кнопка.
  const CATS = CATEGORIES.filter((c) => PRODUCTS.some((p) => p.category === c.id));
  const STICK_TYPES = TYPES.filter((t) => t.id === 'all' || PRODUCTS.some((p) => p.category === 'sticks' && p.type === t.id));

  // ----- Текущие фильтры -----
  const state = { cat: (CATS[0] || CATEGORIES[0]).id, type: 'all', repair: 'all', brand: 'all', hand: 'all', stock: false, sort: 'default' };

  // Читаем фильтры из адреса (только на catalog.html). Поддерживаем и старые ссылки вида ?cat=sticks-original
  const params = new URLSearchParams(syncAddress ? location.search : '');
  let cat = params.get('cat') || state.cat;
  if (cat.startsWith('sticks-')) { state.type = cat.slice(7); cat = 'sticks'; }
  if (CATS.some((c) => c.id === cat)) state.cat = cat;
  if (STICK_TYPES.some((t) => t.id === params.get('type'))) state.type = params.get('type');
  if (!STICK_TYPES.some((t) => t.id === state.type)) state.type = 'all';
  if (REPAIRS.some((r) => r.id === params.get('repair'))) state.repair = params.get('repair');
  if (params.get('brand')) state.brand = params.get('brand');
  if (params.get('hand')) state.hand = params.get('hand');
  state.stock = params.get('stock') === '1';
  if (['cheap', 'expensive'].includes(params.get('sort'))) state.sort = params.get('sort');

  // ----- Элементы страницы -----
  const $ = (id) => document.getElementById(id);
  const el = {
    category: $('fCategory'), typeBox: $('fTypeBox'), type: $('fType'),
    repairBox: $('fRepairBox'), repair: $('fRepair'),
    brand: $('fBrand'), handBox: $('fHandBox'), hand: $('fHand'),
    stock: $('fStock'), sort: $('fSort'),
    found: $('found'), products: $('products'), empty: $('empty')
  };

  const unique = (arr) => [...new Set(arr)];
  const isSticks = () => state.cat === 'sticks';
  const isRestored = () => isSticks() && state.type === 'restored';

  // ----- Кнопки фильтров -----
  function renderButtons(container, items, current, onPick, cls) {
    container.innerHTML = items.map((it) =>
      `<button type="button" class="${cls}${it.id === current ? ' is-active' : ''}" data-id="${esc(it.id)}"` +
      (cls === 'tab' ? ` role="tab" aria-selected="${it.id === current}"` : ` aria-pressed="${it.id === current}"`) +
      `>${esc(it.label)}</button>`
    ).join('');
    container.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => onPick(b.dataset.id)));
  }

  // Кнопка-переключатель: нажал — включилось, нажал ещё раз — выключилось
  const toggle = (key) => (id) => { state[key] = state[key] === id ? 'all' : id; update(); };

  function renderFilters() {
    renderButtons(el.category, CATS, state.cat, (id) => {
      state.cat = id; state.type = 'all'; state.repair = 'all'; state.brand = 'all'; state.hand = 'all';
      update();
    }, 'tab');

    el.typeBox.hidden = !isSticks();
    el.handBox.hidden = !isSticks();
    el.repairBox.hidden = !isRestored();

    if (isSticks()) {
      renderButtons(el.type, STICK_TYPES, state.type, (id) => {
        state.type = id;
        if (id !== 'restored') state.repair = 'all';
        update();
      }, 'chip');
    }

    // Место перелома — только для восстановленных
    if (isRestored()) {
      renderButtons(el.repair, REPAIRS, state.repair, toggle('repair'), 'chip');
    }

    // Бренды и хваты — только те, что реально есть в выбранном разделе
    const inCat = PRODUCTS.filter((p) => p.category === state.cat);
    const brands = unique(inCat.map((p) => p.brand)).sort();
    if (state.brand !== 'all' && !brands.includes(state.brand)) state.brand = 'all';
    renderButtons(el.brand, [{ id: 'all', label: 'Все' }, ...brands.map((b) => ({ id: b, label: b }))],
      state.brand, (id) => { state.brand = id; update(); }, 'chip');

    // Хват: без кнопки «Любой» — повторное нажатие снимает фильтр
    if (isSticks()) {
      const hands = unique(inCat.map((p) => p.specs && p.specs.hand).filter(Boolean)).sort();
      renderButtons(el.hand, hands.map((h) => ({ id: h, label: h })), state.hand, toggle('hand'), 'chip');
    }

    el.stock.checked = state.stock;
    el.sort.value = state.sort;
  }

  // ----- Подбор товаров по фильтрам -----
  function filtered() {
    let list = PRODUCTS.filter((p) =>
      p.category === state.cat &&
      (!isSticks() || state.type === 'all' || p.type === state.type) &&
      (!isRestored() || state.repair === 'all' || p.repair === state.repair) &&
      (state.brand === 'all' || p.brand === state.brand) &&
      (!isSticks() || state.hand === 'all' || (p.specs && p.specs.hand === state.hand)) &&
      (!state.stock || p.inStock)
    );
    // «Цена по запросу» при сортировке по цене уходит в конец
    const cost = (p, none) => window.Shop.hasPrice(p.price) ? p.price : none;
    if (state.sort === 'cheap') list = list.slice().sort((a, b) => cost(a, Infinity) - cost(b, Infinity));
    if (state.sort === 'expensive') list = list.slice().sort((a, b) => cost(b, -Infinity) - cost(a, -Infinity));
    // Товары «нет в наличии» всегда в конце списка
    return list.slice().sort((a, b) => Number(b.inStock) - Number(a.inStock));
  }

  // ----- Карточка товара -----
  // Фото и название — ссылки на страницу товара; кнопка «Заказать» — отдельно.
  function cardHTML(p) {
    const url = 'product.html?id=' + encodeURIComponent(p.id);
    const first = photos(p)[0];
    const pic = first
      ? `<img src="${esc(first)}" alt="${esc(p.brand + ' ' + title(p))}" loading="lazy">`
      : `<span class="product__icon" aria-hidden="true">${category(p.category).icon}</span>`;
    const badgeText = TYPE_BADGE[p.type]
      ? TYPE_BADGE[p.type] + (p.repair ? ' · ' + repairLabel(p.repair).toLowerCase() : '')
      : '';
    const badge = badgeText ? `<span class="badge badge--${esc(p.type)}">${esc(badgeText)}</span>` : '';
    const count = photos(p).length > 1 ? `<span class="product__count">${photos(p).length} фото</span>` : '';
    const stock = p.inStock
      ? '<span class="stock stock--yes">В наличии</span>'
      : '<span class="stock stock--no">Нет в наличии</span>';

    return `
      <article class="product${p.inStock ? '' : ' is-out'}">
        <a href="${url}" class="product__pic" tabindex="-1" aria-hidden="true">${badge}${pic}${count}</a>
        <div class="product__body">
          <p class="product__brand">${esc(p.brand)}</p>
          <h2 class="product__name"><a href="${url}">${esc(title(p))}</a></h2>
          <p class="product__specs">${esc(specsText(p))}</p>
          <div class="product__bottom">
            <span class="product__price">${price(p.price)}</span>
            ${stock}
          </div>
          ${window.Shop.orderButton(p, 'product__btn')}
        </div>
      </article>`;
  }

  function renderProducts() {
    const list = filtered();
    el.products.innerHTML = list.map(cardHTML).join('');
    el.empty.hidden = list.length > 0;
    el.found.textContent = 'Найдено: ' + list.length;
  }

  // ----- Адрес страницы отражает фильтры -----
  function syncURL() {
    if (!syncAddress) return;
    const q = new URLSearchParams();
    q.set('cat', state.cat);
    if (isSticks() && state.type !== 'all') q.set('type', state.type);
    if (isRestored() && state.repair !== 'all') q.set('repair', state.repair);
    if (state.brand !== 'all') q.set('brand', state.brand);
    if (isSticks() && state.hand !== 'all') q.set('hand', state.hand);
    if (state.stock) q.set('stock', '1');
    if (state.sort !== 'default') q.set('sort', state.sort);
    history.replaceState(null, '', '?' + q.toString());
  }

  function update() {
    renderFilters();
    renderProducts();
    syncURL();
  }

  el.stock.addEventListener('change', () => { state.stock = el.stock.checked; update(); });
  el.sort.addEventListener('change', () => { state.sort = el.sort.value; update(); });
  window.Shop.bindOrderButtons(el.products);

  update();
})();
