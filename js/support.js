/* ============================================================
   HAWAA — PRODUCT SUPPORT PAGE
   Segmented policy tabs with URL-hash deep links
   (support.html#warranty / #returns / #shipping), quick-topic
   cards, scroll reveal, contact form, footer collapsibles.
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
    // POLICY TABS (hash deep-linkable)
    // ========================================
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.su-tab'));
    var panels = {
        warranty: document.getElementById('panel-warranty'),
        returns: document.getElementById('panel-returns'),
        shipping: document.getElementById('panel-shipping')
    };

    function activateTab(name, updateHash) {
        if (!panels[name]) return;
        tabs.forEach(function (tab) {
            var isActive = tab.dataset.tab === name;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        for (var key in panels) {
            if (panels[key]) panels[key].classList.toggle('active', key === name);
        }
        if (updateHash && history.replaceState) {
            history.replaceState(null, '', '#' + name);
        }
    }

    tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            activateTab(tab.dataset.tab, true);
        });
    });

    // Quick-topic cards jump to (and activate) a tab
    var quickCards = document.querySelectorAll('[data-goto-tab]');
    Array.prototype.forEach.call(quickCards, function (card) {
        card.addEventListener('click', function () {
            var name = card.dataset.gotoTab;
            activateTab(name, true);
            var policies = document.querySelector('.su-policies');
            if (policies) policies.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    // Open the right tab when arriving with a hash
    function syncFromHash() {
        var hash = (location.hash || '').replace('#', '');
        if (panels[hash]) activateTab(hash, false);
    }
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);

    // ========================================
    // CONTACT FORM
    // ========================================
    var form = document.getElementById('sp-contact-form');
    var submitBtn = document.getElementById('sp-submit');
    var successEl = document.getElementById('sp-form-success');
    var anotherBtn = document.getElementById('sp-send-another');
    var nameInput = document.getElementById('sp-name');
    var emailInput = document.getElementById('sp-email');
    var messageInput = document.getElementById('sp-message');

    function clearErrors() {
        nameInput.classList.remove('error');
        emailInput.classList.remove('error');
        messageInput.classList.remove('error');
    }

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            clearErrors();

            var nameVal = nameInput.value.trim();
            var emailVal = emailInput.value.trim();
            var messageVal = messageInput.value.trim();
            var hasError = false;

            if (!nameVal) {
                nameInput.classList.add('error');
                hasError = true;
            }
            if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
                emailInput.classList.add('error');
                hasError = true;
            }
            if (!messageVal) {
                messageInput.classList.add('error');
                hasError = true;
            }

            if (hasError) return;

            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';

            function restoreButton() {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send Message';
            }

            if (!window.hawaaBackend) {
                restoreButton();
                alert('Something went wrong. Please try again in a moment.');
                return;
            }

            window.hawaaBackend.submitSupportTicket({
                name: nameVal,
                email: emailVal,
                message: messageVal
            }).then(function () {
                form.style.display = 'none';
                successEl.classList.remove('hidden');
                restoreButton();
            }).catch(function (err) {
                console.error('Support ticket submit failed:', err);
                restoreButton();
                alert('Something went wrong. Please try again in a moment.');
            });
        });
    }

    if (anotherBtn) {
        anotherBtn.addEventListener('click', function () {
            successEl.classList.add('hidden');
            form.style.display = '';
            nameInput.value = '';
            emailInput.value = '';
            messageInput.value = '';
            clearErrors();
        });
    }

    // Remove error on focus
    [nameInput, emailInput, messageInput].forEach(function (input) {
        if (!input) return;
        input.addEventListener('focus', function () {
            input.classList.remove('error');
        });
    });

    // ========================================
    // FOOTER MOBILE COLLAPSIBLE
    // ========================================
    var sections = Array.prototype.slice.call(document.querySelectorAll('[data-footer-section]'));
    sections.forEach(function (section) {
        var header = section.querySelector('.footer-links-header');
        if (!header) return;
        header.addEventListener('click', function () {
            if (window.innerWidth >= 768) return;
            var isActive = section.classList.contains('active');
            sections.forEach(function (s) { s.classList.remove('active'); });
            if (!isActive) section.classList.add('active');
        });
    });

});
