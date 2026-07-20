// a.js — Auth/Profile: VIEW mode, EDIT mode, Profile Links, Admin menu
if(el('profile-btn'))el('profile-btn').addEventListener('click',()=>openPM('view'));
if(el('profile-card-btn'))el('profile-card-btn')?.addEventListener('click',()=>openPM('view'));
if(el('action-profile'))el('action-profile')?.addEventListener('click',()=>openPM('view'));

let newAv=null;
let profileLinks=[];

// ===== PROFILE LINKS PRESETS =====
const LINK_PRESETS={
  telegram:{icon:'fab fa-telegram',color:'#0088cc',label:'Telegram',placeholder:'@username'},
  youtube:{icon:'fab fa-youtube',color:'#ff0000',label:'YouTube',placeholder:'URL канала'},
  discord:{icon:'fab fa-discord',color:'#5865f2',label:'Discord',placeholder:'username#0000 или invite'},
  vk:{icon:'fab fa-vk',color:'#4a76a8',label:'VK',placeholder:'VK ID или ссылка'},
  twitter:{icon:'fab fa-x-twitter',color:'#1da1f2',label:'Twitter/X',placeholder:'@username'},
  website:{icon:'fas fa-globe',color:'var(--accent)',label:'Сайт',placeholder:'https://...'},
  custom:{icon:'fas fa-link',color:'var(--text-2)',label:'Другая',placeholder:'https://...'}
};

// ===== OPEN PROFILE =====
function openPM(mode='view'){
  newAv=null;
  populateViewMode();
  if(mode==='view'){
    el('profile-view-mode').style.display='block';
    el('profile-edit-mode').style.display='none';
  }else{
    el('profile-view-mode').style.display='none';
    el('profile-edit-mode').style.display='block';
    populateEditMode();
  }
  openM('profile-modal');
}

function populateViewMode(){
  // Avatar
  const va=el('view-avatar');if(va)va.src=avSrc;
  // Username
  const vn=el('view-username');if(vn)vn.textContent=un;
  // Description
  const vd=el('view-description');
  const desc=ud?.description||meta.description||'';
  if(vd)vd.textContent=desc||'Нет описания';
  if(vd){vd.style.display=desc?'block':'none'}
  // Status
  const currentSt=localStorage.getItem('acx_status')||'online';
  const dot=el('view-status-dot');
  const txt=el('view-status-text');
  if(dot){
    if(currentSt==='online'){dot.style.background='var(--green)';dot.style.boxShadow='0 0 8px rgba(68,221,102,.4)'}
    else if(currentSt==='dnd'){dot.style.background='var(--red)';dot.style.boxShadow='0 0 8px rgba(255,80,80,.4)'}
    else{dot.style.background='var(--text-3)';dot.style.boxShadow='none'}
  }
  if(txt)txt.textContent=currentSt==='online'?'В сети':currentSt==='dnd'?'Не беспокоить':'Не в сети';
  // Stats
  const em=el('view-email');if(em)em.textContent=ud?.email||user.email||'—';
  const bdV=el('view-birthday');if(bdV)bdV.textContent=bday||'Не указана';
  const gd=ud?.gender||meta.gender||'not_specified';
  const gdV=el('view-gender');
  if(gdV)gdV.textContent=gd==='male'?'Мужской':gd==='female'?'Женский':gd==='other'?'Другой':'Не указан';
  const mcNv=el('view-mc-nick');if(mcNv)mcNv.textContent=mcN||'Не указан';
  const mcMv=el('view-mc-mode');if(mcMv)mcMv.textContent=mcM==='anarchy'?'Анархия':mcM==='vanilla'?'Ванила+':'Не выбран';
  const mfa=el('view-2fa');if(mfa){mfa.textContent=meta.mfa_enabled?'✅ Включена':'❌ Отключена';mfa.style.color=meta.mfa_enabled?'var(--green)':'var(--red)'}
  const ll=el('view-last-login');if(ll)ll.textContent=window.ll?new Date(window.ll).toLocaleString('ru-RU'):'Первый вход';
  const jr=el('view-joined');if(jr)jr.textContent=user.created_at?new Date(user.created_at).toLocaleDateString('ru-RU'):'—';
  // Links
  loadProfileLinksView();
}

