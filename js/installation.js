// ========================================
// INSTALLATION GUIDE PAGE — INTERACTIONS
// ========================================

(function () {
    'use strict';

    // ========================================
    // HERO LOAD ANIMATION
    // ========================================
    const hero = document.getElementById('ig-hero');

    function initHero() {
        if (!hero) return;
        // Trigger load animations after a brief paint cycle
        requestAnimationFrame(function () {
            setTimeout(function () {
                hero.classList.add('loaded');
            }, 60);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHero);
    } else {
        initHero();
    }

    // ========================================
    // SCROLL-BASED HEADER SHRINK
    // ========================================
    const header = document.getElementById('header');

    if (header) {
        window.addEventListener('scroll', function () {
            if (window.scrollY > 60) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }, { passive: true });
    }

    // ========================================
    // STEP PROGRESS SCROLLSPY
    // ========================================
    const progressSteps = document.querySelectorAll('.ig-progress-step');
    const trackedSections = [];

    progressSteps.forEach(function (step) {
        const sectionId = step.getAttribute('data-section');
        const section = document.getElementById(sectionId);
        if (section) {
            trackedSections.push({ step: step, section: section });
        }
    });

    function updateProgressNav() {
        const scrollMid = window.scrollY + window.innerHeight * 0.45;

        let activeIdx = 0;
        trackedSections.forEach(function (item, idx) {
            const rect = item.section.getBoundingClientRect();
            const sectionTop = rect.top + window.scrollY;
            if (scrollMid >= sectionTop) {
                activeIdx = idx;
            }
        });

        trackedSections.forEach(function (item, idx) {
            item.step.classList.remove('active', 'done');
            if (idx === activeIdx) {
                item.step.classList.add('active');
            } else if (idx < activeIdx) {
                item.step.classList.add('done');
            }
        });
    }

    if (trackedSections.length > 0) {
        window.addEventListener('scroll', updateProgressNav, { passive: true });
        updateProgressNav();
    }

    // ========================================
    // SMOOTH ANCHOR SCROLLING
    // ========================================
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href').slice(1);
            const target = document.getElementById(targetId);
            if (!target) return;
            e.preventDefault();

            // Account for the sticky progress nav height
            const progressNav = document.querySelector('.ig-progress');
            const navH = progressNav ? progressNav.offsetHeight : 0;
            const offset = navH + 8;

            const targetY = target.getBoundingClientRect().top + window.scrollY - offset;

            window.scrollTo({ top: targetY, behavior: 'smooth' });
        });
    });

    // ========================================
    // SCROLL REVEAL (generic sections)
    // ========================================
    const revealEls = document.querySelectorAll('.ig-reveal');

    if ('IntersectionObserver' in window && revealEls.length > 0) {
        const revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        revealEls.forEach(function (el) {
            revealObserver.observe(el);
        });
    } else {
        // Fallback: show all immediately
        revealEls.forEach(function (el) {
            el.classList.add('is-visible');
        });
    }

    // ========================================
    // ISOMETRIC ROOM ANIMATION (scroll-triggered)
    // ========================================
    var roomSvg = document.getElementById('ig-room-svg');
    var roomStage = document.querySelector('.ig-room-stage');
    var roomAnimationDone = false;

    var ROOM_STAGES = [
        { cls: 'stage-1', delay: 0 },    // Floor & walls
        { cls: 'stage-2', delay: 700 },  // Furniture + plant
        { cls: 'stage-3', delay: 1300 }, // Hawaa device
        { cls: 'stage-4', delay: 1700 }, // Clearance zone
        { cls: 'stage-5', delay: 2500 }  // Labels
    ];

    var roomTimers = [];

    function runRoomAnimation() {
        // Clear any pending timers
        roomTimers.forEach(clearTimeout);
        roomTimers = [];

        // Reset all stages
        if (!roomSvg) return;
        ROOM_STAGES.forEach(function (s) {
            roomSvg.classList.remove(s.cls);
        });

        // Schedule each stage
        ROOM_STAGES.forEach(function (stage) {
            var t = setTimeout(function () {
                roomSvg.classList.add(stage.cls);
            }, stage.delay);
            roomTimers.push(t);
        });
    }

    // Replay on tap/click
    if (roomStage) {
        roomStage.addEventListener('click', function () {
            runRoomAnimation();
        });
    }

    // Trigger on scroll into view
    if ('IntersectionObserver' in window && roomSvg) {
        var roomObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting && !roomAnimationDone) {
                    roomAnimationDone = true;
                    runRoomAnimation();
                }
            });
        }, { threshold: 0.3 });

        var placementSection = document.getElementById('ig-placement');
        if (placementSection) {
            roomObserver.observe(placementSection);
        }
    } else if (roomSvg) {
        // Fallback: run immediately
        runRoomAnimation();
    }

    // ========================================
    // VIDEO — ensure autoplay on iOS
    // ========================================
    var powerVideo = document.querySelector('.ig-power-video');

    if (powerVideo) {
        powerVideo.setAttribute('playsinline', '');
        powerVideo.setAttribute('muted', '');

        // Retry play on user interaction if autoplay blocked
        var videoPlayAttempted = false;

        function tryPlayVideo() {
            if (videoPlayAttempted) return;
            videoPlayAttempted = true;
            powerVideo.play().catch(function () {
                // Silently handle autoplay block
            });
        }

        document.addEventListener('touchstart', tryPlayVideo, { once: true, passive: true });
        document.addEventListener('click', tryPlayVideo, { once: true });

        // Attempt play immediately
        powerVideo.play().catch(function () {
            // Will retry on user interaction
        });
    }

    // ========================================
    // FOOTER ACCORDION (mobile)
    // already handled by nav.js — no duplicate needed
    // ========================================

})();
