/* ========================================
   COMPARISON HERO — Particles & Animations
   ======================================== */

(function () {
    'use strict';

    // ---- HEADER SCROLL TRANSITION ----
    var header = document.getElementById('header');
    var heroEl = document.querySelector('.cmp-hero');

    function handleHeaderScroll() {
        if (!header || !heroEl) return;
        var heroBottom = heroEl.offsetHeight;
        if (window.scrollY > heroBottom - 80) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }

    window.addEventListener('scroll', handleHeaderScroll, { passive: true });
    handleHeaderScroll();

    // ---- PARTICLE CANVAS ----
    var canvas = document.getElementById('cmp-hero-particles');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var particles = [];
    var PARTICLE_COUNT = 80;
    var glows = [];

    function resize() {
        var rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initParticles() {
        var w = canvas.width / dpr;
        var h = canvas.height / dpr;

        particles = [];
        for (var i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                r: 0.5 + Math.random() * 1,
                opacity: 0.08 + Math.random() * 0.22,
                speedY: -(0.15 + Math.random() * 0.35),
                swayAmp: 0.3 + Math.random() * 0.6,
                swayFreq: 0.002 + Math.random() * 0.003,
                swayOffset: Math.random() * Math.PI * 2
            });
        }

        glows = [
            { x: w * 0.25, y: h * 0.6, radius: w * 0.35, opacity: 0.04 },
            { x: w * 0.75, y: h * 0.35, radius: w * 0.3, opacity: 0.035 },
            { x: w * 0.5, y: h * 0.8, radius: w * 0.25, opacity: 0.03 }
        ];
    }

    var time = 0;

    function draw() {
        var w = canvas.width / dpr;
        var h = canvas.height / dpr;

        ctx.clearRect(0, 0, w, h);

        // Draw glow blobs
        for (var g = 0; g < glows.length; g++) {
            var glow = glows[g];
            var grad = ctx.createRadialGradient(glow.x, glow.y, 0, glow.x, glow.y, glow.radius);
            grad.addColorStop(0, 'rgba(255, 255, 255, ' + glow.opacity + ')');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(glow.x, glow.y, glow.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw particles
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];

            p.y += p.speedY;
            p.x += Math.sin(time * p.swayFreq + p.swayOffset) * p.swayAmp;

            // Wrap around
            if (p.y < -10) {
                p.y = h + 10;
                p.x = Math.random() * w;
            }
            if (p.x < -10) p.x = w + 10;
            if (p.x > w + 10) p.x = -10;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, ' + p.opacity + ')';
            ctx.fill();
        }

        time++;
        requestAnimationFrame(draw);
    }

    resize();
    initParticles();
    draw();

    var resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            resize();
            initParticles();
        }, 200);
    });

    // Headline blur reveal animation
    var headline = document.getElementById('cmp-hero-headline');
    if (headline) {
        setTimeout(function () {
            headline.classList.add('is-revealed');
        }, 1400);
    }
})();
