document.addEventListener('DOMContentLoaded',async()=>{const SU='https://ggyaitqgukjgcjscvwjj.supabase.co';const SK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdneWFpdHFndWtqZ2Nqc2N2d2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MzQyMjMsImV4cCI6MjEwMzQxMDIyM30.-q2fXEDe93wverb3qYgDkrQqnR_QLbytXQYKDFvlUBs';const sb=window.supabase.createClient(SU,SK);
const b32='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';function b32d(s){s=s.replace(/=+$/,'').toUpperCase();const b=[];let bits=0,v=0;for(let i=0;i<s.length;i++){const idx=b32.indexOf(s[i]);if(idx===-1)continue;v=(v<<5)|idx;bits+=5;if(bits>=8){b.push((v>>>(bits-8))&0xff);bits-=8}}return new Uint8Array(b)}function b32e(bytes){let bits=0,v=0,o='';for(let i=0;i<bytes.length;i++){v=(v<<8)|bytes[i];bits+=8;while(bits>=5){o+=b32[(v>>>(bits-5))&31];bits-=5}}if(bits>0)o+=b32[(v<<(5-bits))&31];while(o.length%8!==0)o+='=';return o}function genSec(l=20){const a=new Uint8Array(l);crypto.getRandomValues(a);return b32e(a)}
async function genTOTP(s,p=30,d=6,o=0){const dd=b32d(s);const c=Math.floor(Date.now()/1000/p)+o;const cb=new ArrayBuffer(8);new DataView(cb).setBigUint64(0,BigInt(c),false);const k=await crypto.subtle.importKey('raw',dd,{name:'HMAC',hash:'SHA-1'},false,['sign']);const h=await crypto.subtle.sign('HMAC',k,cb);const hb=new Uint8Array(h);const ob=hb[hb.length-1]&0xf;const bin=((hb[ob]&0x7f)<<24)|((hb[ob+1]&0xff)<<16)|((hb[ob+2]&0xff)<<8)|(hb[ob+3]&0xff);return(bin%Math.pow(10,d)).toString().padStart(d,'0')}
async function verTOTP(code,sec,w=2){const o=[];for(let i=-w;i<=w;i++)o.push(i);const codes=await Promise.all(o.map(off=>genTOTP(sec,30,6,off)));return codes.includes(code)}
function toast(m,t='info',d=4000){const c=document.getElementById('toast-container');const e=document.createElement('div');e.className=`toast toast-${t}`;const i={success:'✅',error:'❌',info:'ℹ️'};e.innerHTML=`<span style="font-size:1.1rem">${i[t]||'ℹ️'}</span> ${m}`;c.appendChild(e);setTimeout(()=>{e.classList.add('removing');setTimeout(()=>e.remove(),300)},d)}

// ===== СЕССИЯ =====
const{data:{session}}=await sb.auth.getSession();if(!session?.user){window.location.href='../auth/auth.html';return}
const user=session.user;const meta=user.user_metadata||{};let ud=null;
try{const{data}=await sb.from('users').select('*').eq('id',user.id).maybeSingle();ud=data}catch(e){}
const un=ud?.username||meta.username||user.email?.split('@')[0]||'Игрок';
function genAv(l){const c=document.createElement('canvas');c.width=200;c.height=200;const ctx=c.getContext('2d');const g=ctx.createLinearGradient(0,0,200,200);g.addColorStop(0,'#ff8800');g.addColorStop(1,'#cc4400');ctx.fillStyle=g;ctx.beginPath();ctx.arc(100,100,96,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 88px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(l.toUpperCase(),100,104);return c.toDataURL('image/png')}
const avSrc=meta.avatar_url||genAv(un.charAt(0));
// FIX: объявляем переменные ДО использования
const bd=ud?.birthday||meta.birthday||'';
const ll=ud?.last_login||meta.last_login;
const mcN=ud?.mc_nick||meta.mc_nick||'';
const mcM=ud?.mc_mode||meta.mc_mode||'';
const bday=bd?new Date(bd).toLocaleDateString('ru-RU'):'Не указана';

// Заполняем данные (если элементы есть)
const el=id=>document.getElementById(id);
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
const sll=el('s-last-login');if(sll)sll.textContent=ll?new Date(ll).toLocaleString('ru-RU'):'Первый вход';
const sd=el('s-device');
const ua=navigator.userAgent;let dev='Неизвестно';if(/Android/i.test(ua))dev='Android';else if(/iPhone|iPad/i.test(ua))dev='iOS';else if(/Windows/i.test(ua))dev='Windows';else if(/Mac/i.test(ua))dev='macOS';else if(/Linux/i.test(ua))dev='Linux';
if(sd)sd.textContent=dev;

// Приветствие
const gr=[`С возвращением, ${un}! ⚔️`,`${un}, сервер ждёт! 🎮`,`Привет, ${un}! 🏰`,`Рады видеть, ${un}! ⛏️`];
const wm=el('welcome-message');if(wm)wm.textContent=gr[Math.floor(Math.random()*gr.length)];

// ===== ОНЛАЙН через mcstatus.io =====
async function fetchOnline(){try{const r=await fetch('https://api.mcsrvstat.us/3/play.arescraftx.online');const d=await r.json();if(d.players){const oc=el('online-count');if(oc)oc.textContent=d.players.online||'0';if(el('connect-online'))el('connect-online').textContent=d.players.online||'0'}}catch(e){const oc=el('online-count');if(oc)oc.textContent='—'}}
fetchOnline();setInterval(fetchOnline,30000);

// ===== МОДАЛКИ =====
function openM(id){document.getElementById(id).classList.add('active');document.body.style.overflow='hidden'}
function closeM(id){document.getElementById(id).classList.remove('active');document.body.style.overflow=''}
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeM(b.dataset.close)));
document.querySelectorAll('.modal-overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o){o.classList.remove('active');document.body.style.overflow=''}}));

// ===== ПРОФИЛЬ =====
if(el('profile-btn'))el('profile-btn').addEventListener('click',()=>openPM());
if(el('profile-card-btn'))el('profile-card-btn').addEventListener('click',()=>openPM());
if(el('action-profile'))el('action-profile').addEventListener('click',()=>openPM());
let newAv=null;
function openPM(){newAv=null;const e=el('edit-avatar-preview');if(e)e.src=avSrc;const eu=el('edit-username');if(eu)eu.value=un;const ee=el('edit-email');if(ee)ee.value=ud?.email||user.email||'';const eb=el('edit-birthday');if(eb)eb.value=bd;const eg=el('edit-gender');if(eg)eg.value=ud?.gender||meta.gender||'';const emn=el('edit-mc-nick');if(emn)emn.value=mcN;const emm=el('edit-mc-mode');if(emm)emm.value=mcM;const d=ud?.description||meta.description||'';const ed=el('edit-description');if(ed){ed.value=d;const dc=el('desc-char-count');if(dc)dc.textContent=d.length}const ps=el('profile-status');if(ps)ps.textContent='';openM('profile-modal')}
const ainput=el('edit-avatar-input');if(ainput)ainput.addEventListener('change',function(){const f=this.files[0];if(!f)return;if(f.size>2*1024*1024){toast('Файл слишком большой','error');return}const r=new FileReader();r.onload=e=>{newAv=e.target.result;const p=el('edit-avatar-preview');if(p)p.src=newAv};r.readAsDataURL(f)});
const edi=el('edit-description');if(edi)edi.addEventListener('input',function(){const dc=el('desc-char-count');if(dc)dc.textContent=this.length});
const spb=el('save-profile-btn');if(spb)spb.addEventListener('click',async()=>{const n=el('edit-username')?.value.trim()||un;const b=el('edit-birthday')?.value||'';const g=el('edit-gender')?.value||'';const d=el('edit-description')?.value.trim()||'';const mn=el('edit-mc-nick')?.value.trim()||'';const mm=el('edit-mc-mode')?.value||'';const st=el('profile-status');if(!n||n.length<3){if(st){st.textContent='❌ Минимум 3 символа';st.className='modal-status error'}return}try{if(st){st.textContent='⏳ Сохранение...';st.className='modal-status'}const up={username:n,birthday:b,gender:g||'not_specified',description:d,mc_nick:mn,mc_mode:mm};const{error:e1}=await sb.from('users').upsert({id:user.id,...up,email:user.email},{onConflict:'id'});if(e1)throw e1;const mu={username:n,birthday:b,gender:g||'not_specified',description:d,mc_nick:mn,mc_mode:mm};if(newAv)mu.avatar_url=newAv;const{error:e2}=await sb.auth.updateUser({data:mu});if(e2)throw e2;if(st){st.textContent='✅ Сохранено!';st.className='modal-status success'}toast('Профиль обновлён','success');const a=newAv||avSrc;const uae=el('user-avatar');if(uae)uae.src=a;const hae=el('hero-avatar');if(hae)hae.src=a;const pae=el('profile-avatar');if(pae)pae.src=a;const une=el('user-name');if(une)une.textContent=n;const pun=el('profile-username');if(pun)pun.textContent=n;const pud=el('profile-description');if(pud)pud.textContent=d||'Нет описания';setTimeout(()=>closeM('profile-modal'),800)}catch(err){if(st){st.textContent=`❌ ${err.message}`;st.className='modal-status error'}}});

// ===== НАСТРОЙКИ =====
if(el('settings-btn'))el('settings-btn').addEventListener('click',()=>{openM('settings-modal');loadMFA();popS();loadSessions()});
if(el('action-settings'))el('action-settings').addEventListener('click',()=>{openM('settings-modal');loadMFA();popS();loadSessions()});
if(el('action-2fa'))el('action-2fa').addEventListener('click',()=>{openM('settings-modal');swTab('security');loadMFA();popS();loadSessions()});
function swTab(id){document.querySelectorAll('.settings-nav-item').forEach(i=>i.classList.toggle('active',i.dataset.settingsTab===id));document.querySelectorAll('.settings-tab').forEach(t=>t.classList.toggle('active',t.id===`tab-${id}`))}
document.querySelectorAll('.settings-nav-item').forEach(i=>i.addEventListener('click',()=>swTab(i.dataset.settingsTab)));
function popS(){const su=el('s-username');if(su)su.value=un;const se=el('s-email');if(se)se.value=ud?.email||user.email||'';const sb2=el('s-birthday');if(sb2)sb2.value=bd;const sg=el('s-gender');if(sg)sg.value=ud?.gender||meta.gender||'';const sd2=el('s-description');if(sd2)sd2.value=ud?.description||meta.description||'';const sn=el('s-mc-nick');if(sn)sn.value=mcN;const sm=el('s-mc-mode');if(sm)sm.value=mcM}
const sab=el('save-account-btn');if(sab)sab.addEventListener('click',async()=>{const n=el('s-username')?.value.trim()||un;const b=el('s-birthday')?.value||'';const g=el('s-gender')?.value||'';const d=el('s-description')?.value.trim()||'';const st=el('account-status');if(!n||n.length<3){if(st){st.textContent='❌ Минимум 3 символа';st.className='modal-status error'}return}try{if(st){st.textContent='⏳ Сохранение...';st.className='modal-status'}const{error:e1}=await sb.from('users').upsert({id:user.id,username:n,birthday:b,gender:g||'not_specified',description:d,email:user.email},{onConflict:'id'});if(e1)throw e1;const{error:e2}=await sb.auth.updateUser({data:{username:n,birthday:b,gender:g||'not_specified',description:d}});if(e2)throw e2;if(st){st.textContent='✅ Сохранено!';st.className='modal-status success'}toast('Аккаунт обновлён','success');const une=el('user-name');if(une)une.textContent=n;const pun=el('profile-username');if(pun)pun.textContent=n;const pud=el('profile-description');if(pud)pud.textContent=d||'Нет описания'}catch(err){if(st){st.textContent=`❌ ${err.message}`;st.className='modal-status error'}}});
const smb=el('save-mc-btn');if(smb)smb.addEventListener('click',async()=>{const mn=el('s-mc-nick')?.value.trim()||'';const mm=el('s-mc-mode')?.value||'';const st=el('mc-settings-status');try{if(st){st.textContent='⏳ Сохранение...';st.className='modal-status'}const{error:e1}=await sb.from('users').upsert({id:user.id,mc_nick:mn,mc_mode:mm,email:user.email},{onConflict:'id'});if(e1)throw e1;const{error:e2}=await sb.auth.updateUser({data:{mc_nick:mn,mc_mode:mm}});if(e2)throw e2;if(st){st.textContent='✅ Сохранено!';st.className='modal-status success'}toast('Настройки MC сохранены','success')}catch(err){if(st){st.textContent=`❌ ${err.message}`;st.className='modal-status error'}}});

// ===== 2FA =====
const msE=el('mfa-status');const msA=el('mfa-setup-area');const meA=el('mfa-enabled-area');const qrC=el('qr-code-container');const ci=document.querySelectorAll('#mfa-code-inputs .code-box');const mVB=el('mfa-verify-btn');let sec=null;
async function loadMFA(){try{const{data:{user:cu}}=await sb.auth.getUser();const en=cu?.user_metadata?.mfa_enabled||false;if(en){if(msE){msE.innerHTML='✅ 2FA включена';msE.style.color='var(--green)'}if(msA)msA.style.display='none';if(meA)meA.style.display='block'}else{if(msE){msE.innerHTML='❌ 2FA не включена. <button class="btn-primary btn-sm" id="mfa-enable-btn" style="margin-left:10px;"><i class="fas fa-plus"></i> Включить</button>';msE.style.color='var(--red)'}if(msA)msA.style.display='none';if(meA)meA.style.display='none';el('mfa-enable-btn')?.addEventListener('click',startMFA)}}catch(e){if(msE){msE.textContent='⚠️ Ошибка';msE.style.color='var(--accent)'}}}
function startMFA(){if(!window.crypto||!window.crypto.subtle){if(msE){msE.textContent='❌ Web Crypto недоступен';msE.style.color='var(--red)'}return}sec=genSec(20);const uri=`otpauth://totp/AresCraftX:${user.email}?secret=${sec}&issuer=AresCraftX&algorithm=SHA1&digits=6&period=30`;if(qrC){qrC.innerHTML='';const img=document.createElement('img');img.src=`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(uri)}`;img.alt='QR';img.style.cssText='width:180px;height:180px;border-radius:8px';img.onerror=function(){qrC.innerHTML=`<div style="color:var(--text-3)">QR не загружен<br><span style="font-size:.7rem;word-break:break-all;">${uri}</span></div>`};qrC.appendChild(img);const kd=document.createElement('div');kd.style.cssText='margin-top:10px;color:var(--text-3);font-size:.82rem;word-break:break-all;background:var(--accent-soft);padding:8px 12px;border-radius:8px;border:1px solid var(--border);text-align:center;';kd.innerHTML=`<b>Ключ:</b> <span style="color:var(--accent);font-family:monospace;font-size:1rem;">${sec}</span>`;qrC.appendChild(kd)}if(msA)msA.style.display='block';if(meA)meA.style.display='none';if(msE){msE.textContent='✅ Отсканируйте QR и введите код';msE.style.color='var(--green)'}ci.forEach(i=>{i.value='';i.className='code-box'});setTimeout(()=>ci[0]?.focus(),100)}
ci.forEach((inp,idx)=>{inp.addEventListener('input',function(){this.value=this.value.replace(/[^0-9]/g,'');if(this.value.length===1){this.className='code-box filled';if(idx<5)ci[idx+1].focus()}});inp.addEventListener('keydown',function(e){if(e.key==='Backspace'&&!this.value&&idx>0){ci[idx-1].focus();ci[idx-1].className='code-box'}if(e.key==='Enter'&&mVB)mVB.click()});inp.addEventListener('paste',function(e){e.preventDefault();const p=(e.clipboardData||window.clipboardData).getData('text');const d=p.replace(/[^0-9]/g,'').slice(0,6);d.split('').forEach((digit,i)=>{if(ci[i]){ci[i].value=digit;ci[i].className='code-box filled'}});if(d.length>=6)setTimeout(()=>{if(mVB)mVB.click()},100)})});
async function verEnMFA(){const code=Array.from(ci).map(i=>i.value).join('');if(code.length!==6){if(msE){msE.textContent='⛔ Введите 6 цифр';msE.style.color='var(--red)'}return}try{if(mVB)mVB.disabled=true;if(msE){msE.textContent='⏳ Проверка...';msE.style.color='var(--accent)'}const ok=await verTOTP(code,sec,2);if(!ok)throw new Error('Неверный код');const{error}=await sb.auth.updateUser({data:{mfa_enabled:true,mfa_secret:sec,mfa_enabled_at:new Date().toISOString()}});if(error)throw error;if(msE){msE.textContent='✅ 2FA включена!';msE.style.color='var(--green)'}toast('2FA включена','success');await loadMFA()}catch(err){if(msE){msE.textContent=`❌ ${err.message}`;msE.style.color='var(--red)'}ci.forEach(i=>{i.value='';i.className='code-box'});ci[0].focus();if(mVB)mVB.disabled=false}}
async function disMFA(){if(!confirm('Отключить 2FA?'))return;try{if(msE){msE.textContent='⏳ Отключение...';msE.style.color='var(--accent)'}const{error}=await sb.auth.updateUser({data:{mfa_enabled:false,mfa_secret:null,mfa_enabled_at:null}});if(error)throw error;if(msE){msE.textContent='✅ 2FA отключена';msE.style.color='var(--green)'}toast('2FA отключена','info');await loadMFA()}catch(err){if(msE){msE.textContent=`❌ ${err.message}`;msE.style.color='var(--red)'}}}
if(mVB)mVB.addEventListener('click',verEnMFA);
const mcs=el('mfa-cancel-setup');if(mcs)mcs.addEventListener('click',()=>{if(msA)msA.style.display='none';if(qrC)qrC.innerHTML='';sec=null;loadMFA()});
const mdb=el('mfa-disable-btn');if(mdb)mdb.addEventListener('click',disMFA);

// ===== СМЕНА ПАРОЛЯ =====
const bsp=el('btn-save-password');if(bsp)bsp.addEventListener('click',async()=>{const np=el('s-new-password')?.value;const cp=el('s-confirm-password')?.value;const st=el('password-status');if(!np||np.length<6){if(st){st.textContent='❌ Минимум 6 символов';st.className='modal-status error'}return}if(np!==cp){if(st){st.textContent='❌ Пароли не совпадают';st.className='modal-status error'}return}try{if(st){st.textContent='⏳ Сохранение...';st.className='modal-status'}const{error}=await sb.auth.updateUser({password:np});if(error)throw error;if(st){st.textContent='✅ Пароль обновлён!';st.className='modal-status success'}toast('Пароль изменён','success');if(el('s-new-password'))el('s-new-password').value='';if(el('s-confirm-password'))el('s-confirm-password').value=''}catch(err){if(st){st.textContent=`❌ ${err.message}`;st.className='modal-status error'}}});

// ===== ТЕМА =====
let cTh=localStorage.getItem('theme')||'system';
function aTh(t){cTh=t;localStorage.setItem('theme',t);const h=document.documentElement;const ni=document.querySelector('#theme-switcher i');if(t==='system'){h.removeAttribute('data-theme');h.style.colorScheme=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';if(ni)ni.className='fas fa-desktop'}else{h.setAttribute('data-theme',t);h.style.colorScheme=t;if(ni)ni.className=t==='dark'?'fas fa-moon':'fas fa-sun'}document.querySelectorAll('.theme-card').forEach(c=>c.classList.toggle('active',c.dataset.themeVal===t))}
document.querySelectorAll('.theme-card').forEach(c=>c.addEventListener('click',()=>aTh(c.dataset.themeVal)));
const tsb=el('theme-switcher');if(tsb)tsb.addEventListener('click',()=>{if(cTh==='dark')aTh('light');else if(cTh==='light')aTh('system');else aTh('dark')});
aTh(cTh);window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change',()=>{if(cTh==='system')aTh('system')});

// ===== СЕССИИ =====
async function loadSessions(){const sl=el('session-list');if(!sl)return;try{sl.innerHTML='<div style="color:var(--text-3);font-size:.82rem;">Загрузка...</div>';const{data}=await sb.from('user_sessions').select('*').eq('user_id',user.id).order('last_active',{ascending:false});sl.innerHTML='';if(!data||data.length===0){const selfDiv=document.createElement('div');selfDiv.className='session-item';selfDiv.innerHTML=`<div class="session-item-info"><div class="session-item-dot current"></div><div class="session-item-text"><strong>${dev}</strong><br><span class="session-item-time">Текущая сессия</span></div></div>`;sl.appendChild(selfDiv);return}
data.forEach(s=>{const div=document.createElement('div');div.className='session-item';const isCur=s.is_current;div.innerHTML=`<div class="session-item-info"><div class="session-item-dot ${isCur?'current':'other'}"></div><div class="session-item-text"><strong>${s.device||'Неизвестно'}</strong><br><span class="session-item-time">${new Date(s.last_active).toLocaleString('ru-RU')}</span></div></div>${isCur?'':'<button class="btn-session-kill" data-sid="'+s.id+'"><i class="fas fa-times"></i> Удалить</button>'}`;sl.appendChild(div)});
const selfDiv=document.createElement('div');selfDiv.className='session-item';selfDiv.innerHTML=`<div class="session-item-info"><div class="session-item-dot current"></div><div class="session-item-text"><strong>${dev} (текущая)</strong><br><span class="session-item-time">${new Date().toLocaleString('ru-RU')}</span></div></div>`;sl.insertBefore(selfDiv,sl.firstChild);
sl.querySelectorAll('.btn-session-kill').forEach(b=>b.addEventListener('click',async()=>{const sid=b.dataset.sid;if(!confirm('Завершить эту сессию?'))return;try{await sb.from('user_sessions').delete().eq('id',sid);toast('Сессия удалена','success');loadSessions()}catch(err){toast('Ошибка: '+err.message,'error')}}))
}catch(e){sl.innerHTML='<div style="color:var(--text-3);font-size:.82rem;">Не удалось загрузить</div>'}}
// Сохраняем текущую сессию при входе
try{await sb.from('user_sessions').upsert({user_id:user.id,device:dev,is_current:true,last_active:new Date().toISOString()},{onConflict:'id'})}catch(e){}

// ===== ВЫХОД =====
const lob=el('logout-btn');if(lob)lob.addEventListener('click',async function(){if(!confirm('Выйти из аккаунта?'))return;try{this.innerHTML='<i class="fas fa-spinner fa-spin"></i> Выход...';this.disabled=true;await sb.from('user_sessions').delete().eq('user_id',user.id);await sb.auth.signOut();window.location.href='../auth/auth.html'}catch(err){toast('Ошибка: '+err.message,'error');this.innerHTML='<i class="fas fa-sign-out-alt"></i> Выйти';this.disabled=false}});
if(el('action-logout'))el('action-logout').addEventListener('click',()=>{if(lob)lob.click()});

// ===== ЧАСТИЦЫ =====
const pc=el('particles');if(pc){for(let i=0;i<25;i++){const p=document.createElement('div');p.className='particle';const s=Math.random()*2.5+1;p.style.width=s+'px';p.style.height=s+'px';p.style.left=Math.random()*100+'%';p.style.top=Math.random()*100+'%';p.style.animationDuration=(Math.random()*20+18)+'s';p.style.animationDelay=(Math.random()*12)+'s';p.style.opacity=Math.random()*.3+.1;pc.appendChild(p)}}

sb.auth.onAuthStateChange(ev=>{if(ev==='SIGNED_OUT')window.location.href='../auth/auth.html'});
await loadMFA();console.log('✅ AresCraftX загружен')});
