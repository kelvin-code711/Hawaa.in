// ========================================
// SHARED NAVIGATION, MENU & SIGN-IN
// ========================================

(function() {
    'use strict';

    // ========================================
    // EXPANDABLE MENU
    // ========================================
    const hamburger = document.getElementById('hamburger');
    const menuPanel = document.getElementById('menu-panel');
    const menuOverlay = document.getElementById('menu-overlay');

    function openMenu() {
        hamburger.classList.add('active');
        menuPanel.classList.add('active');
        menuOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
        hamburger.classList.remove('active');
        menuPanel.classList.remove('active');
        menuOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (hamburger && menuPanel && menuOverlay) {
        hamburger.addEventListener('click', function() {
            if (menuPanel.classList.contains('active')) {
                closeMenu();
            } else {
                closeMenu();
                openMenu();
            }
        });

        menuOverlay.addEventListener('click', closeMenu);

        // Close menu when clicking a nav item
        document.querySelectorAll('.menu-nav-item').forEach(function(item) {
            item.addEventListener('click', closeMenu);
        });

        // Close menu on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeMenu();
                closeSignin();
            }
        });
    }

    // ========================================
    // SIGN-IN MODAL
    // ========================================
    const profileBtn = document.getElementById('profile-btn');
    const signinOverlay = document.getElementById('signin-overlay');
    const signinModal = document.getElementById('signin-modal');
    const signinClose = document.getElementById('signin-close');

    // Steps
    const phoneStep = document.getElementById('signin-phone-step');
    const otpStep = document.getElementById('signin-otp-step');

    // Phone step elements
    const phoneInput = document.getElementById('signin-phone');
    const phoneInputGroup = document.getElementById('signin-phone-group');
    const phoneError = document.getElementById('signin-phone-error');
    const sendOtpBtn = document.getElementById('signin-send-otp');

    // OTP step elements
    const otpInputs = document.querySelectorAll('.otp-input');
    const otpError = document.getElementById('signin-otp-error');
    const verifyBtn = document.getElementById('signin-verify');
    const resendBtn = document.getElementById('signin-resend');
    const backBtn = document.getElementById('signin-back');
    const phoneDisplay = document.getElementById('signin-phone-display');

    var currentPhone = '';
    var resendTimer = null;

    function openSignin() {
        if (signinOverlay) {
            signinOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            // Focus phone input after animation
            setTimeout(function() {
                if (phoneInput) phoneInput.focus();
            }, 400);
        }
    }

    function closeSignin() {
        if (signinOverlay) {
            signinOverlay.classList.remove('active');
            document.body.style.overflow = '';
            resetSignin();
        }
    }

    function resetSignin() {
        // Reset to phone step
        if (phoneStep) phoneStep.classList.remove('hidden');
        if (otpStep) otpStep.classList.add('hidden');

        // Clear inputs
        if (phoneInput) phoneInput.value = '';
        if (phoneInputGroup) phoneInputGroup.classList.remove('error');
        if (phoneError) phoneError.textContent = '';

        otpInputs.forEach(function(input) {
            input.value = '';
            input.classList.remove('error', 'filled');
        });
        if (otpError) otpError.textContent = '';

        // Reset buttons
        if (sendOtpBtn) {
            sendOtpBtn.disabled = false;
            sendOtpBtn.textContent = 'Send OTP';
        }
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify';
        }

        // Clear timer
        if (resendTimer) {
            clearInterval(resendTimer);
            resendTimer = null;
        }
        if (resendBtn) {
            resendBtn.disabled = false;
            resendBtn.textContent = 'Resend OTP';
        }
    }

    if (profileBtn) {
        profileBtn.addEventListener('click', openSignin);
    }

    if (signinClose) {
        signinClose.addEventListener('click', closeSignin);
    }

    if (signinOverlay) {
        signinOverlay.addEventListener('click', function(e) {
            if (e.target === signinOverlay) {
                closeSignin();
            }
        });
    }

    // ---- Phone validation ----
    function validatePhone(number) {
        // Indian mobile: 10 digits, starts with 6-9
        var cleaned = number.replace(/\D/g, '');
        if (cleaned.length !== 10) {
            return 'Please enter a valid 10-digit mobile number';
        }
        if (!/^[6-9]/.test(cleaned)) {
            return 'Mobile number must start with 6, 7, 8 or 9';
        }
        return null;
    }

    if (phoneInput) {
        // Only allow digits
        phoneInput.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');

            // Clear error on typing
            if (phoneInputGroup) phoneInputGroup.classList.remove('error');
            if (phoneError) phoneError.textContent = '';
        });

        // Submit on Enter
        phoneInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (sendOtpBtn) sendOtpBtn.click();
            }
        });
    }

    if (sendOtpBtn) {
        sendOtpBtn.addEventListener('click', function() {
            var number = phoneInput ? phoneInput.value.trim() : '';
            var error = validatePhone(number);

            if (error) {
                if (phoneInputGroup) phoneInputGroup.classList.add('error');
                if (phoneError) phoneError.textContent = error;
                return;
            }

            currentPhone = number;

            // Show loading
            sendOtpBtn.disabled = true;
            sendOtpBtn.innerHTML = '<span class="spinner"></span>Sending...';

            // Simulate OTP send (replace with actual API)
            setTimeout(function() {
                sendOtpBtn.disabled = false;
                sendOtpBtn.textContent = 'Send OTP';

                // Switch to OTP step
                phoneStep.classList.add('hidden');
                otpStep.classList.remove('hidden');

                // Show phone number
                if (phoneDisplay) {
                    phoneDisplay.textContent = '+91 ' + currentPhone;
                }

                // Focus first OTP input
                if (otpInputs.length > 0) {
                    otpInputs[0].focus();
                }

                // Start resend timer
                startResendTimer();
            }, 1200);
        });
    }

    // ---- OTP Input Handling ----
    otpInputs.forEach(function(input, index) {
        input.addEventListener('input', function() {
            // Only allow single digit
            this.value = this.value.replace(/\D/g, '').slice(0, 1);

            // Clear error styling
            this.classList.remove('error');
            if (otpError) otpError.textContent = '';

            if (this.value) {
                this.classList.add('filled');
                // Move to next input
                if (index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            } else {
                this.classList.remove('filled');
            }

            // Auto-verify when all filled
            var allFilled = Array.from(otpInputs).every(function(inp) {
                return inp.value.length === 1;
            });
            if (allFilled && verifyBtn) {
                verifyBtn.click();
            }
        });

        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && !this.value && index > 0) {
                otpInputs[index - 1].focus();
                otpInputs[index - 1].value = '';
                otpInputs[index - 1].classList.remove('filled');
            }
        });

        // Handle paste
        input.addEventListener('paste', function(e) {
            e.preventDefault();
            var pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
            if (pasted.length >= otpInputs.length) {
                otpInputs.forEach(function(inp, i) {
                    inp.value = pasted[i] || '';
                    if (inp.value) inp.classList.add('filled');
                });
                otpInputs[otpInputs.length - 1].focus();
                // Auto-verify
                if (verifyBtn) verifyBtn.click();
            }
        });
    });

    if (verifyBtn) {
        verifyBtn.addEventListener('click', function() {
            var otp = Array.from(otpInputs).map(function(inp) { return inp.value; }).join('');

            if (otp.length !== 6) {
                otpInputs.forEach(function(inp) {
                    if (!inp.value) inp.classList.add('error');
                });
                if (otpError) otpError.textContent = 'Please enter the complete 6-digit OTP';
                return;
            }

            // Show loading
            verifyBtn.disabled = true;
            verifyBtn.innerHTML = '<span class="spinner"></span>Verifying...';

            // Simulate verification (replace with actual API)
            setTimeout(function() {
                // Simulating wrong OTP for demo (any OTP works as correct for now)
                // In production, check against actual OTP response
                verifyBtn.disabled = false;
                verifyBtn.textContent = 'Verify';

                // For demo: show success and close
                verifyBtn.textContent = 'Verified';
                verifyBtn.style.background = '#059669';

                setTimeout(function() {
                    closeSignin();
                    verifyBtn.style.background = '';
                }, 800);
            }, 1500);
        });
    }

    // ---- Back button ----
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            otpStep.classList.add('hidden');
            phoneStep.classList.remove('hidden');

            // Clear OTP inputs
            otpInputs.forEach(function(input) {
                input.value = '';
                input.classList.remove('error', 'filled');
            });
            if (otpError) otpError.textContent = '';

            // Clear timer
            if (resendTimer) {
                clearInterval(resendTimer);
                resendTimer = null;
            }
            if (resendBtn) {
                resendBtn.disabled = false;
                resendBtn.textContent = 'Resend OTP';
            }

            // Focus phone input
            if (phoneInput) phoneInput.focus();
        });
    }

    // ---- Resend OTP ----
    function startResendTimer() {
        var seconds = 30;
        if (resendBtn) {
            resendBtn.disabled = true;
            resendBtn.textContent = 'Resend in ' + seconds + 's';
        }

        resendTimer = setInterval(function() {
            seconds--;
            if (resendBtn) {
                resendBtn.textContent = 'Resend in ' + seconds + 's';
            }
            if (seconds <= 0) {
                clearInterval(resendTimer);
                resendTimer = null;
                if (resendBtn) {
                    resendBtn.disabled = false;
                    resendBtn.textContent = 'Resend OTP';
                }
            }
        }, 1000);
    }

    if (resendBtn) {
        resendBtn.addEventListener('click', function() {
            if (resendBtn.disabled) return;

            // Show loading briefly
            resendBtn.disabled = true;
            resendBtn.textContent = 'Sending...';

            setTimeout(function() {
                // Clear OTP inputs
                otpInputs.forEach(function(input) {
                    input.value = '';
                    input.classList.remove('error', 'filled');
                });
                if (otpError) otpError.textContent = '';
                if (otpInputs.length > 0) otpInputs[0].focus();

                // Restart timer
                startResendTimer();
            }, 800);
        });
    }

    // ========================================
    // FOOTER COLLAPSIBLE (Mobile)
    // ========================================
    document.querySelectorAll('[data-footer-section]').forEach(function(section) {
        var header = section.querySelector('.footer-links-header');
        if (header) {
            header.addEventListener('click', function() {
                if (window.innerWidth < 640) {
                    var isOpen = section.classList.contains('active');
                    document.querySelectorAll('[data-footer-section]').forEach(function(s) {
                        s.classList.remove('active');
                    });
                    if (!isOpen) section.classList.add('active');
                }
            });
        }
    });

})();
