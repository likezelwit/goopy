/* app.js - Goopy logic (compat Firebase) */
// Requires firebase.js to be loaded first (compat)

const Goopy = {
  auth: () => window.GoopyAuth || firebase.auth(),
  db: () => window.GoopyDB || firebase.firestore(),
  uid: () => (Goopy.auth().currentUser && Goopy.auth().currentUser.uid) || null
};

// Helpers
function fmt(v){ return 'Rp ' + Number(v||0).toLocaleString('id-ID'); }
function el(id){ return document.getElementById(id); }
function showToast(msg, ms=2500){ const t = document.getElementById('toast'); if(!t) return; t.innerText=msg; t.style.display='block'; clearTimeout(t._t); t._t=setTimeout(()=>t.style.display='none', ms); }

// Auth helpers
async function signup(email, password, username){
  const res = await Goopy.auth().createUserWithEmailAndPassword(email, password);
  const uid = res.user.uid;
  await Goopy.db().collection('users').doc(uid).set({ username: username||email.split('@')[0], email: email, saldo: 0, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  return uid;
}
async function login(email, password){
  const res = await Goopy.auth().signInWithEmailAndPassword(email, password);
  return res.user.uid;
}
function logout(){ Goopy.auth().signOut(); }

// Protect route: must call at page load for protected pages
function protectRoute(){
  Goopy.auth().onAuthStateChanged(user => {
    if(!user){
      location.href = '/login.html';
    } else {
      // user is signed in
      console.log('User', user.uid);
    }
  });
}

// Listen saldo realtime and update element with id 'saldo' (if present)
function listenSaldo(){
  const uid = Goopy.uid();
  if(!uid) return;
  const ref = Goopy.db().collection('users').doc(uid);
  return ref.onSnapshot(doc => {
    if(!doc.exists) return;
    const s = doc.data().saldo || 0;
    const node = document.getElementById('saldo');
    if(node) node.textContent = fmt(s);
    // also update any plain saldo text
    const plain = document.querySelectorAll('[data-saldo]');
    plain.forEach(n=> n.textContent = fmt(s));
  });
}

// Transactions: topup, transfer, pay
async function doTopUp(amount){
  const uid = Goopy.uid();
  if(!uid) throw new Error('Not logged in');
  const userRef = Goopy.db().collection('users').doc(uid);
  await Goopy.db().runTransaction(async t => {
    const doc = await t.get(userRef);
    const cur = (doc.data().saldo||0);
    const next = cur + Number(amount);
    t.update(userRef, { saldo: next });
    await Goopy.db().collection('transactions').add({ uid, type: 'topup', amount: Number(amount), target: null, date: firebase.firestore.FieldValue.serverTimestamp() });
  });
}
async function doTransfer(toEmail, amount){
  const uid = Goopy.uid();
  if(!uid) throw new Error('Not logged in');
  if(!toEmail) throw new Error('Target email empty');
  const usersRef = Goopy.db().collection('users');
  const snap = await usersRef.where('email','==', toEmail).limit(1).get();
  if(snap.empty) throw new Error('Penerima tidak ditemukan');
  const tgtDoc = snap.docs[0];
  const tgtRef = usersRef.doc(tgtDoc.id);
  const senderRef = usersRef.doc(uid);
  await Goopy.db().runTransaction(async t => {
    const sd = await t.get(senderRef);
    const td = await t.get(tgtRef);
    const sVal = sd.data().saldo || 0;
    if(Number(amount) > sVal) throw new Error('Saldo tidak cukup');
    t.update(senderRef, { saldo: sVal - Number(amount) });
    t.update(tgtRef, { saldo: (td.data().saldo||0) + Number(amount) });
    await Goopy.db().collection('transactions').add({ uid, type: 'transfer', amount: Number(amount), target: tgtDoc.id, targetEmail: toEmail, date: firebase.firestore.FieldValue.serverTimestamp() });
  });
}
async function doPay(merchantId, amount){
  const uid = Goopy.uid();
  if(!uid) throw new Error('Not logged in');
  const userRef = Goopy.db().collection('users').doc(uid);
  await Goopy.db().runTransaction(async t => {
    const doc = await t.get(userRef);
    const cur = doc.data().saldo||0;
    if(Number(amount) > cur) throw new Error('Saldo tidak cukup');
    t.update(userRef, { saldo: cur - Number(amount) });
    await Goopy.db().collection('transactions').add({ uid, type: 'pay', amount: Number(amount), target: merchantId||null, date: firebase.firestore.FieldValue.serverTimestamp() });
  });
}

// load basic navbar into element with id 'navbar-root' if present
function loadNavbar(){
  const root = document.getElementById('navbar-root');
  if(!root) return;
  root.innerHTML = "\
    <div class='card' style='display:flex;align-items:center;justify-content:space-between'>\
      <div style='display:flex;gap:10px;align-items:center'>\
        <div class='logo'>G</div>\
        <div>\
          <div class='small'>Saldo</div>\
          <div id='saldo' class='amount'>Rp 0</div>\
        </div>\
      </div>\
      <div style='display:flex;gap:8px;align-items:center'>\
        <a href='/topup.html' class='btn'>Top Up</a>\
        <a href='/transfer.html' class='btn btn-ghost'>Kirim</a>\
      </div>\
    </div>\
  ";
}

// simple history loader for logged in user
async function loadHistory(targetElId){
  const uid = Goopy.uid();
  if(!uid) return;
  const listEl = document.getElementById(targetElId);
  if(!listEl) return;
  listEl.innerHTML = '<div class="small">Memuat...</div>';
  const q = Goopy.db().collection('transactions').where('uid','==', uid).orderBy('date','desc').limit(200);
  const snap = await q.get();
  listEl.innerHTML = '';
  snap.forEach(d => {
    const data = d.data();
    const el = document.createElement('div');
    el.className = 'tx';
    el.innerHTML = '<div style="flex:1">'+(data.type||'') + (data.targetEmail?(' → '+data.targetEmail):'') + '</div><div style="min-width:110px;text-align:right">'+fmt(data.amount)+'</div>';
    listEl.appendChild(el);
  });
}

// expose for console/debug
window.GoopyLib = { signup, login, logout, doTopUp, doTransfer, doPay, loadHistory, loadNavbar, listenSaldo };
