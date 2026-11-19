# Значок сайта и картинка для превью ссылок — из готовых картинок шайбы и логотипа.
#
#   py tools/make_icons.py
#
# Что делает (всё кладёт в images/):
#   favicon.png           — значок во вкладке браузера (64×64): синий круг с белой «шайбой в полёте»;
#   apple-touch-icon.png  — значок на экране «Домой» у iPhone (180×180, тёмный фон — iPhone не любит прозрачный);
#   og-image.jpg          — картинка превью, когда ссылку на сайт присылают в Telegram / ВКонтакте
#                           (1200×630): слева логотип, справа шайба, фон — тёмный лёд.
# Шайба собирается так же, как на сайте: корпус puck-body.webp + логотип puck-face.webp сверху
# (положение логотипа — те же числа, что --face-… в style.css). Поменяли логотип или шайбу
# (tools/make_puck.py) — запустите этот скрипт ещё раз.

import math
import os
import random

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, 'images')

# те же числа, что в style.css (блок .puck-zone): где лежит логотип на корпусе
FACE_LEFT, FACE_TOP, FACE_SIZE, FACE_SQUASH = 0.0277, -0.0312, 0.9445, 0.9272

BLACK = (7, 9, 13)          # #07090d — цвет шапки
ACCENT = (30, 139, 255)     # #1e8bff


def puck():
    """Шайба целиком (корпус + логотип), обрезанная по краям, с прозрачным фоном."""
    body = Image.open(os.path.join(IMG, 'puck-body.webp')).convert('RGBA')
    face = Image.open(os.path.join(IMG, 'puck-face.webp')).convert('RGBA')
    w = body.width
    size = FACE_SIZE * w
    fw, fh = round(size), round(size * FACE_SQUASH)
    # центр «коробки» логотипа до сжатия; сжатие по высоте — вокруг центра (как transform в CSS)
    cx = FACE_LEFT * w + size / 2
    cy = FACE_TOP * w + size / 2
    face = face.resize((fw, fh), Image.LANCZOS)
    out = body.copy()
    out.alpha_composite(face, (round(cx - fw / 2), round(cy - fh / 2)))
    return out.crop(out.getbbox())


