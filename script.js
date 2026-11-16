// ===== Мобильное меню =====
// По нажатию на «бургер» показываем/прячем ссылки.
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');

burger.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  burger.setAttribute('aria-expanded', open);
});

// После нажатия на пункт меню — закрываем его.
nav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', false);
  });
});

// ===== Шайба въезжает по льду (только на главной) =====
// При открытии сайта и при каждом нажатии на шайбу запускаем анимацию заново.
const puckZone = document.querySelector('.puck-zone');
const puck = document.getElementById('puck');
let puckSide = null;                    // «художник», который вращает бортик (см. ниже)

function launchPuck() {
  puckZone.classList.remove('is-waiting', 'is-flying');
  void puckZone.offsetWidth;            // «перезагружаем» анимацию, чтобы она сыграла ещё раз
  puckZone.classList.add('is-flying');
  if (puckSide) puckSide.start();
}

if (puckZone && puck) {
  // Шайба сложена из нескольких картинок. Ждём, пока они загрузятся (но не дольше 2 секунд),
  // и только потом запускаем — иначе на медленном интернете шайба «въедет» невидимой.
  puckZone.classList.add('is-waiting');
  const images = Array.from(puck.querySelectorAll('img'));
  const loaded = images.map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()));
  const tooLong = new Promise((resolve) => setTimeout(resolve, 2000));
  Promise.race([Promise.all(loaded), tooLong]).then(() => {
    try { puckSide = setupPuckSide(puckZone, puck); } catch (e) { puckSide = null; }
    launchPuck();
  });

  puck.addEventListener('click', launchPuck);
}

