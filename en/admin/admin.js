// admin.js — AresCraftX Admin Panel v4
// ВСЕ ФУНКЦИИ С ЯВНОЙ ДИАГНОСТИКОЙ ОШИБОК
document.addEventListener('DOMContentLoaded',async()=>{
const SU='https://ggyaitqgukjgcjscvwjj.supabase.co';
const SK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdneWFpdHFndWtqZ2Nqc2N2d2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MzQyMjMsImV4cCI6MjEwMzQxMDIyM30.-q2fXEDe93wverb3qYgDkrQqnR_QLbytXQYKDFvlUBs';

// ===== ПРОВЕРКА SDK =====
if(!window.supabase||!window.supabase.createClient){
  document.body.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0808;color:#ff5050;font-family:system-ui;text-align:center;padding:20px"><div><h2>❌ Supabase SDK не загружен</h2><p style="color:#887766;margin-top:8px">Обновите страницу (Ctrl+Shift+R). Если не помогает — проверьте блокировщики.</p><button onclick="location.reload()" style="margin-top:16px;padding:10px 24px;background:linear-gradient(135deg,#ff8800,#e06500);border:none;border-radius:8px;color:#0a0808;font-weight:700;cursor:pointer">Обновить</button></div></div>';
  return;
}

const sb=window.supabase.createClient(SU,SK);
const el=id=>document.getElementById(id);

// ===== AUTH =====
let session=null;
try{const r=await sb.auth.getSession();session=r?.data?.session||null}catch(e){console.error('Session error:',e)}
if(!session?.user){window.location.href='../auth/auth.html';return}
const user=session.user;

// ===== ADMIN CHECK =====
let isAdmin=false;
let ud=null;
try{const{data,error}=await sb.from('users').select('role').eq('id',user.id).maybeSingle();
if(error)console.error('Role check error:',error.message);
ud=data;if(ud?.role==='admin')isAdmin=true}catch(e){console.error('Role check exception:',e)}

if(!isAdmin){
  document.body.innerHTML=`<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#ff5050;font-size:1.2rem;font-family:sans-serif"><div style="text-align:center"><i class="fas fa-lock" style="font-size:3rem;margin-bottom:16px;display:block"></i>Access denied<br><small style="color:#888">Role: ${ud?.role||'не найдена'}</small><br><a href="../main/index.html" style="color:#ff8800;margin-top:12px;display:inline-block">← Back to main</a></div></div>`;
  return;
}

// ===== RLS DIAGNOSTIC =====
// Проверяем МОЖЕТ ЛИ админ писать в БД — это главный диагноз
let rlsOk=true;
let rlsError='';
try{
  // Тестовая запись
  const{error:testErr}=await sb.from('site_settings').upsert({key:'_admin_test',value:true},{onConflict:'key'});
  if(testErr){
    rlsOk=false;
    rlsError=testErr.message;
    console.error('[ACX Admin] RLS БЛОКИРУЕТ запись:',testErr.message);
  }else{
    // Удаляем тестовую запись
    await sb.from('site_settings').delete().eq('key','_admin_test');
    console.log('[ACX Admin] RLS работает корректно — запись разрешена');
  }
}catch(e){rlsOk=false;rlsError=e.message}

// Показываем КРАСНЫЙ БАННЕР если RLS не работает
if(!rlsOk){
  const warn=document.createElement('div');
  warn.id='rls-warning-banner';
  warn.style.cssText='position:fixed;top:0;left:0;right:0;z-index:9999999;background:linear-gradient(135deg,#ff2020,#cc0000);color:#fff;padding:14px 20px;font-family:system-ui;font-size:.88rem;box-shadow:0 4px 20px rgba(255,0,0,.4)';
  warn.innerHTML=`<div style="max-width:900px;margin:0 auto"><strong>⚠️ АДМИН-ПАНЕЛЬ НЕ МОЖЕТ СОХРАНЯТЬ ДАННЫЕ!</strong><br><span style="font-size:.82rem;opacity:.92">Ошибка: <code style="background:rgba(0,0,0,.25);padding:1px 6px;border-radius:3px">${rlsError}</code></span><br><span style="font-size:.82rem;opacity:.92">Нужно запустить SQL миграцию в Supabase:</span><br><button id="rls-copy-btn" style="margin-top:8px;padding:8px 18px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.3);border-radius:6px;color:#fff;cursor:pointer;font-weight:600"><i class="fas fa-copy"></i> Скопировать SQL</button> <button onclick="document.getElementById('rls-warning-banner').remove()" style="margin-top:8px;padding:8px 18px;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.2);border-radius:6px;color:#fff;cursor:pointer">Скрыть</button></div>`;
  document.body.appendChild(warn);
  document.getElementById('rls-copy-btn')?.addEventListener('click',()=>{
    const sql=generateFixSQL();
    navigator.clipboard.writeText(sql).then(()=>{const b=document.getElementById('rls-copy-btn');b.innerHTML='<i class="fas fa-check"></i> Скопировано!';setTimeout(()=>b.innerHTML='<i class="fas fa-copy"></i> Скопировать SQL',3000)}).catch(()=>{const ta=document.createElement('textarea');ta.value=sql;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()});
  });
}

// Генерируем SQL для копирования
function generateFixSQL(){
  return `-- AresCraftX — ФИКС RLS ДЛЯ АДМИН-ПАНЕЛИ
-- Скопируй и вставь в Supabase SQL Editor → Run

-- 1. Правильная is_admin() с двойной проверкой
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', FALSE) THEN
    RETURN TRUE;
  END IF;
  RETURN EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. site_settings: все читают, админ пишет (С WITH CHECK!)
DROP POLICY IF EXISTS "settings_read" ON site_settings;
CREATE POLICY "settings_read" ON site_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "settings_admin" ON site_settings;
CREATE POLICY "settings_admin" ON site_settings FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 3. news: опубликованные все читают, админ всё (С WITH CHECK!)
DROP POLICY IF EXISTS "news_read" ON news;
CREATE POLICY "news_read" ON news FOR SELECT USING (published = true OR is_admin());
DROP POLICY IF EXISTS "news_admin" ON news;
CREATE POLICY "news_admin" ON news FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 4. user_bans: свой бан + админ всё (С WITH CHECK!)
DROP POLICY IF EXISTS "user_bans_read_own" ON user_bans;
CREATE POLICY "user_bans_read_own" ON user_bans FOR SELECT USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "user_bans_admin" ON user_bans;
CREATE POLICY "user_bans_admin" ON user_bans FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 5. user_notifications: свои + админ может вставлять (С WITH CHECK!)
DROP POLICY IF EXISTS "notifs_own" ON user_notifications;
CREATE POLICY "notifs_own" ON user_notifications FOR ALL USING (auth.uid() = user_id OR is_admin()) WITH CHECK (auth.uid() = user_id OR is_admin());

-- 6. security_logs: свои + админ (С WITH CHECK!)
DROP POLICY IF EXISTS "logs_read_own" ON security_logs;
CREATE POLICY "logs_read_own" ON security_logs FOR SELECT USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "logs_insert_own" ON security_logs;
CREATE POLICY "logs_insert_own" ON security_logs FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin());

-- 7. user_sessions: свои + админ (С WITH CHECK!)
DROP POLICY IF EXISTS "sessions_own" ON user_sessions;
CREATE POLICY "sessions_own" ON user_sessions FOR ALL USING (auth.uid() = user_id OR is_admin()) WITH CHECK (auth.uid() = user_id OR is_admin());

-- 8. users: обновлять себя + админ всё (С WITH CHECK!)
DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id OR is_admin());
DROP POLICY IF EXISTS "users_admin_all" ON users;
CREATE POLICY "users_admin_all" ON users FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 9. banned_users: админ всё (С WITH CHECK!)
DROP POLICY IF EXISTS "banned_read_own" ON banned_users;
CREATE POLICY "banned_read_own" ON banned_users FOR SELECT USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "banned_admin" ON banned_users;
CREATE POLICY "banned_admin" ON banned_users FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 10. profile_links: свои + все читают + админ (С WITH CHECK!)
DROP POLICY IF EXISTS "profile_links_own" ON profile_links;
CREATE POLICY "profile_links_own" ON profile_links FOR ALL USING (auth.uid() = user_id OR is_admin()) WITH CHECK (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "profile_links_read" ON profile_links;
CREATE POLICY "profile_links_read" ON profile_links FOR SELECT USING (true);

-- 11. friends: обе стороны + админ (С WITH CHECK!)
DROP POLICY IF EXISTS "friends_access" ON friends;
CREATE POLICY "friends_access" ON friends FOR ALL USING (auth.uid() = user_id OR auth.uid() = friend_id OR is_admin()) WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id OR is_admin());

-- 12. friend_requests: обе стороны + админ (С WITH CHECK!)
DROP POLICY IF EXISTS "freq_access" ON friend_requests;
CREATE POLICY "freq_access" ON friend_requests FOR ALL USING (auth.uid() = from_id OR auth.uid() = to_id OR is_admin()) WITH CHECK (auth.uid() = from_id OR auth.uid() = to_id OR is_admin());

-- 13. push_subscriptions: свои + админ (С WITH CHECK!)
DROP POLICY IF EXISTS "push_own" ON push_subscriptions;
CREATE POLICY "push_own" ON push_subscriptions FOR ALL USING (auth.uid() = user_id OR is_admin()) WITH CHECK (auth.uid() = user_id OR is_admin());

-- 14. user_settings: свои + админ (С WITH CHECK!)
DROP POLICY IF EXISTS "settings_own" ON user_settings;
CREATE POLICY "settings_own" ON user_settings FOR ALL USING (auth.uid() = user_id OR is_admin()) WITH CHECK (auth.uid() = user_id OR is_admin());

-- 15. kill_all_user_sessions RPC
CREATE OR REPLACE FUNCTION kill_all_user_sessions(p_target_id UUID)
RETURNS INTEGER AS $$
DECLARE deleted_count INTEGER;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
  DELETE FROM user_sessions WHERE user_id = p_target_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. set_admin_role
CREATE OR REPLACE FUNCTION set_admin_role(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE users SET role = 'admin', updated_at = NOW() WHERE id = p_user_id;
  UPDATE auth.users SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. remove_admin_role
CREATE OR REPLACE FUNCTION remove_admin_role(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE users SET role = 'user', updated_at = NOW() WHERE id = p_user_id;
  UPDATE auth.users SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) - 'role'
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ГОТОВО! Перезагрузи админ-панель после выполнения.
`;
}

// ===== UI =====
if(el('user-name'))el('user-name').textContent=user.user_metadata?.username||'Админ';
if(el('user-avatar'))el('user-avatar').src=user.user_metadata?.avatar_url||'';
if(el('current-date'))el('current-date').textContent=new Date().toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

// ===== BAN CHECK =====
try{
  const{data:banData}=await sb.from('user_bans').select('*').eq('user_id',user.id).maybeSingle();
  if(banData){
    if(banData.banned_until && new Date(banData.banned_until)<new Date()){
      try{await sb.from('user_bans').delete().eq('user_id',user.id)}catch(e){}
    }else{
      document.body.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#ff5050;font-size:1.2rem;font-family:sans-serif"><div style="text-align:center"><div style="font-size:4rem;margin-bottom:16px">🔒</div>Account blocked<br><a href="../auth/auth.html" style="color:#ff8800;margin-top:12px;display:inline-block">Log out</a></div></div>';return;
    }
  }
}catch(e){}

// Theme
const ALL_THEMES=['dark','light','crimson','emerald','ocean','royal','cyber','midnight','sunset','lavender','mono'];
let cTh=localStorage.getItem('acx_theme')||'dark';
function aTh(t){cTh=t;localStorage.setItem('acx_theme',t);const h=document.documentElement;if(ALL_THEMES.includes(t)){h.setAttribute('data-theme',t)}else{h.removeAttribute('data-theme')}
  const icon=document.querySelector('#theme-switcher i');
  if(icon){const icons={dark:'fa-moon',light:'fa-sun',crimson:'fa-fire',emerald:'fa-leaf',ocean:'fa-water',royal:'fa-crown',cyber:'fa-bolt',midnight:'fa-star',sunset:'fa-sun',lavender:'fa-spa',mono:'fa-adjust'};icon.className='fas '+(icons[t]||'fa-moon')}}
const tsb=el('theme-switcher');if(tsb)tsb.addEventListener('click',()=>{const idx=ALL_THEMES.indexOf(cTh);aTh(ALL_THEMES[(idx+1)%ALL_THEMES.length])});
aTh(cTh);

// Hamburger
const hamburger=el('hamburger-btn'),mobileNav=el('mobile-nav'),mobileOverlay=el('mobile-overlay');
if(hamburger)hamburger.addEventListener('click',()=>{mobileNav?.classList.add('active');mobileOverlay?.classList.add('active')});
if(mobileOverlay)mobileOverlay.addEventListener('click',()=>{mobileNav?.classList.remove('active');mobileOverlay?.classList.remove('active')});
el('mobile-nav-close')?.addEventListener('click',()=>{mobileNav?.classList.remove('active');mobileOverlay?.classList.remove('active')});

// ===== TOAST =====
function toast(m,t='info',d=4000){
const c=el('toast-container');if(!c)return;
const colors={success:{bg:'rgba(68,221,102,.12)',border:'rgba(68,221,102,.25)',accent:'#44dd66',icon:'fa-check-circle'},error:{bg:'rgba(255,80,80,.12)',border:'rgba(255,80,80,.25)',accent:'#ff5050',icon:'fa-exclamation-circle'},info:{bg:'rgba(255,136,0,.12)',border:'rgba(255,136,0,.25)',accent:'#ff8800',icon:'fa-info-circle'},warning:{bg:'rgba(255,170,0,.12)',border:'rgba(255,170,0,.25)',accent:'#ffaa00',icon:'fa-exclamation-triangle'}};
const cl=colors[t]||colors.info;
const e=document.createElement('div');e.className=`toast toast-${t}`;
e.style.cssText=`background:${cl.bg};backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid ${cl.border};border-left:3px solid ${cl.accent};display:flex;align-items:center;gap:10px;`;
const ic=document.createElement('i');ic.className='fas '+cl.icon;ic.style.cssText='color:'+cl.accent+';font-size:1.1rem;flex-shrink:0';
const tx=document.createElement('span');tx.textContent=m;tx.style.flex='1';
e.appendChild(ic);e.appendChild(tx);c.appendChild(e);setTimeout(()=>{e.classList.add('removing');setTimeout(()=>e.remove(),300)},d);
}

// ===== TAB SWITCHING =====
function switchAdminTab(tabId){
document.querySelectorAll('.admin-sidebar-btn[data-admin-tab]').forEach(b=>b.classList.toggle('active',b.dataset.adminTab===tabId));
document.querySelectorAll('.admin-tab').forEach(t=>t.classList.toggle('active',t.id===`tab-${tabId}`));
if(tabId==='users')loadUsers();
if(tabId==='logs')loadLogs();
if(tabId==='news')loadNewsAdmin();
if(tabId==='bans')loadBans();
if(tabId==='dashboard')loadDashboard();
}
window.switchAdminTab=switchAdminTab;
document.querySelectorAll('.admin-sidebar-btn[data-admin-tab]').forEach(b=>b.addEventListener('click',()=>switchAdminTab(b.dataset.adminTab)));

// ===== USER DETAIL MODAL =====
function showUserDetail(u){
  const old=document.getElementById('user-detail-overlay');if(old)old.remove();
  const overlay=document.createElement('div');overlay.id='user-detail-overlay';overlay.className='modal-overlay active';
  overlay.style.cssText='display:flex;z-index:999999';
  const modal=document.createElement('div');modal.className='modal-content';modal.style.maxWidth='640px';
  const statusColor=u.status==='online'?'var(--green)':u.status==='dnd'?'var(--red)':'var(--text-3)';
  const statusText=u.status==='online'?'В сети':u.status==='dnd'?'Не беспокоить':'Не в сети';
  const isBanned=!!u.banned_until;
  const genderText=u.gender==='male'?'Мужской':u.gender==='female'?'Женский':u.gender==='other'?'Другой':'Не указан';
  const modeText=u.mc_mode==='anarchy'?'Анархия':u.mc_mode==='vanilla'?'Ванила+':'Не выбран';

  modal.innerHTML=`
  <div class="modal-header"><h2><i class="fas fa-user-circle"></i> ${u.username||'—'}</h2><button class="modal-close" id="close-user-detail">×</button></div>
  <div class="user-detail-body">
    <div class="user-detail-top">
      <div class="user-detail-avatar-wrap"><img src="${u.avatar_url||''}" class="user-detail-avatar" onerror="this.style.display='none'"><span class="user-detail-status-dot" style="background:${statusColor};box-shadow:0 0 8px ${statusColor}40"></span></div>
      <div class="user-detail-identity"><h3>${u.username||'—'}</h3><span class="user-detail-email">${u.email||'—'}</span>
        ${isBanned?'<span class="badge badge-banned">🔒 ЗАБАНЕН</span>':''}
        <span class="badge badge-${u.role==='admin'?'admin':'user'}">${u.role==='admin'?'ADMIN':'USER'}</span>
        <span class="badge badge-${u.status||'offline'}">${statusText}</span>
      </div>
    </div>
    <div class="user-detail-grid">
      <div class="ud-field"><i class="fas fa-calendar"></i><span class="ud-label">Регистрация</span><span class="ud-value">${u.created_at?new Date(u.created_at).toLocaleString('ru-RU'):'—'}</span></div>
      <div class="ud-field"><i class="fas fa-clock"></i><span class="ud-label">Последний вход</span><span class="ud-value">${u.last_login?new Date(u.last_login).toLocaleString('ru-RU'):'—'}</span></div>
      <div class="ud-field"><i class="fas fa-birthday-cake"></i><span class="ud-label">День рождения</span><span class="ud-value">${u.birthday||'Not specified'}</span></div>
      <div class="ud-field"><i class="fas fa-venus-mars"></i><span class="ud-label">Пол</span><span class="ud-value">${genderText}</span></div>
      <div class="ud-field"><i class="fas fa-gamepad"></i><span class="ud-label">MC Ник</span><span class="ud-value">${u.mc_nick||'Не указан'}</span></div>
      <div class="ud-field"><i class="fas fa-flag"></i><span class="ud-label">Режим</span><span class="ud-value">${modeText}</span></div>
      <div class="ud-field"><i class="fas fa-shield-alt"></i><span class="ud-label">2FA</span><span class="ud-value">${u.mfa_secret?'<span style="color:var(--green)">✅ Включена</span>':'<span style="color:var(--red)">❌ Отключена</span>'}</span></div>
      <div class="ud-field"><i class="fas fa-pen"></i><span class="ud-label">О себе</span><span class="ud-value">${u.description||'Нет описания'}</span></div>
    </div>
    <div class="user-detail-section"><h4><i class="fas fa-desktop"></i> Сессии</h4><div id="user-sessions-list" style="max-height:180px;overflow-y:auto">Loading...</div></div>
    <div class="user-detail-section"><h4><i class="fas fa-history"></i> Последние действия</h4><div id="user-audit-list" style="max-height:180px;overflow-y:auto">Loading...</div></div>
    <div class="user-detail-section"><h4><i class="fas fa-link"></i> Ссылки профиля</h4><div id="user-links-list">Loading...</div></div>
    <div class="user-detail-actions">
      ${isBanned?`<button class="btn-primary" id="ud-unban-btn" data-uid="${u.id}"><i class="fas fa-unlock"></i> Unban</button>`:`<button class="btn-danger" id="ud-ban-btn" data-uid="${u.id}" data-username="${u.username||''}"><i class="fas fa-ban"></i> Ban</button>`}
      <button class="btn-secondary" id="ud-role-btn" data-uid="${u.id}" data-role="${u.role||'user'}">${u.role==='admin'?'<i class="fas fa-arrow-down"></i> Снять админ':'<i class="fas fa-arrow-up"></i> Назначить админ'}</button>
      <button class="btn-danger" id="ud-kill-sessions-btn" data-uid="${u.id}" style="border-color:rgba(255,170,0,.2);color:var(--gold);background:var(--gold-soft)"><i class="fas fa-power-off"></i> Завершить сессии</button>
      <button class="btn-secondary" id="ud-reset-pw-btn" data-uid="${u.id}" data-email="${u.email||''}"><i class="fas fa-key"></i> Сбросить пароль</button>
    </div>
    ${isBanned?`<div class="user-detail-ban-info"><i class="fas fa-ban"></i> Забанен до: <strong>${u.banned_until==='permanent'?'Permanent':new Date(u.banned_until).toLocaleString('ru-RU')}</strong><br>Причина: ${u.ban_reason||'Not specified'}</div>`:''}
  </div>`;

  overlay.appendChild(modal);document.body.appendChild(overlay);
  el('close-user-detail')?.addEventListener('click',()=>overlay.remove());
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});

  // LOAD SESSIONS
  (async()=>{
    const c=document.getElementById('user-sessions-list');
    try{
      const{data:sessions,error}=await sb.from('user_sessions').select('*').eq('user_id',u.id).order('last_active',{ascending:false}).limit(10);
      if(error)throw error;
      if(!sessions||!sessions.length){c.innerHTML='<div style="color:var(--text-3);font-size:.82rem;padding:8px">No sessions</div>';return}
      c.innerHTML='';
      sessions.forEach(s=>{
        const row=document.createElement('div');row.className='ud-session-row';
        const dot=document.createElement('span');dot.className='ud-session-dot';dot.style.background=s.is_current?'var(--green)':'var(--text-3)';
        const info=document.createElement('span');info.className='ud-session-info';info.textContent=`${s.device||'Неизвестно'} • ${s.user_agent?s.user_agent.substring(0,60)+'...':'—'}`;
        const time=document.createElement('span');time.className='ud-session-time';time.textContent=new Date(s.last_active).toLocaleString('ru-RU');
        const killBtn=document.createElement('button');killBtn.className='ud-session-kill-btn';killBtn.innerHTML='<i class="fas fa-times"></i>';
        killBtn.addEventListener('click',async()=>{
          try{const{error}=await sb.from('user_sessions').delete().eq('id',s.id);if(error)throw error;toast('Session deleted','success');showUserDetail(u)}catch(e){toast('Ошибка: '+e.message,'error',6000)}
        });
        row.appendChild(dot);row.appendChild(info);row.appendChild(time);row.appendChild(killBtn);c.appendChild(row);
      });
    }catch(e){c.innerHTML=`<div style="color:var(--red);font-size:.82rem">Ошибка: ${e.message}</div>`}
  })();

  // LOAD AUDIT LOG
  (async()=>{
    const c=document.getElementById('user-audit-list');
    try{
      const{data:logs,error}=await sb.from('security_logs').select('*').eq('user_id',u.id).order('created_at',{ascending:false}).limit(15);
      if(error)throw error;
      if(!logs||!logs.length){c.innerHTML='<div style="color:var(--text-3);font-size:.82rem;padding:8px">No records</div>';return}
      c.innerHTML='';
      const aI={login:'🔑',login_failed:'❌',logout:'🚪',password_change:'🔒','2fa_enable':'🛡️','2fa_disable':'⚠️',session_kill:'💀',profile_update:'✏️',login_new_device:'🔔',status_change:'🔄',admin_ban:'🚫',admin_unban:'✅',admin_broadcast:'📢',admin_push_all:'🔔',admin_news:'📰'};
      const aN={login:'Вход',login_failed:'Неудачный вход',logout:'Выход',password_change:'Смена пароля','2fa_enable':'2FA вкл','2fa_disable':'2FA выкл',session_kill:'Сессия убита',profile_update:'Профиль',login_new_device:'Новое устройство',status_change:'Статус',admin_ban:'Бан',admin_unban:'Разбан',admin_broadcast:'Рассылка',admin_push_all:'Push всем',admin_news:'Новость'};
      logs.forEach(l=>{
        const row=document.createElement('div');row.className='ud-audit-row';
        const icon=document.createElement('span');icon.className='ud-audit-icon';icon.textContent=aI[l.action]||'📋';
        const body=document.createElement('div');body.className='ud-audit-body';
        const title=document.createElement('span');title.className='ud-audit-title';title.textContent=aN[l.action]||l.action;
        let detail='';if(l.details){try{const d=typeof l.details==='string'?JSON.parse(l.details):l.details;if(d.field)detail=' • '+d.field;if(d.from&&d.to)detail+=' ('+d.from+' → '+d.to+')'}catch(e){}}
        const meta=document.createElement('span');meta.className='ud-audit-meta';meta.textContent=new Date(l.created_at).toLocaleString('ru-RU')+(l.device?' • '+l.device:'')+detail;
        body.appendChild(title);body.appendChild(meta);row.appendChild(icon);row.appendChild(body);c.appendChild(row);
      });
    }catch(e){c.innerHTML=`<div style="color:var(--red);font-size:.82rem">Ошибка: ${e.message}</div>`}
  })();

  // LOAD PROFILE LINKS
  (async()=>{
    const c=document.getElementById('user-links-list');
    try{
      const{data:links,error}=await sb.from('profile_links').select('*').eq('user_id',u.id).order('order',{ascending:true});
      if(error)throw error;
      if(!links||!links.length){c.innerHTML='<div style="color:var(--text-3);font-size:.82rem;padding:8px">No links</div>';return}
      c.innerHTML='';
      const icons={telegram:'fab fa-telegram',youtube:'fab fa-youtube',discord:'fab fa-discord',vk:'fab fa-vk',twitter:'fab fa-x-twitter',website:'fas fa-globe',custom:'fas fa-link'};
      links.forEach(l=>{
        const a=document.createElement('a');a.className='ud-link-item';a.href=l.url||'#';a.target='_blank';a.rel='noopener';
        const ic=document.createElement('i');ic.className=icons[l.link_type]||'fas fa-link';
        const label=document.createElement('span');label.textContent=l.label||l.link_type;
        a.appendChild(ic);a.appendChild(label);c.appendChild(a);
      });
    }catch(e){c.innerHTML='<div style="color:var(--text-3);font-size:.82rem">Ошибка загрузки</div>'}
  })();

  // BAN BUTTON
  document.getElementById('ud-ban-btn')?.addEventListener('click',async function(){
    const uid=this.dataset.uid;const uname=this.dataset.username;
    const reason=prompt('Причина бана для '+uname+':');if(reason===null)return;
    const dur=prompt('Длительность (1h / 1d / 7d / 30d / permanent):','7d');if(!dur)return;
    try{
      let bannedUntil=null;
      if(dur!=='permanent'){const ms={h:3600000,d:86400000};const val=parseInt(dur);const unit=dur.replace(val,'');bannedUntil=new Date(Date.now()+(val*(ms[unit]||86400000))).toISOString()}
      const{data:banData,error:banErr}=await sb.from('user_bans').upsert({user_id:uid,reason:reason||'Rule violation',banned_until:bannedUntil,banned_by:user.id,created_at:new Date().toISOString()},{onConflict:'user_id'});
      if(banErr){toast('Ошибка бана: '+banErr.message,'error',6000);return}
      try{const{error:killErr}=await sb.rpc('kill_all_user_sessions',{p_target_id:uid});if(killErr)console.warn('Kill sessions:',killErr.message)}catch(e){console.warn('Kill sessions err:',e)}
      try{const{error:nErr}=await sb.from('user_notifications').insert({user_id:uid,type:'system',title:'Account blocked',message:'Причина: '+(reason||'Rule violation')});if(nErr)console.warn('Notif:',nErr.message)}catch(e){}
      try{const{error:lErr}=await sb.from('security_logs').insert({user_id:uid,action:'admin_ban',device:'admin',details:{reason,duration:dur,banned_by:user.id}});if(lErr)console.warn('Log:',lErr.message)}catch(e){}
      toast('User banned','success');overlay.remove();loadUsers();
    }catch(e){toast('Ошибка: '+e.message,'error',6000)}
  });

  // UNBAN BUTTON
  document.getElementById('ud-unban-btn')?.addEventListener('click',async function(){
    const uid=this.dataset.uid;if(!confirm('Unban пользователя?'))return;
    try{
      const{error:dErr}=await sb.from('user_bans').delete().eq('user_id',uid);
      if(dErr){toast('Ошибка: '+dErr.message,'error',6000);return}
      try{const{error:nErr}=await sb.from('user_notifications').insert({user_id:uid,type:'system',title:'Аккаунт разблокирован',message:'Добро пожаловать!'});if(nErr)console.warn('Notif:',nErr.message)}catch(e){}
      try{const{error:lErr}=await sb.from('security_logs').insert({user_id:uid,action:'admin_unban',device:'admin',details:{unbanned_by:user.id}});if(lErr)console.warn('Log:',lErr.message)}catch(e){}
      toast('User unbanned','success');overlay.remove();loadUsers();
    }catch(e){toast('Ошибка: '+e.message,'error',6000)}
  });

  // ROLE BUTTON
  document.getElementById('ud-role-btn')?.addEventListener('click',async function(){
    const uid=this.dataset.uid;const curRole=this.dataset.role;
    const newRole=curRole==='admin'?'user':'admin';
    if(!confirm(newRole==='admin'?'Назначить администратором?':'Снять права администратора?'))return;
    try{
      let r;
      if(newRole==='admin'){r=await sb.rpc('set_admin_role',{p_user_id:uid})}
      else{r=await sb.rpc('remove_admin_role',{p_user_id:uid})}
      if(r.error){toast('Ошибка: '+r.error.message,'error',6000);return}
      try{const{error:lErr}=await sb.from('security_logs').insert({user_id:uid,action:'profile_update',device:'admin',details:{field:'role',from:curRole,to:newRole,by:user.id}});if(lErr)console.warn('Log:',lErr.message)}catch(e){}
      toast('Role updated','success');overlay.remove();loadUsers();
    }catch(e){toast('Ошибка: '+e.message,'error',6000)}
  });

  // KILL SESSIONS BUTTON
  document.getElementById('ud-kill-sessions-btn')?.addEventListener('click',async function(){
    const uid=this.dataset.uid;if(!confirm('Завершить ВСЕ сессии?'))return;
    try{
      const r=await sb.rpc('kill_all_user_sessions',{p_target_id:uid});
      if(r.error){toast('Ошибка: '+r.error.message,'error',6000);return}
      toast('Sessions terminated: '+(r.data||0),'success');
    }catch(e){toast('Ошибка: '+e.message,'error',6000)}
  });

  // RESET PASSWORD BUTTON
  document.getElementById('ud-reset-pw-btn')?.addEventListener('click',async function(){
    const email=this.dataset.email;if(!email){toast('Email не указан','error');return}
    if(!confirm('Отправить ссылку для сброса пароля на '+email+'?'))return;
    try{const{error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/en/auth/auth.html'});if(error)throw error;toast('Email sent','success')}catch(e){toast('Ошибка: '+e.message,'error',6000)}
  });
}

// ===== DASHBOARD =====
async function loadDashboard(){
try{const{count,error}=await sb.from('users').select('*',{count:'exact',head:true});
if(error)console.warn('Users count error:',error.message);
if(el('stat-total-users'))el('stat-total-users').textContent=count??'?'}catch(e){if(el('stat-total-users'))el('stat-total-users').textContent='?'}
try{const r=await fetch('https://api.mcsrvstat.us/3/play.arescraftx.online');const d=await r.json();
if(el('stat-online'))el('stat-online').textContent=d.players?.online??'—'}catch(e){if(el('stat-online'))el('stat-online').textContent='—'}
const now=new Date();const devStart=new Date(2026,6,15);const launchDate=new Date(2026,7,20);
if(el('stat-days-dev'))el('stat-days-dev').textContent=Math.floor((now-devStart)/(864e5))+' дн.';
if(el('stat-days-launch'))el('stat-days-launch').textContent=Math.max(0,Math.floor((launchDate-now)/(864e5)))+' дн.';
try{const{data:users}=await sb.from('users').select('mfa_secret');if(el('stat-2fa'))el('stat-2fa').textContent=users?.filter(u=>u.mfa_secret).length||0}catch(e){}
try{const{count:banCount}=await sb.from('user_bans').select('*',{count:'exact',head:true});if(el('stat-incidents'))el('stat-incidents').textContent=banCount||0}catch(e){}
await loadSettingsIntoForm();
}
loadDashboard();

// ===== USERS TABLE =====
async function loadUsers(search=''){
const tbody=el('users-table-body');if(!tbody)return;
try{
  const{data:users,error}=await sb.from('users').select('*').order('created_at',{ascending:false}).limit(200);
  if(error){tbody.innerHTML=`<tr><td colspan="8" style="color:var(--red)">Ошибка загрузки: ${error.message}</td></tr>`;return}
  const{data:bans}=await sb.from('user_bans').select('*');
  const banMap={};(bans||[]).forEach(b=>{banMap[b.user_id]=b});

  tbody.textContent='';
  const filtered=search?users.filter(u=>(u.username||'').toLowerCase().includes(search.toLowerCase())||(u.email||'').toLowerCase().includes(search.toLowerCase())):users;
  if(!filtered||!filtered.length){tbody.innerHTML='<tr><td colspan="8" style="text-align:center;color:var(--text-3)">No users</td></tr>';return}

  filtered.forEach(u=>{
    const tr=document.createElement('tr');
    const ban=banMap[u.id];const isBanned=!!ban;
    const statusColor=u.status==='online'?'var(--green)':u.status==='dnd'?'var(--red)':'var(--text-3)';
    const statusText=u.status==='online'?'В сети':u.status==='dnd'?'DND':'Оффлайн';
    const lastLogin=u.last_login?new Date(u.last_login).toLocaleString('ru-RU'):'—';

    const tdUser=document.createElement('td');const userName=document.createElement('strong');userName.style.color='var(--text-1)';userName.textContent=u.username||'—';tdUser.appendChild(userName);
    const tdEmail=document.createElement('td');tdEmail.style.fontSize='.78rem';tdEmail.textContent=u.email||'—';
    const tdStatus=document.createElement('td');const dot=document.createElement('span');dot.className='status-dot';dot.style.background=statusColor;const statusSpan=document.createElement('span');statusSpan.textContent=statusText;tdStatus.appendChild(dot);tdStatus.appendChild(statusSpan);
    const td2fa=document.createElement('td');const badge2fa=document.createElement('span');badge2fa.className='badge '+(u.mfa_secret?'badge-on':'badge-off');badge2fa.textContent=u.mfa_secret?'Вкл':'Выкл';td2fa.appendChild(badge2fa);
    const tdRole=document.createElement('td');const badgeRole=document.createElement('span');badgeRole.className='badge '+(u.role==='admin'?'badge-admin':'badge-user');badgeRole.textContent=u.role==='admin'?'Admin':'User';tdRole.appendChild(badgeRole);
    const tdBan=document.createElement('td');
    if(isBanned){const b=document.createElement('span');b.className='badge badge-banned';b.textContent='🔒 Бан';tdBan.appendChild(b)}
    else{const b=document.createElement('span');b.className='badge badge-on';b.textContent='Активен';tdBan.appendChild(b)}
    const tdLast=document.createElement('td');tdLast.style.fontSize='.75rem';tdLast.textContent=lastLogin;
    const tdActions=document.createElement('td');tdActions.className='action-btns';
    const viewBtn=document.createElement('button');viewBtn.className='action-btn';viewBtn.innerHTML='<i class="fas fa-eye"></i> Открыть';
    const uWithBan={...u,banned_until:ban?.banned_until||null,ban_reason:ban?.reason||null};
    viewBtn.addEventListener('click',()=>showUserDetail(uWithBan));tdActions.appendChild(viewBtn);

    tr.appendChild(tdUser);tr.appendChild(tdEmail);tr.appendChild(tdStatus);tr.appendChild(td2fa);
    tr.appendChild(tdRole);tr.appendChild(tdBan);tr.appendChild(tdLast);tr.appendChild(tdActions);
    tbody.appendChild(tr);
  });
}catch(e){tbody.innerHTML=`<tr><td colspan="8" style="text-align:center;color:var(--red)">Ошибка: ${e.message}</td></tr>`}
}
el('user-search')?.addEventListener('input',function(){loadUsers(this.value)});

// ===== SETTINGS =====
let siteSettings={};
async function loadSettingsIntoForm(){
try{const{data,error}=await sb.from('site_settings').select('*');
if(error){console.warn('Settings load:',error.message);return}
siteSettings={};(data||[]).forEach(s=>{siteSettings[s.key]=s.value});
}catch(e){siteSettings={}}
if(el('set-launch-date'))el('set-launch-date').value=siteSettings.launch_date||'2026-08-20';
if(el('set-dev-start'))el('set-dev-start').value=siteSettings.dev_start_date||'2026-07-15';
if(el('set-site-version'))el('set-site-version').value=siteSettings.site_version||'2.1.0';
if(el('set-donations-open'))el('set-donations-open').checked=!!siteSettings.donations_open;
if(el('set-registration-open'))el('set-registration-open').checked=siteSettings.registration_open!==false;
if(el('set-maintenance'))el('set-maintenance').checked=!!siteSettings.maintenance;
if(el('set-show-online'))el('set-show-online').checked=siteSettings.show_online!==false;
if(el('set-announcement'))el('set-announcement').value=siteSettings.announcement||'';
if(el('set-server-ip'))el('set-server-ip').value=siteSettings.server_ip||'play.arescraftx.online';
if(el('set-server-versions'))el('set-server-versions').value=siteSettings.server_versions||'1.20–1.21.11';
if(el('set-ranks-visible'))el('set-ranks-visible').checked=!!siteSettings.ranks_visible;
}

el('save-settings-btn')?.addEventListener('click',async()=>{
const btn=el('save-settings-btn');btn.disabled=true;btn.innerHTML='⏳ Сохранение...';
try{
  const rows=[
    {key:'launch_date',value:el('set-launch-date')?.value||'2026-08-20'},
    {key:'dev_start_date',value:el('set-dev-start')?.value||'2026-07-15'},
    {key:'site_version',value:el('set-site-version')?.value||'2.1.0'},
    {key:'donations_open',value:!!el('set-donations-open')?.checked},
    {key:'registration_open',value:el('set-registration-open')?.checked??true},
    {key:'maintenance',value:!!el('set-maintenance')?.checked},
    {key:'show_online',value:el('set-show-online')?.checked??true},
    {key:'announcement',value:el('set-announcement')?.value||''},
    {key:'server_ip',value:el('set-server-ip')?.value||'play.arescraftx.online'},
    {key:'server_versions',value:el('set-server-versions')?.value||'1.20–1.21.11'},
    {key:'ranks_visible',value:!!el('set-ranks-visible')?.checked}
  ];
  let saved=0,failed=0,lastErr='';
  for(const r of rows){
    const{error}=await sb.from('site_settings').upsert(r,{onConflict:'key'});
    if(error){failed++;lastErr=error.message;console.warn('Settings save',r.key,error.message)}
    else saved++;
  }
  if(failed>0){
    toast(`❌ Сохранено ${saved}/${rows.length}. Ошибка: ${lastErr}`,'error',8000);
    if(!rlsOk)toast('⚠️ RLS блокирует запись! Нажми красный баннер сверху.','error',10000);
  }else{
    toast(`✅ Все настройки сохранены (${saved})`,'success');
  }
}catch(e){toast('❌ Ошибка: '+e.message,'error',6000)}
btn.disabled=false;btn.innerHTML='<i class="fas fa-save"></i> Сохранить настройки';
});

el('save-server-btn')?.addEventListener('click',async()=>{
const btn=el('save-server-btn');btn.disabled=true;btn.innerHTML='⏳ Сохранение...';
try{
  const rows=[
    {key:'server_ip',value:el('set-server-ip')?.value||'play.arescraftx.online'},
    {key:'server_versions',value:el('set-server-versions')?.value||'1.20–1.21.11'},
    {key:'ranks_visible',value:!!el('set-ranks-visible')?.checked}
  ];
  let saved=0,failed=0,lastErr='';
  for(const r of rows){
    const{error}=await sb.from('site_settings').upsert(r,{onConflict:'key'});
    if(error){failed++;lastErr=error.message;console.warn('Server settings',r.key,error.message)}
    else saved++;
  }
  if(failed>0){toast(`❌ Ошибка: ${lastErr}`,'error',8000)}else{toast('✅ Server settings saved','success')}
}catch(e){toast('❌ Ошибка: '+e.message,'error',6000)}
btn.disabled=false;btn.innerHTML='<i class="fas fa-save"></i> Сохранить';
});

// ===== NEWS =====
async function loadNewsAdmin(){
const list=el('news-list-admin');if(!list)return;
try{const{data,error}=await sb.from('news').select('*').order('created_at',{ascending:false}).limit(50);
if(error){list.innerHTML=`<div style="color:var(--red)">Ошибка: ${error.message}</div>`;return}
const newsItems=data||[];list.textContent='';
if(!newsItems.length){list.innerHTML='<div style="text-align:center;color:var(--text-3);padding:20px">No news</div>';return}
newsItems.forEach(n=>{
const item=document.createElement('div');item.className='news-admin-item';
const infoDiv=document.createElement('div');infoDiv.className='news-admin-info';
const titleDiv=document.createElement('div');titleDiv.className='news-admin-title';titleDiv.textContent=n.title||'Untitled';
const metaDiv=document.createElement('div');metaDiv.className='news-admin-meta';metaDiv.textContent=(n.date||'')+' • '+(n.category||'');
infoDiv.appendChild(titleDiv);infoDiv.appendChild(metaDiv);
const actionsDiv=document.createElement('div');actionsDiv.className='news-admin-actions';
const editBtn=document.createElement('button');editBtn.className='action-btn';editBtn.innerHTML='<i class="fas fa-edit"></i>';
editBtn.addEventListener('click',()=>editNews(n));
const delBtn=document.createElement('button');delBtn.className='action-btn danger';delBtn.innerHTML='<i class="fas fa-trash"></i>';
delBtn.addEventListener('click',async()=>{
  if(!confirm('Удалить новость?'))return;
  try{const{error}=await sb.from('news').delete().eq('id',n.id);if(error)throw error;toast('Deleted','success');loadNewsAdmin()}catch(e){toast('Ошибка: '+e.message,'error',6000)}
});
actionsDiv.appendChild(editBtn);actionsDiv.appendChild(delBtn);
item.appendChild(infoDiv);item.appendChild(actionsDiv);list.appendChild(item)});
}catch(e){list.innerHTML=`<div style="color:var(--red)">Ошибка: ${e.message}</div>`}
}

function editNews(n){el('news-form-card').style.display='block';el('news-title').value=n.title||'';el('news-content').value=n.content||'';el('news-date').value=n.date||'';el('news-category').value=n.category||'info';el('news-edit-id').value=n.id||'';window.scrollTo({top:0,behavior:'smooth'})}

el('add-news-btn')?.addEventListener('click',()=>{el('news-form-card').style.display='block';el('news-title').value='';el('news-content').value='';el('news-date').value='';el('news-category').value='info';el('news-edit-id').value='';el('news-title').focus()});
el('cancel-news-btn')?.addEventListener('click',()=>{el('news-form-card').style.display='none'});
el('save-news-btn')?.addEventListener('click',async()=>{
const title=el('news-title')?.value.trim();const content=el('news-content')?.value.trim();const date=el('news-date')?.value.trim();const category=el('news-category')?.value;const editId=el('news-edit-id')?.value;
if(!title||!content){toast('Fill in title and content','error');return}
try{let r;
if(editId){r=await sb.from('news').update({title,content,date,category,updated_at:new Date().toISOString()}).eq('id',editId)}
else{r=await sb.from('news').insert({title,content,date,category,author_id:user.id,published:true,created_at:new Date().toISOString()})}
if(r.error)throw r.error;
toast(editId?'✅ Updated':'✅ Added','success');el('news-form-card').style.display='none';loadNewsAdmin();
}catch(e){toast('❌ Ошибка: '+e.message,'error',6000)}
});

// ===== LOGS =====
async function loadLogs(search=''){
const tbody=el('logs-table-body');if(!tbody)return;
try{
  const{data,error}=await sb.from('security_logs').select('*').order('created_at',{ascending:false}).limit(200);
  if(error){tbody.innerHTML=`<tr><td colspan="5" style="color:var(--red)">Ошибка: ${error.message}</td></tr>`;return}
  tbody.textContent='';
  const filtered=search?(data||[]).filter(l=>(l.action||'').toLowerCase().includes(search.toLowerCase())||(l.user_id||'').toLowerCase().includes(search.toLowerCase())):(data||[]);
  if(!filtered.length){tbody.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--text-3)">No records</td></tr>';return}
  const userIds=[...new Set(filtered.map(l=>l.user_id).filter(Boolean))];
  let userMap={};
  if(userIds.length){const{data:uData}=await sb.from('users').select('id,username').in('id',userIds);(uData||[]).forEach(u=>{userMap[u.id]=u.username})}
  const aI={login:'🔑',login_failed:'❌',logout:'🚪',password_change:'🔒','2fa_enable':'🛡️','2fa_disable':'⚠️',session_kill:'💀',profile_update:'✏️',login_new_device:'🔔',admin_ban:'🚫',admin_unban:'✅'};
  filtered.forEach(l=>{const tr=document.createElement('tr');
  const tdTime=document.createElement('td');tdTime.style.cssText='font-size:.75rem;white-space:nowrap';tdTime.textContent=new Date(l.created_at).toLocaleString('ru-RU');
  const tdUser=document.createElement('td');tdUser.textContent=userMap[l.user_id]||l.user_id?.substring(0,8)||'—';
  const tdAction=document.createElement('td');tdAction.textContent=(aI[l.action]||'📋')+' '+(l.action||'');
  const tdDevice=document.createElement('td');tdDevice.style.fontSize='.78rem';tdDevice.textContent=l.device||'—';
  const tdIP=document.createElement('td');tdIP.style.fontSize='.78rem';tdIP.textContent=l.ip_address||'—';
  tr.appendChild(tdTime);tr.appendChild(tdUser);tr.appendChild(tdAction);tr.appendChild(tdDevice);tr.appendChild(tdIP);
  tbody.appendChild(tr)});
}catch(e){tbody.innerHTML=`<tr><td colspan="5" style="color:var(--red)">Ошибка: ${e.message}</td></tr>`}
}
el('log-search')?.addEventListener('input',function(){loadLogs(this.value)});

// ===== BANS TAB =====
async function loadBans(){
const list=el('bans-list');if(!list)return;
try{
  const{data:bans,error}=await sb.from('user_bans').select('*').order('created_at',{ascending:false}).limit(100);
  if(error){list.innerHTML=`<div style="color:var(--red)">Ошибка: ${error.message}</div>`;return}
  if(!bans||!bans.length){list.innerHTML='<div style="text-align:center;color:var(--text-3);padding:20px">No banned users</div>';return}
  list.innerHTML='';
  const allIds=[...new Set([...bans.map(b=>b.user_id).filter(Boolean),...bans.map(b=>b.banned_by).filter(Boolean)])];
  let userMap={},emailMap={};
  if(allIds.length){const{data:uData}=await sb.from('users').select('id,username,email').in('id',allIds);(uData||[]).forEach(u=>{userMap[u.id]=u.username;emailMap[u.id]=u.email})}

  const table=document.createElement('table');table.className='admin-table';
  const thead=document.createElement('thead');thead.innerHTML='<tr><th>Пользователь</th><th>Email</th><th>Причина</th><th>До</th><th>Дата</th><th>Действия</th></tr>';
  table.appendChild(thead);const tbody=document.createElement('tbody');
  bans.forEach(b=>{
    const tr=document.createElement('tr');
    const tdUser=document.createElement('td');tdUser.innerHTML='<strong>'+(userMap[b.user_id]||'—')+'</strong>';
    const tdEmail=document.createElement('td');tdEmail.style.fontSize='.78rem';tdEmail.textContent=emailMap[b.user_id]||'—';
    const tdReason=document.createElement('td');tdReason.textContent=b.reason||'Not specified';
    const tdUntil=document.createElement('td');tdUntil.style.fontSize='.78rem';tdUntil.textContent=!b.banned_until?'Permanent':new Date(b.banned_until).toLocaleString('ru-RU');
    const tdDate=document.createElement('td');tdDate.style.fontSize='.75rem';tdDate.textContent=new Date(b.created_at).toLocaleString('ru-RU');
    const tdActions=document.createElement('td');tdActions.className='action-btns';
    const unbanBtn=document.createElement('button');unbanBtn.className='action-btn';unbanBtn.innerHTML='<i class="fas fa-unlock"></i> Unban';
    unbanBtn.addEventListener('click',async()=>{
      if(!confirm('Unban '+(userMap[b.user_id]||'пользователя')+'?'))return;
      try{
        const{error:dErr}=await sb.from('user_bans').delete().eq('user_id',b.user_id);
        if(dErr){toast('Ошибка: '+dErr.message,'error',6000);return}
        try{const{error:nErr}=await sb.from('user_notifications').insert({user_id:b.user_id,type:'system',title:'Аккаунт разблокирован',message:'Добро пожаловать!'});if(nErr)console.warn('Notif:',nErr.message)}catch(e){}
        toast('Разбанен','success');loadBans();loadUsers(el('user-search')?.value||'');
      }catch(e){toast('Ошибка: '+e.message,'error',6000)}
    });
    tdActions.appendChild(unbanBtn);tr.appendChild(tdUser);tr.appendChild(tdEmail);tr.appendChild(tdReason);tr.appendChild(tdUntil);tr.appendChild(tdDate);tr.appendChild(tdActions);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);list.appendChild(table);
}catch(e){list.innerHTML=`<div style="color:var(--red)">Ошибка: ${e.message}</div>`}
}

// Ban from bans tab
el('ban-btn')?.addEventListener('click',async()=>{
const userId=el('ban-user-id')?.value.trim();const reason=el('ban-reason')?.value.trim();
if(!userId){toast('Enter email or ID','error');return}
try{
  let targetId=userId;
  if(!userId.includes('-')&&!userId.includes('@')){
    const{data:found,error}=await sb.from('users').select('id').ilike('username',userId).limit(1);
    if(error){toast('Ошибка поиска: '+error.message,'error',6000);return}
    if(found&&found.length)targetId=found[0].id;else{toast('User not found','error');return}
  }else if(userId.includes('@')){
    const{data:found,error}=await sb.from('users').select('id').eq('email',userId).limit(1);
    if(error){toast('Ошибка поиска: '+error.message,'error',6000);return}
    if(found&&found.length)targetId=found[0].id;else{toast('Email not found','error');return}
  }
  const{error:banErr}=await sb.from('user_bans').upsert({user_id:targetId,reason:reason||'Rule violation',banned_by:user.id,created_at:new Date().toISOString()},{onConflict:'user_id'});
  if(banErr){toast('Ошибка бана: '+banErr.message,'error',6000);return}
  try{const{error:killErr}=await sb.rpc('kill_all_user_sessions',{p_target_id:targetId});if(killErr)console.warn('Kill:',killErr.message)}catch(e){console.warn('Kill err:',e)}
  try{const{error:nErr}=await sb.from('user_notifications').insert({user_id:targetId,type:'system',title:'Account blocked',message:'Причина: '+(reason||'Violation')});if(nErr)console.warn('Notif:',nErr.message)}catch(e){}
  toast('User banned','success');el('ban-user-id').value='';el('ban-reason').value='';loadBans();
}catch(e){toast('Ошибка: '+e.message,'error',6000)}
});

// Broadcast
window.adminBroadcast=async function(){
  const subject=prompt('Тема рассылки:');if(!subject)return;
  const message=prompt('Текст сообщения:');if(!message)return;
  try{
    const{data:users,error}=await sb.from('users').select('email');
    if(error){toast('Ошибка: '+error.message,'error',6000);return}
    if(!users?.length){toast('No users','info');return}
    let sent=0;
    for(const u of users){
      try{await fetch('https://api.emailjs.com/api/v1.0/email/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service_id:'service_wao8uyu',template_id:'template_aoqajd5',user_id:'kKTaWZRSBG53fUs48',template_params:{to_email:u.email,email:u.email,user_email:u.email,verification_code:subject,site_name:message}})});sent++}catch(e){}
    }
    toast('Sent '+sent+'/'+users.length,'success');
  }catch(e){toast('Ошибка: '+e.message,'error',6000)}
};

// Push all
window.adminPushAll=async function(){
  const title=prompt('Заголовок push:');if(!title)return;
  const message=prompt('Текст push:');if(!message)return;
  try{
    const{data:subs,error}=await sb.from('push_subscriptions').select('user_id');
    if(error){toast('Ошибка: '+error.message,'error',6000);return}
    if(!subs?.length){toast('No subscribers','info');return}
    const uniqueIds=[...new Set(subs.map(s=>s.user_id))];
    const{error:nErr}=await sb.from('user_notifications').insert(uniqueIds.map(uid=>({user_id:uid,type:'system',title,message,data:{admin_push:true}})));
    if(nErr){toast('Ошибка: '+nErr.message,'error',6000);return}
    toast('Push sent '+uniqueIds.length+' users','success');
  }catch(e){toast('Ошибка: '+e.message,'error',6000)}
};

console.log('✅ AresCraftX Admin v4 загружен. RLS:',rlsOk?'OK':'БЛОКИРУЕТ');
});
