// ========================================
// Header Scroll Effect & Sticky Buy Bar
// ========================================
const header = document.getElementById('header');
const stickyBuyBar = document.getElementById('sticky-buy-bar');
const heroSection = document.querySelector('.hero');

function handleScroll() {
    const heroHeight = heroSection ? heroSection.offsetHeight : window.innerHeight;
    const scrollY = window.scrollY;

    // Add scrolled class for header background effect
    if (scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }

    // Toggle between header and sticky buy bar based on hero section
    if (scrollY > heroHeight - 100) {
        // Past hero section - show buy bar, hide header
        header.classList.add('hidden');
        stickyBuyBar.classList.add('visible');
    } else {
        // In hero section - show header, hide buy bar
        header.classList.remove('hidden');
        stickyBuyBar.classList.remove('visible');
    }
}

window.addEventListener('scroll', handleScroll);
// Initial check on page load
document.addEventListener('DOMContentLoaded', handleScroll);

// ========================================
// Hero Video - Autoplay and Fallback
// ========================================
const heroVideo = document.getElementById('hero-video');
const heroResting = document.getElementById('hero-resting');

if (heroVideo) {
    const playVideo = () => {
        heroVideo.play().then(() => {
            heroVideo.classList.remove('hidden');
        }).catch((error) => {
            console.log('Video autoplay prevented:', error);
            heroVideo.classList.add('hidden');
            heroResting.classList.add('visible');
        });
    };

    if (heroVideo.readyState >= 3) {
        playVideo();
    } else {
        heroVideo.addEventListener('canplay', playVideo, { once: true });
    }

    heroVideo.addEventListener('ended', () => {
        heroVideo.classList.add('hidden');
        heroResting.classList.add('visible');
    });

    heroVideo.addEventListener('error', () => {
        heroVideo.classList.add('hidden');
        heroResting.classList.add('visible');
    });

    setTimeout(() => {
        if (heroVideo.readyState === 0) {
            heroVideo.classList.add('hidden');
            heroResting.classList.add('visible');
        }
    }, 3000);
}

// ========================================
// Smooth Scroll for Anchor Links
// ========================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ========================================
// AQI CHECKER FUNCTIONALITY
// ========================================

// Indian Cities with approximate AQI data (simulated)
const indianCities = [
    { name: 'Delhi', aqi: 185 },
    { name: 'Mumbai', aqi: 120 },
    { name: 'Bangalore', aqi: 85 },
    { name: 'Chennai', aqi: 95 },
    { name: 'Kolkata', aqi: 145 },
    { name: 'Hyderabad', aqi: 90 },
    { name: 'Pune', aqi: 110 },
    { name: 'Ahmedabad', aqi: 135 },
    { name: 'Jaipur', aqi: 155 },
    { name: 'Lucknow', aqi: 175 },
    { name: 'Kanpur', aqi: 195 },
    { name: 'Nagpur', aqi: 100 },
    { name: 'Indore', aqi: 105 },
    { name: 'Bhopal', aqi: 115 },
    { name: 'Patna', aqi: 180 },
    { name: 'Vadodara', aqi: 125 },
    { name: 'Ghaziabad', aqi: 190 },
    { name: 'Ludhiana', aqi: 160 },
    { name: 'Agra', aqi: 170 },
    { name: 'Nashik', aqi: 88 },
    { name: 'Faridabad', aqi: 185 },
    { name: 'Meerut', aqi: 165 },
    { name: 'Rajkot', aqi: 95 },
    { name: 'Varanasi', aqi: 175 },
    { name: 'Srinagar', aqi: 65 },
    { name: 'Chandigarh', aqi: 110 },
    { name: 'Coimbatore', aqi: 70 },
    { name: 'Guwahati', aqi: 130 },
    { name: 'Noida', aqi: 188 },
    { name: 'Gurugram', aqi: 182 }
];

