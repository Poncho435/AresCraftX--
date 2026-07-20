// d.js — Data: sessions, audit log, logout, status
const SESSION_KEY='_acx_sk';

// Генерируем уникальный ключ сессии при первом запуске (один раз на вкладку)
if(!sessionStorage.getItem(SESSION_KEY)){
  sessionStorage.setItem(SESSION_KEY,crypto.randomUUID());
}
const currentSessionKey=sessionStorage.getItem(SESSION_KEY);

async function loadAuditLog(){
  const al=el('audit-log');if(!al)return;
  try{
    al.textContent='';
    const ld=document.createElement('div');ld.style.cssText='color:var(--text-3);font-size:.82rem';ld.textContent='Загрузка...';al.appendChild(ld);
    const{data}=await sb.from('security_logs').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(30);
    while(al.firstChild)al.removeChild(al.firstChild);
    if(!data||!data.length){
      const ne=document.createElement('div');ne.style.cssText='color:var(--text-3);font-size:.82rem;text-align:center;padding:16px';
      ne.textContent='Нет записей';al.appendChild(ne);return
    }
    const aI={login:'🔑',login_failed:'❌',logout:'🚪',password_change:'🔒','2fa_enable':'🛡️','2fa_disable':'⚠️',session_kill:'💀',profile_update:'✏️',login_new_device:'🔔',status_change:'🔄',mfa_disable:'⚠️'};
    const aN={login:'Вход',login_failed:'Неудачный вход',logout:'Выход',password_change:'Смена пароля','2fa_enable':'2FA включена','2fa_disable':'2FA отключена',session_kill:'Сессия завершена',profile_update:'Профиль обновлён',login_new_device:'Новое устройство',status_change:'Статус изменён',mfa_disable:'2FA отключена'};
    data.forEach(log=>{
      const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:.82rem';
      const icon=document.createElement('span');icon.style.cssText='font-size:1rem;flex-shrink:0';icon.textContent=aI[log.action]||'📋';
      const td=document.createElement('div');td.style.cssText='flex:1;min-width:0';
      const ns=document.createElement('span');ns.style.cssText='color:var(--text-1);font-weight:600;display:block';ns.textContent=aN[log.action]||log.action;
      const ms=document.createElement('span');ms.style.cssText='color:var(--text-3);font-size:.72rem;display:block;margin-top:2px';
      let detail=log.device?' • '+log.device:'';
      if(log.details){
        try{
          const d=typeof log.details==='string'?JSON.parse(log.details):log.details;
          if(d.field)detail+=' • '+d.field;
          if(d.from&&d.to)detail+=' ('+d.from+' → '+d.to+')';
        }catch(e){}
      }
      ms.textContent=new Date(log.created_at).toLocaleString('ru-RU')+detail;
      td.appendChild(ns);td.appendChild(ms);row.appendChild(icon);row.appendChild(td);al.appendChild(row)
    })
  }catch(e){
    al.textContent='';
    const er=document.createElement('div');er.style.cssText='color:var(--text-3);font-size:.82rem;text-align:center';er.textContent='Не удалось загрузить';al.appendChild(er)
  }
}

// Хелпер: записать в security_logs с деталями
window.logAction=async function(action,detailsObj){
  try{
    await sb.from('security_logs').insert({
      user_id:user.id,
      action:action,
      device:dev,
      user_agent:navigator.userAgent.substring(0,200),
      details:detailsObj||null
    });
  }catch(e){console.warn('logAction error:',e)}
};

async function loadSessions(){
  const sl=el('session-list');if(!sl)return;
  try{
    sl.textContent='';
    const{data}=await sb.from('user_sessions').select('*').eq('user_id',user.id).order('last_active',{ascending:false});
    while(sl.firstChild)sl.removeChild(sl.firstChild);

    const mkItem=(d,c,t)=>{
      const div=document.createElement('div');div.className='session-item';
      const id2=document.createElement('div');id2.className='session-item-info';
      const dd=document.createElement('div');dd.className='session-item-dot '+(c?'current':'other');
      const td=document.createElement('div');td.className='session-item-text';
      const s=document.createElement('strong');s.textContent=d;
      const ts=document.createElement('span');ts.className='session-item-time';ts.textContent=t;
      td.appendChild(s);td.appendChild(document.createElement('br'));td.appendChild(ts);
      id2.appendChild(dd);id2.appendChild(td);div.appendChild(id2);
      return div
    };

    if(!data||!data.length){
      sl.appendChild(mkItem(dev,true,'Текущая сессия'));
      return
    }

    let otherCount=0;
    data.forEach(s=>{
      const isCurrent=s.session_key===currentSessionKey;
      const div=mkItem(s.device||'Неизвестно',isCurrent,new Date(s.last_active).toLocaleString('ru-RU'));
      if(!isCurrent){
        otherCount++;
        const kb=document.createElement('button');kb.className='btn-session-kill';kb.dataset.sid=s.id;
        const ki=document.createElement('i');ki.className='fas fa-times';kb.appendChild(ki);
        kb.appendChild(document.createTextNode(' Удалить'));div.appendChild(kb)
      }else{
        // Пометить текущую
        const tag=document.createElement('span');tag.style.cssText='color:var(--green);font-size:.7rem;margin-left:8px';
        tag.textContent='✓ Текущая';div.querySelector('.session-item-text')?.appendChild(tag);
      }
      sl.appendChild(div)
    });

    // Кнопка "Завершить все другие сессии"
    if(otherCount>0){
      const killAllDiv=document.createElement('div');killAllDiv.style.cssText='margin-top:12px;display:flex;gap:8px;flex-wrap:wrap';
      const killAllBtn=document.createElement('button');killAllBtn.className='btn-danger btn-sm';
      killAllBtn.innerHTML='<i class="fas fa-times-circle"></i> Завершить все другие сессии ('+otherCount+')';
      killAllBtn.addEventListener('click',async()=>{
        if(!confirm('Завершить все другие сессии? Вы останетесь в текущей.'))return;
        killAllBtn.disabled=true;killAllBtn.textContent='⏳ Удаление...';
        try{
          const{data:count}=await sb.rpc('kill_other_sessions',{p_current_key:currentSessionKey});
          toast('Завершено сессий: '+(count||0),'success');
          await logAction('session_kill',{killed:count});
          loadSessions()
        }catch(e){toast('Ошибка: '+e.message,'error');killAllBtn.disabled=false;killAllBtn.innerHTML='<i class="fas fa-times-circle"></i> Завершить все'}
      });
      killAllDiv.appendChild(killAllBtn);sl.appendChild(killAllDiv)
    }

    sl.querySelectorAll('.btn-session-kill').forEach(b=>b.addEventListener('click',async()=>{
      const sid=b.dataset.sid;if(!sid||!confirm('Завершить сессию?'))return;
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sid)){toast('Некорректный ID','error');return}
      try{
        await sb.from('user_sessions').delete().eq('id',sid);
        await logAction('session_kill',{session_id:sid});
        toast('Сессия удалена','success');loadSessions()
      }catch(err){toast('Ошибка: '+err.message,'error')}
    }))
  }catch(e){
    sl.textContent='';
    const er=document.createElement('div');er.style.cssText='color:var(--text-3);font-size:.82rem';er.textContent='Не удалось загрузить';sl.appendChild(er)
  }
}

