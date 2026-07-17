// ========================================
// ABOUT PAGE - JavaScript
// Scroll reveals + stat count-ups.
// Without JS the page stays fully visible:
// reveal styles are gated behind html.ab-js.
// ========================================

(function() {
    'use strict';

    // ========================================
    // HEADER SCROLL EFFECT
    // Transparent over the hero, background after scrolling
    // (same behavior as index.html)
    // ========================================
    var header = document.getElementById('header');

    if (header) {
        var handleHeaderScroll = function() {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        };
        window.addEventListener('scroll', handleHeaderScroll, { passive: true });
        handleHeaderScroll();
    }

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