// DOM Elements
const cityInput = document.getElementById('city-input');
const citySuggestions = document.getElementById('city-suggestions');
const checkAqiBtn = document.getElementById('check-aqi-btn');
const modal = document.getElementById('aqi-modal');
const modalClose = document.getElementById('modal-close');
const modalCity = document.getElementById('modal-city');
const modalAqi = document.getElementById('modal-aqi');
const cardSlider = document.getElementById('card-slider');
const sliderPrev = document.getElementById('slider-prev');
const sliderNext = document.getElementById('slider-next');
const sliderDots = document.getElementById('slider-dots');

let selectedCity = null;
let currentSlide = 0;

// City Input - Auto Suggest
cityInput.addEventListener('input', function() {
    const value = this.value.toLowerCase().trim();

    if (value.length < 2) {
        citySuggestions.classList.remove('active');
        return;
    }

    const matches = indianCities.filter(city =>
        city.name.toLowerCase().includes(value)
    ).slice(0, 6);

    if (matches.length > 0) {
        citySuggestions.innerHTML = matches.map(city =>
            `<div class="city-suggestion" data-city="${city.name}" data-aqi="${city.aqi}">${city.name}</div>`
        ).join('');
        citySuggestions.classList.add('active');
    } else {
        citySuggestions.classList.remove('active');
    }
});

// City Suggestion Click
citySuggestions.addEventListener('click', function(e) {
    if (e.target.classList.contains('city-suggestion')) {
        const cityName = e.target.dataset.city;
        const cityAqi = parseInt(e.target.dataset.aqi);
        cityInput.value = cityName;
        selectedCity = { name: cityName, aqi: cityAqi };
        citySuggestions.classList.remove('active');
    }
});

// Close suggestions when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.aqi-input-wrapper')) {
        citySuggestions.classList.remove('active');
    }
});

// Check AQI Button
checkAqiBtn.addEventListener('click', function() {
    let city = selectedCity;

    // If no city selected, try to find exact match
    if (!city) {
        const inputValue = cityInput.value.trim().toLowerCase();
        const match = indianCities.find(c => c.name.toLowerCase() === inputValue);
        if (match) {
            city = match;
        } else if (inputValue.length > 0) {
            // Generate random AQI for unknown city
            city = { name: cityInput.value.trim(), aqi: Math.floor(Math.random() * 150) + 50 };
        }
    }

    if (!city) {
        alert('Please enter a city name');
        return;
    }

    showAqiResults(city);
});

// Show AQI Results in Modal
function showAqiResults(city) {
    const aqi = city.aqi;

    // Update modal header
    modalCity.textContent = city.name;
    modalAqi.innerHTML = `AQI ${aqi} <span class="aqi-label">(${getAqiLabel(aqi)})</span>`;

    // Calculate and update card values
    updateCigaretteCard(aqi);
    updateLungCard(aqi);
    updatePollutantCard(aqi);
    updateChildCard(aqi);

    // Reset slider
    currentSlide = 0;
    updateSlider();

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Get AQI Label
function getAqiLabel(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
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
        cigarettes === 0 ? '0 cigarettes/day' : `~${cigarettes} cigarettes/day`;
    document.getElementById('cigarette-detail').textContent =
        `≈ ${monthly} cigarettes per month`;
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

    document.getElementById('pollutant-value').textContent = `~${intake} µg/day`;
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
modal.addEventListener('click', function(e) {
    if (e.target === modal) {
        closeModal();
    }
});

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Escape key to close modal
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
    }
});

// Card Slider Navigation
sliderPrev.addEventListener('click', function() {
    if (currentSlide > 0) {
        currentSlide--;
        updateSlider();
    }
});

