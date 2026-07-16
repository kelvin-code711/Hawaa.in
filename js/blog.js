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
    // IN-ARTICLE WIDGET 1 — PM2.5 SLIDER
    // ========================================
    const aqiWidget = document.getElementById('ba-aqi-widget');
    const aqiRange = document.getElementById('ba-aqi-range');
    const aqiNum = document.getElementById('ba-aqi-num');
    const aqiBadge = document.getElementById('ba-aqi-badge');
    const aqiText = document.getElementById('ba-aqi-text');

    if (aqiWidget && aqiRange && aqiNum && aqiBadge && aqiText) {
        aqiWidget.hidden = false;

        const bands = [
            { max: 30,  cls: 'ok',  label: 'Good',      text: 'Ideal for deep, uninterrupted sleep. This is what your bedroom should feel like all night.' },
            { max: 60,  cls: 'mid', label: 'Moderate',  text: 'Light sleepers may notice more tossing and turning. Worth keeping an eye on.' },
            { max: 90,  cls: 'mid', label: 'Poor',      text: 'Around 20% more nighttime awakenings at this level — typical of Indian city winters.' },
            { max: 140, cls: 'bad', label: 'Very poor', text: 'Restless nights are likely. Your airways are working overtime while you sleep.' },
            { max: 999, cls: 'bad', label: 'Hazardous', text: 'Serious sleep disruption territory. A HEPA purifier makes the biggest difference here.' }
        ];

        const updateAqi = () => {
            const val = parseInt(aqiRange.value, 10);
            const band = bands.find(b => val <= b.max);
            aqiNum.textContent = val;
            aqiBadge.textContent = band.label;
            aqiBadge.className = 'ba-aqi-badge ' + band.cls;
            aqiText.textContent = band.text;
        };

        aqiRange.addEventListener('input', updateAqi);
        updateAqi();
    }

    // ========================================
    // IN-ARTICLE WIDGET 2 — BREATHING BREAK
    // ========================================
    const breathWidget = document.getElementById('ba-breath');
    const breathCircle = document.getElementById('ba-breath-circle');
    const breathLabel = document.getElementById('ba-breath-label');
    const breathSub = document.getElementById('ba-breath-sub');

    if (breathWidget && breathCircle && breathLabel) {
        breathWidget.hidden = false;

        const PHASE_MS = 4000;
        const CYCLES = 3;
        let breathing = false;
        const timers = [];

        const setPhase = (grow, text) => {
            breathCircle.classList.toggle('grow', grow);
            breathLabel.style.opacity = '0';
            timers.push(setTimeout(() => {
                breathLabel.textContent = text;
                breathLabel.style.opacity = '1';
            }, 350));
        };

        breathCircle.addEventListener('click', () => {
            if (breathing) return;
            breathing = true;
            breathCircle.classList.add('running');

            for (let i = 0; i < CYCLES; i++) {
                timers.push(setTimeout(() => setPhase(true, 'Inhale…'), i * PHASE_MS * 2));
                timers.push(setTimeout(() => setPhase(false, 'Exhale…'), i * PHASE_MS * 2 + PHASE_MS));
            }

            timers.push(setTimeout(() => {
                setPhase(false, 'Nicely done');
                if (breathSub) {
                    breathSub.textContent = 'That calm? Clean air makes every breath feel this easy. Now — back to the good part.';
                }
                breathing = false;
                breathCircle.classList.remove('running');
                timers.push(setTimeout(() => {
                    breathLabel.style.opacity = '0';
                    timers.push(setTimeout(() => {
                        breathLabel.textContent = 'Go again';
                        breathLabel.style.opacity = '1';
                    }, 350));
                }, 2600));
            }, CYCLES * PHASE_MS * 2));
        });
    }

    // ========================================
    // IN-ARTICLE WIDGET 3 — SYMPTOM SELF-CHECK
    // ========================================
    const signsList = document.getElementById('ba-signs');
    const signsResult = document.getElementById('ba-signs-result');

    if (signsList && signsResult) {
        signsList.classList.add('ba-signs-live');
        signsResult.hidden = false;
        const signItems = signsList.querySelectorAll('li');
        const total = signItems.length;

        const verdicts = (n) => {
            if (n === 0) return { cls: '', text: 'Tap any that feel familiar — we’ll tell you what it means.' };
            if (n <= 2) return { cls: '', text: n + ' of ' + total + ' — could be coincidence, but your bedroom air is worth watching.' };
            if (n <= 4) return { cls: 'warn', text: n + ' of ' + total + ' — your bedroom air likely needs attention. The next section has the fix.' };
            return { cls: 'warn', text: n + ' of ' + total + ' — your mornings are practically begging for cleaner air. Keep reading.' };
        };

        const updateSigns = () => {
            const n = signsList.querySelectorAll('li.on').length;
            const v = verdicts(n);
            signsResult.textContent = v.text;
            signsResult.className = 'ba-signs-result' + (v.cls ? ' ' + v.cls : '');
        };

        signItems.forEach(li => {
            li.setAttribute('role', 'checkbox');
            li.setAttribute('aria-checked', 'false');
            li.setAttribute('tabindex', '0');

            const toggle = () => {
                li.classList.toggle('on');
                li.setAttribute('aria-checked', li.classList.contains('on') ? 'true' : 'false');
                updateSigns();
            };

            li.addEventListener('click', toggle);
            li.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggle();
                }
            });
        });

        updateSigns();
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
