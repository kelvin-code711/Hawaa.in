// ========================================
// GA4 EVENT TRACKING (all pages)
// Exposes window.hawaaAnalytics.track(name, params).
// Only the events in ALLOWED_EVENTS are ever sent; every event
// carries utm_source / utm_medium / utm_campaign when they are
// present in the page URL. Events fired before Firebase Analytics
// finishes loading are queued and flushed by js/firebase.js via
// hawaaAnalytics._connect().
//
// Where each event fires:
//   page_view, scroll_50, scroll_90 — here, on every page
//   view_item, reserve_click        — js/buy.js
//   phone_entered, otp_verified, otp_failed — js/nav.js
//   begin_checkout, purchase, payment_failed — js/cart.js
//   newsletter_signup               — js/script.js
//   waitlist_join                   — call
//     window.hawaaAnalytics.track('waitlist_join') from the waitlist
//     form's submit handler once a waitlist exists on the site
// ========================================

(function () {
    'use strict';

    var ALLOWED_EVENTS = [
        'page_view',
        'scroll_50',
        'scroll_90',
        'view_item',
        'reserve_click',
        'phone_entered',
        'otp_verified',
        'otp_failed',
        'begin_checkout',
        'purchase',
        'payment_failed',
        'waitlist_join',
        'newsletter_signup'
    ];

    // ---- UTM attribution from the page URL (only when present) ----
    var utm = {};
    try {
        var search = new URLSearchParams(window.location.search);
        ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (key) {
            var value = search.get(key);
            if (value) utm[key] = value;
        });
    } catch (e) { /* URLSearchParams unavailable — send without UTMs */ }

    var queue = [];
    var send = null;

    function track(name, params) {
        if (ALLOWED_EVENTS.indexOf(name) === -1) return;

        var payload = {};
        Object.keys(utm).forEach(function (key) {
            payload[key] = utm[key];
        });
        if (params) {
            Object.keys(params).forEach(function (key) {
                payload[key] = params[key];
            });
        }

        if (send) {
            send(name, payload);
        } else {
            queue.push([name, payload]);
        }
    }

    window.hawaaAnalytics = {
        track: track,

        // Called once by js/firebase.js when Firebase Analytics is ready.
        _connect: function (fn) {
            send = fn;
            while (queue.length) {
                var evt = queue.shift();
                send(evt[0], evt[1]);
            }
        }
    };

    // ---- page_view (auto page_view is disabled in js/firebase.js
    // so this is the only one, and it carries the UTM params) ----
    track('page_view', {
        page_location: window.location.href,
        page_path: window.location.pathname,
        page_title: document.title
    });

    // ---- Scroll depth: fire each threshold once per page ----
    var fired50 = false;
    var fired90 = false;

    function onScroll() {
        var doc = document.documentElement;
        var scrollable = doc.scrollHeight - window.innerHeight;
        if (scrollable <= 0) return;
        var pct = ((window.scrollY || doc.scrollTop || 0) / scrollable) * 100;

        if (!fired50 && pct >= 50) {
            fired50 = true;
            track('scroll_50', { percent_scrolled: 50 });
        }
        if (!fired90 && pct >= 90) {
            fired90 = true;
            track('scroll_90', { percent_scrolled: 90 });
        }
        if (fired50 && fired90) {
            window.removeEventListener('scroll', onScroll);
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
})();
