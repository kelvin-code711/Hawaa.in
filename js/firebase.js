// ========================================
// FIREBASE INITIALIZATION (Hawaa Web)
// Project: hawaa-air-27548
// Loaded as <script type="module"> on every page, before nav.js consumers run.
// Other scripts access Firebase via the window.hawaaFirebaseReady promise.
// ========================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signInWithPhoneNumber,
    RecaptchaVerifier,
    updateProfile,
    signOut
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    addDoc,
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    serverTimestamp,
    writeBatch,
    increment
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: 'AIzaSyB9KznUPIvHKwLk7Vo9H05jBYiE8MgrPzk',
    authDomain: 'hawaa-air-27548.firebaseapp.com',
    projectId: 'hawaa-air-27548',
    storageBucket: 'hawaa-air-27548.firebasestorage.app',
    messagingSenderId: '994326211415',
    appId: '1:994326211415:web:36288cebafe81e61dcec12'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = 'en';
const db = getFirestore(app);

const api = {
    app,
    auth,
    db,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signInWithPhoneNumber,
    RecaptchaVerifier,
    updateProfile,
    signOut,
    doc,
    getDoc,
    setDoc,
    addDoc,
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    serverTimestamp,
    writeBatch,
    increment
};

window.hawaaFirebase = api;
if (window.__hawaaFirebaseResolve) {
    window.__hawaaFirebaseResolve(api);
}
document.dispatchEvent(new CustomEvent('hawaa-firebase-ready'));
