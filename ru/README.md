# AresCraftX — Minecraft Экосистема

## 📋 О проекте

**AresCraftX** — это Minecraft-экосистема, включающая сервер Java Edition, лаунчер, античит и платформу для общения. Проект основан в 2021 году (вскоре закрылся), в 2025 попытка открытия — проработал 6 дней, в 2026 начат заново с нуля.

## 🎮 Сервер

- **Адрес:** `play.arescraftx.online`
- **Версия:** Java Edition 1.20–1.21.11
- **Режимы:** Анархия (кастомные механики, разрешено всё кроме правил), Ванила+ (выживание с дополнениями)
- **Статус:** В разработке

## 📂 Структура проекта

```
ru/
├── main/
│   ├── index.html        # Главная страница (landing)
│   ├── server.html       # Страница сервера (подключение, режимы, донат, новости)
│   ├── community.html    # Сообщество (соцсети, AresCord, контакты, FAQ)
│   ├── style.css         # Полный CSS (тёмная + светлая тема)
│   └── script.js         # Главный JS (авторизация, 2FA, сессии, онлайн)
├── auth/
│   ├── auth.html         # Вход / Регистрация
│   ├── auth.js           # Логика авторизации
│   ├── emailjs-config.js # Конфиг EmailJS
│   └── style.css         # Стили авторизации
├── assets/
│   ├── logo.png          # Логотип
│   └── favicon.ico       # Иконка
├── projects/
│   ├── checkers/         # AresChecker — проверка на читы
│   ├── launchers/        # AresLaunch — Minecraft-лаунчер
│   └── arescord/         # AresCord — платформа для общения
├── database.sql          # SQL-миграция (Supabase)
├── config.json           # Конфигурация (Supabase, EmailJS)
└── README.md             # Этот файл
```

## 🔐 Функционал

- **Авторизация:** Вход через логин/email + пароль, OAuth (Google, Discord, Telegram, GitHub)
- **2FA:** TOTP-аутентификация с QR-кодом и 6-значным вводом
- **Профиль:** Редактирование имени, аватара, даты рождения, MC-ника, описания
- **Сессии:** Просмотр и управление активными сессиями
- **Темы:** Тёмная, светлая (с улучшенным контрастом), системная
- **Онлайн:** Реальный онлайн сервера через mcstatus.io API

## 🛠️ Технологии

- **Frontend:** HTML5, CSS3, Vanilla JS
- **Auth & DB:** Supabase (PostgreSQL, Row Level Security)
- **2FA:** Web Crypto API (TOTP SHA-1)
- **Email:** EmailJS
- **API:** mcsrvstat.us (серверный онлайн)
- **Иконки:** Font Awesome 6.5

## 📞 Контакты

- **Discord:** https://discord.gg/JqzG7THVZ5
- **Telegram:** @arescraftx
- **TG Бот:** @arescraftx_support_bot
- **YouTube:** https://www.youtube.com/@AresCraftX
- **Email:** arescraftx@gmail.com

## 👤 Разработчик

**Poncho435** — основатель и главный разработчик. Команда скоро расширится до 5+ человек.

## 📜 Лицензия

© 2021–2026 AresCraftX. Все права защищены.