sliderNext.addEventListener('click', function() {
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
sliderDots.addEventListener('click', function(e) {
    if (e.target.classList.contains('dot')) {
        const dots = Array.from(sliderDots.querySelectorAll('.dot'));
        currentSlide = dots.indexOf(e.target);
        updateSlider();
    }
});

// Touch swipe support for slider
let touchStartX = 0;
let touchEndX = 0;

cardSlider.addEventListener('touchstart', function(e) {
    touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

cardSlider.addEventListener('touchend', function(e) {
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
cardSlider.addEventListener('scroll', function() {
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

// ========================================
// FEATURE SLIDER FUNCTIONALITY
// ========================================

// Feature data for expanded view
const featureData = {
    1: {
        tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a6 6 0 006 6h4a3 3 0 003-3v-6.5a1.5 1.5 0 00-3 0m-6-3v1.5m0-1.5a1.5 1.5 0 013 0m0 0v1.5m0 0v5m0-5a1.5 1.5 0 013 0v3"/></svg><span>Touch Control</span>',
        title: 'Control with <span class="italic">a wave</span>',
        desc: 'Experience the future of air purification with our advanced gesture sensor technology. Simply wave your hand to adjust settings, change fan speeds, or turn the device on and off — no buttons, no apps, just intuitive control.',
        image: 'public/images/feature-gesture-expanded.webp',
        testimonial: {
            name: 'Priya S.',
            quote: '"The gesture control is amazing! My kids love waving at it, and I love not having to touch anything with messy hands while cooking."'
        }
    },
    2: {
        tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span>Air Delivery</span>',
        title: 'Room refresh in <span class="italic">minutes</span>',
        desc: 'With a Clean Air Delivery Rate of 250 m³/h, Hawaa Edge can purify a 300 sq ft room in under 12 minutes. Our powerful yet quiet motor ensures rapid air circulation without disturbing your peace.',
        image: 'public/images/feature-cadr-expanded.webp',
        testimonial: {
            name: 'Rahul M.',
            quote: '"I can literally feel the difference within minutes of turning it on. The air feels fresher and my allergies have significantly reduced."'
        }
    },
    3: {
        tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg><span>H13 HEPA</span>',
        title: 'Capture 99.97% of <span class="italic">everything</span>',
        desc: 'Our medical-grade H13 HEPA filter captures 99.97% of particles as small as 0.3 microns — including dust, pollen, pet dander, mold spores, bacteria, and even some viruses. Breathe easy knowing your air is truly clean.',
        image: 'public/images/feature-hepa-expanded.webp',
        testimonial: {
            name: 'Dr. Ananya K.',
            quote: '"As a pulmonologist, I recommend H13 HEPA to all my patients. Hawaa Edge delivers hospital-grade filtration at home."'
        }
    },
    4: {
        tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/></svg><span>Smart Home</span>',
        title: 'Your home, <span class="italic">connected</span>',
        desc: 'Seamlessly integrate Hawaa Edge into your smart home ecosystem. Works with Google Home and Amazon Alexa for voice control. Schedule purification, monitor air quality, and control settings from anywhere using our intuitive app.',
        image: 'public/images/feature-wifi-expanded.webp',
        testimonial: {
            name: 'Vikram T.',
            quote: '"I just say \'Hey Google, turn on the purifier\' and it\'s done. The app also lets me schedule it before I get home from work."'
        }
    }
};

// DOM Elements for Feature Slider
const featureSlider = document.getElementById('feature-slider');
const featurePrev = document.getElementById('feature-prev');
const featureNext = document.getElementById('feature-next');
const featureProgressBar = document.getElementById('feature-progress-bar');
const featureOverlay = document.getElementById('feature-overlay');
const featureExpanded = document.getElementById('feature-expanded');
const featureClose = document.getElementById('feature-close');
const expandedImage = document.getElementById('expanded-image');
const expandedTag = document.getElementById('expanded-tag');
const expandedTitle = document.getElementById('expanded-title');
const expandedDesc = document.getElementById('expanded-desc');
const testimonialName = document.getElementById('testimonial-name');
const testimonialQuote = document.getElementById('testimonial-quote');

let currentFeatureSlide = 0;
const totalFeatureSlides = 4;

// Initialize feature slider
function initFeatureSlider() {
    if (!featureSlider) return;

    updateFeatureProgress();

    // Feature slider navigation
    if (featurePrev) {
        featurePrev.addEventListener('click', () => {
            scrollFeatureSlider(-1);
        });
    }

    if (featureNext) {
        featureNext.addEventListener('click', () => {
            scrollFeatureSlider(1);
        });
    }

    // Update progress on scroll
    featureSlider.addEventListener('scroll', updateFeatureProgress);

    // Expand buttons
    const expandBtns = document.querySelectorAll('.feature-expand-btn');
    expandBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const cardId = btn.dataset.expand;
            openFeatureExpanded(cardId);
        });
    });

    // Close expanded view
    if (featureClose) {
        featureClose.addEventListener('click', closeFeatureExpanded);
    }

    if (featureOverlay) {
        featureOverlay.addEventListener('click', (e) => {
            if (e.target === featureOverlay) {
                closeFeatureExpanded();
            }
        });
    }

    // Escape key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && featureOverlay && featureOverlay.classList.contains('active')) {
            closeFeatureExpanded();
        }
    });
}

// Scroll feature slider
function scrollFeatureSlider(direction) {
    const cards = featureSlider.querySelectorAll('.feature-card');
    if (cards.length === 0) return;

    const cardWidth = cards[0].offsetWidth + 16; // card width + gap
    const maxScroll = featureSlider.scrollWidth - featureSlider.clientWidth;

    let newScrollLeft = featureSlider.scrollLeft + (direction * cardWidth);
    newScrollLeft = Math.max(0, Math.min(newScrollLeft, maxScroll));

    featureSlider.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
    });
}

