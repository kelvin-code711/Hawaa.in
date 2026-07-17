// ========================================
// SHARED NAVIGATION, MENU & SIGN-IN
// Auth is backed by Firebase (js/firebase.js exposes window.hawaaFirebase).
// ========================================

// Promise that resolves when the firebase.js module has initialized.
window.hawaaFirebaseReady = window.hawaaFirebase
    ? Promise.resolve(window.hawaaFirebase)
    : new Promise(function(resolve) { window.__hawaaFirebaseResolve = resolve; });

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
        hamburger.setAttribute('aria-expanded', 'true');
        menuPanel.classList.add('active');
        menuOverlay.classList.add('active');
        document.body.classList.add('menu-open');
        document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
        hamburger.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
        menuPanel.classList.remove('active');
        menuOverlay.classList.remove('active');
        document.body.classList.remove('menu-open');
        document.body.style.overflow = '';
    }

    // Highlight the current page inside the menu panel.
    (function markActivePage() {
        var current = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.menu-nav-item[href]').forEach(function(link) {
            var target = (link.getAttribute('href') || '').split('#')[0];
            if (target && target === current) {
                link.setAttribute('aria-current', 'page');
            }
        });
    })();

    if (hamburger && menuPanel && menuOverlay) {
        hamburger.setAttribute('aria-expanded', 'false');

        hamburger.addEventListener('click', function() {
            if (menuPanel.classList.contains('active')) {
                closeMenu();
            } else {
                closeMenu();
                openMenu();
            }
        });

        menuOverlay.addEventListener('click', closeMenu);

        // Close menu when clicking any nav item, utility row or the buy CTA
        document.querySelectorAll('.menu-nav-item, .menu-utility-item, .menu-cta').forEach(function(item) {
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
    // SIGN-IN MODAL (Firebase Auth)
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
    var fb = null;                  // window.hawaaFirebase once ready
    var currentUser = null;
    var confirmationResult = null;  // from signInWithPhoneNumber
    var recaptchaVerifier = null;

    // ---- Dynamically injected email step ----
    var emailStep = null;

    function injectEmailUI() {
        if (!signinModal || !phoneStep) return;

        // "or continue with email" switch inside the phone step
        var switchWrap = document.createElement('div');
        switchWrap.className = 'signin-actions';
        switchWrap.innerHTML =
            '<button type="button" class="signin-back" id="signin-use-email">Use email instead</button>';
        phoneStep.appendChild(switchWrap);

        // Email step
        emailStep = document.createElement('div');
        emailStep.className = 'signin-step hidden';
        emailStep.id = 'signin-email-step';
        emailStep.innerHTML =
            '<h2 class="signin-title">Sign in</h2>' +
            '<p class="signin-subtitle" id="signin-email-subtitle">Enter your email and password</p>' +
            '<div class="phone-input-group hidden" id="signin-name-group" style="margin-bottom:10px;">' +
                '<input type="text" class="phone-input" id="signin-name" placeholder="Full name" autocomplete="name" maxlength="100" style="padding-left:16px;">' +
            '</div>' +
            '<div class="phone-input-group" id="signin-email-group" style="margin-bottom:10px;">' +
                '<input type="email" class="phone-input" id="signin-email" placeholder="Email address" autocomplete="email" style="padding-left:16px;">' +
            '</div>' +
            '<div class="phone-input-group" id="signin-password-group">' +
                '<input type="password" class="phone-input" id="signin-password" placeholder="Password" autocomplete="current-password" style="padding-left:16px;">' +
            '</div>' +
            '<p class="signin-error" id="signin-email-error"></p>' +
            '<button class="signin-btn" id="signin-email-submit">Sign in</button>' +
            '<div class="signin-actions">' +
                '<button type="button" class="signin-back" id="signin-email-toggle">Create an account</button>' +
                '<button type="button" class="signin-resend" id="signin-forgot">Forgot password?</button>' +
            '</div>' +
            '<div class="signin-actions">' +
                '<button type="button" class="signin-back" id="signin-use-phone">Use mobile number instead</button>' +
            '</div>';
        signinModal.appendChild(emailStep);

    }

    injectEmailUI();

    var useEmailBtn = document.getElementById('signin-use-email');
    var usePhoneBtn = document.getElementById('signin-use-phone');
    var nameGroup = document.getElementById('signin-name-group');
    var nameInput = document.getElementById('signin-name');
    var emailInput = document.getElementById('signin-email');
    var emailGroup = document.getElementById('signin-email-group');
    var passwordInput = document.getElementById('signin-password');
    var passwordGroup = document.getElementById('signin-password-group');
    var emailError = document.getElementById('signin-email-error');
    var emailSubmit = document.getElementById('signin-email-submit');
    var emailToggle = document.getElementById('signin-email-toggle');
    var emailSubtitle = document.getElementById('signin-email-subtitle');
    var forgotBtn = document.getElementById('signin-forgot');

    var emailMode = 'signin'; // 'signin' | 'signup'

    // Auto-focusing a field on touch devices pops the keyboard (and, on iOS,
    // can zoom/shift the page) the moment the modal opens — only do it when
    // a real pointer is available.
    function canAutoFocus() {
        return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    }

    function autoFocus(input) {
        if (input && canAutoFocus()) input.focus();
    }

    function showStep(step) {
        [phoneStep, otpStep, emailStep].forEach(function(s) {
            if (s) s.classList.add('hidden');
        });
        if (step) step.classList.remove('hidden');
    }

    function friendlyAuthError(err) {
        var code = (err && err.code) || '';
        switch (code) {
            case 'auth/invalid-phone-number': return 'That mobile number looks invalid. Please check and try again.';
            case 'auth/invalid-verification-code': return 'Incorrect OTP. Please check the code and try again.';
            case 'auth/code-expired': return 'This OTP has expired. Please request a new one.';
            case 'auth/too-many-requests': return 'Too many attempts. Please wait a while and try again.';
            case 'auth/invalid-email': return 'That email address looks invalid.';
            case 'auth/email-already-in-use': return 'An account already exists with this email. Try signing in.';
            case 'auth/weak-password': return 'Password must be at least 6 characters.';
            case 'auth/invalid-credential':
            case 'auth/wrong-password':
            case 'auth/user-not-found': return 'Incorrect email or password.';
            case 'auth/network-request-failed': return 'Network error. Please check your connection and try again.';
            case 'auth/billing-not-enabled': return 'SMS sign-in is not available right now. Please use email instead.';
            default: return (err && err.message) ? err.message.replace('Firebase: ', '') : 'Something went wrong. Please try again.';
        }
    }

    // Create (first sign-in) or refresh the user's profile document in Firestore.
    function upsertUserProfile(user) {
        var ref = fb.doc(fb.db, 'web_users', user.uid);
        return fb.getDoc(ref).then(function(snap) {
            if (snap.exists()) {
                var update = { lastLoginAt: fb.serverTimestamp() };
                if (user.displayName) update.displayName = user.displayName;
                return fb.setDoc(ref, update, { merge: true });
            }
            var data = {
                uid: user.uid,
                createdAt: fb.serverTimestamp(),
                lastLoginAt: fb.serverTimestamp()
            };
            if (user.displayName) data.displayName = user.displayName;
            if (user.email) data.email = user.email;
            if (user.phoneNumber) data.phone = user.phoneNumber;
            return fb.setDoc(ref, data);
        }).catch(function(err) {
            // Profile write must never block sign-in UX.
            console.warn('Could not save profile:', err);
        });
    }

    function onSignedIn(user) {
        upsertUserProfile(user);
        if (verifyBtn) {
            verifyBtn.textContent = 'Verified';
            verifyBtn.style.background = '#059669';
        }
        // Land the user on their profile page after signing in.
        setTimeout(function() {
            closeSignin();
            if (verifyBtn) verifyBtn.style.background = '';
            window.location.href = 'account.html';
        }, 800);
    }

    function openSignin() {
        if (!signinOverlay) return;

        // Already signed in: the profile icon goes to the account page.
        if (currentUser) {
            window.location.href = 'account.html';
            return;
        }

        signinOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        showStep(phoneStep);
        setTimeout(function() {
            autoFocus(phoneInput);
        }, 400);
    }

    function closeSignin() {
        if (signinOverlay) {
            signinOverlay.classList.remove('active');
            document.body.style.overflow = '';
            resetSignin();
        }
    }

    function resetSignin() {
        showStep(phoneStep);
        confirmationResult = null;

        // Clear inputs
        if (phoneInput) phoneInput.value = '';
        if (phoneInputGroup) phoneInputGroup.classList.remove('error');
        if (phoneError) phoneError.textContent = '';

        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';
        if (nameInput) nameInput.value = '';
        if (emailError) emailError.textContent = '';

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
        if (emailSubmit) {
            emailSubmit.disabled = false;
            emailSubmit.textContent = emailMode === 'signup' ? 'Create account' : 'Sign in';
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

    // ---- Firebase auth state ----
    window.hawaaFirebaseReady.then(function(api) {
        fb = api;
        fb.onAuthStateChanged(fb.auth, function(user) {
            currentUser = user;
            if (profileBtn) {
                profileBtn.classList.toggle('signed-in', !!user);
                profileBtn.title = user
                    ? 'Account (' + (user.displayName || user.email || user.phoneNumber || 'signed in') + ')'
                    : 'Sign in';
            }
        });
    });

    function ensureRecaptcha() {
        if (recaptchaVerifier) return recaptchaVerifier;
        recaptchaVerifier = new fb.RecaptchaVerifier(fb.auth, sendOtpBtn, { size: 'invisible' });
        return recaptchaVerifier;
    }

    function resetRecaptcha() {
        if (recaptchaVerifier) {
            try { recaptchaVerifier.clear(); } catch (e) { /* already cleared */ }
            recaptchaVerifier = null;
        }
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

    function sendOtp(onSent) {
        fb.signInWithPhoneNumber(fb.auth, '+91' + currentPhone, ensureRecaptcha())
            .then(function(result) {
                confirmationResult = result;
                onSent(null);
            })
            .catch(function(err) {
                resetRecaptcha();
                onSent(err);
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
            if (!fb) {
                if (phoneError) phoneError.textContent = 'Still connecting… please try again in a moment.';
                return;
            }

            currentPhone = number;

            // Show loading
            sendOtpBtn.disabled = true;
            sendOtpBtn.innerHTML = '<span class="spinner"></span>Sending...';

            sendOtp(function(err) {
                sendOtpBtn.disabled = false;
                sendOtpBtn.textContent = 'Send OTP';

                if (err) {
                    if (phoneInputGroup) phoneInputGroup.classList.add('error');
                    if (phoneError) phoneError.textContent = friendlyAuthError(err);
                    return;
                }

                // Switch to OTP step
                showStep(otpStep);

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
            });
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
            if (!confirmationResult) {
                if (otpError) otpError.textContent = 'Session expired. Please request a new OTP.';
                return;
            }

            // Show loading
            verifyBtn.disabled = true;
            verifyBtn.innerHTML = '<span class="spinner"></span>Verifying...';

            confirmationResult.confirm(otp)
                .then(function(credential) {
                    verifyBtn.disabled = false;
                    onSignedIn(credential.user);
                })
                .catch(function(err) {
                    verifyBtn.disabled = false;
                    verifyBtn.textContent = 'Verify';
                    otpInputs.forEach(function(inp) { inp.classList.add('error'); });
                    if (otpError) otpError.textContent = friendlyAuthError(err);
                });
        });
    }

    // ---- Back button ----
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            showStep(phoneStep);
            confirmationResult = null;

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
            autoFocus(phoneInput);
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

            resendBtn.disabled = true;
            resendBtn.textContent = 'Sending...';

            sendOtp(function(err) {
                // Clear OTP inputs
                otpInputs.forEach(function(input) {
                    input.value = '';
                    input.classList.remove('error', 'filled');
                });
                if (otpError) otpError.textContent = err ? friendlyAuthError(err) : '';
                if (otpInputs.length > 0) otpInputs[0].focus();

                // Restart timer
                startResendTimer();
            });
        });
    }

    // ---- Email step wiring ----
    function setEmailMode(mode) {
        emailMode = mode;
        var signup = mode === 'signup';
        if (nameGroup) nameGroup.classList.toggle('hidden', !signup);
        if (emailSubtitle) emailSubtitle.textContent = signup ? 'Create your Hawaa account' : 'Enter your email and password';
        if (emailSubmit) emailSubmit.textContent = signup ? 'Create account' : 'Sign in';
        if (emailToggle) emailToggle.textContent = signup ? 'I already have an account' : 'Create an account';
        if (passwordInput) passwordInput.setAttribute('autocomplete', signup ? 'new-password' : 'current-password');
        if (emailError) emailError.textContent = '';
    }

    if (useEmailBtn) {
        useEmailBtn.addEventListener('click', function() {
            showStep(emailStep);
            setEmailMode('signin');
            setTimeout(function() { autoFocus(emailInput); }, 100);
        });
    }

    if (usePhoneBtn) {
        usePhoneBtn.addEventListener('click', function() {
            showStep(phoneStep);
            setTimeout(function() { autoFocus(phoneInput); }, 100);
        });
    }

    if (emailToggle) {
        emailToggle.addEventListener('click', function() {
            setEmailMode(emailMode === 'signup' ? 'signin' : 'signup');
        });
    }

    if (forgotBtn) {
        forgotBtn.addEventListener('click', function() {
            var email = emailInput ? emailInput.value.trim() : '';
            if (!email) {
                if (emailError) emailError.textContent = 'Enter your email above, then tap "Forgot password?" again.';
                return;
            }
            if (!fb) return;
            fb.sendPasswordResetEmail(fb.auth, email)
                .then(function() {
                    if (emailError) emailError.textContent = 'Password reset email sent. Check your inbox.';
                })
                .catch(function(err) {
                    if (emailError) emailError.textContent = friendlyAuthError(err);
                });
        });
    }

    function handleEmailSubmit() {
        var email = emailInput ? emailInput.value.trim() : '';
        var password = passwordInput ? passwordInput.value : '';
        var name = nameInput ? nameInput.value.trim() : '';

        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            if (emailError) emailError.textContent = 'Please enter a valid email address.';
            return;
        }
        if (!password || password.length < 6) {
            if (emailError) emailError.textContent = 'Password must be at least 6 characters.';
            return;
        }
        if (!fb) {
            if (emailError) emailError.textContent = 'Still connecting… please try again in a moment.';
            return;
        }

        emailSubmit.disabled = true;
        emailSubmit.innerHTML = '<span class="spinner"></span>' + (emailMode === 'signup' ? 'Creating...' : 'Signing in...');

        var action = emailMode === 'signup'
            ? fb.createUserWithEmailAndPassword(fb.auth, email, password).then(function(credential) {
                  if (name) {
                      return fb.updateProfile(credential.user, { displayName: name }).then(function() {
                          return credential;
                      });
                  }
                  return credential;
              })
            : fb.signInWithEmailAndPassword(fb.auth, email, password);

        action
            .then(function(credential) {
                emailSubmit.disabled = false;
                emailSubmit.textContent = 'Done';
                onSignedIn(credential.user);
            })
            .catch(function(err) {
                emailSubmit.disabled = false;
                emailSubmit.textContent = emailMode === 'signup' ? 'Create account' : 'Sign in';
                if (emailError) emailError.textContent = friendlyAuthError(err);
            });
    }

    if (emailSubmit) {
        emailSubmit.addEventListener('click', handleEmailSubmit);
    }
    if (passwordInput) {
        passwordInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleEmailSubmit();
            }
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
