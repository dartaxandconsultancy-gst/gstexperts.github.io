import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, signOut, setPersistence, browserSessionPersistence } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getFirestore, doc, getDocFromServer } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);
const byId=id=>document.getElementById(id);
const status=byId('auth-status');
const shell=document.querySelector('[data-service]');
const serviceContent=byId('service-content');
let revision=0;
const pageNames=['services.html','gst-registration.html','company-registration.html','tan-registration.html','pan-registration.html','shops-establishment.html','udyam-registration.html','gst-returns.html','income-tax.html','gst-appeals.html','dsc-services.html','tender-gem.html','accounting.html','business-plans.html','gem-registration.html','tds-returns.html','gst-advisory.html'];
const requested=new URLSearchParams(location.search).get('next');
const destination=pageNames.includes(requested)?requested:'services.html';
if(byId('continue-link'))byId('continue-link').href=destination;
function errorMessage(error){const messages={
 'auth/unauthorized-domain':'Sign-in is not yet enabled for this website address. Please contact DAR Tax.',
 'auth/popup-blocked':'Your browser blocked the Google window. Allow pop-ups for this site and try again.',
 'auth/popup-closed-by-user':'The Google sign-in window was closed. Try again when ready.',
 'auth/cancelled-popup-request':'Please complete the existing Google sign-in window.',
 'auth/invalid-credential':'We could not sign you in. Check your email and password, or reset your password.',
 'auth/email-already-in-use':'An account may already exist. Try signing in or resetting your password.',
 'auth/weak-password':'Choose a stronger password with at least eight characters.',
 'auth/password-does-not-meet-requirements':'Choose a password that meets the account password requirements.',
 'auth/too-many-requests':'Too many attempts. Please wait before trying again.',
 'auth/network-request-failed':'A network error occurred. Check your connection and try again.',
 'auth/operation-not-allowed':'This sign-in method is not yet available. Please contact DAR Tax.'};return messages[error.code]||'Unable to complete this request. Please try again or contact DAR Tax.';}
async function run(action){if(!status)return;status.textContent='Please wait…';const buttons=[...document.querySelectorAll('#signed-out button')];buttons.forEach(b=>b.disabled=true);try{await action();}catch(e){status.textContent=errorMessage(e);}finally{buttons.forEach(b=>b.disabled=false);}}
const persistence=setPersistence(auth,browserSessionPersistence);
persistence.catch(()=>{if(status)status.textContent='Please allow browser storage for sign-in.';});
byId('google-login')?.addEventListener('click',()=>run(async()=>{await persistence;await signInWithPopup(auth,new GoogleAuthProvider());status.textContent='Signed in. Select Continue to services.';}));
byId('email-form')?.addEventListener('submit',e=>{e.preventDefault();run(async()=>{await persistence;await signInWithEmailAndPassword(auth,byId('email').value.trim(),byId('password').value);status.textContent='Signed in. Select Continue to services.';});});
byId('create-account')?.addEventListener('click',()=>{if(!byId('email-form').reportValidity())return;run(async()=>{await persistence;const result=await createUserWithEmailAndPassword(auth,byId('email').value.trim(),byId('password').value);try{await sendEmailVerification(result.user);status.textContent='Account created. A verification email has been sent. You can continue to services.';}catch{status.textContent='Account created, but the verification email could not be sent right now. You can continue to services.';}});});
byId('reset-password')?.addEventListener('click',()=>{if(!byId('email').reportValidity())return;run(async()=>{await sendPasswordResetEmail(auth,byId('email').value.trim());status.textContent='If an eligible account exists, a password-reset email will be sent. Check your inbox and spam folder.';});});
byId('logout')?.addEventListener('click',()=>run(async()=>{await signOut(auth);status.textContent='Signed out.';}));
function el(tag,text,parent){const n=document.createElement(tag);n.textContent=text;parent.append(n);return n;}
function renderService(data){serviceContent.replaceChildren();el('p',data.overview||'',serviceContent).className='service-intro';el('h2','What to prepare',serviceContent);const list=el('ul','',serviceContent);for(const item of data.documents||[])el('li',item,list);if(data.note)el('p',data.note,serviceContent).className='notice';el('h2','How we work',serviceContent);const steps=el('ol','',serviceContent);for(const item of data.steps||[])el('li',item,steps);el('h2','Your quotation',serviceContent);el('p',data.fees||'Contact us for a personalised quotation.',serviceContent);const link=el('a','Discuss this service on WhatsApp ↗',serviceContent);link.className='btn';link.href='https://wa.me/919596171766?text='+encodeURIComponent('Hello DAR Tax, I would like a quotation for '+(data.title||'your services')+'.');if(data.sources?.length){el('h2','Reference information',serviceContent);for(const url of data.sources){try{const parsed=new URL(url);if(parsed.protocol!=='https:')continue;const a=el('a',parsed.hostname+' ↗',serviceContent);a.href=parsed.href;a.target='_blank';a.rel='noopener';a.className='source-link';}catch{}}}el('p','These are preparation guidelines. Confirm the current requirements with our team before providing records. Do not send passwords or OTPs.',serviceContent).className='muted';}
onAuthStateChanged(auth,async user=>{const current=++revision;document.querySelectorAll('.account-link').forEach(a=>{a.textContent=user?'My account':'Login';});if(byId('signed-in')){byId('signed-in').hidden=!user;byId('signed-out').hidden=!!user;if(user)byId('account-name').textContent='Signed in as '+(user.displayName||user.email||'client');}if(!shell)return;serviceContent.replaceChildren();serviceContent.hidden=true;byId('login-gate').hidden=!!user;byId('service-status').textContent=user?'Loading service information…':'';if(!user)return;try{const snapshot=await getDocFromServer(doc(db,'services',shell.dataset.service));if(current!==revision||!auth.currentUser)return;if(!snapshot.exists()){byId('service-status').textContent='This service guide is being prepared. Contact DAR Tax at +91 9596171766 for assistance.';return;}renderService(snapshot.data());serviceContent.hidden=false;byId('service-status').textContent='';}catch(error){if(current!==revision)return;byId('service-status').textContent=error.code==='permission-denied'?'Access could not be confirmed. Sign out and sign in again, or contact DAR Tax.':'Service details could not be loaded. Check your connection and refresh the page.';} });
