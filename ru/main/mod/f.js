// f.js — Friends system (с исходящими запросами, отменой и просмотром профиля)
let friendsList=[];
let pendingRequests=[];  // входящие
let outgoingRequests=[]; // исходящие

async function loadFriends(){
  try{
    // Друзья
    const{data:fData}=await sb.from('friends').select('friend_id').eq('user_id',user.id);
    const{data:fData2}=await sb.from('friends').select('user_id').eq('friend_id',user.id);
    const friendIds=[];
    if(fData)fData.forEach(f=>friendIds.push(f.friend_id));
    if(fData2)fData2.forEach(f=>friendIds.push(f.user_id));
    if(friendIds.length>0){
      const{data:uData}=await sb.from('users').select('id,username,avatar_url,status,description,mc_nick,mc_mode,birthday,gender,role,created_at,last_login').in('id',friendIds);
      friendsList=uData||[];
    }else{friendsList=[]}

    // Входящие запросы
    const{data:reqData}=await sb.from('friend_requests').select('id,from_id,created_at').eq('to_id',user.id).eq('status','pending');
    if(reqData&&reqData.length>0){
      const fromIds=reqData.map(r=>r.from_id);
      const{data:uData2}=await sb.from('users').select('id,username,avatar_url').in('id',fromIds);
      pendingRequests=reqData.map(r=>{
        const u=uData2?.find(x=>x.id===r.from_id);
        return{reqId:r.id,from:r.from_id,username:u?.username||'?',avatar:u?.avatar_url||'',created:r.created_at};
      });
    }else{pendingRequests=[]}

    // Исходящие запросы
    const{data:outData}=await sb.from('friend_requests').select('id,to_id,created_at').eq('from_id',user.id).eq('status','pending');
    if(outData&&outData.length>0){
      const toIds=outData.map(r=>r.to_id);
      const{data:uData3}=await sb.from('users').select('id,username,avatar_url').in('id',toIds);
      outgoingRequests=outData.map(r=>{
        const u=uData3?.find(x=>x.id===r.to_id);
        return{reqId:r.id,to:r.to_id,username:u?.username||'?',avatar:u?.avatar_url||'',created:r.created_at};
      });
    }else{outgoingRequests=[]}

    renderFriends();updateFriendsBadge();
  }catch(e){console.error('Friends load error:',e)}
}

