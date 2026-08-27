#!/usr/bin/env python3
"""
Инжектор SEO-метатегов для AresCraftX.

Добавляет в <head> каждой страницы:
  - <meta name="description">      (главный фактор для сниппета в поиске)
  - <meta name="keywords">
  - <link rel="canonical">          (устраняет дубли ru/en/index)
  - <link rel="alternate" hreflang> (связка ru <-> en + x-default)
  - <meta name="robots">            (noindex для служебных страниц)
  - twitter:card / og:locale, если их нет

Идемпотентен: повторный запуск не плодит дубликаты.
Запуск:  python3 tools/seo_inject.py
"""

import os
import re

SITE = "https://arescraftx.online"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

INDEX = True   # у страницы должен быть индекс
NOINDEX = False

# path -> (title, description, keywords, robots)
PAGES = {
    "index.html": (
        "AresCraftX — Minecraft сервер, лаунчер и античит",
        "AresCraftX — Minecraft-экосистема: игровой сервер play.arescraftx.online "
        "с уникальными режимами, собственный лаунчер AresLaunch, античит AresChecker "
        "и платформы для общения AresCord и AresGram.",
        "AresCraftX, майнкрафт сервер, minecraft server, лаунчер, античит, AresLaunch, AresChecker",
        INDEX,
    ),
    "ru/main/index.html": (
        "AresCraftX — О проекте | Minecraft экосистема",
        "AresCraftX — это не просто Minecraft-сервер, а целая экосистема: игровой сервер "
        "с авторскими режимами, лаунчер AresLaunch, античит AresChecker, мессенджеры "
        "AresCord и AresGram. Заходи на play.arescraftx.online.",
        "AresCraftX, майнкрафт сервер, minecraft сервер, играть в майнкрафт, лаунчер майнкрафт, античит",
        INDEX,
    ),
    "ru/main/server.html": (
        "Minecraft сервер AresCraftX — IP play.arescraftx.online",
        "Игровой сервер AresCraftX: IP play.arescraftx.online. Уникальные режимы, "
        "стабильный онлайн, защита от читеров собственным античитом AresChecker. "
        "Смотри онлайн игроков и версию сервера.",
        "minecraft сервер ip, майнкрафт сервер играть, play.arescraftx.online, режимы майнкрафт, онлайн сервера",
        INDEX,
    ),
    "ru/main/community.html": (
        "Сообщество AresCraftX — Discord, Telegram и правила",
        "Сообщество AresCraftX: где общаться с игроками, как подать заявку, "
        "правила поведения на сервере и в чатах, контакты администрации.",
        "AresCraftX сообщество, майнкрафт discord, правила сервера, telegram майнкрафт",
        INDEX,
    ),
    "ru/main/terms.html": (
        "Условия использования — AresCraftX",
        "Условия использования сервисов AresCraftX: правила игры на сервере, "
        "использование лаунчера и аккаунтов, ответственность сторон.",
        "AresCraftX условия использования, правила сервера, пользовательское соглашение",
        INDEX,
    ),
    "ru/main/privacy.html": (
        "Политика конфиденциальности — AresCraftX",
        "Политика конфиденциальности AresCraftX: какие данные мы собираем, "
        "как храним и защищаем их, как удалить свой аккаунт и данные.",
        "AresCraftX конфиденциальность, обработка данных, GDPR",
        INDEX,
    ),
    "ru/main/cookies.html": (
        "Cookie-политика — AresCraftX",
        "Как AresCraftX использует cookie и локальное хранилище браузера, "
        "какие из них обязательные, и как отключить необязательные.",
        "AresCraftX cookie, файлы cookie политика",
        INDEX,
    ),
    "ru/main/disclaimer.html": (
        "Отказ от ответственности — AresCraftX",
        "Отказ от ответственности AresCraftX. Проект не аффилирован с Mojang Studios "
        "и Microsoft. Minecraft — торговая марка Mojang Studios.",
        "AresCraftX disclaimer, отказ от ответственности, Mojang",
        INDEX,
    ),
    "ru/main/404.html": (
        "404 — Страница не найдена | AresCraftX",
        "Такой страницы на AresCraftX нет. Вернитесь на главную или перейдите в раздел сервера.",
        "",
        NOINDEX,
    ),
    "ru/main/offline.html": (
        "Нет подключения — AresCraftX",
        "Нет подключения к интернету. Проверьте сеть и обновите страницу.",
        "",
        NOINDEX,
    ),
    "ru/auth/auth.html": (
        "Вход и регистрация — AresCraftX",
        "Вход в аккаунт AresCraftX и регистрация нового игрока.",
        "",
        NOINDEX,
    ),
    "ru/admin/admin.html": (
        "Админ-панель — AresCraftX",
        "Служебная панель администрирования AresCraftX.",
        "",
        NOINDEX,
    ),
    "ru/projects/launchers/index.html": (
        "AresLaunch — лаунчер Minecraft от AresCraftX",
        "AresLaunch — бесплатный лаунчер Minecraft от AresCraftX: быстрый вход на сервер, "
        "автообновление клиента и модпаков, поддержка нескольких версий игры.",
        "AresLaunch, лаунчер майнкрафт, minecraft launcher скачать, лаунчер для сервера",
        INDEX,
    ),
    "ru/projects/checkers/index.html": (
        "AresChecker — античит для Minecraft от AresCraftX",
        "AresChecker — собственный античит AresCraftX: детект killaura, fly, speed и "
        "других читов, гибкая настройка и минимальная нагрузка на сервер.",
        "AresChecker, античит майнкрафт, minecraft anticheat, защита от читеров",
        INDEX,
    ),
    "ru/projects/arescord/index.html": (
        "AresCord — голосовой и текстовый чат AresCraftX",
        "AresCord — платформа для общения игроков AresCraftX: текстовые каналы, "
        "голосовые комнаты и интеграция с игровым сервером.",
        "AresCord, чат для игроков, голосовой чат майнкрафт",
        INDEX,
    ),
    "ru/projects/aresgram/index.html": (
        "AresGram — мессенджер экосистемы AresCraftX",
        "AresGram — лёгкий мессенджер AresCraftX для быстрого общения игроков сервера.",
        "AresGram, мессенджер AresCraftX, чат майнкрафт",
        INDEX,
    ),
    # ---------- EN ----------
    "en/main/index.html": (
        "AresCraftX — About the Project | Minecraft Ecosystem",
        "AresCraftX is more than a Minecraft server — it is an ecosystem: a game server "
        "with unique modes, the AresLaunch launcher, the AresChecker anti-cheat and the "
        "AresCord / AresGram chat platforms. Join at play.arescraftx.online.",
        "AresCraftX, minecraft server, minecraft launcher, anticheat, AresLaunch, AresChecker",
        INDEX,
    ),
    "en/main/server.html": (
        "AresCraftX Minecraft Server — IP play.arescraftx.online",
        "AresCraftX game server: IP play.arescraftx.online. Unique game modes, stable "
        "uptime and cheater protection powered by our own AresChecker anti-cheat.",
        "minecraft server ip, play minecraft online, play.arescraftx.online, minecraft game modes",
        INDEX,
    ),
    "en/main/community.html": (
        "AresCraftX Community — Discord, Telegram and Rules",
        "The AresCraftX community: where to chat with other players, how to apply, "
        "server and chat rules, and how to reach the staff team.",
        "AresCraftX community, minecraft discord, server rules",
        INDEX,
    ),
    "en/main/terms.html": (
        "Terms of Use — AresCraftX",
        "AresCraftX Terms of Use: server rules, launcher and account usage, "
        "and the responsibilities of each party.",
        "AresCraftX terms of use, server rules",
        INDEX,
    ),
    "en/main/privacy.html": (
        "Privacy Policy — AresCraftX",
        "AresCraftX Privacy Policy: what data we collect, how we store and protect it, "
        "and how to delete your account and data.",
        "AresCraftX privacy policy, data protection, GDPR",
        INDEX,
    ),
    "en/main/cookies.html": (
        "Cookie Policy — AresCraftX",
        "How AresCraftX uses cookies and browser local storage, which ones are "
        "strictly necessary, and how to opt out of the rest.",
        "AresCraftX cookies, cookie policy",
        INDEX,
    ),
    "en/main/disclaimer.html": (
        "Disclaimer — AresCraftX",
        "AresCraftX disclaimer. The project is not affiliated with Mojang Studios or "
        "Microsoft. Minecraft is a trademark of Mojang Studios.",
        "AresCraftX disclaimer, not affiliated with Mojang",
        INDEX,
    ),
    "en/main/404.html": (
        "404 — Page Not Found | AresCraftX",
        "This page does not exist on AresCraftX. Go back to the homepage or visit the server page.",
        "",
        NOINDEX,
    ),
    "en/main/offline.html": (
        "You Are Offline — AresCraftX",
        "No internet connection. Check your network and reload the page.",
        "",
        NOINDEX,
    ),
    "en/auth/auth.html": (
        "Login / Register — AresCraftX",
        "Log in to your AresCraftX account or register a new player profile.",
        "",
        NOINDEX,
    ),
    "en/admin/admin.html": (
        "Admin Panel — AresCraftX",
        "Internal AresCraftX administration panel.",
        "",
        NOINDEX,
    ),
    "en/projects/aresgram/index.html": (
        "AresGram — Messenger of the AresCraftX Ecosystem",
        "AresGram is a lightweight AresCraftX messenger for fast communication between server players.",
        "AresGram, AresCraftX messenger, minecraft chat",
        INDEX,
    ),
}

