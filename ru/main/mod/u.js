// u.js — UI: greeting, quotes, modals, particles, online, scroll-top
const hour=new Date().getHours();let timeGreet,timeIcon;if(hour>=5&&hour<12){timeGreet='Доброе утро';timeIcon='🌅'}else if(hour>=12&&hour<17){timeGreet='Добрый день';timeIcon='☀️'}else if(hour>=17&&hour<22){timeGreet='Добрый вечер';timeIcon='🌆'}else{timeGreet='Доброй ночи';timeIcon='🌙'}
const gr=[`${timeGreet}, ${un}! ${timeIcon}`,`${timeGreet}! ${timeIcon} ${un}, рады видеть!`,`${un}, ${timeGreet.toLowerCase()}! ${timeIcon}`,`${timeIcon} ${timeGreet}, ${un}!`];const wm=el('welcome-message');if(wm)wm.textContent=gr[Math.floor(Math.random()*gr.length)];
const quotes=['«Лучший способ предсказать будущее — создать его.» — Питер Друкер','«Код — это поэзия, написанная для машин и людей.»','«Каждый великий проект когда-то начинался с одной идеи.»','«Не бойтесь идти медленно, бойтесь стоять на месте.»','«Игры учат нас решать проблемы творчески.»','«Сообщество — это не количество людей, а качество связей.»','«Хороший сервер — это не код, а люди, которые его наполняют.»','«Даже самый длинный путь начинается с первого шага.» — Лао-цзы','«Создавай то, чем сам хочешь пользоваться.»','«Ошибки — это не провал, это данные для улучшения.»','«Лучший код — тот, который не нужно писать.»','«Маленькие шаги каждый день приводят к большим результатам.»','«Если что-то можно сделать — сделай это.»','«Простота — высшая степень утончённости.» — Леонардо да Винчи','«Команда — это когда каждый прикрывает спину другого.»','«Начни с того, что необходимо; затем сделай возможное; и вдруг ты делаешь невозможное.» — Франциск Ассизский','«Терпение и труд всё перетрут.» — русская пословица','«Идеальный сервер начинается с идеального сообщества.»','«Не важно, как медленно ты идёшь, главное — не останавливайся.» — Конфуций','«Строить что-то вместе — вот что делает нас сильнее.»','«Каждый баг — это возможность стать лучше.»','«Если ты не упал — ты не пытался.»','«Делай что можешь, с тем что имеешь, там где ты есть.» — Теодор Рузвельт','«Играй честно, побеждай достойно.»','«Лучшее время начать было вчера. Следующее лучшее время — сейчас.»','«Код как юмор: если нужно объяснять — значит не получилось.»','«Ничто не вдохновляет так, как увидеть результат своего труда.»','«Делай правильно или не делай вообще.»','«Каждый игрок — часть истории сервера.»','«Качество важнее количества.»','«Всё, что стоит делать, стоит делать хорошо.»'];
const today=new Date();const daySeed=today.getFullYear()*10000+(today.getMonth()+1)*100+today.getDate();const qEl=el('daily-quote');if(qEl)qEl.textContent=quotes[daySeed%quotes.length];

// Даты из настроек (если есть), иначе дефолт
const devStart=new Date(siteSettings.dev_start_date||'2026-07-15');const now=new Date();const daysInDev=Math.floor((now-devStart)/(864e5));const didEl=el('days-in-dev');if(didEl)didEl.textContent=daysInDev+' дн.';
const launchDate=new Date(siteSettings.launch_date||'2026-08-20');const daysUntil=Math.max(0,Math.floor((launchDate-now)/(864e5)));const dulEl=el('days-until-launch');if(dulEl)dulEl.textContent=daysUntil+' дн.';

// Версия сайта из настроек
const siteVersion=siteSettings.site_version||'2.1.0';
document.querySelectorAll('.stat-value').forEach(el=>{if(el.textContent.trim()==='2.1.0')el.textContent=siteVersion});

// Онлайн — скрыть если настройка выключена
if(siteSettings.show_online===false||siteSettings.show_online==='false'){
  const oc=el('online-count');if(oc)oc.parentElement.parentElement.style.display='none';
}

async function fetchOnline(){try{const r=await fetch('https://api.mcsrvstat.us/3/play.arescraftx.online');const d=await r.json();if(d.players){const oc=el('online-count');if(oc)oc.textContent=d.players.online||'0';if(el('connect-online'))el('connect-online').textContent=d.players.online||'0'}}catch(e){const oc=el('online-count');if(oc)oc.textContent='—'}}fetchOnline();setInterval(fetchOnline,30000);
async function updateNavStatus(){try{const r=await fetch('https://api.mcsrvstat.us/3/play.arescraftx.online');const d=await r.json();const dot=document.getElementById('nav-server-dot');if(dot){if(d.online){dot.style.background='var(--green)';dot.style.boxShadow='0 0 8px rgba(68,221,102,.4)'}else{dot.style.background='var(--red)';dot.style.boxShadow='0 0 8px rgba(255,80,80,.4)'}}}catch(e){const dot=document.getElementById('nav-server-dot');if(dot){dot.style.background='var(--text-3)';dot.style.boxShadow='none'}}}updateNavStatus();setInterval(updateNavStatus,30000);

function openM(id){document.getElementById(id).classList.add('active');document.body.style.overflow='hidden'}
function closeM(id){document.getElementById(id).classList.remove('active');document.body.style.overflow=''}
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeM(b.dataset.close)));
document.querySelectorAll('.modal-overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o){o.classList.remove('active');document.body.style.overflow=''}}));

const hamburger=el('hamburger-btn'),mobileNav=el('mobile-nav'),mobileOverlay=el('mobile-overlay');
if(hamburger&&mobileNav)hamburger.addEventListener('click',()=>{mobileNav.classList.add('active');if(mobileOverlay)mobileOverlay.classList.add('active')});
if(mobileOverlay)mobileOverlay.addEventListener('click',()=>{mobileNav?.classList.remove('active');mobileOverlay?.classList.remove('active')});
const mnc=el('mobile-nav-close');if(mnc)mnc.addEventListener('click',()=>{mobileNav?.classList.remove('active');if(mobileOverlay)mobileOverlay?.classList.remove('active')});
document.querySelectorAll('.mobile-nav-link').forEach(l=>l.addEventListener('click',()=>{mobileNav?.classList.remove('active');if(mobileOverlay)mobileOverlay?.classList.remove('active')}));
if(isAdmin){document.querySelectorAll('.admin-link').forEach(a=>a.style.display='');const aml=el('mobile-admin-link');if(aml)aml.style.display=''}

const pc=el('particles');if(pc){for(let i=0;i<25;i++){const p=document.createElement('div');p.className='particle';const s=Math.random()*2.5+1;p.style.width=s+'px';p.style.height=s+'px';p.style.left=Math.random()*100+'%';p.style.top=Math.random()*100+'%';p.style.animationDuration=(Math.random()*20+18)+'s';p.style.animationDelay=(Math.random()*12)+'s';p.style.opacity=Math.random()*.3+.1;pc.appendChild(p)}}

// Кнопка "Наверх" — ИСПРАВЛЕНА
const scrollBtn=el('scroll-top');
if(scrollBtn){
  window.addEventListener('scroll',()=>{
    scrollBtn.classList.toggle('visible',window.scrollY>400);
  });
  scrollBtn.addEventListener('click',()=>{
    window.scrollTo({top:0,behavior:'smooth'});
  });
}
