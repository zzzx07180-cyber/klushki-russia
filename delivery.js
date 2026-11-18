// ===== Доставка: СДЭК и Почта России =====
// Всё, что корзина (cart.js) знает о доставке: службы и способы (пункт выдачи / курьер до двери),
// поиск города, пункты выдачи на карте, расчёт цены и срока. Сам выбор на экране рисует cart.js.
// Подключается на всех трёх страницах ПЕРЕД cart.js.
//
// Файл работает в одном из трёх режимов (выбирается сам, см. MODE ниже):
//  • 'off'  — СЕЙЧАС на настоящем сайте. Покупатель выбирает службу, способ, город и (для курьера) адрес,
//             а пункт выдачи и цену доставки уточняем в чате. Карты и автоматической цены нет.
//  • 'demo' — ПОКАЗ того, как будет после договоров. Города, пункты на карте и цены — ПРИМЕРЫ, их
//             придумывает этот файл (блок «Демо-данные» внизу). Включается сам на предпросмотре
//             (localhost), а на настоящем сайте — только по ссылке с «?demo» (например, …/catalog.html?demo);
//             «?demo=0» — выключить. В корзине при этом висит заметная плашка «Демо».
//  • 'live' — НАСТОЯЩИЙ, когда будут договоры со СДЭК и Почтой России. Их ключи доступа секретные —
//             в этот публичный репозиторий их класть нельзя. Поэтому между сайтом и службами встанет
//             наш маленький «сервер доставки»: его адрес вписать в API_URL — и сайт начнёт спрашивать
//             у него настоящие города, пункты и цены. Что сервер должен отвечать — описано у функции api().

