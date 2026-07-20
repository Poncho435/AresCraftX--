// n.js — Notifications + Push (переработка)
let notifsList=[];
let unreadCount=0;

const NOTIF_CATEGORIES={
  friend_request:{icon:'fa-user-plus',color:'#ff8800',bg:'rgba(255,136,0,.12)',label:'Запрос дружбы'},
  friend_accepted:{icon:'fa-user-check',color:'#44dd66',bg:'rgba(68,221,102,.12)',label:'Друг добавлен'},
  security:{icon:'fa-shield-alt',color:'#ff5050',bg:'rgba(255,80,80,.12)',label:'Безопасность'},
  news:{icon:'fa-newspaper',color:'#388cff',bg:'rgba(56,140,255,.12)',label:'Новости'},
  event:{icon:'fa-calendar-star',color:'#8c50ff',bg:'rgba(140,80,255,.12)',label:'Ивенты'},
  system:{icon:'fa-cog',color:'#888',bg:'rgba(136,136,136,.12)',label:'Система'},
  login:{icon:'fa-key',color:'#00c8ff',bg:'rgba(0,200,255,.12)',label:'Вход'},
  message:{icon:'fa-comment',color:'#ff8800',bg:'rgba(255,136,0,.12)',label:'Сообщения'},
  other:{icon:'fa-bell',color:'#888',bg:'rgba(136,136,136,.12)',label:'Уведомление'}
};

async function loadNotifications(){
  try{
    const{data}=await sb.from('user_notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50);
    notifsList=data||[];
    unreadCount=notifsList.filter(n=>!n.read).length;
    renderNotifications();
    updateNotifBadge();
  }catch(e){console.error('Notifs load error:',e)}
}

function renderNotifications(){
  const list=el('notif-list');const cnt=el('notif-count');
  if(cnt)cnt.textContent=notifsList.length;
  if(!list)return;
  list.textContent='';
  if(notifsList.length===0){
    const empty=document.createElement('div');empty.className='notif-empty';
    const emptyIcon=document.createElement('div');emptyIcon.className='notif-empty-icon';emptyIcon.innerHTML='<i class="far fa-bell-slash"></i>';
    const emptyText=document.createElement('div');emptyText.className='notif-empty-text';emptyText.textContent='Нет уведомлений';
    const emptySub=document.createElement('div');emptySub.className='notif-empty-sub';emptySub.textContent='Здесь будут ваши оповещения';
    empty.appendChild(emptyIcon);empty.appendChild(emptyText);empty.appendChild(emptySub);
    list.appendChild(empty);return
  }

  notifsList.forEach(n=>{
    const cat=NOTIF_CATEGORIES[n.type]||NOTIF_CATEGORIES.other;
    const row=document.createElement('div');row.className='notif-item'+(n.read?' notif-read':' notif-unread');

    // Иконка
    const iconWrap=document.createElement('div');iconWrap.className='notif-icon-circle';
    iconWrap.style.cssText='background:'+cat.bg+';color:'+cat.color;
    iconWrap.innerHTML='<i class="fas '+cat.icon+'"></i>';

    const body=document.createElement('div');body.className='notif-body';
    const header=document.createElement('div');header.className='notif-header';
    const title=document.createElement('span');title.className='notif-title';title.textContent=n.title;
    const time=document.createElement('span');time.className='notif-time';time.textContent=formatTime(n.created_at);
    header.appendChild(title);header.appendChild(time);
    const msg=document.createElement('div');msg.className='notif-msg';msg.textContent=n.message||'';
    body.appendChild(header);body.appendChild(msg);

    row.appendChild(iconWrap);row.appendChild(body);

    // Непрочитанная точка
    if(!n.read){const dot=document.createElement('div');dot.className='notif-unread-dot';row.appendChild(dot)}

    // Кнопки действий
    if(n.type==='friend_request'&&n.data){
      try{
        const d=typeof n.data==='string'?JSON.parse(n.data):n.data;
        if(d.from_id){
          const actions=document.createElement('div');actions.className='notif-actions';
          const accBtn=document.createElement('button');accBtn.className='notif-act-btn notif-act-accept';
          accBtn.innerHTML='<i class="fas fa-check"></i>';accBtn.title='Принять';
          accBtn.addEventListener('click',async(e)=>{e.stopPropagation();
            try{await sb.rpc('accept_friend_request',{p_req_id:d.request_id});markRead(n.id);loadNotifications();loadFriends()}catch(e){toast('Ошибка','error')}
          });
          const decBtn=document.createElement('button');decBtn.className='notif-act-btn notif-act-decline';
          decBtn.innerHTML='<i class="fas fa-times"></i>';decBtn.title='Отклонить';
          decBtn.addEventListener('click',async(e)=>{e.stopPropagation();
            try{await sb.rpc('decline_friend_request',{p_req_id:d.request_id});markRead(n.id);loadNotifications()}catch(e){toast('Ошибка','error')}
          });
          actions.appendChild(accBtn);actions.appendChild(decBtn);row.appendChild(actions);
        }
      }catch(e){}
    }

    // Клик = прочитать + перейти
    row.addEventListener('click',()=>{
      markRead(n.id);
      if(n.action_url){window.location.href=n.action_url}
    });
    list.appendChild(row)
  })
}

function formatTime(ts){
  if(!ts)return '';
  const d=new Date(ts);const now=new Date();const diff=Math.floor((now-d)/1000);
  if(diff<60)return 'сейчас';if(diff<3600)return Math.floor(diff/60)+' мин.';
  if(diff<86400)return Math.floor(diff/3600)+' ч.';
  if(diff<604800)return Math.floor(diff/86400)+' дн.';
  return d.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'})
}

async function markRead(id){
  try{await sb.rpc('mark_notifications_read',{p_ids:[id]});
  const n=notifsList.find(x=>x.id===id);if(n){n.read=true;unreadCount=Math.max(0,unreadCount-1)}
  renderNotifications();updateNotifBadge()}catch(e){}
}

async function markAllRead(){
  const ids=notifsList.filter(n=>!n.read).map(n=>n.id);
  if(!ids.length)return;
  try{await sb.rpc('mark_notifications_read',{p_ids:ids});
  notifsList.forEach(n=>n.read=true);unreadCount=0;
  renderNotifications();updateNotifBadge()}catch(e){}
}

async function deleteNotification(id){
  try{await sb.from('user_notifications').delete().eq('id',id);
  notifsList=notifsList.filter(n=>n.id!==id);
  unreadCount=notifsList.filter(n=>!n.read).length;
  renderNotifications();updateNotifBadge()}catch(e){toast('Ошибка удаления','error')}
}

async function clearReadNotifications(){
  const readIds=notifsList.filter(n=>n.read).map(n=>n.id);
  if(!readIds.length){toast('Нет прочитанных','info');return}
  try{await sb.from('user_notifications').delete().in('id',readIds);
  notifsList=notifsList.filter(n=>!n.read);renderNotifications();updateNotifBadge();
  toast('Очищено','success')}catch(e){toast('Ошибка','error')}
}

function updateNotifBadge(){
  const badge=el('notif-badge');
  if(badge){badge.style.display=unreadCount>0?'flex':'none';badge.textContent=unreadCount>99?'99+':unreadCount}
}

// Кнопка уведомлений
const nb=el('notif-btn');
if(nb){
  let notifOpen=false;
  nb.addEventListener('click',(e)=>{
    e.stopPropagation();
    const dd=el('notif-dropdown');if(!dd)return;
    notifOpen=!notifOpen;dd.classList.toggle('active',notifOpen);
    if(notifOpen)loadNotifications()
  });
  document.addEventListener('click',(e)=>{
    if(notifOpen&&!e.target.closest('#notif-dropdown')&&!e.target.closest('#notif-btn')){
      const dd=el('notif-dropdown');if(dd)dd.classList.remove('active');notifOpen=false
    }
  })
}
const mar=el('mark-all-read-btn');if(mar)mar.addEventListener('click',markAllRead);
const clr=el('clear-read-btn');if(clr)clr.addEventListener('click',clearReadNotifications);

// ===== PUSH =====
const VAPID_PUBLIC_KEY='BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3lfgDzkrIeUgJWHP0N3qb_D2f3Xz5B5gM6j9C1Z7F3Hx8X4';

function urlBase64ToUint8Array(base64String){
  const padding='='.repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/\-/g,'+').replace(/_/g,'/');
  const rawData=window.atob(base64);
  return Uint8Array.from([...rawData].map(char=>char.charCodeAt(0)))
}

