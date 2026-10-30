(function(){
'use strict';
const REVIEW=window.TasteReviewAnalyzer,GENRES=window.TasteProfileBuilder.genreNames;
const PRIOR_RATING=6.3,PRIOR_VOTES=400;
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function normalizeTitle(v){return REVIEW.normalizeText(v).replace(/[^a-z0-9]+/g,' ').trim();}
function titleYearKey(x){return normalizeTitle(x&&x.title)+'|'+String(x&&x.year||String(x&&x.release_date||'').slice(0,4));}
function buildSeenSet(library,watchlist,feedback){
 const seen=new Set();
 (library||[]).forEach(x=>{if(x&&x.title)seen.add(normalizeTitle(x.title));});
 (watchlist||[]).forEach(x=>{if(x&&x.title)seen.add(normalizeTitle(x.title));});
 (feedback||[]).forEach(x=>{if(x&&x.title&&(x.action==='already-watched'||x.action==='not-for-me'))seen.add(normalizeTitle(x.title));});
 return seen;
}
function genreFit(movie,profile){
 const weights=profile&&profile.genreWeights||{},ids=(movie.genre_ids||[]).map(String);
 if(!ids.length)return .5;
 const values=ids.map(id=>weights[id]).filter(Boolean);
 if(!values.length)return .5;
 const pos=values.filter(x=>Number(x.score)>0).map(x=>Number(x.score));
 const neg=values.filter(x=>Number(x.score)<0).map(x=>Math.abs(Number(x.score)));
 const posMean=pos.length?pos.reduce((a,b)=>a+b,0)/pos.length:0;
 const negMean=neg.length?neg.reduce((a,b)=>a+b,0)/neg.length:0;
 return clamp(.5+posMean*.44-negMean*.36,.04,.96);
}
function tagFit(movie,profile){
 const weights=profile&&profile.tagWeights||{},text=REVIEW.normalizeText(String(movie.title||'')+' '+String(movie.overview||''));
 let positive=0,negative=0,matched=0;const likedTags=[],avoidedTags=[];
 Object.entries(weights).forEach(([raw,item])=>{
  const tag=REVIEW.normalizeText(raw).trim();
  if(!tag||tag.length<2||tag.length>48)return;
  const found=tag.includes(' ')?text.includes(tag):new RegExp('(^|[^a-z0-9])'+tag.replace(/[.*+?^${}()|[\]\\]/g,'\\function qualityFit(movie){')+'([^a-z0-9]|$)').test(text);
  if(!found)return;
  const score=Number(item&&item.score)||0,evidence=Math.max(1,Number(item&&item.evidence)||1);
  if(Math.abs(score)<.08)return;
  const signal=score*Math.min(1,Math.sqrt(evidence)/2);
  if(signal>0){positive+=signal;likedTags.push(raw);}
  else{negative+=Math.abs(signal);avoidedTags.push(raw);}
  matched++;
 });
 return{score:matched?clamp(.5+(positive-negative)/(matched+1)*.46,.04,.96):.5,positiveMatches:likedTags,negativeMatches:avoidedTags};
}
function qualityFit(movie){
 const count=Math.max(0,Number(movie.vote_count)||0),rating=clamp(Number(movie.vote_average)||0,0,10);
 return clamp(((rating*count)+(PRIOR_RATING*PRIOR_VOTES))/(count+PRIOR_VOTES)/10,0,1);
}
function feedbackBoost(movie,feedback){
 const ids=new Set((movie.genre_ids||[]).map(String));let boost=0;
 (feedback||[]).filter(x=>x&&x.action==='more-like-this').forEach(x=>{
  const prior=Array.isArray(x.genre_ids)?x.genre_ids.map(String):[];
  if(prior.length)boost+=.045*prior.filter(id=>ids.has(id)).length/Math.max(1,ids.size);
 });
 return Math.min(.14,boost);
}
function genreSimilarity(a,b){
 const x=new Set((a.genre_ids||[]).map(String)),y=new Set((b.genre_ids||[]).map(String));
 if(!x.size||!y.size)return 0;
 let shared=0;x.forEach(id=>{if(y.has(id))shared++;});
 return shared/Math.max(1,new Set([...x,...y]).size);
}
function rank(candidates,context){
 const c=context||{},profile=c.profile||{},mode=c.mode||'balanced',feedback=c.feedback||[];
 const seen=buildSeenSet(c.library,c.watchlist,feedback),all=Array.isArray(candidates)?candidates:[];
 const maxPop=Math.max(1,...all.map(m=>Number(m&&m.popularity)||0));
 const weights=mode==='comfort'
  ?{genre:.57,theme:.15,tags:.12,quality:.10,popular:.04,novelty:.02,diversity:.07}
  :mode==='explore'
   ?{genre:.30,theme:.26,tags:.08,quality:.12,popular:.06,novelty:.18,diversity:.24}
   :{genre:.42,theme:.23,tags:.10,quality:.16,popular:.06,novelty:.03,diversity:.15};
 const deduped=[],seenIds=new Set(),seenTitleYears=new Set();
 all.forEach(m=>{
  if(!m||!m.title)return;
  const id=String(m.id||''),title=normalizeTitle(m.title),yr=String(m.release_date||'').slice(0,4);
  if(id&&seenIds.has(id))return;
  const titleKey=title+'|'+yr;
  if(title&&seenTitleYears.has(titleKey))return;
  seenIds.add(id);seenTitleYears.add(titleKey);
  if(seen.has(title))return;
  deduped.push(m);
 });
 const scored=deduped.map(m=>{
  const gf=genreFit(m,profile);
  const overview=String(m.overview||'');
  const theme=REVIEW.scoreSynopsis(overview,profile.themeWeights||{});
  const tag=tagFit(m,profile);
  const overviewNorm=REVIEW.normalizeText(overview);
  const focusAspect=String(c.focusAspect||'any'),avoidAspect=String(c.avoidAspect||'any'),focusTheme=String(c.focusTheme||'any').replace(/_/g,' ');
  const aspectMatches=key=>{
   if(!key||key==='any')return false;
   const aspect=(REVIEW.aspects||[]).find(x=>x.key===key);
   return Boolean(aspect&&aspect.terms.some(term=>overviewNorm.includes(REVIEW.normalizeText(term))));
  };
  const focusedAspectHit=aspectMatches(focusAspect);
  const avoidedAspectHit=aspectMatches(avoidAspect);
  const focusThemeHit=focusTheme!=='any'&&(theme.positiveMatches||[]).some(x=>normalizeTitle(x)===normalizeTitle(focusTheme));
  const focusBoost=(focusedAspectHit ? .23 : 0)+(focusThemeHit ? .20 : 0);
  const avoidPenalty=avoidedAspectHit ? .18 : 0;
  const quality=qualityFit(m);
  const popularity=clamp(Math.log1p(Math.max(0,Number(m.popularity)||0))/Math.log1p(maxPop),0,1);
  const ids=(m.genre_ids||[]).map(Number);
  const genreSignals=ids.map(id=>({id:String(id),name:GENRES[id]||'Film',weight:profile.genreWeights&&profile.genreWeights[String(id)]})).filter(x=>x.weight);
  const positiveGenres=genreSignals.filter(x=>Number(x.weight.score)>=.12).sort((a,b)=>b.weight.score-a.weight.score).slice(0,2).map(x=>x.name);
  const knownPositive=genreSignals.some(x=>Number(x.weight.score)>=.15);
  const novelty=genreSignals.length?(knownPositive?.34:.84):.60;
  const fb=feedbackBoost(m,feedback);
  const score=clamp(weights.genre*gf+weights.theme*theme.score+weights.tags*tag.score+weights.quality*quality+weights.popular*popularity+weights.novelty*novelty+fb+focusBoost-avoidPenalty,0,1);
  const reasons=[];
  if(positiveGenres.length)reasons.push('Your ratings favor '+positiveGenres.join(' and ')+'.');
  if(theme.positiveMatches.length)reasons.push('Its synopsis overlaps with themes you respond to: '+theme.positiveMatches.slice(0,2).join(', ')+'.');
  if(tag.positiveMatches.length)reasons.push('Matches your positively rated Letterboxd tags: '+tag.positiveMatches.slice(0,2).join(', ')+'.');
  if(tag.negativeMatches.length)reasons.push('Lowered because its synopsis matches tags linked to lower-rated films: '+tag.negativeMatches.slice(0,2).join(', ')+'.');
  if(focusedAspectHit)reasons.push('Matches the film element you chose to prioritize.');
  if(avoidedAspectHit)reasons.push('Ranked lower because it matches an element you usually criticize.');
  if(focusThemeHit)reasons.push('Matches the theme you selected to explore.');
  if(mode==='explore'&&!knownPositive)reasons.push('A deliberate step outside your strongest genre signals.');
  if(Number(m.vote_count)>=1000&&Number(m.vote_average)>=7.0)reasons.push('A well-established audience rating supports this pick.');
  if(!reasons.length)reasons.push(profile.libraryCount?'A fresh candidate ranked from your taste profile and audience signals.':'A discovery starter. Import your Letterboxd history for personal taste signals.');
  return Object.assign({},m,{_tasteScore:score,_tasteFit:Math.round(score*100),_tasteGenres:ids.map(id=>GENRES[id]).filter(Boolean),_tasteReasons:reasons,_scoreParts:{genre:gf,theme:theme.score,tags:tag.score,quality,popularity,novelty,feedback:fb,focusBoost,avoidPenalty},_positiveGenres:positiveGenres});
 }).sort((a,b)=>b._tasteScore-a._tasteScore);
 // Greedy re-ranking: keep relevance high while stopping the first screen from becoming
 // a list of near-identical genre combinations.
 const selected=[],remaining=scored.slice();
 while(remaining.length){
  let bestIndex=0,bestScore=-Infinity;
  for(let i=0;i<remaining.length;i++){
   const item=remaining[i];
   const redundancy=selected.length?Math.max(...selected.map(s=>genreSimilarity(item,s))):0;
   const penalty=weights.diversity*redundancy;
   const adjusted=item._tasteScore-penalty;
   if(adjusted>bestScore){bestScore=adjusted;bestIndex=i;}
  }
  const [next]=remaining.splice(bestIndex,1);
  next._diversityScore=Number(bestScore.toFixed(4));
  selected.push(next);
 }
 return selected;
}
window.TasteRecommender={rank,buildSeenSet,normalizeTitle,genreSimilarity,qualityFit};
})();