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
    // READING PROGRESS BAR (blog-post.html)
    // ========================================
    const progressFill = document.getElementById('ba-progress-fill');
    const articleBody = document.querySelector('.ba-body');

    if (progressFill && articleBody) {
        const updateProgress = () => {
            const start = articleBody.offsetTop;
            const total = articleBody.offsetHeight - window.innerHeight;
            const progress = total > 0 ? (window.scrollY - start) / total : 1;
            const pct = Math.min(100, Math.max(0, progress * 100));
            progressFill.style.width = pct + '%';
        };
        window.addEventListener('scroll', updateProgress, { passive: true });
        window.addEventListener('resize', updateProgress, { passive: true });
        updateProgress();
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
