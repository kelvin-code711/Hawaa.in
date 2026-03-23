/* ========================================
   COMPARISON PAGE — Data Model & Interactivity
======================================== */

(function () {
    'use strict';

    // ---- LAB REPORTS DATA ----
    var LAB_DATA = {
        filtration: {
            label: 'PARTICLE FILTRATION TEST',
            title: 'H13 HEPA Particle Filtration',
            desc: 'H13 HEPA filter tested for PM2.5 and PM10 removal efficiency under controlled lab conditions. The filter captures particles as small as 0.3 microns with certified efficiency.',
            stats: [
                { value: '>99.95%', label: 'Filtration efficiency for 0.3μm particles' },
                { value: '99.97%', label: 'PM2.5 removal rate in 30 minutes' },
                { value: 'H13', label: 'HEPA grade certification' }
            ]
        },
        cadr: {
            label: 'AIRFLOW & CADR TEST',
            title: 'Clean Air Delivery Rate',
            desc: 'Clean Air Delivery Rate measured across all fan speeds, validating room coverage claims. Testing performed in a sealed chamber following industry-standard protocols.',
            stats: [
                { value: '410 m³/h', label: 'Maximum CADR at highest fan speed' },
                { value: '500 sq ft', label: 'Effective room coverage verified' },
                { value: '<10 min', label: 'Full room air cycle time' }
            ]
        },
        noise: {
            label: 'NOISE LEVEL TEST',
            title: 'Acoustic Performance',
            desc: 'Decibel levels measured at sleep mode and maximum speed from 1 metre distance in an anechoic chamber. Verified to be quieter than ambient room noise.',
            stats: [
                { value: '24 dB', label: 'Sleep mode noise level (whisper-quiet)' },
                { value: '52 dB', label: 'Maximum speed noise level' },
                { value: '1 metre', label: 'Standard measurement distance' }
            ]
        },
        energy: {
            label: 'ENERGY CONSUMPTION TEST',
            title: 'Power Efficiency',
            desc: 'Power draw measured across all fan speeds to verify energy efficiency claims. Designed to run 24/7 without a noticeable impact on your electricity bill.',
            stats: [
                { value: '45W', label: 'Maximum power consumption' },
                { value: '7W', label: 'Sleep mode power draw' },
                { value: '~₹2/day', label: 'Estimated daily running cost' }
            ]
        }
    };

    // ---- LAB REPORTS SLIDER ----
    function initLabSlider() {
        var slider = document.getElementById('lab-slider');
        var prevBtn = document.getElementById('lab-prev');
        var nextBtn = document.getElementById('lab-next');
        var progressBarEl = document.getElementById('lab-progress-bar');

        if (!slider) return;

        function updateProgress() {
            if (!progressBarEl) return;
            var maxScroll = slider.scrollWidth - slider.clientWidth;
            if (maxScroll <= 0) {
                progressBarEl.style.width = '100%';
                return;
            }
            var scrollPercent = slider.scrollLeft / maxScroll;
            var progressWidth = 25 + (scrollPercent * 75);
            progressBarEl.style.width = progressWidth + '%';
        }

        function scrollSlider(direction) {
            var cards = slider.querySelectorAll('.cmp-lab-card');
            if (!cards.length) return;
            var cardWidth = cards[0].offsetWidth + 16;
            var maxScroll = slider.scrollWidth - slider.clientWidth;
            var newScrollLeft = slider.scrollLeft + (direction * cardWidth);
            newScrollLeft = Math.max(0, Math.min(newScrollLeft, maxScroll));
            slider.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
        }

        if (prevBtn) prevBtn.addEventListener('click', function () { scrollSlider(-1); });
        if (nextBtn) nextBtn.addEventListener('click', function () { scrollSlider(1); });
        slider.addEventListener('scroll', updateProgress);
        updateProgress();
    }

    // ---- LAB REPORT EXPAND (matches home page feature popup) ----
    var LAB_KEYS = ['filtration', 'cadr', 'noise', 'energy'];
    var currentLabCard = 0;

    function initLabExpand() {
        var overlay = document.getElementById('cmp-lab-overlay');
        var closeBtn = document.getElementById('cmp-lab-close');
        var tagEl = document.getElementById('cmp-lab-expanded-tag');
        var titleEl = document.getElementById('cmp-lab-expanded-title');
        var descEl = document.getElementById('cmp-lab-expanded-desc');
        var statsEl = document.getElementById('cmp-lab-expanded-stats');
        var imageEl = document.getElementById('cmp-lab-expanded-image');
        var prevBtn = document.getElementById('cmp-lab-prev-expanded');
        var nextBtn = document.getElementById('cmp-lab-next-expanded');

        if (!overlay) return;

        function openLabExpanded(index) {
            var labKey = LAB_KEYS[index];
            var data = LAB_DATA[labKey];
            if (!data) return;

            currentLabCard = index;

            // Get the tag icon from the card
            var card = document.querySelector('.cmp-lab-card[data-lab="' + labKey + '"]');
            var tagHtml = '';
            if (card) {
                var tagSvg = card.querySelector('.cmp-lab-tag svg');
                var tagSpan = card.querySelector('.cmp-lab-tag span');
                if (tagSvg) tagHtml += tagSvg.outerHTML;
                if (tagSpan) tagHtml += tagSpan.outerHTML;
            }
            tagEl.innerHTML = tagHtml;

            titleEl.textContent = data.title;
            descEl.textContent = data.desc;

            // Set image gradient from card
            if (card) {
                var cardImage = card.querySelector('.cmp-lab-card-image');
                if (cardImage) {
                    var gradient = getComputedStyle(cardImage).getPropertyValue('background');
                    imageEl.style.background = gradient;
                }
            }

            // Render stats in testimonial-style box
            var statsHtml = '';
            data.stats.forEach(function (stat) {
                statsHtml += '<p class="testimonial-name">' + stat.value + '</p>';
                statsHtml += '<p class="testimonial-label" style="margin-bottom: 12px;">' + stat.label + '</p>';
            });
            statsEl.innerHTML = statsHtml;

            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeOverlay() {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }

        // Expand buttons on cards
        document.querySelectorAll('.cmp-lab-expand-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var labKey = btn.getAttribute('data-lab-expand');
                var index = LAB_KEYS.indexOf(labKey);
                if (index >= 0) openLabExpanded(index);
            });
        });

        // Navigation arrows
        if (prevBtn) {
            prevBtn.addEventListener('click', function () {
                var newIndex = currentLabCard > 0 ? currentLabCard - 1 : LAB_KEYS.length - 1;
                openLabExpanded(newIndex);
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', function () {
                var newIndex = currentLabCard < LAB_KEYS.length - 1 ? currentLabCard + 1 : 0;
                openLabExpanded(newIndex);
            });
        }

        // Close handlers
        if (closeBtn) closeBtn.addEventListener('click', closeOverlay);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeOverlay();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && overlay.classList.contains('active')) closeOverlay();
        });
    }

    // ---- HEADER SCROLL EFFECT (transparent → fixed, like blog page) ----
    function updateHeader() {
        var header = document.getElementById('header');
        if (!header) return;
        if (window.scrollY > 80) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }

    // ---- SCROLL LISTENER ----
    var scrollTicking = false;
    function onScroll() {
        if (!scrollTicking) {
            requestAnimationFrame(function () {
                updateHeader();
                scrollTicking = false;
            });
            scrollTicking = true;
        }
    }

    // ---- INIT ----
    function init() {
        initLabSlider();
        initLabExpand();

        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        // Run header scroll check on load
        updateHeader();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
