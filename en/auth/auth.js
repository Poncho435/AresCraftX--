// auth.js — регистрация, вход, 2FA, восстановление пароля
document.addEventListener('DOMContentLoaded', async () => {
    const SUPABASE_URL = 'https://ggyaitqgukjgcjscvwjj.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdneWFpdHFndWtqZ2Nqc2N2d2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MzQyMjMsImV4cCI6MjEwMzQxMDIyM30.-q2fXEDe93wverb3qYgDkrQqnR_QLbytXQYKDFvlUBs';
    
    const SERVICE_ID = 'service_wao8uyu';
    const TEMPLATE_ID = 'template_aoqajd5';
    const PUBLIC_KEY = 'kKTaWZRSBG53fUs48';

    // Проверяем что Supabase SDK загружен
    if (!window.supabase || !window.supabase.createClient) {
        console.error('[ACX] Supabase SDK не загружен! Проверьте подключение скрипта.');
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0808;color:#ff8800;font-family:system-ui;text-align:center;padding:20px"><div><h2>Ошибка загрузки</h2><p style="color:#887766;margin-top:8px">Не удалось загрузить компоненты авторизации. Обновите страницу или проверьте подключение к интернету.</p><button onclick="location.reload()" style="margin-top:16px;padding:10px 24px;background:linear-gradient(135deg,#ff8800,#e06500);border:none;border-radius:8px;color:#0a0808;font-weight:700;cursor:pointer">Обновить</button></div></div>';
        return;
    }

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ====================================================================
    // СРОЧНО: УСТАНАВЛИВАЕМ ОБРАБОТЧИКИ ДЛЯ ЗАБЫЛИ ПАРОЛЬ ПЕРВЫМ ДЕЛОМ
    // Это гарантирует что кнопка работает даже если что-то ниже упадёт
    // ====================================================================
    function showAuthForm(formId) {
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        const target = document.getElementById(formId);
        if (target) target.classList.add('active');
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(b => b.classList.remove('active'));
        if (formId === 'login-form') tabBtns[0]?.classList.add('active');
        if (formId === 'register-form') tabBtns[1]?.classList.add('active');
        const tabsEl = document.querySelector('.auth-tabs');
        if (tabsEl) tabsEl.style.display = (formId === 'forgot-form' || formId === 'reset-form') ? 'none' : 'flex';
    }

    // Забыли пароль — КЛИК
    const forgotLink = document.getElementById('forgot-password-link');
    if (forgotLink) {
        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[ACX] Показываем форму восстановления пароля');
            showAuthForm('forgot-form');
        });
    }

    // Назад ко входу
    const backToLoginLink = document.getElementById('back-to-login-link');
    if (backToLoginLink) {
        backToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showAuthForm('login-form');
        });
    }

    // Табы вход/регистрация
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.tab === 'login') showAuthForm('login-form');
            else showAuthForm('register-form');
        });
    });

    // Если URL содержит токен восстановления — сразу показываем форму сброса
    const urlHash = window.location.hash;
    if (urlHash && (urlHash.includes('type=recovery') || urlHash.includes('access_token'))) {
        showAuthForm('reset-form');
    }

    // ====================================================================
    // СЕССИЯ — проверяем с защитой от ошибок
    // ====================================================================
    let session = null;
    try {
        const result = await supabase.auth.getSession();
        session = result?.data?.session || null;
    } catch (err) {
        console.warn('[ACX] Ошибка проверки сессии:', err);
    }
    if (session?.user) {
        window.location.href = '../main/index.html';
        return;
    }

    // ====================================================================
    // DOM ЭЛЕМЕНТЫ
    // ====================================================================
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const lastLoginEl = document.getElementById('last-login');
    const lastLoginTime = document.getElementById('last-login-time');

    const modal = document.getElementById('code-modal');
    const codeInputs = document.querySelectorAll('#code-inputs .code-box');
    const modalStatus = document.getElementById('modal-status');
    const modalConfirm = document.getElementById('modal-confirm');
    const modalResend = document.getElementById('modal-resend');

    const mfaModal = document.getElementById('mfa-modal');
    const mfaCodeInputs = document.querySelectorAll('#mfa-code-inputs .code-box');
    const mfaModalStatus = document.getElementById('mfa-modal-status');
    const mfaModalConfirm = document.getElementById('mfa-modal-confirm');
    const mfaModalCancel = document.getElementById('mfa-modal-cancel');

    let verificationCode = '';
    let pendingRegistration = null;
    let codeAttempts = 0;
    let canResend = true;

    let mfaPendingUser = null;
    let mfaPendingEmail = null;
    let mfaPendingPassword = null;
    let mfaSecret = null;

    // --- TOTP (RFC 6238) ---
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    function base32decode(str) {
        str = str.replace(/=+$/, '').toUpperCase();
        const bytes = [];
        let bits = 0, value = 0;
        for (let i = 0; i < str.length; i++) {
            const idx = base32Chars.indexOf(str[i]);
            if (idx === -1) continue;
            value = (value << 5) | idx;
            bits += 5;
            if (bits >= 8) {
                bytes.push((value >>> (bits - 8)) & 0xff);
                bits -= 8;
            }
        }
        return new Uint8Array(bytes);
    }

    function base32encode(bytes) {
        let bits = 0, value = 0, output = '';
        for (let i = 0; i < bytes.length; i++) {
            value = (value << 8) | bytes[i];
            bits += 8;
            while (bits >= 5) {
                output += base32Chars[(value >>> (bits - 5)) & 31];
                bits -= 5;
            }
        }
        if (bits > 0) {
            output += base32Chars[(value << (5 - bits)) & 31];
        }
        while (output.length % 8 !== 0) output += '=';
        return output;
    }

    function generateSecret(length = 20) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return base32encode(array);
    }

    async function generateTOTP(secret, period = 30, digits = 6, offset = 0) {
        try {
            const decodedSecret = base32decode(secret);
            const counter = Math.floor(Date.now() / 1000 / period) + offset;
            const counterBytes = new ArrayBuffer(8);
            new DataView(counterBytes).setBigUint64(0, BigInt(counter), false);
            const key = await crypto.subtle.importKey(
                'raw', decodedSecret,
                { name: 'HMAC', hash: 'SHA-1' },
                false, ['sign']
            );
            const hmac = await crypto.subtle.sign('HMAC', key, counterBytes);
            const hmacBytes = new Uint8Array(hmac);
            const offsetByte = hmacBytes[hmacBytes.length - 1] & 0xf;
            const binary = ((hmacBytes[offsetByte] & 0x7f) << 24) |
                           ((hmacBytes[offsetByte + 1] & 0xff) << 16) |
                           ((hmacBytes[offsetByte + 2] & 0xff) << 8) |
                           (hmacBytes[offsetByte + 3] & 0xff);
            const otp = binary % Math.pow(10, digits);
            return otp.toString().padStart(digits, '0');
        } catch (err) {
            console.error('Error generating TOTP:', err);
            throw err;
        }
    }

    async function verifyTOTP(code, secret, window = 2) {
        const offsets = [];
        for (let i = -window; i <= window; i++) {
            offsets.push(i);
        }
        const codes = await Promise.all(
            offsets.map(offset => generateTOTP(secret, 30, 6, offset))
        );
        console.log('Сгенерированные коды:', codes);
        console.log('Введённый код:', code);
        return codes.includes(code);
    }

    // --- Тосты ---
    function showNotification(message, type = 'info', duration = 4000) {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed; top: 16px; right: 16px; z-index: 99999;
                display: flex; flex-direction: column; gap: 8px;
                max-width: 380px; width: calc(100% - 32px); pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        const colors = {
            success: { bg: 'rgba(68,221,102,.12)', border: 'rgba(68,221,102,.25)', accent: '#44dd66', icon: 'fa-check-circle' },
            error:   { bg: 'rgba(255,80,80,.12)',   border: 'rgba(255,80,80,.25)',   accent: '#ff5050', icon: 'fa-exclamation-circle' },
            info:    { bg: 'rgba(255,136,0,.12)',    border: 'rgba(255,136,0,.25)',    accent: '#ff8800', icon: 'fa-info-circle' },
            warning: { bg: 'rgba(255,170,0,.12)',    border: 'rgba(255,170,0,.25)',    accent: '#ffaa00', icon: 'fa-exclamation-triangle' }
        };
        const c = colors[type] || colors.info;

        const notification = document.createElement('div');
        notification.style.cssText = `
            pointer-events: auto; padding: 12px 16px; border-radius: 12px;
            background: ${c.bg}; backdrop-filter: blur(16px);
            border: 1px solid ${c.border}; color: var(--text-primary);
            font-size: .88rem; font-weight: 500;
            box-shadow: 0 8px 32px rgba(0,0,0,.4);
            transform: translateX(120%);
            animation: acxNotifIn .35s cubic-bezier(.22,1,.36,1) forwards;
            display: flex; align-items: center; gap: 10px;
            border-left: 3px solid ${c.accent}; line-height: 1.4;
        `;
        const iconEl = document.createElement('i');
        iconEl.className = 'fas ' + c.icon;
        iconEl.style.cssText = 'color:' + c.accent + ';font-size:1.1rem;flex-shrink:0';
        notification.appendChild(iconEl);

        const textEl = document.createElement('span');
        textEl.textContent = message;
        notification.appendChild(textEl);

        container.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'acxNotifOut .3s ease forwards';
            setTimeout(() => { if (notification.parentNode) notification.remove(); }, 300);
        }, duration);
    }

    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes acxNotifIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes acxNotifOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(120%); opacity: 0; } }
        `;
        document.head.appendChild(style);
    }

    // --- Приветствия ---
    const greetings = [
        "Oh, you're here again? 👀", 'Welcome back, warrior! ⚔️', 'We were waiting for you! 😏',
        "Are you sure you're not a robot? 🤖", 'Missed you! ❤️', 'Forgot your password again? 😅',
        'Well, hello! ✨', "You're early today! 🌅", 'Night watch? 🌙',
        'Back in action! 💪', 'Hello, old friend! 🤝', 'Long time no see! ⏰',
        'Ты как всегда вовремя! 🎯', 'Ready for adventure? 🚀', 'С возвращением, капитан! ⚓',
        'А вот и ты! 🎉', 'Мы уже заждались! ⌛', 'Ты наш герой! 🦸',
        'Снова в строю! 🎖️', 'Привет, легенда! 🏆', 'Опа, знакомые лица! 😎',
        'Ты сегодня великолепен! 🌟', 'С возвращением в семью! 👪', 'А мы уж думали... 🤔',
        'Ты всегда вовремя! ⏱️', 'Привет, мастер! 🎭', 'Снова вместе! 🤗',
        'Ты наш чемпион! 🥇', 'С возвращением, друг! 🌈', 'Мы по тебе скучали! 💫',
        'О, ты жив! 😄', 'Приветствую, странник! 🧙', 'Ты как всегда крут! 🔥',
        'С возвращением на борт! 🚢', 'Давно не виделись, дружище! 🍻', 'А ты всё такой же! 😎',
        'Finally! 🎊'
    ];

    function setRandomGreeting() {
        const el = document.getElementById('random-greeting');
        if (el) el.textContent = greetings[Math.floor(Math.random() * greetings.length)];
    }
    setRandomGreeting();

    // ====================================================================
    // ЗАБЫЛИ ПАРОЛЬ — ОТПРАВКА ССЫЛКИ
    // ====================================================================
    const forgotFormFields = document.getElementById('forgot-form-fields');
    if (forgotFormFields) {
        forgotFormFields.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('forgot-email').value.trim();
            const statusEl = document.getElementById('forgot-status');
            const submitBtn = document.getElementById('forgot-submit');
            if (!email) { statusEl.innerHTML = '<span style="color:#ff5050">⛔ Enter email</span>'; return; }

            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ Отправка...';
            statusEl.textContent = '';

            // Функция для отправки письма сброса пароля с retry
            async function sendResetEmail(emailAddr, retryCount = 0) {
                const redirectUrl = window.location.origin + '/en/auth/auth.html';
                const options = {};
                // Добавляем redirectTo только если origin валидный (не file://)
                if (window.location.origin && window.location.origin !== 'null' && window.location.protocol !== 'file:') {
                    options.redirectTo = redirectUrl;
                }
                try {
                    const { error } = await supabase.auth.resetPasswordForEmail(emailAddr, options);
                    if (error) throw error;
                    return { success: true };
                } catch (err) {
                    console.warn('[ACX] resetPasswordForEmail попытка ' + (retryCount + 1) + ' ошибка:', err.message);
                    // Если Failed to fetch — пробуем ещё раз через секунду (м.б. сетевая задержка)
                    if (err.message && err.message.includes('Failed to fetch') && retryCount < 2) {
                        await new Promise(r => setTimeout(r, 1000));
                        return sendResetEmail(emailAddr, retryCount + 1);
                    }
                    // Если с redirectTo не получилось — пробуем БЕЗ redirectTo
                    if (options.redirectTo && retryCount === 2) {
                        console.log('[ACX] Пробую без redirectTo...');
                        try {
                            const { error: err2 } = await supabase.auth.resetPasswordForEmail(emailAddr, {});
                            if (err2) throw err2;
                            return { success: true, noRedirect: true };
                        } catch (err3) {
                            throw err3;
                        }
                    }
                    throw err;
                }
            }

            try {
                const result = await sendResetEmail(email);
                if (result.noRedirect) {
                    statusEl.innerHTML = '<span style="color:#44dd66">✅ Password reset link sent на <strong>' + email + '</strong>. Check your inbox and spam.</span><br><span style="color:#ffaa00;font-size:.78rem">⚠️ Ссылка без авто-редиректа — скопируйте её из письма вручную.</span>';
                } else {
                    statusEl.innerHTML = '<span style="color:#44dd66">✅ Password reset link sent на <strong>' + email + '</strong>. Check your inbox and spam.</span>';
                }
                submitBtn.textContent = 'Отправить ещё раз';
                submitBtn.disabled = false;
            } catch (err) {
                console.error('[ACX] Ошибка resetPasswordForEmail:', err);
                let helpMsg = '';
                if (err.message && err.message.includes('Failed to fetch')) {
                    helpMsg = '<br><span style="color:#ffaa00;font-size:.78rem">💡 Возможные причины:<br>• Адблокер (uBlock, Brave) блокирует запрос — отключите его для этого сайта<br>• Нет подключения к интернету<br>• Брандмауэр блокирует запрос</span>';
                }
                statusEl.innerHTML = '<span style="color:#ff5050">❌ ' + (err.message || 'Ошибка отправки') + '</span>' + helpMsg;
                submitBtn.textContent = 'Отправить ссылку';
                submitBtn.disabled = false;
            }
        });
    }

    // ====================================================================
    // СБРОС ПАРОЛЯ (когда юзер перешёл по ссылке из письма)
    // ====================================================================
    // Strength bar for reset password
    const resetPwdInput = document.getElementById('reset-password');
    if (resetPwdInput) {
        resetPwdInput.addEventListener('input', function() {
            const pwd = this.value;
            const bar = document.getElementById('reset-strength-bar');
            const text = document.getElementById('reset-strength-text');
            let score = 0;
            if (pwd.length >= 8) score++;
            if (pwd.length >= 12) score++;
            if (/[A-Z]/.test(pwd)) score++;
            if (/[a-z]/.test(pwd)) score++;
            if (/[0-9]/.test(pwd)) score++;
            if (/[^A-Za-z0-9]/.test(pwd)) score++;
            bar.className = 'strength-bar';
            if (!pwd) { text.textContent = 'Weak'; return; }
            if (score <= 1) { bar.classList.add('weak'); text.textContent = 'Weak'; }
            else if (score <= 3) { bar.classList.add('medium'); text.textContent = 'Medium'; }
            else if (score <= 5) { bar.classList.add('strong'); text.textContent = 'Strong'; }
            else { bar.classList.add('very-strong'); text.textContent = 'Very Strong'; }
        });
    }

    const resetFormFields = document.getElementById('reset-form-fields');
    if (resetFormFields) {
        resetFormFields.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('reset-password').value;
            const confirm = document.getElementById('reset-confirm-password').value;
            const statusEl = document.getElementById('reset-status');
            const submitBtn = document.getElementById('reset-submit');

            if (password.length < 8) { statusEl.innerHTML = '<span style="color:#ff5050">⛔ Password must be at least 8 characters</span>'; return; }
            if (password !== confirm) { statusEl.innerHTML = '<span style="color:#ff5050">⛔ Passwords do not match</span>'; return; }

            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ Сохранение...';

            try {
                const { error } = await supabase.auth.updateUser({ password: password });
                if (error) throw error;
                statusEl.innerHTML = '<span style="color:#44dd66">✅ Password successfully changed! Перенаправление на вход...</span>';
                setTimeout(async () => {
                    await supabase.auth.signOut();
                    window.location.hash = '';
                    showAuthForm('login-form');
                    showNotification('✅ Пароль изменён. Log in with your new password.', 'success');
                }, 1500);
            } catch (err) {
                console.error('[ACX] Ошибка сброса пароля:', err);
                statusEl.innerHTML = '<span style="color:#ff5050">❌ ' + (err.message || 'Ошибка') + '</span>';
                submitBtn.textContent = 'Сменить пароль';
                submitBtn.disabled = false;
            }
        });
    }

    // ====================================================================
    // Проверка пароля при регистрации
    // ====================================================================
    const regPwdInput = document.getElementById('reg-password');
    if (regPwdInput) {
        regPwdInput.addEventListener('input', function() {
            const pwd = this.value;
            const bar = document.getElementById('strength-bar');
            const text = document.getElementById('strength-text');
            let score = 0;
            if (pwd.length >= 8) score++;
            if (pwd.length >= 12) score++;
            if (/[A-Z]/.test(pwd)) score++;
            if (/[a-z]/.test(pwd)) score++;
            if (/[0-9]/.test(pwd)) score++;
            if (/[^A-Za-z0-9]/.test(pwd)) score++;
            bar.className = 'strength-bar';
            if (!pwd) { text.textContent = 'Weak'; return; }
            if (score <= 1) { bar.classList.add('weak'); text.textContent = 'Weak'; }
            else if (score <= 3) { bar.classList.add('medium'); text.textContent = 'Medium'; }
            else if (score <= 5) { bar.classList.add('strong'); text.textContent = 'Strong'; }
            else { bar.classList.add('very-strong'); text.textContent = 'Very Strong'; }
        });
    }

    // ====================================================================
    // МОДАЛКА РЕГИСТРАЦИИ (код из письма)
    // ====================================================================
    function showModal() {
        modal.classList.add('active');
        codeInputs.forEach((input, i) => {
            input.value = '';
            input.className = 'code-box';
            if (i === 0) setTimeout(() => input.focus(), 100);
        });
        modalStatus.textContent = 'Введите 6-значный код';
        modalStatus.className = 'modal-status';
        modalConfirm.disabled = false;
        codeAttempts = 0;
    }

    codeInputs.forEach((input, index) => {
        input.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
            if (this.value.length === 1) {
                this.className = 'code-box filled';
                if (index < 5) codeInputs[index + 1].focus();
            }
        });
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && !this.value && index > 0) {
                codeInputs[index - 1].focus();
                codeInputs[index - 1].className = 'code-box';
            }
            if (e.key === 'Enter') modalConfirm.click();
        });
        input.addEventListener('paste', function(e) {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData).getData('text');
            const digits = paste.replace(/[^0-9]/g, '').slice(0, 6);
            digits.split('').forEach((d, i) => {
                if (codeInputs[i]) {
                    codeInputs[i].value = d;
                    codeInputs[i].className = 'code-box filled';
                }
            });
            if (digits.length > 0 && digits.length < 6) {
                codeInputs[digits.length].focus();
            } else if (digits.length >= 6) {
                codeInputs[5].focus();
                setTimeout(() => modalConfirm.click(), 200);
            }
        });
    });

    modalConfirm.addEventListener('click', async function() {
        const code = Array.from(codeInputs).map(i => i.value).join('');
        if (code.length < 6) {
            modalStatus.textContent = '⛔ Enter all 6 digits';
            modalStatus.className = 'modal-status error';
            return;
        }
        modalStatus.textContent = '⏳ Проверка...';
        modalStatus.className = 'modal-status';
        this.disabled = true;
        if (code === verificationCode) {
            modalStatus.textContent = '✅ Код верный! Вход...';
            modalStatus.className = 'modal-status success';
            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: pendingRegistration.email,
                    password: pendingRegistration.password
                });
                if (error) throw error;
                await supabase.auth.updateUser({
                    data: { verified: true, last_login: new Date().toISOString() }
                });
                setTimeout(() => {
                    modal.classList.remove('active');
                    window.location.href = '../main/index.html';
                }, 500);
            } catch (err) {
                modalStatus.textContent = `❌ ${err.message}`;
                modalStatus.className = 'modal-status error';
                this.disabled = false;
            }
        } else {
            codeAttempts++;
            if (codeAttempts >= 3) {
                modalStatus.textContent = '❌ Too many attempts. Запросите новый код';
                modalStatus.className = 'modal-status error';
                this.disabled = true;
                return;
            }
            modalStatus.textContent = `❌ Неверный код. Attempts remaining: ${3 - codeAttempts}`;
            modalStatus.className = 'modal-status error';
            this.disabled = false;
            codeInputs.forEach(i => { i.value = ''; i.className = 'code-box'; });
            codeInputs[0].focus();
        }
    });

    modalResend.addEventListener('click', async function() {
        if (!canResend) {
            modalStatus.textContent = '⏳ Wait 30 seconds before resending';
            modalStatus.className = 'modal-status error';
            return;
        }
        this.disabled = true;
        modalStatus.textContent = '⏳ Отправка...';
        modalStatus.className = 'modal-status';
        try {
            verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: SERVICE_ID,
                    template_id: TEMPLATE_ID,
                    user_id: PUBLIC_KEY,
                    template_params: {
                        to_email: pendingRegistration.email,
                        email: pendingRegistration.email,
                        user_email: pendingRegistration.email,
                        verification_code: verificationCode,
                        site_name: 'AresCraftX'
                    }
                })
            });
            if (response.ok) {
                modalStatus.textContent = '✅ Код отправлен!';
                modalStatus.className = 'modal-status success';
                canResend = false;
                this.disabled = true;
                setTimeout(() => { canResend = true; this.disabled = false; }, 30000);
            } else {
                const result = await response.text();
                modalStatus.textContent = `❌ Ошибка: ${result}`;
                modalStatus.className = 'modal-status error';
                this.disabled = false;
            }
        } catch (err) {
            modalStatus.textContent = `❌ ${err.message}`;
            modalStatus.className = 'modal-status error';
            this.disabled = false;
        }
    });

    async function sendVerificationCode(email) {
        try {
            verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: SERVICE_ID,
                    template_id: TEMPLATE_ID,
                    user_id: PUBLIC_KEY,
                    template_params: {
                        to_email: email,
                        email: email,
                        user_email: email,
                        verification_code: verificationCode,
                        site_name: 'AresCraftX'
                    }
                })
            });
            if (!response.ok) {
                const result = await response.text();
                throw new Error(result);
            }
            return true;
        } catch (err) {
            console.error('EmailJS error:', err);
            throw err;
        }
    }

    // ====================================================================
    // РЕГИСТРАЦИЯ
    // ====================================================================
    const regFormFields = document.getElementById('register-form-fields');
    if (regFormFields) {
        regFormFields.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('reg-username').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const birthday = document.getElementById('reg-birthday').value;
            const gender = document.getElementById('reg-gender').value;
            const password = document.getElementById('reg-password').value;
            const confirm = document.getElementById('reg-confirm-password').value;

            if (!username || !email || !birthday || !password || !confirm) {
                showNotification('⛔ Fill in all required fields', 'error');
                return;
            }
            const birthDate = new Date(birthday);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
            if (age < 13) {
                showNotification('⛔ Registration only for users 13 and older', 'error');
                return;
            }
            if (username.length < 3) {
                showNotification('⛔ Username must be at least 3 characters', 'error');
                return;
            }
            if (password.length < 8) {
                showNotification('⛔ Password must be at least 8 characters', 'error');
                return;
            }
            if (password !== confirm) {
                showNotification('⛔ Passwords do not match', 'error');
                return;
            }

            showNotification('⏳ Регистрация...', 'info');
            document.getElementById('register-btn').disabled = true;

            try {
                const { data, error } = await supabase.auth.signUp({
                    email, password,
                    options: {
                        data: { username, birthday, gender: gender || 'not_specified', verified: false }
                    }
                });
                if (error) throw error;
                pendingRegistration = { email, password };
                await sendVerificationCode(email);
                showModal();
                showNotification('✅ Код отправлен! Проверьте почту', 'success');
                document.getElementById('register-btn').disabled = false;
            } catch (err) {
                showNotification(`❌ ${err.message}`, 'error');
                document.getElementById('register-btn').disabled = false;
            }
        });
    }

    // ====================================================================
    // МОДАЛКА 2FA
    // ====================================================================
    function showMfaModal() {
        mfaModal.classList.add('active');
        mfaCodeInputs.forEach((input, i) => {
            input.value = '';
            input.className = 'code-box';
            if (i === 0) setTimeout(() => input.focus(), 100);
        });
        mfaModalStatus.textContent = 'Введите 6-значный код';
        mfaModalStatus.className = 'modal-status';
        mfaModalConfirm.disabled = false;
    }

    function hideMfaModal() {
        mfaModal.classList.remove('active');
    }

    mfaCodeInputs.forEach((input, index) => {
        input.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
            if (this.value.length === 1) {
                this.className = 'code-box filled';
                if (index < 5) mfaCodeInputs[index + 1].focus();
            }
        });
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && !this.value && index > 0) {
                mfaCodeInputs[index - 1].focus();
                mfaCodeInputs[index - 1].className = 'code-box';
            }
            if (e.key === 'Enter') {
                mfaModalConfirm.click();
            }
        });
        input.addEventListener('paste', function(e) {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData).getData('text');
            const digits = paste.replace(/[^0-9]/g, '').slice(0, 6);
            digits.split('').forEach((d, i) => {
                if (mfaCodeInputs[i]) {
                    mfaCodeInputs[i].value = d;
                    mfaCodeInputs[i].className = 'code-box filled';
                }
            });
            if (digits.length > 0 && digits.length < 6) {
                mfaCodeInputs[digits.length].focus();
            } else if (digits.length >= 6) {
                mfaCodeInputs[5].focus();
                setTimeout(() => mfaModalConfirm.click(), 200);
            }
        });
    });

    mfaModalConfirm.addEventListener('click', async function() {
        const code = Array.from(mfaCodeInputs).map(i => i.value).join('');
        if (code.length < 6) {
            mfaModalStatus.textContent = '⛔ Enter all 6 digits';
            mfaModalStatus.className = 'modal-status error';
            return;
        }

        mfaModalStatus.textContent = '⏳ Проверка...';
        mfaModalStatus.className = 'modal-status';
        this.disabled = true;

        try {
            const isValid = await verifyTOTP(code, mfaSecret, 2);
            if (!isValid) {
                throw new Error('Invalid code. Try again.');
            }

            mfaModalStatus.textContent = '✅ Код верный! Вход...';
            mfaModalStatus.className = 'modal-status success';

            await supabase.auth.updateUser({ data: { last_login: new Date().toISOString() } });

            const name = mfaPendingUser.user_metadata?.username || mfaPendingUser.email;
            showNotification(`✅ Welcome, ${name}!`, 'success');
            if (mfaPendingUser.user_metadata?.last_login) {
                lastLoginTime.textContent = new Date(mfaPendingUser.user_metadata.last_login).toLocaleString('ru-RU');
                lastLoginEl.style.display = 'flex';
            }

            setTimeout(() => {
                hideMfaModal();
                window.location.href = '../main/index.html';
            }, 500);
        } catch (err) {
            mfaModalStatus.textContent = `❌ ${err.message}`;
            mfaModalStatus.className = 'modal-status error';
            this.disabled = false;
            mfaCodeInputs.forEach(i => { i.value = ''; i.className = 'code-box'; });
            mfaCodeInputs[0].focus();
        }
    });

    mfaModalCancel.addEventListener('click', async function() {
        hideMfaModal();
        await supabase.auth.signOut();
        showNotification('❌ Login cancelled', 'error');
        const submitBtn = document.querySelector('#login-form-fields .btn-submit');
        if (submitBtn) submitBtn.disabled = false;
        mfaPendingUser = null;
        mfaPendingEmail = null;
        mfaPendingPassword = null;
    });

    // ====================================================================
    // ВХОД с 2FA (модальное окно)
    // ====================================================================
    document.getElementById('login-form-fields').addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = document.getElementById('login-identifier');
        const password = document.getElementById('login-password');
        const identifierVal = identifier.value.trim();
        const passwordVal = password.value.trim();

        if (!identifierVal || !passwordVal) {
            if(!identifierVal) identifier.classList.add('input-error');
            if(!passwordVal) password.classList.add('input-error');
            showNotification('⛔ Fill in all fields', 'error');
            setTimeout(()=>{identifier.classList.remove('input-error');password.classList.remove('input-error')},2000);
            return;
        }

        showNotification('⏳ Вход...', 'info');
        const submitBtn = document.querySelector('#login-form-fields .btn-submit');
        submitBtn.disabled = true;

        try {
            // Определяем: это email или username?
            let email = identifierVal;
            if (!identifierVal.includes('@')) {
                const { data: userRow, error: findErr } = await supabase
                    .from('users')
                    .select('email')
                    .ilike('username', identifierVal)
                    .limit(1);
                if (findErr || !userRow || userRow.length === 0) {
                    identifier.classList.add('input-error');
                    showNotification('❌ User not found', 'error');
                    submitBtn.disabled = false;
                    setTimeout(()=>identifier.classList.remove('input-error'),2000);
                    return;
                }
                email = userRow[0].email;
                if (!email) {
                    identifier.classList.add('input-error');
                    showNotification('❌ User has no email specified', 'error');
                    submitBtn.disabled = false;
                    setTimeout(()=>identifier.classList.remove('input-error'),2000);
                    return;
                }
            }

            // 1. Попытка входа (пароль)
            const { data, error } = await supabase.auth.signInWithPassword({ email, password: passwordVal });
            if (error) {
                const msg = error.message || '';
                if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
                    password.classList.add('input-error');
                    showNotification('❌ Incorrect password', 'error');
                    setTimeout(()=>password.classList.remove('input-error'),2000);
                } else if (msg.includes('Email not confirmed') || msg.includes('email_not_confirmed')) {
                    identifier.classList.add('input-error');
                    showNotification('❌ Email not confirmed. Проверьте почту.', 'error');
                    setTimeout(()=>identifier.classList.remove('input-error'),2000);
                } else if (msg.includes('Too many requests') || msg.includes('rate_limit')) {
                    showNotification('❌ Too many attempts. Подождите.', 'error');
                } else {
                    showNotification('❌ ' + msg, 'error');
                }
                submitBtn.disabled = false;
                return;
            }

            // ИСПРАВЛЕНО: userAfterLogin объявляется СРАЗУ после успешного входа
            const userAfterLogin = data.user;

            // 2. Проверяем бан — читаем из user_bans
            try {
                const { data: banData } = await supabase.from('user_bans').select('*').eq('user_id', userAfterLogin.id).maybeSingle();
                if (banData) {
                    if (banData.banned_until && new Date(banData.banned_until) < new Date()) {
                        try { await supabase.from('user_bans').delete().eq('user_id', userAfterLogin.id); } catch(e) {}
                    } else {
                        await supabase.auth.signOut();
                        const reason = banData.reason || 'Rule violation';
                        const until = banData.banned_until === 'permanent' ? 'Навсегда' : banData.banned_until ? new Date(banData.banned_until).toLocaleString('ru-RU') : 'Навсегда';
                        showNotification('🔒 Account blocked. Причина: ' + reason + ' (до: ' + until + ')', 'error', 8000);
                        submitBtn.disabled = false;
                        return;
                    }
                }
            } catch(e) { console.warn('Ban check error:', e); }

            // 3. Проверяем 2FA — читаем из users table
            const isMfaEnabled = userAfterLogin?.user_metadata?.mfa_enabled || false;
            let loadedMfaSecret = null;

            try {
                const { data: userData } = await supabase
                    .from('users')
                    .select('mfa_secret')
                    .eq('id', userAfterLogin.id)
                    .maybeSingle();
                loadedMfaSecret = userData?.mfa_secret || null;
            } catch(e) { console.warn('MFA secret load error:', e); }

            if (isMfaEnabled && loadedMfaSecret) {
                if (!window.crypto || !window.crypto.subtle) {
                    await supabase.auth.signOut();
                    showNotification('❌ Web Crypto API unavailable. Use HTTPS.', 'error');
                    submitBtn.disabled = false;
                    return;
                }

                mfaPendingUser = userAfterLogin;
                mfaPendingEmail = email;
                mfaPendingPassword = password;
                mfaSecret = loadedMfaSecret;

                showMfaModal();
                submitBtn.disabled = false;
                return;
            }

            // --- НЕТ 2FA — сразу завершаем вход ---
            await supabase.auth.updateUser({ data: { last_login: new Date().toISOString() } });
            const name = userAfterLogin.user_metadata?.username || userAfterLogin.email;
            showNotification(`✅ Welcome, ${name}!`, 'success');
            if (userAfterLogin.user_metadata?.last_login) {
                lastLoginTime.textContent = new Date(userAfterLogin.user_metadata.last_login).toLocaleString('ru-RU');
                lastLoginEl.style.display = 'flex';
            }
            setTimeout(() => window.location.href = '../main/index.html', 1000);
        } catch (err) {
            showNotification(`❌ ${err.message}`, 'error');
            submitBtn.disabled = false;
        }
    });

    // ====================================================================
    // Социальные провайдеры
    // ====================================================================
    document.querySelectorAll('.social-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const provider = btn.dataset.provider;
            try {
                showNotification(`⏳ Подключение к ${provider}...`, 'info');
                const { error } = await supabase.auth.signInWithOAuth({
                    provider,
                    options: { redirectTo: window.location.origin + '/en/auth/auth.html' }
                });
                if (error) throw error;
            } catch (err) {
                showNotification(`❌ ${err.message}`, 'error');
            }
        });
    });

    console.log('[ACX] auth.js загружен успешно. Все обработчики установлены.');
});
