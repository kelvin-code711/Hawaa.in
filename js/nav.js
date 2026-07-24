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

    // Google 'G' logo (official four-colour mark) as an inline SVG data source.
    var GOOGLE_LOGO_SVG =
        '<svg class="signin-google-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="#4285F4" d="M23.06 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h6.2a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.18-2 3.44-4.96 3.44-8.38z"/>' +
            '<path fill="#34A853" d="M12 24c3.12 0 5.74-1.03 7.65-2.8l-3.72-2.89c-1.03.69-2.35 1.1-3.93 1.1-3.02 0-5.58-2.04-6.49-4.79H1.66v3c1.9 3.78 5.82 6.38 10.34 6.38z"/>' +
            '<path fill="#FBBC05" d="M5.51 14.62a7.2 7.2 0 0 1 0-4.62v-3H1.66a12 12 0 0 0 0 10.62l3.85-3z"/>' +
            '<path fill="#EA4335" d="M12 4.75c1.7 0 3.23.59 4.43 1.73l3.3-3.3C17.73 1.24 15.12 0 12 0 7.48 0 3.56 2.6 1.66 6.38l3.85 3C6.42 6.79 8.98 4.75 12 4.75z"/>' +
        '</svg>';

    // ---- Inject the Google button, method divider and legal notice into the
    // phone step. Phone OTP and Google both sign in *and* create the account,
    // so there is no separate "sign up" path to confuse the flow. ----
    function injectAuthUI() {
        if (!signinModal || !phoneStep) return;

        var title = phoneStep.querySelector('.signin-title');
        var subtitle = phoneStep.querySelector('.signin-subtitle');
        if (title) title.textContent = 'Sign in or create account';
        if (subtitle) subtitle.textContent = 'Continue with Google, or your mobile number';

        // Google button + "or" divider, placed above the phone field.
        var social = document.createElement('div');
        social.className = 'signin-social';
        social.innerHTML =
            '<button type="button" class="signin-google-btn" id="signin-google">' +
                GOOGLE_LOGO_SVG +
                '<span>Continue with Google</span>' +
            '</button>' +
            '<p class="signin-social-error" id="signin-google-error"></p>' +
            '<div class="signin-divider"><span>or</span></div>';
        // Sits directly above the mobile-number field.
        var phoneGroup = phoneStep.querySelector('#signin-phone-group');
        if (phoneGroup) {
            phoneStep.insertBefore(social, phoneGroup);
        } else {
            phoneStep.appendChild(social);
        }

        // Legal notice, appended after the Send OTP button.
        var legal = document.createElement('p');
        legal.className = 'signin-legal';
        legal.innerHTML =
            'By continuing, you agree to Hawaa\'s ' +
            '<a href="terms-of-service.html">Terms of Service</a>. ' +
            'Read our <a href="privacy-policy.html">Privacy policy</a>.';
        phoneStep.appendChild(legal);
    }

    injectAuthUI();

    var googleBtn = document.getElementById('signin-google');
    var googleError = document.getElementById('signin-google-error');

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
        [phoneStep, otpStep].forEach(function(s) {
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
            case 'auth/billing-not-enabled': return 'SMS sign-in is not available right now. Please continue with Google.';
            case 'auth/account-exists-with-different-credential': return 'You already have an account with this email. Try a different sign-in method.';
            case 'auth/unauthorized-domain': return 'Google sign-in isn\'t enabled for this site yet. Please use your mobile number.';
            case 'auth/operation-not-allowed': return 'Google sign-in isn\'t enabled yet. Please use your mobile number.';
            case 'auth/popup-closed-by-user':
            case 'auth/cancelled-popup-request': return 'Sign-in was cancelled. Please try again.';
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
                // Only seed a photo from the provider if the user hasn't set one.
                if (user.photoURL && !snap.data().photoURL) update.photoURL = user.photoURL;
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
            if (user.photoURL) data.photoURL = user.photoURL;
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
        if (googleError) googleError.textContent = '';
        if (googleBtn) googleBtn.disabled = false;

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

        // Complete a Google sign-in that fell back to a full-page redirect
        // (used when popups are blocked, e.g. some in-app/mobile browsers).
        fb.getRedirectResult(fb.auth).then(function(result) {
            if (result && result.user) {
                onSignedIn(result.user);
            }
        }).catch(function(err) {
            console.warn('Google redirect sign-in failed:', err);
        });
    });

    // ---- Google sign-in (also creates the account on first use) ----
    function signInWithGoogle() {
        if (!fb) {
            if (googleError) googleError.textContent = 'Still connecting… please try again in a moment.';
            return;
        }
        if (googleError) googleError.textContent = '';
        if (googleBtn) {
            googleBtn.disabled = true;
            googleBtn.classList.add('loading');
        }

        var provider = new fb.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });

        fb.signInWithPopup(fb.auth, provider)
            .then(function(credential) {
                onSignedIn(credential.user);
            })
            .catch(function(err) {
                var code = (err && err.code) || '';
                // A blocked/closed popup is common on mobile — fall back to a
                // redirect flow, which getRedirectResult() completes on return.
                if (code === 'auth/popup-blocked' ||
                    code === 'auth/operation-not-supported-in-this-environment' ||
                    code === 'auth/cancelled-popup-request') {
                    fb.signInWithRedirect(fb.auth, provider).catch(function(rErr) {
                        if (googleBtn) { googleBtn.disabled = false; googleBtn.classList.remove('loading'); }
                        if (googleError) googleError.textContent = friendlyAuthError(rErr);
                    });
                    return;
                }
                if (googleBtn) { googleBtn.disabled = false; googleBtn.classList.remove('loading'); }
                // A user closing the popup themselves isn't an error worth shouting about.
                if (code === 'auth/popup-closed-by-user') return;
                if (googleError) googleError.textContent = friendlyAuthError(err);
            });
    }

    if (googleBtn) {
        googleBtn.addEventListener('click', signInWithGoogle);
    }

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