window.Delivery = (function () {
  // ===================== НАСТРОЙКИ =====================

  // Адрес нашего сервера доставки. Пока пусто — сервера нет (появится после договоров).
  const API_URL = '';

  // Размер и вес посылки в упаковке — по разделу каталога (см, кг; примерно).
  // Службы берут за посылку по большему из двух: настоящий вес или «объёмный» (Д×Ш×В / 5000).
  // Клюшка в коробке — «длинномер»: лёгкая, но длинная, поэтому считается как ~3 кг.
  const PACKAGES = {
    sticks:  { length: 170, width: 12, height: 8,  weight: 1.0 },
    skates:  { length: 40,  width: 30, height: 15, weight: 2.5 },
    elbows:  { length: 35,  width: 25, height: 15, weight: 1.0 },
    gloves:  { length: 45,  width: 30, height: 20, weight: 1.5 },
    helmets: { length: 35,  width: 30, height: 25, weight: 1.5 }
  };

  // Службы и способы доставки. pvz — забрать самому (пункт выдачи / отделение), door — курьер до двери.
  const SERVICES = [
    { id: 'cdek', label: 'СДЭК', note: 'Пункт выдачи или курьер',
      methods: [
        { id: 'pvz',  label: 'Пункт выдачи',      text: 'пункт выдачи',      pick: 'Выбрать пункт выдачи', title: 'Пункты СДЭК' },
        { id: 'door', label: 'Курьером до двери', text: 'курьером до двери' }
      ] },
    { id: 'post', label: 'Почта России', note: 'Отделение или курьер',
      methods: [
        { id: 'pvz',  label: 'В отделение',       text: 'в отделение',       pick: 'Выбрать отделение',    title: 'Отделения почты' },
        { id: 'door', label: 'Курьером до двери', text: 'курьером до двери' }
      ] }
  ];

  // ===================== РЕЖИМ =====================
  function demoWanted() {
    const q = location.search.match(/[?&]demo(?:=(\w*))?(?:&|$)/);
    try {                                            // запоминаем на время вкладки: каталог переписывает адрес
      if (q) sessionStorage.setItem('klushki-demo', q[1] === '0' ? '0' : '1');
      const s = sessionStorage.getItem('klushki-demo');
      if (s) return s === '1';
    } catch (e) {
      if (q) return q[1] !== '0';
    }
    return /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  }
  const MODE = API_URL ? 'live' : demoWanted() ? 'demo' : 'off';

  const service = (id) => SERVICES.find((s) => s.id === id) || null;
  const method = (sid, mid) => { const s = service(sid); return s && s.methods.find((m) => m.id === mid) || null; };

  // Посылки для расчёта цены: по одной коробке на товар
  const parcels = (products) => products.map((p) => Object.assign({}, PACKAGES[p.category] || PACKAGES.sticks));

  // ===================== ЗАПРОСЫ =====================
  // Наш будущий сервер доставки. Он принимает запросы сайта и сам спрашивает СДЭК / Почту со своими ключами:
  //   GET  API_URL/cities?service=cdek&q=каз        → [{ id, name, region, lat, lon }]  — подсказки города
  //   GET  API_URL/points?service=cdek&city=<id>    → [{ id, name, address, hours, lat, lon }] — пункты/отделения
  //   POST API_URL/quote { service, method, city, parcels: [{ length, width, height, weight }] }
  //                                                 → { price, daysMin, daysMax }  — цена (₽) и срок (дней)
  // Личных данных (адрес, имя) сайт туда не отправляет: для цены хватает города и размеров посылки.
  function api(path, body) {
    return fetch(API_URL.replace(/\/$/, '') + path, body
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : undefined
    ).then((r) => { if (!r.ok) throw new Error('Сервер доставки ответил ' + r.status); return r.json(); });
  }
  const enc = encodeURIComponent;
  // В демо отвечаем с небольшой задержкой, как настоящий сервер, — видно, как выглядит «загрузка»
  const later = (fn) => new Promise((ok) => setTimeout(() => ok(fn()), 250 + Math.random() * 300));

  // Подсказки города по первым буквам
  function cities(sid, q) {
    q = String(q || '').trim();
    if (q.length < 2) return Promise.resolve([]);
    if (MODE === 'live') return api(`/cities?service=${enc(sid)}&q=${enc(q)}`);
    if (MODE === 'demo') return later(() => demoCities(q));
    return Promise.resolve([]);
  }

  // Пункты выдачи / отделения в городе
  function points(sid, cityId) {
    if (MODE === 'live') return api(`/points?service=${enc(sid)}&city=${enc(cityId)}`);
    if (MODE === 'demo') return later(() => demoPoints(sid, cityId));
    return Promise.resolve([]);
  }

  // Цена и срок доставки
  function quote(req) {
    if (MODE === 'live') return api('/quote', req);
    if (MODE === 'demo') return later(() => demoQuote(req));
    return Promise.reject(new Error('Расчёт доставки выключен'));
  }

  // ===================== КАРТА =====================
  // Карта — библиотека Leaflet (бесплатная, лицензия BSD). Лежит у нас в vendor/leaflet и загружается,
  // только когда покупатель открыл карту. Картинки самой карты приходят с серверов OpenStreetMap.
  let leaflet = null;
  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (!leaflet) {
      leaflet = new Promise((ok, fail) => {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'vendor/leaflet/leaflet.css';
        document.head.appendChild(css);
        const js = document.createElement('script');
        js.src = 'vendor/leaflet/leaflet.js';
        js.onload = () => ok(window.L);
        js.onerror = () => { leaflet = null; fail(new Error('Карта не загрузилась')); };
        document.head.appendChild(js);
      });
    }
    return leaflet;
  }

  // Нарисовать пункты на карте в контейнере. onPick(id) — нажали на значок пункта.
  // Возвращает пульт: select(id, fly) — подсветить пункт, resize() — пересчитать размер, destroy() — убрать.
  function map(container, list, selectedId, onPick) {
    return loadLeaflet().then((L) => {
      if (!container.isConnected) throw new Error('Окно с картой уже закрыли');
      const m = L.map(container, { zoomControl: true, attributionControl: true });
      m.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
      }).addTo(m);
      const icon = (on) => L.divIcon({
        className: 'map-pin' + (on ? ' is-active' : ''), html: '<i></i>', iconSize: [30, 40], iconAnchor: [15, 40]
      });
      const pins = {};
      list.forEach((p) => {
        pins[p.id] = L.marker([p.lat, p.lon], { icon: icon(p.id === selectedId), title: p.address, keyboard: false })
          .addTo(m).on('click', () => onPick(p.id));
      });
      if (list.length) m.fitBounds(L.latLngBounds(list.map((p) => [p.lat, p.lon])), { padding: [28, 28], maxZoom: 15 });
      let current = selectedId;
      return {
        select(id, fly) {
          if (pins[current]) pins[current].setIcon(icon(false)).setZIndexOffset(0);
          current = id;
          if (!pins[id]) return;
          pins[id].setIcon(icon(true)).setZIndexOffset(1000);
          if (fly) m.flyTo(pins[id].getLatLng(), Math.max(m.getZoom(), 14), { duration: 0.5 });
        },
        resize() { m.invalidateSize(); },
        destroy() { m.remove(); }
      };
    });
  }

  // ===================== ДЕМО-ДАННЫЕ =====================
  // ⚠️ Всё ниже — ПРИДУМАННЫЕ примеры для показа: города настоящие, а пункты, адреса, цены и сроки — нет.
  // Работают только в режиме 'demo'. Когда появится сервер доставки (API_URL), этот блок не используется.
  // id, название, регион, широта, долгота, начало почтового индекса
  const DEMO_CITIES = [
    ['msk', 'Москва', 'Москва', 55.7558, 37.6173, '101'],
    ['spb', 'Санкт-Петербург', 'Санкт-Петербург', 59.9343, 30.3351, '190'],
    ['kzn', 'Казань', 'Республика Татарстан', 55.7963, 49.1088, '420'],
    ['ekb', 'Екатеринбург', 'Свердловская область', 56.8389, 60.6057, '620'],
    ['nsk', 'Новосибирск', 'Новосибирская область', 55.0084, 82.9357, '630'],
    ['nnv', 'Нижний Новгород', 'Нижегородская область', 56.2965, 43.9361, '603'],
    ['krd', 'Краснодар', 'Краснодарский край', 45.0355, 38.9753, '350'],
    ['sam', 'Самара', 'Самарская область', 53.1959, 50.1002, '443'],
    ['ufa', 'Уфа', 'Республика Башкортостан', 54.7388, 55.9721, '450'],
    ['chl', 'Челябинск', 'Челябинская область', 55.1644, 61.4368, '454'],
    ['oms', 'Омск', 'Омская область', 54.9885, 73.3242, '644'],
    ['kja', 'Красноярск', 'Красноярский край', 56.0153, 92.8932, '660'],
    ['prm', 'Пермь', 'Пермский край', 58.0105, 56.2502, '614'],
    ['vrn', 'Воронеж', 'Воронежская область', 51.6608, 39.2003, '394'],
    ['rnd', 'Ростов-на-Дону', 'Ростовская область', 47.2357, 39.7015, '344'],
    ['tmn', 'Тюмень', 'Тюменская область', 57.1530, 65.5343, '625'],
    ['yar', 'Ярославль', 'Ярославская область', 57.6261, 39.8845, '150'],
    ['sch', 'Сочи', 'Краснодарский край', 43.5855, 39.7231, '354'],
    ['khv', 'Хабаровск', 'Хабаровский край', 48.4802, 135.0719, '680'],
    ['vvo', 'Владивосток', 'Приморский край', 43.1155, 131.8855, '690']
  ].map(([id, name, region, lat, lon, zip]) => ({ id, name, region, lat, lon, zip }));

  const norm = (s) => s.toLowerCase().replace(/ё/g, 'е');
  function demoCities(q) {
    const n = norm(q);
    const starts = DEMO_CITIES.filter((c) => norm(c.name).startsWith(n));
    const inside = DEMO_CITIES.filter((c) => !starts.includes(c) && norm(c.name).includes(n));
    return starts.concat(inside).slice(0, 8).map(({ id, name, region, lat, lon }) => ({ id, name, region, lat, lon }));
  }

  // «Случайные», но одинаковые при каждом показе числа — чтобы пункты не прыгали
  function seeded(text) {
    let h = 2166136261;
    for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  }
  const STREETS = ['ул. Ленина', 'ул. Мира', 'ул. Советская', 'ул. Гагарина', 'пр-т Победы', 'ул. Садовая',
    'ул. Молодёжная', 'ул. Пушкина', 'ул. Центральная', 'ул. Спортивная', 'ул. Школьная', 'наб. Речная'];
  const HOURS = ['Пн–Вс 09:00–21:00', 'Пн–Пт 10:00–20:00, Сб 10:00–16:00', 'Пн–Сб 10:00–20:00'];

  function demoPoints(sid, cityId) {
    const c = DEMO_CITIES.find((x) => x.id === cityId);
    if (!c) return [];
    const r = seeded(sid + cityId);
    const count = c.id === 'msk' || c.id === 'spb' ? 12 : 8;
    return Array.from({ length: count }, (_, i) => {
      const street = STREETS[Math.floor(r() * STREETS.length)];
      const house = 1 + Math.floor(r() * 120);
      const zip = c.zip + String(1 + Math.floor(r() * 98)).padStart(3, '0');
      return {
        id: sid + '-' + c.id + '-' + (i + 1),
        name: sid === 'post' ? 'Отделение ' + zip : 'Пункт СДЭК №' + (i + 1),
        address: `${c.name}, ${street}, ${house}`,
        hours: sid === 'post' ? 'Пн–Пт 08:00–20:00, Сб 09:00–18:00' : HOURS[Math.floor(r() * HOURS.length)],
        lat: c.lat + (r() - 0.5) * 0.11,
        lon: c.lon + (r() - 0.5) * 0.11 / Math.cos(c.lat * Math.PI / 180)
      };
    });
  }

  // Цена-пример: основа по способу + за килограммы + за расстояние от Москвы
  function demoQuote(req) {
    const c = DEMO_CITIES.find((x) => x.id === req.city) || DEMO_CITIES[0];
    const home = DEMO_CITIES[0];
    const rad = Math.PI / 180;
    const km = 6371 * Math.acos(Math.min(1, Math.sin(home.lat * rad) * Math.sin(c.lat * rad) +
      Math.cos(home.lat * rad) * Math.cos(c.lat * rad) * Math.cos((c.lon - home.lon) * rad)));
    const kg = (req.parcels || []).reduce((s, p) => s + Math.max(p.weight, p.length * p.width * p.height / 5000), 0);
    const base = { cdek: { pvz: 290, door: 490 }, post: { pvz: 250, door: 590 } }[req.service][req.method];
    const days = 1 + Math.round(km / 900);
    return {
      price: Math.round((base + kg * 55 + km * 0.09) / 10) * 10,
      daysMin: days + (req.service === 'post' ? 1 : 0),
      daysMax: days + (req.service === 'post' ? 4 : 2)
    };
  }

  return { MODE, SERVICES, service, method, parcels, cities, points, quote, map };
})();
