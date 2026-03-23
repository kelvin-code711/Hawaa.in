/* ========================================
   HAWAA vs HONEYWELL — Scroll Animations
   Fade-in section + animated infographics
======================================== */
(function () {
    'use strict';

    // Section fade-in on scroll
    var vsSection = document.querySelector('.cmp-vs');
    if (!vsSection) return;

    var cadrInfo = document.getElementById('cmp-vs-cadr-info');
    var costInfo = document.getElementById('cmp-vs-cost-info');
    var cadrAnimated = false;
    var costAnimated = false;

    function animateCylinders() {
        if (cadrAnimated) return;
        cadrAnimated = true;
        var fills = cadrInfo.querySelectorAll('.cmp-vs-cylinder-fill');
        fills.forEach(function (fill) {
            var pct = fill.getAttribute('data-fill');
            fill.style.height = pct + '%';
        });
    }

    function animateBars() {
        if (costAnimated) return;
        costAnimated = true;
        var segs = costInfo.querySelectorAll('.cmp-vs-bar-seg');
        segs.forEach(function (seg) {
            var w = seg.getAttribute('data-width');
            seg.style.width = w + '%';
        });
    }

    // Use IntersectionObserver for scroll-triggered animations
    if ('IntersectionObserver' in window) {
        var sectionObs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    vsSection.classList.add('is-visible');
                    sectionObs.unobserve(vsSection);
                }
            });
        }, { threshold: 0.08 });
        sectionObs.observe(vsSection);

        if (cadrInfo) {
            var cadrObs = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        animateCylinders();
                        cadrObs.unobserve(cadrInfo);
                    }
                });
            }, { threshold: 0.3 });
            cadrObs.observe(cadrInfo);
        }

        if (costInfo) {
            var costObs = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        animateBars();
                        costObs.unobserve(costInfo);
                    }
                });
            }, { threshold: 0.3 });
            costObs.observe(costInfo);
        }
    } else {
        // Fallback: show everything immediately
        vsSection.classList.add('is-visible');
        if (cadrInfo) animateCylinders();
        if (costInfo) animateBars();
    }
})();