function populateEditMode(){
  const e=el('edit-avatar-preview');if(e)e.src=avSrc;
  const eu=el('edit-username');if(eu)eu.value=un;
  const ee=el('edit-email');if(ee)ee.value=ud?.email||user.email||'';
  const eb=el('edit-birthday');if(eb)eb.value=bd;
  const eg=el('edit-gender');if(eg)eg.value=ud?.gender||meta.gender||'';
  const emn=el('edit-mc-nick');if(emn)emn.value=mcN;
  const emm=el('edit-mc-mode');if(emm)emm.value=mcM;
  const d=ud?.description||meta.description||'';
  const ed=el('edit-description');if(ed){ed.value=d;const dc=el('desc-char-count');if(dc)dc.textContent=d.length}
  const ps=el('profile-status');if(ps)ps.textContent='';
  loadProfileLinksEditor();
}

// ===== EDIT / CANCEL TOGGLE =====
const editToggle=el('profile-edit-toggle');
if(editToggle)editToggle.addEventListener('click',()=>{
  el('profile-view-mode').style.display='none';
  el('profile-edit-mode').style.display='block';
  populateEditMode();
});
const cancelEdit=el('cancel-edit-btn');
if(cancelEdit)cancelEdit.addEventListener('click',()=>{
  el('profile-edit-mode').style.display='none';
  el('profile-view-mode').style.display='block';
  populateViewMode();
});

// ===== AVATAR UPLOAD =====
const ainput=el('edit-avatar-input');
if(ainput)ainput.addEventListener('change',function(){
  const f=this.files[0];if(!f)return;
  const aT=['image/jpeg','image/png','image/gif','image/webp','image/bmp'];
  if(!aT.includes(f.type)){toast('Только JPG, PNG, GIF, WebP','error');this.value='';return}
  const ext=f.name.split('.').pop().toLowerCase();
  const aE=['jpg','jpeg','png','gif','webp','bmp'];
  if(!aE.includes(ext)){toast('Недопустимое расширение','error');this.value='';return}
  if(f.size>2097152){toast('Файл слишком большой (макс 2MB)','error');this.value='';return}
  const r=new FileReader();
  r.onload=e=>{
    newAv=e.target.result;
    if(!newAv.match(/^data:image\/(jpeg|png|gif|webp|bmp);base64,/)){toast('Недопустимый формат','error');newAv=null;return}
    const p=el('edit-avatar-preview');if(p)p.src=newAv
  };
  r.readAsDataURL(f)
});

// ===== DESCRIPTION CHAR COUNT =====
const edi=el('edit-description');
if(edi)edi.addEventListener('input',function(){const dc=el('desc-char-count');if(dc)dc.textContent=this.value.length});

// ===== PROFILE LINKS — LOAD FROM DB =====
async function loadProfileLinksFromDB(){
  try{
    const{data}=await sb.from('profile_links').select('*').eq('user_id',user.id).order('order',{ascending:true});
    profileLinks=data||[];
  }catch(e){profileLinks=[]}
  return profileLinks;
}

// ===== VIEW: LINKS =====
async function loadProfileLinksView(){
  await loadProfileLinksFromDB();
  const container=el('view-links');
  if(!container)return;
  container.textContent='';
  if(profileLinks.length===0){
    container.style.display='none';
    const section=container.parentElement;if(section)section.style.display='none';
    return;
  }
  container.parentElement.style.display='';
  container.style.display='flex';
  const visible=profileLinks.slice(0,5);
  visible.forEach(link=>{
    const preset=LINK_PRESETS[link.link_type]||LINK_PRESETS.custom;
    const a=document.createElement('a');
    a.className='profile-view-link';
    a.href=link.url||'#';
    a.target='_blank';
    a.rel='noopener noreferrer';
    const icon=document.createElement('i');
    icon.className=preset.icon;
    icon.style.color=preset.color;
    const label=document.createElement('span');
    label.textContent=link.label||preset.label;
    a.appendChild(icon);a.appendChild(label);
    container.appendChild(a);
  });
}

