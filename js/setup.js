// ========================================
// SETUP PAGE — Onboarding Navigation Shell
// Scroll detection, step progression, smooth scroll
// ========================================

(function () {
    'use strict';

    // ── DOM references ──────────────────────────────────
    var header       = document.getElementById('header');
    var onboardingNav = document.getElementById('onboarding-nav');
    var stepsScroll  = document.getElementById('onboarding-steps-scroll');
    var counter      = document.getElementById('onboarding-counter');
    var stepEls      = document.querySelectorAll('.onboarding-step');
    var sections     = document.querySelectorAll('.setup-section');
    var startBtn     = document.getElementById('setup-start-btn');

    // ── State ───────────────────────────────────────────
    var currentStep  = 1;
    var totalSteps   = stepEls.length;  // 4

    // ── Utility: combined sticky offset (px) ────────────
    function getStickyOffset() {
        var headerH = header ? header.offsetHeight : 64;
        var navH    = onboardingNav ? onboardingNav.offsetHeight : 56;
        return headerH + navH;
    }

    // ── Update nav to reflect a given step number ───────
    function setActiveStep(newStep) {
        if (newStep === currentStep) return;
        currentStep = newStep;

        // Update counter text (mobile)
        if (counter) {
            counter.textContent = 'Step ' + newStep + ' of ' + totalSteps;
        }

        // Update each step element
        stepEls.forEach(function (el) {
            var num = parseInt(el.getAttribute('data-step'), 10);

            el.classList.remove('active', 'completed', 'upcoming');

            if (num < newStep) {
                el.classList.add('completed');
                el.removeAttribute('aria-current');
            } else if (num === newStep) {
                el.classList.add('active');
                el.setAttribute('aria-current', 'step');
                scrollStepIntoView(el);
            } else {
                el.classList.add('upcoming');
                el.removeAttribute('aria-current');
            }
        });

        // Fill connector lines
        updateConnectors(newStep);
    }

    // ── Fill connector lines for completed steps ────────
    function updateConnectors(activeStep) {
        for (var i = 1; i < totalSteps; i++) {
            var fill = document.getElementById('connector-' + i);
            if (!fill) continue;
            if (i < activeStep) {
                fill.classList.add('filled');
            } else {
                fill.classList.remove('filled');
            }
        }
    }

    // ── Scroll active step pill into view (mobile) ──────
    function scrollStepIntoView(el) {
        if (!stepsScroll) return;
        var containerRect = stepsScroll.getBoundingClientRect();
        var elRect        = el.getBoundingClientRect();

        var leftOverflow  = containerRect.left - elRect.left;
        var rightOverflow = elRect.right - containerRect.right;

        if (leftOverflow > 0 || rightOverflow > 0) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }

    // ── Smooth-scroll to a section with offset ──────────
    function scrollToSection(targetId) {
        var target = document.getElementById(targetId);
        if (!target) return;

        var offset = getStickyOffset() + 12; // 12px breathing room
        var top    = target.getBoundingClientRect().top + window.pageYOffset - offset;

        window.scrollTo({ top: top, behavior: 'smooth' });
    }

    // ── IntersectionObserver: detect which section is active ──
    // rootMargin pushes the trigger point down so activation
    // fires roughly when the section header clears the sticky bars.
    function buildObserver() {
        var headerH = header ? header.offsetHeight : 64;
        var navH    = onboardingNav ? onboardingNav.offsetHeight : 56;
        var topBias = -(headerH + navH + 20);    // shrink top of viewport
        var botBias = '-30%';                    // activate in top 70% of remaining viewport

        var options = {
            root: null,
            rootMargin: topBias + 'px 0px ' + botBias + ' 0px',
            threshold: 0
        };

        var observer = new IntersectionObserver(function (entries) {
            // Find the entry with the highest intersection ratio
            // (handles multiple entries firing simultaneously)
            var best = null;
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    if (!best || entry.intersectionRatio > best.intersectionRatio) {
                        best = entry;
                    }
                }
            });

            if (best) {
                var step = parseInt(best.target.getAttribute('data-step'), 10);
                if (step) setActiveStep(step);
            }
        }, options);

        sections.forEach(function (section) {
            observer.observe(section);
        });
    }

    // ── Fallback: scroll-based detection (belt + suspenders) ──
    // Runs alongside IntersectionObserver for browsers that may
    // batch IO callbacks differently, and also handles the edge
    // case when scrolling all the way to the bottom.
    var scrollTicking = false;

    function onScroll() {
        if (scrollTicking) return;
        scrollTicking = true;
        window.requestAnimationFrame(function () {
            detectSectionByScroll();
            scrollTicking = false;
        });
    }

    function detectSectionByScroll() {
        var offset = getStickyOffset() + 20;
        var scrollY = window.pageYOffset;
        var detected = 1;

        sections.forEach(function (section) {
            var rect = section.getBoundingClientRect();
            var top  = rect.top + scrollY;
            if (scrollY + offset >= top) {
                detected = parseInt(section.getAttribute('data-step'), 10) || detected;
            }
        });

        setActiveStep(detected);
    }

    // ── Click handlers on step pills ────────────────────
    stepEls.forEach(function (el) {
        el.addEventListener('click', function (e) {
            e.preventDefault();
            var target = this.getAttribute('data-target');
            scrollToSection(target);
        });

        // Keyboard: Enter / Space triggers click
        el.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });

    // ── Click handlers on in-content next/back buttons ──
    document.querySelectorAll('.setup-next-btn, .setup-back-btn, .setup-hero-cta').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            var href = this.getAttribute('href');
            if (href && href.charAt(0) === '#') {
                e.preventDefault();
                scrollToSection(href.slice(1));
            }
        });
    });

    // ── Nav shadow on scroll ─────────────────────────────
    // Add a slightly stronger shadow when user scrolls mid-page
    function updateNavShadow() {
        if (!onboardingNav) return;
        if (window.pageYOffset > 40) {
            onboardingNav.style.boxShadow = '0 4px 24px rgba(0,0,0,0.10)';
        } else {
            onboardingNav.style.boxShadow = '0 2px 16px rgba(0,0,0,0.06)';
        }
    }

    // ── Keyboard navigation between sections (↑ ↓ arrow keys) ──
    document.addEventListener('keydown', function (e) {
        // Only fire when focus is inside the onboarding nav
        if (!onboardingNav || !onboardingNav.contains(document.activeElement)) return;

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            var next = Math.min(currentStep + 1, totalSteps);
            var nextEl = document.querySelector('.onboarding-step[data-step="' + next + '"]');
            if (nextEl) nextEl.click();
        }

        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            var prev = Math.max(currentStep - 1, 1);
            var prevEl = document.querySelector('.onboarding-step[data-step="' + prev + '"]');
            if (prevEl) prevEl.click();
        }
    });

    // ── Init ─────────────────────────────────────────────
    function init() {
        // Set initial state (step 1 active)
        setActiveStep(1);

        // Wire up IntersectionObserver
        if ('IntersectionObserver' in window) {
            buildObserver();
        }

        // Scroll listener (fallback + shadow)
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('scroll', updateNavShadow, { passive: true });

        // Run once on load for correct initial position
        detectSectionByScroll();
        updateNavShadow();
    }

    // Run after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
