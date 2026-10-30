(function(){
'use strict';
const FEEDBACK_KEY='fr_taste_feedback_v1';
const FILTER_KEY='fr_taste_filters_v1';
const IMPRESSIONS_KEY='fr_taste_impressions_v1';
const CURSOR_KEY='fr_taste_catalogue_cursor_v1';
const CURRENT_BATCH_KEY='fr_taste_current_batch_v1';
const MAX_PAGES=500, PAGES_PER_REFRESH=4, MAX_IMPRESSIONS=350, $=id=>document.getElementById(id);
const state={
 library:[],watchlist:[],feedback:[],impressions:[],profile:null,candidates:[],mode:'balanced',
 filters:{title:'',genre:'any',excludeGenre:'any',yearFrom:'any',yearTo:'any',rating:'0',votes:'0',runtimeMin:'0',runtimeMax:'0',language:'any',focusAspect:'any',avoidAspect:'any',focusTheme:'any',sort:'fit'},
 loadToken:0,toastTimer:null,trailerRequestId:0,activeAccountKey:null,aiBusy:false
};
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined&&text!==null)n.textContent=String(text);return n;}
function readArray(key){try{const x=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(x)?x:[];}catch(_){return[];}}
function read(key,fallback){try{const value=localStorage.getItem(key);return value===null?fallback:value;}catch(_){return fallback;}}
function safeStore(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(e){console.warn('[Taste Lab] Could not save',key,e);return false;}}
function setStatus(message,tone){const n=$('tl-status');n.replaceChildren();if(tone!=='error')n.appendChild(el('span','tl-live-dot'));n.appendChild(el('span','',message));n.classList.toggle('tl-status-warning',tone==='warning');n.classList.toggle('tl-status-error',tone==='error');}
function toast(message){const n=$('tl-toast');n.textContent=message;n.classList.add('is-visible');clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>n.classList.remove('is-visible'),2800);}
function setTuneStatus(message,tone){
 const n=$('tl-tune-status');if(!n)return;n.textContent=message;
 n.classList.toggle('is-working',tone==='working');n.classList.toggle('is-ready',tone==='ready');n.classList.toggle('is-error',tone==='error');
}
function aiMessage(key,fallback,values){
 const experience=window.TasteLabExperience||{},lang=String(read('fr_taste_language',read('fr_lang','en'))||'en');
 const pack=Object.assign({},experience.translations&&experience.translations.en||{},experience.translations&&experience.translations[lang]||{},experience.additionalTranslations&&experience.additionalTranslations.en||{},experience.additionalTranslations&&experience.additionalTranslations[lang]||{});
 let message=String(pack[key]||fallback||key);
 Object.entries(values||{}).forEach(([name,value])=>{message=message.split('{'+name+'}').join(String(value));});return message;
}
function setAiStatus(message,tone){
 const n=$('tl-ai-status');if(!n)return;n.textContent=message;
 n.classList.toggle('is-working',tone==='working');n.classList.toggle('is-ready',tone==='ready');n.classList.toggle('is-error',tone==='error');
}
function updateAiButton(){
 const button=$('tl-ai-rank');if(!button)return;
 // A missing Letterboxd history should reduce personalization, not disable AI itself.
 button.disabled=state.aiBusy||!state.candidates.length;
 button.title=!state.candidates.length?'Load recommendations before using AI.':!state.library.length?'No Letterboxd history imported: AI can rank the current films generally.':'Use the selected AI provider to rank the current filtered candidates.';
}
function currentRankingContext(movies){return {profile:state.profile,library:state.library,candidates:(movies||[]).slice(0,18)};}
async function improveWithAI(){
 if(state.aiBusy)return;
 if(!state.candidates.length){setAiStatus(aiMessage('aiStatusCandidates','No current films are available to rank.'),'error');return;}
 if(state.filters.sort!=='fit'){
  // AI ranking is based on taste-fit, so switch the sort automatically rather
  // than making the button appear to do nothing when another sort is selected.
  state.filters.sort='fit';
  const sortSelect=$('tl-sort-filter');if(sortSelect)sortSelect.value='fit';
  render();
 }
 const deterministic=window.TasteRecommender.rank(state.candidates,{profile:state.profile,library:state.library,watchlist:state.watchlist,feedback:state.feedback,mode:state.mode,focusAspect:state.filters.focusAspect,avoidAspect:state.filters.avoidAspect,focusTheme:state.filters.focusTheme});
 const filtered=applyFilters(deterministic),context=currentRankingContext(filtered);
 if(!context.candidates.length){setAiStatus(aiMessage('aiStatusNoMatches','No films match the current filters. Widen the filters first.'),'error');return;}
 state.aiBusy=true;updateAiButton();setAiStatus(aiMessage('aiStatusWorking','AI is comparing your taste and review patterns with the current films…'),'working');
 try{
  if(!window.TasteLabAI)throw new Error('The Taste Lab AI module did not load. Refresh the page and try again.');
  const auth=window.FrameRateAuth;
  if(auth&&auth.currentUser&&auth.currentUser.id){
   if(!auth.cloudReady)throw new Error('Your account is still syncing. Wait a moment, then try AI ranking again.');
   const vaultReady=await auth.refreshCloudCredentials();
   if(!vaultReady)throw new Error('Secure AI vault unavailable: '+(auth.credentialStatusError||'Could not refresh saved API-key status. Sign out and back in, then retry.'));
  }
  const result=await window.TasteLabAI.rank(context);
  const latestRanked=window.TasteRecommender.rank(state.candidates,{profile:state.profile,library:state.library,watchlist:state.watchlist,feedback:state.feedback,mode:state.mode,focusAspect:state.filters.focusAspect,avoidAspect:state.filters.avoidAspect,focusTheme:state.filters.focusTheme});
  const latestContext=currentRankingContext(applyFilters(latestRanked));
  const matchingCache=state.filters.sort==='fit'?window.TasteLabAI.getCached(latestContext):null;
  render();
  if(!matchingCache||matchingCache.cacheKey!==result.cacheKey){setAiStatus(aiMessage('aiStatusStale','Filters changed during the AI request; the current list keeps its local ranking.'),'warning');}
  else{
   setAiStatus(result.cached?aiMessage('aiStatusCached','Restored AI ranking from cache; no new request was sent.'):(state.library.length?aiMessage('aiStatusDone','AI ranking applied.',{provider:result.provider,model:result.model,count:result.rankings.length}):aiMessage('aiStatusDoneGeneric','AI ranked the current films, but this is general discovery until you import your Letterboxd history.',{provider:result.provider,model:result.model,count:result.rankings.length})),'ready');
   if(!result.cached)toast('AI ranking applied. Results are cached locally for this batch.');
  }
 }catch(error){
  console.warn('[Taste Lab] AI ranking unavailable; keeping deterministic ranking:',error);
  render();const detail=String(error&&error.message||'Provider request failed.');let message=aiMessage('aiStatusFallback','AI could not rank this batch, so the local ranking remains.');
  if(/Choose Gemini|No API key is configured|selected AI provider/i.test(detail))message=aiMessage('aiStatusProvider','Configure an AI provider in the main Studio API Vault first.');
  else if(/No current candidate films/i.test(detail))message=aiMessage('aiStatusCandidates','No current films are available to rank.');
  else if(/No films match the current filters/i.test(detail))message=aiMessage('aiStatusNoMatches','No films match the current filters. Widen the filters first.');
  else message+=' '+detail.slice(0,180);
  setAiStatus(message,'error');
 }finally{state.aiBusy=false;updateAiButton();}
}
function accountStatus(){const a=window.FrameRateAuth;$('tl-account-status').textContent=a&&a.currentUser?(a.cloudReady?'SYNCED ACCOUNT':'SYNCING ACCOUNT'):(a&&a.configured?'GUEST PROFILE':'LOCAL PROFILE');}
function currentAccountKey(){
 const a=window.FrameRateAuth,user=a&&a.currentUser;
 return String(user&&(user.id||(user.user&&user.user.id))||'guest');
}
function chips(id,items,negative,empty,format,onPick){
 const n=$(id);if(!n)return;n.replaceChildren();
 if(!items||!items.length){n.appendChild(el('span','tl-chip-muted',empty));return;}
 items.forEach(item=>{
  const label=format?format(item):(item.label||item.name||item);
  if(typeof onPick==='function'){
   const button=el('button','tl-chip tl-chip-button'+(negative?' tl-chip-negative':''),label);
   button.type='button';button.addEventListener('click',()=>onPick(item));button.title='Use this signal in Fine-tune Taste';n.appendChild(button);
  }else n.appendChild(el('span','tl-chip'+(negative?' tl-chip-negative':''),label));
 });
}
function syncFilterControls(){
 const ids={title:'tl-title-filter',genre:'tl-genre-filter',excludeGenre:'tl-exclude-genre-filter',yearFrom:'tl-year-from-filter',yearTo:'tl-year-to-filter',rating:'tl-rating-filter',votes:'tl-votes-filter',runtimeMin:'tl-runtime-min-filter',runtimeMax:'tl-runtime-max-filter',language:'tl-original-language',focusAspect:'tl-focus-aspect',avoidAspect:'tl-avoid-aspect',focusTheme:'tl-focus-theme',sort:'tl-sort-filter'};
 Object.entries(ids).forEach(([key,id])=>{const node=$(id);if(node&&state.filters[key]!==undefined)node.value=state.filters[key];});
}
function activateInsight(type,item){
 const f=state.filters;
 if(type==='genre'){f.genre=String(item.id);f.excludeGenre='any';f.title='';}
 else if(type==='excludeGenre'){f.excludeGenre=String(item.id);f.genre='any';f.title='';}
 else if(type==='focusAspect'){f.focusAspect=String(item.key||'any');f.avoidAspect='any';}
 else if(type==='avoidAspect'){f.avoidAspect=String(item.key||'any');f.focusAspect='any';}
 else if(type==='focusTheme'){f.focusTheme=String(item.key||'any');}
 syncFilterControls();collectFilters();setTuneStatus('Searching the catalogue with this taste signal…','working');
 if(window.TasteLabExperience)window.TasteLabExperience.setStep('tune');
 toast(type==='genre'?'Searching this genre…':type==='excludeGenre'?'Excluding this genre…':type==='focusTheme'?'Prioritizing this theme…':'Using this review signal…');
 void load({refreshCandidates:true});
}
function metrics(p){
 $('tl-imported-count').textContent=state.library.length;
 $('tl-rated-count').textContent=state.library.filter(x=>Number(x.rating)>0&&Number(x.rating)<=5).length;
 $('tl-reviewed-count').textContent=state.library.filter(x=>String(x.review||'').trim()).length;
 const n=$('tl-confidence'),s=$('tl-confidence-note');
 if(!state.library.length){n.textContent='Not trained';s.textContent='Import a Letterboxd library';}
 else if(p){n.textContent=p.confidence==='Developing a strong pattern'?'Pattern found':p.confidence==='Emerging pattern'?'Learning':'Early signals';s.textContent=p.ratedCount+' ratings · '+p.reviewCount+' reviews';}
 else{n.textContent='Analyzing';s.textContent='Building your profile';}
}
function renderFocusThemeOptions(p){
 const select=$('tl-focus-theme');if(!select)return;
 const desired=String(state.filters.focusTheme||'any');
 const lang=(localStorage.getItem('fr_lang')||localStorage.getItem('fr_taste_language')||'en');const langPack=window.TasteLabExperience&&window.TasteLabExperience.translations&&window.TasteLabExperience.translations[lang];const anyOption=el('option','',langPack&&langPack.anyTheme?langPack.anyTheme:'Any theme');anyOption.value='any';select.replaceChildren(anyOption);
 const weights=p&&p.themeWeights||{};
 const themes=Object.entries(weights).map(([key,value])=>({key,label:String(key).replace(/_/g,' '),score:Number(value&&value.score)||0,count:Number(value&&value.count)||0}))
  .sort((a,b)=>Math.abs(b.score)*Math.sqrt(b.count)-Math.abs(a.score)*Math.sqrt(a.count)).slice(0,30);
 themes.forEach(theme=>select.appendChild(el('option','',theme.label.charAt(0).toUpperCase()+theme.label.slice(1))).value=theme.key);
 if(desired!=='any'&&!themes.some(x=>x.key===desired))select.appendChild(el('option','',desired.replace(/_/g,' '))).value=desired;
 select.value=desired==='any'||themes.some(x=>x.key===desired)?desired:'any';
 state.filters.focusTheme=select.value;
}
function renderProfile(p){
 renderFocusThemeOptions(p);
 const g=Object.entries(p&&p.genreWeights||{}).map(([id,x])=>({id,label:x.name||window.TasteProfileBuilder.genreNames[id]||'Film',score:Number(x.score)||0,count:Number(x.evidence)||0}));
 const good=g.filter(x=>x.score>=.1).sort((a,b)=>b.score*Math.sqrt(b.count)-a.score*Math.sqrt(a.count)).slice(0,5);
 const bad=g.filter(x=>x.score<=-.1).sort((a,b)=>a.score*Math.sqrt(a.count)-b.score*Math.sqrt(b.count)).slice(0,4);
 chips('tl-primary-genres',good,false,state.library.length?'No strong genre signal yet':'Import your ratings first',x=>x.label,x=>activateInsight('genre',x));
 chips('tl-avoid-genres',bad,true,'No recurring low-rating genre signal',x=>x.label,x=>activateInsight('excludeGenre',x));
 chips('tl-loved-aspects',p&&p.lovedAspects,false,p&&p.reviewCount?'No clear positive aspect signal':'Import review text to analyze this',x=>x.label,x=>activateInsight('focusAspect',x));
 chips('tl-criticized-aspects',p&&p.criticizedAspects,true,p&&p.reviewCount?'No clear recurring criticism':'Import review text to analyze this',x=>x.label,x=>activateInsight('avoidAspect',x));
 chips('tl-theme-signals',p&&p.positiveThemes,false,p&&p.reviewCount?'No recurring theme signal yet':'Themes emerge from your reviews',x=>x.label,x=>activateInsight('focusTheme',x));
 const tags=Object.entries(p&&p.tagWeights||{}).map(([label,value])=>({label,score:Number(value&&value.score)||0,count:Number(value&&value.evidence)||0}));
 const positiveTags=tags.filter(x=>x.score>=.08).sort((a,b)=>b.score*Math.sqrt(b.count)-a.score*Math.sqrt(a.count)).slice(0,7);
 const negativeTags=tags.filter(x=>x.score<=-.08).sort((a,b)=>a.score*Math.sqrt(a.count)-b.score*Math.sqrt(b.count)).slice(0,6);
 chips('tl-positive-tags',positiveTags,false,state.library.length?'No positive tag pattern yet':'Import Letterboxd tags to analyze this',x=>x.label);
 chips('tl-negative-tags',negativeTags,true,'No negative tag pattern yet',x=>x.label);
 $('tl-feedback-note').textContent=state.feedback.length?state.feedback.length+' feedback signals saved locally to tune future discovery.':'Your feedback on recommendations will help tune the next list.';
 metrics(p);
}
async function proxy(action,payload){
 const c=window.FrameRateAuth&&window.FrameRateAuth.client;
 if(!c||!c.functions)throw new Error('FrameRate cloud catalogue is unavailable. Check the Supabase setup.');
 const r=await c.functions.invoke('movie-data-proxy',{body:Object.assign({action},payload||{})});
 if(r.error){
  let message=r.error.message||'Movie catalogue request failed.';
  try{const context=r.error.context;if(context&&typeof context.clone==='function'){const body=await context.clone().json();if(body&&typeof body.error==='string')message=body.error;}}catch(_){}
  throw new Error(message);
 }
 if(!r.data)throw new Error('The movie catalogue returned an empty response.');
 return r.data;
}
function normTitle(value){return window.TasteRecommender.normalizeTitle(value||'');}
function impressionKey(m){return String(m&&m.id||'')+'|'+normTitle(m&&m.title)+'|'+String(m&&m.year||String(m&&m.release_date||'').slice(0,4));}
function alreadyImpressed(movie,history){
 const id=String(movie&&movie.id||''),title=normTitle(movie&&movie.title),year=String(movie&&movie.release_date||'').slice(0,4);
 return (history||[]).some(item=>{
  if(id&&String(item.id||'')===id)return true;
  const oldTitle=normTitle(item.title),oldYear=String(item.year||'');
  return Boolean(title&&title===oldTitle&&(!year||!oldYear||year===oldYear));
 });
}
function nextPageWindow(){
 let start=1;try{const v=Number(localStorage.getItem(CURSOR_KEY));if(Number.isInteger(v)&&v>=1&&v<=MAX_PAGES)start=v;}catch(_){}
 const pages=Array.from({length:PAGES_PER_REFRESH},(_,i)=>((start-1+i)%MAX_PAGES)+1);
 const next=((start-1+PAGES_PER_REFRESH)%MAX_PAGES)+1;
 try{localStorage.setItem(CURSOR_KEY,String(next));}catch(_){}
 return pages;
}
function remoteParams(page){
 const f=state.filters;
 const sortMap={fit:'popularity.desc',rating:'vote_average.desc',newest:'primary_release_date.desc',popular:'popularity.desc'};
 const p={page,sort_by:sortMap[f.sort]||'popularity.desc'};
 if(f.genre!=='any')p.with_genres=String(f.genre);
 if(f.excludeGenre!=='any')p.without_genres=String(f.excludeGenre);
 if(f.yearFrom!=='any')p.release_date_gte=String(f.yearFrom)+'-01-01';
 if(f.yearTo!=='any')p.release_date_lte=String(f.yearTo)+'-12-31';
 if(Number(f.rating)>0)p.vote_average_gte=Number(f.rating);
 if(Number(f.votes)>0)p.vote_count_gte=Number(f.votes);
 if(Number(f.runtimeMin)>0)p.with_runtime_gte=Number(f.runtimeMin);
 if(Number(f.runtimeMax)>0)p.with_runtime_lte=Number(f.runtimeMax);
 if(f.language!=='any')p.with_original_language=String(f.language);
 return p;
}
async function fetchCandidateBatch(){
 const f=state.filters;
 if(f.yearFrom!=='any'&&f.yearTo!=='any'&&Number(f.yearFrom)>Number(f.yearTo))throw new Error('The release-year range is reversed. Choose a later start year or an earlier end year.');
 if(Number(f.runtimeMin)>0&&Number(f.runtimeMax)>0&&Number(f.runtimeMin)>Number(f.runtimeMax))throw new Error('The minimum runtime is higher than the maximum runtime. Adjust the runtime range.');
 const pages=nextPageWindow(),query=String(f.title||'').trim();
 let calls;
 if(query){
  calls=pages.map(page=>proxy('search',{query:query.slice(0,180),page}));
 }else{
  const preferred=Object.entries(state.profile&&state.profile.genreWeights||{})
   .filter(([,value])=>Number(value&&value.score)>.10)
   .sort((a,b)=>Number(b[1].score)*Math.sqrt(Number(b[1].evidence)||1)-Number(a[1].score)*Math.sqrt(Number(a[1].evidence)||1))
   .slice(0,2).map(([id])=>String(id));
  const lanes=[
   {page:pages[0],sort:'popularity.desc',genre:''},
   {page:pages[1],sort:'vote_average.desc',genre:'',quality:true},
   {page:pages[2],sort:'popularity.desc',genre:state.mode==='explore'?'':preferred[0]||''},
   {page:pages[3],sort:state.mode==='explore'?'primary_release_date.desc':'vote_average.desc',genre:state.mode==='explore'?'':preferred[1]||'' ,quality:state.mode!=='explore'}
  ];
  calls=lanes.map(lane=>{
   const params=remoteParams(lane.page);
   params.sort_by=lane.sort;
   if(lane.quality)params.vote_count_gte=Math.max(Number(params.vote_count_gte)||0,250);
   if(lane.genre&&f.genre==='any')params.with_genres=lane.genre;
   return proxy('discover',params);
  });
 }
 const responses=await Promise.all(calls);
 const byId=new Map();
 responses.forEach(response=>(response.results||[]).forEach(movie=>{
  if(movie&&movie.id&&!byId.has(String(movie.id)))byId.set(String(movie.id),movie);
 }));
 let results=Array.from(byId.values());
 const history=state.impressions.slice(-MAX_IMPRESSIONS);
 results=results.filter(movie=>!alreadyImpressed(movie,history));
 if(query&& (Number(f.runtimeMin)>0||Number(f.runtimeMax)>0)){
  // Search responses omit runtime, so hydrate a bounded set of details only when the user
  // explicitly needs a runtime filter instead of issuing details calls for the full batch.
  const top=results.slice().sort((a,b)=>(Number(b.popularity)||0)-(Number(a.popularity)||0)).slice(0,24);
  const runtimeById=new Map();
  for(let i=0;i<top.length;i+=6){
   const batch=await Promise.all(top.slice(i,i+6).map(async movie=>{
    try{return {id:String(movie.id),data:await proxy('details',{id:movie.id})};}catch(_){return {id:String(movie.id),data:null};}
   }));
   batch.forEach(x=>{if(x.data)runtimeById.set(x.id,Number(x.data.runtime)||0);});
  }
  results=results.map(movie=>Object.assign({},movie,{runtime:runtimeById.get(String(movie.id))||0}));
 }
 // Search results receive client-side copies of all selected constraints; Discover also
 // receives the constraints from Supabase/TMDB, so the catalogue is not limited to page 1-3.
 results=applyFiltersToCandidates(results,{ignoreTitle:false,verifyRuntime:Boolean(query)});
 return results;
}
function applyFiltersToCandidates(movies,options){
 const f=state.filters,o=options||{},query=o.ignoreTitle?'':String(f.title||'').trim().toLocaleLowerCase();
 return movies.filter(m=>{
  if(query&&!String((m.title||'')+' '+(m.overview||'')).toLocaleLowerCase().includes(query))return false;
  const genres=(m.genre_ids||[]).map(String);
  if(f.genre!=='any'&&!genres.includes(String(f.genre)))return false;
  if(f.excludeGenre!=='any'&&genres.includes(String(f.excludeGenre)))return false;
  const year=Number(String(m.release_date||'').slice(0,4));
  if(f.yearFrom!=='any'&&(!year||year<Number(f.yearFrom)))return false;
  if(f.yearTo!=='any'&&(!year||year>Number(f.yearTo)))return false;
  if(Number(f.rating)>0&&Number(m.vote_average)<Number(f.rating))return false;
  if(Number(f.votes)>0&&Number(m.vote_count)<Number(f.votes))return false;
  if(f.language!=='any'&&String(m.original_language||'')!==String(f.language))return false;
  const runtime=Number(m.runtime)||0,verifyRuntime=Boolean(o.verifyRuntime);
  if(Number(f.runtimeMin)>0&&runtime>0&&runtime<Number(f.runtimeMin))return false;
  if(Number(f.runtimeMax)>0&&runtime>0&&runtime>Number(f.runtimeMax))return false;
  if(verifyRuntime&&(Number(f.runtimeMin)>0||Number(f.runtimeMax)>0)&&!runtime)return false;
  return true;
 });
}
function updateModes(){document.querySelectorAll('[data-mode]').forEach(b=>{const active=b.dataset.mode===state.mode;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',active?'true':'false');});}
function posterImage(movie,art){
 const node=el('img','tl-film-poster'),posterPath=String(movie.poster_path||''),backdropPath=String(movie.backdrop_path||'');
 const makeUrl=(path,size)=>{if(!path)return'';const clean=path.startsWith('/')?path:'/'+path;return 'https://image.tmdb.org/t/p/'+size+clean;};
 let tryingBackdrop=!posterPath;
 if(!posterPath&&backdropPath)node.classList.add('tl-film-poster-backdrop');
 const firstUrl=posterPath?makeUrl(posterPath,'w500'):makeUrl(backdropPath,'w780');
 if(!firstUrl){art.appendChild(el('span','tl-no-poster-mark','▧'));return;}
 node.src=firstUrl;node.alt='Poster for '+String(movie.title||'film');node.loading='lazy';node.decoding='async';node.referrerPolicy='no-referrer';
 node.onerror=()=>{
  if(!tryingBackdrop&&backdropPath){tryingBackdrop=true;node.classList.add('tl-film-poster-backdrop');node.src=makeUrl(backdropPath,'w780');return;}
  node.remove();if(!art.querySelector('.tl-no-poster-mark'))art.appendChild(el('span','tl-no-poster-mark','▧'));
 };
 art.appendChild(node);
}
function openFilmInStudio(m){
 const params=new URLSearchParams();
 params.set('frMovieId',String(m.id||''));
 params.set('frMovieTitle',String(m.title||''));
 params.set('frMovieYear',String(m.release_date||'').slice(0,4));
 params.set('frMoviePoster',String(m.poster_path||''));
 params.set('frMovieBackdrop',String(m.backdrop_path||''));
 params.set('frMovieOverview',String(m.overview||'').slice(0,1600));
 params.set('frMovieGenres',(m._tasteGenres||[]).join('|'));
 window.location.href='index.html?'+params.toString();
}
function filmCard(m){
 const card=el('article','tl-film-card'),art=el('div','tl-film-art');
 posterImage(m,art);
 art.setAttribute('role','link');art.setAttribute('tabindex','0');
 art.setAttribute('aria-label','Open '+m.title+' in FrameRate Studio');
 art.addEventListener('click',()=>openFilmInStudio(m));
 art.addEventListener('keydown',e=>{
  if(e.target!==art)return;
  if(e.key==='Enter'||e.key===' '){e.preventDefault();openFilmInStudio(m);}
 });
 const fit=el('span','tl-film-art-badge');
 fit.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg><span>'+String(m._tasteFit||0)+'% FIT</span>';
 art.appendChild(fit);
 art.appendChild(el('span','tl-film-year-badge',String(m.release_date||'').slice(0,4)||'—'));
 const trailer=el('button','tl-trailer-circle');
 trailer.type='button';trailer.title='Watch trailer';trailer.setAttribute('aria-label','Watch trailer for '+m.title);
 trailer.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13L19 12 8 5.5Z" fill="currentColor"/></svg>';
 trailer.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openTasteTrailer(m);});
 trailer.addEventListener('keydown',event=>event.stopPropagation());
 art.appendChild(trailer);
 card.appendChild(art);

 const body=el('div','tl-film-content');
 const title=el('button','tl-film-title tl-film-title-link',m.title);
 title.type='button';title.addEventListener('click',()=>openFilmInStudio(m));body.appendChild(title);
 const meta=el('div','tl-film-meta');
 meta.innerHTML='<span class="tl-film-rating"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" fill="currentColor"/></svg> '+(Number(m.vote_average)?Number(m.vote_average).toFixed(1):'—')+' / 10 TMDB</span>';
 if(Number(m.vote_count)>0){const votes=el('span','tl-film-votes');votes.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 19c.5-3 2.4-4.5 5.5-4.5s5 1.5 5.5 4.5M16 5.5a3 3 0 0 1 0 5.8M17 14c2.1.5 3.2 2 3.5 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg> '+Number(m.vote_count).toLocaleString();meta.appendChild(votes);}
 body.appendChild(meta);
 body.appendChild(el('p','tl-film-overview',m.overview||'No synopsis is available for this title yet.'));
 const reason=el('p','tl-film-reason');
 reason.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" fill="currentColor"/></svg><span></span>';
 const reasonText=reason.querySelector('span');
 if(reasonText)reasonText.textContent=(m._tasteReasons||['A new film to explore.']).join(' ');
 body.appendChild(reason);
 const genreChips=el('div','tl-film-genres');
 (m._tasteGenres||[]).slice(0,3).forEach(x=>genreChips.appendChild(el('span','tl-film-genre',x)));
 if(genreChips.childElementCount)body.appendChild(genreChips);
 const actions=el('div','tl-film-actions');
 const add=el('button','tl-feedback-button is-primary tl-add-cinema');
 add.type='button';add.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>Add to My Cinema</span>';
 add.addEventListener('click',()=>addToWatchlist(m,add));actions.appendChild(add);
 const feedbackActions=[
  ['more-like-this','More like this','tl-feedback-button','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.7c0 5.1-8.8 10-8.8 10s-8.8-4.9-8.8-10A4.7 4.7 0 0 1 12 6.4a4.7 4.7 0 0 1 8.8 2.3Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>'],
  ['not-for-me','Not for me','tl-feedback-button is-danger','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h3v11H6zM9 6h7.2a2 2 0 0 1 1.9 2.6l-1.4 4.5a2 2 0 0 1-1.9 1.4H11l.6 3.1a1.5 1.5 0 0 1-2.3 1.5L6 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/></svg>'],
  ['already-watched','Already watched','tl-feedback-button','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.2-6 9.5-6 9.5 6 9.5 6-3.2 6-9.5 6-9.5-6-9.5-6Z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="2.7" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m16 4 1.5 1.5L20 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>']
 ];
 feedbackActions.forEach(([action,label,cls,icon])=>{const b=el('button',cls);b.type='button';b.innerHTML=icon+'<span>'+label+'</span>';b.addEventListener('click',()=>saveFeedback(m,action));actions.appendChild(b);});
 body.appendChild(actions);card.appendChild(body);return card;
}
function applyFilters(ranked){
 const f=state.filters;
 let results=ranked.filter(m=>{
  const titleAndSynopsis=String((m.title||'')+' '+(m.overview||'')).toLocaleLowerCase();
  const query=String(f.title||'').trim().toLocaleLowerCase();
  if(query&&!titleAndSynopsis.includes(query))return false;
  const genres=(m.genre_ids||[]).map(String);
  if(f.genre!=='any'&&!genres.includes(String(f.genre)))return false;
  if(f.excludeGenre!=='any'&&genres.includes(String(f.excludeGenre)))return false;
  const year=Number(String(m.release_date||'').slice(0,4));
  if(f.yearFrom!=='any'&&(!year||year<Number(f.yearFrom)))return false;
  if(f.yearTo!=='any'&&(!year||year>Number(f.yearTo)))return false;
  if(Number(f.rating)>0&&Number(m.vote_average)<Number(f.rating))return false;
  if(Number(f.votes)>0&&Number(m.vote_count)<Number(f.votes))return false;
  if(f.language!=='any'&&String(m.original_language||'')!==String(f.language))return false;
  if(Number(f.runtimeMin)>0&&Number.isFinite(Number(m.runtime))&&Number(m.runtime)<Number(f.runtimeMin))return false;
  if(Number(f.runtimeMax)>0&&Number.isFinite(Number(m.runtime))&&Number(m.runtime)>Number(f.runtimeMax))return false;
  return true;
 });
 if(f.sort==='rating')results.sort((a,b)=>window.TasteRecommender.qualityFit(b)-window.TasteRecommender.qualityFit(a));
 else if(f.sort==='newest')results.sort((a,b)=>String(b.release_date||'').localeCompare(String(a.release_date||'')));
 else if(f.sort==='popular')results.sort((a,b)=>(Number(b.popularity)||0)-(Number(a.popularity)||0));
 return results;
}
function rememberImpressions(movies){
 const byKey=new Map(state.impressions.map(x=>[impressionKey(x),x]));
 (movies||[]).forEach(m=>{const entry={id:String(m.id||''),title:String(m.title||'').slice(0,180),year:String(m.release_date||'').slice(0,4),shownAt:new Date().toISOString()};byKey.set(impressionKey(entry),entry);});
 state.impressions=Array.from(byKey.values()).slice(-MAX_IMPRESSIONS);
 safeStore(IMPRESSIONS_KEY,state.impressions);
}
function render(){
 const grid=$('tl-results-grid');
 const ranked=window.TasteRecommender.rank(state.candidates,{profile:state.profile,library:state.library,watchlist:state.watchlist,feedback:state.feedback,mode:state.mode,focusAspect:state.filters.focusAspect,avoidAspect:state.filters.avoidAspect,focusTheme:state.filters.focusTheme});
 const filtered=applyFilters(ranked),context=currentRankingContext(filtered);
 const cachedAI=state.filters.sort==='fit'&&window.TasteLabAI?window.TasteLabAI.getCached(context):null;
 const ordered=state.filters.sort==='fit'&&window.TasteLabAI?window.TasteLabAI.applyRanking(filtered,context,cachedAI):filtered;
 const visible=ordered.slice(0,12),aiApplied=visible.some(m=>m&&m._aiRanked);
 grid.replaceChildren();
 $('tl-results-count').textContent=visible.length?visible.length+' recommendations · '+(state.library.length?'personalized from your signals':'general discovery')+(aiApplied?' · AI-assisted ranking':''):'No films match these filters';
 if(!visible.length){
  const c=el('div','tl-empty-card');c.appendChild(el('span','tl-empty-symbol','◈'));
  c.appendChild(el('strong','','No fresh films match this selection.'));
  c.appendChild(el('p','','Your history filter, the current catalogue page, or the advanced filters may be narrowing the list. Try a wider year range or refresh for a different group of films.'));
  const b=el('button','tl-feedback-button is-primary','Load a different batch');b.type='button';b.addEventListener('click',()=>load({refreshCandidates:true}));c.appendChild(b);grid.appendChild(c);return;
 }
 visible.forEach(m=>grid.appendChild(filmCard(m)));
 rememberImpressions(visible);
 safeStore(CURRENT_BATCH_KEY,state.candidates);
}
function addToWatchlist(m,button){
 const year=String(m.release_date||'').slice(0,4),title=String(m.title||'').trim();
 if(!title){toast('This film has no usable title yet.');return;}
 const key=title.toLocaleLowerCase()+'|'+year,list=readArray('fr_watchlist');
 if(list.some(x=>String(x.title||'').trim().toLocaleLowerCase()+'|'+String(x.year||'').trim()===key)){
  if(button){button.classList.add('is-added');button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Already in My Cinema</span>';button.disabled=true;}toast('This film is already in My Cinema.');return;
 }
 const poster=m.poster_path?('https://image.tmdb.org/t/p/w500'+(String(m.poster_path).startsWith('/')?m.poster_path:'/'+m.poster_path)):'';
 const backdrop=m.backdrop_path?('https://image.tmdb.org/t/p/original'+(String(m.backdrop_path).startsWith('/')?m.backdrop_path:'/'+m.backdrop_path)):poster;
 const entry={id:'tmdb:'+String(m.id||key),title:title.slice(0,240),year,poster,backdrop,source:'tmdb',status:'want_to_watch',addedAt:new Date().toISOString().slice(0,10),updatedAt:new Date().toISOString()};
 const next=[entry,...list.filter(x=>String(x.title||'').trim().toLocaleLowerCase()+'|'+String(x.year||'').trim()!==key)].slice(0,1000);
 try{
  localStorage.setItem('fr_watchlist',JSON.stringify(next));
  let events={};try{const parsed=JSON.parse(localStorage.getItem('fr_watchlist_events')||'{}');if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))events=parsed;}catch(_){}
  events[key]={action:'add',updatedAt:new Date().toISOString()};const pairs=Object.entries(events);if(pairs.length>2000)events=Object.fromEntries(pairs.slice(-2000));localStorage.setItem('fr_watchlist_events',JSON.stringify(events));
  state.watchlist=next;
  if(button){button.classList.remove('is-primary');button.classList.add('is-added');button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Added to My Cinema</span>';button.disabled=true;button.setAttribute('aria-label',title+' added to My Cinema');if(button.animate)button.animate([{transform:'scale(1)',boxShadow:'0 0 0 0 rgba(181,138,242,0)'},{transform:'scale(1.04)',boxShadow:'0 0 0 7px rgba(181,138,242,.14)'},{transform:'scale(1)',boxShadow:'0 0 0 0 rgba(181,138,242,0)'}],{duration:420,easing:'cubic-bezier(.2,.8,.2,1)'});}
  renderProfile(state.profile||{});toast('Added to My Cinema · Want to Watch.');
 }catch(error){console.warn('[Taste Lab] Could not add film to My Cinema:',error);toast('Could not save to My Cinema. Browser storage may be full.');}
}
async function openTasteTrailer(movie){
 const modal=$('tl-trailer-modal'),frame=$('tl-trailer-frame'),title=$('tl-trailer-title'),notice=$('tl-trailer-notice'),external=$('tl-trailer-youtube');
 if(!modal||!frame||!title||!notice)return;
 const requestId=++state.trailerRequestId;title.textContent=(movie.title||'Film')+' — Trailer';notice.textContent='Finding an official trailer…';notice.classList.remove('tl-hidden');frame.classList.add('tl-hidden');frame.src='about:blank';external.classList.add('tl-hidden');modal.classList.remove('tl-hidden');document.body.classList.add('tl-modal-open');
 try{
  const details=await proxy('details',{id:movie.id});if(requestId!==state.trailerRequestId)return;
  const videos=details&&details.videos&&Array.isArray(details.videos.results)?details.videos.results:[];
  const chosen=videos.filter(v=>v&&v.site==='YouTube'&&/^[A-Za-z0-9_-]{6,20}$/.test(String(v.key||''))&&['Trailer','Teaser'].includes(String(v.type||''))).sort((a,b)=>Number(b.type==='Trailer')-Number(a.type==='Trailer')||Number(Boolean(b.official))-Number(Boolean(a.official)))[0];
  if(chosen){frame.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(chosen.key)+'?autoplay=1&rel=0';frame.classList.remove('tl-hidden');notice.classList.add('tl-hidden');external.href='https://www.youtube.com/watch?v='+encodeURIComponent(chosen.key);external.textContent='Open on YouTube ↗';external.classList.remove('tl-hidden');}
  else{notice.textContent='No embedded trailer was found for this film. You can search YouTube without leaving this page.';external.href='https://www.youtube.com/results?search_query='+encodeURIComponent((movie.title||'')+' '+String(movie.release_date||'').slice(0,4)+' official trailer');external.textContent='Search YouTube ↗';external.classList.remove('tl-hidden');}
 }catch(_){if(requestId!==state.trailerRequestId)return;notice.textContent='The trailer service could not be reached. You can still search YouTube for this film.';external.href='https://www.youtube.com/results?search_query='+encodeURIComponent((movie.title||'')+' official trailer');external.textContent='Search YouTube ↗';external.classList.remove('tl-hidden');}
}
function closeTasteTrailer(){state.trailerRequestId++;const modal=$('tl-trailer-modal'),frame=$('tl-trailer-frame');if(frame)frame.src='about:blank';if(modal)modal.classList.add('tl-hidden');document.body.classList.remove('tl-modal-open');}
function readFilters(){
 try{const x=JSON.parse(localStorage.getItem(FILTER_KEY)||'{}');if(x&&typeof x==='object')state.filters=Object.assign(state.filters,x);}catch(_){}
 const ids={title:'tl-title-filter',genre:'tl-genre-filter',excludeGenre:'tl-exclude-genre-filter',yearFrom:'tl-year-from-filter',yearTo:'tl-year-to-filter',rating:'tl-rating-filter',votes:'tl-votes-filter',runtimeMin:'tl-runtime-min-filter',runtimeMax:'tl-runtime-max-filter',language:'tl-original-language',focusAspect:'tl-focus-aspect',avoidAspect:'tl-avoid-aspect',focusTheme:'tl-focus-theme',sort:'tl-sort-filter'};
 Object.entries(ids).forEach(([key,id])=>{const node=$(id);if(node&&state.filters[key]!==undefined)node.value=state.filters[key];});
}
function collectFilters(){
 state.filters={
  title:$('tl-title-filter').value||'',genre:$('tl-genre-filter').value||'any',excludeGenre:$('tl-exclude-genre-filter').value||'any',
  yearFrom:$('tl-year-from-filter').value||'any',yearTo:$('tl-year-to-filter').value||'any',rating:$('tl-rating-filter').value||'0',
  votes:$('tl-votes-filter').value||'0',runtimeMin:$('tl-runtime-min-filter').value||'0',runtimeMax:$('tl-runtime-max-filter').value||'0',
  language:$('tl-original-language').value||'any',focusAspect:$('tl-focus-aspect').value||'any',avoidAspect:$('tl-avoid-aspect').value||'any',focusTheme:$('tl-focus-theme').value||'any',sort:$('tl-sort-filter').value||'fit'
 };
 safeStore(FILTER_KEY,state.filters);
}
function resetFilters(){
 state.filters={title:'',genre:'any',excludeGenre:'any',yearFrom:'any',yearTo:'any',rating:'0',votes:'0',runtimeMin:'0',runtimeMax:'0',language:'any',focusAspect:'any',avoidAspect:'any',focusTheme:'any',sort:'fit'};
 const ids={title:'tl-title-filter',genre:'tl-genre-filter',excludeGenre:'tl-exclude-genre-filter',yearFrom:'tl-year-from-filter',yearTo:'tl-year-to-filter',rating:'tl-rating-filter',votes:'tl-votes-filter',runtimeMin:'tl-runtime-min-filter',runtimeMax:'tl-runtime-max-filter',language:'tl-original-language',focusAspect:'tl-focus-aspect',avoidAspect:'tl-avoid-aspect',focusTheme:'tl-focus-theme',sort:'tl-sort-filter'};
 Object.entries(ids).forEach(([key,id])=>{const node=$(id);if(node)node.value=state.filters[key];});
 collectFilters();render();
}
function saveFeedback(m,action){
 const year=String(m.release_date||'').slice(0,4),key=String(m.id||'')+'|'+normTitle(m.title);
 const entry={id:m.id,key,title:String(m.title||'').slice(0,180),year,action,genre_ids:Array.isArray(m.genre_ids)?m.genre_ids.slice(0,12):[],overview:String(m.overview||'').slice(0,1600),updatedAt:new Date().toISOString()};
 state.feedback=state.feedback.filter(x=>String(x.key||'')!==key&&!(normTitle(x.title)===normTitle(entry.title)&&String(x.year||'')===year));
 state.feedback.push(entry);state.feedback=state.feedback.slice(-1000);safeStore(FEEDBACK_KEY,state.feedback);
 renderProfile(state.profile||{});render();toast(action==='more-like-this'?'Saved. Related genres get a small boost.':action==='not-for-me'?'Saved. This film will be hidden from discovery.':'Saved. This film will be excluded from discovery.');
}
async function load(options){
 const o=options||{},activeAccountKey=currentAccountKey();
 if(state.activeAccountKey!==null&&state.activeAccountKey!==activeAccountKey){state.candidates=[];state.profile=null;state.feedback=[];state.impressions=[];state.watchlist=[];state.library=[];}
 state.activeAccountKey=activeAccountKey;
 const token=++state.loadToken,rebuild=Boolean(o.forceProfile),refresh=Boolean(o.refreshCandidates);
 $('tl-rebuild-profile').disabled=true;$('tl-refresh-recommendations').disabled=true;
 setStatus(rebuild?'Re-reading ratings and reviews, then rebuilding the profile…':'Reading your account library and preparing recommendations…');
 try{
  let fullLibrary=null;
  if(window.FrameRateLibraryStore){
   try{fullLibrary=await window.FrameRateLibraryStore.get();}
   catch(error){console.warn('[Taste Lab] Could not read the full IndexedDB archive; using the synced browser snapshot:',error);}
  }
  if(token!==state.loadToken)return;
  state.library=(Array.isArray(fullLibrary)?fullLibrary:readArray('fr_lb_zip_library')).filter(x=>x&&x.title);
  if(!Array.isArray(fullLibrary)&&state.library.length&&window.FrameRateLibraryStore){
   try{await window.FrameRateLibraryStore.set(state.library);}
   catch(error){console.warn('[Taste Lab] Could not migrate the account library to IndexedDB:',error);}
  }
  if(token!==state.loadToken)return;
  state.watchlist=readArray('fr_watchlist').filter(x=>x&&x.title);
  state.feedback=readArray(FEEDBACK_KEY).filter(x=>x&&x.title);
  state.impressions=readArray(IMPRESSIONS_KEY).filter(x=>x&&(x.id||x.title));
  accountStatus();metrics(null);readFilters();
  state.profile=await window.TasteProfileBuilder.build(state.library,{force:rebuild});
  if(token!==state.loadToken)return;
  renderProfile(state.profile);$('tl-import-note').classList.toggle('tl-hidden',state.library.length>0);
  if(refresh){
   setTuneStatus('Searching the catalogue and matching your filters…','working');
   setStatus(state.library.length?'Searching a fresh catalogue batch against your taste signals…':'Loading a new catalogue batch. Import history to personalize it…');
   state.candidates=await fetchCandidateBatch();safeStore(CURRENT_BATCH_KEY,state.candidates);
  }else if(!state.candidates.length){
   let cachedBatchExists=false;
   try{
    const cachedRaw=localStorage.getItem(CURRENT_BATCH_KEY);
    if(cachedRaw!==null){const parsed=JSON.parse(cachedRaw);if(Array.isArray(parsed)){state.candidates=parsed;cachedBatchExists=true;}}
   }catch(_){}
   if(!cachedBatchExists){setStatus('Preparing the first recommendation batch…','warning');state.candidates=await fetchCandidateBatch();safeStore(CURRENT_BATCH_KEY,state.candidates);}
  }
  if(token!==state.loadToken)return;
  render();
  if(!state.candidates.length){setStatus('No fresh matches were returned for this page and filter combination. Try another filter or refresh for a different catalogue batch.','warning');setTuneStatus('No matches in this batch. Widen one or more filters, then search again.','error');}
  else if(!state.library.length){setStatus('Showing fresh catalogue picks. Import Letterboxd history to personalize genres and themes.','warning');setTuneStatus(state.candidates.length+' fresh catalogue candidates loaded. Import Letterboxd history to personalize the ranking.','ready');}
  else{setStatus('Profile ready. '+state.library.length+' imported films checked; recent recommendations and watchlist entries are filtered out.');setTuneStatus(state.candidates.length+' candidates loaded. Your watched films and recent recommendations are filtered out.','ready');}
 }catch(error){
  if(token!==state.loadToken)return;
  console.error('[Taste Lab] Could not load recommendations:',error);
  const message=error&&error.message?error.message:'Something went wrong while loading Taste Lab.';
  const displayed=/failed to send a request to the edge function/i.test(message)?'The browser could not reach movie-data-proxy. Deploy the latest Supabase function, then check Supabase Logs if it continues.':message;setStatus(displayed,'error');setTuneStatus(displayed,'error');
 }finally{if(token===state.loadToken){$('tl-rebuild-profile').disabled=false;$('tl-refresh-recommendations').disabled=false;accountStatus();updateAiButton();}}
}
function init(){
 $('tl-rebuild-profile').addEventListener('click',()=>load({forceProfile:true,refreshCandidates:true}));
 const aiButton=$('tl-ai-rank');if(aiButton)aiButton.addEventListener('click',()=>void improveWithAI());
 $('tl-refresh-recommendations').addEventListener('click',()=>load({refreshCandidates:true}));
 document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{state.mode=b.dataset.mode||'balanced';updateModes();render();}));
 ['tl-title-filter','tl-genre-filter','tl-exclude-genre-filter','tl-year-from-filter','tl-year-to-filter','tl-rating-filter','tl-votes-filter','tl-runtime-min-filter','tl-runtime-max-filter','tl-original-language','tl-focus-aspect','tl-avoid-aspect','tl-focus-theme','tl-sort-filter'].forEach(id=>{
  const node=$(id);if(!node)return;node.addEventListener(id==='tl-title-filter'?'input':'change',()=>{collectFilters();render();});
 });
 $('tl-reset-filters').addEventListener('click',()=>{resetFilters();void load({refreshCandidates:true});});
 const runDiscovery=()=>{collectFilters();setTuneStatus('Searching the catalogue with your selected preferences…','working');if(window.TasteLabExperience)window.TasteLabExperience.setStep('discover');void load({refreshCandidates:true});};
 ['tl-tune-discover','tl-tune-discover-bottom'].forEach(id=>{const button=$(id);if(button)button.addEventListener('click',runDiscovery);});
 $('tl-reset-feedback').addEventListener('click',()=>{
  if(!state.feedback.length){toast('There is no discovery feedback to reset yet.');return;}
  if(!window.confirm('Reset Taste Lab feedback for this browser profile? Your imported film history will stay untouched.'))return;
  state.feedback=[];safeStore(FEEDBACK_KEY,state.feedback);renderProfile(state.profile||{});void load({refreshCandidates:false});toast('Discovery feedback reset.');
 });
 updateModes();readFilters();
 window.addEventListener('frameratedataready',()=>{accountStatus();void load({refreshCandidates:false});});
 window.addEventListener('storage',e=>{if(['fr_lb_zip_library','fr_watchlist',FEEDBACK_KEY,FILTER_KEY,IMPRESSIONS_KEY,CURRENT_BATCH_KEY].includes(e.key))void load({refreshCandidates:false});});
 document.querySelectorAll('[data-tl-close-trailer]').forEach(node=>node.addEventListener('click',closeTasteTrailer));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('tl-trailer-modal').classList.contains('tl-hidden'))closeTasteTrailer();});
 void load({refreshCandidates:false});
 setTimeout(()=>{if(state.loadToken===0)void load({refreshCandidates:false});},5500);
}
document.addEventListener('DOMContentLoaded',init);
})();