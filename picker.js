// ===== Подбор клюшки =====
// Кнопка «Подобрать клюшку» в правом нижнем углу (index.html и catalog.html, атрибут data-picker-open)
// открывает окно-помощник в виде чата. Помощник задаёт несколько вопросов, покупатель отвечает кнопками
// (кто на льду, рост, вес, опыт, любимый загиб, хват), а в конце получает совет — жёсткость, загиб, хват,
// длина — и подходящие клюшки из наличия (тот же каталог window.PRODUCTS, что и на сайте).
// Всё считается прямо в браузере покупателя: никуда ничего не отправляется. Ответы хранятся только
// у него (localStorage, ключ klushki-picker) — вернулся со страницы товара и видит свой подбор.
//
// ИИ — потом (решение владельца 2026-11-19). Когда подключим нейросеть (YandexGPT или открытые модели
// DeepSeek / Qwen в Yandex AI Studio — через маленький облачный сервер: ключ на сайт класть нельзя),
// под кнопками появится поле «Спросить своими словами». Правила подбора ниже (WEIGHT_FLEX, curveAdvice)
// пригодятся ИИ как подсказка.
// Оформление — в style.css, блок «ПОДБОР КЛЮШКИ».

window.Picker = (function () {
  const S = window.Shop;
  const { esc, price, hasPrice, title, photos, category } = S;
  const PRODUCTS = window.PRODUCTS || [];
  const KEY = 'klushki-picker';
  const openers = document.querySelectorAll('[data-picker-open]');

  const isGoalie = (p) => !!(p.specs && p.specs.goalie);
  const unique = (list) => [...new Set(list)];
  const STICKS = PRODUCTS.filter((p) => p.category === 'sticks' && p.inStock);
  if (!STICKS.length) {                              // клюшек нет (или каталог не загрузился) — подбирать не из чего
    openers.forEach((b) => { b.hidden = true; });
    return null;
  }
  // загибы полевых клюшек, которые есть в наличии, и типы клюшек (оригинал / восстановленная)
  const CURVES = unique(STICKS.filter((p) => !isGoalie(p)).map((p) => p.specs && p.specs.curve).filter(Boolean)).sort();
  const TYPES = unique(STICKS.map((p) => p.type).filter(Boolean));
  const HANDS = { left: 'Левый', right: 'Правый' };

  // ----- Правила подбора -----
  // Жёсткость (flex) — по весу: примерно половина веса в фунтах (вес в кг × 1,1), сверено с таблицами
  // производителей. Новичкам — на 5 мягче (клюшку легче согнуть, бросок получается), защитникам —
  // на 5 жёстче (щелчки от синей линии).
  const WEIGHT_FLEX = { w1: 40, w2: 55, w3: 70, w4: 82, w5: 95, w6: 102 };
  const CURVE_NOTES = {
    P92: 'универсальный средний загиб: и пас, и бросок, к нему легко привыкнуть',
    P29: 'средний загиб: удобно принимать пас и бросать с обеих сторон',
    P28: 'загиб к носку: резкий бросок с кистей и обводка, но пас неудобной стороной сложнее',
    P90: 'загиб ближе к носку: бросок с кистей и обводка',
    P88: 'мягкий средний загиб: точный пас, хорош для новичков'
  };
  // Загиб, если любимого нет: новичкам и защитникам — средний (пас и щелчок), опытным нападающим — к носку
  function curveAdvice(a) {
    if (a.level === 'new' || a.role === 'defense' || a.role === 'any') return ['P92', 'P29'];
    return a.level === 'pro' ? ['P28', 'P92'] : ['P92', 'P28'];
  }
  const round5 = (n) => Math.round(n / 5) * 5;

  // ----- Вопросы -----
  // when — задавать ли вопрос (зависит от прошлых ответов); options — [код, надпись на кнопке]
  const field = (a) => a.role !== 'goalie';
  const QUESTIONS = [
    { id: 'role',
      text: () => 'Привет! Помогу подобрать клюшку из того, что есть в наличии. Пара вопросов — отвечай кнопками, это полминуты.\n\nКто ты на льду?',
      options: [['forward', 'Нападающий'], ['defense', 'Защитник'], ['goalie', 'Вратарь'], ['any', 'Пока не знаю']] },
    { id: 'height', when: field, text: () => 'Какой у тебя рост?',
      options: [['h1', 'До 155 см'], ['h2', '155–170 см'], ['h3', '170–185 см'], ['h4', 'Выше 185 см']] },
    { id: 'weight', when: field, text: () => 'А вес? От него зависит, какая жёсткость тебе нужна.',
      options: [['w1', 'До 45 кг'], ['w2', '45–60 кг'], ['w3', '60–75 кг'], ['w4', '75–90 кг'], ['w5', '90–105 кг'], ['w6', 'Больше 105 кг']] },
    { id: 'level', when: field, text: () => 'Как давно играешь?',
      options: [['new', 'Только начинаю'], ['fan', 'Играю для себя'], ['pro', 'Давно и серьёзно']] },
    { id: 'curve', when: (a) => field(a) && a.level !== 'new' && CURVES.length > 1,
      text: () => 'Есть любимый загиб? Если привык к своему — лучше его и брать.',
      options: CURVES.map((c) => [c, c]).concat([['any', 'Не знаю — посоветуй']]) },
    { id: 'hand',
      text: (a) => a.role === 'goalie' ? 'Какой хват у твоей вратарской клюшки?' : 'Какой хват?',
      hint: (a) => a.role === 'goalie'
        ? 'Не уверен — нажми «Не знаю», покажу все вратарские.'
        : 'Левый — крюк слева от тебя, левая рука ниже по клюшке. Не уверен — возьми швабру, как клюшку: какая рука сама оказалась ниже, такой и хват.',
      options: [['left', 'Левый'], ['right', 'Правый'], ['any', 'Не знаю']] },
    { id: 'type', when: () => TYPES.length > 1, text: () => 'Какие клюшки смотрим?',
      options: [['original', 'Оригинальные'], ['restored', 'Восстановленные — дешевле'], ['any', 'Любые']] }
  ];
  const Q = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
  const label = (id, value) => ((Q[id].options.find((o) => o[0] === value) || [])[1] || '');

  // ----- Ответы -----
  let answers = {};
  const asked = () => QUESTIONS.filter((q) => !q.when || q.when(answers));
  const nextQuestion = () => asked().find((q) => !(q.id in answers));
  const answeredList = () => asked().filter((q) => q.id in answers);

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
      answers = {};
      // берём ответы по порядку, пока они подходят к вопросам (каталог мог измениться — например, пропал загиб)
      for (const q of QUESTIONS) {
        if (q.when && !q.when(answers)) continue;
        if (!q.options.some((o) => o[0] === d[q.id])) break;
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
    if (a.role === 'goalie') return { goalie: true, hand };
    const flex = WEIGHT_FLEX[a.weight] + (a.level === 'new' ? -5 : 0) + (a.role === 'defense' ? 5 : 0);
    const curves = a.curve && a.curve !== 'any' ? [a.curve] : curveAdvice(a);
    return { flex, from: round5(flex - 5), to: round5(flex + 5), curves, hand, small: a.height === 'h1' || a.weight === 'w1' };
  }

  const priceOf = (p) => hasPrice(p.price) ? p.price : Infinity;
  const flexOf = (p) => parseInt(p.specs && p.specs.flex, 10) || 0;

  const inRange = (p, rec) => { const f = flexOf(p); return f >= rec.from && f <= rec.to; };
  const plural = (n, w) => w[n % 10 === 1 && n % 100 !== 11 ? 0
    : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 1 : 2];

  // Клюшки из наличия: нужный хват и тип; полевые — с жёсткостью не дальше 12 от совета.
  // Сверху — те, у кого жёсткость в советованном диапазоне, среди них — ближе к середине и с советованным
  // загибом; при равенстве — дешевле
  function matches(a, rec) {
    let list = STICKS.filter((p) => isGoalie(p) === !!rec.goalie);
    if (rec.hand) list = list.filter((p) => p.specs && p.specs.hand === rec.hand);
    if (a.type && a.type !== 'any') list = list.filter((p) => p.type === a.type);
    if (rec.goalie) return list.sort((x, y) => priceOf(x) - priceOf(y));
    return list.map((p) => {
      const f = flexOf(p);
      const d = f ? Math.abs(f - rec.flex) : 8;       // жёсткость не указана — не выкидываем, но ставим ниже
      if (d > 12) return null;
      const c = rec.curves.indexOf(p.specs && p.specs.curve);
      return { p, score: (inRange(p, rec) ? 20 : 0) - d + (c === 0 ? 6 : c > 0 ? 4 : 0) };
    }).filter(Boolean)
      .sort((x, y) => y.score - x.score || priceOf(x.p) - priceOf(y.p))
      .map((x) => x.p);
  }

  // Текст для Telegram: ответы и совет одним сообщением — продавцу сразу всё понятно
  function tgText(a, rec) {
    const who = { forward: 'нападающий', defense: 'защитник', goalie: 'вратарь' }[a.role];
    const parts = [who,
      a.height && 'рост ' + label('height', a.height).toLowerCase(),
      a.weight && 'вес ' + label('weight', a.weight).toLowerCase(),
      a.level && label('level', a.level).toLowerCase(),
      a.curve && a.curve !== 'any' && 'люблю загиб ' + a.curve,
      rec.hand && 'хват ' + rec.hand.toLowerCase()].filter(Boolean);
    return 'Здравствуйте! Подбираю клюшку' + (parts.length ? ': ' + parts.join(', ') : '') + '.' +
      (rec.goalie ? '' : ` Сайт советует жёсткость ${rec.from}–${rec.to} и загиб ${rec.curves.join(' или ')}.`) +
      ' Что посоветуете?';
  }

  // ----- Значки -----
  const ICON_STICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 2.5 10.4 17c-.6 1.1-1.8 1.8-3 1.8H3v2.7h5.2c1.9 0 3.7-1 4.6-2.7L21.4 4"/><ellipse cx="18.2" cy="20" rx="3" ry="1.5" fill="currentColor" stroke="none"/></svg>';
  const ICON_AGAIN = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/></svg>';
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
        <span class="picker__ava" aria-hidden="true">${ICON_STICK}</span>
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

  // Совет: жёсткость, загиб, хват, длина
  function recHTML(a, rec) {
    const row = (dt, b, small) => `<div><dt>${dt}</dt><dd><b>${b}</b>${small ? `<small>${small}</small>` : ''}</dd></div>`;
    const handRow = row('Хват', rec.hand ? esc(rec.hand) : 'Как держишь швабру',
      rec.hand ? '' : 'какая рука ниже — такой и хват');
    if (rec.goalie) {
      return `<div class="picker-rec"><p class="picker-rec__title">Что смотреть</p><dl>
        ${handRow}
        ${row('Длина пера', '25″, 26″…', 'подбирают по росту и стойке — подскажем в чате')}
      </dl></div>`;
    }
    const why = ['по весу ' + label('weight', a.weight).toLowerCase(),
      a.level === 'new' && 'новичку — чуть мягче', a.role === 'defense' && 'защитнику — чуть жёстче для щелчка'].filter(Boolean).join('; ');
    const curveNote = rec.curves.map((c) => CURVE_NOTES[c] ? `${c} — ${CURVE_NOTES[c]}` : '').filter(Boolean).join('. ');
    return `<div class="picker-rec"><p class="picker-rec__title">Тебе подойдёт</p><dl>
      ${row('Жёсткость', `${rec.from}–${rec.to}`, why)}
      ${row('Загиб', rec.curves.join(' или '), (a.curve && a.curve !== 'any' ? 'тот, к которому привык. ' : '') + curveNote)}
      ${handRow}
      ${row('Длина', 'До подбородка в коньках', 'без коньков — до кончика носа. Подрежешь клюшку — она станет жёстче')}
    </dl></div>`;
  }

  // Карточка клюшки: совпавшие с советом характеристики подсвечены
  function cardHTML(p, rec) {
    const url = 'product.html?id=' + encodeURIComponent(p.id);
    const s = p.specs || {};
    const first = photos(p)[0];
    const pic = first ? `<img src="${esc(first)}" alt="" loading="lazy">` : `<span aria-hidden="true">${category(p.category).icon}</span>`;
    const f = flexOf(p);
    const tag = (text, ok) => `<i${ok ? ' class="is-match"' : ''}>${esc(text)}</i>`;
    const tags = [
      s.flex && tag('Жёсткость ' + s.flex, !rec.goalie && f >= rec.from && f <= rec.to),
      s.curve && tag(s.curve, !rec.goalie && rec.curves.includes(s.curve)),
      s.paddle && tag('Перо ' + s.paddle, false),
      s.hand && tag('Хват ' + s.hand.toLowerCase(), !!rec.hand)
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

  // Весь разговор: заданные вопросы и ответы, потом — следующий вопрос или итог
  function messages() {
    const out = [];
    answeredList().forEach((q) => {
      out.push(bot(esc(q.text(answers)).replace(/\n/g, '<br>')), me(label(q.id, answers[q.id])));
    });
    const q = nextQuestion();
    if (q) {
      const hint = q.hint ? `<small>${esc(q.hint(answers))}</small>` : '';
      out.push(bot(esc(q.text(answers)).replace(/\n/g, '<br>') + hint));
      return out;
    }
    const rec = advise(answers);
    const list = matches(answers, rec);
    out.push(bot('Готово! Вот что тебе подойдёт.', 'picker-msg--done'), recHTML(answers, rec));
    if (rec.small) {
      out.push(bot('Похоже, тебе нужна юниорская или подростковая клюшка: взрослые из наличия будут длинными и жёсткими. ' +
        'Напиши нам — подберём под заказ.'));
    }
    if (list.length) {
      const handURL = 'catalog.html?cat=sticks' + (rec.hand ? '&hand=' + encodeURIComponent(rec.hand) : '');
      // «подходят» — только те, у кого жёсткость в советованном диапазоне, а если назван любимый загиб —
      // ещё и с ним (у вратарских — все с нужным хватом)
      const fav = answers.curve && answers.curve !== 'any' ? answers.curve : '';
      const exact = rec.goalie ? list.length
        : list.filter((p) => inRange(p, rec) && (!fav || (p.specs && p.specs.curve) === fav)).length;
      const what = rec.goalie ? ['вратарская клюшка', 'вратарские клюшки', 'вратарских клюшек'] : ['клюшка', 'клюшки', 'клюшек'];
      out.push(bot(exact === 1 ? `Из наличия подходит одна ${what[0]}:`
        : exact ? `Из наличия ${plural(exact, ['подходит', 'подходят', 'подходят'])} ${exact} ${plural(exact, what)}${exact > SHOW ? ' — вот самые близкие' : ''}:`
        : 'Точно под твои параметры в наличии сейчас нет, но вот близкие по жёсткости:'));
      out.push(`<ul class="picker-cards">${list.slice(0, SHOW).map((p) => cardHTML(p, rec)).join('')}</ul>`);
      if (list.length > SHOW || rec.hand) {
        out.push(`<a class="picker-more" href="${handURL}">${rec.hand ? 'Все клюшки с ' + (rec.hand === 'Левый' ? 'левым' : 'правым') + ' хватом' : 'Все клюшки'} в каталоге →</a>`);
      }
    } else {
      out.push(bot('Сейчас в наличии нет клюшки под эти параметры. Напиши нам — подберём под заказ или посоветуем, что взять из того, что есть.'));
    }
    return out;
  }

  // Кнопки внизу: варианты ответа — или, в конце, «Спросить в Telegram»
  function footHTML() {
    const q = nextQuestion();
    if (q) {
      return `<div class="picker-opts${q.options.length > 4 ? ' picker-opts--grid' : ''}">
          ${q.options.map(([id, text]) => `<button type="button" class="picker-opt" data-picker-answer="${esc(id)}">${esc(text)}</button>`).join('')}
        </div>
        ${answeredList().length ? '<button type="button" class="picker__back" data-picker-back>← Изменить прошлый ответ</button>' : ''}`;
    }
    const text = tgText(answers, advise(answers));
    return `<a href="${esc(S.telegramLink(text))}" class="btn picker__tg" target="_blank" rel="noopener" data-picker-tg>${ICON_TG} Спросить у нас в Telegram</a>
      <button type="button" class="picker__back" data-picker-again>Подобрать заново</button>`;
  }

  // Нарисовать разговор. typing — показать «помощник печатает…» вместо следующего вопроса
  function render(typing) {
    const items = messages();
    let list = items;
    if (typing) {
      // последний ответ покупателя уже виден, а следующий вопрос (или итог) «печатается»
      const lastMe = items.map((x) => x.includes('picker-msg--me')).lastIndexOf(true);
      list = items.slice(0, lastMe + 1).concat('<div class="picker-typing" aria-label="Помощник печатает"><i></i><i></i><i></i></div>');
    }
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
    if (!q || busy || !q.options.some((o) => o[0] === value)) return;
    answers[q.id] = value;
    save();
    if (still()) { render(); return; }
    busy = true;
    render(true);
    setTimeout(() => { busy = false; if (isOpen) render(); }, nextQuestion() ? 380 : 650);
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