function renderFriends(){
  const fl=el('friends-list');const rl=el('friend-requests-list');const ol=el('outgoing-requests-list');const fc=el('friends-count');
  if(fc)fc.textContent='('+friendsList.length+')';

  // === Друзья ===
  if(fl){
    fl.textContent='';
    if(friendsList.length===0){
      const empty=document.createElement('div');empty.style.cssText='text-align:center;padding:24px;color:var(--text-3);font-size:.85rem';
      empty.textContent='Пока нет друзей';fl.appendChild(empty);
    }else{
        friendsList.forEach(f=>{
        const row=document.createElement('div');row.className='friend-item';row.style.cursor='pointer';
        const av=document.createElement('img');av.className='friend-avatar';av.src=f.avatar_url||genAv(f.username?.charAt(0)||'?');av.alt=f.username;
        const info=document.createElement('div');info.className='friend-info';
        const nm=document.createElement('span');nm.className='friend-name';nm.textContent=f.username;
        const dot=document.createElement('span');dot.className='friend-status-dot '+(f.status||'offline');
        const st=document.createElement('span');st.className='friend-status-text';
        st.textContent=f.status==='online'?'В сети':f.status==='dnd'?'Не беспокоить':'Не в сети';
        info.appendChild(nm);
        const stWrap=document.createElement('div');stWrap.style.cssText='display:flex;align-items:center;gap:6px';
        stWrap.appendChild(dot);stWrap.appendChild(st);info.appendChild(stWrap);
        row.appendChild(av);row.appendChild(info);
        // Клик = просмотр профиля друга
        row.addEventListener('click',(e)=>{if(e.target.closest('.friend-remove-btn'))return;viewFriendProfile(f)});
        const del=document.createElement('button');del.className='friend-remove-btn';del.innerHTML='<i class="fas fa-user-minus"></i>';del.title='Удалить из друзей';
        del.addEventListener('click',(e)=>{e.stopPropagation();removeFriendAction(f.id,f.username)});row.appendChild(del);fl.appendChild(row);
      });
    }
  }

  // === Входящие запросы ===
  if(rl){
    rl.textContent='';
    if(pendingRequests.length===0){
      const empty=document.createElement('div');empty.style.cssText='text-align:center;padding:16px;color:var(--text-3);font-size:.82rem';
      empty.textContent='Нет входящих запросов';rl.appendChild(empty);
    }else{
      pendingRequests.forEach(r=>{
        const row=document.createElement('div');row.className='friend-req-item';
        const av=document.createElement('img');av.className='friend-avatar';av.src=r.avatar||genAv(r.username?.charAt(0)||'?');av.alt=r.username;
        const nm=document.createElement('span');nm.className='friend-name';nm.textContent=r.username;
        const time=document.createElement('span');time.style.cssText='font-size:.7rem;color:var(--text-3);margin-left:4px';
        time.textContent=formatFriendTime(r.created);
        const btns=document.createElement('div');btns.className='friend-req-btns';
        const acc=document.createElement('button');acc.className='friend-accept-btn';acc.innerHTML='<i class="fas fa-check"></i>';
        acc.addEventListener('click',()=>acceptRequest(r.reqId));
        const dec=document.createElement('button');dec.className='friend-decline-btn';dec.innerHTML='<i class="fas fa-times"></i>';
        dec.addEventListener('click',()=>declineRequest(r.reqId));
        btns.appendChild(acc);btns.appendChild(dec);row.appendChild(av);row.appendChild(nm);row.appendChild(time);row.appendChild(btns);rl.appendChild(row);
      });
    }
  }

  // === Исходящие запросы ===
  if(ol){
    ol.textContent='';
    if(outgoingRequests.length===0){
      const empty=document.createElement('div');empty.style.cssText='text-align:center;padding:16px;color:var(--text-3);font-size:.82rem';
      empty.textContent='Нет исходящих запросов';ol.appendChild(empty);
    }else{
      outgoingRequests.forEach(r=>{
        const row=document.createElement('div');row.className='friend-req-item';
        const av=document.createElement('img');av.className='friend-avatar';av.src=r.avatar||genAv(r.username?.charAt(0)||'?');av.alt=r.username;
        const nm=document.createElement('span');nm.className='friend-name';nm.textContent=r.username;
        const time=document.createElement('span');time.style.cssText='font-size:.7rem;color:var(--text-3);margin-left:4px';
        time.textContent=formatFriendTime(r.created);
        const btns=document.createElement('div');btns.className='friend-req-btns';
        const cancel=document.createElement('button');cancel.className='friend-decline-btn';cancel.innerHTML='<i class="fas fa-times"></i> Отменить';
        cancel.addEventListener('click',()=>cancelRequest(r.reqId,r.username));
        btns.appendChild(cancel);row.appendChild(av);row.appendChild(nm);row.appendChild(time);row.appendChild(btns);ol.appendChild(row);
      });
    }
  }
}

function formatFriendTime(ts){
  if(!ts)return '';
  const d=new Date(ts);const now=new Date();const diff=Math.floor((now-d)/1000);
  if(diff<60)return 'только что';if(diff<3600)return Math.floor(diff/60)+' мин.';
  if(diff<86400)return Math.floor(diff/3600)+' ч.';
  return d.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'});
}

