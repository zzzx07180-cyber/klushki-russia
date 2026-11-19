// ===== Подбор клюшки =====
// Кнопка «Подобрать клюшку» в правом нижнем углу (index.html и catalog.html, атрибут data-picker-open)
// открывает окно-помощник в виде чата. Помощник задаёт вопросы, покупатель отвечает кнопками
// (амплуа, возраст, рост, вес, уровень, хват), а в конце получает совет — размер клюшки, жёсткость,
// загиб, точку прогиба, длину — и подходящие клюшки из наличия (тот же каталог window.PRODUCTS).
// Всё считается прямо в браузере покупателя: никуда ничего не отправляется. Ответы хранятся только
// у него (localStorage, ключ klushki-picker) — вернулся со страницы товара и видит свой подбор.
//
// Вопросы переделаны по просьбе владельца 2026-11-19: только хоккейные варианты ответа, без «не знаю»
// и без «любимого загиба» (загиб определяется амплуа). Каждый вопрос объясняет, на что он влияет.
//
// ИИ — потом (решение владельца 2026-11-19). Когда подключим нейросеть (YandexGPT или открытые модели
// DeepSeek / Qwen в Yandex AI Studio — через маленький облачный сервер: ключ на сайт класть нельзя),
// под кнопками появится поле «Спросить своими словами». Правила подбора ниже пригодятся ИИ как подсказка.
// Оформление — в style.css, блок «ПОДБОР КЛЮШКИ».

