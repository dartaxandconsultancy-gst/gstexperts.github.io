
(() => {
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
 const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-shown');observer.unobserve(entry.target);}});},{threshold:0.12});
 document.querySelectorAll('.glass-heading, main h1, main h2, main h3, .section-head > p').forEach((element,index)=>{
  if(element.classList.contains('sr-only'))return;
  let target=element;
  if(element.classList.contains('glass-heading')){target=document.createElement('span');target.className='motion-text';while(element.firstChild)target.append(element.firstChild);element.append(target);}
  target.style.setProperty('--text-delay',((index%3)*65)+'ms');target.classList.add('text-enter');observer.observe(target);
 });
})();

(() => {
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 ['service-slides','detail-slides','news-slides'].forEach(id=>{
 const deck=document.getElementById(id);if(!deck)return;const cards=[...deck.children].filter(c=>c.tagName==='ARTICLE');if(cards.length<2)return;
 deck.classList.add('stack-deck');deck.setAttribute('aria-roledescription','carousel');const old=deck.previousElementSibling;if(old?.classList.contains('slider-tools'))old.hidden=true;
 const controls=document.createElement('div');controls.className='stack-controls';const prev=document.createElement('button'),next=document.createElement('button'),pause=document.createElement('button'),status=document.createElement('span');prev.textContent='←';next.textContent='→';prev.setAttribute('aria-label','Previous slide');next.setAttribute('aria-label','Next slide');pause.className='stack-pause';status.className='stack-counter';controls.append(prev,status,next,pause);deck.after(controls);
 let index=0,paused=reduced.matches,hover=false,focus=false,inView=false,startX=null;
 function draw(){cards.forEach((card,i)=>{const offset=(i-index+cards.length)%cards.length;card.classList.add('stack-card');card.dataset.depth=String(Math.min(offset,4));card.style.zIndex=String(cards.length-offset);card.inert=offset!==0;card.setAttribute('aria-hidden',String(offset!==0));card.setAttribute('role','group');card.setAttribute('aria-roledescription','slide');card.setAttribute('aria-label',(i+1)+' of '+cards.length);card.querySelectorAll('.text-enter').forEach(t=>t.classList.add('is-shown'));});status.textContent=String(index+1).padStart(2,'0')+' / '+String(cards.length).padStart(2,'0');pause.textContent=paused?'▶ Play':'Ⅱ Pause';pause.setAttribute('aria-label',paused?'Start automatic slides':'Pause automatic slides');}
 function move(n){index=(index+n+cards.length)%cards.length;draw();}prev.onclick=()=>{paused=true;move(-1);};next.onclick=()=>{paused=true;move(1);};pause.onclick=()=>{paused=!paused;draw();};deck.onkeydown=e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();paused=true;move(e.key==='ArrowRight'?1:-1);}};
 deck.addEventListener('pointerenter',()=>hover=true);deck.addEventListener('pointerleave',()=>hover=false);deck.addEventListener('focusin',()=>focus=true);deck.addEventListener('focusout',e=>focus=deck.contains(e.relatedTarget));deck.addEventListener('touchstart',e=>startX=e.changedTouches[0].clientX,{passive:true});deck.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-startX;if(startX!==null&&Math.abs(dx)>45){paused=true;move(dx<0?1:-1);}startX=null;},{passive:true});
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>inView=entries[0].isIntersecting,{threshold:.25}).observe(deck);else inView=true;
 setInterval(()=>{if(!paused&&!hover&&!focus&&inView&&!document.hidden)move(1);},2000);reduced.addEventListener('change',e=>{if(e.matches){paused=true;draw();}});draw();
 });
})();
