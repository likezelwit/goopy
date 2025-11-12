<!-- firebase.js: include this in each HTML before app.js -->
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
<script>
  // Firebase config (Goopy project)
  const firebaseConfig = {
  apiKey: "AIzaSyAgx2eZh68OK9RKi5ilKkN7FCYPAC4fqEA",
  authDomain: "goopy-1a485.firebaseapp.com",
  projectId: "goopy-1a485",
  storageBucket: "goopy-1a485.firebasestorage.app",
  messagingSenderId: "478710064427",
  appId: "1:478710064427:web:a3b0c455c91f2c12db916e"
};
  // Initialize
  try {
    firebase.initializeApp(firebaseConfig);
    window.GoopyAuth = firebase.auth();
    window.GoopyDB = firebase.firestore();
    console.log('Firebase initialized (compat)');
  } catch (e) {
    console.error('Firebase init error', e);
  }
</script>
