// u.js — UI: greeting, quotes, modals, particles, online, scroll-top (EN)
const hour=new Date().getHours();let timeGreet,timeIcon;if(hour>=5&&hour<12){timeGreet='Good morning';timeIcon='🌅'}else if(hour>=12&&hour<17){timeGreet='Good afternoon';timeIcon='☀️'}else if(hour>=17&&hour<22){timeGreet='Good evening';timeIcon='🌆'}else{timeGreet='Good night';timeIcon='🌙'}
const gr=[`${timeGreet}, ${un}! ${timeIcon}`,`${timeGreet}! ${timeIcon} ${un}, great to see you!`,`${un}, ${timeGreet.toLowerCase()}! ${timeIcon}`,`${timeIcon} ${timeGreet}, ${un}!`];const wm=el('welcome-message');if(wm)wm.textContent=gr[Math.floor(Math.random()*gr.length)];
const quotes=['"The best way to predict the future is to create it." — Peter Drucker','"Code is poetry written for machines and people."','"Every great project once started with a single idea."','"Don\'t be afraid to go slowly, be afraid of standing still."','"Games teach us to solve problems creatively."','"Community is not about the number of people, but the quality of connections."','"A good server is not the code, but the people who fill it."','"Even the longest journey begins with the first step." — Lao Tzu','"Build what you yourself want to use."','"Mistakes are not failure, they are data for improvement."','"The best code is the code you don\'t have to write."','"Small steps every day lead to big results."','"If something can be done — do it."','"Simplicity is the ultimate sophistication." — Leonardo da Vinci','"A team is when everyone has each other\'s back."','"Start with what is necessary; then do what is possible; and suddenly you are doing the impossible." — Francis of Assisi','"Patience and hard work conquer everything."','"The perfect server starts with the perfect community."','"It doesn\'t matter how slowly you go, as long as you don\'t stop." — Confucius','"Building something together is what makes us stronger."','"Every bug is an opportunity to become better."','"If you haven\'t fallen, you haven\'t tried."','"Do what you can, with what you have, where you are." — Theodore Roosevelt','"Play fair, win with dignity."','"The best time to start was yesterday. The next best time is now."','"Code is like humor: if you have to explain it, it didn\'t work."','"Nothing inspires like seeing the result of your labor."','"Do it right or don\'t do it at all."','"Every player is part of the server\'s history."','"Quality over quantity."','"Whatever is worth doing is worth doing well."'];
const today=new Date();const daySeed=today.getFullYear()*10000+(today.getMonth()+1)*100+today.getDate();const qEl=el('daily-quote');if(qEl)qEl.textContent=quotes[daySeed%quotes.length];

const devStart=new Date(siteSettings.dev_start_date||'2026-07-15');const now=new Date();const daysInDev=Math.floor((now-devStart)/(864e5));const didEl=el('days-in-dev');if(didEl)didEl.textContent=daysInDev+' days';
const launchDate=new Date(siteSettings.launch_date||'2026-08-20');const daysUntil=Math.max(0,Math.floor((launchDate-now)/(864e5)));const dulEl=el('days-until-launch');if(dulEl)dulEl.textContent=daysUntil+' days';

const siteVersion=siteSettings.site_version||'2.1.0';
document.querySelectorAll('.stat-value').forEach(el=>{if(el.textContent.trim()==='2.1.0')el.textContent=siteVersion});

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

const scrollBtn=el('scroll-top');
if(scrollBtn){
  window.addEventListener('scroll',()=>{scrollBtn.classList.toggle('visible',window.scrollY>400);});
  scrollBtn.addEventListener('click',()=>{window.scrollTo({top:0,behavior:'smooth'});});
}
