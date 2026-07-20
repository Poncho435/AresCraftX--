// t.js — Themes
const ALL_THEMES=['dark','light','crimson','emerald','ocean','royal','cyber','midnight','sunset','lavender','mono'];
const THEME_ICONS={dark:'fa-moon',light:'fa-sun',crimson:'fa-fire',emerald:'fa-leaf',ocean:'fa-water',royal:'fa-crown',cyber:'fa-bolt',midnight:'fa-star',sunset:'fa-cloud-sun',lavender:'fa-spa',mono:'fa-adjust'};
let cTh=localStorage.getItem('acx_theme')||'dark';
function aTh(t){
  cTh=t;localStorage.setItem('acx_theme',t);
  const h=document.documentElement;
  if(ALL_THEMES.includes(t)){
    h.setAttribute('data-theme',t);
    // Правильный colorScheme для светлых тем
    h.style.colorScheme=(t==='light')?'light':'dark';
  }else{
    h.removeAttribute('data-theme');
    h.style.colorScheme=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';
  }
  // Обновляем иконку кнопки темы
  const tsb=el('theme-switcher');
  if(tsb){
    const icon=tsb.querySelector('i');
    if(icon){
      icon.className='fas '+(THEME_ICONS[t]||'fa-moon');
    }
  }
  // Обновляем активную карточку
  document.querySelectorAll('.theme-card').forEach(c=>c.classList.toggle('active',c.dataset.themeVal===t));
}
document.querySelectorAll('.theme-card').forEach(c=>c.addEventListener('click',()=>aTh(c.dataset.themeVal)));
const tsb=el('theme-switcher');
if(tsb)tsb.addEventListener('click',()=>{const idx=ALL_THEMES.indexOf(cTh);aTh(ALL_THEMES[(idx+1)%ALL_THEMES.length])});
aTh(cTh);
