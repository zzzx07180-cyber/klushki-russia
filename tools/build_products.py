"""
Собирает data/products.js (его читает сайт) из файлов товаров data/products/*.json.

Файлы товаров создаёт и меняет АДМИНКА (сайт/admin/): один товар = один файл,
имя файла = номер товара на сайте (product.html?id=…).

Как пользоваться (в терминале, в папке проекта):
    py tools/build_products.py
Локальный предпросмотр (tools/serve.ps1) запускает эту сборку сам при старте.
На GitHub она запускается при каждой публикации (.github/workflows/publish.yml) с ключом
--stamp: тогда скрипт ещё ставит у data/products.js во всех HTML метку ?v=<отпечаток>,
чтобы iPhone и Telegram не показывали старый список товаров из кэша.

Здесь же — правила, которые наводят порядок, что бы ни ввели в админке:
  • у не-клюшек выбрасываются «клюшечные» поля (тип, ремонт, хват, загиб…);
  • место перелома — только у восстановленных клюшек;
  • загиб «92» → «P92», длина пера «26» → «26″», пустая цена → «Цена по запросу».
Сломанный файл товара не роняет сборку: товар пропускается, в консоли — предупреждение.

Использует только стандартную библиотеку Python — ничего устанавливать не нужно.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "products"
OUT = ROOT / "data" / "products.js"

# Должно совпадать с CATEGORIES / TYPES / REPAIRS в shop.js
CATEGORIES = {"sticks", "skates", "elbows", "gloves", "helmets"}
TYPES = {"original", "restored"}
REPAIRS = {"blade", "shaft"}
HANDS = {"Левый", "Правый"}


def text(v):
    """Строка без лишних пробелов; всё «пустое» → ''."""
    if v is None or isinstance(v, (dict, list)):
        return ""
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return str(v).strip()


def whole(v):
    """Целое число > 0 или None: 4500, '4500', '4 500' → 4500; '', '???' → None"""
    if isinstance(v, bool):
        return None
    try:
        n = float(text(v).replace(" ", "").replace(",", "."))
    except ValueError:
        return None
    return int(n) if n > 0 else None


def product(path):
    """Файл товара из админки → товар в том виде, в каком его ждёт сайт (как раньше из таблицы)."""
    d = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(d, dict):
        raise ValueError("внутри не товар")
    category = text(d.get("category"))
    brand = text(d.get("brand"))
    if category not in CATEGORIES:
        raise ValueError(f"неизвестный раздел «{category}»")
    if not brand:
        raise ValueError("не указан бренд")

    stem = path.stem
    p = {"id": int(stem) if stem.isdigit() else stem}
    if text(d.get("sku")):
        p["sku"] = text(d.get("sku"))
    p["category"] = category

    specs = {}
    stick = d.get("stick") if isinstance(d.get("stick"), dict) else {}
    if category == "sticks":
        if text(stick.get("type")) in TYPES:
            p["type"] = text(stick.get("type"))
        curve = text(stick.get("curve")).upper().replace(" ", "")
        if curve:
            specs["curve"] = "P" + curve if curve.isdigit() else curve
        if whole(stick.get("flex")):
            specs["flex"] = whole(stick.get("flex"))
        if text(stick.get("hand")) in HANDS:
            specs["hand"] = text(stick.get("hand"))
        if stick.get("goalie") is True:
            specs["goalie"] = True
            paddle = re.sub(r"[\"″”'\s]", "", text(stick.get("paddle")))
            if paddle:
                specs["paddle"] = paddle + "″"
    if text(d.get("size")):
        specs["size"] = text(d.get("size"))

    p["brand"] = brand
    p["name"] = text(d.get("name"))
    p["specs"] = specs
    p["price"] = whole(d.get("price"))                       # None → «Цена по запросу»
    p["inStock"] = d.get("inStock") is not False             # не указано → «в наличии»
    photos = d.get("photos") if isinstance(d.get("photos"), list) else []
    p["photos"] = [text(x) for x in photos if text(x)]
    if p.get("type") == "restored":
        p["repair"] = text(stick.get("repair")) if text(stick.get("repair")) in REPAIRS else "shaft"
        if text(stick.get("repairNote")):
            p["repairNote"] = text(stick.get("repairNote"))
    if text(d.get("description")):
        p["description"] = text(d.get("description"))
    return p


NEW_ID = 10**12   # номера товаров из админки — дата и время создания: 20261117153045


def order(p):
    """Порядок в каталоге («Сначала новые»): сперва добавленные в админке — самые свежие сверху,
    потом перенесённые из таблицы (номера 1001…, 3001…) — в прежнем порядке."""
    pid = p["id"]
    if not isinstance(pid, int):
        return (2, 0, pid)
    return (0, -pid, "") if pid >= NEW_ID else (1, pid, "")


def stamp(js):
    """Метка ?v=<отпечаток содержимого> у data/products.js во всех HTML-страницах."""
    version = hashlib.sha1(js.encode("utf-8")).hexdigest()[:10]
    pattern = re.compile(r'(src="data/products\.js)(\?v=[^"]*)?(")')
    for page in sorted(ROOT.glob("*.html")):
        old = page.read_text(encoding="utf-8")
        new = pattern.sub(lambda m: f"{m.group(1)}?v={version}{m.group(3)}", old)
        if new != old:
            page.write_text(new, encoding="utf-8", newline="")
    print(f"  метка data/products.js в HTML: ?v={version}")


def main():
    sys.stdout.reconfigure(encoding="utf-8")      # чтобы русский текст в консоли Windows не «ломался»
    products, problems = [], []
    for path in sorted(SRC.glob("*.json")):
        try:
            products.append(product(path))
        except Exception as e:                    # noqa: BLE001 — один плохой товар не должен ломать сайт
            problems.append(f"{path.name}: {e}")
    products.sort(key=order)

    header = (
        "// ===== Список товаров =====\n"
        "// ⚠️ ФАЙЛ СОЗДАН АВТОМАТИЧЕСКИ программой tools/build_products.py из файлов data/products/*.json,\n"
        "// которые меняет админка (сайт/admin/). Правь товары в админке — ручные правки здесь пропадут.\n"
        "//\n"
        "// Поля: id — номер на сайте; sku — твой номер товара; category — раздел;\n"
        "// type — original/restored; repair — blade (перо) / shaft (труба); repairNote — о ремонте;\n"
        "// specs — curve (загиб), flex (жёсткость), hand (хват), goalie (вратарская), paddle (длина пера),\n"
        "// size (размер); price — цена (null = по запросу); inStock — в наличии; photos — список фото;\n"
        "// description — описание.\n\n"
    )
    js = header + "window.PRODUCTS = " + json.dumps(products, ensure_ascii=False, indent=2) + ";\n"
    OUT.write_text(js, encoding="utf-8", newline="\n")
    print(f"Готово: {OUT} — товаров: {len(products)}")
    for line in problems:
        print(f"  ⚠️ пропущен {line}")
    if "--stamp" in sys.argv:
        stamp(js)


if __name__ == "__main__":
    main()
