# -*- coding: utf-8 -*-
"""
Делает картинки шайбы для главной страницы — настоящий 3D-рендер в Blender.

Чёрная резиновая шайба со скруглённой кромкой, рифлёным («в ромбик») бортиком,
логотипом (images/logo.png), мелкими царапинами и потёртостями. Получаются ТРИ картинки:

  images/puck-body.webp — корпус шайбы под наклоном: чистая резина, рифлёный бортик, свет;
  images/puck-face.webp — логотип, царапины и потёртости у края грани («развёрнуто» в ровный круг);
  images/puck-side.webp — потёртости бортика «в развёртке» (длинная полоска на все 360°).

Зачем три: на сайте шайба крутится вокруг своей оси, когда скользит по льду. Свет при этом
должен оставаться на месте, а всё, что «нарисовано» на шайбе, — ехать по кругу. Поэтому
корпус неподвижен, картинка с логотипом вращается поверх него, а полоска с потёртостями
«прокручивается» по бортику (это делает script.js).

Фон прозрачный, браузеру ничего не нужно обрезать. Формат WebP: выглядит как PNG,
но весит в несколько раз меньше (важно для телефонов).

Запуск (из папки проекта), Blender откроется с окном и сам сохранит обе картинки:

  "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Blender\\blender.exe" --python tools\\make_puck.py

Что можно менять — в блоке «НАСТРОЙКИ» ниже (наклон, размер, сила царапин и т.п.).
⚠️ Если поменять TILT (наклон) — скрипт в конце напечатает четыре числа «--face-…»,
их нужно вписать в style.css (блок .puck-zone), иначе логотип ляжет на шайбу криво.
"""
import math
import os

import bpy
import numpy as np
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

try:
    _HERE = os.path.dirname(os.path.abspath(__file__))
except NameError:                     # если код запущен не из файла
    _HERE = os.path.join(os.getcwd(), 'tools')
ROOT = os.path.dirname(_HERE)

# ───────────────────────────── НАСТРОЙКИ ─────────────────────────────
LOGO_PATH = os.path.join(ROOT, 'images', 'logo.png')
OUT_BODY = os.path.join(ROOT, 'images', 'puck-body.webp')   # корпус (неподвижная картинка)
OUT_FACE = os.path.join(ROOT, 'images', 'puck-face.webp')   # логотип и царапины (вращается)
OUT_SIDE = os.path.join(ROOT, 'images', 'puck-side.webp')   # потёртости бортика в развёртке

SIZE = 960            # размер картинки в пикселях (квадрат)
SAMPLES = 500         # качество рендера (больше — чище, но дольше)
WEBP_QUALITY = 85     # качество сжатия: 100 — без потерь (тяжёлая); 85 — на глаз не отличить от 90, а файлы на ~15% легче
TILT = 22             # наклон в градусах: 0 — шайба смотрит прямо на зрителя, больше — виден бортик
MARGIN = 0.012        # поля вокруг шайбы (доля от размера картинки)

LOGO_SCALE = 1.08     # логотип чуть крупнее диаметра шайбы (как было на сайте)
LOGO_GLOW = 0.75      # насколько логотип «светится» сам (0 — только отражённый свет)
SCRATCHES = 1.0       # сила царапин: 0 — новая шайба, 1 — слегка поигранная
SEED = 7              # другое число — другой рисунок царапин

# Размеры настоящей шайбы: диаметр 76,2 мм, толщина 25,4 мм. Здесь радиус = 1.
R = 1.0
H = 2.0 / 3.0
BEVEL = 0.05          # скругление кромки
KNURL_COUNT = 116     # сколько «ромбиков» по окружности бортика
KNURL_DEPTH = 0.016   # глубина рифления

SEGMENTS = 1392       # детализация сетки по кругу (кратно KNURL_COUNT)
SIDE_ROWS = 132       # детализация бортика по высоте
ARC = 14              # детализация скругления
TEX = 2048            # размер карты царапин
SIDE_TEX = (2048, 128)   # размер развёртки бортика (ширина — полный оборот, высота — рифлёная полоса)
# ⚠️ H, BEVEL и KNURL_COUNT продублированы в script.js (блок «Бортик шайбы») — менять в обоих местах.
# ─────────────────────────────────────────────────────────────────────