// ===== Бортик шайбы тоже вращается =====
// Корпус шайбы — неподвижная картинка: свет на ней уже «сфотографирован». Но когда шайба
// крутится, бортик тоже должен ехать по кругу, иначе видно, что вращается только верх.
// Поэтому корпус перерисовывается на холсте (canvas) много раз в секунду:
//   1) рифление: бортик режется на узкие вертикальные полоски, и каждая берётся чуть «сбоку» —
//      так ромбики едут по кругу, а свет остаётся на месте;
//   2) потёртости: картинка images/puck-side.webp (бортик «в развёртке») прокручивается
//      по бортику — по этим светлым ссадинам глаз и видит, что шайба вращается целиком.
// Угол поворота берётся у картинки с логотипом, поэтому верх и бортик крутятся строго вместе.
function setupPuckSide(zone, button) {
  const canvas = zone.querySelector('.puck__side');
  const body = zone.querySelector('.puck__body');
  const face = zone.querySelector('.puck__marks');
  const wearImg = zone.querySelector('.puck__side-src');
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  if (!ctx || !body || !face) return null;

  // Форма шайбы в долях её радиуса — те же числа, что в tools/make_puck.py
  const THICKNESS = 2 / 3;              // толщина
  const BEVEL = 0.05;                   // скругление кромки
  const KNURLS = 116;                   // сколько ромбиков по окружности
  const WEAR_STRENGTH = 0.9;            // насколько заметны потёртости (0 — не видны, 1 — яркие)

  // Где на картинке лежит шайба — из тех же чисел, что и в style.css (--face-…)
  const S = canvas.width;
  const style = getComputedStyle(zone);
  const num = (name) => parseFloat(style.getPropertyValue(name));
  const squash = num('--face-squash');
  const R = num('--face-size') / 100 * S / 2;            // радиус шайбы в пикселях холста
  const cx = num('--face-left') / 100 * S + R;           // центр верхней грани
  const cy = num('--face-top') / 100 * S + R;
  if (!(R > 0) || !(squash > 0)) return null;
  const lean = Math.sqrt(1 - squash * squash) * R;       // на сколько пикселей «вниз» уходит высота
  const bandH = (THICKNESS - 2 * BEVEL) * lean;          // высота бортика на картинке
  const below = BEVEL * R * 1.3 + 3;                     // запас вниз: нижнее скругление
  const TURN = 2 * Math.PI;
  const pitch = TURN / KNURLS;                           // угол одного ромбика
  const EDGE = 84 * Math.PI / 180;                       // у самых краёв бортик не трогаем
  const SRC_EDGE = 89 * Math.PI / 180;
  // Точка бортика под углом phi (0 — прямо перед зрителем): её место на картинке
  const xOf = (phi) => cx + R * Math.sin(phi);
  const topOf = (phi) => cy + R * squash * Math.cos(phi) + BEVEL * lean;
  const wrap = (v, period) => ((v % period) + period) % period;

  // Вертикальные полоски: в середине шире, у краёв уже (там бортик сильнее изгибается)
  const cols = [];
  const xEnd = Math.floor(xOf(EDGE));
  for (let x = Math.ceil(xOf(-EDGE)); x < xEnd;) {
    const phi = Math.asin((x - cx) / R);
    const w = Math.min(xEnd - x, Math.max(2, Math.round(8 * Math.cos(phi))));
    const p1 = Math.asin((x + w - cx) / R);
    cols.push({ x0: x, x1: x + w, p0: phi, p1: p1, y0: topOf(phi), y1: topOf(p1) });
    x += w;
  }

  let wear = null;      // развёртка потёртостей, повторённая дважды — чтобы не думать о стыке
  let ready = false;

  function prepareWear() {
    if (wear || !wearImg || !wearImg.naturalWidth) return;
    // Потёртости «прибавляют свет» к бортику (режим lighter). Режимы вроде color-dodge не годятся:
    // браузер считает их медленно, и в момент, когда шайба заезжает на экран, анимация
    // замирала на 0,2 секунды — шайба «выпрыгивала» уже посреди пути.
    ctx.globalCompositeOperation = 'lighter';
    const supported = ctx.globalCompositeOperation === 'lighter';
    ctx.globalCompositeOperation = 'source-over';
    if (!supported) return;                              // очень старый браузер — просто без потёртостей
    wear = document.createElement('canvas');
    wear.width = wearImg.naturalWidth * 2;
    wear.height = wearImg.naturalHeight;
    const w = wear.getContext('2d');
    w.drawImage(wearImg, 0, 0);
    w.drawImage(wearImg, wearImg.naturalWidth, 0);
  }

  // Копия картинки корпуса на отдельном холсте: Safari на iPhone рисует с холста намного
  // быстрее, чем с <img>, а рисовать приходится сотни кусочков за кадр.
  let src = null;

  // Рисует корпус, повёрнутый на angle (в радианах). Всегда ЧЁТКО, без «смаза»:
  // раньше при быстром вращении рифление намеренно размывалось, но на iPhone (где кадров
  // меньше) бортик превращался в мутное пятно — владелец попросил убрать.
  // (step больше не используется — оставлен, чтобы не менять, как вызывают draw.)
  function draw(angle, step) {      // eslint-disable-line no-unused-vars
    if (!ready) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, S, S);
    ctx.drawImage(src, 0, 0, S, S);

    // 1) Рифление. Узор повторяется каждый ромбик, поэтому важен только сдвиг внутри ромбика.
    const shift = wrap(angle, pitch);
    if (shift > 1e-4) {                                  // сдвига нет — корпус уже нарисован как надо
      for (let i = 0; i < cols.length; i++) {
        const c = cols[i];
        const s0 = Math.min(c.p0 + shift, SRC_EDGE);
        const s1 = Math.min(c.p1 + shift, SRC_EDGE);
        const sx = xOf(s0);
        const sw = xOf(s1) - sx;
        if (sw < 0.25) continue;
        const sy0 = topOf(s0);
        const sy1 = topOf(s1);
        const a = (c.x1 - c.x0) / sw;
        const b = ((c.y1 - sy1) - (c.y0 - sy0)) / sw;
        ctx.setTransform(a, b, 0, 1, c.x0 - a * sx, (c.y0 - sy0) - b * sx);
        const top = Math.max(0, Math.min(sy0, sy1) - 1);
        const h = Math.min(S - top, Math.abs(sy1 - sy0) + bandH + below + 2);   // не выходим за край картинки (Safari тогда ничего не рисует)
        ctx.drawImage(src, sx, top, sw, h, sx, top, sw, h);
      }
    }

    // 2) Потёртости: едут по бортику вместе с ним
    if (wear) {
      const tw = wear.width / 2;
      const th = wear.height;
      const perRad = tw / TURN;
      ctx.globalAlpha = WEAR_STRENGTH;
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < cols.length; i++) {
        const c = cols[i];
        const sx = wrap(c.p0 + angle, TURN) * perRad;
        const sw = (c.p1 - c.p0) * perRad;
        const a = (c.x1 - c.x0) / sw;
        const b = (c.y1 - c.y0) / sw;
        ctx.setTransform(a, b, 0, bandH / th, c.x0 - a * sx, c.y0 - b * sx);
        ctx.drawImage(wear, sx, 0, sw, th, sx, 0, sw, th);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // Логотип и бортик поворачивает ОДИН И ТОТ ЖЕ кусок кода, в одном и том же кадре.
  // Раньше логотип крутила CSS-анимация, а бортик «подглядывал» её угол. Но Safari на iPhone
  // проигрывает CSS-анимацию отдельно (на видеочипе), и подсмотренный угол отставал —
  // верх и бортик крутились вразнобой. Теперь угол считается здесь и сразу ставится обоим.
  // Время и угол берём из style.css (--slide-time, --spin), чтобы шайба по-прежнему
  // останавливалась и переставала крутиться одновременно.
  const duration = (parseFloat(style.getPropertyValue('--slide-time')) || 1.7) * 1000;
  const spinDeg = parseFloat(style.getPropertyValue('--spin')) || -540;
  const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  // Угол в момент t (от 0 до 1). Торможение равномерное, как у скольжения:
  // кривая --ice-friction — это ровно «путь = 2t − t²».
  const degAt = (t) => spinDeg * (1 - (2 * t - t * t));

  let frame = 0;
  let t0 = 0;

  function show(deg) {
    face.style.transform = 'rotate(' + deg + 'deg)';
    draw(deg * Math.PI / 180, 0);
  }
  function tick(now) {
    if (!t0) t0 = now;
    const t = Math.min(1, (now - t0) / duration);
    show(degAt(t));
    frame = t < 1 ? requestAnimationFrame(tick) : 0;
  }
  function start() {
    cancelAnimationFrame(frame);
    if (calm && calm.matches) { show(0); return; }      // анимации отключены в системе — шайба лежит ровно
    t0 = 0;
    show(degAt(0));                                      // сразу ставим начальный угол, без мелькания
    frame = requestAnimationFrame(tick);
  }

  function init() {
    if (ready || !body.naturalWidth) return;
    src = document.createElement('canvas');
    src.width = src.height = S;
    src.getContext('2d').drawImage(body, 0, 0, S, S);
    ready = true;
    prepareWear();
    try {
      draw(0, 0);
      button.classList.add('has-side');                  // холст готов — прячем обычную картинку корпуса
      zone.classList.add('js-spin');                     // логотип теперь крутит script.js, а не CSS
    } catch (e) {
      ready = false;                                     // не получилось — остаётся обычная картинка
    }
  }
  init();
  if (!ready) body.addEventListener('load', init, { once: true });
  if (wearImg && !wearImg.naturalWidth) {
    wearImg.addEventListener('load', () => { prepareWear(); if (!frame) draw(0, 0); }, { once: true });
  }

  return { start: start, draw: draw };
}
