// s.js — Settings: account, MC, tab nav, SAVE/LOAD from DB
if(el('settings-btn'))el('settings-btn').addEventListener('click',()=>{openM('settings-modal');loadMFA();popS();loadSessions();loadAuditLog();loadSettingsFromDB()});
if(el('action-settings'))el('action-settings')?.addEventListener('click',()=>{openM('settings-modal');swTab('security');loadMFA();popS();loadSessions();loadAuditLog();loadSettingsFromDB()});
if(el('action-2fa'))el('action-2fa')?.addEventListener('click',()=>{openM('settings-modal');swTab('security');loadMFA();popS();loadSessions();loadAuditLog();loadSettingsFromDB()});
function swTab(id){document.querySelectorAll('.settings-nav-item').forEach(i=>i.classList.toggle('active',i.dataset.settingsTab===id));document.querySelectorAll('.settings-tab').forEach(t=>t.classList.toggle('active',t.id===`tab-${id}`))}
document.querySelectorAll('.settings-nav-item').forEach(i=>i.addEventListener('click',()=>swTab(i.dataset.settingsTab)));
function popS(){const su=el('s-username');if(su)su.value=un;const se=el('s-email');if(se)se.value=ud?.email||user.email||'';const sb2=el('s-birthday');if(sb2)sb2.value=bd;const sg=el('s-gender');if(sg)sg.value=ud?.gender||meta.gender||'';const sd2=el('s-description');if(sd2)sd2.value=ud?.description||meta.description||'';const sn=el('s-mc-nick');if(sn)sn.value=mcN;const sm=el('s-mc-mode');if(sm)sm.value=mcM}

// ===== ЗАГРУЗКА НАСТРОЕК ИЗ БД =====
async function loadSettingsFromDB(){
try{
const{data}=await sb.from('user_settings').select('*').eq('user_id',user.id).maybeSingle();
if(!data)return;
const ne=el('notif-email');if(ne)ne.checked=data.notif_email??false;
const nl=el('notif-login');if(nl)nl.checked=data.notif_login??true;
const nn=el('notif-news');if(nn)nn.checked=data.notif_news??true;
const nev=el('notif-events');if(nev)nev.checked=data.notif_events??true;
const nmc=el('notif-mc-chat');if(nmc)nmc.checked=data.notif_mc_chat??true;
const np=el('notif-pvp');if(np)np.checked=data.notif_pvp??true;
const npm=el('notif-pm');if(npm)npm.checked=data.notif_pm??true;
const lang=data.language||'ru';const sls2=el('settings-lang-select');if(sls2)sls2.value=lang;const navSel=el('lang-select');if(navSel)navSel.value=lang;
}catch(e){console.error('Settings load error:',e)}
}

// ===== СОХРАНЕНИЕ АККАУНТА =====
const sab=el('save-account-btn');
if(sab)sab.addEventListener('click',async()=>{
let n=el('s-username')?.value.trim()||un;const b=el('s-birthday')?.value||'';const g=el('s-gender')?.value||'';
let d=el('s-description')?.value.trim()||'';const st=el('account-status');

// Собираем изменения
const changes=[];
if(n!==un)changes.push({field:'username',from:un,to:n});
if(b!==bd)changes.push({field:'birthday',from:bd||'—',to:b||'—'});
if(g!==(ud?.gender||meta.gender||'not_specified'))changes.push({field:'gender',from:ud?.gender||'—',to:g});
if(d!==(ud?.description||meta.description||''))changes.push({field:'description',from:'(изменено)',to:'(изменено)'});

if(window.SanitizeInput){n=SanitizeInput.username(n);d=SanitizeInput.description(d)}
if(window.RateLimiter&&!RateLimiter.check('account_save',5,60000)){if(st){st.textContent='❌ Слишком часто';st.className='modal-status error'}return}
if(!n||n.length<3){if(st){st.textContent='❌ Минимум 3 символа';st.className='modal-status error'}return}
try{if(st){st.textContent='⏳ Сохранение...';st.className='modal-status'}
const{error:e1}=await sb.from('users').upsert({id:user.id,username:n,birthday:b,gender:g||'not_specified',description:d,email:user.email},{onConflict:'id'});if(e1)throw e1;
const{error:e2}=await sb.auth.updateUser({data:{username:n,birthday:b,gender:g||'not_specified',description:d}});if(e2)throw e2;
if(st){st.textContent='';toast('Сохранено','success')}
window.un=n;
const une=el('user-name');if(une)une.textContent=n;
const pun=el('profile-username');if(pun)pun.textContent=n;
const pud=el('profile-description');if(pud)pud.textContent=d||'Нет описания';
// Логируем изменения
if(window.logAction&&changes.length>0){for(const ch of changes)await logAction('profile_update',ch)}
// Статус
const statusSel=document.querySelector('.status-option.active');
if(statusSel)setStatus(statusSel.dataset.status,statusSel);
}catch(err){if(st){st.textContent=`❌ ${err.message}`;st.className='modal-status error'}}
});

