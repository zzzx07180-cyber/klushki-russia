"""
Импорт товаров из Excel-таблицы в data/products.js

Как пользоваться (в терминале, в папке проекта):
    py tools/import_table.py "C:\\Users\\K4K-PC\\Downloads\\Новая таблица.xlsx"

⚠️ Файл data/products.js будет ПЕРЕЗАПИСАН целиком — правь товары в таблице, а не в нём.

Ожидаемый вид таблицы (первый лист, заголовки в 1-й строке):
  Столбцы A–H — ВОССТАНОВЛЕННЫЕ клюшки: №, Бренд, Модель, Хват, Загиб, Жесткость, Цена, Пометки
  Столбцы L–S — РЕПЛИКИ:                  №, Бренд, Модель, Хват, Загиб, Жесткость, Цена, Пометки
  Столбцы U–X — ПРОЧЕЕ:                   №, Бренд + что это (напр. «Bauer Краги»), Размер, Цена

Правила разбора:
  Хват:      L → Левый, R → Правый
  Загиб:     29 → P29, 92 → P92; «-» или пусто — не указан
  Цена:      число; «???» или пусто — «цена по запросу»
  Пометки:   «Перо» → место перелома «перо»; без пометки → «труба» (так договорились с владельцем)
             «ВР» → вратарская клюшка; 26" / 25" → длина пера вратарской
  Прочее:    «Краги» → раздел «Краги», «Локти» → «Налокотники»

Использует только стандартную библиотеку Python — ничего устанавливать не нужно.
"""
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
OUT = Path(__file__).resolve().parent.parent / "data" / "products.js"

# Расшифровка сокращённых цветов в названиях моделей: FlyLite(оранж) → FlyLite (оранжевая)
COLORS = {
    "фиол": "фиолетовая", "оранж": "оранжевая", "бел": "белая", "черн": "чёрная",
    "сер": "серая", "зел": "зелёная", "красн": "красная", "желт": "жёлтая",
}


def read_sheet(path):
    """Возвращает {(строка, 'A'): значение} для первого листа."""
    with zipfile.ZipFile(path) as z:
        strings = []
        if "xl/sharedStrings.xml" in z.namelist():
            root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in root.findall("m:si", NS):
                strings.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))
        sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
    cells = {}
    for row in sheet.find("m:sheetData", NS).findall("m:row", NS):
        for c in row.findall("m:c", NS):
            col, num = re.match(r"([A-Z]+)(\d+)", c.get("r")).groups()
            v = c.find("m:v", NS)
            if c.get("t") == "s" and v is not None:
                val = strings[int(v.text)]
            elif c.get("t") == "inlineStr":
                val = "".join(t.text or "" for t in c.iter("{%s}t" % NS["m"]))
            else:
                val = v.text if v is not None else None
            if val is not None and str(val).strip() != "":
                cells[(int(num), col)] = str(val).strip()
    return cells


def num(v):
    """'4500.0' → 4500; '-', '???', None → None"""
    try:
        f = float(str(v).replace(",", "."))
        return int(f) if f.is_integer() else f
    except (TypeError, ValueError):
        return None


def tidy_model(name):
    """Чистим название: пробел перед скобкой, расшифровка цветов, лишние символы."""
    if not name:
        return ""
    name = re.sub(r"\)\s*[а-яё]\s*$", ")", name.strip())          # «(черн)э» → «(черн)»
    name = re.sub(r"\s*\(\s*", " (", name)
    def color(m):
        word = m.group(1).strip().lower()
        return "(" + COLORS.get(word, m.group(1).strip()) + ")"
    return re.sub(r"\(([^)]*)\)", color, name)


def hand(v):
    return {"L": "Левый", "R": "Правый"}.get((v or "").upper())


def curve(v):
    n = num(v)
    return f"P{n}" if n is not None else None


