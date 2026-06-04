const firebaseConfig = {
  apiKey: "AIzaSyDhtSqYJggi0D_MPMTuBRdG0pqEdeFtseQ",
  authDomain: "academia-cultura-digital.firebaseapp.com",
  projectId: "academia-cultura-digital",
  storageBucket: "academia-cultura-digital.firebasestorage.app",
  messagingSenderId: "1078598841538",
  appId: "1:1078598841538:web:e67f2c36dcea65ddcb775b"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const storage = typeof firebase.storage === 'function' ? firebase.storage() : null;
