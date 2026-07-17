// ========================================
// Buy Page - Veloretti-inspired Redesign
// Cart state & drawer live in js/cart.js (window.hawaaCart).
// ========================================

(function() {
    'use strict';

    // ========================================
    // STATE
    // ========================================
    var currentStep = 1;
    var totalSteps = 2;
    var purchaseType = 'onetime'; // 'onetime' or 'subscribe'
    var selectedColour = 'almond'; // 'almond' or 'grey'

    var COLOUR_NAMES = {
        almond: 'Almond Beige',
        grey: 'Space Grey'
    };

    var PRICES = {
        onetime: 5999,
        subscribe: 5499
    };

    var FILTER_PRICE = 1499;

    // ========================================
    // DOM ELEMENTS
    // ========================================

    // Carousel
    var carousel = document.getElementById('buy-carousel');
    var carouselTrack = document.getElementById('buy-carousel-track');
    var carouselIndex = document.getElementById('buy-carousel-index');
    var totalSlides = carouselTrack ? carouselTrack.children.length : 0;
    var currentSlide = 0;

    // Steps
    var stepBtns = document.querySelectorAll('.buy-step');
    var stepContents = document.querySelectorAll('.buy-step-content');

    // Variant cards
    var btnOnetime = document.getElementById('btn-onetime');
    var btnSubscribe = document.getElementById('btn-subscribe');

    // Filter plans (now inside purifier step)
    var filterPlans = document.getElementById('buy-filter-plans');
    var filter5 = document.getElementById('filter-5');
    var filter6 = document.getElementById('filter-6');

    // Colour selector
    var colourNameEl = document.getElementById('buy-colour-name');
    var colourSwatches = document.querySelectorAll('.buy-colour-swatch');

    // Price displays
    var priceDisplay = document.getElementById('buy-price');
    var stickyPrice = document.getElementById('buy-sticky-price');

    // Sticky bar
    var stickyBtn = document.getElementById('buy-sticky-btn');

    // Details modal
    var detailsBtn = document.getElementById('buy-details-btn');
    var detailsOverlay = document.getElementById('buy-details-overlay');
    var detailsClose = document.getElementById('buy-details-close');
    var detailsSlides = document.getElementById('buy-details-slides');
    var detailsPrev = document.getElementById('buy-details-prev');
    var detailsNext = document.getElementById('buy-details-next');
    var detailsDots = document.querySelectorAll('.buy-details-dot');
    var currentDetailSlide = 0;
    var totalDetailSlides = detailsDots.length;

    // Accessory
    var accFilterBtn = document.getElementById('acc-filter-btn');

    // ========================================
    // UTILITY
    // ========================================
    function formatPrice(amount) {
        return '₹' + amount.toLocaleString('en-IN');
    }

    // ========================================
    // IMAGE CAROUSEL (Fixed)
    // ========================================
    function goToSlide(index) {
        if (index < 0) index = totalSlides - 1;
        if (index >= totalSlides) index = 0;
        currentSlide = index;
        if (carouselTrack) {
            carouselTrack.style.transform = 'translateX(-' + (currentSlide * 100) + '%)';
        }
        if (carouselIndex) {
            carouselIndex.textContent = (currentSlide + 1) + '/' + totalSlides;
        }
    }

    // Touch/swipe support for carousel
    if (carousel) {
        var touchStartX = 0;
        var touchStartY = 0;
        var touchDiffX = 0;
        var isSwiping = false;
        var swipeDirection = null;

        carousel.addEventListener('touchstart', function(e) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchDiffX = 0;
            isSwiping = true;
            swipeDirection = null;
            if (carouselTrack) {
                carouselTrack.style.transition = 'none';
            }
        }, { passive: true });

        carousel.addEventListener('touchmove', function(e) {
            if (!isSwiping) return;

            var currentX = e.touches[0].clientX;
            var currentY = e.touches[0].clientY;
            var diffX = currentX - touchStartX;
            var diffY = currentY - touchStartY;

            if (swipeDirection === null && (Math.abs(diffX) > 8 || Math.abs(diffY) > 8)) {
                swipeDirection = Math.abs(diffX) > Math.abs(diffY) ? 'h' : 'v';
            }

            if (swipeDirection === 'h') {
                e.preventDefault();
                touchDiffX = diffX;
                var baseOffset = -(currentSlide * 100);
                var dragPercent = (touchDiffX / carousel.offsetWidth) * 100;
                if (carouselTrack) {
                    carouselTrack.style.transform = 'translateX(' + (baseOffset + dragPercent) + '%)';
                }
            }
        }, { passive: false });

        carousel.addEventListener('touchend', function() {
            if (!isSwiping) return;
            isSwiping = false;

            if (carouselTrack) {
                carouselTrack.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            }

            if (swipeDirection === 'h') {
                var threshold = carousel.offsetWidth * 0.15;
                if (touchDiffX < -threshold) {
                    goToSlide(currentSlide + 1);
                } else if (touchDiffX > threshold) {
                    goToSlide(currentSlide - 1);
                } else {
                    goToSlide(currentSlide);
                }
            }
        }, { passive: true });
    }

    // ========================================
    // STEP NAVIGATION
    // ========================================
    function goToStep(step) {
        if (step < 1 || step > totalSteps) return;
        currentStep = step;

        stepBtns.forEach(function(btn) {
            var btnStep = parseInt(btn.getAttribute('data-step'));
            btn.classList.remove('active', 'completed');
            if (btnStep === currentStep) {
                btn.classList.add('active');
            } else if (btnStep < currentStep) {
                btn.classList.add('completed');
            }
        });

        stepContents.forEach(function(content) {
            content.classList.remove('active');
        });
        var activeContent = document.getElementById('step-content-' + currentStep);
        if (activeContent) {
            activeContent.classList.add('active');
        }

        var stepsBar = document.getElementById('buy-steps');
        if (stepsBar) {
            stepsBar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    stepBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var step = parseInt(this.getAttribute('data-step'));
            goToStep(step);
        });
    });

    // Deep link: buy.html#accessories opens the Accessories tab directly
    // (used by the filter strip on the landing page and footer links).
    function handleAccessoriesHash() {
        if (window.location.hash === '#accessories') {
            goToStep(2);
        }
    }
    handleAccessoriesHash();
    window.addEventListener('hashchange', handleAccessoriesHash);

    // ========================================
    // VARIANT SELECTION
    // ========================================
    function selectVariant(type) {
        purchaseType = type;

        if (btnOnetime) btnOnetime.classList.toggle('active', type === 'onetime');
        if (btnSubscribe) btnSubscribe.classList.toggle('active', type === 'subscribe');

        if (filterPlans) {
            if (type === 'subscribe') {
                filterPlans.classList.add('visible');
            } else {
                filterPlans.classList.remove('visible');
            }
        }

        updatePrices();
    }

    if (btnOnetime) {
        btnOnetime.addEventListener('click', function() { selectVariant('onetime'); });
    }
    if (btnSubscribe) {
        btnSubscribe.addEventListener('click', function() { selectVariant('subscribe'); });
    }

    // ========================================
    // COLOUR SELECTION
    // ========================================
    function selectColour(colour) {
        if (!COLOUR_NAMES[colour]) return;
        selectedColour = colour;

        colourSwatches.forEach(function(swatch) {
            var isActive = swatch.getAttribute('data-colour') === colour;
            swatch.classList.toggle('active', isActive);
            swatch.setAttribute('aria-checked', isActive ? 'true' : 'false');
        });

        if (colourNameEl) colourNameEl.textContent = COLOUR_NAMES[colour];

        // Re-theme the whole page to match the chosen colourway
        // (warm porcelain for almond, cool graphite for space grey).
        document.body.classList.toggle('buy-theme-grey', colour === 'grey');
    }

    colourSwatches.forEach(function(swatch) {
        swatch.addEventListener('click', function() {
            selectColour(this.getAttribute('data-colour'));
        });
    });

    // ========================================
    // FILTER INTERVAL
    // ========================================
    function selectFilterInterval(interval) {
        if (filter5) filter5.classList.toggle('active', interval === 5);
        if (filter6) filter6.classList.toggle('active', interval === 6);
        if (window.hawaaCart) window.hawaaCart.setFilterInterval(interval);
    }

    if (filter5) {
        filter5.addEventListener('click', function() { selectFilterInterval(5); });
    }
    if (filter6) {
        filter6.addEventListener('click', function() { selectFilterInterval(6); });
    }

    // ========================================
    // PRICE UPDATES
    // ========================================
    function updatePrices() {
        var price = PRICES[purchaseType];
        var priceStr = formatPrice(price);

        if (priceDisplay) priceDisplay.textContent = priceStr;
        if (stickyPrice) stickyPrice.textContent = priceStr;
    }

    // ========================================
    // ACCESSORY BUTTON SYNC
    // ========================================
    function syncAccessoryBtn() {
        if (!accFilterBtn || !window.hawaaCart) return;
        var hasFilter = window.hawaaCart.has('filter');
        if (hasFilter) {
            accFilterBtn.textContent = 'Added';
            accFilterBtn.classList.add('added');
        } else {
            accFilterBtn.textContent = 'Add';
            accFilterBtn.classList.remove('added');
        }
    }

    if (window.hawaaCart) {
        window.hawaaCart.onChange(syncAccessoryBtn);
        syncAccessoryBtn();
    }

    // ========================================
    // STICKY BAR - Add to Cart
    // ========================================
    if (stickyBtn) {
        stickyBtn.addEventListener('click', function() {
            if (!window.hawaaCart) return;
            var price = PRICES[purchaseType];
            var variant = (purchaseType === 'subscribe' ? 'Subscribe' : 'One-time')
                + ' · ' + COLOUR_NAMES[selectedColour];

            window.hawaaCart.add({
                id: 'purifier-' + purchaseType + '-' + selectedColour,
                name: 'Hawaa Edge',
                variant: variant,
                price: price,
                qty: 1,
                img: 'public/images/hero-poster.webp'
            });

            // Show feedback
            stickyBtn.textContent = 'Added!';
            stickyBtn.style.background = 'var(--success)';
            setTimeout(function() {
                stickyBtn.textContent = 'Add to Cart';
                stickyBtn.style.background = '';
            }, 1200);

            // Open cart after short delay
            setTimeout(window.hawaaCart.open, 600);
        });
    }

    // ========================================
    // ACCESSORY ADD BUTTON
    // ========================================
    if (accFilterBtn) {
        accFilterBtn.addEventListener('click', function() {
            if (!window.hawaaCart) return;
            if (window.hawaaCart.has('filter')) {
                window.hawaaCart.remove('filter');
            } else {
                window.hawaaCart.add({
                    id: 'filter',
                    name: 'Replacement Filter',
                    variant: '3-in-1 H13 HEPA + Activated Carbon',
                    price: FILTER_PRICE,
                    qty: 1,
                    img: 'public/images/hero-poster.webp'
                });
            }
        });
    }

    // ========================================
    // DETAILS MODAL (Full Screen)
    // ========================================
    function openDetails() {
        if (detailsOverlay) {
            detailsOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeDetails() {
        if (detailsOverlay) {
            detailsOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    function goToDetailSlide(index) {
        if (index < 0) index = totalDetailSlides - 1;
        if (index >= totalDetailSlides) index = 0;
        currentDetailSlide = index;

        if (detailsSlides) {
            detailsSlides.style.transform = 'translateX(-' + (currentDetailSlide * 100) + '%)';
        }

        detailsDots.forEach(function(dot, i) {
            dot.classList.toggle('active', i === currentDetailSlide);
        });
    }

    if (detailsBtn) {
        detailsBtn.addEventListener('click', openDetails);
    }

    if (detailsClose) {
        detailsClose.addEventListener('click', closeDetails);
    }

    if (detailsPrev) {
        detailsPrev.addEventListener('click', function() {
            goToDetailSlide(currentDetailSlide - 1);
        });
    }

    if (detailsNext) {
        detailsNext.addEventListener('click', function() {
            goToDetailSlide(currentDetailSlide + 1);
        });
    }

    // Close on Escape (cart drawer handles its own Escape in cart.js)
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeDetails();
        }
    });

    // ========================================
    // INITIALIZE
    // ========================================
    updatePrices();

})();