async function subscribePush(){
  if(!('serviceWorker' in navigator)||!('PushManager' in window)){toast('Push не поддерживается','error');return}
  try{
    const permission=await Notification.requestPermission();
    if(permission!=='granted'){toast('Уведомления отклонены','error');return}
    const reg=await navigator.serviceWorker.ready;
    let sub=await reg.pushManager.getSubscription();
    if(!sub){sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(VAPID_PUBLIC_KEY)})}
    const keys=sub.toJSON().keys;
    await sb.from('push_subscriptions').upsert({user_id:user.id,endpoint:sub.endpoint,p256dh:keys.p256dh,auth_key:keys.auth},{onConflict:'endpoint'});
    toast('Push включены','success');
    const toggle=el('push-toggle');if(toggle)toggle.checked=true;
    try{await sb.from('user_settings').update({push_enabled:true}).eq('user_id',user.id)}catch(e){}
  }catch(e){toast('Ошибка подписки: '+e.message,'error')}
}

async function unsubscribePush(){
  if(!('serviceWorker' in navigator)){return}
  try{
    const reg=await navigator.serviceWorker.ready;
    const sub=await reg.pushManager.getSubscription();
    if(sub){await sub.unsubscribe();await sb.from('push_subscriptions').delete().eq('endpoint',sub.endpoint)}
    toast('Push отключены','info');
    const toggle=el('push-toggle');if(toggle)toggle.checked=false;
    try{await sb.from('user_settings').update({push_enabled:false}).eq('user_id',user.id)}catch(e){}
  }catch(e){toast('Ошибка: '+e.message,'error')}
}

const pushTgl=el('push-toggle');
if(pushTgl){
  (async()=>{try{const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();pushTgl.checked=!!sub}catch(e){}})();
  pushTgl.addEventListener('change',async()=>{if(pushTgl.checked)await subscribePush();else await unsubscribePush()})
}

function showSystemNotification(n){
  if(Notification.permission!=='granted')return;
  const notif=new Notification('AresCraftX — '+n.title,{
    body:n.message||'',icon:'/ru/assets/logo.png',badge:'/ru/assets/logo.png',
    tag:n.id,vibrate:[100,50,100],data:{url:n.action_url||'/',notifId:n.id}
  });
  notif.onclick=()=>{window.focus();markRead(n.id);if(n.action_url)window.location.href=n.action_url};
}

// Realtime
sb.channel('notifs-'+user.id).on('postgres_changes',
  {event:'INSERT',schema:'public',table:'user_notifications',filter:'user_id=eq.'+user.id},
  (payload)=>{
    const n=payload.new;
    notifsList.unshift(n);unreadCount++;renderNotifications();updateNotifBadge();
    showSystemNotification(n);
  }
).subscribe();

loadNotifications();
