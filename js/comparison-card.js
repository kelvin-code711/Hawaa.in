/* ========================================
   HAWAA vs RIVALS — Comparison (Mila-style)
   Fixed Hawaa column on the left; rival product
   cards scroll horizontally on the right. Summary
   (savings / verdict) tracks the rival in view and
   crossfades between rivals instead of blinking.
======================================== */
(function () {
    'use strict';

    var DATA = window.HAWAA_COMPARE;
    if (!DATA) return;

    var root = document.getElementById('cmp-compare');
    var scroll = document.getElementById('cmp-scroll');
    var hawaaCells = document.getElementById('cmp-hawaa-cells');
    if (!root || !scroll || !hawaaCells) return;

    var els = {
        section: document.getElementById('comparison'),
        summaryInner: document.getElementById('cmp-summary-inner'),
        save: document.getElementById('cmp-save'),
        footnote: document.getElementById('cmp-footnote'),
        verdictLine: document.getElementById('cmp-verdict-line'),
        verdictBtn: document.getElementById('cmp-verdict-btn'),
        index: document.getElementById('cmp-index'),
        prev: document.getElementById('cmp-prev'),
        next: document.getElementById('cmp-next')
    };

    var rivals = DATA.rivals;
    var current = 0;
    var SWITCH_MS = 200;

    /* --- Build the stacked label/value cells for one column --- */
    function cellsHtml(getCell) {
        var html = '';
        DATA.metrics.forEach(function (group) {
            html += '<div class="cmp-grouphead">' + group.group + '</div>';
            group.rows.forEach(function (row) {
                var c = getCell(row);
                var sub = row.sub ? '<span class="cmp-cell-sub">' + row.sub + '</span>' : '';
                var totalCls = row.total ? ' cmp-cell--total' : '';
                html += '' +
                    '<div class="cmp-cell' + totalCls + '">' +
                        '<span class="cmp-cell-label">' + row.label + sub + '</span>' +
                        '<span class="cmp-cell-val cmp-cell-val--' + c.s + '">' + c.v + '</span>' +
                    '</div>';
            });
        });
        return html;
    }

    /* Hawaa column — fixed baseline, rendered once */
    hawaaCells.innerHTML = cellsHtml(function (row) {
        return { v: DATA.hawaa.values[row.key], s: 'hawaa' };
    });

    /* Rival cards — one per competitor, injected into the scroller */
    function rivalCardHtml(r, i) {
        var head =
            '<div class="cmp-col-badge-slot"></div>' +
            '<div class="cmp-col-figure cmp-col-figure--rival">' +
                '<svg viewBox="0 0 120 150" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                    '<rect x="24" y="14" width="72" height="104" rx="10"/>' +
                    '<circle cx="60" cy="44" r="11"/>' +
                    '<path d="M36 74h48M36 86h48M36 98h48"/>' +
                    '<path d="M34 118l-7 18M86 118l7 18"/>' +
                '</svg>' +
            '</div>' +
            '<div class="cmp-col-head">' +
                '<span class="cmp-col-brand">' + r.brand + '</span>' +
                '<span class="cmp-col-model">' + r.model + '</span>' +
            '</div>';
        var cells = cellsHtml(function (row) {
            return r.values[row.key] || { v: '—', s: 'neutral' };
        });
        return '<div class="cmp-col cmp-col--rival" data-rival="' + i + '" id="cmp-rival-' + i + '">' +
            head + '<div class="cmp-col-cells">' + cells + '</div></div>';
    }

    scroll.innerHTML = rivals.map(rivalCardHtml).join('');

    /* --- Summary rendering --- */
    function renderSummary(i) {
        var r = rivals[i];
        els.save.innerHTML =
            '<span class="cmp-save-eyebrow">Total 5-year savings</span>' +
            '<span class="cmp-save-amount">' + r.saveAmount + '</span>' +
            '<span class="cmp-save-note">' + r.saveNote + '</span>';
        if (r.footnote) {
            els.footnote.innerHTML = r.footnote;
            els.footnote.hidden = false;
        } else {
            els.footnote.innerHTML = '';
            els.footnote.hidden = true;
        }
        els.verdictLine.textContent = r.verdictLine;
        els.verdictBtn.setAttribute('data-verdict', r.key);
    }

    function updateControls(i) {
        els.index.textContent = (i + 1) + ' / ' + rivals.length;
        if (els.prev) els.prev.disabled = (i === 0);
        if (els.next) els.next.disabled = (i === rivals.length - 1);
    }

    /* Crossfade: fade the summary out, swap content, fade back in.
       Rapid calls collapse into one swap (no flicker). */
    var switchTimer = null;
    function setActive(i, animate) {
        if (i < 0 || i >= rivals.length || i === current) return;
        current = i;
        updateControls(i);

        if (!animate || !els.summaryInner) {
            renderSummary(i);
            return;
        }
        els.summaryInner.classList.add('is-switching');
        clearTimeout(switchTimer);
        switchTimer = setTimeout(function () {
            renderSummary(current);
            els.summaryInner.classList.remove('is-switching');
        }, SWITCH_MS);
    }

    renderSummary(0);
    updateControls(0);

    /* --- Scroll tracking ---
       While an arrow click drives a smooth scroll, the observer is
       suppressed so intermediate cards don't rewrite the summary
       (that rewriting was the "blink"). It re-arms once scrolling
       settles. */
    var suppressObserver = false;
    var settleTimer = null;

    scroll.addEventListener('scroll', function () {
        if (!suppressObserver) return;
        clearTimeout(settleTimer);
        settleTimer = setTimeout(function () { suppressObserver = false; }, 150);
    }, { passive: true });

    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            if (suppressObserver) return;
            var best = null;
            entries.forEach(function (e) {
                if (e.isIntersecting && (!best || e.intersectionRatio > best.intersectionRatio)) {
                    best = e;
                }
            });
            if (best) {
                var idx = parseInt(best.target.getAttribute('data-rival'), 10);
                if (!isNaN(idx)) setActive(idx, true);
            }
        }, { root: scroll, threshold: [0.55, 0.75, 1] });
        scroll.querySelectorAll('.cmp-col--rival').forEach(function (c) { io.observe(c); });
    }

    /* --- Switcher arrows scroll the rival strip --- */
    function scrollToRival(i) {
        var card = document.getElementById('cmp-rival-' + i);
        if (!card) return;
        suppressObserver = true;
        clearTimeout(settleTimer);
        settleTimer = setTimeout(function () { suppressObserver = false; }, 700);
        scroll.scrollTo({ left: card.offsetLeft - scroll.offsetLeft, behavior: 'smooth' });
        setActive(i, true);
    }

    if (els.prev) els.prev.addEventListener('click', function () {
        scrollToRival(Math.max(0, current - 1));
    });
    if (els.next) els.next.addEventListener('click', function () {
        scrollToRival(Math.min(rivals.length - 1, current + 1));
    });

    /* --- Hero carousel cards jump to a specific rival --- */
    var keyIndex = {};
    rivals.forEach(function (r, i) { keyIndex[r.key] = i; });

    document.querySelectorAll('.cmp-hero-card[href^="#comparison-"]').forEach(function (link) {
        link.addEventListener('click', function (e) {
            var key = link.getAttribute('href').replace('#comparison-', '');
            if (key in keyIndex) {
                e.preventDefault();
                if (els.section) els.section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                scrollToRival(keyIndex[key]);
            }
        });
    });
})();
