import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {getAuth,onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signOut} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {firebaseConfig} from './firebase-config.js';
const API='https://dar-tax-client-api.dartaxandconsultancy.workers.dev';
const auth=getAuth(getApps()[0]||initializeApp(firebaseConfig));
const by=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const manifests=await fetch('document-manifest.json?v=2',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Document checklist unavailable.');return r.json();});
let user=null,apps=[],active=null,template='',busy=false,sequence=0;
const page=document.body.dataset.servicePage;
const dashboard=document.body.dataset.dashboard;
const message=text=>{const n=by('document-message')||by('client-auth-status');if(n)n.textContent=text;};
async function api(path,options={}){
 if(!auth.currentUser)throw Error('Please sign in first.');
 const token=await auth.currentUser.getIdToken();
 const response=await fetch(API+'/v1/'+path,{...options,cache:'no-store',headers:{Authorization:'Bearer '+token,...options.headers}});
 if(!response.ok){let data;try{data=await response.json();}catch{}throw Error(data?.error||'The request could not be completed.');}
 return response;
}
async function jsonAPI(path,method='GET',data){return (await api(path,{method,...(data?{headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{})})).json();}
async function action(fn){if(busy)return;busy=true;try{await fn();}catch(e){message(e.message||'Please try again.');}finally{busy=false;}}
function button(label,fn){const b=el('button',label);b.type='button';b.addEventListener('click',()=>action(fn));return b;}
const login=by('client-signin'),logout=by('client-signout');
login?.addEventListener('click',()=>action(async()=>{const p=new GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});await signInWithPopup(auth,p);}));
logout?.addEventListener('click',()=>action(()=>signOut(auth)));
function dialog(title,build){
 const d=el('dialog',undefined,'document-dialog');const h=el('h2',title),form=el('div'),error=el('p','');error.setAttribute('role','alert');d.append(h,form,error);
 const close=button('Close',()=>d.close());d.append(close);document.body.append(d);d.addEventListener('close',()=>d.remove());build(form,d,error);d.showModal();
}
function textDialog(title,current,save){dialog(title,(form,d,error)=>{const label=el('label','Details');const input=el('textarea');input.maxLength=2000;input.value=current||'';label.append(input);form.append(label);const b=el('button','Save');b.type='button';b.onclick=async()=>{b.disabled=true;try{await save(input.value);d.close();await loadActive();}catch(e){error.textContent=e.message;}finally{b.disabled=false;}};form.append(b);});}
async function download(appId,file){
 message('Preparing private download…');const response=await api('apps/'+appId+'/files/'+file.id);const blob=await response.blob();
 const link=el('a');const url=URL.createObjectURL(blob);link.href=url;link.download=file.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);message('Download ready.');
}
function filesFor(container,record,slot){
 const info=el('div',undefined,'doc-files');
 if(slot.value)info.append(el('p',slot.value,'doc-value'));
 if(slot.note)info.append(el('p','Review / applicability note: '+slot.note));
 const files=record.files.filter(f=>f.slot===slot.slot);
 if(files.length){const list=el('ul');for(const f of files){const li=el('li');li.append(button(f.name+' · '+new Date(f.created).toLocaleString(),()=>download(record.application.id,f)));list.append(li);}info.append(list);}
 container.append(info);return info;
}
function review(record,spec,slot){
 dialog('Review: '+spec.label,(form,d,error)=>{
  const label=el('label','Status'),select=el('select');for(const status of ['Pending','Under Review','Accepted','Replacement Required','Not Applicable']){const o=el('option',status);o.value=status;select.append(o);}select.value=slot.status==='Uploaded'?'Under Review':slot.status;label.append(select);
  const noteLabel=el('label','Note to client'),input=el('textarea');input.maxLength=1000;input.value=slot.note;noteLabel.append(input);form.append(label,noteLabel);
  const save=el('button','Save review');save.onclick=async()=>{save.disabled=true;try{await jsonAPI('apps/'+record.application.id+'/slots/'+spec.id,'PATCH',{action:'review',status:select.value,note:input.value,version:slot.version});d.close();await renderOwnerApplication(record.application.id);}catch(e){error.textContent=e.message;}finally{save.disabled=false;}};form.append(save);
 });
}
function showGroup(){
 document.querySelectorAll('[data-document-group]').forEach(n=>{n.hidden=n.dataset.documentGroup!==template;if(!n.hidden&&n.tagName==='DETAILS')n.open=true;});
 document.querySelectorAll('[data-template]').forEach(n=>n.hidden=n.dataset.template!==template);
}
function summary(record){
 if(!record)return 'Create or select an application to save progress.';
 const counts={};for(const s of record.slots)counts[s.status]=(counts[s.status]||0)+1;
 return Object.entries(counts).map(([s,n])=>n+' '+s.toLowerCase()).join(' · ');
}
function renderRows(){
 document.querySelectorAll('[data-slot]').forEach(row=>{
  row.querySelectorAll('.doc-files').forEach(n=>n.remove());
  const spec=manifests[row.dataset.template].slots.find(s=>s.id===row.dataset.slot),slot=active?.application.template===row.dataset.template?active.slots.find(s=>s.slot===spec.id):null;
  const tag=row.querySelector('.status-tag');tag.textContent=slot?.status||'Pending';tag.dataset.status=slot?.status||'Pending';
  const b=row.querySelector('.upload-action');if(!b)return;b.disabled=!user||!slot||slot.status==='Accepted';b.textContent=spec.kind==='text'?'Add details':'Upload';
  b.onclick=()=>action(async()=>{
   if(spec.kind==='text'){textDialog(spec.label,slot.value,value=>jsonAPI('apps/'+active.application.id+'/slots/'+spec.id,'PATCH',{action:'save',value,version:slot.version}));return;}
   const appId=active.application.id;const picker=el('input');picker.type='file';picker.multiple=true;picker.accept='.pdf,.jpg,.jpeg,.png';
   picker.onchange=async()=>{if(!picker.files?.length)return;busy=true;b.disabled=true;try{
    const chosen=[...picker.files];if(chosen.some(f=>!f.size||f.size>5*1024*1024))throw Error('Each file must be between 1 byte and 5 MB.');
    if(chosen.length+active.files.filter(f=>f.slot===spec.id).length>10)throw Error('Maximum 10 files for this row.');
    for(let i=0;i<chosen.length;i++){const f=chosen[i];message('Uploading '+(i+1)+' of '+chosen.length+': '+f.name);await api('apps/'+appId+'/slots/'+spec.id+'/files',{method:'POST',headers:{'Content-Type':f.type||'application/octet-stream','X-File-Name':encodeURIComponent(f.name)},body:f});}
    message('Upload saved. Your team can now review it.');
   }catch(e){message(e.message);}finally{busy=false;await loadActive();}};picker.click();
  });
  if(slot){const info=filesFor(row,active,slot);if(spec.optional&&slot.status!=='Accepted')info.append(button('Not applicable',()=>{textDialog('Why is this not applicable?',slot.note,note=>jsonAPI('apps/'+active.application.id+'/slots/'+spec.id,'PATCH',{action:'not-applicable',note,version:slot.version}));}));}
 });
 by('document-summary').textContent=summary(active);
 by('new-application').hidden=!!active;
 by('create-application').disabled=!user;
 showGroup();
}
function fillApplications(wanted=''){
 const select=by('application-select');select.replaceChildren(new Option('Start a new application',''));
 apps.filter(a=>a.template===template).forEach(a=>select.append(new Option(a.name+' · '+a.id.slice(0,8),a.id)));
 select.value=wanted;active=null;
}
async function loadActive(){
 const id=by('application-select')?.value;if(!id){active=null;renderRows();return;}
 const seq=++sequence;try{const result=await jsonAPI('apps/'+id);if(seq!==sequence)return;active=result;renderRows();}catch(e){if(seq===sequence){active=null;renderRows();message(e.message);}}
}
async function loadPage(){
 apps=user?(await jsonAPI('apps')).applications:[];
 const wanted=new URLSearchParams(location.search).get('application');const selected=apps.find(a=>a.id===wanted&&manifests[a.template]?.page===page);
 if(selected){template=selected.template;by('document-type').value=template;}
 fillApplications(selected?.id||'');await loadActive();
}
if(page){
 const types=Object.values(manifests).filter(s=>s.page===page);template=types[0].key;
 types.forEach(s=>by('document-type').append(new Option(s.variant,s.key)));
 by('document-type').onchange=()=>action(async()=>{template=by('document-type').value;fillApplications();await loadActive();});
 by('application-select').onchange=()=>action(loadActive);
 by('create-application').onclick=()=>action(async()=>{
  const name=by('application-name').value.trim();if(!name)throw Error('Enter the business or applicant name.');if(!by('document-consent').checked)throw Error('Please read and agree to document submission.');
  const created=await jsonAPI('apps','POST',{template,name,consent:true});apps.unshift(created.application);fillApplications(created.application.id);active=created;
  history.replaceState(null,'','?application='+created.application.id);renderRows();message('Application saved. You can return to My applications at any time.');
 });
 renderRows();
}
async function renderOwnerApplication(id){
 const record=await jsonAPI('apps/'+id),spec=manifests[record.application.template];const host=by('application-detail');host.replaceChildren();
 host.append(el('h2',record.application.name),el('p',spec.title+' · '+spec.variant),el('p',record.application.email),el('p',summary(record)));
 host.append(button('Check interrupted uploads',async()=>{const result=await jsonAPI('apps/'+id+'/recover','POST');message(result.message);await renderOwnerApplication(id);}));
 for(const slot of record.slots){const doc=spec.slots.find(d=>d.id===slot.slot);const row=el('section',undefined,'review-row');row.append(el('h3',doc.label),el('p',doc.instructions),el('p',slot.status));filesFor(row,record,slot);row.append(button('Review row',()=>review(record,doc,slot)));host.append(row);}
 host.append(el('h3','Recent activity'));for(const e of record.events)host.append(el('p',new Date(e.created).toLocaleString()+' — '+e.message));
 host.scrollIntoView({behavior:'smooth',block:'start'});
}
let nextOffset=null;
async function loadDashboard(append=false){
 const host=by('application-list');if(!append)host.replaceChildren();
 const result=await jsonAPI(dashboard==='owner'?'admin/apps?offset='+(append?nextOffset||0:0):'apps');nextOffset=result.nextOffset;
 if(!result.applications.length&&!append)host.append(el('p','No applications yet. Choose a registration service to begin.'));
 for(const app of result.applications){const spec=manifests[app.template];const card=el('article',undefined,'application-card');card.append(el('h2',app.name),el('p',spec.title+' · '+spec.variant));
  if(dashboard==='owner'){card.append(el('p',app.email),el('p',(app.pending||0)+' pending / replacement · '+(app.uploaded||0)+' awaiting review'));card.append(button('Open application',()=>renderOwnerApplication(app.id)));}
  else{card.append(el('p',(app.pending||0)+' pending / replacement · '+(app.uploaded||0)+' awaiting review'));const link=el('a','Open documents and status →');link.href=spec.page+'?application='+encodeURIComponent(app.id);card.append(link);}
  host.append(card);
 }
 const more=by('load-more');if(more){more.hidden=nextOffset===null||nextOffset===undefined;more.onclick=()=>action(()=>loadDashboard(true));}
}
by('refresh-applications')?.addEventListener('click',()=>action(()=>loadDashboard()));
onAuthStateChanged(auth,async account=>{
 user=account;active=null;sequence++;by('client-auth-status').textContent=user?'Signed in as '+(user.email||'client'):'Sign in to view and save your documents.';
 if(login)login.hidden=!!user;if(logout)logout.hidden=!user;
 if(page){try{await loadPage();}catch(e){renderRows();message(e.message);}}
 else if(dashboard){by('application-detail')?.replaceChildren();by('application-list').replaceChildren();if(user)try{await loadDashboard();}catch(e){message(e.message);}}
});
// Tooltip interactions: click/tap toggles; pointer leave, outside click and scroll close.
const infos=[...document.querySelectorAll('.doc-info')];const closeInfo=n=>{n.classList.remove('open');n.querySelector('button')?.setAttribute('aria-expanded','false');};const closeAll=()=>infos.forEach(closeInfo);
for(const info of infos){const b=info.querySelector('button');const open=()=>{closeAll();info.classList.add('open');b.setAttribute('aria-expanded','true');};b.onclick=()=>info.classList.contains('open')?closeInfo(info):open();info.onpointerenter=e=>{if(e.pointerType==='mouse')open();};info.onpointerleave=e=>{if(e.pointerType==='mouse')closeInfo(info);};info.onfocusout=e=>{if(!info.contains(e.relatedTarget))closeInfo(info);};}
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.doc-info'))closeAll();});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll();});window.addEventListener('scroll',closeAll,{passive:true});
setInterval(()=>{if(!user||busy||document.hidden||document.querySelector('dialog[open]'))return;if(page&&active)loadActive();else if(dashboard==='owner')loadDashboard().catch(e=>message(e.message));},60000);
