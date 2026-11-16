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

function launchPuck() {
  puckZone.classList.remove('is-waiting', 'is-flying');
  void puckZone.offsetWidth;            // «перезагружаем» анимацию, чтобы она сыграла ещё раз
  puckZone.classList.add('is-flying');
}

if (puckZone && puck) {
  // Шайба сложена из двух картинок. Ждём, пока обе загрузятся (но не дольше 2 секунд),
  // и только потом запускаем — иначе на медленном интернете шайба «въедет» невидимой.
  puckZone.classList.add('is-waiting');
  const images = Array.from(puck.querySelectorAll('img'));
  const loaded = images.map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()));
  const tooLong = new Promise((resolve) => setTimeout(resolve, 2000));
  Promise.race([Promise.all(loaded), tooLong]).then(launchPuck);

  puck.addEventListener('click', launchPuck);
}