// Update progress bar
function updateFeatureProgress() {
    if (!featureSlider || !featureProgressBar) return;

    const maxScroll = featureSlider.scrollWidth - featureSlider.clientWidth;
    if (maxScroll <= 0) {
        featureProgressBar.style.width = '100%';
        return;
    }

    const scrollPercent = featureSlider.scrollLeft / maxScroll;
    const progressWidth = 25 + (scrollPercent * 75); // Start at 25%, end at 100%
    featureProgressBar.style.width = progressWidth + '%';
}

// Open expanded view
function openFeatureExpanded(cardId) {
    const data = featureData[cardId];
    if (!data) return;

    // Set content
    expandedImage.style.backgroundImage = `url('${data.image}')`;
    expandedTag.innerHTML = data.tag;
    expandedTitle.innerHTML = data.title;
    expandedDesc.textContent = data.desc;
    testimonialName.textContent = data.testimonial.name;
    testimonialQuote.textContent = data.testimonial.quote;

    // Show overlay
    featureOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close expanded view
function closeFeatureExpanded() {
    featureOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Touch swipe support for feature slider
let featureTouchStartX = 0;
let featureTouchEndX = 0;

if (featureSlider) {
    featureSlider.addEventListener('touchstart', (e) => {
        featureTouchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    featureSlider.addEventListener('touchend', (e) => {
        featureTouchEndX = e.changedTouches[0].screenX;
        handleFeatureSwipe();
    }, { passive: true });
}

function handleFeatureSwipe() {
    const swipeThreshold = 50;
    const diff = featureTouchStartX - featureTouchEndX;

    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            scrollFeatureSlider(1);
        } else {
            scrollFeatureSlider(-1);
        }
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initFeatureSlider);

// ========================================
// CERTIFICATION MODALS
// ========================================

// Open modal from preview or button
document.querySelectorAll('[data-modal]').forEach(trigger => {
    trigger.addEventListener('click', function() {
        const modalId = this.dataset.modal;
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    });
});

// Close modal from close button
document.querySelectorAll('[data-close]').forEach(closeBtn => {
    closeBtn.addEventListener('click', function() {
        const modalId = this.dataset.close;
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
});

// Close modal when clicking overlay
document.querySelectorAll('.cert-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
});

// ========================================
// TESTIMONIALS SLIDER
// ========================================

const testimonialsSlider = document.getElementById('testimonials-slider');
const testimonialsPrev = document.getElementById('testimonials-prev');
const testimonialsNext = document.getElementById('testimonials-next');
const testimonialsDots = document.getElementById('testimonials-dots');
let testimonialsAutoSlide;
let testimonialsIsVisible = false;

function initTestimonialsSlider() {
    if (!testimonialsSlider) return;

    // Auto-play videos on scroll into view
    const videos = testimonialsSlider.querySelectorAll('.testimonial-video');
    videos.forEach(video => {
        video.play().catch(() => {});
    });

    // Navigation
    if (testimonialsPrev) {
        testimonialsPrev.addEventListener('click', () => scrollTestimonials(-1));
    }
    if (testimonialsNext) {
        testimonialsNext.addEventListener('click', () => scrollTestimonials(1));
    }

    // Dots
    if (testimonialsDots) {
        testimonialsDots.querySelectorAll('.dot').forEach(dot => {
            dot.addEventListener('click', () => {
                const slide = parseInt(dot.dataset.slide);
                scrollToTestimonial(slide);
            });
        });
    }

    // Update dots and arrows on scroll
    testimonialsSlider.addEventListener('scroll', () => {
        updateTestimonialsDots();
        updateTestimonialsArrows();
    });

    // Initial arrow state
    updateTestimonialsArrows();

    // Sound buttons
    document.querySelectorAll('.testimonial-sound-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const videoId = this.dataset.video;
            const video = document.getElementById(`testimonial-video-${videoId}`);
            if (video) {
                video.muted = !video.muted;
                this.querySelector('.sound-off').classList.toggle('hidden');
                this.querySelector('.sound-on').classList.toggle('hidden');
            }
        });
    });

    // Intersection Observer for auto-slide
    const testimonialsSection = document.querySelector('.testimonials-section');
    if (testimonialsSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                testimonialsIsVisible = entry.isIntersecting;
                if (entry.isIntersecting) {
                    startTestimonialsAutoSlide();
                } else {
                    stopTestimonialsAutoSlide();
                }
            });
        }, { threshold: 0.3 });
        observer.observe(testimonialsSection);
    }
}

