/* ========================================
   HAWAA vs HONEYWELL — Scroll Animation
   Section fade-in on scroll entry
======================================== */
(function () {
    'use strict';

    var vsSection = document.querySelector('.cmp-vs');
    if (!vsSection) return;

    if ('IntersectionObserver' in window) {
        var obs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    vsSection.classList.add('is-visible');
                    obs.unobserve(vsSection);
                }
            });
        }, { threshold: 0.08 });
        obs.observe(vsSection);
    } else {
        vsSection.classList.add('is-visible');
    }
})();
