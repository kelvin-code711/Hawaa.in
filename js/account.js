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
    var avatarBtn = document.getElementById('account-avatar-btn');
    var avatarInput = document.getElementById('account-avatar-input');
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
    var ordersEl = document.getElementById('account-orders');
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

    function avatarCacheKey(user) {
        return 'hawaa_avatar_' + user.uid;
    }

    // Show either the profile photo (if any) or the initial letter fallback.
    function setAvatar(user, photoURL) {
        if (photoURL) {
            avatar.style.backgroundImage = 'url("' + photoURL + '")';
            avatar.classList.add('has-photo');
            avatar.textContent = '';
        } else {
            avatar.style.backgroundImage = '';
            avatar.classList.remove('has-photo');
            avatar.textContent = displayLabel(user).charAt(0).toUpperCase();
        }
    }

    function renderSignedIn(user) {
        signedOutSection.classList.add('hidden');
        contentSection.classList.remove('hidden');

        nameEl.textContent = user.displayName || 'Add your name';

        emailEl.textContent = user.email || '';
        emailEl.style.display = user.email ? '' : 'none';
        phoneEl.textContent = user.phoneNumber || '';
        phoneEl.style.display = user.phoneNumber ? '' : 'none';

        // Instant paint: cached photo (this device) or the initial letter,
        // then reconcile with the profile doc below.
        var cached = null;
        try { cached = localStorage.getItem(avatarCacheKey(user)); } catch (e) { /* ignore */ }
        setAvatar(user, cached || user.photoURL || '');

        // Member since + authoritative photo — from the web_users profile doc.
        fb.getDoc(fb.doc(fb.db, 'web_users', user.uid)).then(function (snap) {
            if (!snap.exists()) return;
            var data = snap.data();
            if (data.createdAt && data.createdAt.toDate) {
                var d = data.createdAt.toDate();
                sinceEl.textContent = 'Member since ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
            }
            if (data.photoURL) {
                setAvatar(user, data.photoURL);
                try { localStorage.setItem(avatarCacheKey(user), data.photoURL); } catch (e) { /* ignore */ }
            }
        }).catch(function () { /* non-blocking */ });

        loadMyReviews(user);
        loadMyOrders(user);
    }

    function orderItemsLabel(d) {
        var parts = [];
        var purifiers = (d.qtyPurifierOnetime || 0) + (d.qtyPurifierSubscribe || 0);
        if (purifiers > 0) parts.push(purifiers + '× Hawaa Edge');
        if (d.qtyFilter > 0) parts.push(d.qtyFilter + '× Filter');
        return parts.join(' + ') || 'Order';
    }

    function loadMyOrders(user) {
        if (!ordersEl) return;
        var q = fb.query(fb.collection(fb.db, 'orders'), fb.where('uid', '==', user.uid));
        fb.getDocs(q).then(function (snap) {
            var items = [];
            snap.forEach(function (docSnap) {
                var d = docSnap.data();
                items.push({
                    label: orderItemsLabel(d),
                    total: d.total || 0,
                    status: d.status || 'placed',
                    date: d.createdAt && d.createdAt.toDate ? d.createdAt.toDate() : new Date()
                });
            });
            items.sort(function (a, b) { return b.date - a.date; });

            if (items.length === 0) {
                ordersEl.innerHTML = '<p class="account-empty">No orders yet. <a href="buy.html">Shop the Hawaa Edge</a>.</p>';
                return;
            }

            var html = '';
            for (var i = 0; i < items.length; i++) {
                var o = items[i];
                html += '<div class="account-order-row">' +
                    '<span class="account-order-items">' + escapeHTML(o.label) + '</span>' +
                    '<span class="account-order-total">₹' + o.total.toLocaleString('en-IN') + '</span>' +
                    '<span class="account-order-status ' + escapeHTML(o.status) + '">' + escapeHTML(o.status) + '</span>' +
                    '<span class="account-order-date">' + o.date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) + '</span>' +
                    '</div>';
            }
            ordersEl.innerHTML = html;
        }).catch(function (err) {
            console.warn('Could not load orders:', err);
            ordersEl.innerHTML = '<p class="account-empty">Could not load your orders.</p>';
        });
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
                    status: d.status || 'approved',
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
                var statusChip = r.status === 'pending'
                    ? '<span class="account-review-pending">Pending</span>'
                    : '';
                html += '<a class="account-review-row" href="reviews.html">' +
                    '<span class="account-review-stars">' + starsHTML(r.rating) + '</span>' +
                    '<span class="account-review-title">' + escapeHTML(r.title) + '</span>' +
                    statusChip +
                    '<span class="account-review-date">' + r.date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) + '</span>' +
                    '</a>';
            }
            reviewsEl.innerHTML = html;
        }).catch(function (err) {
            console.warn('Could not load reviews:', err);
            reviewsEl.innerHTML = '<p class="account-empty">Could not load your reviews.</p>';
        });
    }

    // Create or update the web_users profile doc in the exact shape the
    // security rules require: a fresh doc needs uid + createdAt + lastLoginAt,
    // while an existing doc may only change lastLoginAt/displayName/photoURL.
    // (Writing a partial doc as a "create" was the cause of the save error.)
    function syncProfileDoc(user, fields) {
        var ref = fb.doc(fb.db, 'web_users', user.uid);
        return fb.getDoc(ref).then(function (snap) {
            if (snap.exists()) {
                var update = { lastLoginAt: fb.serverTimestamp() };
                if ('displayName' in fields) update.displayName = fields.displayName;
                if ('photoURL' in fields) update.photoURL = fields.photoURL;
                return fb.setDoc(ref, update, { merge: true });
            }
            var data = {
                uid: user.uid,
                createdAt: fb.serverTimestamp(),
                lastLoginAt: fb.serverTimestamp()
            };
            if (user.email) data.email = user.email;
            if (user.phoneNumber) data.phone = user.phoneNumber;
            if ('displayName' in fields) data.displayName = fields.displayName;
            else if (user.displayName) data.displayName = user.displayName;
            if ('photoURL' in fields) data.photoURL = fields.photoURL;
            return fb.setDoc(ref, data);
        });
    }

    // ---- Profile photo ----
    var AVATAR_MAX = 256; // px — square, keeps the stored data URI small

    function compressImage(file) {
        return new Promise(function (resolve, reject) {
            if (!file.type || file.type.indexOf('image/') !== 0) {
                reject(new Error('not-image'));
                return;
            }
            var reader = new FileReader();
            reader.onload = function () {
                var img = new Image();
                img.onload = function () {
                    // Centre-crop to a square, then downscale.
                    var side = Math.min(img.width, img.height);
                    var sx = (img.width - side) / 2;
                    var sy = (img.height - side) / 2;
                    var canvas = document.createElement('canvas');
                    canvas.width = AVATAR_MAX;
                    canvas.height = AVATAR_MAX;
                    var ctx = canvas.getContext('2d');
                    ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_MAX, AVATAR_MAX);
                    resolve(canvas.toDataURL('image/jpeg', 0.85));
                };
                img.onerror = function () { reject(new Error('decode')); };
                img.src = reader.result;
            };
            reader.onerror = function () { reject(new Error('read')); };
            reader.readAsDataURL(file);
        });
    }

    if (avatarBtn && avatarInput) {
        avatarBtn.addEventListener('click', function () {
            if (avatarBtn.disabled) return;
            avatarInput.click();
        });

        avatarInput.addEventListener('change', function () {
            var file = avatarInput.files && avatarInput.files[0];
            if (!file || !currentUser) return;
            if (file.size > 8 * 1024 * 1024) {
                errorEl.textContent = 'Please choose an image under 8 MB.';
                avatarInput.value = '';
                return;
            }
            errorEl.textContent = '';
            avatarBtn.disabled = true;
            avatarBtn.classList.add('loading');

            compressImage(file).then(function (dataUrl) {
                // Paint + cache immediately so it works on this device even
                // before the Firestore write (or rules deploy) lands.
                setAvatar(currentUser, dataUrl);
                try { localStorage.setItem(avatarCacheKey(currentUser), dataUrl); } catch (e) { /* ignore */ }
                return syncProfileDoc(currentUser, { photoURL: dataUrl });
            }).then(function () {
                avatarBtn.disabled = false;
                avatarBtn.classList.remove('loading');
                avatarInput.value = '';
            }).catch(function (err) {
                console.warn('Avatar update failed:', err);
                avatarBtn.disabled = false;
                avatarBtn.classList.remove('loading');
                avatarInput.value = '';
                if (err && (err.message === 'not-image' || err.message === 'decode')) {
                    errorEl.textContent = 'That image could not be used. Please try another.';
                }
            });
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

        // Firebase Auth is the source of truth for the displayed name. Once
        // it succeeds the name is saved, so reflect it immediately and treat
        // the Firestore mirror as best-effort — this removes the spurious
        // error that used to appear while the name saved fine underneath.
        fb.updateProfile(currentUser, { displayName: name }).then(function () {
            nameSave.disabled = false;
            nameSave.textContent = 'Save';
            closeNameEdit();
            renderSignedIn(currentUser);
            return syncProfileDoc(currentUser, { displayName: name }).catch(function (err) {
                console.warn('Profile name sync failed:', err);
            });
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
