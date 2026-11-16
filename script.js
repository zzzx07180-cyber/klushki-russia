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
    ctx.globalCompositeOperation = 'color-dodge';        // режим «осветлить то, что под рисунком»
    const supported = ctx.globalCompositeOperation === 'color-dodge';
    ctx.globalCompositeOperation = 'source-over';
    if (!supported) return;                              // очень старый браузер — просто без потёртостей
    wear = document.createElement('canvas');
    wear.width = wearImg.naturalWidth * 2;
    wear.height = wearImg.naturalHeight;
    const w = wear.getContext('2d');
    w.drawImage(wearImg, 0, 0);
    w.drawImage(wearImg, wearImg.naturalWidth, 0);
  }

  // Рисует корпус, повёрнутый на angle (в радианах). step — на сколько он повернулся
  // с прошлого кадра: при быстром вращении рифление смазывается, как в жизни.
  function draw(angle, step) {
    if (!ready) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, S, S);
    ctx.drawImage(body, 0, 0, S, S);

    // 1) Рифление. Узор повторяется каждый ромбик, поэтому важен только сдвиг внутри ромбика.
    const blurRange = Math.min(Math.abs(step), pitch);
    const samples = blurRange > pitch / 8 ? 4 : 1;
    for (let k = 0; k < samples; k++) {
      const shift = wrap(angle - blurRange * k / samples, pitch);
      if (shift < 1e-4 && k === 0) continue;             // сдвига нет — корпус уже нарисован как надо
      ctx.globalAlpha = 1 / (k + 1);                     // 1, 1/2, 1/3… — в сумме получается среднее
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
        const top = Math.min(sy0, sy1) - 1;
        const h = Math.abs(sy1 - sy0) + bandH + below + 2;
        ctx.drawImage(body, sx, top, sw, h, sx, top, sw, h);
      }
    }

    // 2) Потёртости: едут по бортику вместе с ним. При быстром вращении рисуем их несколько раз
    //    бледнее и со сдвигом — получается «смаз», как у настоящего быстрого предмета.
    if (wear) {
      const tw = wear.width / 2;
      const th = wear.height;
      const perRad = tw / TURN;
      const passes = Math.max(1, Math.min(6, Math.ceil(Math.abs(step) / 0.012)));
      ctx.globalAlpha = WEAR_STRENGTH / passes;
      ctx.globalCompositeOperation = 'color-dodge';
      for (let k = 0; k < passes; k++) {
        const turned = angle - step * k / passes;
        for (let i = 0; i < cols.length; i++) {
          const c = cols[i];
          const sx = wrap(c.p0 + turned, TURN) * perRad;
          const sw = (c.p1 - c.p0) * perRad;
          const a = (c.x1 - c.x0) / sw;
          const b = (c.y1 - c.y0) / sw;
          ctx.setTransform(a, b, 0, bandH / th, c.x0 - a * sx, c.y0 - b * sx);
          ctx.drawImage(wear, sx, 0, sw, th, sx, 0, sw, th);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // На какой угол сейчас повёрнута картинка с логотипом
  function angleNow() {
    const m = getComputedStyle(face).transform.match(/^matrix\(([^,]+),([^,]+)/);
    return m ? Math.atan2(parseFloat(m[2]), parseFloat(m[1])) : 0;
  }

  let frame = 0;
  let last = 0;
  let stopTimer = 0;

  function tick() {
    const angle = angleNow();
    let step = angle - last;
    if (step > Math.PI) step -= TURN;
    if (step < -Math.PI) step += TURN;
    last = angle;
    draw(angle, step);
    frame = requestAnimationFrame(tick);
  }
  function stop() {
    cancelAnimationFrame(frame);
    clearTimeout(stopTimer);
    frame = 0;
    draw(0, 0);                                          // шайба остановилась — рисуем её ровно
  }
  function start() {
    cancelAnimationFrame(frame);
    clearTimeout(stopTimer);
    last = angleNow();
    frame = requestAnimationFrame(tick);
    stopTimer = setTimeout(stop, 6000);                  // страховка, если анимации отключены
  }
  face.addEventListener('animationend', (e) => { if (e.animationName === 'puck-spin') stop(); });

  function init() {
    if (ready || !body.naturalWidth) return;
    ready = true;
    prepareWear();
    try {
      draw(0, 0);
      button.classList.add('has-side');                  // холст готов — прячем обычную картинку корпуса
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
