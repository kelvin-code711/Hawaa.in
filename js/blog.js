/* ========================================
   BLOG PAGE JAVASCRIPT
   Handles: header scroll, category filtering,
   sticky tabs, related posts slider
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
