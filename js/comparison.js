/* ========================================
   COMPARISON PAGE — Data Model & Interactivity
======================================== */

(function () {
    'use strict';

    // ---- BRAND ORDER ----
    var BRANDS = ['Hawaa Edge', 'Dyson', 'Coway', 'Xiaomi'];
    var BRAND_COUNT = BRANDS.length;

    // ---- COMPARISON DATA ----
    var CATEGORIES = [
        {
            name: 'Cleaning Performance',
            rows: [
                {
                    attr: 'CADR Rating',
                    best: 0,
                    values: [
                        { specs: '410 m³/h' },
                        { specs: '370 m³/h' },
                        { specs: '370 m³/h' },
                        { specs: '400 m³/h' }
                    ]
                },
                {
                    attr: 'Room coverage',
                    best: 0,
                    values: [
                        { specs: 'Up to 500 sq ft' },
                        { specs: 'Up to 400 sq ft' },
                        { specs: 'Up to 430 sq ft' },
                        { specs: 'Up to 480 sq ft' }
                    ]
                }
            ]
        },
        {
            name: 'Noise & Comfort',
            rows: [
                {
                    attr: 'Noise level',
                    best: 0,
                    values: [
                        { specs: '24 dB (sleep mode)' },
                        { specs: '42 dB' },
                        { specs: '42 dB' },
                        { specs: '40 dB' }
                    ]
                },
                {
                    attr: 'Fan speed modes',
                    best: -1,
                    values: [
                        { specs: '4 speeds + auto' },
                        { specs: '10-speed airflow' },
                        { specs: '3 speeds + auto' },
                        { specs: '3 speeds + auto' }
                    ]
                }
            ]
        },
        {
            name: 'Filtration & Filter Life',
            rows: [
                {
                    attr: 'Filter type',
                    best: -1,
                    values: [
                        { specs: 'H13 HEPA 3-in-1' },
                        { specs: 'HEPA + carbon' },
                        { specs: 'HEPA + carbon' },
                        { specs: 'H13 HEPA 3-in-1' }
                    ]
                },
                {
                    attr: 'Filter replacement cost',
                    best: 0,
                    values: [
                        { specs: '₹1,499' },
                        { specs: '₹5,490' },
                        { specs: '₹5,400' },
                        { specs: '₹3,200' }
                    ]
                },
                {
                    attr: 'Filter life',
                    best: -1,
                    values: [
                        { specs: '~12 months' },
                        { specs: '~12 months' },
                        { specs: '~12 months' },
                        { specs: '6–12 months' }
                    ]
                }
            ]
        },
        {
            name: 'Smart Features',
            rows: [
                {
                    attr: 'Smart features',
                    best: 0,
                    values: [
                        { specs: 'Gesture + voice control' },
                        { specs: 'App + voice control' },
                        { specs: 'None' },
                        { specs: 'App + voice control' }
                    ]
                },
                {
                    attr: 'Real-time AQI display',
                    best: -1,
                    values: [
                        { specs: 'Yes — PM2.5 numeric' },
                        { specs: 'Yes — LCD display' },
                        { specs: 'LED color indicator' },
                        { specs: 'Yes — OLED display' }
                    ]
                },
                {
                    attr: 'Auto mode',
                    best: -1,
                    values: [
                        { specs: 'Yes — laser sensor' },
                        { specs: 'Yes — sensor-based' },
                        { specs: 'Yes — sensor-based' },
                        { specs: 'Yes — sensor-based' }
                    ]
                }
            ]
        },
        {
            name: 'Price & Value',
            rows: [
                {
                    attr: 'Price',
                    best: 0,
                    values: [
                        { specs: 'Best Value' },
                        { specs: '₹41,900' },
                        { specs: '₹28,900' },
                        { specs: '₹11,499' }
                    ]
                },
                {
                    attr: 'Subscription option',
                    best: 0,
                    values: [
                        { specs: 'Yes — auto filter delivery' },
                        { specs: 'No' },
                        { specs: 'No' },
                        { specs: 'No' }
                    ]
                }
            ]
        },
        {
            name: 'Warranty & Support',
            rows: [
                {
                    attr: 'Warranty coverage',
                    best: 0,
                    values: [
                        { specs: '2 years' },
                        { specs: '1 year' },
                        { specs: '1 year' },
                        { specs: '2 years' }
                    ]
                },
                {
                    attr: 'Support type',
                    best: 0,
                    values: [
                        { specs: 'Direct brand support' },
                        { specs: 'Service centers' },
                        { specs: 'Service centers' },
                        { specs: 'Service centers' }
                    ]
                },
                {
                    attr: 'PAN India service',
                    best: 0,
                    values: [
                        { specs: 'Yes' },
                        { specs: 'Limited' },
                        { specs: 'Limited' },
                        { specs: 'Yes' }
                    ]
                }
            ]
        }
    ];

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

    // ---- SVG TEMPLATES ----
    var SVG_YES = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
    var SVG_NO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

    // ---- DOM REFS ----
    var progressBar = document.getElementById('cmp-progress');
    var progressFill = document.getElementById('cmp-progress-fill');

    // ---- RENDER TABLES ----
    // All brands in same row, Hawaa sticky on mobile
    function renderTables() {
        var tableEls = document.querySelectorAll('.cmp-table');
        tableEls.forEach(function (el) {
            var catIdx = parseInt(el.getAttribute('data-category-index'), 10);
            var cat = CATEGORIES[catIdx];
            if (!cat) return;
            el.innerHTML = buildCategoryTable(cat);
        });
    }

    function buildCategoryTable(cat) {
        var html = '';

        // Mobile: swipe cue
        html += '<div class="cmp-swipe-cue"><span>Swipe to compare</span> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg></div>';

        // Desktop header row
        html += '<div class="cmp-table-header">';
        html += '<div class="cmp-table-header-cell"></div>';
        BRANDS.forEach(function (b, i) {
            html += '<div class="cmp-table-header-cell' + (i === 0 ? ' is-hawaa' : '') + '">' + b + '</div>';
        });
        html += '</div>';

        // Data rows — all brands in same container
        cat.rows.forEach(function (row) {
            var allSame = row.values.every(function (v) {
                return v.specs === row.values[0].specs;
            });

            html += '<div class="cmp-table-row' + (allSame ? ' all-same' : '') + '">';

            // Attribute label
            html += '<div class="cmp-row-attr">' + row.attr + '</div>';

            // All brand cells in one scrollable container
            html += '<div class="cmp-row-brands">';
            for (var i = 0; i < BRAND_COUNT; i++) {
                var v = row.values[i];
                var isBest = row.best === i;
                var isHawaa = i === 0;
                var cellContent = formatCellContent(v);

                html += '<div class="cmp-row-cell' + (isHawaa ? ' is-hawaa' : '') + (isBest ? ' is-best' : '') + '">';
                html += '<span class="cmp-cell-brand">' + BRANDS[i] + '</span>';
                html += '<span class="cmp-cell-value">' + cellContent + '</span>';
                html += '</div>';
            }
            html += '</div>'; // brands

            html += '</div>'; // row
        });

        return html;
    }

    function formatCellContent(v) {
        if (v.specs === 'Yes' || v.specs.indexOf('Yes') === 0) {
            return '<span class="cmp-cell-yes">' + SVG_YES + ' ' + v.specs + '</span>';
        } else if (v.specs === 'No') {
            return '<span class="cmp-cell-no">' + SVG_NO + ' No</span>';
        } else if (v.specs === 'None') {
            return '<span class="cmp-cell-no">' + SVG_NO + ' None</span>';
        } else if (v.specs === 'Limited') {
            return '<span class="cmp-cell-no">' + SVG_NO + ' Limited</span>';
        }
        return v.specs;
    }

    // ---- SCROLL PROGRESS ----
    function updateScrollProgress() {
        var cats = document.querySelectorAll('.cmp-category');
        if (!cats.length || !progressBar) return;

        var catSections = Array.from(cats);
        var firstTop = catSections[0].getBoundingClientRect().top + window.scrollY;
        var lastBottom = catSections[catSections.length - 1].getBoundingClientRect().bottom + window.scrollY;
        var totalHeight = lastBottom - firstTop;
        var scrolled = window.scrollY + window.innerHeight * 0.4 - firstTop;
        var progress = Math.max(0, Math.min(1, scrolled / totalHeight));

        if (progressFill) {
            progressFill.style.width = (progress * 100) + '%';
        }

        // Show/hide progress bar
        var inRange = catSections[0].getBoundingClientRect().top <= 200;
        var pastEnd = catSections[catSections.length - 1].getBoundingClientRect().bottom < 0;
        progressBar.classList.toggle('visible', inRange && !pastEnd);

        // Highlight steps
        var steps = document.querySelectorAll('.cmp-progress-step');
        var activeIdx = 0;

        catSections.forEach(function (sec, i) {
            var r = sec.getBoundingClientRect();
            if (r.top < window.innerHeight * 0.4) {
                activeIdx = i;
            }
        });

        steps.forEach(function (step, i) {
            step.classList.remove('active', 'done');
            if (i === activeIdx) step.classList.add('active');
            else if (i < activeIdx) step.classList.add('done');
        });
    }

    // ---- PROGRESS STEP CLICK ----
    function initProgressClicks() {
        document.querySelectorAll('.cmp-progress-step').forEach(function (step) {
            step.addEventListener('click', function () {
                var target = document.getElementById(step.getAttribute('data-target'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    // ---- KEY DIFF SLIDER ----
    function initKeydiffSlider() {
        var slider = document.getElementById('keydiff-slider');
        var prevBtn = document.getElementById('keydiff-prev');
        var nextBtn = document.getElementById('keydiff-next');
        var progressBarEl = document.getElementById('keydiff-progress-bar');

        if (!slider) return;

        function updateProgress() {
            if (!progressBarEl) return;
            var maxScroll = slider.scrollWidth - slider.clientWidth;
            if (maxScroll <= 0) {
                progressBarEl.style.width = '100%';
                return;
            }
            var scrollPercent = slider.scrollLeft / maxScroll;
            var progressWidth = 16 + (scrollPercent * 84);
            progressBarEl.style.width = progressWidth + '%';
        }

        function scrollSlider(direction) {
            var cards = slider.querySelectorAll('.cmp-keydiff-card');
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

    // ---- MOBILE SWIPE EDGE DETECTION ----
    function initSwipeEdge() {
        document.addEventListener('scroll', function (e) {
            var el = e.target;
            if (!el.classList || !el.classList.contains('cmp-row-brands')) return;
            var wrap = el.closest('.cmp-table-wrap');
            if (!wrap) return;
            var atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
            wrap.classList.toggle('scrolled-end', atEnd);
        }, true);
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
                updateScrollProgress();
                updateHeader();
                scrollTicking = false;
            });
            scrollTicking = true;
        }
    }

    // ---- INIT ----
    function init() {
        renderTables();
        initProgressClicks();
        initSwipeEdge();
        initKeydiffSlider();
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
