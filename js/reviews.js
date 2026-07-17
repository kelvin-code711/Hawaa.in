(function () {
    'use strict';

    // ========================================
    // REVIEW DATA (loaded from Firestore)
    // ========================================
    var reviewsData = [];
    var votedReviewIds = {};   // reviewId -> true, for the signed-in user
    var fb = null;             // window.hawaaFirebase once ready
    var currentUser = null;

    var MAX_REVIEWS_FETCH = 500;

    // ========================================
    // STATE
    // ========================================
    var PER_PAGE = 6;

    var state = {
        visibleCount: PER_PAGE,
        sortBy: 'recent',
        filterRating: 'all',
        modalOpen: false,
        selectedRating: 0,
        loading: true,
        loadError: false
    };

    // ========================================
    // DOM REFERENCES
    // ========================================
    var dom = {};

    function cacheDom() {
        dom.scoreNumber = document.getElementById('rv-score-number');
        dom.scoreStars = document.getElementById('rv-score-stars');
        dom.scoreCount = document.getElementById('rv-score-count');
        dom.distribution = document.getElementById('rv-distribution');
        dom.sortSelect = document.getElementById('rv-sort-select');
        dom.resultCount = document.getElementById('rv-result-count');
        dom.reviewList = document.getElementById('rv-list');
        dom.moreWrap = document.getElementById('rv-more');
        dom.moreNote = document.getElementById('rv-more-note');
        dom.moreBtn = document.getElementById('rv-more-btn');
        dom.writeBtn = document.getElementById('rv-write-btn');
        dom.modalOverlay = document.getElementById('rv-modal-overlay');
        dom.modal = document.getElementById('rv-modal');
        dom.modalClose = document.getElementById('rv-modal-close');
        dom.modalForm = document.getElementById('rv-modal-form');
        dom.modalSuccess = document.getElementById('rv-modal-success');
        dom.reviewForm = document.getElementById('rv-review-form');
        dom.starSelector = document.getElementById('rv-star-selector');
        dom.starLabel = document.getElementById('rv-star-label');
        dom.cancelBtn = document.getElementById('rv-cancel-btn');
        dom.submitBtn = document.getElementById('rv-submit-btn');
        dom.doneBtn = document.getElementById('rv-done-btn');
        dom.uploadArea = document.getElementById('rv-upload-area');
        dom.uploadInput = document.getElementById('rv-upload-input');
        dom.uploadPreviews = document.getElementById('rv-upload-previews');
        dom.lightboxOverlay = document.getElementById('rv-lightbox-overlay');
        dom.lightboxClose = document.getElementById('rv-lightbox-close');
        dom.lightboxImg = document.getElementById('rv-lightbox-img');
        dom.nameInput = document.getElementById('rv-review-name');
        dom.emailInput = document.getElementById('rv-review-email');
        dom.titleInput = document.getElementById('rv-review-title');
        dom.contentInput = document.getElementById('rv-review-content');
    }

    // Identity comes from the signed-in account, and photo upload needs
    // Firebase Storage (not set up yet) — hide both fields.
    function hideUnusedFormFields() {
        if (dom.emailInput) {
            var emailField = dom.emailInput.closest('.rv-field');
            if (emailField) emailField.style.display = 'none';
        }
        if (dom.uploadArea) {
            var uploadField = dom.uploadArea.closest('.rv-field');
            if (uploadField) uploadField.style.display = 'none';
        }
    }

    // ========================================
    // FIRESTORE LOADING
    // ========================================
    function loadReviews() {
        state.loading = true;
        state.loadError = false;
        renderReviews();

        // Only approved reviews are publicly readable (moderation model).
        // No orderBy here — combining it with the equality filter would
        // need a composite index; sorting happens client-side anyway.
        var q = fb.query(
            fb.collection(fb.db, 'reviews'),
            fb.where('status', '==', 'approved'),
            fb.limit(MAX_REVIEWS_FETCH)
        );

        return fb.getDocs(q).then(function (snap) {
            reviewsData = [];
            snap.forEach(function (docSnap) {
                var d = docSnap.data();
                reviewsData.push({
                    id: docSnap.id,
                    rating: d.rating,
                    title: d.title || '',
                    content: d.content || '',
                    name: d.name || 'Anonymous',
                    date: d.createdAt && d.createdAt.toDate ? d.createdAt.toDate() : new Date(),
                    verified: !!d.verified,
                    helpful: d.helpful || 0
                });
            });
            state.loading = false;
            renderSummary();
            renderReviews();
        }).catch(function (err) {
            console.error('Failed to load reviews:', err);
            state.loading = false;
            state.loadError = true;
            renderReviews();
        });
    }

    // Load which reviews the signed-in user has already marked helpful.
    function loadMyVotes() {
        votedReviewIds = {};
        if (!currentUser) {
            renderReviews();
            return;
        }
        var q = fb.query(
            fb.collection(fb.db, 'review_votes'),
            fb.where('uid', '==', currentUser.uid)
        );
        fb.getDocs(q).then(function (snap) {
            snap.forEach(function (docSnap) {
                votedReviewIds[docSnap.data().reviewId] = true;
            });
            renderReviews();
        }).catch(function (err) {
            console.warn('Could not load helpful votes:', err);
        });
    }

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================
    var STAR_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';
    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    function generateStarsHTML(rating, size) {
        var s = size || 15;
        var html = '';
        for (var i = 1; i <= 5; i++) {
            var cls = i <= rating ? 'rv-star is-filled' : 'rv-star';
            html += '<svg class="' + cls + '" viewBox="0 0 24 24" width="' + s + '" height="' + s + '"><path d="' + STAR_PATH + '"/></svg>';
        }
        return html;
    }

    function getInitial(name) {
        var trimmed = (name || '').trim();
        return trimmed ? trimmed.charAt(0) : '?';
    }

    function formatDate(d) {
        return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }

    function escapeHTML(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // ========================================
    // SUMMARY
    // ========================================
    function renderSummary() {
        var total = reviewsData.length;
        if (total === 0) {
            dom.scoreNumber.textContent = '–';
            dom.scoreStars.innerHTML = generateStarsHTML(0, 18);
            dom.scoreCount.textContent = state.loading ? 'Loading reviews…' : 'No reviews yet';
            dom.distribution.innerHTML = '';
            return;
        }

        var sum = 0;
        var dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

        for (var i = 0; i < total; i++) {
            sum += reviewsData[i].rating;
            dist[reviewsData[i].rating]++;
        }

        var avg = (sum / total).toFixed(1);
        var roundedAvg = Math.round(sum / total);

        dom.scoreNumber.textContent = avg;
        dom.scoreStars.innerHTML = generateStarsHTML(roundedAvg, 18);
        dom.scoreCount.textContent = 'Based on ' + total + ' review' + (total === 1 ? '' : 's');

        // Each row is a filter button: click to see only that rating,
        // click again to clear.
        var distHTML = '';
        for (var star = 5; star >= 1; star--) {
            var count = dist[star];
            var pct = Math.round((count / total) * 100);
            var isActive = state.filterRating === String(star);
            distHTML += '<button type="button" class="rv-dist-row' + (isActive ? ' active' : '') + '"' +
                ' data-filter="' + star + '"' +
                (count === 0 ? ' disabled' : '') +
                ' aria-pressed="' + isActive + '"' +
                ' aria-label="Show ' + star + '-star reviews (' + count + ')">' +
                '<span class="rv-dist-label">' + star + '</span>' +
                '<svg class="rv-star is-filled" viewBox="0 0 24 24" width="12" height="12"><path d="' + STAR_PATH + '"/></svg>' +
                '<span class="rv-dist-bar"><span class="rv-dist-fill" style="width:' + pct + '%"></span></span>' +
                '<span class="rv-dist-count">' + count + '</span>' +
                '</button>';
        }
        dom.distribution.innerHTML = distHTML;
    }

    function syncDistActive() {
        var rows = dom.distribution.querySelectorAll('.rv-dist-row');
        for (var i = 0; i < rows.length; i++) {
            var isActive = rows[i].getAttribute('data-filter') === state.filterRating;
            rows[i].classList.toggle('active', isActive);
            rows[i].setAttribute('aria-pressed', String(isActive));
        }
    }

    // ========================================
    // FILTERING & SORTING
    // ========================================
    function getFilteredSortedReviews() {
        var filtered = reviewsData;

        if (state.filterRating !== 'all') {
            var filterVal = parseInt(state.filterRating);
            filtered = filtered.filter(function (r) {
                return r.rating === filterVal;
            });
        }

        var sorted = filtered.slice();

        switch (state.sortBy) {
            case 'recent':
                sorted.sort(function (a, b) { return b.date - a.date; });
                break;
            case 'highest':
                sorted.sort(function (a, b) { return b.rating - a.rating || b.date - a.date; });
                break;
            case 'lowest':
                sorted.sort(function (a, b) { return a.rating - b.rating || b.date - a.date; });
                break;
            case 'helpful':
                sorted.sort(function (a, b) { return b.helpful - a.helpful || b.date - a.date; });
                break;
        }

        return sorted;
    }

    // ========================================
    // RENDER REVIEWS
    // ========================================
    function renderResultCount(shownTotal) {
        if (state.loading || state.loadError) {
            dom.resultCount.innerHTML = '';
            return;
        }

        if (state.filterRating === 'all') {
            dom.resultCount.innerHTML = shownTotal === 0
                ? ''
                : shownTotal + ' review' + (shownTotal === 1 ? '' : 's');
            return;
        }

        dom.resultCount.innerHTML =
            shownTotal + ' review' + (shownTotal === 1 ? '' : 's') +
            ' · ' + state.filterRating + '-star' +
            '<button type="button" class="rv-clear-filter" id="rv-clear-filter">' +
            'Clear' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
            '</button>';
    }

    function renderLoadMore(shownCount, total) {
        if (state.loading || state.loadError || total <= shownCount) {
            dom.moreWrap.hidden = true;
            return;
        }
        dom.moreWrap.hidden = false;
        dom.moreNote.textContent = 'Showing ' + shownCount + ' of ' + total + ' reviews';
    }

    function renderReviews() {
        if (state.loading) {
            var skeletons = '';
            for (var s = 0; s < 3; s++) {
                skeletons += '<div class="rv-skeleton">' +
                    '<div class="rv-skeleton-line"></div>' +
                    '<div class="rv-skeleton-line"></div>' +
                    '<div class="rv-skeleton-line"></div>' +
                    '</div>';
            }
            dom.reviewList.innerHTML = skeletons;
            renderResultCount(0);
            renderLoadMore(0, 0);
            return;
        }

        if (state.loadError) {
            dom.reviewList.innerHTML =
                '<div class="rv-empty">' +
                '<p class="rv-empty-title">Could not load reviews</p>' +
                '<p class="rv-empty-text">Please check your connection and refresh the page.</p>' +
                '</div>';
            renderResultCount(0);
            renderLoadMore(0, 0);
            return;
        }

        var filtered = getFilteredSortedReviews();
        var total = filtered.length;
        renderResultCount(total);

        if (total === 0) {
            dom.reviewList.innerHTML =
                '<div class="rv-empty">' +
                '<div class="rv-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div>' +
                '<p class="rv-empty-title">No reviews yet</p>' +
                '<p class="rv-empty-text">Be the first to share your experience with Hawaa Edge.</p>' +
                '</div>';
            renderLoadMore(0, 0);
            return;
        }

        var page = filtered.slice(0, state.visibleCount);
        var html = '';

        for (var i = 0; i < page.length; i++) {
            var r = page[i];

            var verifiedHTML = r.verified
                ? '<span aria-hidden="true">&middot;</span>' +
                  '<span class="rv-card-verified"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>Verified purchase</span>'
                : '';

            var helpfulActive = votedReviewIds[r.id] ? ' active' : '';

            html += '<article class="rv-card">' +
                '<div class="rv-card-top">' +
                '<span class="rv-avatar" aria-hidden="true">' + escapeHTML(getInitial(r.name)) + '</span>' +
                '<div class="rv-card-id">' +
                '<span class="rv-card-name">' + escapeHTML(r.name) + '</span>' +
                '<span class="rv-card-meta">' +
                '<span class="rv-card-date">' + formatDate(r.date) + '</span>' +
                verifiedHTML +
                '</span>' +
                '</div>' +
                '<div class="rv-card-stars" aria-label="' + r.rating + ' out of 5 stars">' + generateStarsHTML(r.rating) + '</div>' +
                '</div>' +
                '<h3 class="rv-card-title">' + escapeHTML(r.title) + '</h3>' +
                '<p class="rv-card-body">' + escapeHTML(r.content) + '</p>' +
                '<button class="rv-card-helpful' + helpfulActive + '" data-id="' + escapeHTML(r.id) + '">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>' +
                'Helpful (<span class="rv-helpful-count">' + r.helpful + '</span>)' +
                '</button>' +
                '</article>';
        }

        dom.reviewList.innerHTML = html;
        renderLoadMore(page.length, total);
    }

    // ========================================
    // EVENT HANDLERS
    // ========================================
    function setFilter(value) {
        state.filterRating = value;
        state.visibleCount = PER_PAGE;
        syncDistActive();
        renderReviews();
    }

    function initSortAndFilter() {
        dom.sortSelect.addEventListener('change', function () {
            state.sortBy = this.value;
            state.visibleCount = PER_PAGE;
            renderReviews();
        });

        // Distribution rows in the summary double as rating filters.
        dom.distribution.addEventListener('click', function (e) {
            var row = e.target.closest('.rv-dist-row');
            if (!row || row.disabled) return;

            var value = row.getAttribute('data-filter');
            setFilter(state.filterRating === value ? 'all' : value);
        });

        // "Clear" chip in the toolbar (rendered while a filter is active).
        dom.resultCount.addEventListener('click', function (e) {
            if (e.target.closest('.rv-clear-filter')) setFilter('all');
        });
    }

    function initLoadMore() {
        dom.moreBtn.addEventListener('click', function () {
            state.visibleCount += PER_PAGE;
            renderReviews();
        });
    }

    // ---- Helpful votes (one per user per review, enforced by rules) ----
    function initHelpful() {
        dom.reviewList.addEventListener('click', function (e) {
            var helpfulBtn = e.target.closest('.rv-card-helpful');
            if (!helpfulBtn) return;

            var id = helpfulBtn.getAttribute('data-id');
            if (votedReviewIds[id]) return;

            if (!fb || !currentUser) {
                // Must be signed in to vote — open the sign-in modal.
                var profileBtn = document.getElementById('profile-btn');
                if (profileBtn) profileBtn.click();
                return;
            }

            votedReviewIds[id] = true; // optimistic
            helpfulBtn.disabled = true;

            var batch = fb.writeBatch(fb.db);
            batch.set(fb.doc(fb.db, 'review_votes', currentUser.uid + '_' + id), {
                uid: currentUser.uid,
                reviewId: id,
                createdAt: fb.serverTimestamp()
            });
            batch.update(fb.doc(fb.db, 'reviews', id), {
                helpful: fb.increment(1)
            });

            batch.commit().then(function () {
                for (var i = 0; i < reviewsData.length; i++) {
                    if (reviewsData[i].id === id) {
                        reviewsData[i].helpful++;
                        break;
                    }
                }
                helpfulBtn.disabled = false;
                helpfulBtn.classList.add('active');
                var countEl = helpfulBtn.querySelector('.rv-helpful-count');
                if (countEl) countEl.textContent = parseInt(countEl.textContent) + 1;
            }).catch(function (err) {
                console.warn('Helpful vote failed:', err);
                delete votedReviewIds[id];
                helpfulBtn.disabled = false;
            });
        });
    }

    function initPhotoLightbox() {
        dom.reviewList.addEventListener('click', function (e) {
            var thumb = e.target.closest('.rv-card-thumb');
            if (!thumb) return;

            var photoSrc = thumb.getAttribute('data-photo');
            if (!photoSrc) return;

            dom.lightboxImg.src = photoSrc;
            dom.lightboxOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });

        dom.lightboxClose.addEventListener('click', closeLightbox);
        dom.lightboxOverlay.addEventListener('click', function (e) {
            if (e.target === dom.lightboxOverlay) closeLightbox();
        });
    }

    function closeLightbox() {
        dom.lightboxOverlay.classList.remove('active');
        dom.lightboxImg.src = '';
        if (!state.modalOpen) {
            document.body.style.overflow = '';
        }
    }

    // ========================================
    // MODAL
    // ========================================
    function openModal() {
        // Writing a review requires an account.
        if (!fb || !currentUser) {
            var profileBtn = document.getElementById('profile-btn');
            if (profileBtn) profileBtn.click();
            return;
        }
        // Prefill display name from the account.
        if (dom.nameInput && !dom.nameInput.value && currentUser.displayName) {
            dom.nameInput.value = currentUser.displayName;
        }
        dom.modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        state.modalOpen = true;
    }

    function closeModal() {
        dom.modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        state.modalOpen = false;
        resetForm();
    }

    function initModal() {
        dom.writeBtn.addEventListener('click', openModal);

        dom.modalClose.addEventListener('click', closeModal);
        dom.cancelBtn.addEventListener('click', closeModal);

        dom.modalOverlay.addEventListener('click', function (e) {
            if (e.target === dom.modalOverlay) closeModal();
        });

        dom.doneBtn.addEventListener('click', closeModal);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                if (dom.lightboxOverlay.classList.contains('active')) {
                    closeLightbox();
                } else if (state.modalOpen) {
                    closeModal();
                }
            }
        });
    }

    // ========================================
    // STAR SELECTOR
    // ========================================
    var starLabels = ['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'];

    function updateStarDisplay(rating) {
        var btns = dom.starSelector.querySelectorAll('.rv-star-btn');
        for (var i = 0; i < btns.length; i++) {
            var val = parseInt(btns[i].getAttribute('data-value'));
            btns[i].classList.toggle('is-filled', val <= rating);
        }
    }

    function initStarSelector() {
        var btns = dom.starSelector.querySelectorAll('.rv-star-btn');

        for (var i = 0; i < btns.length; i++) {
            (function (btn) {
                btn.addEventListener('click', function () {
                    state.selectedRating = parseInt(btn.getAttribute('data-value'));
                    updateStarDisplay(state.selectedRating);
                    dom.starLabel.textContent = starLabels[state.selectedRating];
                    dom.starLabel.classList.remove('error');
                });

                btn.addEventListener('mouseenter', function () {
                    var hoverVal = parseInt(btn.getAttribute('data-value'));
                    updateStarDisplay(hoverVal);
                    dom.starLabel.textContent = starLabels[hoverVal];
                });

                btn.addEventListener('mouseleave', function () {
                    updateStarDisplay(state.selectedRating);
                    dom.starLabel.textContent = state.selectedRating > 0 ? starLabels[state.selectedRating] : '';
                });
            })(btns[i]);
        }
    }

    // ========================================
    // FORM VALIDATION & SUBMISSION
    // ========================================
    function clearFormErrors() {
        var inputs = dom.reviewForm.querySelectorAll('.rv-input');
        for (var i = 0; i < inputs.length; i++) {
            inputs[i].classList.remove('error');
        }
        dom.starLabel.classList.remove('error');
    }

    function initFormValidation() {
        // Clear error on focus
        var inputs = dom.reviewForm.querySelectorAll('.rv-input');
        for (var i = 0; i < inputs.length; i++) {
            inputs[i].addEventListener('focus', function () {
                this.classList.remove('error');
            });
        }

        dom.reviewForm.addEventListener('submit', function (e) {
            e.preventDefault();
            clearFormErrors();

            var rating = state.selectedRating;
            var title = dom.titleInput.value.trim();
            var content = dom.contentInput.value.trim();
            var name = dom.nameInput.value.trim();
            var hasError = false;

            if (rating === 0) {
                dom.starLabel.textContent = 'Please select a rating';
                dom.starLabel.classList.add('error');
                hasError = true;
            }
            if (!title || title.length > 100) {
                dom.titleInput.classList.add('error');
                hasError = true;
            }
            if (!content || content.length > 2000) {
                dom.contentInput.classList.add('error');
                hasError = true;
            }
            if (!name || name.length > 50) {
                dom.nameInput.classList.add('error');
                hasError = true;
            }

            if (hasError) return;

            if (!fb || !currentUser) {
                var profileBtn = document.getElementById('profile-btn');
                if (profileBtn) profileBtn.click();
                return;
            }

            dom.submitBtn.disabled = true;
            dom.submitBtn.textContent = 'Submitting…';

            fb.addDoc(fb.collection(fb.db, 'reviews'), {
                uid: currentUser.uid,
                name: name,
                rating: rating,
                title: title,
                content: content,
                status: 'pending',
                verified: false,
                helpful: 0,
                createdAt: fb.serverTimestamp()
            }).then(function () {
                // Held for moderation — it won't appear in the public
                // list yet; the success panel explains that.
                dom.modalForm.style.display = 'none';
                dom.modalSuccess.classList.remove('hidden');
                dom.submitBtn.disabled = false;
                dom.submitBtn.textContent = 'Submit review';
            }).catch(function (err) {
                console.error('Review submit failed:', err);
                dom.submitBtn.disabled = false;
                dom.submitBtn.textContent = 'Submit review';
                dom.starLabel.textContent = 'Could not submit your review. Please try again.';
                dom.starLabel.classList.add('error');
            });
        });
    }

    function resetForm() {
        state.selectedRating = 0;
        updateStarDisplay(0);
        dom.starLabel.textContent = '';
        dom.starLabel.classList.remove('error');

        dom.titleInput.value = '';
        dom.contentInput.value = '';
        dom.nameInput.value = '';

        clearFormErrors();

        dom.modalForm.style.display = '';
        dom.modalSuccess.classList.add('hidden');
    }

    // ========================================
    // INIT
    // ========================================
    document.addEventListener('DOMContentLoaded', function () {
        cacheDom();
        hideUnusedFormFields();
        renderSummary();
        renderReviews();
        initSortAndFilter();
        initLoadMore();
        initHelpful();
        initPhotoLightbox();
        initModal();
        initStarSelector();
        initFormValidation();

        window.hawaaFirebaseReady.then(function (api) {
            fb = api;
            loadReviews();
            fb.onAuthStateChanged(fb.auth, function (user) {
                currentUser = user;
                loadMyVotes();
            });
        });
    });

})();
