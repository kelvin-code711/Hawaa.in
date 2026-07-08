// ========================================
// FIREBASE BACKEND (Firestore)
// Loaded as an ES module on pages that submit data.
// Exposes window.hawaaBackend for the classic page scripts.
// ========================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {
    getFirestore,
    collection,
    addDoc,
    doc,
    setDoc,
    serverTimestamp,
    query,
    where,
    limit,
    getDocs
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: 'AIzaSyAhvY_P0mKNZZfcfJxmB7lEgVwgrTcZGrk',
    authDomain: 'hawaa-in.firebaseapp.com',
    projectId: 'hawaa-in',
    storageBucket: 'hawaa-in.firebasestorage.app',
    messagingSenderId: '928781353715',
    appId: '1:928781353715:web:4e93f009bd3d6120126d86',
    measurementId: 'G-XYT8T267RC'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

    // reviews.html modal form -> reviews/{autoId}, held for moderation
    submitReview: function (data) {
        return withTimeout(addDoc(collection(db, 'reviews'), {
            rating: data.rating,
            title: data.title,
            content: data.content,
            name: data.name,
            email: data.email,
            status: 'pending',
            helpfulCount: 0,
            createdAt: serverTimestamp()
        }));
    },

    // reviews.html list -> approved reviews, mapped to the shape the
    // page's renderer expects. Sorted client-side so no composite
    // index is needed.
    fetchApprovedReviews: function () {
        var q = query(
            collection(db, 'reviews'),
            where('status', '==', 'approved'),
            limit(200)
        );
        return withTimeout(getDocs(q)).then(function (snapshot) {
            var reviews = [];
            snapshot.forEach(function (docSnap) {
                var data = docSnap.data();
                var created = data.createdAt && data.createdAt.toDate
                    ? data.createdAt.toDate()
                    : new Date();
                reviews.push({
                    id: docSnap.id,
                    rating: data.rating,
                    title: data.title,
                    content: data.content,
                    name: data.name,
                    date: created.toISOString().slice(0, 10),
                    verified: data.verified === true,
                    helpful: data.helpfulCount || 0,
                    photos: []
                });
            });
            return reviews;
        });
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