# ru <-> en соответствие для hreflang
ALT = {
    "ru/main/index.html": "en/main/index.html",
    "ru/main/server.html": "en/main/server.html",
    "ru/main/community.html": "en/main/community.html",
    "ru/main/terms.html": "en/main/terms.html",
    "ru/main/privacy.html": "en/main/privacy.html",
    "ru/main/cookies.html": "en/main/cookies.html",
    "ru/main/disclaimer.html": "en/main/disclaimer.html",
    "ru/projects/aresgram/index.html": "en/projects/aresgram/index.html",
}
ALT.update({v: k for k, v in ALT.items()})

MARK_START = "    <!-- SEO:auto-start (tools/seo_inject.py) -->"
MARK_END = "    <!-- SEO:auto-end -->"

BLOCK_RE = re.compile(
    re.escape(MARK_START) + r".*?" + re.escape(MARK_END) + r"\n?",
    re.DOTALL,
)
# теги, которые мы теперь генерируем сами — вычищаем старые ручные копии
STRIP_RE = re.compile(
    r'[ \t]*<(?:meta\s+(?:name|property)=["\'](?:description|keywords|robots|twitter:card|twitter:title|twitter:description|og:locale)["\']|link\s+rel=["\'](?:canonical|alternate)["\'])[^>]*>\s*\n',
    re.IGNORECASE,
)


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;")


