/* ============================================================
   HAWAA — HELP & LEGAL PAGES
   Shared behaviour for faq.html, terms-of-service.html and
   privacy-policy.html: scroll reveal, FAQ accordion + live
   search + category chips, legal TOC scroll-spy, and the
   mobile footer collapsibles.
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {

    document.documentElement.classList.add('hx-js');

    // ========================================
    // SCROLL REVEAL
    // ========================================
    var revealEls = document.querySelectorAll('[data-reveal]');
    if (revealEls.length && 'IntersectionObserver' in window) {
        var revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-in');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

        revealEls.forEach(function (el) { revealObserver.observe(el); });
    } else {
        revealEls.forEach(function (el) { el.classList.add('is-in'); });
    }

    // ========================================
    // FAQ ACCORDION
    // ========================================
    var faqItems = Array.prototype.slice.call(document.querySelectorAll('.fq-item'));
    faqItems.forEach(function (item) {
        var btn = item.querySelector('.fq-q');
        if (!btn) return;
        btn.addEventListener('click', function () {
            var open = item.classList.toggle('open');
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
    });

    // ========================================
    // FAQ CATEGORY CHIPS
    // ========================================
    var chips = Array.prototype.slice.call(document.querySelectorAll('.fq-chip'));
    var categories = Array.prototype.slice.call(document.querySelectorAll('.fq-category'));
    var searchInput = document.getElementById('fq-search');
    var searchClear = document.getElementById('fq-search-clear');
    var emptyState = document.getElementById('fq-empty');
    var activeCategory = 'all';

    function normalise(str) {
        return (str || '').toLowerCase().replace(/\s+/g, ' ').trim();
    }

    function applyFilters() {
        var query = normalise(searchInput ? searchInput.value : '');
        var anyVisible = false;

        categories.forEach(function (category) {
            var inCategory = activeCategory === 'all' || category.dataset.category === activeCategory;
            var visibleCount = 0;
            var items = category.querySelectorAll('.fq-item');

            Array.prototype.forEach.call(items, function (item) {
                var haystack = normalise(item.textContent);
                var matches = inCategory && (!query || haystack.indexOf(query) !== -1);
                item.hidden = !matches;
                if (matches) visibleCount++;
            });

            category.hidden = visibleCount === 0;
            if (visibleCount > 0) anyVisible = true;

            var count = category.querySelector('.fq-category-count');
            if (count) {
                count.textContent = visibleCount + (visibleCount === 1 ? ' question' : ' questions');
            }
        });

        if (emptyState) {
            emptyState.classList.toggle('is-visible', !anyVisible);
        }
        if (searchClear) {
            searchClear.classList.toggle('is-visible', query.length > 0);
        }
    }

    chips.forEach(function (chip) {
        chip.addEventListener('click', function () {
            chips.forEach(function (c) { c.classList.remove('active'); });
            chip.classList.add('active');
            activeCategory = chip.dataset.filter || 'all';
            applyFilters();
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
        searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                searchInput.value = '';
                applyFilters();
            }
        });
    }

    if (searchClear) {
        searchClear.addEventListener('click', function () {
            searchInput.value = '';
            applyFilters();
            searchInput.focus();
        });
    }

    if (categories.length) applyFilters();

    // ========================================
    // LEGAL TOC — smooth scroll + scroll-spy
    // ========================================
    var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.lg-toc-link'));
    var legalSections = Array.prototype.slice.call(document.querySelectorAll('.lg-section[id]'));
    var mobileToc = document.querySelector('.lg-toc-mobile');

    if (tocLinks.length && legalSections.length) {
        tocLinks.forEach(function (link) {
            link.addEventListener('click', function () {
                if (mobileToc && mobileToc.open) mobileToc.open = false;
            });
        });

        var setActive = function (id) {
            tocLinks.forEach(function (link) {
                link.classList.toggle('active', link.getAttribute('href') === '#' + id);
            });
        };

        if ('IntersectionObserver' in window) {
            var currentId = legalSections[0].id;
            var spy = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        currentId = entry.target.id;
                    }
                });
                setActive(currentId);
            }, { rootMargin: '-25% 0px -65% 0px' });

            legalSections.forEach(function (section) { spy.observe(section); });
        }

        setActive(legalSections[0].id);
    }

    // ========================================
    // FOOTER MOBILE COLLAPSIBLE
    // ========================================
    var footerSections = Array.prototype.slice.call(document.querySelectorAll('[data-footer-section]'));
    footerSections.forEach(function (section) {
        var header = section.querySelector('.footer-links-header');
        if (!header) return;
        header.addEventListener('click', function () {
            if (window.innerWidth >= 768) return;
            var isActive = section.classList.contains('active');
            footerSections.forEach(function (s) { s.classList.remove('active'); });
            if (!isActive) section.classList.add('active');
        });
    });

});
