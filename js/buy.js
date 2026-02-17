// ========================================
// Buy Page - Veloretti-inspired Redesign
// ========================================

(function() {
    'use strict';

    // ========================================
    // STATE
    // ========================================
    var currentStep = 1;
    var totalSteps = 2;
    var purchaseType = 'onetime'; // 'onetime' or 'subscribe'
    var filterInterval = 5; // 5 or 6 months

    var PRICES = {
        onetime: 5999,
        subscribe: 5499
    };

    var FILTER_PRICE = 1499;

    // Cart state
    var cart = []; // Array of { id, name, variant, price, qty, img }

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

    // Cart elements
    var cartBtn = document.getElementById('cart-btn');
    var cartBadge = document.getElementById('cart-badge');
    var cartOverlay = document.getElementById('cart-overlay');
    var cartClose = document.getElementById('cart-close');
    var cartEmpty = document.getElementById('cart-empty');
    var cartItems = document.getElementById('cart-items');
    var cartFooter = document.getElementById('cart-footer');
    var cartUpsell = document.getElementById('cart-upsell');
    var cartAddFilter = document.getElementById('cart-add-filter');
    var cartBreakdownToggle = document.getElementById('cart-breakdown-toggle');
    var cartBreakdown = document.getElementById('cart-breakdown');
    var cartSubtotal = document.getElementById('cart-subtotal');
    var cartGst = document.getElementById('cart-gst');
    var cartDelivery = document.getElementById('cart-delivery');
    var cartShipping = document.getElementById('cart-shipping');
    var cartTotal = document.getElementById('cart-total');

    // ========================================
    // UTILITY
    // ========================================
    function formatPrice(amount) {
        return '\u20B9' + amount.toLocaleString('en-IN');
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
    // FILTER INTERVAL
    // ========================================
    function selectFilterInterval(interval) {
        filterInterval = interval;
        if (filter5) filter5.classList.toggle('active', interval === 5);
        if (filter6) filter6.classList.toggle('active', interval === 6);
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
    // CART FUNCTIONALITY
    // ========================================

    function findCartItem(id) {
        for (var i = 0; i < cart.length; i++) {
            if (cart[i].id === id) return i;
        }
        return -1;
    }

    function addToCart(item) {
        var idx = findCartItem(item.id);
        if (idx >= 0) {
            cart[idx].qty += 1;
            cart[idx].price = item.price;
        } else {
            cart.push({
                id: item.id,
                name: item.name,
                variant: item.variant,
                price: item.price,
                qty: item.qty || 1,
                img: item.img
            });
        }
        updateCartUI();
    }

    function removeFromCart(id) {
        var idx = findCartItem(id);
        if (idx >= 0) {
            cart.splice(idx, 1);
        }
        updateCartUI();
    }

    function updateQty(id, delta) {
        var idx = findCartItem(id);
        if (idx >= 0) {
            cart[idx].qty += delta;
            if (cart[idx].qty <= 0) {
                cart.splice(idx, 1);
            }
        }
        updateCartUI();
    }

    function getCartCount() {
        var count = 0;
        for (var i = 0; i < cart.length; i++) {
            count += cart[i].qty;
        }
        return count;
    }

    function getSubtotal() {
        var total = 0;
        for (var i = 0; i < cart.length; i++) {
            total += cart[i].price * cart[i].qty;
        }
        return total;
    }

    function updateCartUI() {
        var count = getCartCount();

        // Update badge
        if (cartBadge) {
            if (count > 0) {
                cartBadge.textContent = count;
                cartBadge.classList.add('visible');
            } else {
                cartBadge.classList.remove('visible');
            }
        }

        // Update empty/items state
        if (cartEmpty) {
            if (cart.length === 0) {
                cartEmpty.classList.remove('hidden');
            } else {
                cartEmpty.classList.add('hidden');
            }
        }

        // Show/hide footer
        if (cartFooter) {
            if (cart.length === 0) {
                cartFooter.classList.add('hidden');
            } else {
                cartFooter.classList.remove('hidden');
            }
        }

        // Show/hide filter upsell (hide if filter already in cart)
        if (cartUpsell) {
            var hasFilter = findCartItem('filter') >= 0;
            if (hasFilter || cart.length === 0) {
                cartUpsell.classList.add('hidden');
            } else {
                cartUpsell.classList.remove('hidden');
            }
        }

        // Render cart items
        renderCartItems();

        // Update price breakdown
        updatePriceBreakdown();

        // Sync accessory button state on buy page
        syncAccessoryBtn();
    }

    function renderCartItems() {
        if (!cartItems) return;
        cartItems.innerHTML = '';

        for (var i = 0; i < cart.length; i++) {
            var item = cart[i];
            var div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML =
                '<div class="cart-item-img"><img src="' + item.img + '" alt="' + item.name + '"></div>' +
                '<div class="cart-item-details">' +
                    '<div class="cart-item-name">' + item.name + '</div>' +
                    '<div class="cart-item-variant">' + item.variant + '</div>' +
                    '<div class="cart-item-bottom">' +
                        '<div class="cart-qty">' +
                            '<button class="cart-qty-btn" data-id="' + item.id + '" data-action="minus">&minus;</button>' +
                            '<span class="cart-qty-val">' + item.qty + '</span>' +
                            '<button class="cart-qty-btn" data-id="' + item.id + '" data-action="plus">+</button>' +
                        '</div>' +
                        '<span class="cart-item-price">' + formatPrice(item.price * item.qty) + '</span>' +
                    '</div>' +
                '</div>';
            cartItems.appendChild(div);
        }

        // Bind qty buttons
        var qtyBtns = cartItems.querySelectorAll('.cart-qty-btn');
        for (var j = 0; j < qtyBtns.length; j++) {
            qtyBtns[j].addEventListener('click', function() {
                var id = this.getAttribute('data-id');
                var action = this.getAttribute('data-action');
                if (action === 'plus') {
                    updateQty(id, 1);
                } else {
                    updateQty(id, -1);
                }
            });
        }
    }

    function updatePriceBreakdown() {
        var subtotal = getSubtotal();
        var gst = Math.round(subtotal * 0.18);
        var delivery = 0;
        var shipping = 0;
        var total = subtotal + gst + delivery + shipping;

        if (cartSubtotal) cartSubtotal.textContent = formatPrice(subtotal);
        if (cartGst) cartGst.textContent = formatPrice(gst);
        if (cartDelivery) {
            if (delivery === 0) {
                cartDelivery.textContent = 'Free';
                cartDelivery.className = 'cart-free';
            } else {
                cartDelivery.textContent = formatPrice(delivery);
                cartDelivery.className = '';
            }
        }
        if (cartShipping) {
            if (shipping === 0) {
                cartShipping.textContent = 'Free';
                cartShipping.className = 'cart-free';
            } else {
                cartShipping.textContent = formatPrice(shipping);
                cartShipping.className = '';
            }
        }
        if (cartTotal) cartTotal.textContent = formatPrice(total);
    }

    function syncAccessoryBtn() {
        if (!accFilterBtn) return;
        var hasFilter = findCartItem('filter') >= 0;
        if (hasFilter) {
            accFilterBtn.textContent = 'Added';
            accFilterBtn.classList.add('added');
        } else {
            accFilterBtn.textContent = 'Add';
            accFilterBtn.classList.remove('added');
        }
    }

    // ========================================
    // CART OVERLAY
    // ========================================
    function openCart() {
        if (cartOverlay) {
            cartOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeCart() {
        if (cartOverlay) {
            cartOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    if (cartBtn) {
        cartBtn.addEventListener('click', openCart);
    }

    if (cartClose) {
        cartClose.addEventListener('click', closeCart);
    }

    if (cartOverlay) {
        // Close cart only when clicking the backdrop (overlay itself), not the panel or its children
        cartOverlay.addEventListener('click', function(e) {
            if (e.target === cartOverlay) {
                closeCart();
            }
        });
    }

    // ========================================
    // CART PRICE BREAKDOWN TOGGLE
    // ========================================
    if (cartBreakdownToggle) {
        cartBreakdownToggle.addEventListener('click', function() {
            var isOpen = cartBreakdownToggle.classList.contains('open');
            if (isOpen) {
                cartBreakdownToggle.classList.remove('open');
                if (cartBreakdown) cartBreakdown.classList.remove('visible');
            } else {
                cartBreakdownToggle.classList.add('open');
                if (cartBreakdown) cartBreakdown.classList.add('visible');
            }
        });
    }

    // ========================================
    // CART UPSELL - ADD FILTER FROM CART
    // ========================================
    if (cartAddFilter) {
        cartAddFilter.addEventListener('click', function() {
            addToCart({
                id: 'filter',
                name: 'Replacement Filter',
                variant: '3-in-1 H13 HEPA + Activated Carbon',
                price: FILTER_PRICE,
                qty: 1,
                img: 'public/images/hero-poster.webp'
            });
        });
    }

    // ========================================
    // STICKY BAR - Add to Cart
    // ========================================
    if (stickyBtn) {
        stickyBtn.addEventListener('click', function() {
            var price = PRICES[purchaseType];
            var variant = purchaseType === 'subscribe'
                ? 'Subscribe \u00B7 Almond Beige'
                : 'One-time \u00B7 Almond Beige';

            addToCart({
                id: 'purifier-' + purchaseType,
                name: 'Hawaa Edge',
                variant: variant,
                price: price,
                qty: 1,
                img: 'public/images/hero-poster.webp'
            });

            // Show feedback
            stickyBtn.textContent = 'Added!';
            stickyBtn.style.background = '#059669';
            setTimeout(function() {
                stickyBtn.textContent = 'Add to Cart';
                stickyBtn.style.background = '';
            }, 1200);

            // Open cart after short delay
            setTimeout(openCart, 600);
        });
    }

    // ========================================
    // ACCESSORY ADD BUTTON
    // ========================================
    if (accFilterBtn) {
        accFilterBtn.addEventListener('click', function() {
            var hasFilter = findCartItem('filter') >= 0;
            if (hasFilter) {
                removeFromCart('filter');
            } else {
                addToCart({
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

    // Close on Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeDetails();
            closeCart();
        }
    });

    // ========================================
    // INITIALIZE
    // ========================================
    updatePrices();
    updateCartUI();

})();
