/* ========================================
   HAWAA vs RIVALS — Scroll + Verdict Popup
======================================== */
(function () {
    'use strict';

    /* --- Section fade-in on scroll --- */
    var vsSections = document.querySelectorAll('.cmp-vs');
    if (vsSections.length && 'IntersectionObserver' in window) {
        var obs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08 });
        vsSections.forEach(function (s) { obs.observe(s); });
    } else {
        vsSections.forEach(function (s) { s.classList.add('is-visible'); });
    }

    /* --- Verdict popup --- */
    var VERDICT_DATA = {
        honeywell: {
            title: 'Hawaa Edge vs Honeywell Air Touch V1',
            context: 'The Honeywell V1 is a real product that works. For a compact room under 200 sq ft, it is adequate. But its 152 m\u00B3/hr CADR was designed for 235 sq ft \u2014 which means most Indian bedrooms are already outside its effective range from day one.',
            pitch: 'In peak pollution months, when Delhi or Mumbai AQI crosses 300, that 8-minute difference in clean air delivery is not a stat on a page. It is how long your family breathes unfiltered air while the machine catches up.',
            closer: 'The Edge costs \u20B91,170 more today. It wins on performance, wins on five-year cost, wins on smart control. The V1\u2019s only advantage is the sticker price \u2014 and it loses even that by year one.'
        },
        'honeywell-v2': {
            title: 'Hawaa Edge vs Honeywell Air Touch V2',
            context: 'Same CADR. Lower price. BLDC motor. Built-in smart control. The V2\u2019s only edge is a larger coverage claim built on a looser standard \u2014 it uses 2 ACH; the Edge is rated at 2.5 ACH, the more conservative and accurate measure.',
            pitch: 'It costs \u20B91,299 more upfront, runs louder, and its filters cost nearly 2.5\u00D7 more every replacement. Over five years, you pay \u20B913,139 extra for the same airflow.',
            closer: 'The Edge matches the V2 on CADR, beats it on price, motor, noise, and smart features \u2014 and saves you \u20B913,139 over five years. There is no scenario where the V2 is a better deal.'
        },
        philips: {
            title: 'Hawaa Edge vs Philips AC0920',
            context: 'Identical CADR. Identical coverage. Same filter grade. The specs aren\u2019t similar \u2014 they are the same. The Philips costs \u20B93,995 more upfront, runs louder, and locks smart features behind a proprietary app.',
            pitch: 'The Edge works directly through Google Home and Alexa the moment you plug it in. No extra app to download, no account to create, no ecosystem to buy into. The Philips requires the Air+ App for any smart functionality.',
            closer: 'Over five years, you save \u20B911,363 with the Edge \u2014 for air that is equally clean. Same CADR, same coverage, same H13 HEPA filtration. The only difference is how much you pay for it.'
        },
        levoit: {
            title: 'Hawaa Edge vs Levoit Core 300',
            context: 'The Core 300 earned its global reputation honestly. But it was engineered for Western room sizes. Its 220 sq ft coverage leaves a standard Indian bedroom \u2014 typically 250 to 300 sq ft \u2014 outside its rated zone from day one.',
            pitch: 'The Edge costs \u20B93,000 less, covers 80 sq ft more, uses a BLDC motor, and its filters cost \u20B92,001 less every single replacement. Over five years, you save \u20B919,008.',
            closer: 'The Levoit\u2019s only advantage is 4 dB lower sleep-mode noise. Everything else \u2014 CADR, coverage, price, filter cost, smart control \u2014 goes to the Edge. And \u20B919,008 buys a lot of silence.'
        },
        'levoit-mini': {
            title: 'Hawaa Edge vs Levoit Core Mini',
            context: 'The Core Mini costs \u20B91,000 less. That is where its advantages end. Its 100 m\u00B3/hr CADR is built for personal spaces \u2014 a desk, a compact nursery, a reading corner. Placed in a standard Indian bedroom, it is not underpowered like a slightly smaller engine is underpowered \u2014 it is simply a different product doing a different job.',
            pitch: 'For \u20B91,000 more, the Edge delivers 2.5\u00D7 the CADR, smart home integration, and a lower five-year cost. The Mini\u2019s filters cost double, and you still end up paying \u20B97,000 more over five years.',
            closer: 'The Core Mini is a fine personal-space purifier. But if you need to clean an actual room, the Edge is the only real option here \u2014 and it costs less to own.'
        }
    };

    var overlay = document.getElementById('cmp-vs-verdict-overlay');
    var body = document.getElementById('cmp-vs-verdict-body');
    var closeBtn = document.getElementById('cmp-vs-verdict-close');

    if (!overlay || !body || !closeBtn) return;

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

    /* Delegate click on all verdict buttons via data-verdict attribute */
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-verdict]');
        if (btn) {
            openVerdict(btn.getAttribute('data-verdict'));
        }
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