function getSliderGap() {
    return window.innerWidth >= 640 ? 20 : 16;
}

function scrollTestimonials(direction) {
    const cards = testimonialsSlider.querySelectorAll('.testimonial-card');
    if (cards.length === 0) return;
    const cardWidth = cards[0].offsetWidth + getSliderGap();
    testimonialsSlider.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
    resetTestimonialsAutoSlide();
}

function scrollToTestimonial(index) {
    const cards = testimonialsSlider.querySelectorAll('.testimonial-card');
    if (cards.length === 0) return;
    const cardWidth = cards[0].offsetWidth + getSliderGap();
    testimonialsSlider.scrollTo({ left: index * cardWidth, behavior: 'smooth' });
    resetTestimonialsAutoSlide();
}

function updateTestimonialsDots() {
    if (!testimonialsDots) return;
    const cards = testimonialsSlider.querySelectorAll('.testimonial-card');
    if (cards.length === 0) return;
    const cardWidth = cards[0].offsetWidth + getSliderGap();
    const currentSlide = Math.round(testimonialsSlider.scrollLeft / cardWidth);
    testimonialsDots.querySelectorAll('.dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlide);
    });
}

function updateTestimonialsArrows() {
    if (!testimonialsSlider) return;
    const maxScroll = testimonialsSlider.scrollWidth - testimonialsSlider.clientWidth;
    const atStart = testimonialsSlider.scrollLeft <= 10;
    const atEnd = testimonialsSlider.scrollLeft >= maxScroll - 10;

    if (testimonialsPrev) {
        testimonialsPrev.style.opacity = atStart ? '0.3' : '1';
        testimonialsPrev.style.pointerEvents = atStart ? 'none' : 'auto';
    }
    if (testimonialsNext) {
        testimonialsNext.style.opacity = atEnd ? '0.3' : '1';
        testimonialsNext.style.pointerEvents = atEnd ? 'none' : 'auto';
    }
}

function startTestimonialsAutoSlide() {
    if (testimonialsAutoSlide) return; // Already running
    testimonialsAutoSlide = setInterval(() => {
        if (!testimonialsIsVisible) return;
        const cards = testimonialsSlider.querySelectorAll('.testimonial-card');
        const cardWidth = cards[0].offsetWidth + getSliderGap();
        const maxScroll = testimonialsSlider.scrollWidth - testimonialsSlider.clientWidth;
        if (testimonialsSlider.scrollLeft >= maxScroll - 10) {
            testimonialsSlider.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
            testimonialsSlider.scrollBy({ left: cardWidth, behavior: 'smooth' });
        }
    }, 5000);
}

