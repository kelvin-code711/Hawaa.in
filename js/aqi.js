// ========================================
// AQI CHECKER (home page) — live CPCB data
//
// Reads the Firestore doc aqi/latest, which the scheduled Cloud
// Function refreshAqiData rebuilds every 30 minutes from the official
// data.gov.in mirror of CPCB's monitoring stations (see functions/).
// The page never contacts data.gov.in directly and never invents a
// number: unknown cities and outages get honest messages instead.
//
// Loaded as <script type="module"> after js/firebase.js, which
// exposes window.hawaaFirebase synchronously during its evaluation.
// ========================================

const AQI_DOC_PATH = ['aqi', 'latest'];
const LOAD_TIMEOUT_MS = 10000;
const STALE_NOTICE_MS = 3 * 60 * 60 * 1000; // "may be delayed" past 3h

// DOM Elements
const cityInput = document.getElementById('city-input');
const citySuggestions = document.getElementById('city-suggestions');
const checkAqiBtn = document.getElementById('check-aqi-btn');
const inlineMsg = document.getElementById('aqi-inline-msg');
const modal = document.getElementById('aqi-modal');
const modalClose = document.getElementById('modal-close');
const modalCity = document.getElementById('modal-city');
const modalAqi = document.getElementById('modal-aqi');
const modalSource = document.getElementById('modal-source');
const cardSlider = document.getElementById('card-slider');
const sliderPrev = document.getElementById('slider-prev');
const sliderNext = document.getElementById('slider-next');
const sliderDots = document.getElementById('slider-dots');

if (cityInput && cardSlider) {
    initAqiChecker();
}

