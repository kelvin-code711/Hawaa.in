/**
 * installation-guide.js
 * Hawaa Edge — Installation Guide animations
 *
 * Depends on: GSAP 3 + ScrollTrigger (loaded before this file)
 */

(function () {
    'use strict';

    /* ──────────────────────────────────────────────────────────
       Wait for GSAP (deferred script order: GSAP → ScrollTrigger → this)
       ────────────────────────────────────────────────────────── */
    function init() {
        if (typeof gsap === 'undefined') {
            /* GSAP not ready yet — retry after a short delay */
            setTimeout(init, 80);
            return;
        }

        gsap.registerPlugin(ScrollTrigger);

        initHeroAnimations();
        initPlacementAnimation();
        initRevealObserver();
        initTipsAccordion();
        initSmoothScroll();
    }

    document.addEventListener('DOMContentLoaded', init);

    /* ══════════════════════════════════════════════════════════
       1. HERO — staggered fade-in + slide-up on page load
       ══════════════════════════════════════════════════════════ */
    function initHeroAnimations() {
        var heroCopy   = document.getElementById('ig-hero-copy');
        var heroVisual = document.getElementById('ig-hero-visual');
        var heroScroll = document.getElementById('ig-hero-scroll');

        if (!heroCopy || !heroVisual) return;

        /* Master timeline so animations play sequentially then together */
        var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        /* Product image slides up first (slightly ahead of copy) */
        tl.to(heroVisual, {
            opacity: 1,
            y: 0,
            duration: 1.0,
        }, 0.2);

        /* Headline block slides up with a short stagger after image starts */
        tl.to(heroCopy, {
            opacity: 1,
            y: 0,
            duration: 0.9,
        }, 0.45);

        /* Scroll cue fades in last */
        if (heroScroll) {
            tl.to(heroScroll, {
                opacity: 1,
                duration: 0.6,
            }, 1.3);
        }

        /* Subtle continuous float for the product image */
        gsap.to(heroVisual, {
            y: -12,
            duration: 3.5,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
            delay: 1.4,
        });
    }

    /* ══════════════════════════════════════════════════════════
       2. PLACEMENT — ScrollTrigger glowing ring expansion
          Animates a dashed ring + outer glow ring radiating
          outward from the device to show 3.5-foot clearance.
       ══════════════════════════════════════════════════════════ */
    function initPlacementAnimation() {
        var section      = document.getElementById('ig-placement');
        var ring         = document.getElementById('ig-clearance-ring');
        var ringOuter    = document.getElementById('ig-clearance-ring-2');
        var label        = document.getElementById('ig-clearance-label');
        var markerTop    = document.getElementById('ig-marker-top');
        var markerRight  = document.getElementById('ig-marker-right');
        var markerBottom = document.getElementById('ig-marker-bottom');
        var markerLeft   = document.getElementById('ig-marker-left');

        if (!section || !ring) return;

        /* The SVG rings' final radius is 108 (set in HTML).
           We animate from r=0 to r=108 using SVG attribute tweening. */
        var ringRadius = 108;

        /* Set initial state: rings collapsed at device centre */
        gsap.set([ring, ringOuter], { attr: { r: 0 }, opacity: 0 });
        gsap.set(label, { opacity: 0 });
        if (markerTop) gsap.set([markerTop, markerRight, markerBottom, markerLeft], { opacity: 0 });

        ScrollTrigger.create({
            trigger: section,
            start: 'top 60%',
            once: true,
            onEnter: function () {
                var tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

                /* 1. Expand the dashed clearance ring */
                tl.to(ring, {
                    attr: { r: ringRadius },
                    opacity: 1,
                    duration: 1.2,
                }, 0);

                /* 2. Expand the outer glow ring slightly behind */
                tl.to(ringOuter, {
                    attr: { r: ringRadius },
                    opacity: 0.6,
                    duration: 1.4,
                }, 0.1);

                /* 3. Pulse-fade the outer glow ring to reinforce the "radiation" feel */
                tl.to(ringOuter, {
                    opacity: 0,
                    attr: { r: ringRadius + 18 },
                    duration: 1.0,
                    ease: 'power1.in',
                    repeat: -1,
                    yoyo: false,
                    repeatDelay: 0.4,
                }, 1.5);

                /* 4. Pop in cardinal markers */
                if (markerTop) {
                    tl.to([markerTop, markerRight, markerBottom, markerLeft], {
                        opacity: 1,
                        duration: 0.4,
                        stagger: 0.12,
                    }, 1.0);
                }

                /* 5. Fade in label */
                if (label) {
                    tl.to(label, { opacity: 1, duration: 0.5 }, 1.2);
                }
            },
        });

        /* Continuous idle rotation of the dashed ring for visual interest */
        gsap.to(ring, {
            rotation: 360,
            transformOrigin: '260px 260px',
            duration: 40,
            ease: 'none',
            repeat: -1,
        });
    }

    /* ══════════════════════════════════════════════════════════
       3. SCROLL REVEAL
          Lightweight IntersectionObserver for .ig-reveal elements.
          GSAP ScrollTrigger is reserved for the complex SVG animation;
          the reveal system uses the native API to keep the page light.
       ══════════════════════════════════════════════════════════ */
    function initRevealObserver() {
        var els = document.querySelectorAll('.ig-reveal');
        if (!els.length) return;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.12,
            rootMargin: '0px 0px -40px 0px',
        });

        els.forEach(function (el) { observer.observe(el); });
    }

    /* ══════════════════════════════════════════════════════════
       4. TIPS ACCORDION
          Expand / collapse tip answers.
       ══════════════════════════════════════════════════════════ */
    function initTipsAccordion() {
        var items = document.querySelectorAll('.ig-tip-item');
        items.forEach(function (item) {
            var toggle = item.querySelector('.ig-tip-toggle');
            if (!toggle) return;
            toggle.addEventListener('click', function () {
                var isActive = item.classList.contains('active');
                /* Close all */
                items.forEach(function (i) {
                    i.classList.remove('active');
                    var btn = i.querySelector('.ig-tip-toggle');
                    if (btn) btn.setAttribute('aria-expanded', 'false');
                });
                /* Open clicked if it was not already open */
                if (!isActive) {
                    item.classList.add('active');
                    toggle.setAttribute('aria-expanded', 'true');
                }
            });
        });
    }

    /* ══════════════════════════════════════════════════════════
       5. SMOOTH SCROLL for anchor links
          Respects prefers-reduced-motion.
       ══════════════════════════════════════════════════════════ */
    function initSmoothScroll() {
        var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) return;

        document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
            anchor.addEventListener('click', function (e) {
                var target = document.querySelector(this.getAttribute('href'));
                if (!target) return;
                e.preventDefault();
                /* Account for sticky header (~72px) + step bar (~44px) */
                var offset = 120;
                var top = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top: top, behavior: 'smooth' });
            });
        });
    }

})();
