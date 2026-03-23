/* ========================================
   HAWAA vs HONEYWELL — Scroll + Verdict Popup
======================================== */
(function () {
    'use strict';

    /* --- Section fade-in on scroll --- */
    var vsSection = document.querySelector('.cmp-vs');
    if (vsSection) {
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
    }

    /* --- Verdict popup --- */
    var VERDICT_DATA = {
        honeywell: {
            title: 'Hawaa Edge vs Honeywell Air Touch V1',
            context: 'The Honeywell V1 is a real product that works. For a compact room under 200 sq ft, it is adequate. But its 152 m\u00B3/hr CADR was designed for 235 sq ft \u2014 which means most Indian bedrooms are already outside its effective range from day one.',
            pitch: 'In peak pollution months, when Delhi or Mumbai AQI crosses 300, that 8-minute difference in clean air delivery is not a stat on a page. It is how long your family breathes unfiltered air while the machine catches up.',
            closer: 'The Edge costs \u20B91,170 more today. It wins on performance, wins on five-year cost, wins on smart control. The V1\u2019s only advantage is the sticker price \u2014 and it loses even that by year one.'
        }
    };

    var overlay = document.getElementById('cmp-vs-verdict-overlay');
    var body = document.getElementById('cmp-vs-verdict-body');
    var openBtn = document.getElementById('cmp-vs-verdict-open');
    var closeBtn = document.getElementById('cmp-vs-verdict-close');

    if (!overlay || !body || !openBtn || !closeBtn) return;

    function openVerdict(key) {
        var d = VERDICT_DATA[key];
        if (!d) return;
        body.innerHTML =
            '<p class="cmp-vs-popup-label">VERDICT</p>' +
            '<h3 class="cmp-vs-popup-title">' + d.title + '</h3>' +
            '<p class="cmp-vs-popup-context">' + d.context + '</p>' +
            '<p class="cmp-vs-popup-pitch">' + d.pitch + '</p>' +
            '<p class="cmp-vs-popup-closer">' + d.closer + '</p>';
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeVerdict() {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    openBtn.addEventListener('click', function () {
        openVerdict('honeywell');
    });

    closeBtn.addEventListener('click', closeVerdict);

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeVerdict();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
            closeVerdict();
        }
    });
})();
