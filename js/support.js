document.addEventListener('DOMContentLoaded', function() {

    // ========================================
    // POLICY TABS
    // ========================================
    var tabs = document.querySelectorAll('.sp-tab');
    var tabContents = {
        'warranty': document.getElementById('tab-warranty'),
        'returns': document.getElementById('tab-returns'),
        'shipping': document.getElementById('tab-shipping')
    };

    for (var t = 0; t < tabs.length; t++) {
        (function(tab) {
            tab.addEventListener('click', function() {
                var target = tab.getAttribute('data-tab');

                // Update tab active state
                for (var i = 0; i < tabs.length; i++) {
                    tabs[i].classList.remove('active');
                }
                tab.classList.add('active');

                // Show target content
                for (var key in tabContents) {
                    if (tabContents[key]) {
                        tabContents[key].classList.remove('active');
                    }
                }
                if (tabContents[target]) {
                    tabContents[target].classList.add('active');
                }
            });
        })(tabs[t]);
    }

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
        form.addEventListener('submit', function(e) {
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
            if (!emailVal) {
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

            setTimeout(function() {
                form.style.display = 'none';
                successEl.classList.remove('hidden');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send Message';
            }, 800);
        });
    }

    if (anotherBtn) {
        anotherBtn.addEventListener('click', function() {
            successEl.classList.add('hidden');
            form.style.display = '';
            nameInput.value = '';
            emailInput.value = '';
            messageInput.value = '';
            clearErrors();
        });
    }

    // Remove error on focus
    var inputs = [nameInput, emailInput, messageInput];
    for (var j = 0; j < inputs.length; j++) {
        (function(input) {
            if (input) {
                input.addEventListener('focus', function() {
                    input.classList.remove('error');
                });
            }
        })(inputs[j]);
    }

    // ========================================
    // FOOTER MOBILE COLLAPSIBLE
    // ========================================
    var sections = document.querySelectorAll('[data-footer-section]');
    for (var s = 0; s < sections.length; s++) {
        (function(section) {
            var header = section.querySelector('.footer-links-header');
            if (header) {
                header.addEventListener('click', function() {
                    if (window.innerWidth < 768) {
                        var isActive = section.classList.contains('active');
                        for (var k = 0; k < sections.length; k++) {
                            sections[k].classList.remove('active');
                        }
                        if (!isActive) section.classList.add('active');
                    }
                });
            }
        })(sections[s]);
    }

});