// ===== EDIT: LINKS EDITOR =====
async function loadProfileLinksEditor(){
  await loadProfileLinksFromDB();
  const list=el('links-editor-list');
  if(!list)return;
  list.textContent='';
  const cnt=el('links-count');
  if(cnt)cnt.textContent=`(${profileLinks.length}/5)`;
  profileLinks.forEach((link,i)=>{
    const preset=LINK_PRESETS[link.link_type]||LINK_PRESETS.custom;
    const row=document.createElement('div');
    row.className='link-editor-row';
    row.dataset.linkId=link.id;
    const icon=document.createElement('i');
    icon.className=preset.icon;
    icon.style.color=preset.color;
    icon.style.fontSize='1.1rem';
    icon.style.width='20px';
    icon.style.textAlign='center';
    icon.style.flexShrink='0';
    const labelInput=document.createElement('input');
    labelInput.type='text';
    labelInput.className='link-label-input';
    labelInput.value=link.label||preset.label;
    labelInput.placeholder='Название';
    labelInput.maxLength=30;
    const urlInput=document.createElement('input');
    urlInput.type='url';
    urlInput.className='link-url-input';
    urlInput.value=link.url||'';
    urlInput.placeholder=preset.placeholder||'https://...';
    const removeBtn=document.createElement('button');
    removeBtn.className='link-remove-btn';
    removeBtn.innerHTML='<i class="fas fa-trash"></i>';
    removeBtn.title='Удалить';
    removeBtn.addEventListener('click',async()=>{
      try{
        await sb.from('profile_links').delete().eq('id',link.id);
        toast('Ссылка удалена','success');
        loadProfileLinksEditor();
      }catch(e){toast('Ошибка удаления','error')}
    });
    row.appendChild(icon);row.appendChild(labelInput);row.appendChild(urlInput);row.appendChild(removeBtn);
    list.appendChild(row);
  });
}

// ===== ADD LINK BUTTON =====
const addLinkBtn=el('add-link-btn');
const addLinkDD=el('add-link-dropdown');
if(addLinkBtn&&addLinkDD){
  addLinkBtn.addEventListener('click',(e)=>{
    e.stopPropagation();
    addLinkDD.style.display=addLinkDD.style.display==='none'?'block':'none';
  });
  document.addEventListener('click',(e)=>{
    if(!e.target.closest('.add-link-dropdown')&&!e.target.closest('#add-link-btn')){
      addLinkDD.style.display='none';
    }
  });
  addLinkDD.querySelectorAll('.add-link-preset').forEach(item=>{
    item.addEventListener('click',async()=>{
      const type=item.dataset.linkType;
      if(profileLinks.length>=5){toast('Максимум 5 ссылок','warning');addLinkDD.style.display='none';return}
      const preset=LINK_PRESETS[type];
      try{
        await sb.from('profile_links').insert({
          user_id:user.id,
          link_type:type,
          label:preset.label,
          url:'',
          order:profileLinks.length
        });
        toast('Ссылка добавлена','success');
        addLinkDD.style.display='none';
        loadProfileLinksEditor();
      }catch(e){toast('Ошибка добавления','error')}
    });
  });
}

