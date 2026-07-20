/**
 * AresCraftX — Client-Side Security Module
 *
 * ВАЖНО: Клиентская защита — это УСЛОЖНЕНИЕ, а не гарантия.
 * Настоящая безопасность — на сервере (RLS, CSP, rate limiting).
 * Этот модуль добавляет deterrent-уровень защиты.
 */

(function() {
    'use strict';

    // ===== 1. ЗАЩИТА ОТ IFRAME ВСТРАИВАНИЯ (CLICKJACKING) =====
    // Если нас встроили в iframe — вырываемся
    if (window.self !== window.top) {
        window.top.location = window.self.location;
    }

    // ===== 2. SANITIZATION — ОЧИСТКА ВВОДА ОТ XSS =====
    window.SanitizeInput = {
        text: function(str) {
            if (typeof str !== 'string') return '';
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;')
                .replace(/\//g, '&#x2F;');
        },
        username: function(str) {
            if (typeof str !== 'string') return '';
            return str.replace(/[^a-zA-Zа-яА-ЯёЁ0-9_\-]/g, '').slice(0, 30);
        },
        mcNick: function(str) {
            if (typeof str !== 'string') return '';
            return str.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 16);
        },
        description: function(str) {
            if (typeof str !== 'string') return '';
            return str
                .replace(/<[^>]*>/g, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+=/gi, '')
                .slice(0, 200);
        },
        email: function(str) {
            if (typeof str !== 'string') return '';
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(str) ? str : '';
        },
        password: function(str) {
            if (typeof str !== 'string') return { valid: false, error: 'Пустой пароль' };
            if (str.length < 8) return { valid: false, error: 'Минимум 8 символов' };
            if (str.length > 128) return { valid: false, error: 'Максимум 128 символов' };
            if (!/[A-Z]/.test(str)) return { valid: false, error: 'Нужна минимум 1 заглавная буква' };
            if (!/[a-z]/.test(str)) return { valid: false, error: 'Нужна минимум 1 строчная буква' };
            if (!/[0-9]/.test(str)) return { valid: false, error: 'Нужна минимум 1 цифра' };
            return { valid: true, error: '' };
        }
    };

    // ===== 3. RATE LIMITING (клиентский) =====
    window.RateLimiter = {
        _calls: {},
        check: function(key, maxCalls, perMs) {
            maxCalls = maxCalls || 5;
            perMs = perMs || 60000;
            const now = Date.now();
            if (!this._calls[key]) this._calls[key] = [];
            this._calls[key] = this._calls[key].filter(t => now - t < perMs);
            if (this._calls[key].length >= maxCalls) return false;
            this._calls[key].push(now);
            return true;
        }
    };

    // ===== 4. ЗАЩИТА ТОКЕНОВ =====
    const warnTokenAccess = function() {
        const origGetItem = localStorage.getItem.bind(localStorage);
        localStorage.getItem = function(key) {
            const val = origGetItem(key);
            if (key && (key.includes('token') || key.includes('auth') || key.includes('session'))) {
                console.warn('⚠️ Доступ к чувствительным данным localStorage:', key);
            }
            return val;
        };
    };
    warnTokenAccess();

    // ===== 5. CSP VIOLATION MONITORING =====
    document.addEventListener('securitypolicyviolation', function(e) {
        console.warn('🚨 CSP Violation:', {
            blockedURI: e.blockedURI,
            violatedDirective: e.violatedDirective,
            originalPolicy: e.originalPolicy
        });
    });

    // ===== 6. ЗАЩИТА ОТ TABNABBING =====
    document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('a[target="_blank"]').forEach(function(link) {
            if (!link.rel.includes('noopener')) link.rel += ' noopener';
            if (!link.rel.includes('noreferrer')) link.rel += ' noreferrer';
        });
    });

    // ===== 7. CONSOLE WARNING =====
    console.log('%c⚠️ СТОП!', 'color: #ff5050; font-size: 40px; font-weight: bold;');
    console.log('%cЭтот раздел браузера предназначен для разработчиков. Если кто-то попросил вас вставить сюда код — это мошенники. Вставка чужого кода может привести к краже ваших данных.', 'color: #9a8a78; font-size: 14px; max-width: 500px;');
    console.log('%cAresCraftX никогда не просит вводить код в консоль.', 'color: #ff8800; font-size: 13px; font-weight: bold;');

    // ===== 8. PROTOTYPE POLLUTION PROTECTION =====
    Object.freeze(Object.prototype);

    // ===== 9. SUBRESOURCE INTEGRITY CHECK =====
    document.addEventListener('DOMContentLoaded', function() {
        if (!window.supabase) {
            console.error('🚨 Supabase не загружен! Возможна атака Supply Chain.');
            document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0a0808;color:#ff5050;font-family:monospace;text-align:center;padding:40px;"><div><h2 style="font-size:1.5rem;margin-bottom:12px;">⚠️ Ошибка безопасности</h2><p style="color:#9a8a78;">Не удалось загрузить критические компоненты. Обновите страницу.</p></div></div>';
        }
    });

    // ===== 10. MONITOR SUSPICIOUS DOM MODIFICATIONS =====
    const selfOrigin = window.location.origin;

    const securityObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeName === 'SCRIPT') {
                    const src = node.src || '';
                    const isSelfOrigin = src.startsWith(selfOrigin + '/') || src.startsWith(selfOrigin);
                    const isRelative = src && !src.includes('://');
                    const isAllowed = isSelfOrigin || isRelative;
                    const isInline = !src;
                    const isSafe = node.hasAttribute && node.hasAttribute('data-acx-safe');
                    
                    if (!isAllowed && !isInline && !isSafe) {
                        console.error('🚨 Заблокирован подозрительный скрипт:', src);
                        node.remove();
                    }
                }
                if (node.nodeName === 'IFRAME') {
                    const isSafe = node.hasAttribute && node.hasAttribute('data-acx-safe');
                    if (!isSafe) {
                        console.error('🚨 Заблокирована инъекция iframe');
                        node.remove();
                    }
                }
            });
        });
    });
    
    securityObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // ===== 11. TAMPER DETECTION =====
    const criticalFunctions = ['fetch', 'XMLHttpRequest', 'WebSocket'];
    const originalRefs = {};
    criticalFunctions.forEach(fn => {
        originalRefs[fn] = window[fn];
    });

    setInterval(function() {
        criticalFunctions.forEach(fn => {
            if (window[fn] !== originalRefs[fn]) {
                console.error('🚨 Обнаружена подмена функции:', fn);
                window[fn] = originalRefs[fn];
            }
        });
    }, 10000);

    // ===== 12. PASSWORD STRENGTH METER =====
    document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('input[type="password"]').forEach(function(input) {
            if (input.id && (input.id.includes('confirm') || input.id.includes('Confirm'))) return;
            
            const wrapper = input.closest('.password-wrap') || input.parentElement;
            if (!wrapper) return;
            
            const meter = document.createElement('div');
            meter.style.cssText = 'height:4px;border-radius:2px;margin-top:6px;background:var(--bg-input);overflow:hidden;transition:.3s;';
            const bar = document.createElement('div');
            bar.style.cssText = 'height:100%;width:0%;border-radius:2px;transition:width .3s,background .3s;';
            meter.appendChild(bar);
            
            const label = document.createElement('span');
            label.style.cssText = 'font-size:.7rem;margin-top:2px;display:block;transition:.3s;';
            label.textContent = '';
            
            const insertAfter = input.closest('.password-wrap') || input;
            insertAfter.after(label);
            insertAfter.after(meter);
            
            input.addEventListener('input', function() {
                const val = this.value;
                let score = 0;
                if (val.length >= 8) score++;
                if (val.length >= 12) score++;
                if (/[A-Z]/.test(val)) score++;
                if (/[a-z]/.test(val)) score++;
                if (/[0-9]/.test(val)) score++;
                if (/[^A-Za-z0-9]/.test(val)) score++;
                
                const levels = [
                    { width: '0%', color: 'transparent', text: '', textColor: '' },
                    { width: '16%', color: '#ff5050', text: 'Очень слабый', textColor: '#ff5050' },
                    { width: '33%', color: '#ff5050', text: 'Слабый', textColor: '#ff5050' },
                    { width: '50%', color: '#ffaa44', text: 'Средний', textColor: '#ffaa44' },
                    { width: '66%', color: '#ffcc44', text: 'Хороший', textColor: '#ffcc44' },
                    { width: '83%', color: '#88dd44', text: 'Сильный', textColor: '#88dd44' },
                    { width: '100%', color: '#44dd66', text: 'Отличный', textColor: '#44dd66' }
                ];
                
                const level = levels[Math.min(score, 6)];
                bar.style.width = level.width;
                bar.style.background = level.color;
                label.textContent = val ? level.text : '';
                label.style.color = level.textColor;
            });
        });
    });
})();