def build_block(path: str, title: str, desc: str, kw: str, indexable: bool) -> str:
    url = SITE + "/" + ("" if path == "index.html" else path)
    lang = "en"
    if path.startswith("ru/"):
        lang = "ru"

    lines = [MARK_START]
    lines.append(f'    <meta name="description" content="{esc(desc)}">')
    if kw:
        lines.append(f'    <meta name="keywords" content="{esc(kw)}">')

    if indexable:
        lines.append('    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">')
    else:
        lines.append('    <meta name="robots" content="noindex, nofollow">')

    lines.append(f'    <link rel="canonical" href="{url}">')

    if path == "index.html":
        lines.append(f'    <link rel="alternate" hreflang="ru" href="{SITE}/ru/main/index.html">')
        lines.append(f'    <link rel="alternate" hreflang="en" href="{SITE}/en/main/index.html">')
        lines.append(f'    <link rel="alternate" hreflang="x-default" href="{SITE}/">')
    elif path in ALT and indexable:
        other = ALT[path]
        other_lang = "ru" if other.startswith("ru/") else "en"
        lines.append(f'    <link rel="alternate" hreflang="{lang}" href="{url}">')
        lines.append(f'    <link rel="alternate" hreflang="{other_lang}" href="{SITE}/{other}">')
        lines.append(f'    <link rel="alternate" hreflang="x-default" href="{SITE}/">')

    lines.append(f'    <meta property="og:locale" content="{"ru_RU" if lang == "ru" else "en_US"}">')
    lines.append(f'    <meta name="twitter:card" content="summary_large_image">')
    lines.append(f'    <meta name="twitter:title" content="{esc(title)}">')
    lines.append(f'    <meta name="twitter:description" content="{esc(desc)}">')
    lines.append(MARK_END)
    return "\n".join(lines) + "\n"


def process(path: str, title: str, desc: str, kw: str, indexable: bool) -> str:
    full = os.path.join(ROOT, path)
    if not os.path.exists(full):
        return f"SKIP (нет файла) {path}"

    html = open(full, encoding="utf-8").read()
    original = html

    html = BLOCK_RE.sub("", html)          # снести прошлый авто-блок
    html = STRIP_RE.sub("", html)          # снести ручные дубли

    # обновить <title>
    if re.search(r"<title>.*?</title>", html, re.DOTALL):
        html = re.sub(r"<title>.*?</title>", f"<title>{esc(title)}</title>", html, count=1, flags=re.DOTALL)

    block = build_block(path, title, desc, kw, indexable)

    m = re.search(r"</head>", html, re.IGNORECASE)
    if not m:
        return f"SKIP (нет </head>) {path}"
    html = html[: m.start()] + block + html[m.start():]

    if html != original:
        open(full, "w", encoding="utf-8").write(html)
        return f"OK   {path}"
    return f"---  {path} (без изменений)"


if __name__ == "__main__":
    for p, (t, d, k, idx) in PAGES.items():
        print(process(p, t, d, k, idx))