// ===== TRACK CHANGES =====
function getChanges(){
  const changes=[];
  const newUn=el('edit-username')?.value.trim()||un;
  if(newUn!==un)changes.push({field:'username',from:un,to:newUn});
  const newBd=el('edit-birthday')?.value||'';
  if(newBd!==bd)changes.push({field:'birthday',from:bd||'—',to:newBd||'—'});
  const newGd=el('edit-gender')?.value||'not_specified';
  if(newGd!==(ud?.gender||meta.gender||'not_specified'))changes.push({field:'gender',from:ud?.gender||meta.gender||'—',to:newGd});
  const newDesc=el('edit-description')?.value.trim()||'';
  if(newDesc!==(ud?.description||meta.description||''))changes.push({field:'description',from:'(изменено)',to:'(изменено)'});
  const newMc=el('edit-mc-nick')?.value.trim()||'';
  if(newMc!==mcN)changes.push({field:'mc_nick',from:mcN||'—',to:newMc||'—'});
  const newMode=el('edit-mc-mode')?.value||'';
  if(newMode!==mcM)changes.push({field:'mc_mode',from:mcM||'—',to:newMode||'—'});
  if(newAv)changes.push({field:'avatar',from:'(старый)',to:'(новый)'});
  return changes;
}

// ===== SAVE PROFILE =====
const spb=el('save-profile-btn');
if(spb)spb.addEventListener('click',async()=>{
  let n=el('edit-username')?.value.trim()||un;const b=el('edit-birthday')?.value||'';
  const g=el('edit-gender')?.value||'';let d=el('edit-description')?.value.trim()||'';
  let mn=el('edit-mc-nick')?.value.trim()||'';const mm=el('edit-mc-mode')?.value||'';
  const st=el('profile-status');
  const changes=getChanges();

  if(window.SanitizeInput){n=SanitizeInput.username(n);d=SanitizeInput.description(d);mn=SanitizeInput.mcNick(mn)}
  if(window.RateLimiter&&!RateLimiter.check('profile_save',5,60000)){if(st){st.textContent='❌ Слишком часто';st.className='modal-status error'}return}
  if(!n||n.length<3){if(st){st.textContent='❌ Минимум 3 символа';st.className='modal-status error'}return}
  try{
    if(st){st.textContent='⏳ Сохранение...';st.className='modal-status'}
    const up={username:n,birthday:b,gender:g||'not_specified',description:d,mc_nick:mn,mc_mode:mm};
    const{error:e1}=await sb.from('users').upsert({id:user.id,...up,email:user.email},{onConflict:'id'});if(e1)throw e1;
    const mu={username:n,birthday:b,gender:g||'not_specified',description:d,mc_nick:mn,mc_mode:mm};
    if(newAv)mu.avatar_url=newAv;
    const{error:e2}=await sb.auth.updateUser({data:mu});if(e2)throw e2;

    // Save profile links
    const linkRows=el('links-editor-list')?.querySelectorAll('.link-editor-row');
    if(linkRows){
      for(const row of linkRows){
        const lid=row.dataset.linkId;
        const lbl=row.querySelector('.link-label-input')?.value?.trim()||'';
        const url=row.querySelector('.link-url-input')?.value?.trim()||'';
        try{await sb.from('profile_links').update({label:lbl,url}).eq('id',lid)}catch(e){}
      }
    }

    if(st){st.textContent='';toast('Сохранено','success')}

    if(window.logAction&&changes.length>0){
      for(const ch of changes){await logAction('profile_update',ch)}
    }

    window.un=n;
    const a=newAv||avSrc;
    const uae=el('user-avatar');if(uae)uae.src=a;
    const hae=el('hero-avatar');if(hae)hae.src=a;
    const pae=el('profile-avatar');if(pae)pae.src=a;
    const une=el('user-name');if(une)une.textContent=n;
    const pun=el('profile-username');if(pun)pun.textContent=n;
    const pud=el('profile-description');if(pud)pud.textContent=d||'Нет описания';

    // Switch to view mode
    el('profile-edit-mode').style.display='none';
    el('profile-view-mode').style.display='block';
    populateViewMode();
  }catch(err){if(st){st.textContent=`❌ ${err.message}`;st.className='modal-status error'}}
});

