// ===== Фон «лёд» =====
// Рисуем на <canvas> настоящую текстуру катка:
//   1) сине-серая база с мягкими облачными разводами,
//   2) сотни царапин от коньков — длинные и короткие, прямые и дугами,
//   3) снежная крошка — мелкие светлые точки.
// Рисунок одинаковый при каждом открытии (используем «случайные» числа из фиксированного seed).

(function () {
  const canvas = document.getElementById('ice');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Простой генератор псевдослучайных чисел: одинаковый узор каждый раз
  function makeRandom(seed) {
    return function () {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }

  function draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // размер берём у самого холста (в CSS он растянут на весь экран)
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const rnd = makeRandom(20261111);
    const R = (a, b) => a + rnd() * (b - a);

    // 1. База: глубокий сине-стальной лёд
    const base = ctx.createLinearGradient(0, 0, w * 0.3, h);
    base.addColorStop(0, '#2c4566');
    base.addColorStop(0.5, '#1d3352');
    base.addColorStop(1, '#14243b');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    // 2. Облачные разводы: размытые светлые и тёмные пятна, вытянутые по горизонтали
    ctx.save();
    ctx.filter = 'blur(' + Math.round(Math.max(w, h) / 70) + 'px)';
    const blobs = Math.round((w * h) / 6000);
    for (let i = 0; i < blobs; i++) {
      const x = R(-0.1, 1.1) * w;
      const y = R(-0.1, 1.1) * h;
      const rx = R(30, 200);
      const ry = rx * R(0.25, 0.5);
      const light = rnd() < 0.6;
      ctx.fillStyle = light
        ? 'rgba(160, 190, 225,' + R(0.08, 0.26) + ')'
        : 'rgba(6, 14, 28,' + R(0.1, 0.26) + ')';
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, R(-0.25, 0.25), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3. Царапины от коньков
    ctx.lineCap = 'round';

    // длинные прямые — через весь экран
    for (let i = 0; i < 70; i++) {
      const x = R(-0.2, 1.2) * w;
      const y = R(-0.2, 1.2) * h;
      const len = R(300, 1400);
      const ang = R(-Math.PI, Math.PI);
      ctx.strokeStyle = 'rgba(225, 238, 255,' + R(0.05, 0.22) + ')';
      ctx.lineWidth = R(0.4, 1.3);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      ctx.stroke();
    }

    // дуги — следы разворотов
    for (let i = 0; i < 40; i++) {
      const x = R(0, w);
      const y = R(0, h);
      const len = R(150, 600);
      const ang = R(-Math.PI, Math.PI);
      const bend = R(-0.5, 0.5) * len;
      const ex = x + Math.cos(ang) * len;
      const ey = y + Math.sin(ang) * len;
      ctx.strokeStyle = 'rgba(225, 238, 255,' + R(0.05, 0.18) + ')';
      ctx.lineWidth = R(0.4, 1.1);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo((x + ex) / 2 - Math.sin(ang) * bend, (y + ey) / 2 + Math.cos(ang) * bend, ex, ey);
      ctx.stroke();
    }

    // 4. Снежная крошка
    const flakes = Math.round((w * h) / 700);
    for (let i = 0; i < flakes; i++) {
      ctx.fillStyle = 'rgba(235, 245, 255,' + R(0.08, 0.55) + ')';
      const s = rnd() < 0.85 ? R(0.5, 1.3) : R(1.3, 2.6);
      ctx.fillRect(R(0, w), R(0, h), s, s);
    }

    // 5. Лёгкое затемнение по краям — чтобы текст лучше читался
    const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.8);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(3,8,18,.4)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  draw();

  // Перерисовываем, только если ширина окна изменилась
  // (на телефоне высота «прыгает» при прокрутке — из-за неё не перерисовываем)
  let lastW = window.innerWidth;
  let timer;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (window.innerWidth !== lastW) {
        lastW = window.innerWidth;
        draw();
      }
    }, 150);
  });
})();
