/* ========================================
   HAWAA vs RIVALS — Comparison (Mila-style)
   Fixed Hawaa column on the left; rival product
   cards scroll horizontally on the right. Summary
   (savings / verdict) tracks the rival in view.
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

    /* --- Summary (savings + verdict) reflects the rival in view --- */
    function setActive(i) {
        if (i < 0 || i >= rivals.length || i === current) {
            if (i === current) updateSummary(i);
            return;
        }
        current = i;
        updateSummary(i);
    }

    function updateSummary(i) {
        var r = rivals[i];
        els.save.innerHTML = r.save;
        if (r.footnote) {
            els.footnote.innerHTML = r.footnote;
            els.footnote.hidden = false;
        } else {
            els.footnote.innerHTML = '';
            els.footnote.hidden = true;
        }
        els.verdictLine.textContent = r.verdictLine;
        els.verdictBtn.setAttribute('data-verdict', r.key);
        els.index.textContent = (i + 1) + ' / ' + rivals.length;
    }

    updateSummary(0);

    /* Detect which rival card is centered in the scroller */
    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            var best = null;
            entries.forEach(function (e) {
                if (e.isIntersecting && (!best || e.intersectionRatio > best.intersectionRatio)) {
                    best = e;
                }
            });
            if (best) {
                var idx = parseInt(best.target.getAttribute('data-rival'), 10);
                if (!isNaN(idx)) setActive(idx);
            }
        }, { root: scroll, threshold: [0.55, 0.75, 1] });
        scroll.querySelectorAll('.cmp-col--rival').forEach(function (c) { io.observe(c); });
    }

    /* --- Switcher arrows scroll the rival strip --- */
    function scrollToRival(i) {
        var card = document.getElementById('cmp-rival-' + i);
        if (card) {
            scroll.scrollTo({ left: card.offsetLeft - scroll.offsetLeft, behavior: 'smooth' });
            setActive(i);
        }
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