// ===== ADMIN MENU =====
if(window.isAdmin){
  const ad=el('admin-nav-dropdown');if(ad)ad.style.display='';
  const aml=el('mobile-admin-link');if(aml)aml.style.display='';

  // Broadcast
  if(el('admin-broadcast-link'))el('admin-broadcast-link').addEventListener('click',(e)=>{e.preventDefault();openM('admin-broadcast-modal')});
  if(el('admin-broadcast-send'))el('admin-broadcast-send').addEventListener('click',async()=>{
    const subj=el('admin-broadcast-subject')?.value?.trim();
    const msg=el('admin-broadcast-message')?.value?.trim();
    const st=el('admin-broadcast-status');
    if(!subj||!msg){if(st){st.textContent='❌ Заполните все поля';st.className='modal-status error'}return}
    if(st){st.textContent='⏳ Отправка...';st.className='modal-status'}
    try{
      // Get all user emails
      const{data:users}=await sb.from('users').select('email');
      if(!users||!users.length){if(st){st.textContent='❌ Нет пользователей';st.className='modal-status error'}return}
      // Send via EmailJS (or backend)
      let sent=0;
      for(const u of users){
        try{
          await fetch('https://api.emailjs.com/api/v1.0/email/send',{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
              service_id:'service_wao8uyu',template_id:'template_aoqajd5',user_id:'kKTaWZRSBG53fUs48',
              template_params:{to_email:u.email,email:u.email,user_email:u.email,verification_code:subj,site_name:msg}
            })
          });
          sent++;
        }catch(e){}
      }
      if(st){st.textContent='';toast(`Отправлено ${sent}/${users.length}`,'success')}
      if(window.logAction)await logAction('admin_broadcast',{subject:subj,sent,total:users.length});
      setTimeout(()=>closeM('admin-broadcast-modal'),800);
    }catch(e){if(st){st.textContent='❌ '+e.message;st.className='modal-status error'}}
  });

  // Push to all
  if(el('admin-push-all-link'))el('admin-push-all-link').addEventListener('click',(e)=>{e.preventDefault();openM('admin-push-modal')});
  if(el('admin-push-send'))el('admin-push-send').addEventListener('click',async()=>{
    const title=el('admin-push-title')?.value?.trim();
    const msg=el('admin-push-message')?.value?.trim();
    const st=el('admin-push-status');
    if(!title||!msg){if(st){st.textContent='❌ Заполните все поля';st.className='modal-status error'}return}
    try{
      const{data:subs}=await sb.from('push_subscriptions').select('user_id');
      if(subs&&subs.length>0){
        const{error}=await sb.from('user_notifications').insert(
          subs.map(s=>({user_id:s.user_id,title,message:msg,type:'system',data:{admin_push:true}}))
        );
        if(error)throw error;
        if(st){st.textContent='';toast(`Push отправлен ${subs.length} пользователям`,'success')}
      }else{
        if(st){st.textContent='';toast('Нет подписчиков push','info')}
      }
      if(window.logAction)await logAction('admin_push_all',{title,count:subs?.length||0});
      setTimeout(()=>closeM('admin-push-modal'),800);
    }catch(e){if(st){st.textContent='❌ '+e.message;st.className='modal-status error'}}
  });

  // News
  if(el('admin-news-link'))el('admin-news-link').addEventListener('click',(e)=>{e.preventDefault();openM('admin-news-modal')});
  if(el('admin-news-send'))el('admin-news-send').addEventListener('click',async()=>{
    const title=el('admin-news-title')?.value?.trim();
    const content=el('admin-news-content')?.value?.trim();
    const category=el('admin-news-category')?.value||'system';
    const st=el('admin-news-status');
    if(!title||!content){if(st){st.textContent='❌ Заполните все поля';st.className='modal-status error'}return}
    try{
      // Insert news article + notify all users
      const{error}=await sb.from('news').insert({title,content,category,author_id:user.id,created_at:new Date().toISOString()});
      // Notify all users
      const{data:users}=await sb.from('users').select('id');
      if(users&&users.length>0){
        await sb.from('user_notifications').insert(users.map(u=>({user_id:u.id,title,message:content.substring(0,100),type:'news',action_url:'/ru/main/server.html'})));
      }
      if(st){st.textContent='';toast('Новость опубликована','success')}
      if(window.logAction)await logAction('admin_news',{title,category});
      setTimeout(()=>closeM('admin-news-modal'),800);
    }catch(e){if(st){st.textContent='❌ '+e.message;st.className='modal-status error'}}
  });

  // Ban
  if(el('admin-ban-link'))el('admin-ban-link').addEventListener('click',(e)=>{e.preventDefault();openM('admin-ban-modal')});
  if(el('admin-ban-send'))el('admin-ban-send').addEventListener('click',async()=>{
    const userIdOrName=el('admin-ban-userid')?.value?.trim();
    const reason=el('admin-ban-reason')?.value?.trim()||'Не указана';
    const duration=el('admin-ban-duration')?.value||'1d';
    const st=el('admin-ban-status');
    if(!userIdOrName){if(st){st.textContent='❌ Укажите пользователя';st.className='modal-status error'}return}
    if(st){st.textContent='⏳ Бан...';st.className='modal-status'}
    try{
      let targetId=userIdOrName;
      if(!userIdOrName.includes('-')){
        const{data:found}=await sb.from('users').select('id').ilike('username',userIdOrName).limit(1);
        if(!found||!found.length){if(st){st.textContent='❌ Пользователь не найден';st.className='modal-status error'}return}
        targetId=found[0].id;
      }
      const now=new Date();
      let bannedUntil=null;
      if(duration!=='permanent'){
        const ms={h:3600000,d:86400000};
        const val=parseInt(duration);
        const unit=duration.replace(val,'');
        bannedUntil=new Date(now.getTime()+(val*(ms[unit]||86400000))).toISOString();
      }
      const{error:banErr}=await sb.from('user_bans').upsert({user_id:targetId,reason,banned_until:bannedUntil,banned_by:user.id,created_at:now.toISOString()},{onConflict:'user_id'});
      if(banErr)throw banErr;
      // Kill all their sessions (через RPC с SECURITY DEFINER)
      try{const kr=await sb.rpc('kill_all_user_sessions',{p_target_id:targetId});if(kr.error)console.warn('Kill sessions:',kr.error.message)}catch(e){console.warn('Kill sessions err:',e)}
      if(st){st.textContent='';toast('Пользователь забанен','success')}
      if(window.logAction)await logAction('admin_ban',{target:targetId,reason,duration});
      setTimeout(()=>closeM('admin-ban-modal'),800);
    }catch(e){if(st){st.textContent='❌ '+e.message;st.className='modal-status error'}}
  });

  // Logs
  if(el('admin-logs-link'))el('admin-logs-link').addEventListener('click',(e)=>{e.preventDefault();window.location.href='../admin/admin.html'});

  // Settings
  if(el('admin-settings-link'))el('admin-settings-link').addEventListener('click',(e)=>{e.preventDefault();window.location.href='../admin/admin.html'});
}

// ===== LANGUAGE SWITCHING =====
const navLangSel=el('lang-select');
const settingsLangSel=el('settings-lang-select');
if(navLangSel){
  navLangSel.value=currentLang;
  navLangSel.addEventListener('change',()=>{setLang(navLangSel.value)});
}
if(settingsLangSel){
  settingsLangSel.value=currentLang;
  settingsLangSel.addEventListener('change',()=>{
    setLang(settingsLangSel.value);
    if(navLangSel)navLangSel.value=settingsLangSel.value;
  });
}