def square(img, side, pad=0.04, bg=None):
    """Вписать картинку в квадрат side×side с полями pad (доля стороны)."""
    inner = round(side * (1 - 2 * pad))
    k = inner / max(img.size)
    small = img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.LANCZOS)
    canvas = Image.new('RGBA', (side, side), bg + (255,) if bg else (0, 0, 0, 0))
    canvas.alpha_composite(small, ((side - small.width) // 2, (side - small.height) // 2))
    return canvas


def ice_background(w, h):
    """Тёмный «лёд»: мягкое синее свечение, разводы и царапины от коньков (без картинок)."""
    bg = Image.new('RGB', (w, h), BLACK)
    glow = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(glow)
    rnd = random.Random(7)                       # всегда одинаковый узор
    for _ in range(14):                          # облачные разводы
        x, y = rnd.uniform(-0.1, 1.1) * w, rnd.uniform(-0.1, 1.1) * h
        r = rnd.uniform(0.18, 0.4) * w
        d.ellipse((x - r, y - r * 0.6, x + r, y + r * 0.6), fill=rnd.randint(25, 60))
    glow = glow.filter(ImageFilter.GaussianBlur(70))
    steel = Image.new('RGB', (w, h), (40, 92, 150))
    bg = Image.composite(steel, bg, glow)
    # пятно света за шайбой
    spot = Image.new('L', (w, h), 0)
    ImageDraw.Draw(spot).ellipse((w * 0.52, h * 0.05, w * 1.05, h * 0.95), fill=110)
    spot = spot.filter(ImageFilter.GaussianBlur(90))
    bg = Image.composite(Image.new('RGB', (w, h), (30, 100, 190)), bg, spot)
    # царапины от коньков — тонкие светлые дуги
    lines = Image.new('L', (w, h), 0)
    ld = ImageDraw.Draw(lines)
    for _ in range(26):
        x0, y0 = rnd.uniform(0, w), rnd.uniform(0, h)
        ang = rnd.uniform(-0.5, 0.5) + (math.pi if rnd.random() < 0.5 else 0)
        length = rnd.uniform(120, 420)
        bend = rnd.uniform(-0.002, 0.002)
        pts = [(x0 + math.cos(ang + bend * t) * t, y0 + math.sin(ang + bend * t) * t * 0.35)
               for t in range(0, int(length), 6)]
        ld.line(pts, fill=rnd.randint(18, 45), width=1)
    bg = Image.composite(Image.new('RGB', (w, h), (170, 215, 255)), bg, lines)
    return bg.convert('RGBA')


def og_image():
    w, h = 1200, 630
    img = ice_background(w, h)

    # Логотип: на чёрном фоне, поэтому кладём его «прибавлением света» — чёрное исчезает
    logo = Image.open(os.path.join(IMG, 'logo.png')).convert('RGB')
    logo = logo.crop(logo.point(lambda v: 255 if v > 24 else 0).convert('L').getbbox())
    lw = 600
    logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
    layer = Image.new('RGB', (w, h), (0, 0, 0))
    layer.paste(logo, (64, (h - logo.height) // 2))
    img = ImageChops.add(img.convert('RGB'), layer).convert('RGBA')

    # Шайба справа + тень на льду
    p = puck()
    ph = 430
    p = p.resize((round(p.width * ph / p.height), ph), Image.LANCZOS)
    px, py = w - p.width - 50, (h - ph) // 2 + 10
    shadow = Image.new('L', (w, h), 0)
    ImageDraw.Draw(shadow).ellipse((px + 20, py + ph - 70, px + p.width - 20, py + ph + 25), fill=170)
    shadow = shadow.filter(ImageFilter.GaussianBlur(22))
    img = Image.composite(Image.new('RGBA', (w, h), (0, 0, 0, 255)), img, shadow)
    img.alpha_composite(p, (px, py))

    # Синяя светящаяся полоса снизу — как линия под шапкой сайта
    band = Image.new('L', (w, h), 0)
    ImageDraw.Draw(band).rectangle((0, h - 6, w, h), fill=255)
    band = band.filter(ImageFilter.GaussianBlur(3))
    img = Image.composite(Image.new('RGBA', (w, h), ACCENT + (255,)), img, band)
    return img.convert('RGB')


def favicon(side=64):
    """Значок во вкладке: синий круг и белая «шайба в полёте» — тот же рисунок, что на кнопке
    «Подобрать клюшку» (ICON_PUCK в picker.js, координаты — из его viewBox 0…24).
    Настоящая шайба для вкладки не годится: в 16–32 точках она превращается в тёмное пятно."""
    S = 512                                   # рисуем крупно и уменьшаем — края получаются гладкими
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((0, 0, S - 1, S - 1), fill=ACCENT + (255,))
    k = S * 0.66 / 24                         # рисунок занимает ~2/3 круга
    o = (S - 24 * k) / 2
    P = lambda x, y: (o + x * k, o + y * k)   # точка из координат значка (0…24) в пиксели
    white = (255, 255, 255, 255)
    cx, rx, ry, top, bottom = 15.25, 6.75, 3.5, 10, 13.9
    # корпус шайбы: верхний овал, бок, нижний овал
    d.ellipse((*P(cx - rx, bottom - ry), *P(cx + rx, bottom + ry)), fill=white)
    d.rectangle((*P(cx - rx, top), *P(cx + rx, bottom)), fill=white)
    d.ellipse((*P(cx - rx, top - ry), *P(cx + rx, top + ry)), fill=white)
    # синяя линия края верхней грани
    d.arc((*P(8.7, 10.45 - 2.85), *P(21.8, 10.45 + 2.85)), 0, 180, fill=ACCENT + (255,), width=round(1.3 * k))
    # линии скорости
    for y, x0 in ((8.8, 3.2), (12.1, 1.6), (15.4, 3.2)):
        d.line((*P(x0, y), *P(6.4, y)), fill=white, width=round(2 * k))
        for x in (x0, 6.4):                   # скруглённые концы
            d.ellipse((*P(x - 1, y - 1), *P(x + 1, y + 1)), fill=white)
    return img.resize((side, side), Image.LANCZOS)


def main():
    p = puck()
    favicon(64).save(os.path.join(IMG, 'favicon.png'), optimize=True)
    square(p, 180, pad=0.08, bg=BLACK).convert('RGB').save(os.path.join(IMG, 'apple-touch-icon.png'), optimize=True)
    og_image().save(os.path.join(IMG, 'og-image.jpg'), quality=86, optimize=True, progressive=True)
    for f in ('favicon.png', 'apple-touch-icon.png', 'og-image.jpg'):
        print('Готово:', os.path.join('images', f), round(os.path.getsize(os.path.join(IMG, f)) / 1024), 'КБ')


if __name__ == '__main__':
    main()
