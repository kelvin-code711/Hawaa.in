/* ========================================
   HAWAA vs RIVALS — Comparison Card
   Renders one rival at a time into the Mila-style
   side-by-side card and handles competitor switching.
======================================== */
(function () {
    'use strict';

    var RIVALS = window.HAWAA_RIVALS || [];
    if (!RIVALS.length) return;

    var card = document.getElementById('cmp-card');
    if (!card) return;

    var els = {
        section: document.getElementById('comparison'),
        rivalName: document.getElementById('cmp-card-rival-name'),
        rivalModel: document.getElementById('cmp-card-rival-model'),
        rivalSilhouette: document.getElementById('cmp-card-rival-silhouette'),
        specs: document.getElementById('cmp-card-specs'),
        save: document.getElementById('cmp-card-save'),
        footnote: document.getElementById('cmp-card-footnote'),
        verdictLine: document.getElementById('cmp-card-verdict-line'),
        verdictBtn: document.getElementById('cmp-card-verdict-btn'),
        index: document.getElementById('cmp-card-index'),
        prev: document.getElementById('cmp-card-prev'),
        next: document.getElementById('cmp-card-next')
    };

    var current = 0;

    function escapeAttr(s) {
        return String(s).replace(/"/g, '&quot;');
    }

    function specRow(row) {
        var sub = row.sub ? ' <span class="cmp-card-spec-sub">' + row.sub + '</span>' : '';
        var totalCls = row.total ? ' cmp-card-spec--total' : '';
        return '' +
            '<div class="cmp-card-spec' + totalCls + '">' +
                '<div class="cmp-card-spec-val cmp-card-spec-val--hawaa cmp-card-spec-val--' + row.hs + '">' + row.h + '</div>' +
                '<div class="cmp-card-spec-label">' + row.m + sub + '</div>' +
                '<div class="cmp-card-spec-val cmp-card-spec-val--rival cmp-card-spec-val--' + row.rs + '">' + row.r + '</div>' +
            '</div>';
    }

    function render(i) {
        var d = RIVALS[i];
        if (!d) return;
        current = i;

        els.rivalName.textContent = d.brand;
        els.rivalModel.textContent = d.model;

        var specsHtml = '';
        d.groups.forEach(function (g) {
            specsHtml += '<div class="cmp-card-group-label">' + g.label + '</div>';
            g.rows.forEach(function (row) { specsHtml += specRow(row); });
        });
        els.specs.innerHTML = specsHtml;

        els.save.innerHTML = d.save;

        if (d.footnote) {
            els.footnote.innerHTML = d.footnote;
            els.footnote.hidden = false;
        } else {
            els.footnote.innerHTML = '';
            els.footnote.hidden = true;
        }

        els.verdictLine.textContent = d.verdictLine;
        els.verdictBtn.setAttribute('data-verdict', d.key);

        els.index.textContent = (i + 1) + ' / ' + RIVALS.length;
    }

    function go(delta) {
        var n = (current + delta + RIVALS.length) % RIVALS.length;
        render(n);
    }

    if (els.prev) els.prev.addEventListener('click', function () { go(-1); });
    if (els.next) els.next.addEventListener('click', function () { go(1); });

    /* Keyboard arrows when the card is in view-focus */
    card.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') { go(-1); }
        else if (e.key === 'ArrowRight') { go(1); }
    });

    /* Hero carousel cards select a rival instead of jumping to a dead anchor */
    var keyIndex = {};
    RIVALS.forEach(function (d, i) { keyIndex[d.key] = i; });

    document.querySelectorAll('.cmp-hero-card[href^="#comparison-"]').forEach(function (link) {
        link.addEventListener('click', function (e) {
            var key = link.getAttribute('href').replace('#comparison-', '');
            if (key in keyIndex) {
                e.preventDefault();
                render(keyIndex[key]);
                if (els.section) {
                    els.section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });

    render(0);
})();
