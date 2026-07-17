// ========================================
// SHARED CART (all pages)
// Owns cart state (localStorage), injects the cart drawer,
// renders the menu cart count and handles checkout.
// Exposed as window.hawaaCart for page scripts (js/buy.js).
// ========================================

(function() {
    'use strict';

    var CART_STORAGE_KEY = 'hawaa-cart';
    var META_STORAGE_KEY = 'hawaa-cart-meta';

    var FILTER_PRICE = 1499;
    var PRICES = {
        onetime: 5999,
        subscribe: 5499
    };

    var cart = []; // Array of { id, name, variant, price, qty, img }
    var meta = { filterInterval: 5 };
    var listeners = [];

    function loadCart() {
        try {
            var saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
            cart = Array.isArray(saved) ? saved : [];
        } catch (e) { cart = []; }
        try {
            var savedMeta = JSON.parse(localStorage.getItem(META_STORAGE_KEY) || '{}');
            if (savedMeta && (savedMeta.filterInterval === 5 || savedMeta.filterInterval === 6)) {
                meta.filterInterval = savedMeta.filterInterval;
            }
        } catch (e) { /* keep defaults */ }
    }

    function saveCart() {
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
            localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
        } catch (e) { /* storage unavailable */ }
    }

    loadCart();

    // ========================================
    // DRAWER MARKUP (injected once per page)
    // ========================================
    function injectDrawer() {
        if (document.getElementById('cart-overlay')) return;
        var tpl =
        '<div class="cart-overlay" id="cart-overlay">' +
            '<div class="cart-panel" id="cart-panel" role="dialog" aria-modal="true" aria-label="Shopping cart">' +
                '<div class="cart-header">' +
                    '<h2 class="cart-title">Cart <span class="cart-title-count" id="cart-title-count"></span></h2>' +
                    '<button class="cart-close" id="cart-close" aria-label="Close cart">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                    '</button>' +
                '</div>' +
                '<div class="cart-body" id="cart-body">' +
                    '<div class="cart-empty" id="cart-empty">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>' +
                        '<p>Your cart is empty</p>' +
                        '<a href="buy.html" class="cart-empty-cta" id="cart-empty-cta">Shop Hawaa Edge</a>' +
                    '</div>' +
                    '<div class="cart-items" id="cart-items"></div>' +
                '</div>' +
                '<div class="cart-footer" id="cart-footer">' +
                    '<div class="cart-upsell" id="cart-upsell">' +
                        '<div class="cart-upsell-info">' +
                            '<span class="cart-upsell-name">Add Replacement Filter</span>' +
                            '<span class="cart-upsell-detail">3-in-1 H13 HEPA + Activated Carbon</span>' +
                        '</div>' +
                        '<div class="cart-upsell-action">' +
                            '<span class="cart-upsell-price">₹1,499</span>' +
                            '<button class="cart-upsell-btn" id="cart-add-filter">Add</button>' +
                        '</div>' +
                    '</div>' +
                    '<button class="cart-breakdown-toggle" id="cart-breakdown-toggle">' +
                        '<span>Price Details</span>' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>' +
                    '</button>' +
                    '<div class="cart-breakdown" id="cart-breakdown">' +
                        '<div class="cart-breakdown-row"><span>Subtotal</span><span id="cart-subtotal">₹0</span></div>' +
                        '<div class="cart-breakdown-row"><span>GST (18%)</span><span id="cart-gst">₹0</span></div>' +
                        '<div class="cart-breakdown-row"><span>Delivery Fee</span><span id="cart-delivery" class="cart-free">Free</span></div>' +
                        '<div class="cart-breakdown-row"><span>Shipping Fee</span><span id="cart-shipping" class="cart-free">Free</span></div>' +
                    '</div>' +
                    '<div class="cart-total-row"><span>Total</span><span id="cart-total">₹0</span></div>' +
                    '<button class="cart-checkout-btn" id="cart-checkout-btn">Checkout</button>' +
                '</div>' +
                '<div class="checkout-view hidden" id="checkout-view">' +
                    '<button type="button" class="checkout-back" id="checkout-back">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>' +
                        'Back to cart' +
                    '</button>' +
                    '<h3 class="checkout-title">Delivery address</h3>' +
                    '<form class="checkout-form" id="checkout-form" novalidate>' +
                        '<input type="text" class="checkout-input" id="co-name" placeholder="Full name" maxlength="100" autocomplete="name">' +
                        '<input type="tel" class="checkout-input" id="co-phone" placeholder="Mobile number" maxlength="10" inputmode="numeric" autocomplete="tel-national">' +
                        '<input type="text" class="checkout-input" id="co-line1" placeholder="Address (house no, street)" maxlength="200" autocomplete="address-line1">' +
                        '<input type="text" class="checkout-input" id="co-line2" placeholder="Area, landmark (optional)" maxlength="200" autocomplete="address-line2">' +
                        '<div class="checkout-row">' +
                            '<input type="text" class="checkout-input" id="co-city" placeholder="City" maxlength="100" autocomplete="address-level2">' +
                            '<input type="text" class="checkout-input" id="co-pincode" placeholder="PIN code" maxlength="6" inputmode="numeric" autocomplete="postal-code">' +
                        '</div>' +
                        '<input type="text" class="checkout-input" id="co-state" placeholder="State" maxlength="100" autocomplete="address-level1">' +
                        '<p class="checkout-error" id="checkout-error"></p>' +
                        '<div class="checkout-total-row"><span>Total (Cash on Delivery)</span><span id="checkout-total">₹0</span></div>' +
                        '<button type="submit" class="cart-checkout-btn" id="checkout-place-btn">Place Order</button>' +
                    '</form>' +
                '</div>' +
                '<div class="checkout-view hidden" id="order-success-view">' +
                    '<div class="checkout-success-icon">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>' +
                    '</div>' +
                    '<h3 class="checkout-title" style="text-align:center;">Order placed!</h3>' +
                    '<p class="checkout-success-text">Order ID: <strong id="order-success-id"></strong></p>' +
                    '<p class="checkout-success-text">Pay in cash when your Hawaa arrives. Track it anytime on your <a href="account.html">account page</a>.</p>' +
                    '<button type="button" class="cart-checkout-btn" id="order-success-done">Done</button>' +
                '</div>' +
            '</div>' +
        '</div>';
        document.body.insertAdjacentHTML('beforeend', tpl);
    }

    injectDrawer();

    // ========================================
    // DOM ELEMENTS
    // ========================================
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
    var cartTitleCount = document.getElementById('cart-title-count');
    var cartEmptyCta = document.getElementById('cart-empty-cta');

    var checkoutBtn = document.getElementById('cart-checkout-btn');
    var checkoutView = document.getElementById('checkout-view');
    var checkoutBack = document.getElementById('checkout-back');
    var checkoutForm = document.getElementById('checkout-form');
    var checkoutError = document.getElementById('checkout-error');
    var checkoutTotal = document.getElementById('checkout-total');
    var placeBtn = document.getElementById('checkout-place-btn');
    var successView = document.getElementById('order-success-view');
    var successId = document.getElementById('order-success-id');
    var successDone = document.getElementById('order-success-done');
    var cartBody = document.getElementById('cart-body');

    // ========================================
    // UTILITY
    // ========================================
    function formatPrice(amount) {
        return '₹' + amount.toLocaleString('en-IN');
    }

    // 18% GST, round half-up in pure integer math — MUST stay identical
    // to the arithmetic in firestore.rules, which re-validates order
    // amounts server-side (float math like subtotal * 0.18 can disagree
    // with the rules on exact .5 boundaries).
    function gstOf(subtotal) {
        return Math.floor((subtotal * 18 + 50) / 100);
    }

    // ========================================
    // CART STATE
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

    // ========================================
    // RENDERING
    // ========================================
    function updateBadge() {
        if (!cartBadge) return;
        var count = getCartCount();
        cartBadge.textContent = count === 1 ? '1 item' : count + ' items';
        cartBadge.classList.toggle('has-items', count > 0);
        if (cartTitleCount) {
            cartTitleCount.textContent = count > 0
                ? '· ' + (count === 1 ? '1 item' : count + ' items')
                : '';
        }
    }

    function updateCartUI() {
        saveCart();
        updateBadge();

        if (cartEmpty) cartEmpty.classList.toggle('hidden', cart.length !== 0);
        if (cartFooter) cartFooter.classList.toggle('hidden', cart.length === 0);

        // Show/hide filter upsell (hide if filter already in cart)
        if (cartUpsell) {
            var hasFilter = findCartItem('filter') >= 0;
            cartUpsell.classList.toggle('hidden', hasFilter || cart.length === 0);
        }

        renderCartItems();
        updatePriceBreakdown();

        for (var i = 0; i < listeners.length; i++) {
            try { listeners[i](); } catch (e) { /* listener error must not break cart */ }
        }
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

        var qtyBtns = cartItems.querySelectorAll('.cart-qty-btn');
        for (var j = 0; j < qtyBtns.length; j++) {
            qtyBtns[j].addEventListener('click', function() {
                var id = this.getAttribute('data-id');
                var action = this.getAttribute('data-action');
                updateQty(id, action === 'plus' ? 1 : -1);
            });
        }
    }

    function updatePriceBreakdown() {
        var subtotal = getSubtotal();
        var gst = gstOf(subtotal);
        var delivery = 0;
        var shipping = 0;
        var total = subtotal + gst + delivery + shipping;

        if (cartSubtotal) cartSubtotal.textContent = formatPrice(subtotal);
        if (cartGst) cartGst.textContent = formatPrice(gst);
        if (cartDelivery) {
            cartDelivery.textContent = delivery === 0 ? 'Free' : formatPrice(delivery);
            cartDelivery.className = delivery === 0 ? 'cart-free' : '';
        }
        if (cartShipping) {
            cartShipping.textContent = shipping === 0 ? 'Free' : formatPrice(shipping);
            cartShipping.className = shipping === 0 ? 'cart-free' : '';
        }
        if (cartTotal) cartTotal.textContent = formatPrice(total);
    }

    // ========================================
    // DRAWER OPEN / CLOSE
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
        showCartView(); // reset to the items view for next open
    }

    if (cartBtn) {
        cartBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openCart();
        });
    }

    if (cartClose) {
        cartClose.addEventListener('click', closeCart);
    }

    if (cartOverlay) {
        // Close cart only when clicking the backdrop, not the panel or its children
        cartOverlay.addEventListener('click', function(e) {
            if (e.target === cartOverlay) {
                closeCart();
            }
        });
    }

    if (cartEmptyCta) {
        // Already on the buy page: just close the drawer instead of reloading.
        cartEmptyCta.addEventListener('click', function(e) {
            if (document.body.classList.contains('buy-page')) {
                e.preventDefault();
                closeCart();
            }
        });
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeCart();
    });

    // Another tab changed the cart: re-read and re-render.
    window.addEventListener('storage', function(e) {
        if (e.key === CART_STORAGE_KEY || e.key === META_STORAGE_KEY) {
            loadCart();
            updateCartUI();
        }
    });

    // ========================================
    // CHECKOUT (Cash on Delivery -> Firestore)
    // ========================================
    function showCartView() {
        if (cartBody) cartBody.classList.remove('hidden');
        if (cartFooter) cartFooter.classList.toggle('hidden', cart.length === 0);
        if (checkoutView) checkoutView.classList.add('hidden');
        if (successView) successView.classList.add('hidden');
    }

    function showCheckoutView() {
        if (cartBody) cartBody.classList.add('hidden');
        if (cartFooter) cartFooter.classList.add('hidden');
        if (successView) successView.classList.add('hidden');
        if (checkoutView) checkoutView.classList.remove('hidden');

        var subtotal = getSubtotal();
        var total = subtotal + gstOf(subtotal);
        if (checkoutTotal) checkoutTotal.textContent = formatPrice(total);
        if (checkoutError) checkoutError.textContent = '';

        // Prefill from the signed-in account where possible.
        var fb = window.hawaaFirebase;
        var user = fb && fb.auth.currentUser;
        var nameInput = document.getElementById('co-name');
        var phoneInput = document.getElementById('co-phone');
        if (user && nameInput && !nameInput.value && user.displayName) nameInput.value = user.displayName;
        if (user && phoneInput && !phoneInput.value && user.phoneNumber) {
            phoneInput.value = user.phoneNumber.replace(/^\+91/, '');
        }
    }

    function showSuccessView(orderId) {
        if (cartBody) cartBody.classList.add('hidden');
        if (cartFooter) cartFooter.classList.add('hidden');
        if (checkoutView) checkoutView.classList.add('hidden');
        if (successView) successView.classList.remove('hidden');
        if (successId) successId.textContent = orderId;
    }

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function() {
            if (cart.length === 0) return;
            var fb = window.hawaaFirebase;
            if (!fb || !fb.auth.currentUser) {
                // Ordering needs an account — open the sign-in modal.
                closeCart();
                var profileBtn = document.getElementById('profile-btn');
                if (profileBtn) profileBtn.click();
                return;
            }
            showCheckoutView();
        });
    }

    if (checkoutBack) {
        checkoutBack.addEventListener('click', showCartView);
    }

    if (successDone) {
        successDone.addEventListener('click', function() {
            closeCart();
            showCartView();
        });
    }

    function checkoutFieldError(id) {
        var el = document.getElementById(id);
        if (el) el.classList.add('error');
        return true;
    }

    function placeOrder() {
        var fb = window.hawaaFirebase;
        if (!fb || !fb.auth.currentUser) return;

        ['co-name', 'co-phone', 'co-line1', 'co-line2', 'co-city', 'co-state', 'co-pincode'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.classList.remove('error');
        });

        var name = document.getElementById('co-name').value.trim();
        var phone = document.getElementById('co-phone').value.replace(/\D/g, '');
        var line1 = document.getElementById('co-line1').value.trim();
        var line2 = document.getElementById('co-line2').value.trim();
        var city = document.getElementById('co-city').value.trim();
        var stateVal = document.getElementById('co-state').value.trim();
        var pincode = document.getElementById('co-pincode').value.trim();

        var hasError = false;
        if (!name) hasError = checkoutFieldError('co-name');
        if (!/^[6-9][0-9]{9}$/.test(phone)) hasError = checkoutFieldError('co-phone');
        if (!line1) hasError = checkoutFieldError('co-line1');
        if (!city) hasError = checkoutFieldError('co-city');
        if (!stateVal) hasError = checkoutFieldError('co-state');
        if (!/^[1-9][0-9]{5}$/.test(pincode)) hasError = checkoutFieldError('co-pincode');
        if (hasError) {
            if (checkoutError) checkoutError.textContent = 'Please fill the highlighted fields correctly.';
            return;
        }

        // Quantities per SKU — the security rules recompute and verify
        // every amount from these, so tampering can't change the price.
        // Colour is a suffix on the purifier id (e.g. 'purifier-onetime-grey');
        // both colours share the same SKU price, so match by prefix. Plain
        // ids from carts saved before colours existed still match too.
        var qtyOnetime = 0, qtySubscribe = 0, qtyFilter = 0;
        for (var i = 0; i < cart.length; i++) {
            if (cart[i].id.indexOf('purifier-onetime') === 0) qtyOnetime += cart[i].qty;
            else if (cart[i].id.indexOf('purifier-subscribe') === 0) qtySubscribe += cart[i].qty;
            else if (cart[i].id === 'filter') qtyFilter += cart[i].qty;
        }
        if (qtyOnetime + qtySubscribe + qtyFilter === 0) return;

        var subtotal = qtyOnetime * PRICES.onetime + qtySubscribe * PRICES.subscribe + qtyFilter * FILTER_PRICE;
        var gst = gstOf(subtotal);
        var total = subtotal + gst;

        var address = {
            name: name,
            phone: '+91' + phone,
            line1: line1,
            city: city,
            state: stateVal,
            pincode: pincode
        };
        if (line2) address.line2 = line2;

        var order = {
            uid: fb.auth.currentUser.uid,
            qtyPurifierOnetime: qtyOnetime,
            qtyPurifierSubscribe: qtySubscribe,
            qtyFilter: qtyFilter,
            subtotal: subtotal,
            gst: gst,
            total: total,
            address: address,
            paymentMethod: 'cod',
            status: 'placed',
            createdAt: fb.serverTimestamp()
        };
        if (qtySubscribe > 0) order.filterInterval = meta.filterInterval;

        placeBtn.disabled = true;
        placeBtn.textContent = 'Placing order...';

        fb.addDoc(fb.collection(fb.db, 'orders'), order).then(function(ref) {
            placeBtn.disabled = false;
            placeBtn.textContent = 'Place Order';
            cart = [];
            updateCartUI();
            showSuccessView(ref.id);
        }).catch(function(err) {
            console.error('Order failed:', err);
            placeBtn.disabled = false;
            placeBtn.textContent = 'Place Order';
            if (checkoutError) {
                checkoutError.textContent = err && err.code === 'permission-denied'
                    ? 'Order could not be validated. Please refresh the page and try again.'
                    : 'Could not place the order. Please check your connection and try again.';
            }
        });
    }

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(e) {
            e.preventDefault();
            placeOrder();
        });
    }

    // ========================================
    // PRICE BREAKDOWN TOGGLE + FILTER UPSELL
    // ========================================
    if (cartBreakdownToggle) {
        cartBreakdownToggle.addEventListener('click', function() {
            var isOpen = cartBreakdownToggle.classList.contains('open');
            cartBreakdownToggle.classList.toggle('open', !isOpen);
            if (cartBreakdown) cartBreakdown.classList.toggle('visible', !isOpen);
        });
    }

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
    // PUBLIC API
    // ========================================
    window.hawaaCart = {
        add: addToCart,
        remove: removeFromCart,
        has: function(id) { return findCartItem(id) >= 0; },
        open: openCart,
        close: closeCart,
        count: getCartCount,
        subtotal: getSubtotal,
        onChange: function(cb) { if (typeof cb === 'function') listeners.push(cb); },
        setFilterInterval: function(interval) {
            if (interval === 5 || interval === 6) {
                meta.filterInterval = interval;
                saveCart();
            }
        }
    };

    // ========================================
    // INITIALIZE
    // ========================================
    updateCartUI();

})();
