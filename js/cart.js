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
    var meta = { filterInterval: 5, promoCode: null };
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
            // The code survives navigation, the discount does not: only
            // the server may say what a code is worth, so it is
            // re-validated on load rather than restored from storage.
            meta.promoCode = typeof savedMeta.promoCode === 'string'
                ? savedMeta.promoCode.slice(0, 20) : null;
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
                    '<div class="cart-promo" id="cart-promo" hidden>' +
                        '<div class="cart-promo-offers" id="cart-promo-offers"></div>' +
                        '<button type="button" class="cart-promo-toggle" id="cart-promo-toggle" aria-expanded="false" aria-controls="cart-promo-entry">' +
                            '<span>Have a promo code?</span>' +
                            '<svg class="cart-promo-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>' +
                        '</button>' +
                        '<div class="cart-promo-entry" id="cart-promo-entry" hidden>' +
                            '<input type="text" class="cart-promo-input" id="cart-promo-input" placeholder="Enter code" maxlength="20" autocomplete="off" autocorrect="off" spellcheck="false" autocapitalize="characters" enterkeyhint="done" aria-label="Promo code">' +
                            '<button type="button" class="cart-promo-apply" id="cart-promo-apply" disabled>Apply</button>' +
                        '</div>' +
                        '<div class="cart-promo-applied" id="cart-promo-applied" hidden>' +
                            '<span class="cart-promo-mark" aria-hidden="true">' +
                                '<svg class="cart-promo-mark-ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>' +
                                '<svg class="cart-promo-mark-wait" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.6v5"/><path d="M12 16.2v.01"/></svg>' +
                            '</span>' +
                            '<span class="cart-promo-applied-body">' +
                                '<span class="cart-promo-applied-code" id="cart-promo-applied-code"></span>' +
                                '<span class="cart-promo-applied-note" id="cart-promo-applied-note"></span>' +
                            '</span>' +
                            '<span class="cart-promo-applied-amount" id="cart-promo-applied-amount"></span>' +
                            '<button type="button" class="cart-promo-remove" id="cart-promo-remove" aria-label="Remove promo code">' +
                                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                            '</button>' +
                        '</div>' +
                        '<p class="cart-promo-msg" id="cart-promo-msg" role="status" aria-live="polite"></p>' +
                    '</div>' +
                    '<button class="cart-breakdown-toggle" id="cart-breakdown-toggle">' +
                        '<span>Price Details</span>' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>' +
                    '</button>' +
                    '<div class="cart-breakdown" id="cart-breakdown">' +
                        '<div class="cart-breakdown-row"><span>Subtotal</span><span id="cart-subtotal">₹0</span></div>' +
                        '<div class="cart-breakdown-row cart-breakdown-discount" id="cart-discount-row" hidden><span id="cart-discount-label">Discount</span><span id="cart-discount">−₹0</span></div>' +
                        '<div class="cart-breakdown-row"><span>GST (18%)</span><span id="cart-gst">₹0</span></div>' +
                        '<div class="cart-breakdown-row"><span>Delivery Fee</span><span id="cart-delivery" class="cart-free">Free</span></div>' +
                        '<div class="cart-breakdown-row"><span>Shipping Fee</span><span id="cart-shipping" class="cart-free">Free</span></div>' +
                    '</div>' +
                    '<div class="cart-total-row" id="cart-total-row">' +
                        '<span>Total</span>' +
                        '<span class="cart-total-value">' +
                            '<span id="cart-total">₹0</span>' +
                            '<small class="cart-savings" id="cart-savings" hidden></small>' +
                        '</span>' +
                    '</div>' +
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
                        '<h3 class="checkout-title checkout-pay-title">Payment method</h3>' +
                        '<div class="checkout-pay-methods" id="checkout-pay-methods">' +
                            '<label class="checkout-pay-option">' +
                                '<input type="radio" name="co-pay-method" value="razorpay">' +
                                '<span class="checkout-pay-label">Pay Online<small>UPI · Cards · Netbanking</small></span>' +
                            '</label>' +
                            '<label class="checkout-pay-option">' +
                                '<input type="radio" name="co-pay-method" value="cod" checked>' +
                                '<span class="checkout-pay-label">Cash on Delivery<small>Pay when it arrives</small></span>' +
                            '</label>' +
                        '</div>' +
                        '<p class="checkout-error" id="checkout-error"></p>' +
                        '<div class="checkout-promo-row" id="checkout-promo-row" hidden>' +
                            '<span>Promo <b id="checkout-promo-code"></b></span>' +
                            '<span id="checkout-promo-amount">−₹0</span>' +
                        '</div>' +
                        '<div class="checkout-total-row"><span id="checkout-total-label">Total</span><span id="checkout-total">₹0</span></div>' +
                        '<button type="submit" class="cart-checkout-btn" id="checkout-place-btn">Place Order</button>' +
                    '</form>' +
                '</div>' +
                '<div class="checkout-view hidden" id="order-success-view">' +
                    '<div class="checkout-success-icon">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>' +
                    '</div>' +
                    '<h3 class="checkout-title" style="text-align:center;">Order placed!</h3>' +
                    '<p class="checkout-success-text">Order ID: <strong id="order-success-id"></strong></p>' +
                    '<p class="checkout-success-saved" id="order-success-saved" hidden></p>' +
                    '<p class="checkout-success-text" id="order-success-note">Pay in cash when your Hawaa arrives. Track it anytime on your <a href="account.html">account page</a>.</p>' +
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
    var cartTotalRow = document.getElementById('cart-total-row');
    var cartSavings = document.getElementById('cart-savings');
    var cartDiscountRow = document.getElementById('cart-discount-row');
    var cartDiscountLabel = document.getElementById('cart-discount-label');
    var cartDiscount = document.getElementById('cart-discount');
    var cartTitleCount = document.getElementById('cart-title-count');
    var cartEmptyCta = document.getElementById('cart-empty-cta');

    var promoWrap = document.getElementById('cart-promo');
    var promoOffersBox = document.getElementById('cart-promo-offers');
    var promoToggle = document.getElementById('cart-promo-toggle');
    var promoEntry = document.getElementById('cart-promo-entry');
    var promoInput = document.getElementById('cart-promo-input');
    var promoApplyBtn = document.getElementById('cart-promo-apply');
    var promoAppliedBox = document.getElementById('cart-promo-applied');
    var promoMark = document.getElementById('cart-promo-mark');
    var promoAppliedCode = document.getElementById('cart-promo-applied-code');
    var promoAppliedNote = document.getElementById('cart-promo-applied-note');
    var promoAppliedAmount = document.getElementById('cart-promo-applied-amount');
    var promoRemoveBtn = document.getElementById('cart-promo-remove');
    var promoMsg = document.getElementById('cart-promo-msg');

    var checkoutPromoRow = document.getElementById('checkout-promo-row');
    var checkoutPromoCode = document.getElementById('checkout-promo-code');
    var checkoutPromoAmount = document.getElementById('checkout-promo-amount');
    var successSaved = document.getElementById('order-success-saved');

    var checkoutBtn = document.getElementById('cart-checkout-btn');
    var checkoutView = document.getElementById('checkout-view');
    var checkoutBack = document.getElementById('checkout-back');
    var checkoutForm = document.getElementById('checkout-form');
    var checkoutError = document.getElementById('checkout-error');
    var checkoutTotal = document.getElementById('checkout-total');
    var checkoutTotalLabel = document.getElementById('checkout-total-label');
    var placeBtn = document.getElementById('checkout-place-btn');
    var successView = document.getElementById('order-success-view');
    var successId = document.getElementById('order-success-id');
    var successNote = document.getElementById('order-success-note');
    var successDone = document.getElementById('order-success-done');
    var cartBody = document.getElementById('cart-body');
    var payMethodBox = document.getElementById('checkout-pay-methods');

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

    function gaItems() {
        return cart.map(function(item) {
            return {
                item_id: item.id,
                item_name: item.name,
                item_variant: item.variant,
                price: item.price,
                quantity: item.qty
            };
        });
    }

    function gaTrack(name, params) {
        if (window.hawaaAnalytics) window.hawaaAnalytics.track(name, params);
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

    // Quantities per SKU — the only thing the server needs to price the
    // cart, and the only thing it will accept. Colour is a suffix on the
    // purifier id (e.g. 'purifier-onetime-grey'); both colours share the
    // same SKU price, so match by prefix. Plain ids from carts saved
    // before colours existed still match too.
    function cartQuantities() {
        var q = { qtyPurifierOnetime: 0, qtyPurifierSubscribe: 0, qtyFilter: 0 };
        for (var i = 0; i < cart.length; i++) {
            if (cart[i].id.indexOf('purifier-onetime') === 0) q.qtyPurifierOnetime += cart[i].qty;
            else if (cart[i].id.indexOf('purifier-subscribe') === 0) q.qtyPurifierSubscribe += cart[i].qty;
            else if (cart[i].id === 'filter') q.qtyFilter += cart[i].qty;
        }
        return q;
    }

    // Identifies exactly what was priced. A promo answer that names a
    // different cart arrived after the shopper changed their mind, and
    // is thrown away rather than shown.
    function cartKey() {
        var q = cartQuantities();
        return q.qtyPurifierOnetime + '-' + q.qtyPurifierSubscribe + '-' + q.qtyFilter;
    }

    // ========================================
    // PROMO CODES
    //
    // This file contains no discount arithmetic, deliberately. Prices
    // and GST are mirrored here, in firestore.rules and in the Cloud
    // Functions because all three have to agree; a discount has one
    // implementation, on the server, and every rupee shown below came
    // back from validatePromoCode. Nothing here can drift, because
    // there is nothing here to drift from.
    // ========================================
    var promo = {
        code: null,       // attached code, uppercase
        discount: 0,      // 0 while attached but not currently qualifying
        headline: '',
        pricing: null,    // server totals, valid for pricedKey only
        pricedKey: '',
        state: 'none',    // none | checking | applied | blocked | error
        message: ''
    };

    var featuredOffers = [];
    var promoSeq = 0;
    var promoTimer = null;

    // Refusals that describe the cart rather than the code: the shopper
    // can fix them by adding something, so the code stays attached and
    // re-applies itself the moment it qualifies.
    var RECOVERABLE = ['below-minimum', 'not-applicable', 'empty-cart'];

    function promoAvailable() {
        var fb = window.hawaaFirebase;
        return !!(fb && fb.functions && fb.httpsCallable);
    }

    function callValidate(code) {
        var fb = window.hawaaFirebase;
        var q = cartQuantities();
        var validate = fb.httpsCallable(fb.functions, 'validatePromoCode');
        return validate({
            code: code,
            qtyPurifierOnetime: q.qtyPurifierOnetime,
            qtyPurifierSubscribe: q.qtyPurifierSubscribe,
            qtyFilter: q.qtyFilter,
            cartKey: cartKey()
        }).then(function (res) { return res.data; });
    }

    function clearPromo(message) {
        promo.code = null;
        promo.discount = 0;
        promo.headline = '';
        promo.pricing = null;
        promo.pricedKey = '';
        promo.state = message ? 'error' : 'none';
        promo.message = message || '';
        meta.promoCode = null;
        saveCart();
    }

    function absorbResult(code, data) {
        if (data && data.ok) {
            promo.code = code;
            promo.discount = data.discount;
            promo.headline = data.headline || '';
            promo.pricing = data.pricing;
            promo.pricedKey = data.cartKey || cartKey();
            promo.state = 'applied';
            // Per-account rules cannot be answered for a signed-out
            // shopper. Say so plainly rather than promising a discount
            // that checkout might take back.
            promo.message = (data.deferred && data.deferred.length)
                ? 'Sign in at checkout to confirm this offer.'
                : '';
            meta.promoCode = code;
            saveCart();
            return;
        }

        var message = (data && data.message) ||
            'That code could not be applied. Please try again.';
        if (data && RECOVERABLE.indexOf(data.reason) !== -1) {
            promo.code = code;
            promo.discount = 0;
            promo.pricing = null;
            promo.pricedKey = '';
            promo.state = 'blocked';
            promo.message = message;
            meta.promoCode = code;
            saveCart();
            return;
        }
        clearPromo(message);
    }

    // `silent` is set for the automatic re-check after a cart change:
    // a code that stops qualifying should update quietly, not flash an
    // error at someone who only tapped "+".
    function checkPromo(code, silent) {
        if (!promoAvailable()) return Promise.resolve();
        var seq = ++promoSeq;
        var keyAtSend = cartKey();
        if (!silent || promo.state === 'applied') {
            promo.state = 'checking';
            renderPromo();
        }

        return callValidate(code).then(function (data) {
            // A stale answer, or one that priced a cart the shopper has
            // since changed. The newer request is already in flight.
            if (seq !== promoSeq) return;
            if (data && data.cartKey && data.cartKey !== cartKey()) return;
            absorbResult(code, data);
            updatePriceBreakdown();
            renderPromo();
            renderOffers();
        }).catch(function (err) {
            if (seq !== promoSeq) return;
            console.warn('Promo check failed:', err);
            // Offline or throttled. Keep whatever was already applied —
            // the order path re-validates and is the check that binds —
            // but never invent a discount that was not granted.
            if (promo.state === 'checking') {
                promo.state = promo.discount > 0 ? 'applied' : 'blocked';
            }
            if (!silent) {
                // Surface the underlying code the way the Razorpay path
                // does. "Check your connection" sent a real server fault
                // back as a wifi problem once already; the code makes
                // the difference visible in a screenshot.
                var detail = (err && (err.code || err.message)) || 'unknown';
                promo.message = (err && err.code === 'functions/resource-exhausted')
                    ? 'Too many attempts. Please try again in a few minutes.'
                    : 'Could not check that code. Please try again. (' + detail + ')';
            }
            renderPromo();
        });
    }

    function applyPromoFromInput(code, source) {
        var cleaned = String(code || '').replace(/\s+/g, '').toUpperCase();
        if (cleaned.length < 3) return;
        if (!promoAvailable()) {
            promo.state = 'error';
            promo.message = 'Promo codes are unavailable right now. Please refresh the page.';
            renderPromo();
            return;
        }
        promo.message = '';
        checkPromo(cleaned, false).then(function () {
            if (promo.state === 'applied') {
                if (promoInput) promoInput.value = '';
                setPromoEntryOpen(false);
                gaTrack('select_promotion', {
                    promotion_id: cleaned,
                    creative_slot: source || 'input',
                    items: gaItems()
                });
            }
        });
    }

    // Re-priced on every cart change, debounced so holding "+" does not
    // fire a call per tap.
    function schedulePromoRecheck() {
        if (!promo.code) return;
        if (promoTimer) clearTimeout(promoTimer);
        promoTimer = setTimeout(function () {
            promoTimer = null;
            if (promo.code) checkPromo(promo.code, true);
        }, 350);
    }

    // ---- Featured offers (public, admin-curated) ----
    // Read straight from Firestore rather than through a callable: this
    // has to be on screen before the drawer finishes opening, and a cold
    // function is slower than a cached document read.
    function loadFeaturedOffers() {
        var fb = window.hawaaFirebase;
        if (!fb || !fb.getDoc || !fb.doc) return;
        fb.getDoc(fb.doc(fb.db, 'promo_public', 'featured')).then(function (snap) {
            if (!snap.exists()) return;
            var data = snap.data() || {};
            featuredOffers = Array.isArray(data.offers) ? data.offers : [];
            renderOffers();
        }).catch(function () { /* no offers is a normal state */ });
    }

    // Only offers this cart already qualifies for are shown. An offer
    // that fails when tapped is worse than no offer at all.
    function eligibleOffers() {
        if (!promoAvailable() || promo.code || cart.length === 0) return [];
        var q = cartQuantities();
        var subtotal = getSubtotal();
        var now = Date.now();
        return featuredOffers.filter(function (offer) {
            if (!offer || !offer.code) return false;
            // The published list is rebuilt when a code is edited, not
            // when its clock runs out, so the window is checked here.
            if (offer.startsAt && now < offer.startsAt) return false;
            if (offer.expiresAt && now >= offer.expiresAt) return false;
            if (offer.minSubtotal && subtotal < offer.minSubtotal) return false;
            if (offer.appliesTo === 'filter' && q.qtyFilter === 0) return false;
            if (offer.appliesTo === 'purifier' &&
                q.qtyPurifierOnetime + q.qtyPurifierSubscribe === 0) return false;
            return true;
        }).slice(0, 2);
    }

    function escapeText(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function renderOffers() {
        if (!promoOffersBox) return;
        var offers = eligibleOffers();
        // Built to the same bones as the Add-Replacement-Filter row it
        // sits beside — icon, two lines of text, one pill — so an offer
        // reads as part of the cart rather than an ad pasted into it.
        promoOffersBox.innerHTML = offers.map(function (offer) {
            return '<button type="button" class="cart-promo-offer" data-code="' +
                escapeText(offer.code) + '">' +
                '<svg class="cart-promo-offer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                    '<path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0l-7.2-7.2a2 2 0 01-.6-1.4V4a1 1 0 011-1h8a2 2 0 011.4.6l7.4 7.4a2 2 0 010 2.8z"/>' +
                    '<circle cx="7.5" cy="7.5" r="1.2"/></svg>' +
                '<span class="cart-promo-offer-body">' +
                    '<span class="cart-promo-offer-headline">' + escapeText(offer.headline) + '</span>' +
                    '<span class="cart-promo-offer-code">Code ' + escapeText(offer.code) + '</span>' +
                '</span>' +
                '<span class="cart-promo-offer-apply">Apply</span>' +
                '</button>';
        }).join('');
        promoOffersBox.hidden = offers.length === 0;
    }

    function setPromoEntryOpen(open) {
        if (!promoEntry || !promoToggle) return;
        promoEntry.hidden = !open;
        promoToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        promoToggle.classList.toggle('open', open);
        if (open && promoInput) promoInput.focus();
    }

    function renderPromo() {
        if (!promoWrap) return;

        // Nothing to offer and no way to check a code: show no promo UI
        // at all rather than a field that cannot work.
        promoWrap.hidden = cart.length === 0 || !promoAvailable();

        var attached = !!promo.code;
        var checking = promo.state === 'checking';

        if (promoAppliedBox) {
            promoAppliedBox.hidden = !attached;
            promoAppliedBox.classList.toggle('is-blocked', promo.state === 'blocked');
            promoAppliedBox.classList.toggle('is-checking', checking);
        }
        if (promoToggle) promoToggle.hidden = attached;
        if (attached) setPromoEntryOpen(false);

        if (attached) {
            if (promoAppliedCode) promoAppliedCode.textContent = promo.code;
            if (promoAppliedNote) {
                promoAppliedNote.textContent = promo.state === 'blocked'
                    ? 'Not applied yet'
                    : (promo.headline || 'Discount applied');
            }
            if (promoAppliedAmount) {
                promoAppliedAmount.textContent = promo.discount > 0
                    ? '−' + formatPrice(promo.discount)
                    : '';
            }
            if (promoRemoveBtn) {
                promoRemoveBtn.setAttribute('aria-label', 'Remove promo code ' + promo.code);
            }
        }

        if (promoMsg) {
            promoMsg.textContent = checking ? '' : promo.message;
            promoMsg.hidden = checking || !promo.message;
            promoMsg.className = 'cart-promo-msg' +
                (promo.state === 'error' ? ' is-error' : '') +
                (promo.state === 'blocked' ? ' is-warning' : '');
        }

        if (promoApplyBtn && promoInput) {
            promoApplyBtn.disabled = checking ||
                promoInput.value.replace(/\s+/g, '').length < 3;
            promoApplyBtn.textContent = checking ? 'Checking…' : 'Apply';
        }
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
        renderPromo();
        renderOffers();
        schedulePromoRecheck();

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

    // The totals the shopper is looking at. With a promo applied these
    // are the server's own figures, echoed back — the cart never adds
    // a discount to a number it worked out itself, so what is on screen
    // is always a quote something actually issued.
    function currentPricing() {
        if (promo.state === 'applied' && promo.pricing &&
            promo.pricedKey === cartKey()) {
            return promo.pricing;
        }
        var subtotal = getSubtotal();
        var gst = gstOf(subtotal);
        return { subtotal: subtotal, discount: 0, taxable: subtotal, gst: gst,
            total: subtotal + gst };
    }

    function updatePriceBreakdown() {
        var pricing = currentPricing();
        var subtotal = pricing.subtotal;
        var gst = pricing.gst;
        var delivery = 0;
        var shipping = 0;
        var total = pricing.total + delivery + shipping;

        if (cartSubtotal) cartSubtotal.textContent = formatPrice(subtotal);
        if (cartGst) cartGst.textContent = formatPrice(gst);

        if (cartDiscountRow) cartDiscountRow.hidden = pricing.discount <= 0;
        if (pricing.discount > 0) {
            if (cartDiscountLabel) cartDiscountLabel.textContent = 'Discount (' + promo.code + ')';
            if (cartDiscount) cartDiscount.textContent = '−' + formatPrice(pricing.discount);
        }
        if (cartSavings) {
            cartSavings.hidden = pricing.discount <= 0;
            cartSavings.textContent = pricing.discount > 0
                ? 'You save ' + formatPrice(pricing.discount) : '';
        }
        // A quiet dip while a re-check is in flight: the number stays
        // put so nothing jumps, but it stops looking settled.
        if (cartTotalRow) {
            cartTotalRow.classList.toggle('is-updating', promo.state === 'checking');
        }

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

    // Another tab changed the cart: re-read and re-render. A code
    // applied in the other tab arrives as a code, never as a discount,
    // so it is re-priced here before it can affect a total.
    window.addEventListener('storage', function(e) {
        if (e.key !== CART_STORAGE_KEY && e.key !== META_STORAGE_KEY) return;
        loadCart();
        if (meta.promoCode !== promo.code) {
            promoSeq++;
            promo.code = meta.promoCode;
            promo.discount = 0;
            promo.pricing = null;
            promo.pricedKey = '';
            promo.state = meta.promoCode ? 'blocked' : 'none';
            promo.message = '';
        }
        updateCartUI();
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

    // ---- Payment method (COD vs Razorpay online) ----
    function getPayMethod() {
        var checked = payMethodBox &&
            payMethodBox.querySelector('input[name="co-pay-method"]:checked');
        return checked ? checked.value : 'cod';
    }

    function refreshPayMethodUI() {
        var method = getPayMethod();
        var total = currentPricing().total;
        if (checkoutTotalLabel) {
            checkoutTotalLabel.textContent = method === 'cod'
                ? 'Total (Cash on Delivery)'
                : 'Total';
        }
        if (placeBtn && !placeBtn.disabled) {
            placeBtn.textContent = method === 'cod'
                ? 'Place Order'
                : 'Pay ' + formatPrice(total);
        }
    }

    if (payMethodBox) {
        payMethodBox.addEventListener('change', refreshPayMethodUI);
    }

    // Keeps the checkout screen's numbers in step with the cart's. Also
    // called after a re-quote, which is why it does not reset the error
    // line.
    function refreshCheckoutTotals() {
        var pricing = currentPricing();
        if (checkoutTotal) checkoutTotal.textContent = formatPrice(pricing.total);
        if (checkoutPromoRow) checkoutPromoRow.hidden = pricing.discount <= 0;
        if (pricing.discount > 0) {
            if (checkoutPromoCode) checkoutPromoCode.textContent = promo.code;
            if (checkoutPromoAmount) {
                checkoutPromoAmount.textContent = '−' + formatPrice(pricing.discount);
            }
        }
        refreshPayMethodUI();
    }

    function showCheckoutView() {
        if (cartBody) cartBody.classList.add('hidden');
        if (cartFooter) cartFooter.classList.add('hidden');
        if (successView) successView.classList.add('hidden');
        if (checkoutView) checkoutView.classList.remove('hidden');

        if (checkoutError) checkoutError.textContent = '';
        refreshCheckoutTotals();

        // The moment the amount actually matters. Re-quote so the figure
        // above "Place Order" is a fresh answer from the server — by now
        // the shopper has signed in, so the per-account rules that were
        // skipped in the cart are finally answerable.
        if (promo.code) {
            checkPromo(promo.code, true).then(function () {
                if (checkoutView && !checkoutView.classList.contains('hidden')) {
                    refreshCheckoutTotals();
                    if (promo.state !== 'applied' && promo.message && checkoutError) {
                        checkoutError.textContent = promo.message;
                    }
                }
            });
        }

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

    function showSuccessView(orderId, method, saved) {
        if (cartBody) cartBody.classList.add('hidden');
        if (cartFooter) cartFooter.classList.add('hidden');
        if (checkoutView) checkoutView.classList.add('hidden');
        if (successView) successView.classList.remove('hidden');
        if (successId) successId.textContent = orderId;
        if (successSaved) {
            successSaved.hidden = !saved;
            successSaved.textContent = saved ? 'You saved ' + formatPrice(saved) : '';
        }
        if (successNote) {
            // Static strings only — safe as innerHTML (keeps the account link).
            successNote.innerHTML = method === 'razorpay'
                ? 'Payment received. Track your order anytime on your <a href="account.html">account page</a>.'
                : 'Pay in cash when your Hawaa arrives. Track it anytime on your <a href="account.html">account page</a>.';
        }
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
            var pricing = currentPricing();
            gaTrack('begin_checkout', {
                currency: 'INR',
                value: pricing.total,
                coupon: (promo.state === 'applied' && promo.code) || undefined,
                discount: pricing.discount || undefined,
                items: gaItems()
            });
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
        var quantities = cartQuantities();
        var qtyOnetime = quantities.qtyPurifierOnetime;
        var qtySubscribe = quantities.qtyPurifierSubscribe;
        var qtyFilter = quantities.qtyFilter;
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

        // Snapshot items before the cart is cleared on success.
        var orderedItems = gaItems();
        // Only a code the server has already accepted for this exact
        // cart may be sent; it re-checks anyway, but sending a code the
        // shopper has been shown as "not applied yet" would produce an
        // error they were not expecting.
        var promoCode = (promo.state === 'applied' && promo.code) ? promo.code : null;
        var discount = 0;
        if (promoCode) {
            var quoted = currentPricing();
            total = quoted.total;
            discount = quoted.discount;
        }

        if (getPayMethod() === 'razorpay') {
            payWithRazorpay({
                qtyOnetime: qtyOnetime,
                qtySubscribe: qtySubscribe,
                qtyFilter: qtyFilter,
                address: address,
                total: total,
                discount: discount,
                promoCode: promoCode,
                orderedItems: orderedItems
            });
            return;
        }

        if (promoCode) {
            placeDiscountedOrder({
                qtyOnetime: qtyOnetime,
                qtySubscribe: qtySubscribe,
                qtyFilter: qtyFilter,
                address: address,
                promoCode: promoCode,
                orderedItems: orderedItems
            });
            return;
        }

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

        setPlaceBtnBusy('Placing order...');

        fb.addDoc(fb.collection(fb.db, 'orders'), order).then(function(ref) {
            setPlaceBtnReady();
            completeOrder(ref.id, 'cod', {
                total: total,
                discount: 0,
                promoCode: null,
                orderedItems: orderedItems
            });
        }).catch(function(err) {
            console.error('Order failed:', err);
            gaTrack('payment_failed', {
                currency: 'INR',
                value: total,
                payment_type: 'cod',
                error_code: (err && err.code) || 'unknown'
            });
            setPlaceBtnReady();
            if (checkoutError) {
                checkoutError.textContent = err && err.code === 'permission-denied'
                    ? 'Order could not be validated. Please refresh the page and try again.'
                    : 'Could not place the order. Please check your connection and try again.';
            }
        });
    }

    // Shared tail of every successful order, whichever path placed it.
    // Clearing the promo matters: a single-use code left attached would
    // make the next cart look discounted until the first re-check.
    function completeOrder(orderId, method, ctx) {
        gaTrack('purchase', {
            transaction_id: orderId,
            currency: 'INR',
            value: ctx.total,
            payment_type: method,
            coupon: ctx.promoCode || undefined,
            discount: ctx.discount || undefined,
            items: ctx.orderedItems
        });
        cart = [];
        promoSeq++; // no in-flight answer may resurrect the code
        clearPromo('');
        updateCartUI();
        showSuccessView(orderId, method, ctx.discount);
    }

    // Cash on Delivery with a promo code. The undiscounted path writes
    // the order straight to Firestore under firestore.rules; this one
    // cannot, because rules have no way to check a usage limit and
    // increment a counter in the same breath. So the server places it.
    function placeDiscountedOrder(ctx) {
        var fb = window.hawaaFirebase;
        if (!promoAvailable()) {
            if (checkoutError) {
                checkoutError.textContent = 'Promo codes are unavailable right now. ' +
                    'Please refresh the page and try again.';
            }
            return;
        }

        var payload = {
            qtyPurifierOnetime: ctx.qtyOnetime,
            qtyPurifierSubscribe: ctx.qtySubscribe,
            qtyFilter: ctx.qtyFilter,
            address: ctx.address,
            promoCode: ctx.promoCode
        };
        if (ctx.qtySubscribe > 0) payload.filterInterval = meta.filterInterval;

        setPlaceBtnBusy('Placing order...');
        if (checkoutError) checkoutError.textContent = '';

        fb.httpsCallable(fb.functions, 'placePromoOrder')(payload).then(function(result) {
            setPlaceBtnReady();
            var pricing = (result.data && result.data.pricing) || {};
            completeOrder(result.data.orderId, 'cod', {
                total: pricing.total,
                discount: pricing.discount,
                promoCode: ctx.promoCode,
                orderedItems: ctx.orderedItems
            });
        }).catch(function(err) {
            console.error('Promo order failed:', err);
            setPlaceBtnReady();
            gaTrack('payment_failed', {
                currency: 'INR',
                payment_type: 'cod',
                coupon: ctx.promoCode,
                error_code: (err && err.code) || 'unknown'
            });
            if (!checkoutError) return;
            // failed-precondition carries the server's own sentence
            // about why the code stopped working. Drop the code so the
            // shopper can simply place the order at full price.
            if (err && err.code === 'functions/failed-precondition') {
                checkoutError.textContent = err.message +
                    ' The code has been removed — you can place the order without it.';
                promoSeq++;
                clearPromo('');
                updatePriceBreakdown();
                renderPromo();
                refreshCheckoutTotals();
            } else {
                checkoutError.textContent =
                    'Could not place the order. Please check your connection and try again.';
            }
        });
    }

    // ========================================
    // ONLINE PAYMENT (Razorpay via Cloud Functions)
    // The browser only sends quantities + address; the Cloud Function
    // recomputes the amount from the fixed catalog, creates the
    // Razorpay order, and (after signature verification) writes the
    // real order with the Admin SDK. Amounts can't be tampered with
    // on either path.
    // ========================================
    var razorpayScriptPromise = null;

    function setPlaceBtnBusy(label) {
        if (!placeBtn) return;
        placeBtn.disabled = true;
        placeBtn.textContent = label;
    }

    function setPlaceBtnReady() {
        if (!placeBtn) return;
        placeBtn.disabled = false;
        refreshPayMethodUI();
    }

    function loadRazorpayScript() {
        if (window.Razorpay) return Promise.resolve();
        if (razorpayScriptPromise) return razorpayScriptPromise;
        razorpayScriptPromise = new Promise(function(resolve, reject) {
            var s = document.createElement('script');
            s.src = 'https://checkout.razorpay.com/v1/checkout.js';
            s.onload = resolve;
            s.onerror = function() {
                razorpayScriptPromise = null;
                reject(new Error('razorpay-script-load'));
            };
            document.head.appendChild(s);
        });
        return razorpayScriptPromise;
    }

    function payWithRazorpay(ctx) {
        var fb = window.hawaaFirebase;
        if (!fb || !fb.auth.currentUser) return;
        if (!fb.httpsCallable || !fb.functions) {
            // Stale cached js/firebase.js without the functions SDK.
            if (checkoutError) {
                checkoutError.textContent = 'Online payment is unavailable right now. Please refresh the page or choose Cash on Delivery.';
            }
            return;
        }

        setPlaceBtnBusy('Starting payment...');
        if (checkoutError) checkoutError.textContent = '';

        var payload = {
            qtyPurifierOnetime: ctx.qtyOnetime,
            qtyPurifierSubscribe: ctx.qtySubscribe,
            qtyFilter: ctx.qtyFilter,
            address: ctx.address
        };
        if (ctx.qtySubscribe > 0) payload.filterInterval = meta.filterInterval;
        if (ctx.promoCode) payload.promoCode = ctx.promoCode;

        var createOrder = fb.httpsCallable(fb.functions, 'createRazorpayOrder');

        Promise.all([loadRazorpayScript(), createOrder(payload)]).then(function(results) {
            var data = results[1].data;
            var user = fb.auth.currentUser;
            var settled = false; // guards against dismiss firing after success

            var rz = new window.Razorpay({
                key: data.keyId,
                order_id: data.razorpayOrderId,
                amount: data.amount,
                currency: data.currency,
                name: 'Hawaa',
                description: 'Hawaa air purifier order',
                prefill: {
                    name: ctx.address.name,
                    contact: ctx.address.phone,
                    email: (user && user.email) || ''
                },
                theme: { color: '#2E3238' },
                handler: function(resp) {
                    settled = true;
                    confirmRazorpayPayment(resp, ctx);
                },
                modal: {
                    ondismiss: function() {
                        if (settled) return;
                        setPlaceBtnReady();
                        gaTrack('payment_failed', {
                            currency: 'INR',
                            value: ctx.total,
                            payment_type: 'razorpay',
                            error_code: 'dismissed'
                        });
                        if (checkoutError) {
                            checkoutError.textContent = 'Payment cancelled — you have not been charged.';
                        }
                    }
                }
            });

            rz.on('payment.failed', function(resp) {
                gaTrack('payment_failed', {
                    currency: 'INR',
                    value: ctx.total,
                    payment_type: 'razorpay',
                    error_code: (resp && resp.error && resp.error.code) || 'unknown'
                });
                if (checkoutError) {
                    checkoutError.textContent = 'Payment failed. You can retry or choose Cash on Delivery.';
                }
            });

            rz.open();
        }).catch(function(err) {
            console.error('Could not start payment:', err);
            setPlaceBtnReady();
            if (!checkoutError) return;
            // The promo stopped qualifying between the cart and here.
            // The server said why; drop the code and let them pay full
            // price rather than leaving them stuck at a dead button.
            if (err && err.code === 'functions/failed-precondition' && ctx.promoCode) {
                checkoutError.textContent = err.message +
                    ' The code has been removed — you can pay without it.';
                promoSeq++;
                clearPromo('');
                updatePriceBreakdown();
                renderPromo();
                refreshCheckoutTotals();
                return;
            }
            // Surface the underlying code — "(functions/not-found)",
            // "(functions/unavailable)" etc. — so failures can be
            // diagnosed from a screenshot instead of the console.
            var detail = (err && (err.code || err.message)) || 'unknown';
            checkoutError.textContent = (err && err.message === 'razorpay-script-load')
                ? 'Could not load the payment window. Please check your connection and try again.'
                : 'Could not start the payment. Please try again or choose Cash on Delivery. (' + detail + ')';
        });
    }

    function confirmRazorpayPayment(resp, ctx) {
        var fb = window.hawaaFirebase;
        setPlaceBtnBusy('Confirming payment...');

        var verify = fb.httpsCallable(fb.functions, 'verifyRazorpayPayment');
        verify({
            razorpayOrderId: resp.razorpay_order_id,
            razorpayPaymentId: resp.razorpay_payment_id,
            razorpaySignature: resp.razorpay_signature
        }).then(function(result) {
            setPlaceBtnReady();
            completeOrder(result.data.orderId, 'razorpay', {
                total: ctx.total,
                discount: ctx.discount,
                promoCode: ctx.promoCode,
                orderedItems: ctx.orderedItems
            });
        }).catch(function(err) {
            console.error('Payment verification failed:', err);
            setPlaceBtnReady();
            if (checkoutError) {
                checkoutError.textContent = 'Your payment went through but we could not confirm it. ' +
                    'Please contact support with payment ID ' + resp.razorpay_payment_id + '.';
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

    // ========================================
    // PROMO INTERACTIONS
    // ========================================
    if (promoToggle) {
        promoToggle.addEventListener('click', function() {
            var open = promoToggle.getAttribute('aria-expanded') === 'true';
            promo.message = '';
            setPromoEntryOpen(!open);
            renderPromo();
        });
    }

    if (promoInput) {
        promoInput.addEventListener('input', function() {
            // Codes are uppercase everywhere they are printed; typing
            // them in lowercase should not feel like a mistake.
            var upper = promoInput.value.toUpperCase();
            if (upper !== promoInput.value) promoInput.value = upper;
            if (promo.state === 'error') {
                promo.state = 'none';
                promo.message = '';
            }
            renderPromo();
        });

        promoInput.addEventListener('keydown', function(e) {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            applyPromoFromInput(promoInput.value, 'input');
        });
    }

    if (promoApplyBtn) {
        promoApplyBtn.addEventListener('click', function() {
            applyPromoFromInput(promoInput ? promoInput.value : '', 'input');
        });
    }

    if (promoRemoveBtn) {
        promoRemoveBtn.addEventListener('click', function() {
            promoSeq++; // cancel any answer still in flight
            clearPromo('');
            updatePriceBreakdown();
            renderPromo();
            renderOffers();
        });
    }

    if (promoOffersBox) {
        promoOffersBox.addEventListener('click', function(e) {
            var offer = e.target.closest('.cart-promo-offer');
            if (offer) applyPromoFromInput(offer.getAttribute('data-code'), 'featured_offer');
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
        },
        // Lets a landing page honour ?promo=CODE, or a campaign banner
        // apply its own offer, without reaching into cart internals.
        applyPromo: function(code) { applyPromoFromInput(code, 'external'); },
        promo: function() {
            return { code: promo.code, discount: promo.discount, state: promo.state };
        },
        pricing: currentPricing
    };

    // ========================================
    // INITIALIZE
    // ========================================
    // A code can arrive in the URL from an email or an ad. An explicit
    // link wins over a code left in storage from a previous visit.
    try {
        var urlPromo = new URLSearchParams(window.location.search).get('promo');
        if (urlPromo) {
            meta.promoCode = String(urlPromo).replace(/\s+/g, '').toUpperCase().slice(0, 20);
            saveCart();
        }
    } catch (e) { /* no URLSearchParams support */ }

    // A code restored from storage or a link is only a claim until the
    // server agrees, so it starts blocked and worth nothing.
    if (meta.promoCode) {
        promo.code = meta.promoCode;
        promo.state = 'blocked';
    }
    updateCartUI();

    // Firestore and the callables are loaded as a module, so they may
    // arrive after this script has already rendered. Pick the offers up
    // whenever that happens, then re-price any restored code.
    function onFirebaseReady() {
        loadFeaturedOffers();
        renderPromo();
        if (promo.code) checkPromo(promo.code, true);
    }

    if (window.hawaaFirebase) {
        onFirebaseReady();
    } else {
        document.addEventListener('hawaa-firebase-ready', onFirebaseReady, { once: true });
    }

})();