window.Picker = (function () {
  const S = window.Shop;
  const { esc, price, hasPrice, title, photos, category } = S;
  const PRODUCTS = window.PRODUCTS || [];
  const KEY = 'klushki-picker';
  const openers = document.querySelectorAll('[data-picker-open]');

  const isGoalie = (p) => !!(p.specs && p.specs.goalie);
  const STICKS = PRODUCTS.filter((p) => p.category === 'sticks' && p.inStock);
  if (!STICKS.length) {                              // клюшек нет (или каталог не загрузился) — подбирать не из чего
    openers.forEach((b) => { b.hidden = true; });
    return null;
  }
  const TYPES = [...new Set(STICKS.map((p) => p.type).filter(Boolean))];   // оригинал / восстановленная
  const HANDS = { left: 'Левый', right: 'Правый' };

  // =====================================================================
  // Правила подбора (сверено с таблицами Bauer, CCM и хоккейных магазинов, 2026-11-19)
  // =====================================================================
  //  • возраст и рост → РАЗМЕР клюшки: детская (Youth), юниорская (Junior), подростковая (Intermediate),
  //    взрослая (Senior) — у них разная длина и толщина рукоятки;
  //  • рост → ДЛИНА: в коньках клюшка достаёт примерно до подбородка, без коньков — до носа;
  //  • вес → ЖЁСТКОСТЬ (флекс): тяжелее и сильнее игрок — жёстче клюшка. У взрослых ориентир — около
  //    половины веса в фунтах (вес в кг × 1,1); берём чуть мягче, как в таблицах производителей;
  //  • амплуа → ЗАГИБ, ДЛИНА, ПРОГИБ: нападающим — загиб к носку, клюшка покороче, низкий прогиб
  //    (быстрый бросок с кистей, обводка); защитникам — средний загиб, подлиннее, средний прогиб
  //    (щелчок, пас на дальнюю дистанцию, охват) и на 5 жёстче;
  //  • уровень → новичку на 5 мягче: такую клюшку легче согнуть, бросок получается быстрее.

  // Возрастная группа — словами, как размеры клюшек (владелец 2026-11-19: «солиднее, чем цифрами»;
  // вопрос — именно про группу, а не «сколько лет»). Внутри: a1 — до 8 лет, a2 — 8–12, a3 — 13–16, a4 — 17+
  const AGES = [['a1', 'Детская'], ['a2', 'Юниорская'], ['a3', 'Подростковая'], ['a4', 'Взрослая']];
  // Рост — варианты зависят от возраста: [код, надпись, размер клюшки]
  const HEIGHTS = {
    a1: [['h1', 'До 120 см', 'yth'], ['h2', '120–135 см', 'yth'], ['h3', 'Выше 135 см', 'jr']],
    a2: [['h1', 'До 135 см', 'jr'], ['h2', '135–150 см', 'jr'], ['h3', '150–165 см', 'int'], ['h4', 'Выше 165 см', 'int']],
    a3: [['h1', 'До 150 см', 'jr'], ['h2', '150–165 см', 'int'], ['h3', '165–180 см', 'sr'], ['h4', 'Выше 180 см', 'sr']],
    a4: [['h1', 'До 165 см', 'int'], ['h2', '165–175 см', 'sr'], ['h3', '175–185 см', 'sr'], ['h4', '185–195 см', 'sr'], ['h5', 'Выше 195 см', 'sr']]
  };
  // Вес — тоже по возрасту: [код, надпись, жёсткость]
  const WEIGHTS = {
    a1: [['w1', 'До 25 кг', 30], ['w2', '25–35 кг', 35], ['w3', 'Больше 35 кг', 40]],
    a2: [['w1', 'До 35 кг', 40], ['w2', '35–45 кг', 45], ['w3', '45–55 кг', 50], ['w4', 'Больше 55 кг', 55]],
    a3: [['w1', 'До 45 кг', 50], ['w2', '45–55 кг', 55], ['w3', '55–65 кг', 65], ['w4', '65–75 кг', 70], ['w5', 'Больше 75 кг', 75]],
    a4: [['w1', 'До 60 кг', 65], ['w2', '60–70 кг', 75], ['w3', '70–80 кг', 80], ['w4', '80–90 кг', 85],
      ['w5', '90–100 кг', 95], ['w6', '100–110 кг', 100], ['w7', 'Больше 110 кг', 110]]
  };
  // размер клюшки: [одна, по-английски, несколько]
  const SIZES = {
    yth: ['Детская', 'Youth', 'детские'], jr: ['Юниорская', 'Junior', 'юниорские'],
    int: ['Подростковая', 'Intermediate', 'подростковые'], sr: ['Взрослая', 'Senior', 'взрослые']
  };

  // Загибы. P92 у Bauer и P29 у CCM — один и тот же загиб, поэтому идут парой.
  // toe — к носку (быстрый бросок с кистей, обводка), mid — средний открытый (и пас, и бросок),
  // midClosed — средний, чуть закрытее (точный пас и плотный щелчок)
  const CURVES = {
    toe: { codes: ['P28'], name: 'P28' },
    mid: { codes: ['P92', 'P29'], name: 'P92 / P29' },
    midClosed: { codes: ['P88'], name: 'P88' }
  };
  // Нападающим — к носку (новичку сначала средний: с ним проще пас и бросок неудобной стороной),
  // защитникам — средний: пас на дальнюю дистанцию и щелчок от синей линии
  function curveAdvice(a) {
    if (a.role === 'defense') return ['mid', 'midClosed'];
    return a.level === 'new' ? ['mid', 'toe'] : ['toe', 'mid'];
  }
  const round5 = (n) => Math.round(n / 5) * 5;

  // =====================================================================
  // Вопросы
  // =====================================================================
  // when — задавать ли вопрос; options — [код, надпись на кнопке, …] или функция от прошлых ответов
  const field = (a) => a.role !== 'goalie';
  const QUESTIONS = [
    { id: 'role', text: () => 'Привет! Подберу клюшку из наличия под твои параметры.\n\nТвоё амплуа?',
      options: [['forward', 'Нападающий'], ['defense', 'Защитник'], ['goalie', 'Вратарь']] },
    { id: 'age',
      text: () => 'Возрастная группа? От неё зависит размер клюшки — длина и толщина рукоятки.',
      options: AGES },
    { id: 'height',
      text: (a) => a.role === 'goalie' ? 'Рост? От него зависит размер вратарской клюшки.' : 'Рост? От него зависит длина клюшки.',
      options: (a) => HEIGHTS[a.age] || [] },
    { id: 'weight', when: field,
      text: () => 'Вес? От него зависит жёсткость (флекс): слишком мягкая клюшка гнётся без отдачи, а слишком жёсткую не согнёшь — и бросок теряет силу.',
      options: (a) => WEIGHTS[a.age] || [] },
    { id: 'level', when: field, text: () => 'Уровень игры?',
      options: [['new', 'Новичок'], ['fan', 'Любитель'], ['pro', 'Профессионал']] },
    { id: 'hand', text: () => 'Хват?', options: [['left', 'Левый'], ['right', 'Правый']] },
    { id: 'type', when: () => TYPES.length > 1, text: () => 'Какие клюшки смотрим?',
      options: [['original', 'Оригинальные'], ['restored', 'Восстановленные — дешевле'], ['any', 'Любые']] }
  ];
  const Q = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
  const optionsOf = (q) => typeof q.options === 'function' ? q.options(answers) : q.options;
  const option = (id, value) => optionsOf(Q[id]).find((o) => o[0] === value) || [];
  const label = (id, value) => option(id, value)[1] || '';

  // ----- Ответы -----
  let answers = {};
  const asked = () => QUESTIONS.filter((q) => !q.when || q.when(answers));
  const nextQuestion = () => asked().find((q) => !(q.id in answers));
  const answeredList = () => asked().filter((q) => q.id in answers);

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
      answers = {};
      // берём сохранённые ответы по порядку, пока они подходят к вопросам (вопросы или каталог могли измениться)
      for (const q of QUESTIONS) {
        if (q.when && !q.when(answers)) continue;
        if (!optionsOf(q).some((o) => o[0] === d[q.id])) break;
        answers[q.id] = d[q.id];
      }
    } catch (e) { answers = {}; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(answers)); } catch (e) { /* хранилище выключено — ничего страшного */ }
  }

  // ----- Совет и подходящие клюшки -----
  function advise(a) {
    const hand = HANDS[a.hand] || '';
    const size = option('height', a.height)[2] || 'sr';
    if (a.role === 'goalie') return { goalie: true, size, hand };
    const flex = Math.max(20, (option('weight', a.weight)[2] || 75) + (a.level === 'new' ? -5 : 0) + (a.role === 'defense' ? 5 : 0));
    const groups = curveAdvice(a);
    return {
      size, hand, flex, from: round5(flex - 5), to: round5(flex + 5), groups,
      primary: CURVES[groups[0]].codes, secondary: CURVES[groups[1]].codes
    };
  }

  const priceOf = (p) => hasPrice(p.price) ? p.price : Infinity;
  const flexOf = (p) => parseInt(p.specs && p.specs.flex, 10) || 0;
  const inRange = (p, rec) => { const f = flexOf(p); return f >= rec.from && f <= rec.to; };
  const curveOk = (p, rec) => { const c = p.specs && p.specs.curve; return rec.primary.includes(c) || rec.secondary.includes(c); };
  const plural = (n, w) => w[n % 10 === 1 && n % 100 !== 11 ? 0
    : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 1 : 2];

  // Клюшки из наличия: нужный хват и тип; полевые — с жёсткостью не дальше 12 от совета.
  // Сверху — с жёсткостью в советованном диапазоне, среди них — с загибом под амплуа и ближе к середине
  // по жёсткости; при равенстве — дешевле
  function matches(a, rec) {
    let list = STICKS.filter((p) => isGoalie(p) === !!rec.goalie);
    if (rec.hand) list = list.filter((p) => p.specs && p.specs.hand === rec.hand);
    if (a.type && a.type !== 'any') list = list.filter((p) => p.type === a.type);
    if (rec.goalie) return list.sort((x, y) => priceOf(x) - priceOf(y));
    return list.map((p) => {
      const f = flexOf(p);
      const d = f ? Math.abs(f - rec.flex) : 8;       // жёсткость не указана — не выкидываем, но ставим ниже
      if (d > 12) return null;
      const c = p.specs && p.specs.curve;
      return { p, score: (inRange(p, rec) ? 20 : 0) - d + (rec.primary.includes(c) ? 6 : rec.secondary.includes(c) ? 4 : 0) };
    }).filter(Boolean)
      .sort((x, y) => y.score - x.score || priceOf(x.p) - priceOf(y.p))
      .map((x) => x.p);
  }

  const sizeText = (size) => SIZES[size][0].toLowerCase() + ' (' + SIZES[size][1] + ')';
  // Какие клюшки подобраны, одной строкой: «взрослые (Senior), жёсткость 80–90, загиб P28 или P92 / P29, левый хват»
  // one — в единственном числе («взрослая …»)
  function criteria(rec, one) {
    const size = (one ? SIZES[rec.size][0].toLowerCase() : SIZES[rec.size][2]) + ' (' + SIZES[rec.size][1] + ')';
    const parts = rec.goalie ? [one ? 'вратарская' : 'вратарские']
      : [size, `жёсткость ${rec.from}–${rec.to}`, 'загиб ' + rec.groups.map((g) => CURVES[g].name).join(' или ')];
    return parts.concat(rec.hand.toLowerCase() + ' хват').join(', ');
  }

  // Текст для Telegram: ответы и совет одним сообщением — продавцу сразу всё понятно
  function tgText(a, rec) {
    const who = { forward: 'нападающий', defense: 'защитник', goalie: 'вратарь' }[a.role];
    const parts = [who,
      a.age && label('age', a.age).toLowerCase() + ' возрастная группа',
      a.height && 'рост ' + label('height', a.height).toLowerCase(),
      a.weight && 'вес ' + label('weight', a.weight).toLowerCase(),
      a.level && label('level', a.level).toLowerCase(),
      rec.hand && 'хват ' + rec.hand.toLowerCase()].filter(Boolean);
    const advice = rec.goalie
      ? `вратарская клюшка, размер — ${sizeText(rec.size)}`
      : `${sizeText(rec.size)}, жёсткость ${rec.from}–${rec.to}, загиб ${rec.groups.map((g) => CURVES[g].name).join(' или ')}`;
    return 'Здравствуйте! Подбираю клюшку' + (parts.length ? ': ' + parts.join(', ') : '') + '. ' +
      'Сайт советует: ' + advice + '. Что посоветуете?';
  }

  // ----- Значки -----
  const ICON_PUCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8.5 10c0-1.95 3-3.5 6.75-3.5S22 8.05 22 10v3.9c0 1.95-3 3.5-6.75 3.5S8.5 15.85 8.5 13.9z"/><path fill="none" style="stroke:var(--accent)" stroke-width="1.3" d="M8.7 10.45c.65 1.6 3.4 2.85 6.55 2.85s5.9-1.25 6.55-2.85"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M3.2 8.8h3.2M1.6 12.1h4.8M3.2 15.4h3.2"/></svg>';   // шайба в полёте — как на кнопке «Подобрать клюшку»
  const ICON_AGAIN = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/></svg>';
  const ICON_CART = '<svg viewBox="0 0 28 28" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4.5h3.4l3 13.2h12.6l2.6-9.4H6.8"/><circle cx="11" cy="22.6" r="1.7"/><circle cx="20" cy="22.6" r="1.7"/></svg>';   // как значок в шапке
  const ICON_TG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M21.5 3.6 2.9 10.8c-1.3.5-1.3 1.2-.2 1.6l4.8 1.5 1.8 5.6c.2.6.4.8.8.8.4 0 .6-.2.9-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.1-14.8c.3-1.3-.5-1.9-1.4-1.5ZM8.7 13.6l9.4-5.9c.5-.3.9-.1.5.2l-7.9 7.2-.3 3.3-1.7-4.8Z"/></svg>';

  // =====================================================================
  // Окно
  // =====================================================================
  const root = document.createElement('div');
  root.className = 'picker';
  root.hidden = true;
  root.innerHTML = `
    <div class="picker__shade" data-picker-close></div>
    <div class="picker__panel" role="dialog" aria-modal="true" aria-labelledby="pickerTitle" tabindex="-1">
      <div class="picker__head">
        <span class="picker__ava" aria-hidden="true">${ICON_PUCK}</span>
        <div class="picker__who">
          <h2 class="picker__title" id="pickerTitle">Подбор клюшки</h2>
          <small>Помощник КЛЮШКИ RUSSIA</small>
        </div>
        <button type="button" class="picker__again" data-picker-again aria-label="Начать подбор заново" title="Начать заново" hidden>${ICON_AGAIN}</button>
        <button type="button" class="picker__close" data-picker-close aria-label="Закрыть подбор">×</button>
      </div>
      <div class="picker__log" aria-live="polite"></div>
      <div class="picker__foot"></div>
    </div>`;
  document.body.appendChild(root);
  const panel = root.querySelector('.picker__panel');
  const log = root.querySelector('.picker__log');
  const foot = root.querySelector('.picker__foot');
  const againBtn = root.querySelector('[data-picker-again]');

  let isOpen = false;
  let busy = false;          // помощник «печатает» — ответы пока не принимаем
  let shown = 0;             // сколько сообщений уже на экране: новые плавно появляются
  const still = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const bot = (html, cls) => `<div class="picker-msg picker-msg--bot${cls ? ' ' + cls : ''}">${html}</div>`;
  const me = (text) => `<div class="picker-msg picker-msg--me">${esc(text)}</div>`;

  // Карточка клюшки: совпавшие с советом характеристики подсвечены
  function cardHTML(p, rec) {
    const url = 'product.html?id=' + encodeURIComponent(p.id);
    const s = p.specs || {};
    const first = photos(p)[0];
    const pic = first ? `<img src="${esc(first)}" alt="" loading="lazy">` : `<span aria-hidden="true">${category(p.category).icon}</span>`;
    const tag = (text, ok) => `<i${ok ? ' class="is-match"' : ''}>${esc(text)}</i>`;
    const tags = [
      s.flex && tag('Жёсткость ' + s.flex, !rec.goalie && inRange(p, rec)),
      s.curve && tag(s.curve, !rec.goalie && curveOk(p, rec)),
      s.paddle && tag('Перо ' + s.paddle, false),
      s.hand && tag('Хват ' + s.hand.toLowerCase(), true)
    ].filter(Boolean).join('');
    return `
      <li class="picker-card">
        <a href="${url}" class="picker-card__pic" tabindex="-1" aria-hidden="true">${pic}</a>
        <div class="picker-card__info">
          <p class="picker-card__brand">${esc(p.brand || '')}</p>
          <a href="${url}" class="picker-card__name">${esc(title(p))}</a>
          <p class="picker-card__tags">${tags}</p>
        </div>
        <div class="picker-card__side">
          <span class="picker-card__price">${price(p.price)}</span>
          ${window.Cart ? window.Cart.button(p, 'picker-card__buy') : ''}
        </div>
      </li>`;
  }

  const SHOW = 5;            // сколько клюшек показать в чате; остальные — в каталоге

  const ask = (q) => bot(esc(q.text(answers)).replace(/\n/g, '<br>'));
  // Заданные вопросы и ответы на них — видны, пока идёт подбор.
  // ⚠️ НЕ называть эту функцию history: она заслоняет историю браузера (window.history), и подбор
  // перестаёт ставить «закладку» для кнопки «Назад» (так было до 2026-11-19).
  const talk = () => answeredList().flatMap((q) => [ask(q), me(label(q.id, answers[q.id]))]);

  // Что на экране: пока идёт подбор — вопросы, ответы и следующий вопрос; в конце — ТОЛЬКО подобранные
  // клюшки (свои ответы покупатель и так знает; окошко с советом убрано — просьба владельца 2026-11-19)
  function messages() {
    const q = nextQuestion();
    return q ? talk().concat(ask(q)) : result();
  }

  function result() {
    const rec = advise(answers);
    const list = rec.size === 'yth' ? [] : matches(answers, rec);   // детских клюшек в наличии нет — взрослые не предлагаем
    // «подобрал» — только с жёсткостью в советованном диапазоне (у вратарских — все с нужным хватом)
    const exact = rec.goalie ? list.length : list.filter((p) => inRange(p, rec)).length;
    const what = rec.goalie ? ['вратарскую клюшку', 'вратарские клюшки', 'вратарских клюшек'] : ['клюшку', 'клюшки', 'клюшек'];
    const order = rec.size === 'sr' ? '' : ' Если не подойдут — подберём под заказ.';
    const text = exact === 1 ? `Подобрал для тебя одну ${what[0]}: ${criteria(rec, true)}.${order}`
      : exact ? `Подобрал для тебя ${exact} ${plural(exact, what)}: ${criteria(rec)}.${exact > SHOW ? ' Вот самые подходящие:' : ''}${order}`
      : list.length ? `Клюшки под тебя — ${criteria(rec)} — в наличии сейчас нет. Вот самые близкие по жёсткости:`
      : `Клюшки под тебя — ${criteria(rec)} — в наличии сейчас нет. Напиши нам — подберём под заказ.`;
    const out = [bot(esc(text), 'picker-msg--done')];
    if (list.length) {
      out.push(`<ul class="picker-cards">${list.slice(0, SHOW).map((p) => cardHTML(p, rec)).join('')}</ul>`);
      const handURL = 'catalog.html?cat=sticks&hand=' + encodeURIComponent(rec.hand);
      out.push(`<a class="picker-more" href="${handURL}">Все клюшки с ${rec.hand === 'Левый' ? 'левым' : 'правым'} хватом в каталоге →</a>`);
    }
    return out;
  }

  // Кнопки внизу: варианты ответа — или, в конце, «Перейти в корзину» и «Спросить в Telegram».
  // «Перейти в корзину» видна, только когда в корзине что-то есть: положил клюшку — кнопка появилась
  // (число и видимость обновляет cart.js по атрибуту data-cart-go). Корзина открывается поверх подбора;
  // закрыл её — снова видны подобранные клюшки.
  function cartHTML() {
    if (!window.Cart) return '';
    const n = window.Cart.count();
    return `<button type="button" class="picker__cart" data-cart-open data-cart-go${n ? '' : ' hidden'}>
        ${ICON_CART} Перейти в корзину <b class="picker__cart-count" data-cart-go-count>${n}</b></button>`;
  }
  function footHTML() {
    const q = nextQuestion();
    if (q) {
      const opts = optionsOf(q);
      return `<div class="picker-opts${opts.length > 4 ? ' picker-opts--grid' : ''}">
          ${opts.map(([id, text]) => `<button type="button" class="picker-opt" data-picker-answer="${esc(id)}">${esc(text)}</button>`).join('')}
        </div>
        ${answeredList().length ? '<button type="button" class="picker__back" data-picker-back>← Изменить прошлый ответ</button>' : ''}`;
    }
    const text = tgText(answers, advise(answers));
    return `${cartHTML()}<a href="${esc(S.telegramLink(text))}" class="btn picker__tg" target="_blank" rel="noopener" data-picker-tg>${ICON_TG} Спросить у нас в Telegram</a>
      <button type="button" class="picker__back" data-picker-again>Подобрать заново</button>`;
  }

  // Нарисовать разговор. typing — показать «помощник печатает…» вместо следующего вопроса
  function render(typing) {
    // «печатает»: вопросы и ответы (с только что нажатым) уже видны, а следующий вопрос или итог — ещё нет
    const list = typing
      ? talk().concat('<div class="picker-typing" aria-label="Помощник печатает"><i></i><i></i><i></i></div>')
      : messages();
    const from = shown;
    log.innerHTML = list.join('');
    Array.from(log.children).forEach((el, i) => { if (i >= from) el.classList.add('is-new'); });
    shown = typing ? list.length - 1 : list.length;
    foot.innerHTML = typing ? '' : footHTML();
    againBtn.hidden = !answeredList().length;
    // прокрутка: к итогу — его началом («Готово!») вверх, к вопросу — в самый низ
    const doneMsg = !typing && log.querySelector('.picker-msg--done');
    log.scrollTop = doneMsg ? doneMsg.offsetTop - 12 : log.scrollHeight;
    if (!typing) {
      const first = foot.querySelector('.picker-opt');
      if (first && isOpen) first.focus({ preventScroll: true });
    }
  }

  function answer(value) {
    const q = nextQuestion();
    if (!q || busy || !optionsOf(q).some((o) => o[0] === value)) return;
    answers[q.id] = value;
    save();
    const done = !nextQuestion();                    // это был последний вопрос — дальше итог
    const showResult = () => { if (done) shown = 0; render(); };   // итог заменяет разговор и появляется целиком
    if (still()) { showResult(); return; }
    busy = true;
    render(true);
    setTimeout(() => { busy = false; if (isOpen) showResult(); }, done ? 650 : 380);
  }

  function back() {
    const list = answeredList();
    if (!list.length || busy) return;
    delete answers[list[list.length - 1].id];
    save();
    shown = messages().length - 1;                   // заново «появится» только вопрос
    render();
  }

  function restart() {
    if (busy) return;
    answers = {};
    save();
    shown = 0;
    render();
  }

  // ----- Открыть / закрыть -----
  // Как у корзины: пока окно открыто, страница под ним не прокручивается, а кнопка «Назад» на телефоне
  // закрывает окно, а не уводит со страницы (в историю кладётся «закладка»).
  function lockScroll(on) {
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = on ? 'hidden' : '';
    document.body.style.paddingRight = on && gap > 0 ? gap + 'px' : '';
  }

  let inHistory = false;
  let lastFocus = null;
  let hideTimer = 0;

  function open(restored) {
    if (isOpen) return;
    isOpen = true;
    lastFocus = document.activeElement;
    clearTimeout(hideTimer);
    load();
    shown = answeredList().length ? Infinity : 0;    // вернулись к своему подбору — без анимации всего разговора
    root.hidden = false;
    render();
    shown = log.children.length;
    lockScroll(true);
    void root.offsetWidth;                           // чтобы окно появилось плавно
    root.classList.add('is-open');
    if (!foot.querySelector('.picker-opt')) panel.focus({ preventScroll: true });
    inHistory = !!restored;
    if (!restored) {
      try { history.pushState({ picker: true }, ''); inHistory = true; } catch (e) { /* обойдёмся без закладки */ }
    }
  }

  function hide(fromHistory) {
    if (!isOpen) return;
    isOpen = false;
    busy = false;
    root.classList.remove('is-open');
    lockScroll(false);
    hideTimer = setTimeout(() => { root.hidden = true; }, 350);
    if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    const goBack = inHistory && !fromHistory;
    inHistory = false;
    if (goBack) history.back();
  }

  // «Назад» в браузере. Если поверх подбора открыта корзина, «Назад» закрывает только её —
  // тогда браузер возвращается на «закладку» подбора, и подбор остаётся открытым.
  window.addEventListener('popstate', (e) => {
    const mine = e.state && e.state.picker;
    if (isOpen && mine) lockScroll(true);            // закрылась корзина — она «отпустила» страницу, держим снова
    else if (isOpen && !mine) hide(true);
    else if (!isOpen && mine && !(window.Cart && document.querySelector('.cart.is-open'))) open(true);
  });

  // ----- Нажатия -----
  openers.forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); open(); }));

  root.addEventListener('click', (e) => {
    const t = e.target.closest('button, a, [data-picker-close]');
    if (!t || !root.contains(t)) return;
    const d = t.dataset;
    if ('pickerClose' in d) hide();
    else if ('pickerAnswer' in d) answer(d.pickerAnswer);
    else if ('pickerBack' in d) back();
    else if ('pickerAgain' in d) restart();
    else if ('pickerTg' in d) {
      // ссылку не останавливаем — Telegram откроется; текст ещё и копируем, на случай если поле окажется пустым
      S.copyText(tgText(answers, advise(answers)));
    }
  });

  // Клавиатура: Esc закрывает, Tab ходит по кругу только внутри окна
  root.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') { hide(); return; }
    if (e.key !== 'Tab') return;
    const f = Array.from(panel.querySelectorAll('a[href], button:not([disabled])')).filter((x) => x.offsetParent !== null);
    if (!f.length) { e.preventDefault(); return; }
    const first = f[0], last = f[f.length - 1], now = document.activeElement;
    if (e.shiftKey && (now === first || now === panel)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && now === last) { e.preventDefault(); first.focus(); }
  });

  // Вернулись «Назад» со страницы товара, куда ушли из подбора, — открываем подбор снова
  if (history.state && history.state.picker) open(true);

  return { open, close: hide };
})();
