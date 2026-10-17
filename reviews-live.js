import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged, setPersistence, browserSessionPersistence } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getFirestore, collection, query, orderBy, onSnapshot, doc, getDocFromServer, writeBatch, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
const app=getApps().length?getApp():initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),byId=id=>document.getElementById(id);
const fields=byId('feedback-fields'),form=byId('feedback-form'),status=byId('review-status'),list=byId('public-reviews');
let alreadySubmitted=false,revision=0,entries=[],shown=10,submitting=false;
const persistence=setPersistence(auth,browserSessionPersistence);
persistence.catch(()=>{});
onAuthStateChanged(auth,async user=>{
 const seq=++revision;fields.disabled=true;alreadySubmitted=false;
 byId('feedback-login').hidden=!!user;
 document.querySelectorAll('.account-link').forEach(a=>a.textContent=user?'My account':'Login');
 byId('feedback-auth').textContent=user?'Checking your account…':'Sign in to submit feedback. Everyone can read published reviews.';
 if(!user)return;
 try{
  const [own,legacy]=await Promise.all([getDocFromServer(doc(db,'reviewOwners',user.uid)),getDocFromServer(doc(db,'reviewSubmissions',user.uid))]);
  if(seq!==revision)return;
  alreadySubmitted=own.exists()||legacy.exists();fields.disabled=alreadySubmitted;
  byId('feedback-auth').textContent=alreadySubmitted?'Your review is on file. To change or withdraw it, contact dartaxandconsultancy@gmail.com.':'Signed in. Your review will be published immediately after submission.';
 }catch{
  if(seq!==revision)return;
  byId('feedback-auth').textContent='Review submission is temporarily unavailable. Please contact our team or try again later.';
 }
});
form.addEventListener('submit',async e=>{
 e.preventDefault();const user=auth.currentUser;if(!user||alreadySubmitted||submitting||!form.reportValidity())return;
 const name=byId('review-name').value.trim(),review=byId('review-text').value.trim(),rating=Number(byId('review-rating').value);
 if(!name||name.length>70||!review||review.length>1200||!Number.isInteger(rating)||rating<1||rating>5){status.textContent='Please enter a name, rating and review within the displayed limits.';return;}
 submitting=true;fields.disabled=true;status.textContent='Publishing your review…';
 try{
  await persistence;
  const publicRef=doc(collection(db,'publishedReviews')),ownerRef=doc(db,'reviewOwners',user.uid),batch=writeBatch(db);
  batch.set(ownerRef,{reviewId:publicRef.id,createdAt:serverTimestamp()});
  batch.set(publicRef,{name,review,rating,consent:true,policyVersion:'2026-10-17',publishedAt:serverTimestamp()});
  await batch.commit();alreadySubmitted=true;status.textContent='Thank you. Your review is now published.';form.reset();
  byId('feedback-auth').textContent='Your review is on file. Contact us if you wish to change or withdraw it.';
 }catch{
  status.textContent='Your review could not be confirmed. Refresh to check its status before trying again, or contact our team.';fields.disabled=false;
 }finally{submitting=false;}
});
function render(){
 list.replaceChildren();
 if(!entries.length){const p=document.createElement('p');p.textContent='No reviews have been published yet. Share your experience using the form.';list.append(p);}
 for(const data of entries.slice(0,shown)){
  const card=document.createElement('article');card.className='public-demo';
  const name=document.createElement('strong');name.textContent=data.name;
  const stars=document.createElement('div');stars.textContent='★'.repeat(data.rating)+'☆'.repeat(5-data.rating);stars.setAttribute('aria-label',data.rating+' out of 5 stars');stars.style.color='#a27928';
  const review=document.createElement('p');review.textContent=data.review;
  card.append(name,stars,review);list.append(card);
 }
 byId('more-reviews').hidden=shown>=entries.length;
}
byId('more-reviews').onclick=()=>{shown+=10;render();};
onSnapshot(query(collection(db,'publishedReviews'),orderBy('publishedAt','desc')),snap=>{
 entries=snap.docs.filter(d=>!d.metadata.hasPendingWrites).map(d=>d.data()).filter(d=>typeof d.name==='string'&&typeof d.review==='string'&&Number.isInteger(d.rating)&&d.rating>=1&&d.rating<=5);
 byId('review-total').textContent=entries.length;
 byId('avg-rating').textContent=entries.length?(entries.reduce((n,r)=>n+r.rating,0)/entries.length).toFixed(1):'—';render();
},()=>{byId('review-total').textContent='—';byId('avg-rating').textContent='—';list.textContent='Reviews could not be loaded. Please try again later.';});