function stopTestimonialsAutoSlide() {
    clearInterval(testimonialsAutoSlide);
    testimonialsAutoSlide = null;
}

function resetTestimonialsAutoSlide() {
    stopTestimonialsAutoSlide();
    if (testimonialsIsVisible) {
        startTestimonialsAutoSlide();
    }
}

// ========================================
// REVIEWS SLIDER
// ========================================

const reviewsSlider = document.getElementById('reviews-slider');
const reviewsDots = document.getElementById('reviews-dots');
let reviewsAutoSlide;
let reviewsIsVisible = false;

function initReviewsSlider() {
    if (!reviewsSlider) return;

    // Dots
    if (reviewsDots) {
        reviewsDots.querySelectorAll('.dot').forEach(dot => {
            dot.addEventListener('click', () => {
                const slide = parseInt(dot.dataset.slide);
                scrollToReview(slide);
            });
        });
    }

    // Update dots on scroll
    reviewsSlider.addEventListener('scroll', updateReviewsDots);

    // Intersection Observer for auto-slide
    const reviewsSection = document.querySelector('.reviews-section');
    if (reviewsSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                reviewsIsVisible = entry.isIntersecting;
                if (entry.isIntersecting) {
                    startReviewsAutoSlide();
                } else {
                    stopReviewsAutoSlide();
                }
            });
        }, { threshold: 0.3 });
        observer.observe(reviewsSection);
    }
}

function scrollToReview(index) {
    const cards = reviewsSlider.querySelectorAll('.review-card');
    if (cards.length === 0) return;
    const cardWidth = cards[0].offsetWidth + getSliderGap();
    reviewsSlider.scrollTo({ left: index * cardWidth, behavior: 'smooth' });
    resetReviewsAutoSlide();
}

function updateReviewsDots() {
    if (!reviewsDots) return;
    const cards = reviewsSlider.querySelectorAll('.review-card');
    if (cards.length === 0) return;
    const cardWidth = cards[0].offsetWidth + getSliderGap();
    const currentSlide = Math.round(reviewsSlider.scrollLeft / cardWidth);
    reviewsDots.querySelectorAll('.dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlide);
    });
}

function startReviewsAutoSlide() {
    if (reviewsAutoSlide) return; // Already running
    reviewsAutoSlide = setInterval(() => {
        if (!reviewsIsVisible) return;
        const cards = reviewsSlider.querySelectorAll('.review-card');
        const cardWidth = cards[0].offsetWidth + getSliderGap();
        const maxScroll = reviewsSlider.scrollWidth - reviewsSlider.clientWidth;
        if (reviewsSlider.scrollLeft >= maxScroll - 10) {
            reviewsSlider.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
            reviewsSlider.scrollBy({ left: cardWidth, behavior: 'smooth' });
        }
    }, 4000);
}

function stopReviewsAutoSlide() {
    clearInterval(reviewsAutoSlide);
    reviewsAutoSlide = null;
}

function resetReviewsAutoSlide() {
    stopReviewsAutoSlide();
    if (reviewsIsVisible) {
        startReviewsAutoSlide();
    }
}

// ========================================
// BLOGS SLIDER
// ========================================

const blogsSlider = document.getElementById('blogs-slider');
const blogsPrev = document.getElementById('blogs-prev');
const blogsNext = document.getElementById('blogs-next');
const blogsDots = document.getElementById('blogs-dots');
let blogsAutoSlide;
let blogsIsVisible = false;

