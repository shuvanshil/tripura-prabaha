// ত্রিপুরা প্রবাহ — Firebase Configuration

const firebaseConfig = {
  apiKey: "AIzaSyDKkQAV34aLQQ05kIRMAMN6C7R10g1gtR4",
  authDomain: "tripura-prabaha.firebaseapp.com",
  projectId: "tripura-prabaha",
  storageBucket: "tripura-prabaha.firebasestorage.app",
  messagingSenderId: "1087777069804",
  appId: "1:1087777069804:web:31944b6f9aa4858f0a63c9"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();