# ───────────────────────────── сетка ─────────────────────────────
def build_mesh():
    """Шайба как тело вращения: крышка → скругление → бортик → скругление → дно."""
    top = H / 2
    flat = R - BEVEL
    side = top - BEVEL
    rings = [(0.35, top), (0.7, top), (flat - 0.02, top), (flat - 0.004, top), (flat, top)]
    for i in range(1, ARC + 1):
        a = math.radians(90 * i / ARC)
        rings.append((flat + BEVEL * math.sin(a), side + BEVEL * math.cos(a)))
    for i in range(1, SIDE_ROWS + 1):
        rings.append((R, side - 2 * side * i / SIDE_ROWS))
    for i in range(1, ARC + 1):
        a = math.radians(90 * i / ARC)
        rings.append((flat + BEVEL * math.cos(a), -side - BEVEL * math.sin(a)))
    rings += [(flat - 0.004, -top), (flat - 0.02, -top), (0.7, -top), (0.35, -top)]

    n = len(rings)
    ang = np.linspace(0, 2 * math.pi, SEGMENTS, endpoint=False)
    rr = np.array([r for r, _ in rings])[:, None]
    zz = np.array([z for _, z in rings])[:, None]
    co = np.empty((n, SEGMENTS, 3))
    co[:, :, 0] = rr * np.cos(ang)
    co[:, :, 1] = rr * np.sin(ang)
    co[:, :, 2] = zz
    verts = co.reshape(-1, 3).tolist() + [(0, 0, top), (0, 0, -top)]
    c_top, c_bot = n * SEGMENTS, n * SEGMENTS + 1

    j = np.arange(SEGMENTS)
    j1 = (j + 1) % SEGMENTS
    faces = []
    for i in range(n - 1):
        a, b = i * SEGMENTS, (i + 1) * SEGMENTS
        faces += np.stack([a + j, b + j, b + j1, a + j1], 1).tolist()
    last = (n - 1) * SEGMENTS
    faces += np.stack([np.full(SEGMENTS, c_top), j, j1], 1).tolist()
    faces += np.stack([np.full(SEGMENTS, c_bot), last + j1, last + j], 1).tolist()

    mesh = bpy.data.meshes.new('Puck')
    mesh.from_pydata(verts, [], faces)
    mesh.polygons.foreach_set('use_smooth', [True] * len(mesh.polygons))
    mesh.update()
    return mesh


