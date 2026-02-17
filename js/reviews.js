(function () {
    'use strict';

    // ========================================
    // REVIEW DATA
    // ========================================
    var reviewsData = [
        {
            id: 1,
            rating: 5,
            title: 'Amazing air quality improvement',
            content: 'As someone with asthma, clean air isn\'t a luxury \u2014 it\'s essential. This purifier runs so quietly I forget it\'s on, but my breathing has improved dramatically. The gesture control is a nice touch too.',
            name: 'Meera L.',
            date: '2026-01-15',
            verified: true,
            helpful: 12,
            photos: []
        },
        {
            id: 2,
            rating: 5,
            title: 'Sleek design that fits anywhere',
            content: 'Finally, an air purifier that doesn\'t need a PhD to operate. The gesture control is intuitive, and the Google Home integration is seamless. Looks great in our living room too.',
            name: 'Arjun K.',
            date: '2026-01-10',
            verified: true,
            helpful: 9,
            photos: []
        },
        {
            id: 3,
            rating: 5,
            title: 'Worth every rupee',
            content: 'The filter replacement at \u20B9899 is genuinely affordable compared to other brands charging \u20B92000+. Running costs matter and Hawaa gets that. Great product overall.',
            name: 'Sunita R.',
            date: '2026-01-05',
            verified: true,
            helpful: 7,
            photos: []
        },
        {
            id: 4,
            rating: 4,
            title: 'Perfect for the nursery',
            content: 'Bought for my newborn\'s room. The sleep mode is whisper quiet at 24dB. Peace of mind knowing the air is clean without disturbing her sleep. Wish the night light was a bit dimmer though.',
            name: 'Neha P.',
            date: '2025-12-28',
            verified: true,
            helpful: 6,
            photos: []
        },
        {
            id: 5,
            rating: 5,
            title: 'Best air purifier under 6000',
            content: 'I compared Hawaa Edge with Xiaomi and Coway before buying. The H13 HEPA filter, gesture control, and smart connectivity at this price point is unbeatable. Very happy with my purchase.',
            name: 'Rahul M.',
            date: '2025-12-22',
            verified: true,
            helpful: 15,
            photos: []
        },
        {
            id: 6,
            rating: 5,
            title: 'Noticeable difference in a week',
            content: 'Living near a construction site, dust was a constant problem. Within a week of using Hawaa Edge, the air felt noticeably cleaner. My allergies have reduced significantly.',
            name: 'Priya S.',
            date: '2025-12-18',
            verified: true,
            helpful: 4,
            photos: []
        },
        {
            id: 7,
            rating: 5,
            title: 'Smart home integration is flawless',
            content: 'Connected it to Google Home on day one. Voice commands work perfectly. I can check air quality and control the purifier from anywhere. The app is well designed too.',
            name: 'Vikram T.',
            date: '2025-12-15',
            verified: true,
            helpful: 3,
            photos: []
        },
        {
            id: 8,
            rating: 5,
            title: 'Impressed by the build quality',
            content: 'For the price, the build quality is exceptional. The matte finish looks premium, and the touch-free gesture sensor works reliably. Feels like a product worth twice the price.',
            name: 'Anjali D.',
            date: '2025-12-10',
            verified: true,
            helpful: 5,
            photos: []
        },
        {
            id: 9,
            rating: 4,
            title: 'Great product, minor app issues',
            content: 'The purifier itself is excellent \u2014 quiet, effective, and looks good. The app occasionally loses connection but a quick restart fixes it. Overall very satisfied.',
            name: 'Karthik N.',
            date: '2025-12-05',
            verified: true,
            helpful: 2,
            photos: []
        },
        {
            id: 10,
            rating: 5,
            title: 'My doctor recommended an air purifier',
            content: 'After repeated sinus infections, my ENT suggested an air purifier. Chose Hawaa Edge for the H13 HEPA filter. Three months in and I haven\'t had a single episode. Life-changing.',
            name: 'Deepa V.',
            date: '2025-11-28',
            verified: true,
            helpful: 11,
            photos: []
        },
        {
            id: 11,
            rating: 5,
            title: 'Handles Delhi pollution like a champ',
            content: 'Diwali season put this to the test. The AQI outside was 400+ but inside our bedroom it stayed under 50. The real-time air quality display gives great peace of mind.',
            name: 'Amit G.',
            date: '2025-11-20',
            verified: true,
            helpful: 18,
            photos: []
        },
        {
            id: 12,
            rating: 3,
            title: 'Good but room coverage could be better',
            content: 'Works well for our bedroom (around 150 sq ft) but struggles a bit in the larger living room. The fan speed could be higher on turbo mode. Otherwise a solid product for small rooms.',
            name: 'Sanjay B.',
            date: '2025-11-15',
            verified: true,
            helpful: 4,
            photos: []
        },
        {
            id: 13,
            rating: 5,
            title: 'Gifted to my parents, they love it',
            content: 'My parents are in their 70s and not tech savvy at all. The gesture control makes it so easy for them \u2014 just wave to change settings. They use it every day now.',
            name: 'Riya K.',
            date: '2025-11-10',
            verified: true,
            helpful: 8,
            photos: []
        },
        {
            id: 14,
            rating: 5,
            title: 'Filter change was super easy',
            content: 'Just replaced the filter after 5 months. The process took literally 2 minutes. No tools needed. And at \u20B9899 for a genuine H13 HEPA filter, the running cost is very reasonable.',
            name: 'Manish J.',
            date: '2025-11-05',
            verified: true,
            helpful: 6,
            photos: []
        },
        {
            id: 15,
            rating: 4,
            title: 'Stylish and functional',
            content: 'The almond beige colour matches our home decor perfectly. It doesn\'t look like a typical air purifier at all. Performance is great for our 200 sq ft bedroom. Deducting one star because I wish there were more colour options.',
            name: 'Tanya W.',
            date: '2025-10-30',
            verified: true,
            helpful: 3,
            photos: []
        },
        {
            id: 16,
            rating: 5,
            title: 'Reduced my kid\'s allergies',
            content: 'My 5-year-old had constant sneezing and runny nose. Since we started using Hawaa Edge in his room, the allergy symptoms have reduced by about 80%. Worth every penny.',
            name: 'Pooja H.',
            date: '2025-10-25',
            verified: true,
            helpful: 10,
            photos: []
        },
        {
            id: 17,
            rating: 5,
            title: 'Customer support was excellent',
            content: 'Had a minor issue with the Wi-Fi setup. Called support and they walked me through it in 5 minutes. Very responsive team. The product itself has been running perfectly since.',
            name: 'Gaurav S.',
            date: '2025-10-20',
            verified: true,
            helpful: 2,
            photos: []
        },
        {
            id: 18,
            rating: 3,
            title: 'Decent for the price',
            content: 'It does what it promises but nothing extraordinary. The air quality sensor seems accurate and the noise level is acceptable. If you\'re on a budget, it\'s a good choice.',
            name: 'Nikhil C.',
            date: '2025-10-15',
            verified: false,
            helpful: 1,
            photos: []
        },
        {
            id: 19,
            rating: 5,
            title: 'Cooking odours disappear fast',
            content: 'We keep it in the kitchen-adjacent dining area. After cooking, I turn it to turbo mode and within 15-20 minutes the smell is completely gone. Really impressed with the activated carbon layer.',
            name: 'Lakshmi R.',
            date: '2025-10-10',
            verified: true,
            helpful: 5,
            photos: []
        },
        {
            id: 20,
            rating: 5,
            title: 'Silent operation is the biggest win',
            content: 'I\'m a light sleeper and previous purifiers kept me up at night. Hawaa Edge on sleep mode is genuinely inaudible. Finally an air purifier I can sleep next to.',
            name: 'Aditya F.',
            date: '2025-10-05',
            verified: true,
            helpful: 7,
            photos: []
        },
        {
            id: 21,
            rating: 2,
            title: 'Wi-Fi connectivity needs improvement',
            content: 'The purifier works fine on manual but the Wi-Fi keeps disconnecting from our 5GHz network. Had to switch to 2.4GHz which is inconvenient. The hardware is good but software needs work.',
            name: 'Rohan P.',
            date: '2025-09-28',
            verified: true,
            helpful: 3,
            photos: []
        },
        {
            id: 22,
            rating: 5,
            title: 'Made in India and proud of it',
            content: 'Love supporting Indian brands, especially when the product quality matches international standards. The H13 HEPA filter, BLDC motor, and overall design are world class. Keep it up Hawaa!',
            name: 'Shreya M.',
            date: '2025-09-20',
            verified: true,
            helpful: 14,
            photos: []
        },
        {
            id: 23,
            rating: 5,
            title: 'Pet owners, this is a must-have',
            content: 'We have two golden retrievers and the fur situation was out of control. Hawaa Edge handles pet dander and fur particles effectively. Our home smells fresher and we sneeze less.',
            name: 'Nitin A.',
            date: '2025-09-15',
            verified: true,
            helpful: 9,
            photos: []
        },
        {
            id: 24,
            rating: 5,
            title: 'Elegant packaging and unboxing',
            content: 'The unboxing experience itself sets the tone. Premium packaging, clear setup instructions, and the product looks even better in person. Hawaa clearly cares about the details.',
            name: 'Kavya L.',
            date: '2025-09-10',
            verified: true,
            helpful: 4,
            photos: []
        }
    ];

    // ========================================
    // STATE
    // ========================================
    var state = {
        currentPage: 1,
        perPage: 10,
        sortBy: 'recent',
        filterRating: 'all',
        helpfulClicked: {},
        modalOpen: false,
        selectedRating: 0
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
        dom.filterStars = document.getElementById('rv-filter-stars');
        dom.reviewList = document.getElementById('rv-list');
        dom.pagination = document.getElementById('rv-pagination');
        dom.pageNumbers = document.getElementById('rv-page-numbers');
        dom.prevBtn = document.getElementById('rv-prev');
        dom.nextBtn = document.getElementById('rv-next');
        dom.writeBtn = document.getElementById('rv-write-btn');
        dom.fab = document.getElementById('rv-fab');
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
    }

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================
    var STAR_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';
    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    function generateStarsHTML(rating, size) {
        var s = size || 16;
        var html = '';
        for (var i = 1; i <= 5; i++) {
            var fill = i <= rating ? '#FACC15' : '#E5E7EB';
            html += '<svg viewBox="0 0 24 24" fill="' + fill + '" width="' + s + '" height="' + s + '"><path d="' + STAR_PATH + '"/></svg>';
        }
        return html;
    }

    function formatDate(dateString) {
        var d = new Date(dateString + 'T00:00:00');
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
        dom.scoreCount.textContent = 'Based on ' + total + ' reviews';

        var distHTML = '';
        for (var star = 5; star >= 1; star--) {
            var count = dist[star];
            var pct = total > 0 ? Math.round((count / total) * 100) : 0;
            distHTML += '<div class="rv-dist-row">' +
                '<span class="rv-dist-label">' + star + '</span>' +
                '<svg class="rv-dist-star" viewBox="0 0 24 24" fill="#FACC15"><path d="' + STAR_PATH + '"/></svg>' +
                '<div class="rv-dist-bar"><div class="rv-dist-fill" style="width:' + pct + '%"></div></div>' +
                '<span class="rv-dist-count">' + count + '</span>' +
                '</div>';
        }
        dom.distribution.innerHTML = distHTML;
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
                sorted.sort(function (a, b) { return b.date.localeCompare(a.date); });
                break;
            case 'highest':
                sorted.sort(function (a, b) { return b.rating - a.rating || b.date.localeCompare(a.date); });
                break;
            case 'lowest':
                sorted.sort(function (a, b) { return a.rating - b.rating || b.date.localeCompare(a.date); });
                break;
            case 'helpful':
                sorted.sort(function (a, b) { return b.helpful - a.helpful || b.date.localeCompare(a.date); });
                break;
        }

        return sorted;
    }

    function getPageSlice(reviews) {
        var start = (state.currentPage - 1) * state.perPage;
        return reviews.slice(start, start + state.perPage);
    }

    // ========================================
    // RENDER REVIEWS
    // ========================================
    function renderReviews() {
        var filtered = getFilteredSortedReviews();
        var total = filtered.length;

        if (total === 0) {
            dom.reviewList.innerHTML =
                '<div class="rv-empty">' +
                '<div class="rv-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div>' +
                '<p class="rv-empty-title">No reviews found</p>' +
                '<p class="rv-empty-text">Try adjusting your filters to see more reviews.</p>' +
                '</div>';
            dom.pagination.style.display = 'none';
            return;
        }

        dom.pagination.style.display = 'flex';
        var page = getPageSlice(filtered);
        var html = '';

        for (var i = 0; i < page.length; i++) {
            var r = page[i];
            var photosHTML = '';
            if (r.photos && r.photos.length > 0) {
                photosHTML = '<div class="rv-card-photos">';
                for (var p = 0; p < r.photos.length; p++) {
                    photosHTML += '<button class="rv-card-thumb" data-photo="' + escapeHTML(r.photos[p]) + '" aria-label="View photo"><img src="' + escapeHTML(r.photos[p]) + '" alt="Review photo" loading="lazy"></button>';
                }
                photosHTML += '</div>';
            }

            var verifiedHTML = r.verified
                ? '<span class="rv-card-verified"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>Verified Purchase</span>'
                : '';

            var helpfulActive = state.helpfulClicked[r.id] ? ' active' : '';

            html += '<article class="rv-card">' +
                '<div class="rv-card-header">' +
                '<div class="rv-card-stars">' + generateStarsHTML(r.rating) + '</div>' +
                '<span class="rv-card-date">' + formatDate(r.date) + '</span>' +
                '</div>' +
                '<h3 class="rv-card-title">' + escapeHTML(r.title) + '</h3>' +
                '<p class="rv-card-body">' + escapeHTML(r.content) + '</p>' +
                photosHTML +
                '<div class="rv-card-footer">' +
                '<div class="rv-card-author">' +
                '<span class="rv-card-name">' + escapeHTML(r.name) + '</span>' +
                verifiedHTML +
                '</div>' +
                '<button class="rv-card-helpful' + helpfulActive + '" data-id="' + r.id + '">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>' +
                'Helpful (<span class="rv-helpful-count">' + r.helpful + '</span>)' +
                '</button>' +
                '</div>' +
                '</article>';
        }

        dom.reviewList.innerHTML = html;
        renderPagination(total);
    }

    // ========================================
    // PAGINATION
    // ========================================
    function renderPagination(totalItems) {
        var totalPages = Math.ceil(totalItems / state.perPage);

        if (totalPages <= 1) {
            dom.pagination.style.display = 'none';
            return;
        }

        dom.pagination.style.display = 'flex';
        dom.prevBtn.disabled = state.currentPage <= 1;
        dom.nextBtn.disabled = state.currentPage >= totalPages;

        var html = '';
        for (var i = 1; i <= totalPages; i++) {
            var active = i === state.currentPage ? ' active' : '';
            html += '<button class="rv-page-num' + active + '">' + i + '</button>';
        }
        dom.pageNumbers.innerHTML = html;
    }

    function scrollToControls() {
        var controls = document.querySelector('.rv-controls');
        if (controls) {
            var headerHeight = 80;
            var top = controls.getBoundingClientRect().top + window.pageYOffset - headerHeight - 16;
            window.scrollTo({ top: top, behavior: 'smooth' });
        }
    }

    // ========================================
    // EVENT HANDLERS
    // ========================================
    function initSortAndFilter() {
        dom.sortSelect.addEventListener('change', function () {
            state.sortBy = this.value;
            state.currentPage = 1;
            renderReviews();
        });

        dom.filterStars.addEventListener('click', function (e) {
            var btn = e.target.closest('.rv-filter-btn');
            if (!btn) return;

            var btns = dom.filterStars.querySelectorAll('.rv-filter-btn');
            for (var i = 0; i < btns.length; i++) {
                btns[i].classList.remove('active');
            }
            btn.classList.add('active');

            state.filterRating = btn.getAttribute('data-filter');
            state.currentPage = 1;
            renderReviews();
        });
    }

    function initPagination() {
        dom.pagination.addEventListener('click', function (e) {
            var numBtn = e.target.closest('.rv-page-num');
            var prevBtn = e.target.closest('#rv-prev');
            var nextBtn = e.target.closest('#rv-next');

            if (numBtn) {
                state.currentPage = parseInt(numBtn.textContent);
                renderReviews();
                scrollToControls();
            } else if (prevBtn && state.currentPage > 1) {
                state.currentPage--;
                renderReviews();
                scrollToControls();
            } else if (nextBtn) {
                var filtered = getFilteredSortedReviews();
                var totalPages = Math.ceil(filtered.length / state.perPage);
                if (state.currentPage < totalPages) {
                    state.currentPage++;
                    renderReviews();
                    scrollToControls();
                }
            }
        });
    }

    function initHelpful() {
        dom.reviewList.addEventListener('click', function (e) {
            var helpfulBtn = e.target.closest('.rv-card-helpful');
            if (!helpfulBtn) return;

            var id = parseInt(helpfulBtn.getAttribute('data-id'));
            if (state.helpfulClicked[id]) return;

            state.helpfulClicked[id] = true;

            for (var i = 0; i < reviewsData.length; i++) {
                if (reviewsData[i].id === id) {
                    reviewsData[i].helpful++;
                    helpfulBtn.classList.add('active');
                    var countEl = helpfulBtn.querySelector('.rv-helpful-count');
                    if (countEl) countEl.textContent = reviewsData[i].helpful;
                    break;
                }
            }
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
        dom.fab.addEventListener('click', openModal);

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
            var svg = btns[i].querySelector('svg');
            svg.setAttribute('fill', val <= rating ? '#FACC15' : '#E5E7EB');
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
                    dom.starLabel.style.color = '';
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
    // FILE UPLOAD
    // ========================================
    var uploadedFiles = [];
    var MAX_FILES = 4;
    var MAX_SIZE = 5 * 1024 * 1024;

    function initUpload() {
        dom.uploadArea.addEventListener('click', function () {
            dom.uploadInput.click();
        });

        dom.uploadArea.addEventListener('dragover', function (e) {
            e.preventDefault();
            dom.uploadArea.classList.add('drag-over');
        });

        dom.uploadArea.addEventListener('dragleave', function () {
            dom.uploadArea.classList.remove('drag-over');
        });

        dom.uploadArea.addEventListener('drop', function (e) {
            e.preventDefault();
            dom.uploadArea.classList.remove('drag-over');
            handleFiles(e.dataTransfer.files);
        });

        dom.uploadInput.addEventListener('change', function () {
            handleFiles(this.files);
            this.value = '';
        });
    }

    function handleFiles(fileList) {
        var files = Array.prototype.slice.call(fileList);

        for (var i = 0; i < files.length; i++) {
            if (uploadedFiles.length >= MAX_FILES) break;
            if (files[i].size > MAX_SIZE) continue;
            if (!/^(image|video)\//.test(files[i].type)) continue;
            uploadedFiles.push(files[i]);
        }

        renderPreviews();
    }

    function renderPreviews() {
        dom.uploadPreviews.innerHTML = '';

        for (var i = 0; i < uploadedFiles.length; i++) {
            (function (file, index) {
                var div = document.createElement('div');
                div.className = 'rv-preview-item';

                if (file.type.startsWith('video/')) {
                    var videoPlaceholder = document.createElement('div');
                    videoPlaceholder.className = 'rv-preview-video';
                    videoPlaceholder.textContent = 'Video';
                    div.appendChild(videoPlaceholder);
                } else {
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        var img = document.createElement('img');
                        img.src = e.target.result;
                        img.alt = 'Upload preview';
                        div.insertBefore(img, div.firstChild);
                    };
                    reader.readAsDataURL(file);
                }

                var removeBtn = document.createElement('button');
                removeBtn.className = 'rv-preview-remove';
                removeBtn.innerHTML = '&times;';
                removeBtn.setAttribute('aria-label', 'Remove file');
                removeBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    uploadedFiles.splice(index, 1);
                    renderPreviews();
                });
                div.appendChild(removeBtn);

                dom.uploadPreviews.appendChild(div);
            })(uploadedFiles[i], i);
        }

        dom.uploadArea.style.display = uploadedFiles.length >= MAX_FILES ? 'none' : '';
    }

    // ========================================
    // FORM VALIDATION & SUBMISSION
    // ========================================
    function clearFormErrors() {
        var inputs = dom.reviewForm.querySelectorAll('.sp-input');
        for (var i = 0; i < inputs.length; i++) {
            inputs[i].classList.remove('error');
        }
        dom.starLabel.style.color = '';
    }

    function initFormValidation() {
        // Clear error on focus
        var inputs = dom.reviewForm.querySelectorAll('.sp-input');
        for (var i = 0; i < inputs.length; i++) {
            inputs[i].addEventListener('focus', function () {
                this.classList.remove('error');
            });
        }

        dom.reviewForm.addEventListener('submit', function (e) {
            e.preventDefault();
            clearFormErrors();

            var rating = state.selectedRating;
            var title = document.getElementById('rv-review-title').value.trim();
            var content = document.getElementById('rv-review-content').value.trim();
            var name = document.getElementById('rv-review-name').value.trim();
            var email = document.getElementById('rv-review-email').value.trim();
            var hasError = false;

            if (rating === 0) {
                dom.starLabel.textContent = 'Please select a rating';
                dom.starLabel.style.color = '#ef4444';
                hasError = true;
            }
            if (!title) {
                document.getElementById('rv-review-title').classList.add('error');
                hasError = true;
            }
            if (!content) {
                document.getElementById('rv-review-content').classList.add('error');
                hasError = true;
            }
            if (!name) {
                document.getElementById('rv-review-name').classList.add('error');
                hasError = true;
            }
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                document.getElementById('rv-review-email').classList.add('error');
                hasError = true;
            }

            if (hasError) return;

            dom.submitBtn.disabled = true;
            dom.submitBtn.textContent = 'Submitting...';

            setTimeout(function () {
                dom.modalForm.style.display = 'none';
                dom.modalSuccess.classList.remove('hidden');
                dom.submitBtn.disabled = false;
                dom.submitBtn.textContent = 'Submit Review';
            }, 1200);
        });
    }

    function resetForm() {
        state.selectedRating = 0;
        updateStarDisplay(0);
        dom.starLabel.textContent = '';
        dom.starLabel.style.color = '';

        document.getElementById('rv-review-title').value = '';
        document.getElementById('rv-review-content').value = '';
        document.getElementById('rv-review-name').value = '';
        document.getElementById('rv-review-email').value = '';

        clearFormErrors();

        uploadedFiles = [];
        renderPreviews();

        dom.modalForm.style.display = '';
        dom.modalSuccess.classList.add('hidden');
    }

    // ========================================
    // INIT
    // ========================================
    document.addEventListener('DOMContentLoaded', function () {
        cacheDom();
        renderSummary();
        renderReviews();
        initSortAndFilter();
        initPagination();
        initHelpful();
        initPhotoLightbox();
        initModal();
        initStarSelector();
        initUpload();
        initFormValidation();
    });

})();