async function searchFriends(){
  const q=el('friend-search-input')?.value?.trim();const res=el('friend-search-results');
  if(!q||q.length<2){if(res)res.textContent='';return}
  try{
    const{data,error}=await sb.rpc('search_users',{p_query:q});
    if(error)throw error;
    if(res){
      res.textContent='';
      if(!data||!data.length){
        const no=document.createElement('div');no.style.cssText='padding:12px;color:var(--text-3);font-size:.82rem;text-align:center';
        no.textContent='Ничего не найдено';res.appendChild(no);return;
      }
      data.forEach(u=>{
        const row=document.createElement('div');row.className='friend-search-item';
        const av=document.createElement('img');av.className='friend-avatar';av.src=u.avatar_url||genAv(u.username?.charAt(0)||'?');av.alt=u.username;
        const nm=document.createElement('span');nm.className='friend-name';nm.textContent=u.username;
        const isFriend=friendsList.some(f=>f.id===u.id);
        const isPendingOut=outgoingRequests.some(r=>r.to===u.id);
        const isPendingIn=pendingRequests.some(r=>r.from===u.id);
        const btn=document.createElement('button');
        if(isFriend){btn.className='friend-added-btn';btn.innerHTML='<i class="fas fa-check"></i> Друг';btn.disabled=true}
        else if(isPendingOut){btn.className='friend-pending-btn';btn.innerHTML='<i class="fas fa-clock"></i> Отправлен';btn.disabled=true}
        else if(isPendingIn){btn.className='friend-accept-btn';btn.innerHTML='<i class="fas fa-check"></i> Принять';
          btn.addEventListener('click',async()=>{
            const req=pendingRequests.find(r=>r.from===u.id);
            if(req)await acceptRequest(req.reqId);
          });
        }
        else{btn.className='friend-add-btn';btn.innerHTML='<i class="fas fa-user-plus"></i> Добавить';
          btn.addEventListener('click',async()=>{btn.innerHTML='<i class="fas fa-spinner fa-spin"></i>';btn.disabled=true;
            try{await sb.rpc('send_friend_request',{p_target_id:u.id});toast('Запрос отправлен','success');loadFriends()}catch(e){toast(e.message||'Ошибка','error');btn.innerHTML='<i class="fas fa-user-plus"></i> Добавить';btn.disabled=false}})}
        row.appendChild(av);row.appendChild(nm);row.appendChild(btn);res.appendChild(row);
      });
    }
  }catch(e){toast('Ошибка поиска','error')}
}

async function acceptRequest(reqId){
  try{await sb.rpc('accept_friend_request',{p_req_id:reqId});toast('Запрос принят','success');loadFriends()}catch(e){toast(e.message||'Ошибка','error')}}
async function declineRequest(reqId){
  try{await sb.rpc('decline_friend_request',{p_req_id:reqId});toast('Запрос отклонён','info');loadFriends()}catch(e){toast(e.message||'Ошибка','error')}}
async function cancelRequest(reqId,username){
  if(!confirm('Отменить запрос к '+username+'?'))return;
  try{await sb.rpc('cancel_friend_request',{p_req_id:reqId});toast('Запрос отменён','info');loadFriends()}catch(e){toast(e.message||'Ошибка','error')}}
async function removeFriendAction(friendId,friendName){
  if(!confirm('Удалить '+friendName+' из друзей?'))return;
  try{await sb.rpc('remove_friend',{p_target_id:friendId});toast('Удалён из друзей','info');loadFriends()}catch(e){toast(e.message||'Ошибка','error')}}

function updateFriendsBadge(){
  const badge=el('friends-badge');
  const total=pendingRequests.length;
  if(badge){badge.style.display=total>0?'flex':'none';badge.textContent=total}
}

const fb=el('friends-btn');if(fb)fb.addEventListener('click',()=>openM('friends-modal'));
const mfb=el('mobile-friends-link');if(mfb)mfb.addEventListener('click',()=>{const mn=el('mobile-nav');if(mn)mn.classList.remove('active');const mo=el('mobile-overlay');if(mo)mo.classList.remove('active');openM('friends-modal')});
const fsi=el('friend-search-input');if(fsi){let st;fsi.addEventListener('input',()=>{clearTimeout(st);st=setTimeout(searchFriends,400)})}

// Слушаем realtime изменения friend_requests
sb.channel('friends-'+user.id).on('postgres_changes',
  {event:'INSERT',schema:'public',table:'friend_requests',filter:'to_id=eq.'+user.id},
  ()=>{loadFriends()}
).on('postgres_changes',
  {event:'UPDATE',schema:'public',table:'friend_requests',filter:'from_id=eq.'+user.id},
  (payload)=>{
    if(payload.new?.status==='accepted'){loadFriends();toast('Запрос дружбы принят!','success')}
  }
).subscribe();

loadFriends();

