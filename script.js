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

  // Экран стал заметно больше (повернули телефон, развернули окно) — готовим холст шайбы
  // заново, крупнее, чтобы она осталась чёткой (см. puckCanvasSize). Пока шайба едет — ждём.
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function grow() {
      if (!puckSide || puckCanvasSize(puckZone) <= puckSide.size * 1.1) return;
      if (puckSide.busy()) { resizeTimer = setTimeout(grow, 500); return; }
      puckSide.dispose();
      try { puckSide = setupPuckSide(puckZone, puck); } catch (e) { puckSide = null; }
    }, 300);
  });
}

// Размер холста шайбы — сколько точек она реально занимает на экране (с учётом его чёткости),
// но не больше картинок (960) и не меньше 640: мельче узор рифления на бортике начинает рябить.
// Раньше холст всегда был 960×960 — на компьютере видеочип рисовал в 4 раза больше точек,
// чем видно, на iPhone — примерно на треть больше.
function puckCanvasSize(zone) {
  const shown = zone.offsetWidth * (window.devicePixelRatio || 1);
  return 2 * Math.round(Math.min(960, Math.max(640, shown)) / 2);
}

// ===== Шайба крутится целиком: и логотип, и бортик =====
// Картинка корпуса неподвижна: свет на ней уже «сфотографирован». Когда шайба крутится,
// по кругу должно ехать всё, что на ней нарисовано: логотип сверху, рифление и потёртости
// на бортике. Поэтому шайба много раз в секунду перерисовывается на холсте (canvas):
//   1) рифление: каждая точка бортика берётся с картинки чуть «сбоку» — так ромбики едут
//      по кругу, а свет остаётся на месте;
//   2) потёртости: картинка images/puck-side.webp (бортик «в развёртке») прокручивается
//      по бортику — по этим светлым ссадинам глаз и видит, что шайба вращается целиком;
//   3) логотип: картинка images/puck-face.webp, повёрнутая на тот же самый угол.
// Рисовать умеем двумя способами:
//   • основной — силами видеочипа (WebGL): весь кадр — одна операция. Логотип и бортик
//     рисуются ВМЕСТЕ, одним кадром, поэтому разойтись не могут. Раньше кадр собирал
//     процессор из сотен полосок; на iPhone он не успевал — шайба шла рывками, а логотип
//     (отдельная картинка) убегал от бортика;
//   • запасной — обычный холст (2D), если видеочип недоступен (например, сайт открыт двойным
//     щелчком по файлу). Тогда на холсте только корпус, а логотип поворачивается картинкой.
function setupPuckSide(zone, button) {
  let canvas = zone.querySelector('.puck__side');
  const body = zone.querySelector('.puck__body');
  const face = zone.querySelector('.puck__marks');
  const wearImg = zone.querySelector('.puck__side-src');
  if (!canvas || !canvas.getContext || !body || !face) return null;

  // Форма шайбы в долях её радиуса — те же числа, что в tools/make_puck.py
  const THICKNESS = 2 / 3;              // толщина
  const BEVEL = 0.05;                   // скругление кромки
  const KNURLS = 116;                   // сколько ромбиков по окружности
  const WEAR_STRENGTH = 0.9;            // насколько заметны потёртости (0 — не видны, 1 — яркие)

  // Где на картинке лежит шайба — из тех же чисел, что и в style.css (--face-…)
  canvas.width = canvas.height = puckCanvasSize(zone);
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

  let painter = null;                   // «художник»: рисует шайбу, повёрнутую на нужный угол
  let frame = 0;                        // номер запланированного кадра (0 — шайба стоит)
  let t0 = 0;                           // когда началось вращение
  let angleDeg = 0;                     // на сколько градусов шайба повёрнута сейчас
  let disposed = false;                 // этот холст заменён новым (экран стал больше)

  // ---------- Способ 1: видеочип (WebGL) ----------
  // Видеочип сам решает для КАЖДОЙ точки холста, какого она цвета, по «рецепту» ниже
  // (это маленькая программа для видеочипа — шейдер). Рецепт повторяет то же, что делает
  // запасной способ, только без нарезки на полоски.
  const VERTEX_TEXT = [
    'attribute vec2 corner;',
    'uniform float size;',
    'varying vec2 p;',
    'void main() {',
    '  p = corner * size;',
    '  gl_Position = vec4(corner.x * 2.0 - 1.0, 1.0 - corner.y * 2.0, 0.0, 1.0);',
    '}'
  ].join('\n');
  const FRAGMENT_TEXT = [
    'precision highp float;',
    'varying vec2 p;',                                   // точка холста, которую красим
    'uniform sampler2D body, logo, wear;',               // три картинки шайбы
    'uniform vec2 center;',
    'uniform float size, radius, squash, bevel, bandH, below, angle, shift, wearStrength;',
    'const float EDGE = ' + EDGE.toFixed(7) + ';',
    'const float SRC_EDGE = ' + SRC_EDGE.toFixed(7) + ';',
    'const float TURN = ' + TURN.toFixed(7) + ';',
    'float topOf(float phi) { return center.y + radius * squash * cos(phi) + bevel; }',
    'void main() {',
    '  vec2 from = p;',                                  // откуда с картинки корпуса брать цвет
    '  vec3 light = vec3(0.0);',                         // свет от потёртостей
    '  float dx = (p.x - center.x) / radius;',
    '  if (abs(dx) < sin(EDGE)) {',
    '    float phi = asin(dx);',                         // под каким углом к зрителю эта точка бортика
    '    float top = topOf(phi);',
    '    if (p.y >= top - 1.0 && p.y <= top + bandH + below + 1.0) {',
    // 1) рифление: берём цвет «сбоку», на долю ромбика правее
    '      float side = min(phi + shift, SRC_EDGE);',
    '      from = vec2(center.x + radius * sin(side), p.y + topOf(side) - top);',
    // 2) потёртости: едут по бортику вместе с ним
    '      float v = (p.y - top) / bandH;',
    '      if (v >= 0.0 && v <= 1.0) {',
    '        light = texture2D(wear, vec2(fract((phi + angle) / TURN), v)).rgb * wearStrength;',
    '      }',
    '    }',
    '  }',
    '  vec4 color = texture2D(body, from / size);',
    '  color.rgb = min(color.rgb + light * color.a, vec3(1.0));',
    // 3) логотип: круг, повёрнутый на angle и сжатый в овал (шайба наклонена)
    '  vec2 f = vec2(p.x - center.x, (p.y - center.y) / squash);',
    '  float c = cos(angle);',
    '  float s = sin(angle);',
    '  vec2 t = vec2(c * f.x + s * f.y, c * f.y - s * f.x) / (2.0 * radius) + 0.5;',
    '  if (t.x >= 0.0 && t.x <= 1.0 && t.y >= 0.0 && t.y <= 1.0) {',
    '    vec4 mark = texture2D(logo, t);',
    '    color = mark + color * (1.0 - mark.a);',
    '  }',
    '  gl_FragColor = color;',
    '}'
  ].join('\n');

  function makeGlPainter() {
    const options = {
      alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false,
      failIfMajorPerformanceCaveat: true                 // «ненастоящий», медленный видеочип не берём
    };
    let gl = null;
    try {
      gl = canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options);
    } catch (e) { gl = null; }
    if (!gl) return null;

    let ok = false;
    let program = null;
    let uAngle = null;
    let uShift = null;
    const isPowerOfTwo = (n) => n > 0 && (n & (n - 1)) === 0;

    function shader(type, text) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, text);
      gl.compileShader(sh);
      return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
    }
    // Отдаём картинку видеочипу (img = null — пустышка в одну прозрачную точку)
    function texture(unit, img, repeat) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (img) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    }
    function loadWear() {
      const has = !!(wearImg && wearImg.naturalWidth);
      texture(2, has ? wearImg : null, has && isPowerOfTwo(wearImg.naturalWidth) && isPowerOfTwo(wearImg.naturalHeight));
      gl.uniform1f(gl.getUniformLocation(program, 'wearStrength'), has ? WEAR_STRENGTH : 0);
      return has;
    }

    // Готовим всё, что нужно видеочипу: программу-«рецепт», числа и картинки
    function build() {
      gl.getError();                                     // сбрасываем старую отметку об ошибке, если была
      const precise = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
      if (!precise || !precise.precision) return false;  // видеочип считает слишком грубо — не годится
      const vs = shader(gl.VERTEX_SHADER, VERTEX_TEXT);
      const fs = shader(gl.FRAGMENT_SHADER, FRAGMENT_TEXT);
      if (!vs || !fs) return false;
      program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.bindAttribLocation(program, 0, 'corner');
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;
      gl.useProgram(program);

      // один прямоугольник во весь холст
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      const set = (name, value) => gl.uniform1f(gl.getUniformLocation(program, name), value);
      set('size', S);
      set('radius', R);
      set('squash', squash);
      set('bevel', BEVEL * lean);
      set('bandH', bandH);
      set('below', below);
      gl.uniform2f(gl.getUniformLocation(program, 'center'), cx, cy);
      gl.uniform1i(gl.getUniformLocation(program, 'body'), 0);
      gl.uniform1i(gl.getUniformLocation(program, 'logo'), 1);
      gl.uniform1i(gl.getUniformLocation(program, 'wear'), 2);
      uAngle = gl.getUniformLocation(program, 'angle');
      uShift = gl.getUniformLocation(program, 'shift');

      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      texture(0, body, false);
      texture(1, face, false);
      loadWear();
      gl.viewport(0, 0, S, S);
      gl.disable(gl.BLEND);
      return gl.getError() === gl.NO_ERROR;
    }

    function draw(angle) {
      if (!ok) return;
      gl.uniform1f(uAngle, wrap(angle, TURN));
      gl.uniform1f(uShift, wrap(angle, pitch));          // узор рифления повторяется каждый ромбик
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    try { ok = build(); } catch (e) { ok = false; }      // например, сайт открыт как файл — картинки «чужие»
    if (!ok) {
      // Холст уже отдан видеочипу и для запасного способа не годится — ставим на его место новый
      const fresh = canvas.cloneNode(false);
      canvas.parentNode.replaceChild(fresh, canvas);
      canvas = fresh;
      return null;
    }

    // release — отдать видеочип обратно, когда холст заменяется новым
    let gone = false;
    const me = { face: true, off: false, draw: draw, release: () => {
      gone = true;
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    } };
    draw(0);
    button.classList.add('has-side', 'has-face');        // холст готов — прячем обычные картинки шайбы

    // Потёртости загрузились позже остального — добавляем
    if (wearImg && !wearImg.naturalWidth) {
      wearImg.addEventListener('load', () => {
        if (!ok) return;
        try { loadWear(); } catch (e) { /* остаёмся без потёртостей */ }
        refresh();
      }, { once: true });
    }
    // Телефон может «отобрать» видеочип (вкладка долго была свёрнута). Тогда показываем обычные
    // картинки шайбы, а когда видеочип вернут — готовим всё заново.
    canvas.addEventListener('webglcontextlost', (e) => {
      if (gone) return;                                  // холст уже заменён новым — его не трогаем
      e.preventDefault();
      ok = false;
      me.off = true;
      button.classList.remove('has-side', 'has-face');
    });
    canvas.addEventListener('webglcontextrestored', () => {
      try { ok = build(); } catch (e) { ok = false; }
      if (!ok) return;
      me.off = false;
      draw(angleDeg * Math.PI / 180);
      button.classList.add('has-side', 'has-face');
    });
    return me;
  }

  // ---------- Способ 2: обычный холст (запасной) ----------
  function make2dPainter() {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Вертикальные полоски: в середине шире, у краёв уже (там бортик сильнее изгибается).
    // Ширина — в долях холста (8 точек на холсте 960), чтобы на любом размере рисунок был тот же.
    const cols = [];
    const xEnd = Math.floor(xOf(EDGE));
    for (let x = Math.ceil(xOf(-EDGE)); x < xEnd;) {
      const phi = Math.asin((x - cx) / R);
      const w = Math.min(xEnd - x, Math.max(2, Math.round(8 * S / 960 * Math.cos(phi))));
      const p1 = Math.asin((x + w - cx) / R);
      cols.push({ x0: x, x1: x + w, p0: phi, p1: p1, y0: topOf(phi), y1: topOf(p1) });
      x += w;
    }

    let wear = null;      // развёртка потёртостей, повторённая дважды — чтобы не думать о стыке

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
    const src = document.createElement('canvas');
    src.width = src.height = S;
    src.getContext('2d').drawImage(body, 0, 0, S, S);

    // Рисует корпус, повёрнутый на angle (в радианах). Всегда ЧЁТКО, без «смаза»:
    // раньше при быстром вращении рифление намеренно размывалось, но на iPhone (где кадров
    // меньше) бортик превращался в мутное пятно — владелец попросил убрать.
    function draw(angle) {
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

    prepareWear();
    try { draw(0); } catch (e) { return null; }           // не получилось — остаются обычные картинки
    button.classList.add('has-side');                      // холст готов — прячем обычную картинку корпуса
    if (wearImg && !wearImg.naturalWidth) {
      wearImg.addEventListener('load', () => { prepareWear(); refresh(); }, { once: true });
    }
    return { face: false, off: false, draw: draw };
  }

  // ---------- Вращение ----------
  // Угол считается здесь, по часам, и сразу отдаётся «художнику». Время и угол берём
  // из style.css (--slide-time, --spin), чтобы шайба останавливалась и переставала крутиться
  // в один и тот же момент.
  const duration = (parseFloat(style.getPropertyValue('--slide-time')) || 1.7) * 1000;
  const spinDeg = parseFloat(style.getPropertyValue('--spin')) || -540;
  const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  // Угол в момент t (от 0 до 1). Торможение равномерное, как у скольжения:
  // кривая --ice-friction — это ровно «путь = 2t − t²».
  const degAt = (t) => spinDeg * (1 - (2 * t - t * t));

  function show(deg) {
    angleDeg = deg;
    if (!painter.face) face.style.transform = 'rotate(' + deg + 'deg)';   // запасной способ: логотип — картинка
    painter.draw(deg * Math.PI / 180);
  }
  // Перерисовать стоящую шайбу (догрузились потёртости, человек вернулся на вкладку)
  function refresh() {
    if (painter && !painter.off && !frame) show(angleDeg);
  }
  function tick(now) {
    if (painter.off) { frame = 0; return; }
    if (!t0) t0 = now;
    const t = Math.min(1, (now - t0) / duration);
    show(degAt(t));
    frame = t < 1 ? requestAnimationFrame(tick) : 0;
  }
  function start() {
    cancelAnimationFrame(frame);
    frame = 0;
    if (!painter || painter.off) {                       // холста нет — логотип прокрутит CSS (style.css)
      zone.classList.remove('js-spin');
      return;
    }
    zone.classList.add('js-spin');
    if (calm && calm.matches) { show(0); return; }       // анимации отключены в системе — шайба лежит ровно
    t0 = 0;
    show(degAt(0));                                      // сразу ставим начальный угол, без мелькания
    frame = requestAnimationFrame(tick);
  }

  function init() {
    if (disposed || painter || !body.naturalWidth || !face.naturalWidth) return;
    painter = makeGlPainter() || make2dPainter();
  }
  init();
  if (!painter) {
    // Картинки ещё не загрузились (медленный интернет). Эту поездку логотип прокрутит CSS,
    // а холст подключим, когда шайба уже остановится.
    const later = () => setTimeout(init, duration + 200);
    body.addEventListener('load', later, { once: true });
    face.addEventListener('load', later, { once: true });
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.addEventListener('pageshow', refresh);

  return {
    start: start,
    size: S,                                             // размер холста в точках
    busy: () => frame !== 0,                             // шайба сейчас едет и крутится
    // Убрать этот холст: экран стал больше, и шайбу подготовят заново на холсте крупнее
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frame);
      frame = 0;
      if (painter) {
        painter.off = true;
        if (painter.release) painter.release();
      }
      button.classList.remove('has-side', 'has-face');
      face.style.transform = '';
      const fresh = canvas.cloneNode(false);
      canvas.parentNode.replaceChild(fresh, canvas);
    },
    draw: (angle) => { if (painter) painter.draw(angle); },
    mode: () => (painter ? (painter.face ? 'webgl' : 'canvas') : 'css')
  };
}
