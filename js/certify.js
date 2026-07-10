/* ========================================
   HOME — Certification Section
   1) Mini side-by-side comparison (rival cycling,
      data reused from js/comparison-data.js)
   2) Lab report chart card with report chips
======================================== */
(function () {
    'use strict';

    /* ---------- MINI COMPARISON ---------- */
    var STAT_KEYS = ['devicePrice', 'cadr', 'coverage', 'noise', 'filterPrice'];
    var STAT_LABELS = {
        devicePrice: 'Device Price',
        cadr: 'CADR',
        coverage: 'Coverage',
        noise: 'Noise (Sleep Mode)',
        filterPrice: 'Filter Price'
    };

    function initMiniCompare() {
        var nameEl = document.getElementById('cmpm-rival-name');
        var statsEl = document.getElementById('cmpm-rival-stats');
        var prevBtn = document.getElementById('cmpm-prev');
        var nextBtn = document.getElementById('cmpm-next');
        if (!nameEl || !statsEl || !window.HAWAA_COMPARE) return;

        var rivals = window.HAWAA_COMPARE.rivals;
        var idx = 0;

        function render() {
            var rival = rivals[idx];
            nameEl.textContent = rival.brand + ' ' + rival.model;
            statsEl.innerHTML = STAT_KEYS.map(function (key) {
                return '<div class="cmpm-stat">' +
                    '<span class="cmpm-stat-label">' + STAT_LABELS[key] + '</span>' +
                    '<span class="cmpm-stat-value">' + rival.values[key].v + '</span>' +
                    '</div>';
            }).join('');
        }

        var rivalCol = document.querySelector('.cmpm-col--rival');

        function step(dir) {
            idx = (idx + dir + rivals.length) % rivals.length;
            render();
            if (rivalCol) {
                rivalCol.classList.remove('swapping-next', 'swapping-prev');
                void rivalCol.offsetWidth; /* restart the animation */
                rivalCol.classList.add(dir > 0 ? 'swapping-next' : 'swapping-prev');
            }
        }

        if (prevBtn) prevBtn.addEventListener('click', function () { step(-1); });
        if (nextBtn) nextBtn.addEventListener('click', function () { step(1); });

        // Touch swipe anywhere on the comparison block cycles rivals
        var swipeEl = document.querySelector('.cmpm');
        if (swipeEl) {
            var startX = 0, startY = 0, swiping = false;
            swipeEl.addEventListener('touchstart', function (e) {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                swiping = true;
            }, { passive: true });
            swipeEl.addEventListener('touchend', function (e) {
                if (!swiping) return;
                swiping = false;
                var dx = e.changedTouches[0].clientX - startX;
                var dy = e.changedTouches[0].clientY - startY;
                if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
                    step(dx < 0 ? 1 : -1);
                }
            }, { passive: true });
        }

        render();
    }

    /* ---------- LAB TEST REPORT DOSSIER + LIGHTBOX ---------- */
    function initReportDossier() {
        var papers = Array.prototype.slice.call(document.querySelectorAll('.dossier-paper'));
        var rows = Array.prototype.slice.call(document.querySelectorAll('.dossier-row'));
        if (!papers.length) return;

        function setActive(active) {
            var pos = 1;
            papers.forEach(function (p, i) {
                p.classList.remove('stack-0', 'stack-1', 'stack-2', 'stack-3');
                p.classList.add('stack-' + (i === active ? 0 : pos++));
            });
            rows.forEach(function (r, i) {
                r.classList.toggle('active', i === active);
                if (i === active) r.setAttribute('aria-current', 'true');
                else r.removeAttribute('aria-current');
            });
        }

        rows.forEach(function (row, i) {
            row.addEventListener('click', function () { setActive(i); });
        });
        setActive(0);

        /* Lightbox */
        var box = document.getElementById('report-lightbox');
        if (!box) return;
        var img = document.getElementById('report-lightbox-img');
        var fallback = document.getElementById('report-lightbox-fallback');
        var caption = document.getElementById('report-lightbox-caption');
        var closeBtn = document.getElementById('report-lightbox-close');
        var lastFocus = null;

        img.addEventListener('error', function () {
            img.style.display = 'none';
            fallback.style.display = 'flex';
        });

        function open(paper) {
            lastFocus = paper;
            var title = paper.getAttribute('data-report-title');
            caption.textContent = title + ' — ' + paper.getAttribute('data-report-stat');
            img.style.display = '';
            fallback.style.display = 'none';
            img.alt = title + ' lab report';
            img.src = paper.getAttribute('data-report-src');
            box.classList.add('open');
            document.body.style.overflow = 'hidden';
            closeBtn.focus();
        }

        function close() {
            box.classList.remove('open');
            document.body.style.overflow = '';
            if (lastFocus) lastFocus.focus();
        }

        papers.forEach(function (paper) {
            paper.addEventListener('click', function () {
                if (paper.classList.contains('stack-0')) open(paper);
            });
        });
        closeBtn.addEventListener('click', close);
        box.addEventListener('click', function (e) {
            if (e.target === box) close();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && box.classList.contains('open')) close();
        });
    }

    /* ---------- LAB REPORT CARD ---------- */
    /* Charts plot "dirty air remaining" downward (dirty = top/red,
       clean = bottom/teal) for removal charts; simple rising lines
       for noise and energy. */
    var GRAD_STOPS = ['#A8452F', '#B07A2E', '#1E7C71'];

    var REPORTS = {
        pm25: {
            title: 'It removes <strong>99.97% of PM2.5</strong>, so you don’t have to worry about what you breathe.',
            legend: [
                { swatch: 'grad', label: 'Hawaa removal efficiency %' },
                { swatch: 'dash', label: 'Natural decay' }
            ],
            x: ['0min', '5min', '10min', '15min', '20min', '25min', '30min'],
            values: [100, 44, 18, 6, 2, 0.8, 0.03],
            decay: [100, 97, 94, 91.5, 89, 87, 85],
            gradient: true,
            labels: { 0: '0%', 1: '56%', 6: '99.97%' },
            footnote: 'H13 HEPA filter tested in a sealed chamber per ANSI/AHAM AC-1 protocols. PM2.5 removal verified at 99.97% in 30 minutes, capturing particles down to 0.3 microns.'
        },
        cadr: {
            title: 'A full room of clean air in <strong>under 10 minutes</strong> — 410 m³ of it every hour.',
            legend: [
                { swatch: 'grad', label: 'Room air cleaned %' }
            ],
            x: ['0min', '2min', '4min', '6min', '8min', '10min'],
            values: [100, 62, 36, 18, 7, 0],
            gradient: true,
            labels: { 0: '0%', 5: '100%' },
            footnote: 'Clean Air Delivery Rate measured across all fan speeds in a sealed chamber following industry-standard protocols. Maximum CADR verified at 410 m³/h.'
        },
        noise: {
            title: 'Whisper-quiet at <strong>24 dB in sleep mode</strong> — you’ll forget it’s on.',
            legend: [
                { swatch: 'solid', label: 'Noise level (dB)' }
            ],
            x: ['Sleep', 'Low', 'Medium', 'Turbo'],
            values: [24, 34, 43, 52],
            max: 60,
            labels: { 0: '24 dB', 3: '52 dB' },
            footnote: 'Decibel levels measured from 1 metre in an anechoic chamber, from sleep mode to maximum speed. Sleep mode is quieter than ambient room noise.'
        },
        energy: {
            title: 'Sips <strong>just 7W in sleep mode</strong> and never more than 45W.',
            legend: [
                { swatch: 'solid', label: 'Power draw (W)' }
            ],
            x: ['Sleep', 'Low', 'Medium', 'Turbo'],
            values: [7, 18, 30, 45],
            max: 52,
            labels: { 0: '7W', 3: '45W' },
            footnote: 'Power draw measured across all fan speeds. Running 24/7 costs roughly ₹2 a day at average Indian residential tariffs.'
        }
    };

    function lerpColor(a, b, t) {
        var pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
        var pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
        var c = pa.map(function (v, i) { return Math.round(v + (pb[i] - v) * t); });
        return 'rgb(' + c.join(',') + ')';
    }

    function gradColorAt(t) {
        if (t <= 0.5) return lerpColor(GRAD_STOPS[0], GRAD_STOPS[1], t * 2);
        return lerpColor(GRAD_STOPS[1], GRAD_STOPS[2], (t - 0.5) * 2);
    }

    function buildChart(report) {
        var W = 340, H = 210;
        var padL = 14, padR = 14, padT = 30, padB = 30;
        var n = report.x.length;
        var vals = report.values;
        var all = vals.slice();
        if (report.decay) all = all.concat(report.decay);
        var min = 0;
        var max = report.max || Math.max.apply(null, all);

        function px(i) { return padL + (W - padL - padR) * i / (n - 1); }
        function py(v) { return padT + (H - padT - padB) * (1 - (v - min) / (max - min)); }

        var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img">';

        if (report.gradient) {
            s += '<defs><linearGradient id="lab-grad" gradientUnits="userSpaceOnUse" x1="' + padL + '" y1="0" x2="' + (W - padR) + '" y2="0">' +
                '<stop offset="0%" stop-color="' + GRAD_STOPS[0] + '"/>' +
                '<stop offset="50%" stop-color="' + GRAD_STOPS[1] + '"/>' +
                '<stop offset="100%" stop-color="' + GRAD_STOPS[2] + '"/>' +
                '</linearGradient></defs>';
        }

        // vertical gridlines + x labels
        var i;
        for (i = 0; i < n; i++) {
            s += '<line x1="' + px(i) + '" y1="' + padT + '" x2="' + px(i) + '" y2="' + (H - padB) + '" stroke="var(--ink-line-soft)" stroke-width="1"/>';
            var anchor = i === 0 ? 'start' : (i === n - 1 ? 'end' : 'middle');
            s += '<text x="' + px(i) + '" y="' + (H - 10) + '" text-anchor="' + anchor + '" font-size="11" font-weight="600" fill="var(--ink-soft)" font-family="Outfit, sans-serif">' + report.x[i] + '</text>';
        }

        // natural decay dashed line
        if (report.decay) {
            var dPts = report.decay.map(function (v, j) { return px(j) + ',' + py(v); }).join(' ');
            s += '<polyline points="' + dPts + '" fill="none" stroke="var(--ink-faint)" stroke-width="2" stroke-dasharray="5 5"/>';
        }

        // main line
        var pts = vals.map(function (v, j) { return px(j) + ',' + py(v); }).join(' ');
        var stroke = report.gradient ? 'url(#lab-grad)' : 'var(--teal-deep)';
        s += '<polyline points="' + pts + '" fill="none" stroke="' + stroke + '" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>';

        // dots
        for (i = 0; i < n; i++) {
            var color = report.gradient ? gradColorAt(i / (n - 1)) : '#1E7C71';
            s += '<circle cx="' + px(i) + '" cy="' + py(vals[i]) + '" r="4" fill="' + color + '" stroke="var(--paper)" stroke-width="1.5"/>';
        }

        // value pills
        Object.keys(report.labels).forEach(function (key) {
            var j = parseInt(key, 10);
            var label = report.labels[key];
            var pw = label.length * 6.8 + 14;
            var ph = 20;
            var cx = px(j), cy = py(vals[j]);
            var rx = Math.max(2, Math.min(W - pw - 2, cx - pw / 2));
            var ry = cy - ph - 9;
            if (ry < 2) ry = cy + 9;
            var tColor = report.gradient ? gradColorAt(j / (n - 1)) : '#1E7C71';
            s += '<rect x="' + rx + '" y="' + ry + '" width="' + pw + '" height="' + ph + '" rx="10" fill="var(--paper)" stroke="var(--ink-line-soft)"/>' +
                '<text x="' + (rx + pw / 2) + '" y="' + (ry + 14) + '" text-anchor="middle" font-size="11.5" font-weight="700" fill="' + tColor + '" font-family="Outfit, sans-serif">' + label + '</text>';
        });

        s += '</svg>';
        return s;
    }

    function initLabCard() {
        var titleEl = document.getElementById('lab-card-title');
        var legendEl = document.getElementById('lab-legend');
        var chartEl = document.getElementById('lab-chart');
        var footnoteEl = document.getElementById('lab-footnote');
        var chipsEl = document.getElementById('lab-chips');
        if (!titleEl || !chartEl || !chipsEl) return;

        function render(key) {
            var report = REPORTS[key];
            if (!report) return;
            titleEl.innerHTML = report.title;
            legendEl.innerHTML = report.legend.map(function (item) {
                return '<span class="lab-legend-item"><span class="lab-legend-swatch lab-legend-swatch--' + item.swatch + '"></span>' + item.label + '</span>';
            }).join('');
            chartEl.innerHTML = buildChart(report);
            footnoteEl.textContent = report.footnote;
        }

        chipsEl.addEventListener('click', function (e) {
            var chip = e.target.closest('.lab-chip');
            if (!chip) return;
            chipsEl.querySelectorAll('.lab-chip').forEach(function (c) { c.classList.remove('active'); });
            chip.classList.add('active');
            render(chip.dataset.report);
        });

        render('pm25');
    }

    document.addEventListener('DOMContentLoaded', function () {
        initMiniCompare();
        initReportDossier();
        initLabCard();
    });
})();