# ───────────────────────────── царапины ─────────────────────────────
def make_scratch_map():
    """Чёрно-белая карта царапин для верхней грани: 0 — целая резина, 1 — глубокая царапина."""
    rng = np.random.default_rng(SEED)
    n = TEX
    hm = np.zeros((n, n), np.float32)
    c = rp = n / 2.0
    limit = (R - BEVEL) * 0.985

    def seg(x0, y0, x1, y1, w, d):
        pad = w * 3 + 2
        xa, xb = int(max(0, min(x0, x1) - pad)), int(min(n, max(x0, x1) + pad + 1))
        ya, yb = int(max(0, min(y0, y1) - pad)), int(min(n, max(y0, y1) + pad + 1))
        if xa >= xb or ya >= yb:
            return
        yy, xx = np.mgrid[ya:yb, xa:xb].astype(np.float32)
        dx, dy = x1 - x0, y1 - y0
        l2 = dx * dx + dy * dy or 1e-6
        t = np.clip(((xx - x0) * dx + (yy - y0) * dy) / l2, 0, 1)
        d2 = (xx - (x0 + t * dx)) ** 2 + (yy - (y0 + t * dy)) ** 2
        view = hm[ya:yb, xa:xb]
        np.maximum(view, d * np.exp(-d2 / (w * w)), out=view)

    def scratch(px, py, ang, length, w, depth, bend=0.0, steps=18):
        dx, dy = math.cos(ang), math.sin(ang)
        p0 = (px - dx * length / 2, py - dy * length / 2)
        p2 = (px + dx * length / 2, py + dy * length / 2)
        p1 = (px - dy * bend, py + dx * bend)
        pts = []
        for i in range(steps + 1):
            t = i / steps
            pts.append(((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
                        (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1], t))
        for (xa, ya, ta), (xb, yb, tb) in zip(pts, pts[1:]):
            if math.hypot(xa, ya) > limit or math.hypot(xb, yb) > limit:
                continue
            env = math.sin(math.pi * (ta + tb) / 2) ** 0.5       # к концам царапина сходит на нет
            seg(c + xa * rp, c + ya * rp, c + xb * rp, c + yb * rp, w, depth * env)

    def in_logo(x, y, grow=0.0):
        return -0.94 - grow < x < 0.90 + grow and -0.29 - grow < y < 0.24 + grow

    def rand_point(rmax=0.88, avoid_logo=False):
        for _ in range(200):
            r, a = rmax * math.sqrt(rng.random()), rng.random() * math.tau
            x, y = r * math.cos(a), r * math.sin(a)
            if not (avoid_logo and in_logo(x, y, 0.06)):
                return x, y
        return 0.0, 0.6

    main_dirs = (math.radians(24), math.radians(-52))     # шайба скользит — царапины идут «пучками»

    # 1. Тонкие волосяные царапины по всей грани (могут пересекать и логотип)
    for _ in range(58):
        x, y = rand_point()
        ang = (main_dirs[int(rng.random() < 0.4)] + rng.normal(0, 0.2)) if rng.random() < 0.7 \
            else rng.random() * math.pi
        scratch(x, y, ang, rng.uniform(0.12, 0.75), rng.uniform(0.9, 1.5),
                rng.uniform(0.14, 0.42), rng.normal(0, 0.03))

    # 2. Заметные царапины — выше и ниже логотипа
    for _ in range(6):
        x, y = rand_point(0.84, avoid_logo=True)
        ang = rng.normal(0, 0.5) + (math.pi if rng.random() < 0.5 else 0)
        scratch(x, y, ang, rng.uniform(0.3, 0.8), rng.uniform(1.8, 2.5),
                rng.uniform(0.55, 0.85), rng.normal(0, 0.06), steps=26)

    # 3. Пара глубоких зарубок ближе к краю
    for _ in range(2):
        x, y = rand_point(0.86, avoid_logo=True)
        scratch(x, y, rng.random() * math.pi, rng.uniform(0.08, 0.2), rng.uniform(3.4, 4.8),
                1.0, rng.normal(0, 0.02), steps=10)

    # 4. Потёртости — пятна из множества коротких параллельных штрихов
    for _ in range(3):
        x, y = rand_point(0.84, avoid_logo=True)
        ang = main_dirs[int(rng.random() < 0.5)] + rng.normal(0, 0.15)
        for _ in range(45):
            scratch(x + rng.normal(0, 0.07), y + rng.normal(0, 0.045), ang + rng.normal(0, 0.07),
                    rng.uniform(0.04, 0.16), rng.uniform(0.9, 1.3), rng.uniform(0.12, 0.33))

    hm = np.clip(hm * SCRATCHES, 0, 1)
    img = bpy.data.images.new('puck_scratches', n, n, alpha=False, is_data=True)
    px = np.empty((n, n, 4), np.float32)
    px[..., 0] = px[..., 1] = px[..., 2] = hm
    px[..., 3] = 1.0
    img.pixels.foreach_set(px.ravel())
    img.update()
    img.pack()
    return img


# ───────────────────────────── потёртости бортика ─────────────────────────────
def make_side_marks():
    """Потёртости бортика «в развёртке»: полоска, где ширина — полный оборот шайбы (360°),
    а высота — рифлёная полоса бортика. Чёрное — целая резина, светлое — потёртость
    (на сайте светлые места «высветляют» бортик под собой). Края по ширине стыкуются
    без шва, чтобы полоску можно было прокручивать по кругу бесконечно."""
    rng = np.random.default_rng(SEED + 1)
    w, h = SIDE_TEX
    a = np.zeros((h, w), np.float32)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)

    def blob(cx, cy, sx, sy, amp, angle=0.0):
        dx = (xx - cx + w / 2) % w - w / 2            # расстояние «по кругу» — без шва на стыке
        dy = yy - cy
        ca, sa = math.cos(angle), math.sin(angle)
        u, v = dx * ca + dy * sa, -dx * sa + dy * ca
        return amp * np.exp(-(u / sx) ** 2 - (v / sy) ** 2)

    def add(layer):
        np.maximum(a, layer, out=a)

    # 1. Большие мягкие зоны, где верхушки ромбиков вытерлись
    for _ in range(20):
        add(blob(rng.uniform(0, w), rng.uniform(0.1, 0.9) * h, rng.uniform(25, 110),
                 rng.uniform(10, 34), rng.uniform(0.14, 0.34)))
    # 2. Заметные светлые ссадины (удары о борт и клюшки) — по ним глаз и видит вращение
    for _ in range(10):
        add(blob(rng.uniform(0, w), rng.uniform(0.18, 0.82) * h, rng.uniform(22, 70),
                 rng.uniform(2.4, 5.2), rng.uniform(0.6, 0.95), rng.normal(0, 0.3)))
    # 3. Пучки тонких царапин
    for _ in range(7):
        cx, cy, ang = rng.uniform(0, w), rng.uniform(0.2, 0.8) * h, rng.normal(0, 0.25)
        for _ in range(14):
            add(blob(cx + rng.normal(0, 30), cy + rng.normal(0, 12), rng.uniform(10, 34),
                     rng.uniform(0.9, 1.6), rng.uniform(0.3, 0.65), ang + rng.normal(0, 0.08)))
    # 4. Короткие вертикальные зарубки
    for _ in range(6):
        add(blob(rng.uniform(0, w), rng.uniform(0.25, 0.75) * h, rng.uniform(1.6, 3.0),
                 rng.uniform(8, 20), rng.uniform(0.6, 0.9), rng.normal(0, 0.2)))

    # «Крупинки»: потёртость не сплошная, а по отдельным верхушкам рифления
    speck = np.kron(rng.random((h // 2, w // 2)).astype(np.float32), np.ones((2, 2), np.float32))
    a *= 0.55 + 0.45 * speck
    # у верхнего и нижнего края полосы рифление кончается — там потёртости сходят на нет
    a *= np.clip(np.minimum(yy, h - 1 - yy) / (0.12 * h), 0, 1)
    a = np.clip(a * SCRATCHES, 0, 1)

    old = bpy.data.images.get('puck_side')
    if old:
        bpy.data.images.remove(old)
    img = bpy.data.images.new('puck_side', w, h, alpha=False)
    a = a[::-1]                                                # у Blender нижняя строка — первая
    px = np.ones((h, w, 4), np.float32)
    px[..., 0], px[..., 1], px[..., 2] = 0.62 * a, 0.66 * a, 0.72 * a    # цвет стёртой резины
    img.pixels.foreach_set(px.ravel())
    img.update()
    img.save_render(OUT_SIDE, scene=bpy.context.scene)
    print('Готово:', OUT_SIDE, round(os.path.getsize(OUT_SIDE) / 1024), 'КБ')


# ───────────────────────────── материал ─────────────────────────────
class Nodes:
    """Маленький помощник, чтобы собирать «рецепт» материала короткими строчками."""

    def __init__(self, tree):
        self.t = tree

    def new(self, kind, **props):
        node = self.t.nodes.new(kind)
        for k, v in props.items():
            setattr(node, k, v)
        return node

    def put(self, socket, value):
        if isinstance(value, bpy.types.NodeSocket):
            self.t.links.new(value, socket)
        else:
            socket.default_value = value

    def m(self, op, a, b=None, c=None, clamp=False):
        node = self.new('ShaderNodeMath', operation=op, use_clamp=clamp)
        for i, v in enumerate((a, b, c)):
            if v is not None:
                self.put(node.inputs[i], v)
        return node.outputs[0]

    def smooth(self, value, lo, hi):
        node = self.new('ShaderNodeMapRange', interpolation_type='SMOOTHSTEP')
        for i, v in enumerate((value, lo, hi, 0.0, 1.0)):
            self.put(node.inputs[i], v)
        return node.outputs[0]

    def mix_color(self, fac, a, b):
        node = self.new('ShaderNodeMix', data_type='RGBA', blend_type='MIX', clamp_factor=True)
        self.put(node.inputs[0], fac)
        self.put(node.inputs[6], a)
        self.put(node.inputs[7], b)
        return node.outputs[2]

    def mix(self, fac, a, b):
        node = self.new('ShaderNodeMix', data_type='FLOAT', clamp_factor=True)
        self.put(node.inputs[0], fac)
        self.put(node.inputs[2], a)
        self.put(node.inputs[3], b)
        return node.outputs[0]

    def noise(self, vector, scale, detail=4.0, rough=0.55):
        node = self.new('ShaderNodeTexNoise')
        self.put(node.inputs['Vector'], vector)
        self.put(node.inputs['Scale'], scale)
        self.put(node.inputs['Detail'], detail)
        self.put(node.inputs['Roughness'], rough)
        return node.outputs[0]

    def image(self, img, vector, colorspace=None):
        node = self.new('ShaderNodeTexImage', image=img, extension='CLIP', interpolation='Cubic')
        if colorspace:
            img.colorspace_settings.name = colorspace
        self.put(node.inputs['Vector'], vector)
        return node.outputs[0]

    def bump(self, height, strength, distance, normal=None):
        node = self.new('ShaderNodeBump')
        self.put(node.inputs['Height'], height)
        self.put(node.inputs['Strength'], strength)
        self.put(node.inputs['Distance'], distance)
        if normal is not None:
            self.put(node.inputs['Normal'], normal)
        return node.outputs[0]


def rgb(v):
    return (v[0], v[1], v[2], 1.0)


def build_material(logo, scratches):
    mat = bpy.data.materials.new('PuckRubber')
    try:
        mat.use_nodes = True
    except Exception:
        pass
    tree = mat.node_tree
    tree.nodes.clear()
    n = Nodes(tree)

    out = n.new('ShaderNodeOutputMaterial')
    bsdf = n.new('ShaderNodeBsdfPrincipled')
    clear = n.new('ShaderNodeBsdfTransparent')
    surface = n.new('ShaderNodeMixShader')                     # прозрачно ↔ резина (см. «покрытие» ниже)
    tree.links.new(clear.outputs[0], surface.inputs[1])
    tree.links.new(bsdf.outputs[0], surface.inputs[2])
    tree.links.new(surface.outputs[0], out.inputs['Surface'])

    pos = n.new('ShaderNodeTexCoord').outputs['Object']
    sep = n.new('ShaderNodeSeparateXYZ')
    tree.links.new(pos, sep.inputs[0])
    x, y, z = sep.outputs[0], sep.outputs[1], sep.outputs[2]
    radius = n.m('SQRT', n.m('ADD', n.m('MULTIPLY', x, x), n.m('MULTIPLY', y, y)))
    abs_z = n.m('ABSOLUTE', z)
    theta = n.m('ARCTAN2', y, x)

    top = H / 2
    on_top = n.m('GREATER_THAN', z, top - 0.002)             # 1 только на верхней плоской грани

    # Два «выключателя» (их переключает set_mode перед каждым рендером):
    #   PUCK_MARKS — рисовать ли логотип и царапины; PUCK_SOLID — видна ли сама резина.
    sw_marks = n.new('ShaderNodeValue', name='PUCK_MARKS')
    sw_solid = n.new('ShaderNodeValue', name='PUCK_SOLID')
    sw_marks.outputs[0].default_value = sw_solid.outputs[0].default_value = 1.0
    on_top = n.m('MULTIPLY', on_top, sw_marks.outputs[0])

    # --- зоны ---
    # кромка (скругление и чуть вокруг него) — там резина стирается сильнее всего
    edge = n.m('MULTIPLY',
               n.smooth(radius, R - BEVEL * 2.2, R - BEVEL * 0.6),
               n.smooth(abs_z, top - BEVEL * 2.2, top - BEVEL * 0.6))
    # полоса рифления на бортике (у самых кромок — гладкие полоски, как у настоящей шайбы)
    band_edge = top - BEVEL - 0.028
    band = n.m('SUBTRACT', 1.0, n.smooth(abs_z, band_edge - 0.022, band_edge))

    # --- рифление «в ромбик»: две встречные спирали канавок ---
    u = n.m('MULTIPLY', theta, KNURL_COUNT / math.tau)
    v = n.m('MULTIPLY', z, KNURL_COUNT / (math.tau * R) * 0.82)
    g1 = n.m('MULTIPLY', n.m('PINGPONG', n.m('ADD', u, v), 0.5), 2.0)
    g2 = n.m('MULTIPLY', n.m('PINGPONG', n.m('SUBTRACT', u, v), 0.5), 2.0)
    knurl = n.smooth(n.m('MINIMUM', g1, g2), 0.06, 0.5)       # 0 — дно канавки, 1 — верх ромбика
    relief = n.m('SUBTRACT', 1.0, n.m('MULTIPLY', band, n.m('SUBTRACT', 1.0, knurl)))
    disp = n.new('ShaderNodeDisplacement')
    n.put(disp.inputs['Height'], relief)
    n.put(disp.inputs['Midlevel'], 1.0)
    n.put(disp.inputs['Scale'], KNURL_DEPTH)
    tree.links.new(disp.outputs[0], out.inputs['Displacement'])

    # --- шум: неровности резины, потёртости, сколы ---
    grain = n.noise(pos, 340.0, 3.0, 0.6)
    wear_n = n.noise(pos, 8.0, 7.0, 0.65)
    chip_n = n.noise(pos, 46.0, 2.0, 0.5)
    # Потёртости тоже выключаются вместе с PUCK_MARKS: в картинке корпуса их быть не должно,
    # иначе при вращении они «стояли бы на месте» и выдавали, что корпус не крутится.
    worn = sw_marks.outputs[0]
    # «Облака» — крупные пятна, где резина чуть светлее/темнее и глаже/шершавее. В картинке
    # корпуса их тоже быть не должно: на сайте корпус не вращается, и пятна (светлое слева
    # вверху, тёмное справа) ехали вместе с шайбой, но не крутились — владелец заметил
    # «какую-то тень». Поэтому в корпусе резина ровная (0.5 — среднее значение шума).
    cloud = n.mix(worn, 0.5, n.noise(pos, 2.6, 5.0, 0.6))
    edge_wear = n.m('MULTIPLY', n.m('MULTIPLY', edge, n.smooth(wear_n, 0.42, 0.68)), worn)
    chips = n.m('MULTIPLY', n.m('MULTIPLY', edge, n.smooth(chip_n, 0.71, 0.76)), worn)
    side_wear = n.m('MULTIPLY', n.m('MULTIPLY', n.m('MULTIPLY', band, knurl), n.smooth(wear_n, 0.4, 0.72)), worn)

    # --- царапины на верхней грани ---
    uv_s = n.new('ShaderNodeCombineXYZ')
    n.put(uv_s.inputs[0], n.m('ADD', n.m('MULTIPLY', x, 0.5 / R), 0.5))
    n.put(uv_s.inputs[1], n.m('ADD', n.m('MULTIPLY', y, 0.5 / R), 0.5))
    scratch = n.m('MULTIPLY', n.image(scratches, uv_s.outputs[0], 'Non-Color'), on_top)

    # --- логотип: краска на резине ---
    k = 0.5 / (R * LOGO_SCALE)
    uv_l = n.new('ShaderNodeCombineXYZ')
    n.put(uv_l.inputs[0], n.m('ADD', n.m('MULTIPLY', x, k), 0.5))
    n.put(uv_l.inputs[1], n.m('ADD', n.m('MULTIPLY', y, k), 0.5))
    logo_rgb = n.image(logo, uv_l.outputs[0])
    bw = n.new('ShaderNodeRGBToBW')
    tree.links.new(logo_rgb, bw.inputs[0])
    ink = n.m('MULTIPLY', n.smooth(bw.outputs[0], 0.035, 0.26), on_top)
    # царапины сдирают краску; плюс лёгкая общая потёртость печати
    ink = n.m('MULTIPLY', ink, n.m('SUBTRACT', 1.0, n.m('MULTIPLY', scratch, 1.5, clamp=True)))
    ink = n.m('MULTIPLY', ink, n.m('SUBTRACT', 1.0,
                                   n.m('MULTIPLY', n.smooth(n.noise(pos, 120.0, 2.0), 0.62, 0.8), 0.35)))

    # --- цвет ---
    col = n.mix_color(cloud, rgb((0.014, 0.014, 0.016)), rgb((0.024, 0.024, 0.027)))
    col = n.mix_color(n.m('MULTIPLY', edge_wear, 0.55), col, rgb((0.075, 0.078, 0.085)))
    col = n.mix_color(n.m('MULTIPLY', side_wear, 0.45), col, rgb((0.07, 0.073, 0.08)))
    col = n.mix_color(chips, col, rgb((0.06, 0.062, 0.068)))
    col = n.mix_color(n.m('MULTIPLY', scratch, 0.9, clamp=True), col, rgb((0.10, 0.104, 0.112)))
    col = n.mix_color(ink, col, logo_rgb)
    n.put(bsdf.inputs['Base Color'], col)

    # --- шероховатость (резина матовая, краска чуть глаже, царапины — шершавые) ---
    rough = n.m('ADD', 0.44, n.m('MULTIPLY', n.m('SUBTRACT', cloud, 0.5), 0.16))
    rough = n.mix(edge_wear, rough, 0.72)
    rough = n.mix(side_wear, rough, 0.66)
    rough = n.mix(n.m('MULTIPLY', scratch, 1.2, clamp=True), rough, 0.8)
    rough = n.mix(n.m('MULTIPLY', ink, 0.8), rough, 0.36)
    n.put(bsdf.inputs['Roughness'], rough)

    # --- собственное свечение логотипа (чтобы синий оставался ярким, как в фирменном стиле) ---
    n.put(bsdf.inputs['Emission Color'], logo_rgb)
    n.put(bsdf.inputs['Emission Strength'], n.m('MULTIPLY', ink, LOGO_GLOW))

    # --- мелкий рельеф: зерно резины, толщина краски, царапины, сколы ---
    nrm = n.bump(cloud, 0.06, 0.02)
    nrm = n.bump(grain, 0.10, 0.002, nrm)
    relief_small = n.m('SUBTRACT', n.m('MULTIPLY', ink, 0.22),
                       n.m('ADD', scratch, n.m('MULTIPLY', chips, 0.9)))
    nrm = n.bump(relief_small, 0.55, 0.004, nrm)
    n.put(bsdf.inputs['Normal'], nrm)

    # --- покрытие: для картинки «только логотип и царапины» резина становится прозрачной ---
    cover = n.m('MAXIMUM', n.smooth(ink, 0.0, 0.2), n.smooth(scratch, 0.0, 0.12))
    # ...плюс потёртости у края грани — но ТОЛЬКО на плоской части. На самом скруглении свет
    # сильно меняется по кругу (где-то яркий отсвет, где-то тень), и потёртость, «сфотографированная»
    # в тени, при повороте приехала бы на светлое место тёмным пятном.
    top_edge = n.m('MULTIPLY', n.m('ADD', n.m('MULTIPLY', edge_wear, 0.9), chips, clamp=True), on_top)
    cover = n.m('MAXIMUM', cover, n.smooth(top_edge, 0.0, 0.35))
    n.put(surface.inputs[0], n.m('MAXIMUM', sw_solid.outputs[0], cover))

    for attr_owner in (mat, getattr(mat, 'cycles', None)):
        try:
            attr_owner.displacement_method = 'BOTH'            # настоящий рельеф + мелкие детали
            break
        except Exception:
            pass
    return mat


# ───────────────────────────── сцена ─────────────────────────────
def add_light(scene, name, loc, power, color, size, size_y=None, target=(0, 0, 0)):
    light = bpy.data.lights.new(name, 'AREA')
    light.energy = power
    light.color = color
    light.shape = 'RECTANGLE' if size_y else 'SQUARE'
    light.size = size
    if size_y:
        light.size_y = size_y
    ob = bpy.data.objects.new(name, light)
    scene.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return ob


def build_lights(scene):
    ice = (0.50, 0.83, 1.0)        # ледяной голубой
    blue = (0.05, 0.36, 1.0)       # фирменный синий
    # Контровые стоят на уровне грани и ниже: подсвечивают кромку, но не «засвечивают» верх.
    add_light(scene, 'Key', (-2.2, 2.6, 1.5), 150, (0.93, 0.96, 1.0), 2.2, 1.4)       # мягкий верхний
    add_light(scene, 'RimBlue', (4.2, 3.6, 0.15), 1300, blue, 3.0, 1.2)                # синий контровой
    add_light(scene, 'RimBack', (-0.6, 5.2, 0.2), 600, (0.22, 0.58, 1.0), 3.4, 0.9)             # обводит дальний край
    add_light(scene, 'RimIce', (-4.4, 2.2, 0.1), 380, ice, 2.4, 1.0)                 # голубой контровой
    add_light(scene, 'FrontLeft', (-3.6, -4.2, 0.4), 420, (0.9, 0.95, 1.0), 1.6, 3.2)  # скользящий по бортику
    add_light(scene, 'FrontRight', (3.8, -4.0, 0.2), 260, ice, 1.2, 3.0)
    add_light(scene, 'IceBounce', (0.0, -3.2, -2.6), 340, ice, 5.0, 3.0)             # отсвет ото льда снизу


def build_world(scene):
    world = bpy.data.worlds.new('PuckWorld')
    try:
        world.use_nodes = True
    except Exception:
        pass
    scene.world = world
    bg = next((nd for nd in world.node_tree.nodes if nd.type == 'BACKGROUND'), None)
    if bg:
        bg.inputs[0].default_value = (0.012, 0.02, 0.035, 1.0)
        bg.inputs[1].default_value = 1.0


def build_camera(scene):
    """Главная камера: смотрит на шайбу под наклоном TILT, без перспективных искажений."""
    cam_data = bpy.data.cameras.new('PuckCamera')
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = 2.4
    cam = bpy.data.objects.new('PuckCamera', cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    a = math.radians(TILT)
    direction = Vector((0.0, -math.sin(a), math.cos(a)))
    cam.rotation_euler = (-direction).to_track_quat('-Z', 'Y').to_euler()
    cam.location = direction * 8.0

    # подгоняем масштаб и сдвиг кадра так, чтобы шайба занимала весь квадрат
    top, flat, side = H / 2, R - BEVEL, H / 2 - BEVEL
    pts = [Vector((r * math.cos(t), r * math.sin(t), zz))
           for r, zz in ((flat, top), (R, side), (R, -side), (flat, -top))
           for t in np.linspace(0, math.tau, 180, endpoint=False)]
    for _ in range(8):
        bpy.context.view_layer.update()
        pr = [world_to_camera_view(scene, cam, p) for p in pts]
        xs, ys = [p.x for p in pr], [p.y for p in pr]
        cam_data.shift_x += (max(xs) + min(xs)) / 2 - 0.5
        cam_data.shift_y += (max(ys) + min(ys)) / 2 - 0.5
        cam_data.ortho_scale *= max(max(xs) - min(xs), max(ys) - min(ys)) / (1 - 2 * MARGIN)
    return cam


def build_face_camera(scene):
    """Вторая камера — для картинки с логотипом и царапинами.

    Смотрит под тем же углом, что и главная (чтобы свет на царапинах лёг так же), но в кадре
    ровно верхняя грань. Под наклоном круг выглядит овалом; при рендере мы «растягиваем»
    пиксели (см. render_one), и в файле получается ровный круг. На сайте его снова
    сжимают в овал (--face-squash) — и он точно ложится на корпус.
    """
    cam_data = bpy.data.cameras.new('PuckFaceCamera')
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = 2 * R
    cam = bpy.data.objects.new('PuckFaceCamera', cam_data)
    scene.collection.objects.link(cam)
    a = math.radians(TILT)
    direction = Vector((0.0, -math.sin(a), math.cos(a)))
    cam.rotation_euler = (-direction).to_track_quat('-Z', 'Y').to_euler()
    cam.location = Vector((0.0, 0.0, H / 2)) + direction * 8.0
    return cam


def face_geometry(scene):
    """Где на картинке корпуса лежит верхняя грань — эти числа нужны в style.css."""
    cam = bpy.data.objects['PuckCamera']
    bpy.context.view_layer.update()
    c = world_to_camera_view(scene, cam, Vector((0.0, 0.0, H / 2)))
    half = R / cam.data.ortho_scale
    return {'--face-left': f'{(c.x - half) * 100:.2f}%',
            '--face-top': f'{(1 - c.y - half) * 100:.2f}%',
            '--face-size': f'{2 * half * 100:.2f}%',
            '--face-squash': f'{math.cos(math.radians(TILT)):.4f}'}


def setup_render(scene):
    r = scene.render
    try:
        r.engine = 'CYCLES'
    except TypeError as e:
        print('Cycles недоступен:', e)
    r.resolution_x = r.resolution_y = SIZE
    r.resolution_percentage = 100
    r.film_transparent = True
    r.filepath = OUT_BODY
    r.image_settings.file_format = 'WEBP'
    r.image_settings.color_mode = 'RGBA'
    r.image_settings.color_depth = '8'
    r.image_settings.quality = WEBP_QUALITY
    try:
        scene.view_settings.view_transform = 'Standard'
        scene.view_settings.look = 'None'
    except TypeError:
        pass
    cy = scene.cycles
    cy.samples = SAMPLES
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.008
    cy.use_denoising = True
    cy.max_bounces = 6
    cy.transparent_max_bounces = 128     # иначе на картинке с логотипом по краям остаются чёрные полоски
    try:   # видеокарта — только если она уже включена в настройках Blender
        prefs = bpy.context.preferences.addons['cycles'].preferences
        cy.device = 'GPU' if prefs.compute_device_type != 'NONE' else 'CPU'
    except Exception:
        cy.device = 'CPU'


def show_in_viewport():
    """Показываем шайбу в окне Blender глазами камеры (чтобы было видно, что получилось)."""
    try:
        for window in bpy.context.window_manager.windows:
            for area in window.screen.areas:
                if area.type == 'VIEW_3D':
                    space = area.spaces.active
                    space.region_3d.view_perspective = 'CAMERA'
                    space.shading.type = 'RENDERED'
                    space.overlay.show_overlays = False
    except Exception as e:
        print('Не удалось переключить окно просмотра:', e)


def build_scene():
    scene = bpy.context.scene
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    for img in list(bpy.data.images):
        if img.name.startswith('puck_'):
            bpy.data.images.remove(img)

    logo = bpy.data.images.load(LOGO_PATH)
    logo.name = 'puck_logo'
    mesh = build_mesh()
    mesh.materials.append(build_material(logo, make_scratch_map()))
    puck = bpy.data.objects.new('Puck', mesh)
    scene.collection.objects.link(puck)

    setup_render(scene)            # сначала размер кадра — по нему подгоняется камера
    build_lights(scene)
    build_world(scene)
    build_face_camera(scene)
    build_camera(scene)
    show_in_viewport()
    return scene


def set_mode(mode):
    """'full' — целая шайба, 'body' — чистый корпус (без логотипа, царапин, потёртостей и пятен),
    'face' — только логотип, царапины и потёртая кромка."""
    nodes = bpy.data.objects['Puck'].data.materials[0].node_tree.nodes
    nodes['PUCK_MARKS'].outputs[0].default_value = 0.0 if mode == 'body' else 1.0
    nodes['PUCK_SOLID'].outputs[0].default_value = 0.0 if mode == 'face' else 1.0


def render_one(mode, camera, path):
    scene = bpy.context.scene
    set_mode(mode)
    scene.camera = bpy.data.objects[camera]
    scene.render.filepath = path
    # для грани: «растянутые» пиксели превращают овал обратно в круг
    scene.render.pixel_aspect_x = 1 / math.cos(math.radians(TILT)) if mode == 'face' else 1.0
    bpy.ops.render.render(write_still=True)
    scene.render.pixel_aspect_x = 1.0
    print('Готово:', path, round(os.path.getsize(path) / 1024), 'КБ')


def save_face(raw_png):
    """Сохраняет картинку грани в WebP, округлив прозрачность до 16 ступеней.
    На глаз разницы нет, а файл получается почти вдвое легче."""
    img = bpy.data.images.load(raw_png)
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(-1, 4)
    alpha = px[:, 3]
    rounded = np.round(alpha * 255 / 16) * 16 / 255
    rounded[alpha < 10 / 255] = 0
    px[:, 3] = np.clip(rounded, 0, 1)
    img.pixels.foreach_set(px.ravel())
    img.update()
    img.save_render(OUT_FACE, scene=bpy.context.scene)
    bpy.data.images.remove(img)
    print('Готово:', OUT_FACE, round(os.path.getsize(OUT_FACE) / 1024), 'КБ')


def render():
    scene = bpy.context.scene
    raw = os.path.join(bpy.app.tempdir, 'puck_face_raw.png')
    scene.render.image_settings.file_format = 'PNG'       # грань сначала без потерь...
    render_one('face', 'PuckFaceCamera', raw)
    scene.render.image_settings.file_format = 'WEBP'
    save_face(raw)                                        # ...потом облегчаем и сохраняем
    render_one('body', 'PuckCamera', OUT_BODY)
    make_side_marks()
    set_mode('full')                                # в окне Blender остаётся целая шайба
    print('Числа для style.css (блок .puck-zone):')
    for name, value in face_geometry(scene).items():
        print(f'  {name}: {value};')


if __name__ == '__main__':
    build_scene()
    # даём окну Blender появиться, потом рендерим и сохраняем обе картинки
    bpy.app.timers.register(lambda: render(), first_interval=1.5)
