(function(){
'use strict';
const FEEDBACK_KEY='fr_taste_feedback_v1',FILTER_KEY='fr_taste_filters_v1',$=id=>document.getElementById(id),state={library:[],watchlist:[],feedback:[],profile:null,candidates:[],mode:'balanced',filters:{title:'',genre:'any',decade:'any',rating:'0',language:'any',sort:'fit'},loadToken:0,toastTimer:null};
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined&&text!==null)n.textContent=String(text);return n;}
function readArray(key){try{const x=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(x)?x:[];}catch(_){return[];}}
function setStatus(msg,tone){const n=$('tl-status');n.replaceChildren();if(tone!=='error')n.appendChild(el('span','tl-live-dot'));n.appendChild(el('span','',msg));n.classList.toggle('tl-status-warning',tone==='warning');n.classList.toggle('tl-status-error',tone==='error');}
function toast(msg){const n=$('tl-toast');n.textContent=msg;n.classList.add('is-visible');clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>n.classList.remove('is-visible'),2600);}
function accountStatus(){const a=window.FrameRateAuth;$('tl-account-status').textContent=a&&a.currentUser?(a.cloudReady?'SYNCED ACCOUNT':'SYNCING ACCOUNT'):(a&&a.configured?'GUEST PROFILE':'LOCAL PROFILE');}
function chips(id,items,negative,empty,format){const n=$(id);n.replaceChildren();if(!items||!items.length){n.appendChild(el('span','tl-chip-muted',empty));return;}items.forEach(x=>n.appendChild(el('span','tl-chip'+(negative?' tl-chip-negative':''),format?format(x):(x.label||x.name||x))));}
function metrics(p){$('tl-imported-count').textContent=state.library.length;$('tl-rated-count').textContent=state.library.filter(x=>Number(x.rating)>0&&Number(x.rating)<=5).length;$('tl-reviewed-count').textContent=state.library.filter(x=>String(x.review||'').trim()).length;const n=$('tl-confidence'),s=$('tl-confidence-note');if(!state.library.length){n.textContent='Not trained';s.textContent='Import a Letterboxd library';}else if(p){n.textContent=p.confidence==='Developing a strong pattern'?'Pattern found':p.confidence==='Emerging pattern'?'Learning':'Early signals';s.textContent=p.ratedCount+' ratings · '+p.reviewCount+' reviews';}else{n.textContent='Analyzing';s.textContent='Building your profile';}}
function renderProfile(p){const g=Object.entries(p&&p.genreWeights||{}).map(([id,x])=>({label:x.name||window.TasteProfileBuilder.genreNames[id]||'Film',score:Number(x.score)||0,count:Number(x.evidence)||0})),good=g.filter(x=>x.score>=.1).sort((a,b)=>b.score*Math.sqrt(b.count)-a.score*Math.sqrt(a.count)).slice(0,5),bad=g.filter(x=>x.score<=-.1).sort((a,b)=>a.score*Math.sqrt(a.count)-b.score*Math.sqrt(b.count)).slice(0,4);chips('tl-primary-genres',good,false,state.library.length?'No strong genre signal yet':'Import your ratings first',x=>x.label);chips('tl-avoid-genres',bad,true,'No recurring low-rating genre signal',x=>x.label);chips('tl-loved-aspects',p&&p.lovedAspects,false,p&&p.reviewCount?'No clear positive aspect signal':'Import review text to analyze this',x=>x.label);chips('tl-criticized-aspects',p&&p.criticizedAspects,true,p&&p.reviewCount?'No clear recurring criticism':'Import review text to analyze this',x=>x.label);chips('tl-theme-signals',p&&p.positiveThemes,false,p&&p.reviewCount?'No recurring theme signal yet':'Themes emerge from your reviews',x=>x.label);$('tl-feedback-note').textContent=state.feedback.length?state.feedback.length+' feedback signals saved locally to tune future discovery.':'Your feedback on recommendations will help tune the next list.';metrics(p);}
async function proxy(action,payload){const c=window.FrameRateAuth&&window.FrameRateAuth.client;if(!c||!c.functions)throw new Error('FrameRate cloud catalogue is unavailable. Check the Supabase setup.');const r=await c.functions.invoke('movie-data-proxy',{body:Object.assign({action},payload||{})});if(r.error){let message=r.error.message||'Movie catalogue request failed.';try{const context=r.error.context;if(context&&typeof context.clone==='function'){const body=await context.clone().json();if(body&&typeof body.error==='string')message=body.error;}}catch(_){}throw new Error(message);}if(!r.data)throw new Error('The movie catalogue returned an empty response.');return r.data;}
async function popular(){const pages=await Promise.all([1,2,3].map(page=>proxy('popular',{page}))),out=new Map();pages.forEach(p=>(p.results||[]).forEach(m=>{if(m&&m.id&&!out.has(String(m.id)))out.set(String(m.id),m);}));return Array.from(out.values());}
function updateModes(){document.querySelectorAll('[data-mode]').forEach(b=>{const on=b.dataset.mode===state.mode;b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',on?'true':'false');});}
function filmCard(m){const c=el('article','tl-film-card'),art=el('div','tl-film-art');if(m.poster_path){const img=el('img','tl-film-poster');img.src='https://image.tmdb.org/t/p/w342'+String(m.poster_path).replace(/^\/+/,'');img.alt='Poster for '+m.title;img.loading='lazy';img.referrerPolicy='no-referrer';img.onerror=()=>{img.remove();if(!art.querySelector('.tl-no-poster-mark'))art.appendChild(el('span','tl-no-poster-mark','▧'));};art.appendChild(img);}else art.appendChild(el('span','tl-no-poster-mark','▧'));art.appendChild(el('span','tl-film-art-badge','◈ '+m._tasteFit+' FIT'));art.appendChild(el('span','tl-film-year-badge',String(m.release_date||'').slice(0,4)||'—'));c.appendChild(art);const body=el('div','tl-film-content');body.appendChild(el('h3','tl-film-title',m.title));const meta=el('div','tl-film-meta');meta.appendChild(el('span','tl-film-rating','★ '+(Number(m.vote_average)?Number(m.vote_average).toFixed(1):'—')+' / 10 TMDB'));if(Number(m.vote_count)>0)meta.appendChild(el('span','',Number(m.vote_count).toLocaleString()+' votes'));body.appendChild(meta);body.appendChild(el('p','tl-film-overview',m.overview||'No synopsis is available for this title yet.'));const reason=el('p','tl-film-reason');reason.appendChild(el('span','','✦'));reason.appendChild(el('span','',(m._tasteReasons||['A new film to explore.']).join(' ')));body.appendChild(reason);const gs=el('div','tl-film-genres');(m._tasteGenres||[]).slice(0,3).forEach(x=>gs.appendChild(el('span','tl-film-genre',x)));if(gs.childElementCount)body.appendChild(gs);const actions=el('div','tl-film-actions');const add=el('button','tl-feedback-button is-primary','＋ Add to My Cinema');add.type='button';add.addEventListener('click',()=>addToWatchlist(m));actions.appendChild(add);[['more-like-this','More like this','tl-feedback-button'],['not-for-me','Not for me','tl-feedback-button is-danger'],['already-watched','Already watched','tl-feedback-button']].forEach(([action,label,cls])=>{const b=el('button',cls,label);b.type='button';b.addEventListener('click',()=>saveFeedback(m,action));actions.appendChild(b);});body.appendChild(actions);c.appendChild(body);return c;}
function applyFilters(ranked){
 const f=state.filters;
 const query=String(f.title||'').trim().toLocaleLowerCase();
 let results=ranked.filter(m=>{
  if(query&&!String((m.title||'')+' '+(m.overview||'')).toLocaleLowerCase().includes(query))return false;
  if(f.genre!=='any'&&!(m.genre_ids||[]).map(String).includes(String(f.genre)))return false;
  const year=Number(String(m.release_date||'').slice(0,4));
  if(f.decade==='1900'&&(!year||year>=1970))return false;
  if(f.decade!=='any'&&f.decade!=='1900'){const start=Number(f.decade);if(!year||year<start||year>=start+10)return false;}
  if(Number(f.rating)>0&&Number(m.vote_average)<Number(f.rating))return false;
  if(f.language!=='any'&&String(m.original_language||'')!==String(f.language))return false;
  return true;
 });
 if(f.sort==='rating')results.sort((a,b)=>(Number(b.vote_average)||0)-(Number(a.vote_average)||0));
 else if(f.sort==='newest')results.sort((a,b)=>String(b.release_date||'').localeCompare(String(a.release_date||'')));
 else if(f.sort==='popular')results.sort((a,b)=>(Number(b.popularity)||0)-(Number(a.popularity)||0));
 return results;
}
function render(){
 const grid=$('tl-results-grid');
 const ranked=window.TasteRecommender.rank(state.candidates,{profile:state.profile,library:state.library,watchlist:state.watchlist,feedback:state.feedback,mode:state.mode});
 const filtered=applyFilters(ranked);
 const visible=filtered.slice(0,12);
 grid.replaceChildren();
 $('tl-results-count').textContent=visible.length?visible.length+' recommendations · '+(state.library.length?'personalized from your signals':'general discovery'):'No films match these filters';
 if(!visible.length){
  const c=el('div','tl-empty-card');
  c.appendChild(el('span','tl-empty-symbol','◈'));
  c.appendChild(el('strong','','No films match these filters.'));
  c.appendChild(el('p','','Try a wider release period, another genre, or a lower minimum rating. Filters only affect this recommendation batch.'));
  const b=el('button','tl-feedback-button is-primary','Reset filters');
  b.type='button';b.addEventListener('click',resetFilters);c.appendChild(b);grid.appendChild(c);return;
 }
 visible.forEach(m=>grid.appendChild(filmCard(m)));
}
function addToWatchlist(m){
 const year=String(m.release_date||'').slice(0,4),title=String(m.title||'').trim();
 if(!title){toast('This film has no usable title yet.');return;}
 const key=title.toLowerCase()+'|'+year;
 const list=readArray('fr_watchlist');
 if(list.some(x=>String(x.title||'').trim().toLowerCase()+'|'+String(x.year||'').trim()===key)){
  toast('This film is already in My Cinema.');return;
 }
 const poster=m.poster_path?'https://image.tmdb.org/t/p/w500'+String(m.poster_path):'';
 const backdrop=m.backdrop_path?'https://image.tmdb.org/t/p/original'+String(m.backdrop_path):poster;
 const entry={id:'tmdb:'+String(m.id||key),title:title.slice(0,240),year:year,poster:poster,backdrop:backdrop,source:'tmdb',status:'want_to_watch',addedAt:new Date().toISOString().slice(0,10),updatedAt:new Date().toISOString()};
 const next=[entry,...list.filter(x=>String(x.title||'').trim().toLowerCase()+'|'+String(x.year||'').trim()!==key)].slice(0,1000);
 try{
  localStorage.setItem('fr_watchlist',JSON.stringify(next));
  let events={};try{const parsed=JSON.parse(localStorage.getItem('fr_watchlist_events')||'{}');if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))events=parsed;}catch(_){}
  events[key]={action:'add',updatedAt:new Date().toISOString()};
  const pairs=Object.entries(events);if(pairs.length>2000)events=Object.fromEntries(pairs.slice(-2000));
  localStorage.setItem('fr_watchlist_events',JSON.stringify(events));
  state.watchlist=next;renderProfile(state.profile||{});render();toast('Added to My Cinema · Want to Watch.');
 }catch(error){console.warn('[Taste Lab] Could not add film to My Cinema:',error);toast('Could not save to My Cinema. Browser storage may be full.');}
}
function readFilters(){
 try{const x=JSON.parse(localStorage.getItem(FILTER_KEY)||'{}');if(x&&typeof x==='object')state.filters=Object.assign(state.filters,x);}catch(_){}
 ['title','genre','decade','rating','language','sort'].forEach(key=>{const node=$('tl-'+(key==='title'?'title':key==='genre'?'genre':key==='decade'?'decade':key==='rating'?'rating':key==='language'?'original-language':'sort')+'-filter');if(node&&state.filters[key]!==undefined)node.value=state.filters[key];});
}
function collectFilters(){
 state.filters={
 title:$('tl-title-filter').value||'',genre:$('tl-genre-filter').value||'any',
 decade:$('tl-decade-filter').value||'any',rating:$('tl-rating-filter').value||'0',
 language:$('tl-original-language').value||'any',sort:$('tl-sort-filter').value||'fit'
 };
 try{localStorage.setItem(FILTER_KEY,JSON.stringify(state.filters));}catch(e){console.warn('[Taste Lab] Could not save filter settings:',e);}
}
function resetFilters(){
 state.filters={title:'',genre:'any',decade:'any',rating:'0',language:'any',sort:'fit'};
 $('tl-title-filter').value='';$('tl-genre-filter').value='any';$('tl-decade-filter').value='any';$('tl-rating-filter').value='0';$('tl-original-language').value='any';$('tl-sort-filter').value='fit';
 collectFilters();render();
}
function saveFeedback(m,action){const year=String(m.release_date||'').slice(0,4),key=String(m.id||'')+'|'+window.TasteRecommender.normalizeTitle(m.title),entry={id:m.id,key,title:String(m.title||'').slice(0,180),year,action,genre_ids:Array.isArray(m.genre_ids)?m.genre_ids.slice(0,12):[],overview:String(m.overview||'').slice(0,1600),updatedAt:new Date().toISOString()};state.feedback=state.feedback.filter(x=>String(x.key||'')!==key&&!(window.TasteRecommender.normalizeTitle(x.title)===window.TasteRecommender.normalizeTitle(entry.title)&&String(x.year||'')===year));state.feedback.push(entry);state.feedback=state.feedback.slice(-1000);try{localStorage.setItem(FEEDBACK_KEY,JSON.stringify(state.feedback));}catch(e){console.warn('[Taste Lab] Could not save feedback:',e);}renderProfile(state.profile||{});render();toast(action==='more-like-this'?'Saved. Related genres get a small boost.':action==='not-for-me'?'Saved. This film will be hidden from discovery.':'Saved. This film will be excluded from discovery.');}
async function load(options){const o=options||{},token=++state.loadToken,rebuild=Boolean(o.forceProfile),refresh=Boolean(o.refreshCandidates)||!state.candidates.length;$('tl-rebuild-profile').disabled=true;$('tl-refresh-recommendations').disabled=true;setStatus(rebuild?'Re-reading ratings and reviews, then rebuilding the profile…':'Reading your account library and preparing recommendations…');try{state.library=readArray('fr_lb_zip_library').filter(x=>x&&x.title);state.watchlist=readArray('fr_watchlist').filter(x=>x&&x.title);state.feedback=readArray(FEEDBACK_KEY).filter(x=>x&&x.title);accountStatus();metrics(null);state.profile=await window.TasteProfileBuilder.build(state.library,{force:rebuild});if(token!==state.loadToken)return;renderProfile(state.profile);$('tl-import-note').classList.toggle('tl-hidden',state.library.length>0);if(refresh){setStatus(state.library.length?'Matching the catalogue against your taste signals…':'Loading a catalogue starter set. Import history to personalize it…');state.candidates=await popular();}if(token!==state.loadToken)return;render();if(!state.candidates.length)setStatus('The shared movie catalogue could not be reached. Check the movie-data-proxy function and try again.','error');else if(!state.library.length)setStatus('Showing general catalogue picks. Import a Letterboxd ZIP to unlock personal genre and review signals.','warning');else setStatus('Profile ready. '+state.library.length+' imported films checked against the current recommendation batch.');}catch(e){if(token!==state.loadToken)return;console.error('[Taste Lab] Could not load recommendations:',e);setStatus(e&&e.message?e.message:'Something went wrong while loading Taste Lab.','error');}finally{if(token===state.loadToken){$('tl-rebuild-profile').disabled=false;$('tl-refresh-recommendations').disabled=false;accountStatus();}}}
function init(){
 $('tl-rebuild-profile').addEventListener('click',()=>load({forceProfile:true,refreshCandidates:true}));
 $('tl-refresh-recommendations').addEventListener('click',()=>load({refreshCandidates:true}));
 document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{state.mode=b.dataset.mode||'balanced';updateModes();render();}));
 ['tl-title-filter','tl-genre-filter','tl-decade-filter','tl-rating-filter','tl-original-language','tl-sort-filter'].forEach(id=>{
  const node=$(id);if(!node)return;node.addEventListener(id==='tl-title-filter'?'input':'change',()=>{collectFilters();render();});
 });
 $('tl-reset-filters').addEventListener('click',resetFilters);
 $('tl-tune-discover').addEventListener('click',()=>window.TasteLabExperience&&window.TasteLabExperience.setStep('discover'));
 $('tl-profile-next').addEventListener('click',()=>window.TasteLabExperience&&window.TasteLabExperience.setStep('tune'));
 $('tl-tune-back').addEventListener('click',()=>window.TasteLabExperience&&window.TasteLabExperience.setStep('profile'));
 $('tl-back-tune').addEventListener('click',()=>window.TasteLabExperience&&window.TasteLabExperience.setStep('tune'));
 $('tl-reset-feedback').addEventListener('click',()=>{
  if(!state.feedback.length){toast('There is no discovery feedback to reset yet.');return;}
  if(!window.confirm('Reset Taste Lab feedback for this browser profile? Your imported film history will stay untouched.'))return;
  state.feedback=[];localStorage.removeItem(FEEDBACK_KEY);renderProfile(state.profile||{});render();toast('Discovery feedback reset.');
 });
 readFilters();updateModes();
 window.addEventListener('frameratedataready',()=>{accountStatus();void load({refreshCandidates:!state.candidates.length});});
 window.addEventListener('storage',e=>{if(['fr_lb_zip_library','fr_watchlist',FEEDBACK_KEY,FILTER_KEY].includes(e.key))void load({refreshCandidates:false});});
 if(!window.FrameRateAuth||!window.FrameRateAuth.configured)void load({refreshCandidates:true});
 setTimeout(()=>{if(state.loadToken===0)void load({refreshCandidates:true});},5500);
}
document.addEventListener('DOMContentLoaded',init);
})();