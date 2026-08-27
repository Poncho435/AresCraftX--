// i.js — Init: Supabase, session, shared globals, BAN CHECK
const SU='https://ggyaitqgukjgcjscvwjj.supabase.co';
const SK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdneWFpdHFndWtqZ2Nqc2N2d2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MzQyMjMsImV4cCI6MjEwMzQxMDIyM30.-q2fXEDe93wverb3qYgDkrQqnR_QLbytXQYKDFvlUBs';

// Synchronous globals on window (accessible from all other script files)
window.sb=window.supabase.createClient(SU,SK);
window.el=id=>document.getElementById(id);

const b32='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function b32d(s){s=s.replace(/=+$/,'').toUpperCase();const b=[];let bits=0,v=0;for(let i=0;i<s.length;i++){const idx=b32.indexOf(s[i]);if(idx===-1)continue;v=(v<<5)|idx;bits+=5;if(bits>=8){b.push((v>>>(bits-8))&0xff);bits-=8}}return new Uint8Array(b)}
function b32e(bytes){let bits=0,v=0,o='';for(let i=0;i<bytes.length;i++){v=(v<<8)|bytes[i];bits+=8;while(bits>=5){o+=b32[(v>>>(bits-5))&31];bits-=5}}if(bits>0)o+=b32[(v<<(5-bits))&31];while(o.length%8!==0)o+='=';return o}
window.genSec=function(l=20){const a=new Uint8Array(l);crypto.getRandomValues(a);return b32e(a)};
window.genTOTP=async function(s,p=30,d=6,o=0){const dd=b32d(s);const c=Math.floor(Date.now()/1000/p)+o;const cb=new ArrayBuffer(8);new DataView(cb).setBigUint64(0,BigInt(c),false);const k=await crypto.subtle.importKey('raw',dd,{name:'HMAC',hash:'SHA-1'},false,['sign']);const h=await crypto.subtle.sign('HMAC',k,cb);const hb=new Uint8Array(h);const ob=hb[hb.length-1]&0xf;const bin=((hb[ob]&0x7f)<<24)|((hb[ob+1]&0xff)<<16)|((hb[ob+2]&0xff)<<8)|(hb[ob+3]&0xff);return(bin%Math.pow(10,d)).toString().padStart(d,'0')};
window.verTOTP=async function(code,sec,w=2){const o=[];for(let i=-w;i<=w;i++)o.push(i);const codes=await Promise.all(o.map(off=>genTOTP(sec,30,6,off)));return codes.includes(code)};
window.toast=function(m,t='info',d=4000){const c=document.getElementById('toast-container');if(!c)return;
const colors={success:{bg:'rgba(68,221,102,.12)',border:'rgba(68,221,102,.25)',accent:'#44dd66',icon:'fa-check-circle'},error:{bg:'rgba(255,80,80,.12)',border:'rgba(255,80,80,.25)',accent:'#ff5050',icon:'fa-exclamation-circle'},info:{bg:'rgba(255,136,0,.12)',border:'rgba(255,136,0,.25)',accent:'#ff8800',icon:'fa-info-circle'},warning:{bg:'rgba(255,170,0,.12)',border:'rgba(255,170,0,.25)',accent:'#ffaa00',icon:'fa-exclamation-triangle'}};
const cl=colors[t]||colors.info;
const e=document.createElement('div');e.className=`toast toast-${t}`;
e.style.cssText=`background:${cl.bg};backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid ${cl.border};border-left:3px solid ${cl.accent};display:flex;align-items:center;gap:10px;`;
const ic=document.createElement('i');ic.className='fas '+cl.icon;ic.style.cssText='color:'+cl.accent+';font-size:1.1rem;flex-shrink:0';
const tx=document.createElement('span');tx.textContent=m;tx.style.flex='1';
e.appendChild(ic);e.appendChild(tx);c.appendChild(e);setTimeout(()=>{e.classList.add('removing');setTimeout(()=>e.remove(),300)},d)};
window.genAv=function(l){const c=document.createElement('canvas');c.width=200;c.height=200;const ctx=c.getContext('2d');const g=ctx.createLinearGradient(0,0,200,200);g.addColorStop(0,'#ff8800');g.addColorStop(1,'#cc4400');ctx.fillStyle=g;ctx.beginPath();ctx.arc(100,100,96,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 88px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(l.toUpperCase(),100,104);return c.toDataURL('image/png')};

// ===== ФУНКЦИЯ: ПОКАЗАТЬ ЭКРАН БАНА =====
window.showBannedScreen=function(banInfo){
  document.body.innerHTML=`
  <div style="position:fixed;inset:0;background:linear-gradient(135deg,#1a0a0a,#2a0a0a);display:flex;align-items:center;justify-content:center;z-index:999999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
    <div style="text-align:center;max-width:420px;padding:40px">
      <div style="font-size:4rem;margin-bottom:20px">🔒</div>
      <h1 style="color:#ff5050;font-size:1.6rem;margin:0 0 12px;font-weight:800">Аккаунт заблокирован</h1>
      <p style="color:#cc8888;font-size:.92rem;line-height:1.6;margin:0 0 20px">Ваш аккаунт был заблокирован администрацией AresCraftX</p>
      ${banInfo?.reason?`<div style="background:rgba(255,80,80,.08);border:1px solid rgba(255,80,80,.15);border-radius:12px;padding:14px;margin-bottom:16px"><div style="color:#ff8888;font-size:.78rem;font-weight:600;margin-bottom:4px">Причина:</div><div style="color:#ffaaaa;font-size:.88rem">${banInfo.reason}</div></div>`:''}
      ${banInfo?.banned_until?`<div style="color:#ff8888;font-size:.82rem;margin-bottom:16px">Бан до: <strong>${banInfo.banned_until==='permanent'?'Навсегда':new Date(banInfo.banned_until).toLocaleString('ru-RU')}</strong></div>`:''}
      <button onclick="document.querySelector('#acx-logout-btn')?.click()" id="acx-logout-btn" style="padding:12px 28px;background:rgba(255,80,80,.15);border:1px solid rgba(255,80,80,.25);border-radius:10px;color:#ff8888;font-size:.88rem;font-weight:700;cursor:pointer;transition:.2s">Выйти из аккаунта</button>
      <div style="color:#664444;font-size:.75rem;margin-top:20px">Если считаете что бан ошибочен — свяжитесь с администрацией</div>
    </div>
  </div>`;
  // Кнопка выхода
  document.getElementById('acx-logout-btn')?.addEventListener('click',async()=>{
    try{await sb.auth.signOut()}catch(e){}
    window.location.href='../auth/auth.html';
  });
};

// Async init — must complete before other modules run
(async()=>{
const{data:{session}}=await sb.auth.getSession();
if(!session?.user){window.location.href='../auth/auth.html';return}

window.user=session.user;
window.meta=user.user_metadata||{};

// ===== ЗАГРУЗКА НАСТРОЕК САЙТА ИЗ БАЗЫ =====
window.siteSettings={};
try{
  const{data:settingsData,error:settingsErr}=await sb.from('site_settings').select('*');
  if(settingsErr)console.warn('[ACX] Settings load error:',settingsErr.message);
  if(settingsData){settingsData.forEach(s=>{siteSettings[s.key]=s.value});console.log('[ACX] Настройки загружены:',Object.keys(siteSettings).length,'ключей')}
}catch(e){console.warn('[ACX] Settings exception:',e)}

// ===== РЕЖИМ ОБСЛУЖИВАНИЯ =====
if(siteSettings.maintenance===true||siteSettings.maintenance==='true'){
  document.body.innerHTML=`
  <div style="position:fixed;inset:0;background:linear-gradient(135deg,#0a0808,#1a1008);display:flex;align-items:center;justify-content:center;z-index:999999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
    <div style="text-align:center;max-width:420px;padding:40px">
      <div style="font-size:4rem;margin-bottom:20px">🔧</div>
      <h1 style="color:#ff8800;font-size:1.6rem;margin:0 0 12px;font-weight:800">Технические работы</h1>
      <p style="color:#887766;font-size:.92rem;line-height:1.6">Сайт временно недоступен. Мы уже работаем над восстановлением.</p>
      <p style="color:#665544;font-size:.82rem;margin-top:16px">Попробуйте позже</p>
      <button onclick="location.reload()" style="margin-top:20px;padding:10px 24px;background:linear-gradient(135deg,#ff8800,#e06500);border:none;border-radius:8px;color:#0a0808;font-weight:700;cursor:pointer">Обновить</button>
    </div>
  </div>`;
  return;
}

// ===== БАННЕР ОБЪЯВЛЕНИЯ =====
if(siteSettings.announcement && siteSettings.announcement!=='null' && siteSettings.announcement!==null){
  const annText=typeof siteSettings.announcement==='string'?siteSettings.announcement:String(siteSettings.announcement);
  if(annText.trim()){
    const annType=siteSettings.announcement_type||'info';
    const annColors={info:{bg:'rgba(59,130,246,.12)',border:'rgba(59,130,246,.25)',accent:'#3b82f6',icon:'fa-info-circle'},warning:{bg:'rgba(255,170,0,.12)',border:'rgba(255,170,0,.25)',accent:'#ffaa00',icon:'fa-exclamation-triangle'},success:{bg:'rgba(68,221,102,.12)',border:'rgba(68,221,102,.25)',accent:'#44dd66',icon:'fa-check-circle'},danger:{bg:'rgba(255,80,80,.12)',border:'rgba(255,80,80,.25)',accent:'#ff5050',icon:'fa-exclamation-circle'}};
    const c=annColors[annType]||annColors.info;
    const banner=document.createElement('div');
    banner.id='announcement-banner';
    banner.style.cssText=`position:sticky;top:0;z-index:9998;padding:10px 20px;background:${c.bg};backdrop-filter:blur(12px);border-bottom:1px solid ${c.border};display:flex;align-items:center;justify-content:center;gap:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:.88rem`;
    banner.innerHTML=`<i class="fas ${c.icon}" style="color:${c.accent};font-size:1rem"></i><span style="color:var(--text-1)">${annText}</span><button onclick="this.parentElement.remove()" style="margin-left:12px;background:none;border:none;color:var(--text-3);cursor:pointer;font-size:1.1rem">×</button>`;
    document.body.prepend(banner);
  }
}

// ===== ПРОВЕРКА БАНА =====
try{
  const{data:banData,error:banErr}=await sb.from('user_bans').select('*').eq('user_id',user.id).maybeSingle();
  if(banErr)console.warn('Ban check error:',banErr.message);
  if(banData){
    // Проверяем не истёк ли бан
    if(banData.banned_until && new Date(banData.banned_until) < new Date()){
      // Бан истёк — удаляем
      try{await sb.from('user_bans').delete().eq('user_id',user.id)}catch(e){}
    }else{
      // Забанен — показываем экран бана
      showBannedScreen(banData);
      return; // НЕ загружаем остальной сайт
    }
  }
}catch(e){console.warn('Ban check exception:',e)}

let ud=null;
try{const{data}=await sb.from('users').select('*').eq('id',user.id).maybeSingle();ud=data}catch(e){}
window.ud=ud;
window.un=ud?.username||meta.username||user.email?.split('@')[0]||'Игрок';

let avSrc=meta.avatar_url||genAv(un.charAt(0));
if(typeof avSrc==='string'&&(avSrc.trim().toLowerCase().startsWith('javascript:')||avSrc.trim().toLowerCase().startsWith('data:text/')||avSrc.trim().toLowerCase().startsWith('vbscript:'))){avSrc=genAv(un.charAt(0))}
window.avSrc=avSrc;

window.bd=ud?.birthday||meta.birthday||'';
window.ll=ud?.last_login||meta.last_login;
window.mcN=ud?.mc_nick||meta.mc_nick||'';
window.mcM=ud?.mc_mode||meta.mc_mode||'';
window.bday=bd?new Date(bd).toLocaleDateString('ru-RU'):'Не указана';
window.isAdmin=ud?.role==='admin';

if(el('user-avatar'))el('user-avatar').src=avSrc;
if(el('user-name'))el('user-name').textContent=un;
if(el('hero-avatar'))el('hero-avatar').src=avSrc;
if(el('profile-avatar'))el('profile-avatar').src=avSrc;
if(el('profile-username'))el('profile-username').textContent=un;
if(el('profile-email'))el('profile-email').textContent=ud?.email||user.email||'-';
if(el('profile-description'))el('profile-description').textContent=ud?.description||meta.description||'Нет описания';
if(el('stat-username'))el('stat-username').textContent=un;
if(el('stat-email'))el('stat-email').textContent=ud?.email||user.email||'-';
if(el('stat-birthday'))el('stat-birthday').textContent=bday;
if(el('stat-last-login'))el('stat-last-login').textContent=ll?new Date(ll).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Первый вход';
if(el('stat-created'))el('stat-created').textContent=user.created_at?new Date(user.created_at).toLocaleDateString('ru-RU'):'-';
if(el('stat-2fa'))el('stat-2fa').textContent=meta.mfa_enabled?'✅ Включена':'❌ Отключена';
if(el('stat-mc-nick'))el('stat-mc-nick').textContent=mcN||'Не указан';
if(el('stat-mc-mode'))el('stat-mc-mode').textContent=mcM==='anarchy'?'Анархия':mcM==='vanilla'?'Ванила+':'Не выбран';

const sll=el('s-last-login');
if(sll)sll.textContent=ll?new Date(ll).toLocaleString('ru-RU'):'Первый вход';

const ua=navigator.userAgent;let dev='Неизвестно';
if(/Android/i.test(ua))dev='Android';else if(/iPhone|iPad/i.test(ua))dev='iOS';else if(/Windows/i.test(ua))dev='Windows';else if(/Mac/i.test(ua))dev='macOS';else if(/Linux/i.test(ua))dev='Linux';
window.dev=dev;
const sd=el('s-device');if(sd)sd.textContent=dev;

// Dynamically load remaining modules in correct dependency order
const mods=['ln','u','e','d','f','n','a','s','t'];
for(const m of mods){
  await new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='mod/'+m+'.js';
    s.setAttribute('data-acx-safe','1');
    s.onload=resolve;
    s.onerror=reject;
    document.body.appendChild(s);
  });
}

// ===== ПРИМЕНЕНИЕ НАСТРОЕК САЙТА ПОСЛЕ ЗАГРУЗКИ МОДУЛЕЙ =====
console.log('[ACX] Применение настроек:', JSON.stringify(siteSettings));

// Версия сайта
if(siteSettings.site_version){
  const svd=el('site-version-display');if(svd)svd.textContent=siteSettings.site_version;
  document.querySelectorAll('.stat-value').forEach(e=>{
    if(e.textContent.trim()==='2.1.0'||e.textContent.includes('2.1.0'))e.textContent=siteSettings.site_version;
  });
  // Также в hero-subtitle и других местах
  document.querySelectorAll('[data-acx-version]').forEach(e=>e.textContent=siteSettings.site_version);
}

// IP сервера
if(siteSettings.server_ip){
  document.querySelectorAll('.connect-ip-value').forEach(e=>{e.textContent=siteSettings.server_ip});
  // Кнопка копирования
  document.querySelectorAll('[data-acx-server-ip]').forEach(e=>{e.textContent=siteSettings.server_ip});
}

// Версии сервера
if(siteSettings.server_versions){
  document.querySelectorAll('.server-version-display').forEach(e=>{e.textContent=siteSettings.server_versions});
}

// Видимость рангов/доната
if(siteSettings.ranks_visible===false||siteSettings.ranks_visible==='false'){
  const donateTab=document.querySelector('[data-tab="donate"]');
  if(donateTab)donateTab.style.display='none';
  const donatePanel=document.getElementById('panel-donate');
  if(donatePanel)donatePanel.style.display='none';
} else {
  // Показываем донат если ranks_visible = true
  const donateTab=document.querySelector('[data-tab="donate"]');
  if(donateTab)donateTab.style.display='';
}

// Онлайн — скрыть если выключено
if(siteSettings.show_online===false||siteSettings.show_online==='false'){
  const oc=el('online-count');if(oc){const card=oc.closest('.stat-card');if(card)card.style.display='none'}
}

// Регистрация закрыта
if(siteSettings.registration_open===false||siteSettings.registration_open==='false'){
  localStorage.setItem('acx_registration_closed','true');
}else{
  localStorage.removeItem('acx_registration_closed');
}

console.log('[ACX] Все настройки применены');
})();
