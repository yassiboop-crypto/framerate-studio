(function(){
'use strict';
const GENRES={28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',99:'Documentary',18:'Drama',10751:'Family',14:'Fantasy',36:'History',27:'Horror',10402:'Music',9648:'Mystery',10749:'Romance',878:'Science Fiction',10770:'TV Movie',53:'Thriller',10752:'War',37:'Western'},KEY='fr_taste_profile_v1';
const PROFILE_SAMPLE_LIMIT=36;
function parseObject(raw){try{const x=JSON.parse(raw||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{};}catch(_){return{};}}
function hashSource(rows){
 let h=2166136261;
 const add=value=>{const s=String(value??'');for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}h^=31;h=Math.imul(h,16777619);};
 (Array.isArray(rows)?rows:[]).forEach(x=>{
  add(x&&x.title);add(x&&x.year);add(x&&x.rating);add(x&&x.liked?1:0);
  add(x&&x.rewatch?1:0);add(x&&x.watchedDate);add(x&&x.uri);
  add(x&&x.review);
  (Array.isArray(x&&x.tags)?x.tags:[]).forEach(add);
  add('|');
 });
 return(h>>>0).toString(16);
}
function norm(t){return window.TasteReviewAnalyzer.normalizeText(t).replace(/[^a-z0-9]+/g,' ').trim();}
function similarity(a,b){const x=norm(a),y=norm(b);if(!x||!y)return 0;if(x===y)return 1;const xs=new Set(x.split(' ')),ys=new Set(y.split(' ')),n=[...xs].filter(t=>ys.has(t)).length,u=new Set([...xs,...ys]).size;return u?n/u:0;}
function sampleRows(rows){
 const rated=rows.filter(x=>Number(x.rating)>0&&Number(x.rating)<=5);
 const high=rated.filter(x=>Number(x.rating)>=4).sort((a,b)=>Number(b.rating)-Number(a.rating));
 const low=rated.filter(x=>Number(x.rating)<=2.5).sort((a,b)=>Number(a.rating)-Number(b.rating));
 const middle=rated.filter(x=>Number(x.rating)>2.5&&Number(x.rating)<4).sort((a,b)=>Number(b.rating)-Number(a.rating));
 const liked=rows.filter(x=>x.liked);
 const reviewed=rows.filter(x=>String(x.review||'').trim().length>30).sort((a,b)=>String(b.review||'').length-String(a.review||'').length);
 const out=[],seen=new Set(),add=x=>{
  const key=norm(x&&x.title)+'|'+String(x&&x.year||'');
  if(x&&x.title&&!seen.has(key)&&out.length<PROFILE_SAMPLE_LIMIT){seen.add(key);out.push(x);}
 };
 [high.slice(0,10),low.slice(0,10),liked.slice(0,8),middle.slice(0,6),reviewed].forEach(group=>group.forEach(add));
 // Fill remaining places with evenly spaced rows so larger libraries are not
 // profiled only from their highest and lowest ratings.
 if(rows.length&&out.length<PROFILE_SAMPLE_LIMIT){
  const stride=Math.max(1,Math.floor(rows.length/PROFILE_SAMPLE_LIMIT));
  for(let i=0;i<rows.length&&out.length<PROFILE_SAMPLE_LIMIT;i+=stride)add(rows[i]);
 }
 return out.slice(0,PROFILE_SAMPLE_LIMIT);
}
function buildTagWeights(rows){
 const totals=new Map();
 (rows||[]).forEach(row=>{
  const signal=window.TasteReviewAnalyzer.ratingSignal(row);
  const tags=Array.isArray(row&&row.tags)?row.tags:[];
  const unique=new Set(tags.map(tag=>norm(tag)).filter(tag=>tag.length>=2&&tag.length<=48));
  unique.forEach(tag=>{
   const item=totals.get(tag)||{sum:0,evidence:0,positive:0,negative:0};
   item.sum+=signal;item.evidence++;
   if(signal>.05)item.positive++;else if(signal<-.05)item.negative++;
   totals.set(tag,item);
  });
 });
 return Object.fromEntries([...totals.entries()]
  .map(([tag,item])=>[tag,{score:item.evidence?Math.max(-1,Math.min(1,item.sum/item.evidence)):0,evidence:item.evidence,positive:item.positive,negative:item.negative}])
  .sort((a,b)=>Math.abs(b[1].score)*Math.sqrt(b[1].evidence)-Math.abs(a[1].score)*Math.sqrt(a[1].evidence))
  .slice(0,80));
}
async function search(title){
 const c=window.FrameRateAuth&&window.FrameRateAuth.client;
 if(!c)return[];
 try{const r=await c.functions.invoke('movie-data-proxy',{body:{action:'search',query:String(title||'').slice(0,140)}});
  return !r.error&&Array.isArray(r.data&&r.data.results)?r.data.results:[];
 }catch(_){return[];}
}
async function resolveGenres(rows){
 const sample=sampleRows(rows),totals={};
 if(!sample.length||!window.FrameRateAuth?.client)return{};
 for(let i=0;i<sample.length;i+=3){
  const out=await Promise.all(sample.slice(i,i+3).map(async row=>{
   const list=await search(row.title);if(!list.length)return null;
   const year=String(row.year||'').slice(0,4);let best=null,bestSimilarity=0,bestYearMatch=false;
   list.forEach(movie=>{
    const movieTitle=movie.title||movie.original_title||'';
    const titleScore=similarity(row.title,movieTitle);
    const movieYear=String(movie.release_date||'').slice(0,4);
    const yearMatch=Boolean(year&&movieYear&&year===movieYear);
    const score=titleScore+(yearMatch?.2:0);
    if(score>bestSimilarity){bestSimilarity=score;best=movie;bestYearMatch=yearMatch;}
   });
   // Avoid enriching a profile with a likely remake or same-name film.
   const valid=best&&(year?((bestYearMatch&&bestSimilarity>=.9)||(!bestYearMatch&&bestSimilarity>=1)):bestSimilarity>=1);
   return valid?{movie:best,signal:window.TasteReviewAnalyzer.ratingSignal(row)}:null;
  }));
  out.filter(Boolean).forEach(item=>{
   if(Math.abs(item.signal)<.05)return;
   (item.movie.genre_ids||[]).forEach(id=>{
    const key=String(id),value=totals[key]||(totals[key]={sum:0,count:0});
    value.sum+=item.signal;value.count++;
   });
  });
 }
 return Object.fromEntries(Object.entries(totals).map(([id,item])=>[id,{
  score:item.count?Math.max(-1,Math.min(1,item.sum/item.count)):0,
  evidence:item.count,name:GENRES[id]||'Other'
 }]));
}
function ratingStats(rows){
 const rated=rows.filter(row=>Number(row&&row.rating)>0&&Number(row.rating)<=5);
 const total=rated.reduce((sum,row)=>sum+Number(row.rating),0);
 const distribution={};
 rated.forEach(row=>{
  const rating=Number(row.rating),key=String(Math.round(rating*2)/2);
  distribution[key]=(distribution[key]||0)+1;
 });
 return{average:rated.length?Number((total/rated.length).toFixed(2)):0,distribution};
}
async function build(input,options){
 const rows=Array.isArray(input)?input:[],force=Boolean(options&&options.force),hash=hashSource(rows);
 const cache=parseObject(localStorage.getItem(KEY)),hasClient=Boolean(window.FrameRateAuth&&window.FrameRateAuth.client);
 if(!force&&cache.version===2&&cache.sourceHash===hash&&cache.genreWeights&&(cache.genreEnrichmentAttempted||!hasClient||!rows.length))return cache;
 const review=window.TasteReviewAnalyzer.analyzeLibrary(rows);
 const ratings=rows.filter(x=>Number(x.rating)>0&&Number(x.rating)<=5);
 const ratingSummary=ratingStats(rows),genres=await resolveGenres(rows),tagWeights=buildTagWeights(rows);
 const p={
  version:2,sourceHash:hash,builtAt:new Date().toISOString(),
  genreEnrichmentAttempted:hasClient,genreSampleCount:sampleRows(rows).length,
  libraryCount:rows.length,ratedCount:ratings.length,reviewCount:review.reviewCount,
  likedCount:rows.filter(x=>Boolean(x.liked)).length,
  rewatchCount:rows.filter(x=>Boolean(x.rewatch)).length,
  averageRating:ratingSummary.average,ratingDistribution:ratingSummary.distribution,
  genreWeights:genres,tagWeights,
  aspects:review.aspects,lovedAspects:review.lovedAspects,criticizedAspects:review.criticizedAspects,
  themeWeights:review.themeWeights,positiveThemes:review.positiveThemes,negativeThemes:review.negativeThemes,
  averageReviewSentiment:review.averageReviewSentiment,
  confidence:ratings.length>=20||review.reviewCount>=12?'Developing a strong pattern':(ratings.length>=5||review.reviewCount>=3?'Emerging pattern':'Early signals')
 };
 try{localStorage.setItem(KEY,JSON.stringify(p));}
 catch(error){console.warn('[Taste Lab] Could not cache profile:',error);}
 return p;
}
window.TasteProfileBuilder={build,genreNames:GENRES,hashSource};
})();