// Регистрация сессии (одна на вкладку, без дублей)
(async function(){
  try{
    // Удалить старые сессии этого устройства с другим key (если были)
    // upsert по session_key — если ключ уже есть, обновляем last_active
    const{error}=await sb.from('user_sessions').upsert({
      user_id:user.id,
      session_key:currentSessionKey,
      device:dev,
      user_agent:navigator.userAgent.substring(0,200),
      is_current:true,
      last_active:new Date().toISOString()
    },{onConflict:'session_key'});
    if(error){
      // Если нет UNIQUE constraint на session_key, просто insert
      await sb.from('user_sessions').insert({
        user_id:user.id,
        session_key:currentSessionKey,
        device:dev,
        user_agent:navigator.userAgent.substring(0,200),
        is_current:true,
        last_active:new Date().toISOString()
      });
    }
  }catch(e){console.warn('Session register:',e)}

  // Обновление last_active каждые 60 секунд
  setInterval(async()=>{
    try{await sb.from('user_sessions').update({last_active:new Date().toISOString()}).eq('session_key',currentSessionKey)}catch(e){}
  },60000);

  // Определяем новое устройство
  const knownDevices=JSON.parse(localStorage.getItem('acx_known_devices')||'[]');
  const deviceFP=dev+'_'+(navigator.language||'')+'_'+(screen.width+'x'+screen.height);
  if(!knownDevices.includes(deviceFP)){
    toast('🔔 Вход с нового устройства: '+dev,'info',6000);
    await logAction('login_new_device',{fp:deviceFP,device:dev});
    knownDevices.push(deviceFP);
    localStorage.setItem('acx_known_devices',JSON.stringify(knownDevices.slice(-10)))
  }

  // Логируем вход
  await logAction('login',{device:dev});

  // Logout
  const lob=el('logout-btn');
  if(lob)lob.addEventListener('click',async function(){
    if(!confirm('Выйти из аккаунта?'))return;
    try{
      this.textContent='⏳ Выход...';this.disabled=true;
      await logAction('logout',{device:dev});
      // Удаляем ВСЕ сессии этого пользователя (включая текущую)
      await sb.from('user_sessions').delete().eq('user_id',user.id);
      await sb.auth.signOut();
      // Очищаем локальные данные
      sessionStorage.removeItem(SESSION_KEY);
      window.location.href='../auth/auth.html'
    }catch(err){toast('Ошибка: '+err.message,'error');this.textContent='🚪 Выйти';this.disabled=false}
  });
  if(el('action-logout'))el('action-logout').addEventListener('click',()=>{if(lob)lob.click()});

  // Status
  let currentStatus=localStorage.getItem('acx_status')||'online';
  window.setStatus=async function(status,elem){
    const prevStatus=currentStatus;
    currentStatus=status;localStorage.setItem('acx_status',status);
    document.querySelectorAll('.status-option').forEach(o=>o.classList.toggle('active',o.dataset.status===status));
    document.querySelectorAll('.nav-status-indicator').forEach(dot=>{
      if(status==='online'){dot.style.background='var(--green)';dot.style.boxShadow='0 0 8px rgba(68,221,102,.4)'}
      else if(status==='dnd'){dot.style.background='var(--red)';dot.style.boxShadow='0 0 8px rgba(255,80,80,.4)'}
      else{dot.style.background='var(--text-3)';dot.style.boxShadow='none'}
    });
    try{await sb.from('users').update({status}).eq('id',user.id)}catch(e){}
    if(prevStatus!==status){
      await logAction('status_change',{from:prevStatus,to:status});
    }
    // Без тоста — статус и так видно по индикатору
  };
  document.querySelectorAll('.status-option').forEach(o=>o.classList.toggle('active',o.dataset.status===currentStatus));
  setStatus(currentStatus);

  sb.auth.onAuthStateChange(ev=>{if(ev==='SIGNED_OUT')window.location.href='../auth/auth.html'});
  await loadMFA();
  console.log('✅ ACX loaded');
})();
