"""
Обновляет «метку версии» у стилей и скриптов во всех HTML-страницах:
    style.css → style.css?v=20261111-1530
Зачем: браузеры (особенно Safari на iPhone и встроенный браузер Telegram) запоминают
старые файлы. Новая метка заставляет их скачать свежую версию.

Запускать перед каждой отправкой сайта на GitHub:
    py tools/bump_version.py
"""
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
version = datetime.now().strftime("%Y%m%d-%H%M")

# href="style.css" / src="data/products.js" / src="images/puck.png" (с меткой ?v=… или без) —
# только наши локальные файлы
pattern = re.compile(r'((?:href|src)=")((?!https?:)[^"?]+\.(?:css|js|png|jpg|jpeg|webp|svg))(\?v=[^"]*)?(")')

sys.stdout.reconfigure(encoding="utf-8")
for page in sorted(ROOT.glob("*.html")):
    text = page.read_text(encoding="utf-8")
    new, count = pattern.subn(lambda m: f"{m.group(1)}{m.group(2)}?v={version}{m.group(4)}", text)
    if new != text:
        page.write_text(new, encoding="utf-8", newline="")
    print(f"{page.name}: обновлено ссылок — {count}")
print(f"Метка версии: {version}")
