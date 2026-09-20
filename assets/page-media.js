/* Load visible pages first; warm only the next page after current media settles. */
(() => {
 const panels=[...document.querySelectorAll('.cover,.letter,.moments-page,.sunset-page,#location')];
 const pending=new WeakMap();let active=-1,timer=0;
 function waitImage(img){
  if(img.complete)return Promise.resolve();
  return new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});});
 }
 function load(panel){
  if(pending.has(panel))return pending.get(panel);
  const work=[];
  for(const img of panel.querySelectorAll('img')){
   if(img.dataset.src){img.loading='eager';img.src=img.dataset.src;delete img.dataset.src;}
   work.push(waitImage(img));
  }
  if(panel.dataset.background){
   const src=panel.dataset.background;const photo=new Image();
   work.push(new Promise(resolve=>{photo.onload=resolve;photo.onerror=resolve;photo.src=src;}));
   panel.style.setProperty('--letter-photo',`url("${src}")`);
  }
  const ready=Promise.all(work);pending.set(panel,ready);return ready;
 }
 function select(index){
  if(index===active)return;
  active=index;clearTimeout(timer);
  Promise.all([load(panels[index]),index===0?window.invitationCoverReady:Promise.resolve()]).then(()=>{
   if(active!==index||!panels[index+1])return;
   timer=setTimeout(()=>{if(active===index)void load(panels[index+1]);},2000);
  });
 }
 if(!('IntersectionObserver' in window)){panels.forEach(load);return;}
 const observer=new IntersectionObserver(entries=>{
  // Visible pages must never wait for prefetch or a slow preceding image.
  entries.forEach(entry=>{if(entry.isIntersecting)void load(entry.target);});
  const middle=innerHeight/2;
  const index=panels.findIndex(panel=>{const r=panel.getBoundingClientRect();return r.top<=middle&&r.bottom>middle;});
  if(index>=0)select(index);
 },{threshold:[0,.5,1]});
 panels.forEach(panel=>observer.observe(panel));
 const index=panels.findIndex(panel=>{const r=panel.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight;});
 if(index>=0)select(index);
 window.addEventListener('pagehide',()=>{clearTimeout(timer);observer.disconnect();});
 window.addEventListener('pageshow',event=>{if(event.persisted){active=-1;panels.forEach(panel=>observer.observe(panel));}});
})();