// ===== СОХРАНЕНИЕ MC НАСТРОЕК =====
const smb=el('save-mc-btn');
if(smb)smb.addEventListener('click',async()=>{
let mn=el('s-mc-nick')?.value.trim()||'';const mm=el('s-mc-mode')?.value||'';const st=el('mc-settings-status');
const changes=[];
if(mn!==mcN)changes.push({field:'mc_nick',from:mcN||'—',to:mn||'—'});
if(mm!==mcM)changes.push({field:'mc_mode',from:mcM||'—',to:mm||'—'});
if(window.SanitizeInput)mn=SanitizeInput.mcNick(mn);
try{if(st){st.textContent='⏳ Сохранение...';st.className='modal-status'}
const{error:e1}=await sb.from('users').upsert({id:user.id,mc_nick:mn,mc_mode:mm,email:user.email},{onConflict:'id'});if(e1)throw e1;
const{error:e2}=await sb.auth.updateUser({data:{mc_nick:mn,mc_mode:mm}});if(e2)throw e2;
if(st){st.textContent='';toast('Сохранено','success')}
if(window.logAction&&changes.length>0){for(const ch of changes)await logAction('profile_update',ch)}
}catch(err){if(st){st.textContent=`❌ ${err.message}`;st.className='modal-status error'}}
});

// ===== СОХРАНЕНИЕ НАСТРОЕК УВЕДОМЛЕНИЙ =====
const snb=el('save-notif-btn');
if(snb)snb.addEventListener('click',async()=>{
const st=el('notif-status');
try{if(st){st.textContent='⏳ Сохранение...';st.className='modal-status'}
const settings={
user_id:user.id,
notif_email:el('notif-email')?.checked??false,
notif_login:el('notif-login')?.checked??true,
notif_news:el('notif-news')?.checked??true,
notif_events:el('notif-events')?.checked??true,
notif_mc_chat:el('notif-mc-chat')?.checked??true,
notif_pvp:el('notif-pvp')?.checked??true,
notif_pm:el('notif-pm')?.checked??true,
push_enabled:el('push-toggle')?.checked??false,
language:currentLang,
updated_at:new Date().toISOString()
};
const{error}=await sb.from('user_settings').upsert(settings,{onConflict:'user_id'});if(error)throw error;
if(st){st.textContent='';toast('Сохранено','success')}
if(window.logAction)await logAction('profile_update',{field:'notification_settings'});
}catch(err){if(st){st.textContent=`❌ ${err.message}`;st.className='modal-status error'}}
});

// ===== LANGUAGE IN SETTINGS =====
const sls=el('settings-lang-select');
if(sls){
  sls.value=currentLang;
  sls.addEventListener('change',()=>{
    const newLang=sls.value;
    localStorage.setItem('acx_lang',newLang);
    // Redirect to the other language version
    const path=window.location.pathname;
    if(newLang==='en'&&path.includes('/ru/')){
      window.location.href=path.replace('/ru/','/en/');
    }else if(newLang==='ru'&&path.includes('/en/')){
      window.location.href=path.replace('/en/','/ru/');
    }else{
      // Same language — just update
      setLang(newLang);
      const navSel=el('lang-select');if(navSel)navSel.value=newLang;
    }
  });
}

// ===== NAVBAR LANGUAGE SELECTOR =====
const navLS=el('lang-select');
if(navLS){
  navLS.addEventListener('change',()=>{
    const newLang=navLS.value;
    localStorage.setItem('acx_lang',newLang);
    const path=window.location.pathname;
    if(newLang==='en'&&path.includes('/ru/')){
      window.location.href=path.replace('/ru/','/en/');
    }else if(newLang==='ru'&&path.includes('/en/')){
      window.location.href=path.replace('/en/','/ru/');
    }
  });
}
