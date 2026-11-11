// ===== Страница товара =====
// Берём номер товара из адреса (product.html?id=7), находим его в data/products.js
// и рисуем: галерею фото, цену, кнопку заказа, характеристики, описание и информацию о ремонте.

(function () {
  const S = window.Shop;
  const { esc, price, photos, category } = S;
  const id = new URLSearchParams(location.search).get('id');
  const p = (window.PRODUCTS || []).find((x) => String(x.id) === id);

  const root = document.getElementById('pp');
  if (!p) {
    document.getElementById('notFound').hidden = false;
    return;
  }

  const cat = category(p.category);
  const pics = photos(p);
  const name = S.title(p);                 // модель (или «Клюшка», «Краги»…) + «(вратарская)»
  const title = p.brand + ' ' + name;
  document.title = title + ' — КЛЮШКИ RUSSIA';

  // «Хлебные крошки»: Главная / Каталог / Клюшки / Восстановленные / Название
  const catURL = 'catalog.html?cat=' + p.category;
  let crumbs = `<a href="index.html">Главная</a> / <a href="catalog.html">Каталог</a> / <a href="${catURL}">${cat.label}</a>`;
  if (p.type) {
    const typeLabel = (S.TYPES.find((t) => t.id === p.type) || {}).label;
    crumbs += ` / <a href="${catURL}&type=${p.type}">${esc(typeLabel)}</a>`;
  }
  document.getElementById('crumbs').innerHTML = crumbs + ' / ' + esc(name);

  // ----- Разметка -----
  const badgeText = S.TYPE_BADGE[p.type]
    ? S.TYPE_BADGE[p.type] + (p.repair ? ' · ' + S.repairLabel(p.repair).toLowerCase() : '')
    : '';

  const galleryHTML = pics.length
    ? `
      <div class="gallery__main">
        ${badgeText ? `<span class="badge badge--${esc(p.type)}">${esc(badgeText)}</span>` : ''}
        <button type="button" class="gallery__zoom" id="gZoom" aria-label="Открыть фото на весь экран">
          <img id="gImg" src="${esc(pics[0])}" alt="${esc(title)} — фото 1">
        </button>
        ${pics.length > 1 ? `
          <button class="gallery__arrow gallery__arrow--prev" id="gPrev" type="button" aria-label="Предыдущее фото">‹</button>
          <button class="gallery__arrow gallery__arrow--next" id="gNext" type="button" aria-label="Следующее фото">›</button>
          <span class="gallery__count" id="gCount">1 / ${pics.length}</span>` : ''}
      </div>
      ${pics.length > 1 ? `<div class="gallery__thumbs" id="gThumbs">
        ${pics.map((src, i) => `<button type="button" class="gallery__thumb${i === 0 ? ' is-active' : ''}" data-i="${i}" aria-label="Фото ${i + 1}">
            <img src="${esc(src)}" alt="" loading="lazy"></button>`).join('')}
      </div>` : ''}`
    : `
      <div class="gallery__main">
        ${badgeText ? `<span class="badge badge--${esc(p.type)}">${esc(badgeText)}</span>` : ''}
        <span class="product__icon" aria-hidden="true">${cat.icon}</span>
      </div>
      <p class="gallery__nophoto">Фото скоро добавим — пришлём живые снимки в Telegram по запросу.</p>`;

  const repairHTML = p.repair ? `
    <div class="pp__repair">
      <h2 class="pp__h">О ремонте</h2>
      <p><b>Место перелома:</b> ${esc(S.repairLabel(p.repair).toLowerCase())}</p>
      ${p.repairNote ? `<p>${esc(p.repairNote)}</p>` : ''}
      <p class="pp__hint">Каждую восстановленную клюшку проверяем на изгиб и броски. По запросу пришлём фото места ремонта крупным планом.</p>
    </div>` : '';

  root.innerHTML = `
    <div class="pp__gallery gallery">${galleryHTML}</div>

    <div class="pp__info">
      <p class="product__brand">${esc(p.brand)}</p>
      <h1 class="pp__title">${esc(name)}</h1>
      <p class="product__specs">${esc(S.specsText(p))}</p>

      <div class="pp__buy">
        <span class="pp__price">${price(p.price)}</span>
        ${p.inStock ? '<span class="stock stock--yes">В наличии</span>' : '<span class="stock stock--no">Нет в наличии</span>'}
      </div>
      <div class="pp__buttons" id="ppButtons">
        ${S.orderButton(p)}
        <a href="tel:+70000000000" class="btn btn--dark">Позвонить</a>
      </div>
      <p class="pp__hint">«Заказать» скопирует текст заказа и откроет чат в Telegram — останется вставить и отправить.</p>

      ${repairHTML}

      <h2 class="pp__h">Характеристики</h2>
      <table class="specs">
        ${S.specsTable(p).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}
      </table>

      ${p.description ? `<h2 class="pp__h">Описание</h2><p class="pp__text">${esc(p.description)}</p>` : ''}

      <h2 class="pp__h">Доставка</h2>
      <p class="pp__text">СДЭК — до пункта выдачи или курьером. Почта России — в любое отделение. Стоимость посчитаем при оформлении.</p>

      <a href="${catURL}${p.type ? '&type=' + p.type : ''}" class="pp__back">← Назад в каталог</a>
    </div>`;

  S.bindOrderButtons(document.getElementById('ppButtons'));

  if (!pics.length) return;

  // ===== Галерея =====
  let current = 0;
  const img = document.getElementById('gImg');
  const count = document.getElementById('gCount');
  const thumbs = document.querySelectorAll('.gallery__thumb');
  const lb = {
    box: document.getElementById('lightbox'), img: document.getElementById('lbImg'),
    count: document.getElementById('lbCount')
  };

  function show(i) {
    current = (i + pics.length) % pics.length;          // по кругу: после последнего — первое
    img.src = pics[current];
    img.alt = `${title} — фото ${current + 1}`;
    if (count) count.textContent = `${current + 1} / ${pics.length}`;
    thumbs.forEach((t, n) => t.classList.toggle('is-active', n === current));
    if (!lb.box.hidden) {
      lb.img.src = pics[current];
      lb.img.alt = img.alt;
      lb.count.textContent = `${current + 1} / ${pics.length}`;
    }
  }

  const prev = () => show(current - 1);
  const next = () => show(current + 1);

  if (pics.length > 1) {
    document.getElementById('gPrev').addEventListener('click', prev);
    document.getElementById('gNext').addEventListener('click', next);
    thumbs.forEach((t) => t.addEventListener('click', () => show(Number(t.dataset.i))));
  }

  // Листание пальцем на телефоне
  function swipe(elem) {
    let x0 = null;
    elem.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
    elem.addEventListener('pointerup', (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 40 && pics.length > 1) {
        dx < 0 ? next() : prev();
        elem.dataset.swiped = '1';                        // чтобы свайп не открыл фото на весь экран
      }
    });
  }
  const zoom = document.getElementById('gZoom');
  swipe(zoom);

  // ----- Фото на весь экран -----
  function openLightbox() {
    lb.box.hidden = false;
    document.body.style.overflow = 'hidden';
    show(current);
    document.getElementById('lbClose').focus();
  }
  function closeLightbox() {
    lb.box.hidden = true;
    document.body.style.overflow = '';
    zoom.focus();
  }

  zoom.addEventListener('click', () => {
    if (zoom.dataset.swiped) { delete zoom.dataset.swiped; return; }
    openLightbox();
  });
  document.getElementById('lbClose').addEventListener('click', closeLightbox);
  document.getElementById('lbPrev').addEventListener('click', prev);
  document.getElementById('lbNext').addEventListener('click', next);
  lb.box.addEventListener('click', (e) => { if (e.target === lb.box) closeLightbox(); });
  document.getElementById('lbPrev').hidden = document.getElementById('lbNext').hidden = pics.length < 2;
  swipe(lb.img);

  // Клавиатура: ← → листают, Esc закрывает
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'Escape' && !lb.box.hidden) closeLightbox();
  });
})();
