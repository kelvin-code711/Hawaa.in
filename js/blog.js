/* ========================================
   BLOG PAGE JAVASCRIPT
   Handles: header scroll, category filtering,
   featured card, sticky tabs, reading progress,
   share actions, related posts slider
======================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ========================================
    // HEADER SCROLL EFFECT
    // ========================================
    const header = document.getElementById('header');
    if (header && !header.classList.contains('scrolled')) {
        const handleHeaderScroll = () => {
            if (window.scrollY > 80) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        };
        window.addEventListener('scroll', handleHeaderScroll, { passive: true });
        handleHeaderScroll();
    }

    // ========================================
    // CATEGORY TAB FILTERING (blogs.html)
    // ========================================
    const catButtons = document.querySelectorAll('.bl-cat');
    const blogCards = document.querySelectorAll('.bl-card');
    const catLabel = document.getElementById('bl-cat-label');
    const catCount = document.getElementById('bl-count');
    const catsBar = document.getElementById('bl-cats');

    if (catButtons.length > 0 && blogCards.length > 0) {
        // Category name mapping
        const catNames = {
            'all': 'All',
            'air-quality': 'Air Quality',
            'filter-care': 'Filter Care',
            'health': 'Health & Wellness',
            'home': 'Home & Living'
        };

        // Promote the first visible card to the featured slot
        const updateFeatured = () => {
            let first = null;
            blogCards.forEach(card => {
                card.classList.remove('is-feature');
                if (!first && !card.classList.contains('hidden')) {
                    first = card;
                }
            });
            if (first) first.classList.add('is-feature');
        };

        const updateCount = (count) => {
            if (catCount) {
                catCount.textContent = count === 1 ? '1 article' : count + ' articles';
            }
        };

        catButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;

                // Update active button
                catButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update heading label
                if (catLabel) {
                    catLabel.textContent = catNames[category] || 'All';
                }

                // Filter cards
                let visibleCount = 0;
                blogCards.forEach(card => {
                    if (category === 'all' || card.dataset.category === category) {
                        card.classList.remove('hidden');
                        visibleCount++;
                    } else {
                        card.classList.add('hidden');
                    }
                });

                updateFeatured();
                updateCount(visibleCount);

                // Show empty state if no cards
                let emptyEl = document.querySelector('.bl-empty');
                if (visibleCount === 0) {
                    if (!emptyEl) {
                        emptyEl = document.createElement('div');
                        emptyEl.className = 'bl-empty';
                        emptyEl.textContent = 'No articles in this category yet.';
                        document.getElementById('bl-grid').appendChild(emptyEl);
                    }
                    emptyEl.style.display = 'block';
                } else if (emptyEl) {
                    emptyEl.style.display = 'none';
                }
            });
        });

        // Initial state
        updateFeatured();
        updateCount(document.querySelectorAll('.bl-card:not(.hidden)').length);

        // Sticky tabs shadow
        if (catsBar) {
            const observerTarget = document.querySelector('.bl-hero');
            if (observerTarget) {
                const observer = new IntersectionObserver(
                    ([entry]) => {
                        if (!entry.isIntersecting) {
                            catsBar.classList.add('shadow');
                        } else {
                            catsBar.classList.remove('shadow');
                        }
                    },
                    { threshold: 0 }
                );
                observer.observe(observerTarget);
            }
        }
    }

    // ========================================
    // BOOK READER — chapter pager (blog-post.html)
    // Full text stays in the DOM; JS paginates it.
    // ========================================
    const book = document.getElementById('ba-book');
    const progressFill = document.getElementById('ba-progress-fill');

    if (book) {
        const bookPages = Array.from(book.querySelectorAll('.ba-page'));
        const dotsWrap = document.getElementById('ba-book-dots');
        const countEl = document.getElementById('ba-book-count');
        const leftEl = document.getElementById('ba-book-left');
        const prevBtn = document.getElementById('ba-turn-prev');
        const nextBtn = document.getElementById('ba-turn-next');
        const hintEl = document.getElementById('ba-book-hint');
        let pageIdx = 0;

        book.classList.add('js');
        if (hintEl) hintEl.classList.add('js');

        // Build progress dots
        if (dotsWrap) {
            bookPages.forEach(() => dotsWrap.appendChild(document.createElement('i')));
        }
        const dots = dotsWrap ? dotsWrap.querySelectorAll('i') : [];

        const minutesLeft = (fromIdx) => {
            let mins = 0;
            for (let i = fromIdx; i < bookPages.length; i++) {
                mins += parseInt(bookPages[i].dataset.minutes || '0', 10);
            }
            return mins;
        };
        const totalMinutes = minutesLeft(0);

        const keepBookInView = () => {
            const top = book.getBoundingClientRect().top;
            if (top < 60 || top > window.innerHeight * 0.5) {
                const y = window.scrollY + top - 96;
                window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
            }
        };

        const goTo = (n, back, skipScroll) => {
            if (n < 0 || n >= bookPages.length) return;
            bookPages[pageIdx].classList.remove('current', 'turn-back');
            pageIdx = n;
            const page = bookPages[pageIdx];
            page.classList.add('current');
            if (back) page.classList.add('turn-back');

            dots.forEach((d, i) => d.classList.toggle('here', i === pageIdx));
            if (prevBtn) prevBtn.disabled = pageIdx === 0;
            if (nextBtn) nextBtn.disabled = pageIdx === bookPages.length - 1;
            if (countEl) countEl.textContent = page.dataset.label || '';
            if (leftEl) {
                const left = minutesLeft(pageIdx);
                if (pageIdx === bookPages.length - 1) {
                    leftEl.textContent = 'Done ✓';
                } else if (pageIdx === 0) {
                    leftEl.textContent = totalMinutes + ' min';
                } else {
                    leftEl.textContent = '~' + left + ' min left';
                }
            }
            if (progressFill) {
                progressFill.style.width = ((pageIdx / (bookPages.length - 1)) * 100) + '%';
            }
            // Deep-linkable chapters without polluting history
            if (page.id && history.replaceState) {
                history.replaceState(null, '', pageIdx === 0
                    ? window.location.pathname + window.location.search
                    : '#' + page.id);
            }
            if (!skipScroll) keepBookInView();
        };

        // Prev / next controls
        if (prevBtn) prevBtn.addEventListener('click', () => goTo(pageIdx - 1, true));
        if (nextBtn) nextBtn.addEventListener('click', () => goTo(pageIdx + 1, false));

        // TOC entries, start button, "read again"
        book.querySelectorAll('[data-goto]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const target = parseInt(el.dataset.goto, 10);
                goTo(target, target < pageIdx);
            });
        });

        // Keyboard paging
        document.addEventListener('keydown', (e) => {
            if (e.target.matches('input, textarea, select')) return;
            if (e.key === 'ArrowRight') goTo(pageIdx + 1, false);
            if (e.key === 'ArrowLeft') goTo(pageIdx - 1, true);
        });

        // Swipe paging (horizontal only, so vertical scroll stays natural)
        let touchX = null;
        let touchY = null;
        book.addEventListener('touchstart', (e) => {
            touchX = e.touches[0].clientX;
            touchY = e.touches[0].clientY;
        }, { passive: true });
        book.addEventListener('touchend', (e) => {
            if (touchX === null) return;
            const dx = e.changedTouches[0].clientX - touchX;
            const dy = e.changedTouches[0].clientY - touchY;
            if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                if (dx < 0) goTo(pageIdx + 1, false);
                else goTo(pageIdx - 1, true);
            }
            touchX = null;
            touchY = null;
        }, { passive: true });

        // Open on the chapter from the URL hash, if any
        let startIdx = 0;
        if (window.location.hash) {
            const hashIdx = bookPages.findIndex(p => '#' + p.id === window.location.hash);
            if (hashIdx > 0) startIdx = hashIdx;
        }
        goTo(startIdx, false, true);
    } else if (progressFill) {
        // Fallback: scroll-based progress for non-book articles
        const articleBody = document.querySelector('.ba-body');
        if (articleBody) {
            const updateProgress = () => {
                const start = articleBody.offsetTop;
                const total = articleBody.offsetHeight - window.innerHeight;
                const progress = total > 0 ? (window.scrollY - start) / total : 1;
                progressFill.style.width = Math.min(100, Math.max(0, progress * 100)) + '%';
            };
            window.addEventListener('scroll', updateProgress, { passive: true });
            updateProgress();
        }
    }

    // ========================================
    // SHARE ACTIONS (blog-post.html)
    // ========================================
    const shareNativeBtn = document.getElementById('ba-share-native');
    const shareCopyBtn = document.getElementById('ba-share-copy');
    const shareCopyLabel = document.getElementById('ba-share-copy-label');

    const copyLink = () => {
        const done = () => {
            if (!shareCopyBtn) return;
            shareCopyBtn.classList.add('copied');
            if (shareCopyLabel) shareCopyLabel.textContent = 'Link copied!';
            setTimeout(() => {
                shareCopyBtn.classList.remove('copied');
                if (shareCopyLabel) shareCopyLabel.textContent = 'Copy link';
            }, 2000);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(window.location.href).then(done).catch(() => {});
        } else {
            const input = document.createElement('input');
            input.value = window.location.href;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            done();
        }
    };

    if (shareCopyBtn) {
        shareCopyBtn.addEventListener('click', copyLink);
    }

    if (shareNativeBtn) {
        shareNativeBtn.addEventListener('click', () => {
            if (navigator.share) {
                navigator.share({
                    title: document.title,
                    url: window.location.href
                }).catch(() => {});
            } else {
                copyLink();
            }
        });
    }

    // ========================================
    // RELATED POSTS SLIDER (blog-post.html)
    // ========================================
    const relSlider = document.getElementById('ba-related-slider');
    const relPrev = document.getElementById('ba-rel-prev');
    const relNext = document.getElementById('ba-rel-next');

    if (relSlider && relPrev && relNext) {
        const getScrollAmount = () => {
            const card = relSlider.querySelector('.ba-rel-card');
            if (!card) return 300;
            return card.offsetWidth + 20; // card width + gap
        };

        relPrev.addEventListener('click', () => {
            relSlider.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
        });

        relNext.addEventListener('click', () => {
            relSlider.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
        });
    }

});
