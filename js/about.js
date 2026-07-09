// ========================================
// ABOUT PAGE - JavaScript
// ========================================

(function() {
    'use strict';

    // The about page sits on a light background, so the header keeps the
    // static "scrolled" treatment from the markup — no scroll toggle here.

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
