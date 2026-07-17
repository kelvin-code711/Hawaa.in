// ========================================
// ABOUT PAGE - JavaScript
// Scroll reveals + stat count-ups.
// Without JS the page stays fully visible:
// reveal styles are gated behind html.ab-js.
// ========================================

(function() {
    'use strict';

    // The about page sits on a light background, so the header keeps the
    // static "scrolled" treatment from the markup — no scroll toggle here.

    var reduceMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var revealEls = document.querySelectorAll('[data-reveal]');

    if (!('IntersectionObserver' in window) || reduceMotion) {
        return; // content stays visible, numbers stay static
    }

    document.documentElement.classList.add('ab-js');

    // ========================================
    // STAT COUNT-UP
    // ========================================
    function countUp(el) {
        var target = parseInt(el.getAttribute('data-count'), 10);
        if (isNaN(target)) return;

        var duration = 1400;
        var start = null;

        function step(ts) {
            if (start === null) start = ts;
            var progress = Math.min((ts - start) / duration, 1);
            // ease-out cubic
            var eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(eased * target);
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        }

        el.textContent = '0';
        requestAnimationFrame(step);
    }

    // ========================================
    // SCROLL REVEAL
    // ========================================
    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (!entry.isIntersecting) return;

            entry.target.classList.add('is-in');

            entry.target.querySelectorAll('[data-count]').forEach(countUp);

            observer.unobserve(entry.target);
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -8% 0px'
    });

    revealEls.forEach(function(el) {
        observer.observe(el);
    });

})();