def stick(cells, r, cols, kind, next_id):
    c_num, c_brand, c_model, c_hand, c_curve, c_flex, c_price, c_note = cols
    brand = cells.get((r, c_brand))
    if not brand:
        return None
    note = cells.get((r, c_note), "")
    specs = {}
    if curve(cells.get((r, c_curve))):
        specs["curve"] = curve(cells.get((r, c_curve)))
    if num(cells.get((r, c_flex))) is not None:
        specs["flex"] = num(cells.get((r, c_flex)))
    if hand(cells.get((r, c_hand))):
        specs["hand"] = hand(cells.get((r, c_hand)))
    if "ВР" in note.upper():
        specs["goalie"] = True
        paddle = re.search(r'(\d+)\s*["″”]', note)
        if paddle:
            specs["paddle"] = paddle.group(1) + "″"
    p = {
        "id": next_id,
        "sku": str(num(cells.get((r, c_num))) or cells.get((r, c_num)) or ""),
        "category": "sticks",
        "type": kind,
        "brand": brand,
        "name": tidy_model(cells.get((r, c_model))),
        "specs": specs,
        "price": num(cells.get((r, c_price))),
        "inStock": True,
        "photos": [],
    }
    if kind == "restored":
        p["repair"] = "blade" if "перо" in note.lower() else "shaft"
    return p


def other(cells, r, next_id):
    title = cells.get((r, "V"))
    if not title:
        return None
    low = title.lower()
    if "краг" in low:
        category, word = "gloves", "краги"
    elif "локт" in low or "налокот" in low:
        category, word = "elbows", "локти"
    else:
        category, word = "elbows", ""
    # «CCM xf80 Краги» → бренд CCM, модель XF80; «Bauer Краги» → бренд Bauer, модель «»
    parts = title.split()
    brand = parts[0]
    model = " ".join(w for w in parts[1:] if word not in w.lower())
    size = cells.get((r, "W"))
    return {
        "id": next_id,
        "sku": str(num(cells.get((r, "U"))) or ""),
        "category": category,
        "brand": brand,
        "name": model.upper() if re.fullmatch(r"[a-z]+\d+", model, re.I) else model,
        "specs": {"size": str(num(size) if num(size) is not None else size)} if size else {},
        "price": num(cells.get((r, "X"))),
        "inStock": True,
        "photos": [],
    }


def main():
    sys.stdout.reconfigure(encoding="utf-8")      # чтобы русский текст в консоли Windows не «ломался»
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    cells = read_sheet(sys.argv[1])
    last = max(r for r, _ in cells)
    restored, replicas, others = [], [], []
    for r in range(2, last + 1):
        p = stick(cells, r, ("A", "B", "C", "D", "E", "F", "G", "H"), "restored", 1001 + len(restored))
        if p: restored.append(p)
        p = stick(cells, r, ("L", "M", "N", "O", "P", "Q", "R", "S"), "replica", 2001 + len(replicas))
        if p: replicas.append(p)
        p = other(cells, r, 3001 + len(others))
        if p: others.append(p)

    products = restored + replicas + others
    header = (
        "// ===== Список товаров =====\n"
        "// ⚠️ ФАЙЛ СОЗДАН АВТОМАТИЧЕСКИ из Excel-таблицы программой tools/import_table.py.\n"
        "// Правь товары в таблице и запускай импорт заново — ручные правки здесь пропадут.\n"
        "//   py tools/import_table.py \"путь\\к\\таблице.xlsx\"\n"
        "//\n"
        "// Поля: id — номер на сайте; sku — номер из твоей таблицы; category — раздел;\n"
        "// type — original/replica/restored; repair — blade (перо) / shaft (труба);\n"
        "// specs — curve (загиб), flex (жёсткость), hand (хват), goalie (вратарская), paddle (длина пера),\n"
        "// size (размер); price — цена (null = по запросу); inStock — в наличии; photos — список фото.\n\n"
    )
    body = "window.PRODUCTS = " + json.dumps(products, ensure_ascii=False, indent=2) + ";\n"
    OUT.write_text(header + body, encoding="utf-8")
    print(f"Готово: {OUT}")
    print(f"  восстановленные: {len(restored)}, реплики: {len(replicas)}, прочее: {len(others)}, всего: {len(products)}")
    no_price = [f"{p['brand']} {p['name']} (№{p['sku']})" for p in products if p["price"] is None]
    if no_price:
        print("  без цены (будет «по запросу»):", "; ".join(no_price))


if __name__ == "__main__":
    main()
