(function(){
'use strict';
const words={
 en:{stepProfile:'Your profile',stepDiscover:'Discover films',stepTune:'Fine-tune taste',back:'← Back to Studio',profile:'Your profile and signals',discover:'Films worth meeting next',tune:'Fine-tune your taste',language:'Interface language'},
 darija:{stepProfile:'البروفايل ديالك',stepDiscover:'كتاشف الأفلام',stepTune:'ضبط الذوق ديالك',back:'← رجع للاستوديو',profile:'البروفايل والإشارات',discover:'أفلام تستاهل تكتاشفها',tune:'حسّن التوصيات ديالك',language:'لغة الواجهة'},
 ar:{stepProfile:'ملف ذوقك',stepDiscover:'اكتشف الأفلام',stepTune:'اضبط ذوقك',back:'← العودة للاستوديو',profile:'ملف الذوق والإشارات',discover:'أفلام تستحق اكتشافها',tune:'حسّن توصياتك',language:'لغة الواجهة'},
 fr:{stepProfile:'Votre profil',stepDiscover:'Découvrir des films',stepTune:'Affiner vos goûts',back:'← Retour au studio',profile:'Profil et signaux',discover:'Des films à découvrir',tune:'Affiner vos recommandations',language:'Langue de l’interface'},
 es:{stepProfile:'Tu perfil',stepDiscover:'Descubrir películas',stepTune:'Ajustar tus gustos',back:'← Volver al estudio',profile:'Tu perfil y señales',discover:'Películas por descubrir',tune:'Ajustar recomendaciones',language:'Idioma de la interfaz'},
 de:{stepProfile:'Dein Profil',stepDiscover:'Filme entdecken',stepTune:'Geschmack verfeinern',back:'← Zurück zum Studio',profile:'Dein Profil und Signale',discover:'Filme, die du entdecken kannst',tune:'Empfehlungen verfeinern',language:'Oberflächensprache'},
 it:{stepProfile:'Il tuo profilo',stepDiscover:'Scopri film',stepTune:'Affina i tuoi gusti',back:'← Torna allo studio',profile:'Profilo e segnali',discover:'Film da scoprire',tune:'Affina i consigli',language:'Lingua dell’interfaccia'}
};
const headings={profile:document.querySelector('.tl-stats'),discover:document.querySelector('.tl-panel-heading h2'),tune:document.querySelector('#tl-feedback-note')};
function applyLanguage(lang){
 const d=words[lang]||words.en;
 document.documentElement.lang=lang==='darija'?'ar-MA':lang;
 document.documentElement.dir=lang==='ar'||lang==='darija'?'rtl':'ltr';
 document.querySelectorAll('[data-tl-i18n]').forEach(n=>{const k=n.dataset.tlI18n;if(d[k])n.textContent=d[k];});
 const back=document.querySelector('.tl-back-link');if(back)back.textContent=d.back;
 const select=document.getElementById('tl-language');if(select&&select.value!==lang)select.value=lang;
 try{localStorage.setItem('fr_taste_language',lang);}catch(_){}
}
function setStep(step){
 document.querySelectorAll('[data-tl-panel]').forEach(panel=>{
 const panels=(panel.dataset.tlPanel||'').split(/\s+/);panel.classList.toggle('tl-step-hidden',!panels.includes(step));
 });
 document.querySelectorAll('[data-tl-step]').forEach(button=>{
 const active=button.dataset.tlStep===step;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',active?'true':'false');
 });
 try{localStorage.setItem('fr_taste_step',step);}catch(_){}
 if(step==='profile')document.querySelector('.tl-stats')?.scrollIntoView({behavior:'smooth',block:'start'});
 else if(step==='discover')document.querySelector('.tl-feed-panel')?.scrollIntoView({behavior:'smooth',block:'start'});
 else document.querySelector('.tl-sidebar')?.scrollIntoView({behavior:'smooth',block:'start'});
}
document.addEventListener('DOMContentLoaded',()=>{
 const lang=document.getElementById('tl-language');
 let savedLang='en',savedStep='discover';
 try{savedLang=localStorage.getItem('fr_taste_language')||'en';savedStep=localStorage.getItem('fr_taste_step')||'discover';}catch(_){}
 if(lang){lang.value=words[savedLang]?savedLang:'en';lang.addEventListener('change',()=>applyLanguage(lang.value));}
 applyLanguage(savedLang);
 document.querySelectorAll('[data-tl-step]').forEach(b=>b.addEventListener('click',()=>setStep(b.dataset.tlStep)));
 setStep(['profile','discover','tune'].includes(savedStep)?savedStep:'discover');
});
})();