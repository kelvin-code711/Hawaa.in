// ========================================
// FIREBASE (Hawaa Web) — auth + Firestore
// Project: hawaa-air-27548
// Loaded as <script type="module"> on every page.
// Exposes:
//   window.hawaaFirebase — auth + Firestore SDK surface (nav.js,
//     reviews.js, account.js), plus window.hawaaFirebaseReady promise
//   window.hawaaBackend  — form-submission helpers kept for the
//     existing page scripts (support.js, script.js)
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
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
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

// ---- Auth + Firestore surface for nav.js / reviews.js / account.js ----
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
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
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

// ---- Form helpers for the existing page scripts ----

// Firestore queues writes while offline instead of failing, so cap how
// long a form waits before telling the user something went wrong.
const WRITE_TIMEOUT_MS = 10000;

function withTimeout(promise) {
    return Promise.race([
        promise,
        new Promise(function (_, reject) {
            setTimeout(function () {
                reject(new Error('Request timed out'));
            }, WRITE_TIMEOUT_MS);
        })
    ]);
}

window.hawaaBackend = {

    // support.html contact form -> supportTickets/{autoId}
    submitSupportTicket: function (data) {
        return withTimeout(addDoc(collection(db, 'supportTickets'), {
            name: data.name,
            email: data.email,
            message: data.message,
            page: window.location.pathname,
            createdAt: serverTimestamp()
        }));
    },

    // index.html footer form -> newsletterSubscribers/{email}
    // The email is the document ID so resubscribing can't create
    // duplicates; the rules only allow "create", so a resubscribe is
    // rejected as an update and treated as already-subscribed here.
    subscribeNewsletter: function (email) {
        var normalized = email.trim().toLowerCase();
        var id = encodeURIComponent(normalized);
        var write = setDoc(doc(db, 'newsletterSubscribers', id), {
            email: normalized,
            createdAt: serverTimestamp()
        }).catch(function (err) {
            if (err && err.code === 'permission-denied') return;
            throw err;
        });
        return withTimeout(write);
    }
};