// ===== ПРОСМОТР ПРОФИЛЯ ДРУГА =====
async function viewFriendProfile(friendBasic){
  try{
    // Загружаем полные данные друга
    const{data:fullUser,error}=await sb.from('users').select('*').eq('id',friendBasic.id).maybeSingle();
    if(error)throw error;
    if(!fullUser){toast('Профиль не найден','error');return}
    const u=fullUser;

    // Проверяем бан
    const{data:banData}=await sb.from('user_bans').select('*').eq('user_id',u.id).maybeSingle();
    const isBanned=!!banData;

    // Удаляем старую модалку если есть
    const old=document.getElementById('friend-profile-overlay');if(old)old.remove();

    const overlay=document.createElement('div');overlay.id='friend-profile-overlay';overlay.className='modal-overlay active';
    overlay.style.cssText='display:flex;z-index:999999';

    const modal=document.createElement('div');modal.className='modal-content';modal.style.maxWidth='560px';
    const statusColor=u.status==='online'?'var(--green)':u.status==='dnd'?'var(--red)':'var(--text-3)';
    const statusText=u.status==='online'?'В сети':u.status==='dnd'?'Не беспокоить':'Не в сети';
    const genderText=u.gender==='male'?'Мужской':u.gender==='female'?'Женский':u.gender==='other'?'Другой':'Не указан';
    const modeText=u.mc_mode==='anarchy'?'Анархия':u.mc_mode==='vanilla'?'Ванила+':'Не выбран';

    // Строим модалку (БЕЗ email — приватность)
    const header=document.createElement('div');header.className='modal-header';
    const h2=document.createElement('h2');
    const hIcon=document.createElement('i');hIcon.className='fas fa-user-circle';hIcon.style.color='var(--accent)';hIcon.style.marginRight='8px';
    h2.appendChild(hIcon);h2.appendChild(document.createTextNode(u.username||'—'));
    const closeBtn=document.createElement('button');closeBtn.className='modal-close';closeBtn.id='close-friend-profile';closeBtn.textContent='×';
    header.appendChild(h2);header.appendChild(closeBtn);

    const body=document.createElement('div');body.className='user-detail-body';

    // Топ: аватар + имя + статус
    const topDiv=document.createElement('div');topDiv.className='user-detail-top';
    const avatarWrap=document.createElement('div');avatarWrap.className='user-detail-avatar-wrap';
    const avatarImg=document.createElement('img');avatarImg.className='user-detail-avatar';avatarImg.src=u.avatar_url||'';avatarImg.alt=u.username;avatarImg.onerror=function(){this.style.display='none'};
    const statusDot=document.createElement('span');statusDot.className='user-detail-status-dot';statusDot.style.cssText='background:'+statusColor+';box-shadow:0 0 8px '+statusColor+'40';
    avatarWrap.appendChild(avatarImg);avatarWrap.appendChild(statusDot);

    const identity=document.createElement('div');identity.className='user-detail-identity';
    const nameH=document.createElement('h3');nameH.textContent=u.username||'—';
    identity.appendChild(nameH);
    // Бейджи
    const statusBadge=document.createElement('span');statusBadge.className='badge badge-'+(u.status||'offline');statusBadge.textContent=statusText;
    identity.appendChild(statusBadge);
    if(u.role==='admin'){
      const adminBadge=document.createElement('span');adminBadge.className='badge badge-admin';adminBadge.textContent='ADMIN';
      identity.appendChild(adminBadge);
    }
    if(isBanned){
      const banBadge=document.createElement('span');banBadge.className='badge badge-banned';banBadge.textContent='🔒 ЗАБАНЕН';
      identity.appendChild(banBadge);
    }

    topDiv.appendChild(avatarWrap);topDiv.appendChild(identity);
    body.appendChild(topDiv);

    // Описание
    if(u.description){
      const descDiv=document.createElement('div');descDiv.style.cssText='padding:8px 12px;margin-bottom:12px;color:var(--text-2);font-size:.88rem;line-height:1.5;border:1px solid var(--border);border-radius:8px;background:rgba(255,136,0,.02)';
      descDiv.textContent=u.description;
      body.appendChild(descDiv);
    }

    // Грид с информацией
    const grid=document.createElement('div');grid.className='user-detail-grid';
    const fields=[
      {icon:'fas fa-calendar',label:'В проекте с',value:u.created_at?new Date(u.created_at).toLocaleDateString('ru-RU'):'—'},
      {icon:'fas fa-clock',label:'Последний вход',value:u.last_login?new Date(u.last_login).toLocaleString('ru-RU'):'—'},
      {icon:'fas fa-birthday-cake',label:'День рождения',value:u.birthday||'Не указана'},
      {icon:'fas fa-venus-mars',label:'Пол',value:genderText},
      {icon:'fas fa-gamepad',label:'MC Ник',value:u.mc_nick||'Не указан'},
      {icon:'fas fa-flag',label:'Режим',value:modeText}
    ];
    fields.forEach(f=>{
      const field=document.createElement('div');field.className='ud-field';
      const fi=document.createElement('i');fi.className=f.icon;
      const fl=document.createElement('span');fl.className='ud-label';fl.textContent=f.label;
      const fv=document.createElement('span');fv.className='ud-value';fv.textContent=f.value;
      field.appendChild(fi);field.appendChild(fl);field.appendChild(fv);
      grid.appendChild(field);
    });
    body.appendChild(grid);

    // Ссылки
    const linksSection=document.createElement('div');linksSection.className='user-detail-section';
    const linksH=document.createElement('h4');
    const linksIcon=document.createElement('i');linksIcon.className='fas fa-link';linksIcon.style.color='var(--accent)';linksIcon.style.marginRight='6px';
    linksH.appendChild(linksIcon);linksH.appendChild(document.createTextNode('Ссылки'));
    linksSection.appendChild(linksH);
    const linksContainer=document.createElement('div');linksContainer.id='friend-links-list';linksContainer.textContent='Загрузка...';
    linksSection.appendChild(linksContainer);
    body.appendChild(linksSection);

    // Кнопки действий
    const actions=document.createElement('div');actions.className='user-detail-actions';
    const removeBtn=document.createElement('button');removeBtn.className='btn-danger';removeBtn.style.cssText='font-size:.82rem';
    removeBtn.innerHTML='<i class="fas fa-user-minus"></i> Удалить из друзей';
    removeBtn.addEventListener('click',async()=>{
      if(!confirm('Удалить '+u.username+' из друзей?'))return;
      try{await sb.rpc('remove_friend',{p_target_id:u.id});toast('Удалён из друзей','info');overlay.remove();loadFriends()}catch(e){toast(e.message||'Ошибка','error')}
    });
    actions.appendChild(removeBtn);
    body.appendChild(actions);

    modal.appendChild(header);modal.appendChild(body);
    overlay.appendChild(modal);document.body.appendChild(overlay);

    // Закрытие
    el('close-friend-profile')?.addEventListener('click',()=>overlay.remove());
    overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});

    // Загружаем ссылки друга
    (async()=>{
      const lc=document.getElementById('friend-links-list');
      try{
        const{data:links,error}=await sb.from('profile_links').select('*').eq('user_id',u.id).order('order',{ascending:true});
        if(error)throw error;
        if(!links||!links.length){lc.textContent='Нет ссылок';return}
        lc.textContent='';
        const icons={telegram:'fab fa-telegram',youtube:'fab fa-youtube',discord:'fab fa-discord',vk:'fab fa-vk',twitter:'fab fa-x-twitter',website:'fas fa-globe',custom:'fas fa-link'};
        const colors={telegram:'#0088cc',youtube:'#ff0000',discord:'#5865f2',vk:'#4a76a8',twitter:'#1da1f2',website:'var(--accent)',custom:'var(--text-2)'};
        links.slice(0,5).forEach(l=>{
          const a=document.createElement('a');a.className='ud-link-item';a.href=l.url||'#';a.target='_blank';a.rel='noopener noreferrer';
          const ic=document.createElement('i');ic.className=icons[l.link_type]||'fas fa-link';ic.style.color=colors[l.link_type]||'var(--text-2)';
          const label=document.createElement('span');label.textContent=l.label||l.link_type;
          a.appendChild(ic);a.appendChild(label);lc.appendChild(a);
        });
      }catch(e){lc.textContent='Ошибка загрузки'}
    })();
  }catch(e){toast('Ошибка загрузки профиля','error')}
}