function initAqiChecker() {
    let selectedKey = null;
    let currentSlide = 0;
    let dataPromise = null;

    // ---- Live data (Firestore doc aqi/latest) ----

    function firebaseApi() {
        if (window.hawaaFirebase) return Promise.resolve(window.hawaaFirebase);
        return new Promise(function (resolve) {
            document.addEventListener('hawaa-firebase-ready', function () {
                resolve(window.hawaaFirebase);
            }, { once: true });
        });
    }

    // Resolves to { cities: [...], byKey: Map, updatedAtMs } and caches
    // the result; a failed load clears the cache so the next click
    // retries instead of failing forever.
    function loadAqiData() {
        if (dataPromise) return dataPromise;

        const load = firebaseApi().then(function (fb) {
            const ref = fb.doc(fb.db, AQI_DOC_PATH[0], AQI_DOC_PATH[1]);
            return fb.getDoc(ref);
        }).then(function (snap) {
            if (!snap.exists()) throw new Error('aqi/latest missing');
            const data = snap.data();
            const byKey = new Map();
            const cities = [];
            Object.keys(data.cities || {}).forEach(function (key) {
                const city = data.cities[key];
                if (!city || typeof city.name !== 'string' ||
                    typeof city.aqi !== 'number') return;
                byKey.set(key, city);
                cities.push({ key: key, city: city });
            });
            if (cities.length === 0) throw new Error('aqi/latest empty');
            cities.sort(function (a, b) {
                return a.city.name.localeCompare(b.city.name);
            });
            return {
                cities: cities,
                byKey: byKey,
                updatedAtMs: data.updatedAt && data.updatedAt.toMillis
                    ? data.updatedAt.toMillis() : null
            };
        });

        const timeout = new Promise(function (_, reject) {
            setTimeout(function () {
                reject(new Error('AQI data load timed out'));
            }, LOAD_TIMEOUT_MS);
        });

        dataPromise = Promise.race([load, timeout]).catch(function (err) {
            dataPromise = null;
            throw err;
        });
        return dataPromise;
    }

    // Warm the cache as soon as the visitor shows intent.
    cityInput.addEventListener('focus', function () {
        loadAqiData().catch(function () { /* surfaced on demand */ });
    }, { once: true });

    // ---- Inline messages (under the search box) ----

    function showInlineMsg(text, isError) {
        inlineMsg.textContent = text;
        inlineMsg.classList.toggle('error', !!isError);
        inlineMsg.hidden = false;
    }

    function clearInlineMsg() {
        inlineMsg.hidden = true;
        inlineMsg.textContent = '';
    }

    // ---- Autosuggest ----

    function matchCities(data, value) {
        const q = value.toLowerCase().trim();
        if (!q) return [];
        return data.cities.filter(function (entry) {
            return entry.city.name.toLowerCase().includes(q);
        });
    }

    function renderSuggestions(entries) {
        if (entries.length === 0) {
            citySuggestions.classList.remove('active');
            citySuggestions.innerHTML = '';
            return;
        }
        citySuggestions.innerHTML = entries.slice(0, 6).map(function (entry) {
            const label = entry.city.name + ', ' + entry.city.state;
            return '<div class="city-suggestion" data-key="' + entry.key + '">' +
                escapeHtml(label) + '</div>';
        }).join('');
        citySuggestions.classList.add('active');
    }

    function escapeHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    cityInput.addEventListener('input', function () {
        selectedKey = null;
        clearInlineMsg();
        const value = this.value;
        if (value.trim().length < 2) {
            citySuggestions.classList.remove('active');
            return;
        }
        loadAqiData().then(function (data) {
            // Input may have changed while the doc was loading.
            if (cityInput.value !== value) return;
            renderSuggestions(matchCities(data, value));
        }).catch(function () {
            citySuggestions.classList.remove('active');
        });
    });

    citySuggestions.addEventListener('click', function (e) {
        const target = e.target.closest('.city-suggestion');
        if (!target) return;
        selectedKey = target.dataset.key;
        loadAqiData().then(function (data) {
            const city = data.byKey.get(selectedKey);
            if (city) cityInput.value = city.name;
        }).catch(function () { /* keep typed value */ });
        citySuggestions.classList.remove('active');
        clearInlineMsg();
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.aqi-input-wrapper')) {
            citySuggestions.classList.remove('active');
        }
    });

    // ---- Check button ----

    function setLoading(loading) {
        checkAqiBtn.disabled = loading;
        checkAqiBtn.classList.toggle('is-loading', loading);
        checkAqiBtn.textContent = loading ? 'Checking…' : 'Check Air Impact';
    }

    checkAqiBtn.addEventListener('click', function () {
        const typed = cityInput.value.trim();
        if (!selectedKey && !typed) {
            showInlineMsg('Please enter your city name.', false);
            return;
        }

        clearInlineMsg();
        setLoading(true);

        loadAqiData().then(function (data) {
            let entry = null;

            if (selectedKey && data.byKey.has(selectedKey)) {
                entry = { key: selectedKey, city: data.byKey.get(selectedKey) };
            } else {
                const q = typed.toLowerCase();
                const exact = data.cities.filter(function (e) {
                    return e.city.name.toLowerCase() === q;
                });
                if (exact.length === 1) {
                    entry = exact[0];
                } else if (exact.length > 1) {
                    // Same city name in two states — make the visitor pick.
                    renderSuggestions(exact);
                    showInlineMsg('That city exists in more than one state — pick yours from the list.', false);
                    return;
                } else {
                    const partial = matchCities(data, typed);
                    if (partial.length > 0) {
                        renderSuggestions(partial);
                        showInlineMsg('Select your city from the list.', false);
                    } else {
                        showInlineMsg('No CPCB monitoring station found for “' + typed + '”. Try the nearest large city.', true);
                    }
                    return;
                }
            }

            showAqiResults(entry.city, data.updatedAtMs);
        }).catch(function () {
            showInlineMsg('Live AQI data is unavailable right now. Please try again in a few minutes.', true);
        }).finally(function () {
            setLoading(false);
        });
    });

    // ---- Result modal ----

    function relativeTime(ms) {
        const diff = Date.now() - ms;
        if (diff < 60 * 1000) return 'just now';
        const mins = Math.round(diff / 60000);
        if (mins < 60) return mins + ' min ago';
        const hours = Math.round(mins / 60);
        if (hours < 48) return hours + ' hour' + (hours === 1 ? '' : 's') + ' ago';
        return Math.round(hours / 24) + ' days ago';
    }

    function showAqiResults(city, updatedAtMs) {
        const aqi = city.aqi;

        modalCity.textContent = city.name;
        modalAqi.innerHTML = 'AQI ' + aqi +
            ' <span class="aqi-label">(' + getAqiLabel(aqi) + ')</span>';

        let source = 'Source: CPCB (Govt. of India) · ' +
            city.stationCount + ' station' + (city.stationCount === 1 ? '' : 's');
        const freshMs = city.lastUpdate || updatedAtMs;
        if (freshMs) {
            source += ' · Updated ' + relativeTime(freshMs);
            if (Date.now() - freshMs > STALE_NOTICE_MS) {
                source += ' (may be delayed)';
            }
        }
        modalSource.textContent = source;

        updateCigaretteCard(aqi);
        updateLungCard(aqi);
        updatePollutantCard(aqi);
        updateChildCard(aqi);

        currentSlide = 0;
        updateSlider();

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Indian NAQI categories (CPCB), not the US EPA labels.
    function getAqiLabel(aqi) {
        if (aqi <= 50) return 'Good';
        if (aqi <= 100) return 'Satisfactory';
        if (aqi <= 200) return 'Moderate';
        if (aqi <= 300) return 'Poor';
        if (aqi <= 400) return 'Very Poor';
        return 'Severe';
    }

    // Card 1: Cigarette Equivalent
    function updateCigaretteCard(aqi) {
        let cigarettes;
        if (aqi <= 25) cigarettes = 0;
        else if (aqi <= 50) cigarettes = 0.5;
        else if (aqi <= 75) cigarettes = 1.5;
        else if (aqi <= 100) cigarettes = 2.5;
        else if (aqi <= 150) cigarettes = 4;
        else if (aqi <= 200) cigarettes = 6;
        else cigarettes = 8;

        const monthly = Math.round(cigarettes * 30);

        document.getElementById('cigarette-value').textContent =
            cigarettes === 0 ? '0 cigarettes/day' : '~' + cigarettes + ' cigarettes/day';
        document.getElementById('cigarette-detail').textContent =
            '≈ ' + monthly + ' cigarettes per month';
    }

    // Card 2: Lung Stress Level
    function updateLungCard(aqi) {
        let level, detail;

        if (aqi <= 25) {
            level = 'Normal';
            detail = 'Air quality is satisfactory for most individuals';
        } else if (aqi <= 50) {
            level = 'Mild Irritation';
            detail = 'Sensitive individuals may experience slight discomfort';
        } else if (aqi <= 75) {
            level = 'Noticeable Stress';
            detail = 'May cause breathing discomfort during prolonged exposure';
        } else if (aqi <= 100) {
            level = 'Reduced Efficiency';
            detail = 'Oxygen efficiency decreases, fatigue may increase';
        } else if (aqi <= 150) {
            level = 'Inflammation Risk';
            detail = 'Risk of airway inflammation with extended exposure';
        } else if (aqi <= 200) {
            level = 'High Lung Strain';
            detail = 'Long exposure increases fatigue & breathlessness';
        } else {
            level = 'Severe Stress';
            detail = 'Serious respiratory effects likely with any exposure';
        }

        document.getElementById('lung-value').textContent = level;
        document.getElementById('lung-detail').textContent = detail;
    }

    // Card 3: Pollutant Intake
    function updatePollutantCard(aqi) {
        let intake;

        if (aqi <= 25) intake = 175;
        else if (aqi <= 50) intake = 250;
        else if (aqi <= 75) intake = 375;
        else if (aqi <= 100) intake = 525;
        else if (aqi <= 150) intake = 725;
        else if (aqi <= 200) intake = 975;
        else intake = 1200;

        document.getElementById('pollutant-value').textContent = '~' + intake + ' µg/day';
        document.getElementById('pollutant-detail').textContent =
            'Particles inhaled in 24 hours of normal breathing';
    }

    // Card 4: Child Exposure
    function updateChildCard(aqi) {
        let severity;

        if (aqi <= 50) severity = 'Minimal concern for children';
        else if (aqi <= 100) severity = 'Limit prolonged outdoor activities';
        else if (aqi <= 150) severity = 'Serious concern - reduce outdoor time';
        else severity = 'Avoid outdoor exposure for children';

        document.getElementById('child-value').textContent = '1.9× higher exposure';
        document.getElementById('child-detail').textContent = severity;
    }

    // Close Modal
    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            closeModal();
        }
    });

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Escape key to close modal
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    // Card Slider Navigation
    sliderPrev.addEventListener('click', function () {
        if (currentSlide > 0) {
            currentSlide--;
            updateSlider();
        }
    });

    sliderNext.addEventListener('click', function () {
        if (currentSlide < 3) {
            currentSlide++;
            updateSlider();
        }
    });

    function updateSlider() {
        const cards = cardSlider.querySelectorAll('.impact-card');
        const cardWidth = cards[0].offsetWidth + 12; // card width + gap
        cardSlider.scrollLeft = currentSlide * cardWidth;

        // Update dots
        const dots = sliderDots.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentSlide);
        });
    }

    // Dot navigation
    sliderDots.addEventListener('click', function (e) {
        if (e.target.classList.contains('dot')) {
            const dots = Array.from(sliderDots.querySelectorAll('.dot'));
            currentSlide = dots.indexOf(e.target);
            updateSlider();
        }
    });

    // Touch swipe support for slider
    let touchStartX = 0;
    let touchEndX = 0;

    cardSlider.addEventListener('touchstart', function (e) {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    cardSlider.addEventListener('touchend', function (e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0 && currentSlide < 3) {
                // Swipe left - next
                currentSlide++;
                updateSlider();
            } else if (diff < 0 && currentSlide > 0) {
                // Swipe right - prev
                currentSlide--;
                updateSlider();
            }
        }
    }

    // Update dots on scroll
    cardSlider.addEventListener('scroll', function () {
        const cards = cardSlider.querySelectorAll('.impact-card');
        const cardWidth = cards[0].offsetWidth + 12;
        const newSlide = Math.round(cardSlider.scrollLeft / cardWidth);

        if (newSlide !== currentSlide) {
            currentSlide = newSlide;
            const dots = sliderDots.querySelectorAll('.dot');
            dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === currentSlide);
            });
        }
    });
}
