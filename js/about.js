// ========================================
// ABOUT PAGE - JavaScript
// ========================================

(function() {
    'use strict';

    // ========================================
    // HEADER SCROLL STATE
    // ========================================
    var header = document.getElementById('header');

    function updateHeader() {
        if (!header) return;
        if (window.scrollY > 10) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }

    window.addEventListener('scroll', updateHeader, { passive: true });
    updateHeader();

    // ========================================
    // AUTO-SCROLLING IMAGE STRIP
    // Duplicate items for seamless infinite scroll
    // ========================================
    var stripTrack = document.getElementById('about-strip-track');

    if (stripTrack) {
        // Clone all children and append for infinite loop
        var items = stripTrack.innerHTML;
        stripTrack.innerHTML = items + items;
    }

})();