function initBlogsSlider() {
    if (!blogsSlider) return;

    // Navigation
    if (blogsPrev) {
        blogsPrev.addEventListener('click', () => scrollBlogs(-1));
    }
    if (blogsNext) {
        blogsNext.addEventListener('click', () => scrollBlogs(1));
    }

    // Dots
    if (blogsDots) {
        blogsDots.querySelectorAll('.dot').forEach(dot => {
            dot.addEventListener('click', () => {
                const slide = parseInt(dot.dataset.slide);
                scrollToBlog(slide);
            });
        });
    }

    // Update dots and arrows on scroll
    blogsSlider.addEventListener('scroll', () => {
        updateBlogsDots();
        updateBlogsArrows();
    });

    // Initial arrow state
    updateBlogsArrows();

    // Intersection Observer for auto-slide
    const blogsSection = document.querySelector('.blogs-section');
    if (blogsSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                blogsIsVisible = entry.isIntersecting;
                if (entry.isIntersecting) {
                    startBlogsAutoSlide();
                } else {
                    stopBlogsAutoSlide();
                }
            });
        }, { threshold: 0.3 });
        observer.observe(blogsSection);
    }
}

function scrollBlogs(direction) {
    const cards = blogsSlider.querySelectorAll('.blog-card');
    if (cards.length === 0) return;
    const cardWidth = cards[0].offsetWidth + getSliderGap();
    blogsSlider.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
    resetBlogsAutoSlide();
}

function scrollToBlog(index) {
    const cards = blogsSlider.querySelectorAll('.blog-card');
    if (cards.length === 0) return;
    const cardWidth = cards[0].offsetWidth + getSliderGap();
    blogsSlider.scrollTo({ left: index * cardWidth, behavior: 'smooth' });
    resetBlogsAutoSlide();
}

function updateBlogsDots() {
    if (!blogsDots) return;
    const cards = blogsSlider.querySelectorAll('.blog-card');
    if (cards.length === 0) return;
    const cardWidth = cards[0].offsetWidth + getSliderGap();
    const currentSlide = Math.round(blogsSlider.scrollLeft / cardWidth);
    blogsDots.querySelectorAll('.dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlide);
    });
}

function updateBlogsArrows() {
    if (!blogsSlider) return;
    const maxScroll = blogsSlider.scrollWidth - blogsSlider.clientWidth;
    const atStart = blogsSlider.scrollLeft <= 10;
    const atEnd = blogsSlider.scrollLeft >= maxScroll - 10;

    if (blogsPrev) {
        blogsPrev.style.opacity = atStart ? '0.3' : '1';
        blogsPrev.style.pointerEvents = atStart ? 'none' : 'auto';
    }
    if (blogsNext) {
        blogsNext.style.opacity = atEnd ? '0.3' : '1';
        blogsNext.style.pointerEvents = atEnd ? 'none' : 'auto';
    }
}

function startBlogsAutoSlide() {
    if (blogsAutoSlide) return; // Already running
    blogsAutoSlide = setInterval(() => {
        if (!blogsIsVisible) return;
        const cards = blogsSlider.querySelectorAll('.blog-card');
        const cardWidth = cards[0].offsetWidth + getSliderGap();
        const maxScroll = blogsSlider.scrollWidth - blogsSlider.clientWidth;
        if (blogsSlider.scrollLeft >= maxScroll - 10) {
            blogsSlider.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
            blogsSlider.scrollBy({ left: cardWidth, behavior: 'smooth' });
        }
    }, 6000);
}

function stopBlogsAutoSlide() {
    clearInterval(blogsAutoSlide);
    blogsAutoSlide = null;
}

function resetBlogsAutoSlide() {
    stopBlogsAutoSlide();
    if (blogsIsVisible) {
        startBlogsAutoSlide();
    }
}

// Initialize all new sliders
document.addEventListener('DOMContentLoaded', function() {
    initTestimonialsSlider();
    initReviewsSlider();
    initBlogsSlider();
    initFAQ();
    initCertModals();
});

// ========================================
// FAQ FUNCTIONALITY
// ========================================

function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');

        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');

            // Close all other items
            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
            });

            // Toggle current item
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

// ========================================
// CERTIFICATION MODALS
// ========================================

function initCertModals() {
    // Open modal from eye button
    document.querySelectorAll('.cert-preview-eye-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const modalId = this.dataset.modal;
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    });

    // Close modal from close button
    document.querySelectorAll('.cert-modal-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modalId = this.dataset.close;
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });

    // Close modal when clicking overlay
    document.querySelectorAll('.cert-modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });

    // Close with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.cert-modal-overlay.active').forEach(modal => {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            });
        }
    });
}

