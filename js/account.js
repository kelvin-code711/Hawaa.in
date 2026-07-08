// ========================================
// ACCOUNT PAGE (temporary simple profile)
// ========================================

(function () {
    'use strict';

    var fb = null;
    var currentUser = null;

    var signedOutSection = document.getElementById('account-signedout');
    var contentSection = document.getElementById('account-content');
    var signinBtn = document.getElementById('account-signin-btn');
    var avatar = document.getElementById('account-avatar');
    var nameEl = document.getElementById('account-name');
    var nameRow = document.getElementById('account-name-row');
    var nameEdit = document.getElementById('account-name-edit');
    var nameInput = document.getElementById('account-name-input');
    var nameSave = document.getElementById('account-name-save');
    var nameCancel = document.getElementById('account-name-cancel');
    var editBtn = document.getElementById('account-edit-btn');
    var emailEl = document.getElementById('account-email');
    var phoneEl = document.getElementById('account-phone');
    var sinceEl = document.getElementById('account-since');
    var errorEl = document.getElementById('account-error');
    var reviewsEl = document.getElementById('account-reviews');
    var signoutBtn = document.getElementById('account-signout-btn');

    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    var STAR_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

    function escapeHTML(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function starsHTML(rating) {
        var html = '';
        for (var i = 1; i <= 5; i++) {
            html += '<svg viewBox="0 0 24 24" fill="' + (i <= rating ? '#FACC15' : '#E5E7EB') + '" width="14" height="14"><path d="' + STAR_PATH + '"/></svg>';
        }
        return html;
    }

    function displayLabel(user) {
        return user.displayName || user.email || user.phoneNumber || 'Hawaa user';
    }

    function renderSignedIn(user) {
        signedOutSection.classList.add('hidden');
        contentSection.classList.remove('hidden');

        var label = displayLabel(user);
        avatar.textContent = label.charAt(0).toUpperCase();
        nameEl.textContent = user.displayName || 'Add your name';

        emailEl.textContent = user.email || '';
        emailEl.style.display = user.email ? '' : 'none';
        phoneEl.textContent = user.phoneNumber || '';
        phoneEl.style.display = user.phoneNumber ? '' : 'none';

        // Member since — from the web_users profile doc.
        fb.getDoc(fb.doc(fb.db, 'web_users', user.uid)).then(function (snap) {
            if (snap.exists() && snap.data().createdAt && snap.data().createdAt.toDate) {
                var d = snap.data().createdAt.toDate();
                sinceEl.textContent = 'Member since ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
            }
        }).catch(function () { /* non-blocking */ });

        loadMyReviews(user);
    }

    function renderSignedOut() {
        contentSection.classList.add('hidden');
        signedOutSection.classList.remove('hidden');
    }

    function loadMyReviews(user) {
        var q = fb.query(fb.collection(fb.db, 'reviews'), fb.where('uid', '==', user.uid));
        fb.getDocs(q).then(function (snap) {
            var items = [];
            snap.forEach(function (docSnap) {
                var d = docSnap.data();
                items.push({
                    rating: d.rating,
                    title: d.title,
                    date: d.createdAt && d.createdAt.toDate ? d.createdAt.toDate() : new Date()
                });
            });
            items.sort(function (a, b) { return b.date - a.date; });

            if (items.length === 0) {
                reviewsEl.innerHTML = '<p class="account-empty">You haven’t written any reviews yet. <a href="reviews.html">Share your experience</a>.</p>';
                return;
            }

            var html = '';
            for (var i = 0; i < items.length; i++) {
                var r = items[i];
                html += '<a class="account-review-row" href="reviews.html">' +
                    '<span class="account-review-stars">' + starsHTML(r.rating) + '</span>' +
                    '<span class="account-review-title">' + escapeHTML(r.title) + '</span>' +
                    '<span class="account-review-date">' + r.date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) + '</span>' +
                    '</a>';
            }
            reviewsEl.innerHTML = html;
        }).catch(function (err) {
            console.warn('Could not load reviews:', err);
            reviewsEl.innerHTML = '<p class="account-empty">Could not load your reviews.</p>';
        });
    }

    // ---- Name editing ----
    function openNameEdit() {
        nameRow.classList.add('hidden');
        nameEdit.classList.remove('hidden');
        nameInput.value = currentUser.displayName || '';
        nameInput.focus();
    }

    function closeNameEdit() {
        nameEdit.classList.add('hidden');
        nameRow.classList.remove('hidden');
        if (errorEl) errorEl.textContent = '';
    }

    function saveName() {
        var name = nameInput.value.trim();
        if (!name || name.length > 100) {
            errorEl.textContent = 'Please enter a name up to 100 characters.';
            return;
        }
        nameSave.disabled = true;
        nameSave.textContent = 'Saving…';

        fb.updateProfile(currentUser, { displayName: name }).then(function () {
            // Rules require lastLoginAt to accompany profile updates.
            return fb.setDoc(fb.doc(fb.db, 'web_users', currentUser.uid), {
                displayName: name,
                lastLoginAt: fb.serverTimestamp()
            }, { merge: true });
        }).then(function () {
            nameSave.disabled = false;
            nameSave.textContent = 'Save';
            closeNameEdit();
            renderSignedIn(currentUser);
        }).catch(function (err) {
            console.warn('Name update failed:', err);
            nameSave.disabled = false;
            nameSave.textContent = 'Save';
            errorEl.textContent = 'Could not save your name. Please try again.';
        });
    }

    if (editBtn) editBtn.addEventListener('click', openNameEdit);
    if (nameCancel) nameCancel.addEventListener('click', closeNameEdit);
    if (nameSave) nameSave.addEventListener('click', saveName);
    if (nameInput) {
        nameInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); saveName(); }
        });
    }

    if (signinBtn) {
        signinBtn.addEventListener('click', function () {
            var profileBtn = document.getElementById('profile-btn');
            if (profileBtn) profileBtn.click(); // opens the sign-in modal when signed out
        });
    }

    if (signoutBtn) {
        signoutBtn.addEventListener('click', function () {
            if (!fb) return;
            fb.signOut(fb.auth).catch(function (err) {
                console.warn('Sign out failed:', err);
            });
        });
    }

    window.hawaaFirebaseReady.then(function (api) {
        fb = api;
        fb.onAuthStateChanged(fb.auth, function (user) {
            currentUser = user;
            if (user) {
                renderSignedIn(user);
            } else {
                renderSignedOut();
            }
        });
    });

})();
