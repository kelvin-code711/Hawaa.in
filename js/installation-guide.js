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
        initRulesCarousel();
        initControlGuide();
        initGoogleHomeCards();
        initFilterMaintenance();
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

        /* Respect user's motion preference */
        var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReduced) {
            /* CSS already reveals elements at full opacity — no GSAP needed */
            return;
        }

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

        /* Subtle continuous float for the product image — restrained, premium */
        gsap.to(heroVisual, {
            y: -10,
            duration: 4,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
            delay: 1.5,
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
            transformOrigin: '190px 330px',
            duration: 40,
            ease: 'none',
            repeat: -1,
        });
    }

    /* ══════════════════════════════════════════════════════════
       2b. PLACEMENT RULES CAROUSEL
           Scroll-snap carousel with dot navigation on mobile.
       ══════════════════════════════════════════════════════════ */
    function initRulesCarousel() {
        var track = document.getElementById('ig-rules-track');
        var dotsWrap = document.getElementById('ig-carousel-dots');

        if (!track || !dotsWrap) return;

        /* Only active below 1024px */
        function isCarouselActive() {
            return window.innerWidth < 1024;
        }

        var dots = dotsWrap.querySelectorAll('.ig-dot');
        var cards = track.querySelectorAll('.ig-rule-card');
        var currentIndex = 0;

        function activateDot(index) {
            dots.forEach(function (d, i) {
                d.classList.toggle('ig-dot--active', i === index);
            });
            currentIndex = index;
        }

        /* Update dot from scroll position */
        function onScroll() {
            if (!isCarouselActive()) return;
            var scrollLeft = track.scrollLeft;
            var cardWidth = track.offsetWidth;
            var index = Math.round(scrollLeft / cardWidth);
            index = Math.max(0, Math.min(index, cards.length - 1));
            activateDot(index);
        }

        track.addEventListener('scroll', onScroll, { passive: true });

        /* Dot click → scroll to card */
        dots.forEach(function (dot, i) {
            dot.addEventListener('click', function () {
                if (!isCarouselActive()) return;
                track.scrollTo({ left: i * track.offsetWidth, behavior: 'smooth' });
                activateDot(i);
            });
        });

        /* On resize, reset scroll if entering desktop */
        window.addEventListener('resize', function () {
            if (!isCarouselActive()) {
                track.scrollLeft = 0;
                activateDot(0);
            }
        });
    }

    /* ══════════════════════════════════════════════════════════
       3. INTERACTIVE CONTROL GUIDE
          Custom chromeless HTML5 player with:
          – Translucent blur overlay that fades on hover / tap
          – Progress bar with chapter pips
          – Chapter nav list that highlights by currentTime
          – Stat cards that fade in per chapter
          Falls back to a simulated timer when no video src exists.
       ══════════════════════════════════════════════════════════ */
    function initControlGuide() {
        var player        = document.getElementById('ig-cg-player');
        var video         = document.getElementById('ig-cg-video');
        var placeholder   = document.getElementById('ig-cg-placeholder');
        var controls      = document.getElementById('ig-cg-controls');
        var playBtn       = document.getElementById('ig-cg-play-btn');
        var iconPlay      = playBtn  ? playBtn.querySelector('.ig-cg-icon-play')  : null;
        var iconPause     = playBtn  ? playBtn.querySelector('.ig-cg-icon-pause') : null;
        var progressTrack = document.getElementById('ig-cg-progress-track');
        var progressFill  = document.getElementById('ig-cg-progress-fill');
        var progressThumb = document.getElementById('ig-cg-progress-thumb');
        var timeEl        = document.getElementById('ig-cg-time');
        var fsBtn         = document.getElementById('ig-cg-fullscreen-btn');
        var iconExpand    = fsBtn ? fsBtn.querySelector('.ig-cg-icon-expand')   : null;
        var iconCompress  = fsBtn ? fsBtn.querySelector('.ig-cg-icon-compress') : null;
        var chaptersNav   = document.getElementById('ig-cg-chapters');
        var statBlocks    = document.getElementById('ig-cg-stat-blocks');
        var badgeText     = document.getElementById('ig-cg-chapter-badge-text');

        if (!player || !video) return;

        /* ── Chapter data ──────────────────────────────────── */
        var CHAPTERS = [
            { name: 'Power',       time: 0  },
            { name: 'Fan Speed',   time: 8  },
            { name: 'Timer',       time: 16 },
            { name: 'Auto Mode',   time: 24 },
            { name: 'Oscillation', time: 32 },
        ];
        var TOTAL_DURATION = 40; /* seconds — matches last chapter + 8 s buffer */

        var chapterBtns = chaptersNav  ? chaptersNav.querySelectorAll('.ig-cg-chapter-item') : [];
        var statCards   = statBlocks   ? statBlocks.querySelectorAll('.ig-cg-stat')          : [];
        var chapterPips = progressTrack ? progressTrack.querySelectorAll('.ig-cg-chapter-pip') : [];

        var currentChapter = 0;
        var isPlaying      = false;

        /* ── Demo mode (no video src) ──────────────────────── */
        var hasSource  = !!(video.currentSrc || (video.querySelector && video.querySelector('source[src]')));
        var demoTime   = 0;
        var demoRaf    = null;
        var demoLast   = null;

        /* ── Inactivity timer for controls ─────────────────── */
        var hideTimer = null;

        function showControls() {
            player.classList.add('controls-visible');
            clearTimeout(hideTimer);
            hideTimer = setTimeout(function () {
                if (isPlaying) player.classList.remove('controls-visible');
            }, 2800);
        }

        player.addEventListener('mousemove',  showControls);
        player.addEventListener('touchstart', showControls, { passive: true });
        player.addEventListener('mouseleave', function () {
            clearTimeout(hideTimer);
            if (isPlaying) player.classList.remove('controls-visible');
        });

        /* ── Helpers ───────────────────────────────────────── */
        function formatTime(s) {
            var m = Math.floor(s / 60);
            var sec = Math.floor(s % 60);
            return m + ':' + (sec < 10 ? '0' : '') + sec;
        }

        function getChapterIndex(t) {
            var idx = 0;
            for (var i = 0; i < CHAPTERS.length; i++) {
                if (t >= CHAPTERS[i].time) idx = i;
            }
            return idx;
        }

        function setActiveChapter(idx) {
            if (idx === currentChapter) return;
            currentChapter = idx;

            /* Chapter nav highlight */
            chapterBtns.forEach(function (btn, i) {
                btn.classList.toggle('active', i === idx);
            });

            /* Chapter badge text */
            if (badgeText) badgeText.textContent = CHAPTERS[idx].name;

            /* Stat cards: swap active card */
            statCards.forEach(function (card, i) {
                card.classList.toggle('active', i === idx);
            });
        }

        function updateProgress(t, duration) {
            var pct = duration > 0 ? Math.min(t / duration, 1) : 0;
            var pctStr = (pct * 100).toFixed(2) + '%';

            if (progressFill)  progressFill.style.width  = pctStr;
            if (progressThumb) progressThumb.style.left  = pctStr;
            if (progressTrack) progressTrack.setAttribute('aria-valuenow', Math.round(pct * 100));
            if (timeEl) timeEl.textContent = formatTime(t);

            /* Mark passed chapter pips */
            chapterPips.forEach(function (pip, i) {
                pip.classList.toggle('passed', t >= CHAPTERS[i].time);
            });

            setActiveChapter(getChapterIndex(t));
        }

        function setPlayState(playing) {
            isPlaying = playing;
            if (iconPlay)  iconPlay.style.display  = playing ? 'none'  : '';
            if (iconPause) iconPause.style.display = playing ? ''      : 'none';
            if (playBtn) playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
        }

        /* ── Demo mode loop ────────────────────────────────── */
        function demoTick(timestamp) {
            if (!isPlaying) return;
            if (demoLast === null) demoLast = timestamp;
            var delta = (timestamp - demoLast) / 1000;
            demoLast = timestamp;
            demoTime = Math.min(demoTime + delta, TOTAL_DURATION);
            updateProgress(demoTime, TOTAL_DURATION);
            if (demoTime < TOTAL_DURATION) {
                demoRaf = requestAnimationFrame(demoTick);
            } else {
                /* Reached end — stop */
                isPlaying = false;
                setPlayState(false);
                demoLast = null;
                player.classList.add('controls-visible');
            }
        }

        /* ── Play / pause ──────────────────────────────────── */
        function togglePlay() {
            if (hasSource) {
                if (video.paused) {
                    video.play().catch(function () {});
                } else {
                    video.pause();
                }
            } else {
                /* Demo mode */
                isPlaying = !isPlaying;
                setPlayState(isPlaying);
                if (isPlaying) {
                    if (demoTime >= TOTAL_DURATION) demoTime = 0;
                    demoLast = null;
                    demoRaf = requestAnimationFrame(demoTick);
                } else {
                    cancelAnimationFrame(demoRaf);
                    demoLast = null;
                }
            }
        }

        /* Click on player body (not on controls) → toggle play */
        player.addEventListener('click', function (e) {
            if (e.target === player || e.target === placeholder ||
                e.target.closest('.ig-cg-placeholder')) {
                togglePlay();
            }
        });

        if (playBtn) {
            playBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                togglePlay();
            });
        }

        /* ── Real video events ─────────────────────────────── */
        if (hasSource) {
            video.addEventListener('play',  function () { setPlayState(true);  });
            video.addEventListener('pause', function () { setPlayState(false); player.classList.add('controls-visible'); });
            video.addEventListener('ended', function () { setPlayState(false); player.classList.add('controls-visible'); });
            video.addEventListener('timeupdate', function () {
                updateProgress(video.currentTime, video.duration || TOTAL_DURATION);
            });
            /* Hide placeholder when video loads */
            video.addEventListener('loadeddata', function () {
                if (placeholder) placeholder.style.display = 'none';
            });
        }

        /* ── Progress bar scrubbing ────────────────────────── */
        var isScrubbing = false;

        function scrubTo(e) {
            var rect = progressTrack.getBoundingClientRect();
            var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
            var pct = Math.max(0, Math.min(x / rect.width, 1));
            var t = pct * TOTAL_DURATION;

            if (hasSource && isFinite(video.duration)) {
                video.currentTime = pct * video.duration;
            } else {
                demoTime = t;
                updateProgress(demoTime, TOTAL_DURATION);
            }
        }

        if (progressTrack) {
            progressTrack.addEventListener('mousedown', function (e) {
                isScrubbing = true;
                showControls();
                scrubTo(e);
            });
            progressTrack.addEventListener('touchstart', function (e) {
                isScrubbing = true;
                scrubTo(e);
            }, { passive: true });

            /* Keyboard: left / right arrows */
            progressTrack.addEventListener('keydown', function (e) {
                var step = (e.key === 'ArrowRight') ? 2 : (e.key === 'ArrowLeft') ? -2 : 0;
                if (!step) return;
                e.preventDefault();
                if (hasSource && isFinite(video.duration)) {
                    video.currentTime = Math.max(0, Math.min(video.currentTime + step, video.duration));
                } else {
                    demoTime = Math.max(0, Math.min(demoTime + step, TOTAL_DURATION));
                    updateProgress(demoTime, TOTAL_DURATION);
                }
            });
        }

        document.addEventListener('mousemove', function (e) {
            if (!isScrubbing) return;
            scrubTo(e);
        });
        document.addEventListener('mouseup', function () { isScrubbing = false; });
        document.addEventListener('touchend', function () { isScrubbing = false; });

        /* ── Chapter nav buttons ───────────────────────────── */
        chapterBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var t = parseFloat(btn.getAttribute('data-time')) || 0;
                if (hasSource && isFinite(video.duration)) {
                    video.currentTime = t;
                } else {
                    demoTime = t;
                    updateProgress(demoTime, TOTAL_DURATION);
                    /* Auto-play when user taps a chapter */
                    if (!isPlaying) {
                        isPlaying = true;
                        setPlayState(true);
                        demoLast = null;
                        demoRaf = requestAnimationFrame(demoTick);
                    }
                }
                showControls();
            });
        });

        /* ── Fullscreen ────────────────────────────────────── */
        if (fsBtn) {
            fsBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (!document.fullscreenElement) {
                    player.requestFullscreen && player.requestFullscreen();
                } else {
                    document.exitFullscreen && document.exitFullscreen();
                }
            });

            document.addEventListener('fullscreenchange', function () {
                var isFs = !!document.fullscreenElement;
                if (iconExpand)   iconExpand.style.display   = isFs ? 'none' : '';
                if (iconCompress) iconCompress.style.display = isFs ? ''     : 'none';
            });
        }

        /* ── Init: activate first chapter card ─────────────── */
        if (statCards.length) statCards[0].classList.add('active');
        updateProgress(0, TOTAL_DURATION);
    }

    /* ══════════════════════════════════════════════════════════
       GOOGLE HOME — stacked cards active-state highlight
       Uses ScrollTrigger to mark the frontmost card `.active`
       so the card that is "on top" can get a subtle accent border.
       ══════════════════════════════════════════════════════════ */
    function initGoogleHomeCards() {
        var track = document.getElementById('ig-gh-steps-track');
        if (!track) return;

        var panels = track.querySelectorAll('.ig-gh-step-panel');
        if (!panels.length) return;

        panels.forEach(function (panel, idx) {
            var card = panel.querySelector('.ig-gh-step-card');
            if (!card) return;

            ScrollTrigger.create({
                trigger: panel,
                start: 'top 55%',
                end: 'bottom 20%',
                onEnter: function () {
                    panels.forEach(function (p) {
                        var c = p.querySelector('.ig-gh-step-card');
                        if (c) c.classList.remove('active');
                    });
                    card.classList.add('active');
                },
                onEnterBack: function () {
                    /* Re-activate this card when scrolling back up */
                    panels.forEach(function (p) {
                        var c = p.querySelector('.ig-gh-step-card');
                        if (c) c.classList.remove('active');
                    });
                    card.classList.add('active');
                },
            });
        });

        /* Activate first card immediately */
        var firstCard = track.querySelector('.ig-gh-step-card');
        if (firstCard) firstCard.classList.add('active');
    }

    /* ══════════════════════════════════════════════════════════
       FILTER MAINTENANCE — EXPLODED VIEW
       Scrubs a GSAP timeline tied to the user's scroll position
       inside the sticky split-screen section:
         · Cap + Shell rise and rotate CCW (outer housing removed)
         · Inner layers (pre-filter, HEPA, carbon, base) spread apart
         · SVG labels + hotspot dots fade in once layers are separated
         · Left-column step panels crossfade at 33 % and 66 %
       Respects prefers-reduced-motion and small viewports.
       ══════════════════════════════════════════════════════════ */
    function initFilterMaintenance() {
        var section = document.getElementById('ig-filter-maintenance');
        if (!section) return;

        var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var isMobile       = window.innerWidth < 768;

        var cap    = document.getElementById('ig-fm-g-cap');
        var shell  = document.getElementById('ig-fm-g-shell');
        var pre    = document.getElementById('ig-fm-g-prefilter');
        var hepa   = document.getElementById('ig-fm-g-hepa');
        var carbon = document.getElementById('ig-fm-g-carbon');
        var base   = document.getElementById('ig-fm-g-base');
        var labels    = section.querySelectorAll('.ig-fm-label');
        var hotspots  = section.querySelectorAll('.ig-fm-hotspot');
        var steps     = section.querySelectorAll('.ig-fm-step');
        var scrollCue = document.getElementById('ig-fm-scroll-cue');

        /* ── Helper: show one step panel ─────────────────── */
        function showStep(idx) {
            steps.forEach(function (s, i) {
                if (i === idx) {
                    s.style.pointerEvents = 'auto';
                } else {
                    s.style.pointerEvents = 'none';
                }
            });
        }

        /* ── Helper: set fully-exploded static state ─────── */
        function applyExplodedState() {
            if (cap)    gsap.set(cap,    { y: -86, rotation: -15, transformOrigin: '170px 95px' });
            if (shell)  gsap.set(shell,  { y: -52, rotation: -5,  transformOrigin: '170px 274px' });
            if (pre)    gsap.set(pre,    { y: -18 });
            if (carbon) gsap.set(carbon, { y: 42 });
            if (base)   gsap.set(base,   { y: 62 });
            labels.forEach(function (l) { gsap.set(l, { opacity: 1 }); });
            hotspots.forEach(function (h) {
                gsap.set(h, { opacity: 1 });
                h.classList.add('visible');
            });
        }

        /* ── Reduced motion / mobile: static exploded view ── */
        if (prefersReduced || isMobile) {
            applyExplodedState();
            steps.forEach(function (s) {
                gsap.set(s, { opacity: 1, y: 0 });
                s.style.pointerEvents = 'auto';
            });
            return;
        }

        if (!cap || !shell) return;

        /* ── Set initial opacity on step panels via GSAP ──── */
        /* Step 0 visible; 1 & 2 hidden */
        gsap.set(steps[0], { opacity: 1, y: 0 });
        if (steps[1]) gsap.set(steps[1], { opacity: 0, y: 18 });
        if (steps[2]) gsap.set(steps[2], { opacity: 0, y: 18 });

        /* ── Build master scroll-scrub timeline ─────────── */
        var tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });

        /* ─ Phase 1 (0.00 – 0.42): Shell + cap lift and rotate CCW */
        tl.to(cap, {
            y: -86,
            rotation: -15,
            transformOrigin: '170px 95px',
            duration: 0.42,
        }, 0);

        tl.to(shell, {
            y: -52,
            rotation: -5,
            transformOrigin: '170px 274px',
            duration: 0.42,
        }, 0);

        /* ─ Phase 2 (0.30 – 0.72): Inner layers spread apart */
        tl.to(pre, {
            y: -18,
            duration: 0.38,
        }, 0.30);

        tl.to(carbon, {
            y: 42,
            duration: 0.38,
        }, 0.34);

        tl.to(base, {
            y: 62,
            duration: 0.38,
        }, 0.38);

        /* ─ Phase 3 (0.60 – 0.85): Labels + hotspots appear */
        tl.to(labels, {
            opacity: 1,
            duration: 0.14,
            stagger: 0.035,
        }, 0.62);

        tl.to(hotspots, {
            opacity: 1,
            duration: 0.10,
            stagger: 0.04,
            onComplete: function () {
                hotspots.forEach(function (h) { h.classList.add('visible'); });
            },
        }, 0.70);

        /* ─ Step panels crossfade at 33 % and 66 % ───────── */
        /* Scroll cue fades away immediately */
        if (scrollCue) {
            tl.to(scrollCue, { opacity: 0, duration: 0.05 }, 0.04);
        }

        /* Step 0 → out at 0.30 */
        tl.to(steps[0], { opacity: 0, y: -16, duration: 0.06 }, 0.30);

        /* Step 1 → in at 0.32, out at 0.62 */
        if (steps[1]) {
            tl.fromTo(steps[1],
                { opacity: 0, y: 18 },
                { opacity: 1, y: 0, duration: 0.06 },
                0.32
            );
            tl.to(steps[1], { opacity: 0, y: -16, duration: 0.06 }, 0.62);
        }

        /* Step 2 → in at 0.64 */
        if (steps[2]) {
            tl.fromTo(steps[2],
                { opacity: 0, y: 18 },
                { opacity: 1, y: 0, duration: 0.06 },
                0.64
            );
        }

        /* ─ Connect timeline to scroll via ScrollTrigger ─── */
        ScrollTrigger.create({
            trigger: section,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1.2,
            animation: tl,
            onUpdate: function (self) {
                /* Sync pointer-events with visible step panel */
                var p = self.progress;
                if      (p < 0.31) { showStep(0); }
                else if (p < 0.63) { showStep(1); }
                else               { showStep(2); }
            },
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