// ========================================
// NEWSLETTER FORM
// ========================================

const newsletterForm = document.getElementById('newsletter-form');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = this.querySelector('.newsletter-input').value;

        // Show success feedback (you can replace this with actual form submission)
        alert('Thank you for subscribing! We\'ll keep you updated.');
        this.reset();
    });
}

// ========================================
// FEATURE EXPANDED NAVIGATION
// ========================================

let currentExpandedCard = 1;

function initExpandedNavigation() {
    const expandedPrev = document.getElementById('expanded-prev');
    const expandedNext = document.getElementById('expanded-next');

    if (expandedPrev) {
        expandedPrev.addEventListener('click', () => {
            currentExpandedCard = currentExpandedCard > 1 ? currentExpandedCard - 1 : 4;
            openFeatureExpanded(currentExpandedCard);
        });
    }

    if (expandedNext) {
        expandedNext.addEventListener('click', () => {
            currentExpandedCard = currentExpandedCard < 4 ? currentExpandedCard + 1 : 1;
            openFeatureExpanded(currentExpandedCard);
        });
    }
}

// Update openFeatureExpanded to track current card
const originalOpenFeatureExpanded = typeof openFeatureExpanded !== 'undefined' ? openFeatureExpanded : null;

document.addEventListener('DOMContentLoaded', function() {
    initExpandedNavigation();

    // Wrap expand buttons to track current card
    const expandBtns = document.querySelectorAll('.feature-expand-btn');
    expandBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentExpandedCard = parseInt(btn.dataset.expand);
        });
    });
});


/* =============================================
   Edge Décor Slider
   ============================================= */
(function() {
    var slider = document.getElementById('edge-decor-slider');
    var prevBtn = document.getElementById('edge-decor-prev');
    var nextBtn = document.getElementById('edge-decor-next');
    var progressBar = document.getElementById('edge-decor-progress-bar');

    if (!slider) return;

    var cards = slider.querySelectorAll('.edge-decor-card');
    var totalCards = cards.length;
    if (totalCards === 0) return;

    function getGap() {
        if (window.innerWidth >= 1024) return 20;
        if (window.innerWidth >= 768) return 18;
        return 14;
    }

    function getCardWidth() {
        return cards[0].offsetWidth + getGap();
    }

    // Scroll by one card in given direction, clamped to edges
    function scrollByCard(dir) {
        var cw = getCardWidth();
        var max = slider.scrollWidth - slider.clientWidth;
        var target = slider.scrollLeft + dir * cw;
        target = Math.max(0, Math.min(target, max));
        slider.scrollTo({ left: target, behavior: 'smooth' });
    }

    // Update progress bar (indicator only, not clickable)
    function updateProgress() {
        if (!progressBar) return;
        var max = slider.scrollWidth - slider.clientWidth;
        if (max <= 0) { progressBar.style.width = '100%'; return; }
        var pct = slider.scrollLeft / max;
        // Bar goes from 25% at start to 100% at end
        progressBar.style.width = (25 + pct * 75) + '%';
    }

    // Disable prev at first card, next at last
    function updateArrows() {
        var max = slider.scrollWidth - slider.clientWidth;
        var atStart = slider.scrollLeft <= 2;
        var atEnd = slider.scrollLeft >= max - 2;

        if (prevBtn) {
            prevBtn.style.opacity = atStart ? '0.3' : '1';
            prevBtn.style.pointerEvents = atStart ? 'none' : 'auto';
        }
        if (nextBtn) {
            nextBtn.style.opacity = atEnd ? '0.3' : '1';
            nextBtn.style.pointerEvents = atEnd ? 'none' : 'auto';
        }
    }

    // Arrow handlers
    if (prevBtn) prevBtn.addEventListener('click', function() { scrollByCard(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function() { scrollByCard(1); });

    // Update on native scroll (covers swipe + arrows)
    slider.addEventListener('scroll', function() {
        updateProgress();
        updateArrows();
    });

    // Init state
    updateProgress();
    updateArrows();
})();
