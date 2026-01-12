// ============================================================
// SAWFISH APP STORE - APPLICATION JAVASCRIPT
// Full Logic for PWA, Navigation, Ratings, Reviews, Firestore
// Enhanced with Firebase Authentication, Profile Pictures, Search
// Author: Eric Zhu / Sawfish Developer Group
// Date: January 10, 2026
// ============================================================

// ============================================================
// VERSION CONFIGURATION
// ============================================================
const APP_VERSION = '2.6.0';
const VERSION_CHECK_URL = '/update/version.json';

// ============================================================
// FIREBASE CONFIGURATION
// ============================================================
const firebaseConfig = {
    apiKey: "AIzaSyB5JaGq3ezv1ghif7ggRr8_jxuq7ZGw4Bo",
    authDomain: "appstore-cb2fa.firebaseapp.com",
    projectId: "appstore-cb2fa",
    storageBucket: "appstore-cb2fa.firebasestorage.app",
    messagingSenderId: "122307463006",
    appId: "1:122307463006:web:25993ed888531908fbb1cf"
};

// Initialize Firebase
let db = null;
let auth = null;
let storage = null;
let app = null;

try {
    if (typeof firebase !== 'undefined') {
        if (firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
            app = firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            auth = firebase.auth();
            storage = firebase.storage();
            
            if (auth) {
                auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                    .then(() => {
                        console.log('Auth persistence set to LOCAL');
                    })
                    .catch((error) => {
                        console.error('Error setting auth persistence:', error);
                    });
                
                auth.onAuthStateChanged((user) => {
                    if (user) {
                        console.log('User signed in:', user.email);
                        UserAuth.currentUser = {
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName || user.email.split('@')[0],
                            emailVerified: user.emailVerified
                        };
                        UserAuth.updateAuthUI();
                    } else {
                        console.log('User signed out');
                    }
                });
            }
            
            console.log('Firebase initialized successfully');
            console.log('Project ID:', firebaseConfig.projectId);
        } else {
            console.warn('Firebase config not set - using local storage fallback');
        }
    } else {
        console.warn('Firebase SDK not loaded - using local storage fallback');
    }
} catch (error) {
    console.error('Firebase initialization failed:', error);
    console.warn('Falling back to local storage');
}

// ============================================================
// USER AUTHENTICATION SYSTEM
// ============================================================
const UserAuth = {
    currentUser: null,
    userProfile: null,
    isDeveloperMode: false,
    DEVELOPER_USERNAME: 'Developer',
    DEVELOPER_PASSWORD: '120622',
    
    init: function() {
        this.loadUserSession();
        this.setupAuthListeners();
        this.updateAuthUI();
    },
    
    loadUserSession: function() {
        try {
            const storedUser = localStorage.getItem('sawfish_user');
            const storedProfile = localStorage.getItem('sawfish_profile');
            
            if (storedUser) {
                this.currentUser = JSON.parse(storedUser);
            }
            
            if (storedProfile) {
                this.userProfile = JSON.parse(storedProfile);
            }
            
            const devSession = sessionStorage.getItem('developer_logged_in');
            this.isDeveloperMode = devSession === 'true';
        } catch (error) {
            console.error('Error loading session:', error);
        }
    },
    
    saveUserSession: function() {
        try {
            if (this.currentUser) {
                localStorage.setItem('sawfish_user', JSON.stringify(this.currentUser));
            }
            if (this.userProfile) {
                localStorage.setItem('sawfish_profile', JSON.stringify(this.userProfile));
            }
        } catch (error) {
            console.error('Error saving session:', error);
        }
    },
    
    clearSession: function() {
        this.currentUser = null;
        this.userProfile = null;
        this.isDeveloperMode = false;
        localStorage.removeItem('sawfish_user');
        localStorage.removeItem('sawfish_profile');
        sessionStorage.removeItem('developer_logged_in');
    },
    
    setupAuthListeners: function() {
        console.log('Setting up auth listeners...');
        
        const loginForm = document.getElementById('login-form');
        console.log('Login form found:', !!loginForm);
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        const signupForm = document.getElementById('signup-form');
        console.log('Signup form found:', !!signupForm);
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }
        
        const resetForm = document.getElementById('reset-form');
        console.log('Reset form found:', !!resetForm);
        if (resetForm) {
            resetForm.addEventListener('submit', (e) => this.handlePasswordReset(e));
        }
        
        const authTabs = document.querySelectorAll('.auth-tab');
        authTabs.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.authTab;
                
                authTabs.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
                document.getElementById('signup-form').style.display = tab === 'signup' ? 'block' : 'none';
                document.getElementById('reset-form').style.display = tab === 'reset' ? 'block' : 'none';
                
                const title = document.getElementById('auth-modal-title');
                if (title) {
                    if (tab === 'login') title.textContent = 'Sign In';
                    else if (tab === 'signup') title.textContent = 'Create Account';
                    else if (tab === 'reset') title.textContent = 'Reset Password';
                }
            });
        });
        
        const userProfileBtn = document.getElementById('user-profile-button');
        if (userProfileBtn) {
            userProfileBtn.addEventListener('click', () => this.handleProfileButtonClick());
        }
        
        const logoutBtn = document.getElementById('profile-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
        
        const profileSaveBtn = document.getElementById('profile-save-btn');
        if (profileSaveBtn) {
            profileSaveBtn.addEventListener('click', () => this.saveProfileChanges());
        }
        
        const profileCancelBtn = document.getElementById('profile-cancel-btn');
        if (profileCancelBtn) {
            profileCancelBtn.addEventListener('click', () => this.closeProfileModal());
        }
        
        const avatarUpload = document.getElementById('avatar-upload-input');
        if (avatarUpload) {
            avatarUpload.addEventListener('change', (e) => this.handleProfilePictureUpload(e));
        }
        
        const profileClose = document.getElementById('profile-close');
        if (profileClose) {
            profileClose.addEventListener('click', () => this.closeProfileModal());
        }
        
        const authCancel = document.getElementById('auth-cancel');
        if (authCancel) {
            authCancel.addEventListener('click', () => this.closeAuthModal());
        }
        
        const authModal = document.getElementById('auth-modal');
        if (authModal) {
            const backdrop = authModal.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.addEventListener('click', () => this.closeAuthModal());
            }
        }
        
        // User profile modal close button
        const userProfileClose = document.getElementById('user-profile-modal-close');
        if (userProfileClose) {
            userProfileClose.addEventListener('click', () => this.closeUserProfileModal());
        }
        
        // User profile modal backdrop
        const userProfileModal = document.getElementById('user-profile-modal');
        if (userProfileModal) {
            const backdrop = userProfileModal.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.addEventListener('click', () => this.closeUserProfileModal());
            }
        }
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const authModal = document.getElementById('auth-modal');
                if (authModal && !authModal.classList.contains('hidden')) {
                    this.closeAuthModal();
                }
                const userProfileModal = document.getElementById('user-profile-modal');
                if (userProfileModal && !userProfileModal.classList.contains('hidden')) {
                    this.closeUserProfileModal();
                }
            }
        });
    },
    
    handleProfileButtonClick: function() {
        if (this.isLoggedIn()) {
            this.openProfileModal();
        } else {
            this.openAuthModal();
        }
    },
    
    openProfileModal: function() {
        const modal = document.getElementById('profile-modal');
        if (!modal) return;
        
        const name = this.userProfile?.username || this.currentUser?.displayName || 'User';
        const email = this.userProfile?.email || this.currentUser?.email || 'Not signed in';
        const bio = this.userProfile?.bio || '';
        
        const nameEl = document.getElementById('profile-display-name');
        const emailEl = document.getElementById('profile-email');
        const nameInput = document.getElementById('profile-name-input');
        const bioInput = document.getElementById('profile-bio-input');
        
        if (nameEl) nameEl.textContent = name;
        if (emailEl) emailEl.textContent = email;
        if (nameInput) nameInput.value = name;
        if (bioInput) bioInput.value = bio;
        
        this.updateProfileAvatar();
        
        const statusBadge = document.getElementById('profile-status-badge');
        if (statusBadge) {
            if (this.isDeveloperMode) {
                statusBadge.textContent = 'Developer';
                statusBadge.classList.add('developer');
            } else {
                statusBadge.textContent = 'User';
                statusBadge.classList.remove('developer');
            }
        }
        
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
    },
    
    closeProfileModal: function() {
        const modal = document.getElementById('profile-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
        }
    },
    
    closeUserProfileModal: function() {
        const modal = document.getElementById('user-profile-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
        }
    },
    
    updateProfileAvatar: function() {
        const avatarInitial = document.getElementById('profile-avatar-initial');
        const avatarImg = document.getElementById('profile-avatar-img');
        const previewInitial = document.getElementById('upload-preview-initial');
        const previewImg = document.getElementById('upload-preview-img');
        
        const name = this.userProfile?.username || this.currentUser?.displayName || 'User';
        const initial = name.charAt(0).toUpperCase();
        
        if (this.userProfile?.avatarUrl) {
            if (avatarInitial) avatarInitial.style.display = 'none';
            if (avatarImg) {
                avatarImg.src = this.userProfile.avatarUrl;
                avatarImg.style.display = 'block';
            }
            if (previewInitial) previewInitial.style.display = 'none';
            if (previewImg) {
                previewImg.src = this.userProfile.avatarUrl;
                previewImg.style.display = 'block';
            }
        } else {
            if (avatarInitial) {
                avatarInitial.textContent = initial;
                avatarInitial.style.display = 'flex';
            }
            if (avatarImg) avatarImg.style.display = 'none';
            if (previewInitial) {
                previewInitial.textContent = initial;
                previewInitial.style.display = 'flex';
            }
            if (previewImg) previewImg.style.display = 'none';
        }
    },
    
    saveProfileChanges: function() {
        const nameInput = document.getElementById('profile-name-input');
        const bioInput = document.getElementById('profile-bio-input');
        const name = nameInput?.value.trim();
        const bio = bioInput?.value.trim();
        
        if (name) {
            this.userProfile = this.userProfile || {};
            this.userProfile.username = name;
            this.userProfile.bio = bio || '';
            
            if (this.currentUser) {
                this.currentUser.displayName = name;
            }
            
            this.saveUserSession();
            
            if (db && this.currentUser) {
                db.collection('users').doc(this.currentUser.uid).set({
                    username: name,
                    bio: bio || ''
                }, { merge: true })
                .then(() => {
                    console.log('Profile saved to Firestore');
                })
                .catch((error) => {
                    console.error('Error saving profile to Firestore:', error);
                });
            }
            
            if (!db && this.currentUser) {
                const storedUsers = JSON.parse(localStorage.getItem('sawfish_users') || '{}');
                const email = this.currentUser.email;
                if (storedUsers[email]) {
                    storedUsers[email].username = name;
                    storedUsers[email].bio = bio || '';
                    localStorage.setItem('sawfish_users', JSON.stringify(storedUsers));
                }
            }
            
            this.updateAuthUI();
            this.updateProfileAvatar();
            showNotification('Profile updated!');
            
            this.closeProfileModal();
        }
    },
    
    handleLogin: async function(event) {
        event.preventDefault();
        
        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');
        const errorDiv = document.getElementById('auth-error');
        const submitBtn = document.getElementById('login-submit');
        
        const email = emailInput?.value.trim();
        const password = passwordInput?.value;
        
        if (!email || !password) {
            this.showError(errorDiv, 'Please enter both email and password');
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';
        
        try {
            if (email === this.DEVELOPER_USERNAME && password === this.DEVELOPER_PASSWORD) {
                this.isDeveloperMode = true;
                sessionStorage.setItem('developer_logged_in', 'true');
                this.currentUser = {
                    uid: 'developer',
                    email: null,
                    displayName: this.DEVELOPER_USERNAME,
                    isDeveloper: true
                };
                this.userProfile = {
                    username: this.DEVELOPER_USERNAME,
                    avatarUrl: null
                };
                this.saveUserSession();
                this.closeAuthModal();
                this.updateAuthUI();
                
                DeveloperMode.isLoggedIn = true;
                DeveloperMode.updateLoginButton();
                updateDevOnlyElements();
                
                Achievements.checkAchievements('be_a_dev');
                
                showNotification('Developer mode activated');
                return;
            }
            
            if (auth) {
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                await this.getOrCreateUserProfile(user);
                
                this.saveUserSession();
                this.closeAuthModal();
                this.updateAuthUI();
                showNotification('Welcome back!');
            } else {
                const storedUsers = JSON.parse(localStorage.getItem('sawfish_users') || '{}');
                if (storedUsers[email] && storedUsers[email].password === password) {
                    this.currentUser = {
                        uid: storedUsers[email].uid,
                        email: email,
                        displayName: storedUsers[email].username,
                        isDeveloper: false
                    };
                    this.userProfile = {
                        username: storedUsers[email].username,
                        email: email,
                        bio: storedUsers[email].bio || '',
                        achievements: storedUsers[email].achievements || [],
                        avatarUrl: storedUsers[email].avatarUrl || null
                    };
                    this.saveUserSession();
                    this.closeAuthModal();
                    this.updateAuthUI();
                    showNotification('Welcome back! (Offline mode)');
                } else {
                    this.showError(errorDiv, 'Invalid email or password. In offline mode, please sign up first.');
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = 'Login failed. Please try again.';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'No account found with this email';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Incorrect password';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'This account has been disabled';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many failed attempts. Please try again later';
                    break;
            }
            
            this.showError(errorDiv, errorMessage);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        }
    },
    
    handleSignup: async function(event) {
        event.preventDefault();
        
        const nameInput = document.getElementById('signup-name');
        const emailInput = document.getElementById('signup-email');
        const passwordInput = document.getElementById('signup-password');
        const confirmInput = document.getElementById('signup-confirm');
        const errorDiv = document.getElementById('auth-error');
        const submitBtn = document.getElementById('signup-submit');
        
        const name = nameInput?.value.trim();
        const email = emailInput?.value.trim();
        const password = passwordInput?.value;
        const confirm = confirmInput?.value;
        
        if (!name || !email || !password || !confirm) {
            this.showError(errorDiv, 'Please fill in all fields');
            return;
        }
        
        if (password.length < 6) {
            this.showError(errorDiv, 'Password must be at least 6 characters');
            return;
        }
        
        if (password !== confirm) {
            this.showError(errorDiv, 'Passwords do not match');
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';
        
        try {
            if (auth) {
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                await user.updateProfile({ displayName: name });
                await user.sendEmailVerification();
                
                this.userProfile = {
                    username: name,
                    email: email,
                    avatarUrl: null,
                    createdAt: new Date().toISOString(),
                    bio: '',
                    totalRatings: 0,
                    achievements: ['first_time']
                };
                
                await this.saveUserProfile(user.uid);
                
                this.currentUser = {
                    uid: user.uid,
                    email: user.email,
                    displayName: name,
                    emailVerified: user.emailVerified,
                    isDeveloper: false
                };
                
                this.saveUserSession();
                this.closeAuthModal();
                this.updateAuthUI();
                showNotification('Account created! Please check your email for verification.');
            } else {
                const storedUsers = JSON.parse(localStorage.getItem('sawfish_users') || '{}');
                
                if (storedUsers[email]) {
                    this.showError(errorDiv, 'An account with this email already exists');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Create Account';
                    return;
                }
                
                const uid = 'user_' + Date.now();
                storedUsers[email] = {
                    uid: uid,
                    username: name,
                    email: email,
                    password: password,
                    createdAt: new Date().toISOString(),
                    achievements: ['first_time']
                };
                localStorage.setItem('sawfish_users', JSON.stringify(storedUsers));
                
                this.currentUser = {
                    uid: uid,
                    email: email,
                    displayName: name,
                    isDeveloper: false
                };
                this.userProfile = {
                    username: name,
                    email: email,
                    achievements: ['first_time']
                };
                
                this.saveUserSession();
                this.closeAuthModal();
                this.updateAuthUI();
                showNotification('Account created! (Offline mode)');
            }
        } catch (error) {
            console.error('Signup error:', error);
            let errorMessage = 'Signup failed. Please try again.';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'An account with this email already exists';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password is too weak';
                    break;
            }
            
            this.showError(errorDiv, errorMessage);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account';
        }
    },
    
    handlePasswordReset: async function(event) {
        event.preventDefault();
        
        const emailInput = document.getElementById('reset-email');
        const errorDiv = document.getElementById('auth-error');
        const successDiv = document.getElementById('auth-success');
        const submitBtn = document.getElementById('reset-submit');
        
        const email = emailInput?.value.trim();
        
        if (!email) {
            this.showError(errorDiv, 'Please enter your email address');
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
        
        try {
            if (auth) {
                await auth.sendPasswordResetEmail(email);
                successDiv.textContent = `Password reset email sent to ${email}`;
                successDiv.classList.remove('hidden');
                errorDiv.classList.add('hidden');
                showNotification('Password reset email sent!');
            } else {
                this.showError(errorDiv, 'Authentication service unavailable');
            }
        } catch (error) {
            console.error('Password reset error:', error);
            let errorMessage = 'Failed to send reset email';
            
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email';
            }
            
            this.showError(errorDiv, errorMessage);
            successDiv.classList.add('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Reset Link';
        }
    },
    
    handleLogout: async function() {
        try {
            if (auth && this.currentUser && !this.isDeveloperMode) {
                await auth.signOut();
            }
            
            this.clearSession();
            this.closeProfileModal();
            this.updateAuthUI();
            
            if (DeveloperMode.isLoggedIn) {
                DeveloperMode.isLoggedIn = false;
                DeveloperMode.updateLoginButton();
                updateDevOnlyElements();
            }
            
            showNotification('Logged out successfully');
            switchTab('home');
        } catch (error) {
            console.error('Logout error:', error);
            showNotification('Logout failed');
        }
    },
    
    getOrCreateUserProfile: async function(user) {
        if (!db) return;
        
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            
            if (doc.exists) {
                this.userProfile = doc.data();
            } else {
                this.userProfile = {
                    username: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    avatarUrl: null,
                    createdAt: new Date().toISOString(),
                    bio: '',
                    totalRatings: 0,
                    achievements: ['first_time']
                };
                await this.saveUserProfile(user.uid);
            }
        } catch (error) {
            console.error('Error getting user profile:', error);
        }
    },
    
    saveUserProfile: async function(uid) {
        if (!db || !this.userProfile) return;
        
        try {
            await db.collection('users').doc(uid).set(this.userProfile, { merge: true });
        } catch (error) {
            console.error('Error saving user profile:', error);
        }
    },
    
    handleProfilePictureUpload: async function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const previewInitial = document.getElementById('upload-preview-initial');
        const previewImg = document.getElementById('upload-preview-img');
        
        if (!this.currentUser) {
            showNotification('Please log in to upload a profile picture');
            return;
        }
        
        try {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Data = e.target.result;
                
                this.userProfile = this.userProfile || {};
                this.userProfile.avatarUrl = base64Data;
                this.saveUserSession();
                
                if (previewInitial) {
                    previewInitial.textContent = '';
                    previewInitial.style.display = 'none';
                }
                if (previewImg) {
                    previewImg.src = base64Data;
                    previewImg.style.display = 'block';
                }
                
                this.updateProfileAvatar();
                
                const sidebarAvatar = document.getElementById('sidebar-avatar');
                if (sidebarAvatar) {
                    sidebarAvatar.innerHTML = `<img src="${base64Data}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
                }
                
                Achievements.checkAchievements('upload_avatar');
                
                if (db && this.currentUser) {
                    db.collection('users').doc(this.currentUser.uid).set({
                        avatarUrl: base64Data
                    }, { merge: true })
                    .then(() => {
                        console.log('Profile picture saved to Firestore');
                    })
                    .catch((error) => {
                        console.error('Error saving profile picture to Firestore:', error);
                    });
                }
                
                // Also save to localStorage for offline mode
                if (!db && this.currentUser && this.currentUser.email) {
                    const storedUsers = JSON.parse(localStorage.getItem('sawfish_users') || '{}');
                    if (storedUsers[this.currentUser.email]) {
                        storedUsers[this.currentUser.email].avatarUrl = base64Data;
                        localStorage.setItem('sawfish_users', JSON.stringify(storedUsers));
                    }
                }
                
                showNotification('Profile picture updated!');
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Upload error:', error);
            showNotification('Upload failed. Please try again.');
        }
    },
    
    getDefaultAvatar: function() {
        const username = this.userProfile?.username || 'User';
        const initial = username.charAt(0).toUpperCase();
        return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#4da3ff"/><text x="50" y="50" text-anchor="middle" dy="0.35em" fill="white" font-size="50" font-family="sans-serif">${initial}</text></svg>`)}`;
    },
    
    showError: function(errorDiv, message) {
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
            
            setTimeout(() => {
                errorDiv.classList.add('hidden');
            }, 5000);
        }
    },
    
    openAuthModal: function() {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
        }
    },
    
    closeAuthModal: function() {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
            
            const forms = modal.querySelectorAll('form');
            forms.forEach(f => f.reset());
            
            document.getElementById('login-form').style.display = 'block';
            document.getElementById('signup-form').style.display = 'none';
            document.getElementById('reset-form').style.display = 'none';
            
            const errorDiv = document.getElementById('auth-error');
            const successDiv = document.getElementById('auth-success');
            if (errorDiv) errorDiv.classList.add('hidden');
            if (successDiv) successDiv.classList.add('hidden');
            
            const authTabs = document.querySelectorAll('.auth-tab');
            authTabs.forEach((btn, index) => {
                btn.classList.toggle('active', index === 0);
            });
            
            const title = document.getElementById('auth-modal-title');
            if (title) title.textContent = 'Sign In';
        }
    },
    
    updateAuthUI: function() {
        const profileStatusText = document.getElementById('profile-status-text');
        const sidebarAvatar = document.getElementById('sidebar-avatar');
        
        if (this.currentUser) {
            const name = this.userProfile?.username || this.currentUser.displayName || 'User';
            
            if (profileStatusText) profileStatusText.textContent = name;
            
            if (this.userProfile?.avatarUrl) {
                if (sidebarAvatar) {
                    sidebarAvatar.innerHTML = `<img src="${this.userProfile.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
                }
            } else {
                const initial = name.charAt(0).toUpperCase();
                if (sidebarAvatar) {
                    sidebarAvatar.innerHTML = '';
                    sidebarAvatar.textContent = initial;
                }
            }
            
            const userProfileBtn = document.getElementById('user-profile-button');
            if (userProfileBtn) {
                userProfileBtn.classList.add('logged-in');
            }
        } else {
            if (profileStatusText) profileStatusText.textContent = 'Sign In';
            if (sidebarAvatar) {
                sidebarAvatar.innerHTML = '';
                sidebarAvatar.textContent = '?';
            }
            
            const userProfileBtn = document.getElementById('user-profile-button');
            if (userProfileBtn) {
                userProfileBtn.classList.remove('logged-in');
            }
        }
    },
    
    isLoggedIn: function() {
        return this.currentUser !== null;
    },
    
    canRate: function() {
        return this.isLoggedIn() || this.isDeveloperMode;
    },
    
    getReviewUsername: function() {
        if (this.isDeveloperMode) return 'Developer';
        return this.userProfile?.username || this.currentUser?.displayName || 'Anonymous';
    },
    
    getReviewAvatar: function() {
        if (this.isDeveloperMode) return null;
        return this.userProfile?.avatarUrl;
    },
    
    openUserProfile: function(userId) {
        this.loadUserProfileData(userId);
    },
    
    loadUserProfileData: async function(userId) {
        const modal = document.getElementById('user-profile-modal');
        if (!modal) return;
        
        const nameEl = document.getElementById('user-profile-name');
        const bioEl = document.getElementById('user-profile-bio');
        const avatarEl = document.getElementById('user-profile-avatar');
        const achievementsEl = document.getElementById('user-profile-achievements');
        const statsEl = document.getElementById('user-profile-stats');
        const memberSinceEl = document.getElementById('user-profile-member-since');
        
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        
        try {
            let userData;
            let achievements = [];
            let postCount = 0;
            
            if (db) {
                const userDoc = await db.collection('users').doc(userId).get();
                if (userDoc.exists) {
                    userData = userDoc.data();
                    achievements = userData.achievements || [];
                }
                
                // Get post count
                const postsSnapshot = await db.collection('sawfish_community_posts')
                    .where('author', '==', userData?.username || 'Unknown')
                    .get();
                postCount = postsSnapshot.size;
            } else {
                const storedUsers = JSON.parse(localStorage.getItem('sawfish_users') || '{}');
                for (const email in storedUsers) {
                    if (storedUsers[email].uid === userId) {
                        userData = storedUsers[email];
                        achievements = userData.achievements || [];
                        break;
                    }
                }
                
                // Get post count from localStorage
                const posts = JSON.parse(localStorage.getItem('sawfish_community_posts') || '[]');
                postCount = posts.filter(p => p.author === userData?.username).length;
            }
            
            // Update name
            if (nameEl) {
                nameEl.textContent = userData?.username || 'Unknown User';
            }
            
            // Update bio
            if (bioEl) {
                bioEl.textContent = userData?.bio || 'No bio yet';
                bioEl.style.display = userData?.bio ? 'block' : 'none';
            }
            
            // Update avatar
            if (avatarEl) {
                const initial = (userData?.username || 'U').charAt(0).toUpperCase();
                if (userData?.avatarUrl) {
                    avatarEl.innerHTML = `<img src="${userData.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
                } else {
                    avatarEl.textContent = initial;
                }
            }
            
            // Update achievements
            if (achievementsEl) {
                achievementsEl.innerHTML = '';
                achievements.forEach(achId => {
                    const ach = Achievements.getAchievementInfo(achId);
                    const badge = document.createElement('span');
                    badge.className = 'achievement-badge-circle';
                    badge.title = `${ach.name}: ${ach.description}`;
                    badge.innerHTML = ach.icon;
                    badge.dataset.achievementId = achId;
                    achievementsEl.appendChild(badge);
                });
                
                // Add click handlers for achievement details
                achievementsEl.querySelectorAll('.achievement-badge-circle').forEach(badge => {
                    badge.addEventListener('click', () => {
                        const achId = badge.dataset.achievementId;
                        const ach = Achievements.getAchievementInfo(achId);
                        showNotification(`${ach.icon} ${ach.name}: ${ach.description}`);
                    });
                });
            }
            
            // Update stats
            if (statsEl) {
                statsEl.innerHTML = `
                    <div class="stat-item">
                        <span class="stat-value">${achievements.length}</span>
                        <span class="stat-label">Achievements</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${postCount}</span>
                        <span class="stat-label">Posts</span>
                    </div>
                `;
            }
            
            // Update member since
            if (memberSinceEl && userData?.createdAt) {
                const createdDate = new Date(userData.createdAt);
                const now = new Date();
                const diffTime = Math.abs(now - createdDate);
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                const diffMonths = Math.floor(diffDays / 30);
                const diffYears = Math.floor(diffDays / 365);
                
                let timeAgo = '';
                if (diffYears > 0) {
                    timeAgo = `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
                } else if (diffMonths > 0) {
                    timeAgo = `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
                } else if (diffDays > 0) {
                    timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                } else {
                    timeAgo = 'Today';
                }
                
                memberSinceEl.innerHTML = `
                    <span class="member-since-label">Member since</span>
                    <span class="member-since-date">${createdDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    <span class="member-since-time">(${timeAgo})</span>
                `;
            }
            
        } catch (error) {
            console.error('Error loading user profile:', error);
            showNotification('Failed to load user profile');
        }
    }
};

// ============================================================
// ACHIEVEMENTS SYSTEM
// ============================================================
const Achievements = {
    ACHIEVEMENTS: {
        'first_time': {
            name: 'First Steps',
            icon: '👋',
            description: 'First time visiting Sawfish App Store'
        },
        'first_rating': {
            name: 'Critic',
            icon: '💬',
            description: 'Left your first rating'
        },
        'five_ratings': {
            name: 'Active Reviewer',
            icon: '⭐',
            description: 'Rated 5 apps'
        },
        'be_a_dev': {
            name: 'Developer',
            icon: '💻',
            description: 'Entered developer mode'
        },
        'has_profile_pic': {
            name: 'Face to Face',
            icon: '📸',
            description: 'Uploaded a profile picture'
        },
        'has_bio': {
            name: 'Storyteller',
            icon: '📝',
            description: 'Wrote a bio'
        },
        'social_butterfly': {
            name: 'Social Butterfly',
            icon: '🦋',
            description: 'Posted in the community board'
        },
        'started_petition': {
            name: 'Voice of Change',
            icon: '📢',
            description: 'Started a petition'
        },
        'resolved_petition': {
            name: 'Problem Solver',
            icon: '✅',
            description: 'Resolved a petition as developer'
        },
        'petition_success': {
            name: 'Champion',
            icon: '🏆',
            description: 'Had a petition successfully resolved'
        }
    },
    
    getAchievementInfo: function(achievementId) {
        return this.ACHIEVEMENTS[achievementId] || {
            name: 'Unknown',
            icon: '❓',
            description: 'Unknown achievement'
        };
    },
    
    awardAchievement: async function(userId, achievementId) {
        if (!this.ACHIEVEMENTS[achievementId]) {
            console.warn('Unknown achievement:', achievementId);
            return false;
        }
        
        try {
            if (db) {
                const userRef = db.collection('users').doc(userId);
                const doc = await userRef.get();
                
                if (doc.exists) {
                    const userData = doc.data();
                    const achievements = userData.achievements || [];
                    
                    if (!achievements.includes(achievementId)) {
                        achievements.push(achievementId);
                        await userRef.update({
                            achievements: achievements
                        });
                        console.log('Achievement awarded:', achievementId);
                        
                        const achievement = this.ACHIEVEMENTS[achievementId];
                        showNotification(`Achievement Unlocked: ${achievement.icon} ${achievement.name}`);
                        return true;
                    }
                }
            } else {
                const storedUsers = JSON.parse(localStorage.getItem('sawfish_users') || '{}');
                for (const email in storedUsers) {
                    if (storedUsers[email].uid === userId || userId === 'local_user') {
                        const achievements = storedUsers[email].achievements || [];
                        if (!achievements.includes(achievementId)) {
                            achievements.push(achievementId);
                            storedUsers[email].achievements = achievements;
                            localStorage.setItem('sawfish_users', JSON.stringify(storedUsers));
                            console.log('Achievement awarded (offline):', achievementId);
                            
                            const achievement = this.ACHIEVEMENTS[achievementId];
                            showNotification(`Achievement Unlocked: ${achievement.icon} ${achievement.name}`);
                            return true;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error awarding achievement:', error);
        }
        return false;
    },
    
    checkAchievements: async function(actionType, extraData = {}) {
        if (!UserAuth.currentUser && !UserAuth.isDeveloperMode) return;
        
        const userId = UserAuth.currentUser?.uid || 'developer';
        
        switch (actionType) {
            case 'submit_rating':
                this.awardAchievement(userId, 'first_rating');
                break;
            case 'be_a_dev':
                this.awardAchievement(userId, 'be_a_dev');
                break;
            case 'upload_avatar':
                this.awardAchievement(userId, 'has_profile_pic');
                break;
            case 'update_bio':
                if (extraData.bio && extraData.bio.length > 0) {
                    this.awardAchievement(userId, 'has_bio');
                }
                break;
            case 'community_post':
                this.awardAchievement(userId, 'social_butterfly');
                break;
            case 'start_petition':
                this.awardAchievement(userId, 'started_petition');
                break;
            case 'resolve_petition':
                this.awardAchievement(userId, 'resolved_petition');
                break;
            case 'petition_success':
                if (extraData.authorId) {
                    this.awardAchievement(extraData.authorId, 'petition_success');
                }
                break;
        }
    },
    
    getUserAchievements: async function(userId) {
        try {
            if (db) {
                const doc = await db.collection('users').doc(userId).get();
                if (doc.exists) {
                    return doc.data().achievements || [];
                }
            } else {
                const storedUsers = JSON.parse(localStorage.getItem('sawfish_users') || '{}');
                for (const email in storedUsers) {
                    if (storedUsers[email].uid === userId) {
                        return storedUsers[email].achievements || [];
                    }
                }
            }
        } catch (error) {
            console.error('Error getting user achievements:', error);
        }
        return [];
    },
    
    renderAchievementsBadges: function(achievements, container) {
        if (!container) return;
        
        container.innerHTML = '';
        
        achievements.forEach(achievementId => {
            const achievement = this.getAchievementInfo(achievementId);
            const badge = document.createElement('span');
            badge.className = 'achievement-badge-circle';
            badge.title = `${achievement.name}: ${achievement.description}`;
            badge.textContent = achievement.icon;
            container.appendChild(badge);
        });
    }
};

// ============================================================
// MINECRAFT RE-GUEST WARNING SYSTEM
// ============================================================
const MinecraftReGuest = {
    MINECRAFT_APP_ID: 'minecraft',
    
    requiresReGuest: function(appId) {
        return appId === this.MINECRAFT_APP_ID;
    },
    
    showWarning: function(appId, appName, appLink) {
        const overlay = document.getElementById('minecraft-warning-overlay');
        if (!overlay) return;
        
        const title = document.getElementById('minecraft-warning-title');
        const message = document.getElementById('minecraft-warning-message');
        const launchBtn = document.getElementById('minecraft-launch-btn');
        const cancelBtn = document.getElementById('minecraft-cancel-btn');
        
        if (title) title.textContent = `${appName} - Multiplayer Notice`;
        if (message) {
            message.innerHTML = `
                <p><strong>Multiplayer requires re-guesting to work properly.</strong></p>
                <p>To play multiplayer in ${appName}, you need to refresh/re-guest the game page.</p>
            `;
        }
        
        if (launchBtn) {
            launchBtn.onclick = () => {
                window.open(appLink, '_blank');
                this.closeWarning();
            };
        }
        
        if (cancelBtn) {
            cancelBtn.onclick = () => this.closeWarning();
        }
        
        overlay.classList.remove('hidden');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    },
    
    closeWarning: function() {
        const overlay = document.getElementById('minecraft-warning-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
    }
};

// ============================================================
// DEVELOPER MODE SYSTEM
// ============================================================
const DeveloperMode = {
    isLoggedIn: false,
    currentTab: 'dashboard',
    
    init: function() {
        this.updateLoginButton();
        this.setupNavigation();
    },
    
    updateLoginButton: function() {
        const loginBtn = document.getElementById('developer-login-button');
        if (loginBtn) {
            loginBtn.textContent = this.isLoggedIn ? 'Developer Dashboard' : 'Developer Login';
            loginBtn.classList.toggle('logged-in', this.isLoggedIn);
        }
    },
    
    setupNavigation: function() {
        // Navigation is handled in setupDeveloperDashboardListeners
    },
    
    toggleLogin: function() {
        if (this.isLoggedIn) {
            this.showDashboard();
        } else {
            this.openLoginModal();
        }
    },
    
    openLoginModal: function() {
        const modal = document.getElementById('developer-login-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
            document.getElementById('developer-password').focus();
        }
    },
    
    closeLoginModal: function() {
        const modal = document.getElementById('developer-login-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
        }
    },
    
    login: function(password) {
        if (password === this.constructor.prototype.DEVELOPER_PASSWORD || password === '120622') {
            this.isLoggedIn = true;
            this.updateLoginButton();
            this.closeLoginModal();
            this.showDashboard();
            updateDevOnlyElements();
            console.log('Developer mode activated');
            return true;
        }
        return false;
    },
    
    logout: function() {
        this.isLoggedIn = false;
        this.updateLoginButton();
        this.closeDashboard();
        updateDevOnlyElements();
        console.log('Developer mode deactivated');
        switchTab('home');
    },
    
    showDashboard: function() {
        const dashboard = document.getElementById('developer-dashboard');
        if (dashboard) {
            dashboard.classList.remove('hidden');
            dashboard.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }
    },
    
    closeDashboard: function() {
        const dashboard = document.getElementById('developer-dashboard');
        if (dashboard) {
            dashboard.classList.add('hidden');
            dashboard.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
    },
    
    showAddAppForm: function() {
        const formContainer = document.getElementById('developer-add-app-form');
        if (formContainer) {
            formContainer.classList.toggle('hidden');
        }
    },
    
    publishAnnouncement: function() {
        const announcementText = document.getElementById('developer-announcement-text').value.trim();
        const announcementPriority = document.getElementById('developer-announcement-priority').value;
        
        if (!announcementText) {
            showNotification('Please enter announcement text');
            return;
        }
        
        const announcement = {
            text: announcementText,
            priority: announcementPriority,
            timestamp: Date.now()
        };
        
        if (db) {
            db.collection('announcements').add(announcement)
                .then(() => {
                    showNotification('Announcement published!');
                    document.getElementById('developer-announcement-text').value = '';
                })
                .catch(error => {
                    console.error('Error publishing announcement:', error);
                    showNotification('Failed to publish announcement');
                });
        } else {
            // Offline fallback
            const announcements = JSON.parse(localStorage.getItem('sawfish_announcements') || '[]');
            announcements.unshift(announcement);
            localStorage.setItem('sawfish_announcements', JSON.stringify(announcements));
            showNotification('Announcement published (offline)!');
            document.getElementById('developer-announcement-text').value = '';
        }
    }
};

// ============================================================
// SEARCH SYSTEM
// ============================================================
const SearchSystem = {
    searchInput: null,
    resultsContainer: null,
    
    init: function() {
        this.searchInput = document.getElementById('search-input');
        this.resultsContainer = document.getElementById('search-results');
        
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
            this.searchInput.addEventListener('focus', () => {
                if (this.searchInput.value.trim()) {
                    this.handleSearch(this.searchInput.value);
                }
            });
        }
        
        // Setup filter buttons
        const filterBtns = document.querySelectorAll('.search-filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const filter = btn.dataset.filter;
                const query = this.searchInput?.value.trim() || '';
                this.handleSearch(query, filter);
            });
        });
    },
    
    handleSearch: function(query, forcedCategory = null) {
        if (!query && !forcedCategory) {
            this.resultsContainer.innerHTML = '';
            return;
        }
        
        const filterBtns = document.querySelectorAll('.search-filter-btn');
        const activeBtn = document.querySelector('.search-filter-btn.active');
        const category = forcedCategory || (activeBtn ? activeBtn.dataset.filter : 'all');
        
        let results = Object.entries(appData);
        
        // Apply category filter
        if (category && category !== 'all') {
            results = results.filter(([id, app]) => 
                app.category.toLowerCase().includes(category.toLowerCase())
            );
        }
        
        // Apply text search
        if (query) {
            const lowerQuery = query.toLowerCase();
            results = results.filter(([id, app]) => 
                app.name.toLowerCase().includes(lowerQuery) ||
                app.description.toLowerCase().includes(lowerQuery) ||
                app.developer.toLowerCase().includes(lowerQuery) ||
                app.category.toLowerCase().includes(lowerQuery)
            );
        }
        
        this.displayResults(results.slice(0, 20));
    },
    
    displayResults: function(results) {
        if (!this.resultsContainer) return;
        
        if (results.length === 0) {
            this.resultsContainer.innerHTML = '<p class="muted">No apps found matching your search.</p>';
            return;
        }
        
        this.resultsContainer.innerHTML = results.map(([id, app]) => {
            const isMinecraft = id === 'minecraft';
            const reguestTag = isMinecraft ? '<span class="re-guest-tag">Re-Guest Required</span>' : '';
            
            return `
                <article class="app-card" data-app="${id}">
                    <div class="card-icon">
                        <img src="${app.icon}" alt="${app.name} Icon" loading="lazy">
                    </div>
                    <div class="card-content">
                        <div class="card-header-row">
                            <h4>${app.name}</h4>
                            ${reguestTag}
                        </div>
                        <p class="card-developer">${app.developer}</p>
                        <p class="card-desc">${app.description.substring(0, 100)}${app.description.length > 100 ? '...' : ''}</p>
                        <span class="app-category">${app.category}</span>
                    </div>
                </article>
            `;
        }).join('');
        
        // Re-attach click handlers
        this.resultsContainer.querySelectorAll('.app-card').forEach(card => {
            card.addEventListener('click', () => {
                const appId = card.dataset.app;
                if (appId) {
                    openExpandedApp(appId);
                }
            });
        });
    }
};

// ============================================================
// UPDATE CHECKER
// ============================================================
const UpdateChecker = {
    init: function() {
        this.checkForUpdates();
    },
    
    checkForUpdates: function() {
        // Version checking can be implemented here
        // For now, just log that we're running the latest version
        console.log('Running version:', APP_VERSION);
    }
};

// ============================================================
// COMMUNITY BOARD
// ============================================================
const CommunityBoard = {
    POST_MAX_LENGTH: 1000,
    
    init: function() {
        this.setupPostForm();
        this.loadPosts();
        this.setupSearchListener();
    },
    
    setupPostForm: function() {
        const postForm = document.getElementById('community-post-form');
        if (postForm) {
            postForm.addEventListener('submit', (e) => this.handlePostSubmit(e));
        }
        
        const charCount = document.getElementById('post-char-count');
        const postText = document.getElementById('community-post-text');
        if (charCount && postText) {
            postText.addEventListener('input', () => {
                const length = postText.value.length;
                charCount.textContent = `${length}/${this.POST_MAX_LENGTH}`;
                charCount.style.color = length > this.POST_MAX_LENGTH ? '#ff4444' : '';
            });
        }
    },
    
    handlePostSubmit: async function(event) {
        event.preventDefault();
        
        const postText = document.getElementById('community-post-text');
        const isPetition = document.getElementById('community-post-petition').checked;
        
        if (!postText) return;
        
        const text = postText.value.trim();
        
        if (!text) {
            showNotification('Please enter a message');
            return;
        }
        
        if (text.length > this.POST_MAX_LENGTH) {
            showNotification(`Post is too long. Please reduce by ${text.length - this.POST_MAX_LENGTH} characters.`);
            return;
        }
        
        const userId = UserAuth.currentUser?.uid || 'anonymous';
        const username = UserAuth.getReviewUsername();
        const userAvatar = UserAuth.getReviewAvatar();
        
        const post = {
            text: text,
            author: username,
            authorId: userId,
            userAvatar: userAvatar,
            timestamp: Date.now(),
            likes: 0,
            likedBy: [],
            isPetition: isPetition,
            petitionSignatures: isPetition ? [username] : [],
            comments: []
        };
        
        try {
            if (db) {
                await db.collection('sawfish_community_posts').add(post);
            } else {
                // Offline mode - store in localStorage
                const posts = JSON.parse(localStorage.getItem('sawfish_community_posts') || '[]');
                post.id = 'local_' + Date.now();
                posts.unshift(post);
                localStorage.setItem('sawfish_community_posts', JSON.stringify(posts));
            }
            
            postText.value = '';
            document.getElementById('community-post-petition').checked = false;
            document.getElementById('post-char-count').textContent = `0/${this.POST_MAX_LENGTH}`;
            
            this.loadPosts();
            Achievements.checkAchievements(isPetition ? 'start_petition' : 'community_post');
            showNotification(isPetition ? 'Petition created!' : 'Post published!');
        } catch (error) {
            console.error('Error creating post:', error);
            showNotification('Failed to publish post');
        }
    },
    
    loadPosts: async function() {
        const postsContainer = document.getElementById('community-posts-container');
        if (!postsContainer) return;
        
        try {
            let posts = [];
            
            if (db) {
                const snapshot = await db.collection('sawfish_community_posts')
                    .orderBy('timestamp', 'desc')
                    .limit(50)
                    .get();
                posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } else {
                const storedPosts = JSON.parse(localStorage.getItem('sawfish_community_posts') || '[]');
                posts = storedPosts.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
            }
            
            this.displayPosts(posts, postsContainer);
        } catch (error) {
            console.error('Error loading posts:', error);
            postsContainer.innerHTML = '<p class="muted">Failed to load posts.</p>';
        }
    },
    
    displayPosts: function(posts, container) {
        if (posts.length === 0) {
            container.innerHTML = '<p class="muted">No posts yet. Be the first to share something!</p>';
            return;
        }
        
        container.innerHTML = posts.map(post => this.createPostHTML(post)).join('');
        
        // Attach event listeners
        container.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const postId = btn.dataset.postId;
                this.handleLike(postId);
            });
        });
        
        // Attach click handlers for petition signatures
        container.querySelectorAll('.sign-petition-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const postId = btn.dataset.postId;
                this.handleSignPetition(postId);
            });
        });
    },
    
    createPostHTML: function(post) {
        const date = new Date(post.timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const petitionBadge = post.isPetition ? '<span class="petition-badge">📢 Petition</span>' : '';
        const signatureCount = post.petitionSignatures?.length || 0;
        const signatureSection = post.isPetition ? 
            `<div class="petition-signatures">${signatureCount} signature${signatureCount !== 1 ? 's' : ''}</div>` : '';
        
        let avatarHtml = '';
        if (post.userAvatar) {
            avatarHtml = `<img src="${post.userAvatar}" alt="${post.author}" class="post-avatar-img">`;
        } else {
            avatarHtml = `<div class="post-avatar">${post.author.charAt(0).toUpperCase()}</div>`;
        }
        
        return `
            <article class="community-post" data-post-id="${post.id}">
                <div class="post-header">
                    <div class="post-author-info">
                        ${avatarHtml}
                        <div class="post-author-details">
                            <span class="post-author">${escapeHtml(post.author)}</span>
                            <span class="post-date">${date}</span>
                        </div>
                    </div>
                    ${petitionBadge}
                </div>
                <p class="post-text">${escapeHtml(post.text)}</p>
                ${signatureSection}
                <div class="post-actions">
                    <button class="like-btn" data-post-id="${post.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                        <span>${post.likes || 0}</span>
                    </button>
                    ${post.isPetition ? `
                        <button class="sign-petition-btn" data-post-id="${post.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                            <span>Sign</span>
                        </button>
                    ` : ''}
                </div>
            </article>
        `;
    },
    
    handleLike: function(postId) {
        const posts = JSON.parse(localStorage.getItem('sawfish_community_posts') || '[]');
        const postIndex = posts.findIndex(p => p.id === postId);
        
        if (postIndex !== -1) {
            const currentUser = UserAuth.currentUser?.uid || 'anonymous';
            
            if (!posts[postIndex].likedBy) {
                posts[postIndex].likedBy = [];
            }
            
            const alreadyLiked = posts[postIndex].likedBy.includes(currentUser);
            
            if (alreadyLiked) {
                posts[postIndex].likes = (posts[postIndex].likes || 1) - 1;
                posts[postIndex].likedBy = posts[postIndex].likedBy.filter(id => id !== currentUser);
                showNotification('Like removed');
            } else {
                posts[postIndex].likes = (posts[postIndex].likes || 0) + 1;
                posts[postIndex].likedBy.push(currentUser);
                showNotification('Post liked!');
            }
            
            localStorage.setItem('sawfish_community_posts', JSON.stringify(posts));
            this.loadPosts();
        }
    },
    
    handleSignPetition: function(postId) {
        const posts = JSON.parse(localStorage.getItem('sawfish_community_posts') || '[]');
        const postIndex = posts.findIndex(p => p.id === postId);
        
        if (postIndex !== -1) {
            const username = UserAuth.getReviewUsername();
            
            if (!posts[postIndex].petitionSignatures) {
                posts[postIndex].petitionSignatures = [];
            }
            
            const alreadySigned = posts[postIndex].petitionSignatures.includes(username);
            
            if (alreadySigned) {
                showNotification('You have already signed this petition');
            } else {
                posts[postIndex].petitionSignatures.push(username);
                showNotification('Petition signed!');
                Achievements.checkAchievements('community_post');
                this.loadPosts();
            }
            
            localStorage.setItem('sawfish_community_posts', JSON.stringify(posts));
        }
    },
    
    setupSearchListener: function() {
        const userSearchInput = document.getElementById('user-search-input');
        const userSearchResults = document.getElementById('user-search-results');
        
        if (userSearchInput && userSearchResults) {
            userSearchInput.addEventListener('input', async (e) => {
                const query = e.target.value.trim().toLowerCase();
                
                if (!query) {
                    userSearchResults.innerHTML = '';
                    return;
                }
                
                try {
                    let users = [];
                    
                    if (db) {
                        const snapshot = await db.collection('users')
                            .orderBy('username')
                            .startAt(query)
                            .endAt(query + '\uf8ff')
                            .limit(10)
                            .get();
                        users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    } else {
                        const storedUsers = JSON.parse(localStorage.getItem('sawfish_users') || '{}');
                        users = Object.values(storedUsers)
                            .filter(u => u.username.toLowerCase().includes(query))
                            .slice(0, 10);
                    }
                    
                    this.displayUserSearchResults(users, userSearchResults);
                } catch (error) {
                    console.error('Error searching users:', error);
                }
            });
            
            userSearchInput.addEventListener('focus', async () => {
                const query = userSearchInput.value.trim().toLowerCase();
                if (!query) {
                    try {
                        let users = [];
                        
                        if (db) {
                            const snapshot = await db.collection('users')
                                .orderBy('username')
                                .limit(20)
                                .get();
                            users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        } else {
                            const storedUsers = JSON.parse(localStorage.getItem('sawfish_users') || '{}');
                            users = Object.values(storedUsers).slice(0, 20);
                        }
                        
                        this.displayUserSearchResults(users, userSearchResults);
                    } catch (error) {
                        console.error('Error loading users:', error);
                    }
                }
            });
        }
    },
    
    displayUserSearchResults: function(users, container) {
        if (users.length === 0) {
            container.innerHTML = '<p class="muted">No users found.</p>';
            return;
        }
        
        container.innerHTML = users.map(user => {
            const initial = user.username ? user.username.charAt(0).toUpperCase() : '?';
            const achievements = user.achievements || [];
            
            return `
                <div class="user-search-result" data-user-id="${user.uid}" onclick="UserAuth.loadUserProfileData('${user.uid}')">
                    <div class="user-search-avatar">${initial}</div>
                    <div class="user-search-info">
                        <span class="user-search-name">${escapeHtml(user.username)}</span>
                        <span class="user-search-bio">${escapeHtml(user.bio || 'No bio')}</span>
                    </div>
                    <div class="user-search-achievements">
                        ${achievements.slice(0, 5).map(achId => {
                            const ach = Achievements.getAchievementInfo(achId);
                            return `<span title="${ach.name}">${ach.icon}</span>`;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }
};

// ============================================================
// LIKE SYSTEM
// ============================================================
const LikeSystem = {
    init: function() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.like-btn')) {
                // Already handled in CommunityBoard
            }
        });
    }
};

// ============================================================
// FIRESTORE COMMENTS SYSTEM
// ============================================================
const FirestoreComments = {
    COLLECTION: 'sawfish_ratings',
    
    saveReview: async function(appId, rating, comment, userName, isDeveloper, userAvatar) {
        try {
            const review = {
                appId: appId,
                rating: rating,
                comment: comment,
                user: userName,
                userAvatar: userAvatar,
                isDeveloper: isDeveloper,
                timestamp: Date.now()
            };
            
            if (db) {
                const docRef = await db.collection(this.COLLECTION).add(review);
                return { id: docRef.id, ...review };
            } else {
                // Offline fallback - store in localStorage
                const reviews = JSON.parse(localStorage.getItem('sawfish_ratings') || '[]');
                review.id = 'local_' + Date.now();
                reviews.unshift(review);
                localStorage.setItem('sawfish_ratings', JSON.stringify(reviews));
                return review;
            }
        } catch (error) {
            console.error('Error saving review:', error);
            return null;
        }
    },
    
    getReviews: async function(appId) {
        try {
            if (db) {
                const snapshot = await db.collection(this.COLLECTION)
                    .where('appId', '==', appId)
                    .orderBy('timestamp', 'desc')
                    .limit(50)
                    .get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } else {
                const reviews = JSON.parse(localStorage.getItem('sawfish_ratings') || '[]');
                return reviews
                    .filter(r => r.appId === appId)
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 50);
            }
        } catch (error) {
            console.error('Error getting reviews:', error);
            return [];
        }
    },
    
    subscribeToReviews: function(appId, callback) {
        if (!db) {
            // No real-time updates in offline mode
            return () => {};
        }
        
        return db.collection(this.COLLECTION)
            .where('appId', '==', appId)
            .orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
                const reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(reviews);
            }, error => {
                console.error('Error subscribing to reviews:', error);
            });
    },
    
    getAverageRating: async function(appId) {
        try {
            const reviews = await this.getReviews(appId);
            
            if (!reviews || reviews.length === 0) {
                return null;
            }
            
            const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0);
            return sum / reviews.length;
        } catch (error) {
            console.error('Error calculating average rating:', error);
            return null;
        }
    },
    
    getRatingDistribution: async function(appId) {
        try {
            const reviews = await this.getReviews(appId);
            
            const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
            
            reviews.forEach(review => {
                const rating = Math.round(review.rating || 0);
                if (rating >= 1 && rating <= 5) {
                    distribution[rating]++;
                }
            });
            
            return distribution;
        } catch (error) {
            console.error('Error getting rating distribution:', error);
            return { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        }
    },
    
    getTotalReviews: async function(appId) {
        try {
            const reviews = await this.getReviews(appId);
            return reviews.length;
        } catch (error) {
            console.error('Error getting total reviews:', error);
            return 0;
        }
    }
};

// ============================================================
// OFFLINE TAG SYSTEM
// ============================================================
const OfflineTagSystem = {
    hackPassword: '120622',
    
    showHackPassword: function(appId, appName) {
        const overlay = document.getElementById('hack-password-overlay');
        if (!overlay) return;
        
        const title = document.getElementById('hack-password-title');
        const input = document.getElementById('hack-password-input');
        const submitBtn = document.getElementById('hack-password-submit');
        const cancelBtn = document.getElementById('hack-password-cancel');
        
        if (title) title.textContent = `Hack ${appName}?`;
        if (input) input.value = '';
        
        const close = () => {
            overlay.classList.add('hidden');
            overlay.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        };
        
        if (submitBtn) {
            submitBtn.onclick = () => {
                if (input.value === this.hackPassword) {
                    close();
                    window.open(appData[appId].link, '_blank');
                } else {
                    input.value = '';
                    input.placeholder = 'Wrong password!';
                    input.classList.add('error');
                    setTimeout(() => {
                        input.placeholder = 'Enter password';
                        input.classList.remove('error');
                    }, 2000);
                }
            };
        }
        
        if (cancelBtn) {
            cancelBtn.onclick = close;
        }
        
        overlay.classList.remove('hidden');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        input?.focus();
    }
};

// ============================================================
// APP DATA
// ============================================================
const appData = {
    minecraft: {
        name: "Minecraft Web (Beta)",
        developer: "Zardoy",
        icon: "icons/minecraft.png",
        category: "Games / Sandbox",
        description: "The iconic sandbox building game, now in your browser. Build, explore, and create without downloads.",
        features: "Classic Minecraft gameplay, multiplayer support, various game modes.",
        additional: "Multiplayer requires re-guesting. See in-game instructions for details.",
        link: "https://zardoy.github.io/minecraft-web-client/",
        screenshots: ["https://via.placeholder.com/400x250/5c8a3d/ffffff?text=Minecraft+Gameplay", "https://via.placeholder.com/400x250/5c8a3d/ffffff?text=Minecraft+World"]
    },
    sandboxels: {
        name: "Sandboxels",
        developer: "R74n",
        icon: "icons/sandboxels.png",
        category: "Games / Simulation",
        description: "Falling sand physics simulator with over 500 elements. Create amazing sand art!",
        features: "500+ elements, realistic physics, cellular automata simulation.",
        additional: "A beloved falling sand game. Highly addictive and creative.",
        link: "https://the-sawfish.github.io/sandboxels/",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=Sandboxels+Simulation", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=Sand+Physics"]
    },
    run3: {
        name: "Run 3",
        developer: "Player 3",
        icon: "icons/run3.png",
        category: "Games / Platformer",
        description: "Endless space runner with gravity-shifting tunnel gameplay. Run through infinite tunnels!",
        features: "Gravity-shifting mechanics, endless gameplay, challenging obstacles.",
        additional: "A beloved space runner. One of the most popular browser games.",
        link: "https://the-sawfish.github.io/Run3Final/",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=Run+3+Gameplay", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=Space+Runner"]
    },
    blockblast: {
        name: "Block Blast",
        developer: "Block Blast",
        icon: "icons/blockblast.png",
        category: "Games / Puzzle",
        description: "Fast-paced block placement puzzle with competitive scoring. Match blocks to score high!",
        features: "Competitive scoring, challenging puzzles, smooth animations.",
        additional: "A highly addictive block puzzle game. Works offline!",
        link: "https://aappqq.github.io/BlockBlast",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=Block+Blast", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=Block+Puzzle"]
    },
    chat: {
        name: "Chat App",
        developer: "Jimeneutron",
        icon: "icons/chat.png",
        category: "Social / Messaging",
        description: "Real-time browser-based messaging with rooms and channels for students.",
        features: "Real-time messaging, rooms and channels, school-friendly.",
        additional: "Connect with classmates instantly. Works in browser.",
        link: "https://jimeneutron.github.io/chatapp/",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=Chat+App", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=Real+Time+Messaging"]
    },
    call: {
        name: "Call App",
        developer: "Sawfish",
        icon: "icons/call.png",
        category: "Social / Communication",
        description: "Fast, simple browser-based voice calling interface for quick communication.",
        features: "WebRTC voice calls, low latency, simple interface.",
        additional: "Call classmates directly from your browser. No app needed!",
        link: "https://the-sawfish.github.io/callapp",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=Call+App", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=Voice+Calling"]
    },
    retrobowl: {
        name: "Retro Bowl",
        developer: "Retro Studios",
        icon: "icons/retrobowl.png",
        category: "Games / Sports",
        description: "Classic American football management game with retro aesthetics and exciting gameplay.",
        features: "Team management, retro graphics, challenging gameplay.",
        additional: "The beloved American football game. Very popular!",
        link: "https://the-sawfish.github.io/seraph/games/retrobowl/index.html",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=Retro+Bowl", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=Football+Game"]
    },
    novaos: {
        name: "NovaOS",
        developer: "RunNova",
        icon: "icons/novaos.png",
        category: "Operating System",
        description: "Full-featured browser-based desktop operating system environment with apps and customization.",
        features: "Window management, file system, desktop apps, customization.",
        additional: "For the full NovaOS experience, open in a new tab. Amazing attention to detail!",
        link: "https://runnova.github.io/NovaOS/",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=NovaOS+Desktop", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=NovaOS+Apps"]
    },
    winripen: {
        name: "WinRipen",
        developer: "Ripenos",
        icon: "icons/winripen.png",
        category: "Operating System",
        description: "Windows-inspired web OS with familiar desktop interface and applications.",
        features: "Windows-like interface, window management, desktop apps.",
        additional: "Due to browser security restrictions, open in a new tab. Familiar Windows feel!",
        link: "https://ripenos.web.app/WinRipen/index.html",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=WinRipen+Interface", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=Windows+Apps"]
    },
    monkeytype: {
        name: "Monkeytype",
        developer: "Miodec",
        icon: "icons/monkeytype.png",
        category: "Educational / Typing",
        description: "Minimalist typing test with customizable themes and detailed statistics for improving speed.",
        features: "Customizable themes, difficulty levels, comprehensive statistics, zen mode.",
        additional: "Open source and completely ad-free. The best typing test!",
        link: "https://monkeytype.com/",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=Monkeytype+Interface", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=Typing+Statistics"]
    },
    hack: {
        name: "Hack Stuff",
        developer: "Sawfish",
        icon: "icons/hack.png",
        category: "Miscellaneous / Tools",
        description: "Utilities and experimental tools for advanced users. Educational purposes only.",
        features: "Password generator, cipher tools, hash generator, ASCII converter.",
        additional: "For educational purposes only. Learn about security and encryption!",
        link: "https://the-sawfish.github.io/hack/",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=Hack+Tools", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=Security+Tools"]
    },
    photopea: {
        name: "Photopea",
        developer: "Ivan Kuckir",
        icon: "icons/photopea.png",
        category: "Productivity / Graphics",
        description: "Powerful online image editor in your browser. Edit photos like a professional!",
        features: "Layer support, filters, brushes, vector shapes, PSD compatibility.",
        additional: "All processing happens in your browser for privacy. Like Photoshop, but free!",
        link: "https://www.photopea.com/",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=Photopea+Interface", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=Image+Editing"]
    },
    paperio2: {
        name: "Paper Io 2",
        developer: "Voodoo",
        icon: "icons/paperio2.png",
        category: "Games / Action",
        description: "Territory conquest game. Capture territory and defeat opponents in this addictive IO game!",
        features: "Territory capture mechanics, real-time multiplayer battles, power-ups.",
        additional: "A highly addictive territory conquest game. Capture as much territory as possible!",
        link: "https://the-sawfish.github.io/seraph/games/paperio2/index.html",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=Paper+IO+2", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=Territory+Capture"]
    },
    bobtherobber: {
        name: "Bob The Robber",
        developer: "Bob The Robber Team",
        icon: "icons/bobtherobber.png",
        category: "Games / Puzzle",
        description: "Stealth puzzle game series. Infiltrate locations and steal treasures without getting caught!",
        features: "Progressive level difficulty, stealth mechanics, puzzle elements.",
        additional: "A beloved stealth puzzle series. By like 10 ppl. :/)",
        link: "https://bobtherobberunblocked.github.io/2/",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=Bob+The+Robber", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=Stealth+Action"]
    },
    tinyfishing: {
        name: "Tiny Fishing",
        developer: "Ketchapp",
        icon: "icons/tinyfishing.png",
        category: "Games / Casual",
        description: "Addictive fishing game. Catch fish and upgrade your gear to catch bigger fish!",
        features: "Hook fish of various sizes, upgrade your fishing gear, relaxing gameplay.",
        additional: "A simple yet addictive fishing game. IKR??",
        link: "https://the-sawfish.github.io/seraph/games/tinyfishing",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=Tiny+Fishing", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=Fish+Collection"]
    },
    ovo: {
        name: "OVO",
        developer: "Maestro",
        icon: "icons/ovo.png",
        category: "Games / Platformer",
        description: "Fast-paced parkour game. Jump, slide, and wall-run through challenging obstacle courses!",
        features: "Smooth parkour mechanics, challenging obstacle courses, speedrun times.",
        additional: "A beloved parkour platformer with fluid movement controls. So satisfying!",
        link: "https://the-sawfish.github.io/legalizenuclearbombs5.github.io/games/ovo.html",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=OVO+Parkour", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=Obstacle+Course"]
    },
    towerofdestiny: {
        name: "Tower of Destiny",
        developer: "Sawfish",
        icon: "icons/towerofdestiny.png",
        category: "Games / Adventure",
        description: "Exciting adventure game where you build and ascend a tower while avoiding obstacles!",
        features: "Procedurally generated levels, hero upgrades, boss battles, addictive gameplay.",
        additional: "The tower keeps getting taller as you progress. mhm!",
        link: "https://the-sawfish.github.io/legalizenuclearbombs5.github.io/games/Tower%20of%20Destiny",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=Tower+of+Destiny", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=Ascend+the+Tower"]
    },
    lichess: {
        name: "Lichess",
        developer: "Lichess Team",
        icon: "icons/lichess.png",
        category: "Games / Strategy",
        description: "Free, open-source chess platform with no ads or tracking. Play against AI or worldwide!",
        features: "Multiple game modes, puzzles, tactics training, tournaments, analysis.",
        additional: "One of the least blocked chess sites on school networks. Completely free!",
        link: "https://lichess.org/",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=Lichess+Chess", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=Chess+Analysis"]
    },
    neocities: {
        name: "Neocities",
        developer: "Neocities Inc",
        icon: "icons/neocities.png",
        category: "Social / Web Publishing",
        description: "Free service for creating your own website. Express yourself on the web!",
        features: "Free hosting, site templates, drag-and-drop uploads, community.",
        additional: "Revives the spirit of early web publishing. Make your own website!",
        link: "https://neocities.org/",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=Neocities+Create", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=Website+Builder"]
    },
    drawacircle: {
        name: "Draw a Circle",
        developer: "Sawfish",
        icon: "icons/drawacircle.png",
        category: "Games / Skill",
        description: "Quick reflex challenge. Draw the most perfect circle you can and see how close you got!",
        features: "Circle drawing accuracy test, high scores, quick gameplay.",
        additional: "A simple but addictive skill game. How steady is your hand?",
        link: "https://the-sawfish.github.io/circle/",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=Draw+a+Circle", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=Circle+Accuracy"]
    },
    gameportal: {
        name: "Sawfish Game Portal",
        developer: "Sawfish",
        icon: "icons/gameportal.png",
        category: "Games / Collection",
        description: "Central hub for all approved browser games in one convenient location.",
        features: "Game collection, easy access, regular updates, user suggestions.",
        additional: "The ultimate browser game hub. New games added regularly!",
        link: "https://the-sawfish.github.io/game-portal/",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=Game+Portal", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=Game+Collection"]
    },
    piskel: {
        name: "Piskel",
        developer: "Piskel Team",
        icon: "icons/piskel.png",
        category: "Developer Tools / Graphics",
        description: "Free online editor for creating animated sprites and pixel art.",
        features: "Layers, color palettes, onion skinning, animation timeline.",
        additional: "Perfect for creating game assets and pixel art.",
        link: "https://www.piskelapp.com/",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=Piskel+Pixel+Editor", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=Animation+Timeline"]
    },
    vscodeweb: {
        name: "VS Code Web",
        developer: "Microsoft",
        icon: "icons/vscode.png",
        category: "Developer Tools / Code",
        description: "Visual Studio Code editor in your browser. Code anywhere, anytime!",
        features: "Syntax highlighting, IntelliSense, Git integration, extensions.",
        additional: "Requires a Microsoft account for full functionality. Powerful!",
        link: "https://vscode.dev/",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=VS+Code+Editor", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=Code+IntelliSense"]
    },
    shadertoy: {
        name: "ShaderToy",
        developer: "ShaderToy Team",
        icon: "icons/shadertoy.png",
        category: "Developer Tools / Graphics",
        description: "Platform for learning and sharing GLSL shaders. Create stunning visual effects!",
        features: "Powerful shader editor, thousands of example shaders, community.",
        additional: "Perfect for learning computer graphics programming. Advanced!",
        link: "https://www.shadertoy.com/",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=ShaderToy+Editor", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=GLSL+Shaders"]
    },
    tiddlywiki: {
        name: "TiddlyWiki",
        developer: "TiddlyWiki Community",
        icon: "icons/tiddlywiki.png",
        category: "Productivity / Notes",
        description: "Personal wiki and non-linear notebook for organizing thoughts and ideas.",
        features: "Powerful linking, tagging system, rich text editing, portable.",
        additional: "Completely self-contained in one HTML file. Very powerful!",
        link: "https://tiddlywiki.com/",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=TiddlyWiki+Notebook", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=Wiki+Organization"]
    },
    minimax: {
        name: "Minimax",
        developer: "Minimax",
        icon: "icons/minimax.png",
        category: "Developer Tools / AI",
        description: "Great AI for programming and general assistance. Much more instruction following than ChatGPT.",
        features: "Own window, can self-host static files, coding assistance.",
        additional: "Powerful AI assistant. Great for coding and general questions!",
        link: "https://agent.minimax.io/",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=Minimax+Agent", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=AI+Assistant"]
    },
    plutoos: {
        name: "PlutoOS",
        developer: "Zeon",
        icon: "icons/plutoos.png",
        category: "Operating System",
        description: "Futuristic vision of a web-based operating system with modern UI and smooth animations.",
        features: "Modular design, glass-morphism effects, smooth animations, modern UI.",
        additional: "An experimental project demonstrating cutting edge web computing. Futuristic!",
        link: "https://pluto-app.zeon.dev/",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=PlutoOS+Modern+UI", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=Fluid+Animations"]
    },
    ripenos: {
        name: "Ripenos",
        developer: "Ripenos",
        icon: "icons/ripenos.png",
        category: "Operating System",
        description: "Lightweight, modular web-based operating system framework.",
        features: "Essential desktop functionality, modular architecture, fast performance.",
        additional: "Suitable for educational environments with varied hardware. Lightweight!",
        link: "https://ripenos.web.app/Ripenos/",
        screenshots: ["https://via.placeholder.com/400x250/4da3ff/ffffff?text=Ripenos+Desktop", "https://via.placeholder.com/400x250/4da3ff/ffffff?text=Modular+Apps"]
    },
    securecomms: {
        name: "Secure Communication",
        developer: "Jimeneutron",
        icon: "icons/IMG_0636.jpeg",
        category: "Miscellaneous / Tools",
        description: "Encrypt and decrypt messages securely. Learn about encryption and data security.",
        features: "AES-256 encryption, message encoding, key generation.",
        additional: "Learn about encryption and data security. Educational!",
        link: "https://jimeneutron.github.io/SecureCommunication/",
        screenshots: ["icons/IMG_0634.jpeg", "icons/IMG_0635.jpeg"]
    },
    2048: {
        name: "2048",
        developer: "Gabriele Cirulli",
        icon: "icons/2048.png",
        category: "Games / Puzzle",
        description: "Classic number puzzle game. Combine tiles to reach 2048!",
        features: "Simple swipe controls, score tracking, undo functionality.",
        additional: "One of the most popular puzzle games of all time. Addictive!",
        link: "https://the-sawfish.github.io/seraph/games/2048/",
        screenshots: ["https://via.placeholder.com/400x250/1a1a2e/4da3ff?text=2048+Game+Board", "https://via.placeholder.com/400x250/1a1a2e/4da3ff?text=2048+Win+Screen"]
    },
    hackernews: {
        name: "Hacker News",
        developer: "Y Combinator",
        icon: "icons/hackernews.png",
        category: "News / Technology",
        description: "Social news website focusing on computer science and technology.",
        features: "User-submitted stories, threaded comments, karma points.",
        additional: "One of the best sources for technology news. Tech-focused!",
        link: "https://news.ycombinator.com/",
        screenshots: ["https://via.placeholder.com/400x250/1a1a2e/4da3ff?text=Hacker+News+Front+Page", "https://via.placeholder.com/400x250/1a1a2e/4da3ff?text=Tech+Discussions"]
    },
    syrup: {
        name: "Syrup Games",
        developer: "Syrup Games",
        icon: "icons/syrup.png",
        category: "Games / Arcade",
        description: "Alternative game launcher with unique browser-based titles.",
        features: "Collection of indie games, daily challenges, leaderboards.",
        additional: "Discover unique indie games you won't find anywhere else. Unique!",
        link: "https://jimeneutron.github.io",
        screenshots: ["https://via.placeholder.com/400x250/1a1a2e/4da3ff?text=Syrup+Games+Launcher", "https://via.placeholder.com/400x250/1a1a2e/4da3ff?text=Indie+Games"]
    },
    hextris: {
        name: "Hextris",
        developer: "Hextris",
        icon: "icons/hextris.png",
        category: "Games / Puzzle",
        description: "Addictive puzzle game played on a hexagonal grid. Twist and turn to survive!",
        features: "Fast-paced gameplay, score tracking, increasing difficulty.",
        additional: "A unique twist on the classic tetris-style gameplay. Challenging!",
        link: "https://codechefvit.github.io/DevTris/",
        screenshots: ["https://via.placeholder.com/400x250/1a1a2e/4da3ff?text=Hextris+Gameplay", "https://via.placeholder.com/400x250/1a1a2e/4da3ff?text=Hexagonal+Puzzle"]
    },
    snowrider3d: {
        name: "Snow Rider 3D",
        developer: "Sawfish",
        icon: "icons/snowrider.png",
        category: "Games / Arcade",
        description: "Thrilling sled racing game with 3D graphics and obstacles. Avoid trees and collect gifts!",
        features: "3D graphics, obstacle avoidance, gifts and power-ups, festive theme.",
        additional: "A classic school-friendly game. Works offline once loaded!",
        link: "https://the-sawfish.github.io/Snow-Rider3D/",
        screenshots: ["https://via.placeholder.com/400x250/1a1a2e/4da3ff?text=Snow+Rider+3D", "https://via.placeholder.com/400x250/1a1a2e/4da3ff?text=Sled+Racing"]
    },
    investopedia: {
        name: "Investopedia Simulator",
        developer: "Investopedia",
        icon: "icons/investopedia.png",
        category: "Educational / Finance",
        description: "Learn stock market trading with virtual currency. Practice investing risk-free!",
        features: "Real-time market data simulation, portfolio tracking, trading strategies.",
        additional: "Perfect for learning trading strategies without risking real money. Educational!",
        link: "http://investopedia.com/simulator",
        screenshots: ["https://via.placeholder.com/400x250/1a1a2e/4da3ff?text=Investopedia+Simulator", "https://via.placeholder.com/400x250/1a1a2e/4da3ff?text=Stock+Trading"]
    },
    studentgrade: {
        name: "Student Grade Viewer",
        developer: "Sawfish",
        icon: "icons/studentgrade.png",
        category: "Productivity / Education",
        description: "Track and view student grades and academic performance. Monitor your progress!",
        features: "Grade tracking, GPA calculation, assignment management, progress charts.",
        additional: "Designed for students to monitor their academic progress. Helpful!",
        link: "http://pa.neonet.org/Student/Grade",
        screenshots: ["https://via.placeholder.com/400x250/1a1a2e/4da3ff?text=Student+Grade+Viewer", "https://via.placeholder.com/400x250/1a1a2e/4da3ff?text=Grade+Tracking"]
    },
    chilibowl: {
        name: "Chilibowl Flash",
        developer: "Sawfish",
        icon: "icons/chilibowl.png",
        category: "Games / Arcade",
        description: "Classic flash game featuring chili pepper challenges. Eat chilies to grow!",
        features: "Classic gameplay, multiple levels, time attack mode, high scores.",
        additional: "Nostalgic flash gaming experience. A classic!",
        link: "https://the-sawfish.github.io/chilibowlflash/",
        screenshots: ["https://via.placeholder.com/400x250/1a1a2e/4da3ff?text=Chilibowl+Flash", "https://via.placeholder.com/400x250/1a1a2e/4da3ff?text=Chili+Challenge"]
    },
    territorial: {
        name: "Territorial.io",
        developer: "Territorial Team",
        icon: "icons/territorial.png",
        category: "Games / Strategy",
        description: "Strategic territory conquest game with real-time battles. Conquer the map!",
        features: "Territory expansion, unit management, real-time multiplayer, strategy.",
        additional: "A highly strategic conquest game. Think tactically!",
        link: "https://the-sawfish.github.io/seraph/games/slope/index.html",
        screenshots: ["https://via.placeholder.com/400x250/1a1a2e/4da3ff?text=Territorial.io", "https://via.placeholder.com/400x250/1a1a2e/4da3ff?text=Territory+Conquest"]
    },
    slope: {
        name: "Slope",
        developer: "Sawfish",
        icon: "icons/slope.png",
        category: "Games / Arcade",
        description: "Fast-paced ball rolling game through an endless slope. Avoid obstacles and survive!",
        features: "Endless runner mechanics, obstacle avoidance, high scores, simple controls.",
        additional: "A thrilling test of reflexes and timing. Addictive!",
        link: "https://the-sawfish.github.io/seraph/games/slope/index.html",
        screenshots: ["https://via.placeholder.com/400x250/1a1a2e/4da3ff?text=Slope+Game", "https://via.placeholder.com/400x250/1a1a2e/4da3ff?text=Ball+Rolling"]
    },
    agentminimax: {
        name: "Agent Minimax",
        developer: "MiniMax",
        icon: "icons/agentminimax.png",
        category: "Productivity / AI Tools",
        description: "AI-powered task management and automation assistant. Boost your productivity!",
        features: "Smart scheduling, task prioritization, workflow automation, AI assistance.",
        additional: "Boost your productivity with AI assistance. Powerful!",
        link: "https://agent.minimax.io/",
        screenshots: ["https://via.placeholder.com/400x250/1a1a2e/4da3ff?text=Agent+Minimax", "https://via.placeholder.com/400x250/1a1a2e/4da3ff?text=AI+Assistant"],
        isDev: true
    },
    githubio: {
        name: "GitHub.io",
        developer: "GitHub",
        icon: "icons/githubio.png",
        category: "Productivity / Web Publishing",
        description: "Free static web hosting for GitHub repositories. Deploy your sites easily!",
        features: "Free hosting, custom domains, HTTPS support, easy deployment.",
        additional: "Deploy static sites directly from your repositories. Convenient!",
        link: "https://github.io",
        screenshots: ["https://via.placeholder.com/400x250/1a1a2e/4da3ff?text=GitHub+Pages", "https://via.placeholder.com/400x250/1a1a2e/4da3ff?text=Static+Hosting"],
        isDev: true
    }
};

// ============================================================
// APP STATE
// ============================================================
const AppState = {
    isPWA: false,
    isFirstVisit: true,
    currentPage: 'home',
    expandedApp: null,
    reviewSubscriptions: {}
};

// ============================================================
// DOM ELEMENTS
// ============================================================
const elements = {
    installScreen: null,
    appScreen: null,
    tabButtons: null,
    navItems: null,
    sidebar: null,
    pages: null,
    expandedOverlay: null,
    expandedContentWrapper: null,
    expandedCloseBtn: null,
    welcomeModal: null,
    welcomeScrollContent: null,
    welcomeReturningContent: null,
    welcomeAck: null,
    welcomeAckRow: null,
    welcomeContinue: null,
    pwaBanner: null,
    updateStatus: null,
    updateAction: null,
    ratingDisplays: null
};

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    initializeElements();
    detectPWA();
    setupEventListeners();
    loadAllRatings();
    checkFirstVisit();
    removeLoadingClass();
    
    console.log('Initializing UserAuth...');
    UserAuth.init();
    console.log('Initializing DeveloperMode...');
    DeveloperMode.init();
    console.log('Initializing SearchSystem...');
    SearchSystem.init();
    console.log('Initializing UpdateChecker...');
    UpdateChecker.init();
    console.log('Initializing CommunityBoard...');
    CommunityBoard.init();
    console.log('Initializing LikeSystem...');
    LikeSystem.init();
    
    console.log('Sawfish App Store initialized');
});

function initializeElements() {
    elements.installScreen = document.querySelector('[data-screen="install"]');
    elements.appScreen = document.querySelector('[data-screen="app"]');
    elements.tabButtons = document.querySelectorAll('[data-tab]');
    elements.navItems = document.querySelectorAll('.nav-item');
    elements.sidebar = document.getElementById('sidebar-nav');
    elements.pages = document.querySelectorAll('.page');
    elements.expandedOverlay = document.getElementById('expanded-overlay');
    elements.expandedContentWrapper = document.getElementById('expanded-content-wrapper');
    elements.expandedCloseBtn = document.querySelector('.expanded-close-btn');
    elements.welcomeModal = document.getElementById('welcome-modal');
    elements.welcomeScrollContent = document.getElementById('modal-scroll-content');
    elements.welcomeReturningContent = document.getElementById('modal-returning-content');
    elements.welcomeAck = document.getElementById('welcome-ack');
    elements.welcomeAckRow = document.getElementById('ack-checkbox-row');
    elements.welcomeContinue = document.getElementById('welcome-continue');
    elements.pwaBanner = document.getElementById('pwa-banner');
    elements.updateStatus = document.getElementById('update-status');
    elements.updateAction = document.getElementById('update-action');
    elements.ratingDisplays = document.querySelectorAll('[data-avg-rating]');
}

function detectPWA() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isStandaloneiOS = window.navigator.standalone === true;
    const isAndroidApp = document.referrer.includes('android-app://');
    
    AppState.isPWA = isStandalone || isStandaloneiOS || isAndroidApp;
    
    if (AppState.isPWA) {
        elements.installScreen?.classList.add('hidden');
        elements.installScreen?.classList.remove('visible');
        elements.appScreen?.classList.remove('hidden');
        elements.appScreen?.classList.add('visible');
        elements.pwaBanner?.removeAttribute('aria-hidden');
    } else {
        elements.installScreen?.classList.add('visible');
        elements.installScreen?.classList.remove('hidden');
        elements.appScreen?.classList.add('hidden');
        elements.appScreen?.classList.remove('visible');
        elements.pwaBanner?.setAttribute('aria-hidden', 'true');
    }
    
    console.log('PWA Mode:', AppState.isPWA);
}

function removeLoadingClass() {
    document.documentElement.classList.remove('loading');
    document.documentElement.classList.add('loaded');
}

function checkFirstVisit() {
    const hasVisited = localStorage.getItem('sawfish_visited');
    
    if (hasVisited) {
        AppState.isFirstVisit = false;
    } else {
        AppState.isFirstVisit = true;
        localStorage.setItem('sawfish_visited', 'true');
        
        setTimeout(() => {
            showWelcomeModal(true);
        }, 1000);
    }
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function setupEventListeners() {
    setupNavigationListeners();
    setupCardListeners();
    setupExpandedViewListeners();
    setupWelcomeModalListeners();
    setupPWABannerListeners();
    setupCategoryTabListeners();
    setupServiceWorkerListeners();
    setupDeveloperDashboardListeners();
    setupAuthModalListeners();
    setupOfflineTagListeners();
    setupMinecraftWarningListeners();
    
    window.matchMedia('(display-mode: standalone)').addEventListener('change', function(e) {
        AppState.isPWA = e.matches;
        location.reload();
    });
}

function setupNavigationListeners() {
    elements.tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tab = this.dataset.tab;
            switchTab(tab);
        });
    });
    
    elements.navItems.forEach(item => {
        item.addEventListener('click', function() {
            const tab = this.dataset.tab;
            switchTab(tab);
        });
    });
}

function setupCardListeners() {
    const cards = document.querySelectorAll('.app-card');
    
    cards.forEach(card => {
        card.addEventListener('click', function() {
            const appId = this.dataset.app;
            if (appId) {
                openExpandedApp(appId);
            }
        });
        
        card.setAttribute('tabindex', '0');
        card.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const appId = this.dataset.app;
                if (appId) {
                    openExpandedApp(appId);
                }
            }
        });
    });
}

function setupExpandedViewListeners() {
    elements.expandedCloseBtn?.addEventListener('click', closeExpandedApp);
    
    const backdrop = elements.expandedOverlay?.querySelector('.expanded-backdrop');
    backdrop?.addEventListener('click', closeExpandedApp);
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !elements.expandedOverlay.classList.contains('hidden')) {
            closeExpandedApp();
        }
    });
}

function setupWelcomeModalListeners() {
    const scrollContent = elements.welcomeScrollContent;
    if (scrollContent) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) {
                    const continueBtn = elements.welcomeContinue;
                    if (continueBtn) {
                        continueBtn.disabled = false;
                    }
                }
            });
        }, { threshold: 0.1 });
        
        const scrollIndicator = scrollContent.querySelector('.scroll-indicator');
        if (scrollIndicator) {
            observer.observe(scrollIndicator);
        }
    }
    
    elements.welcomeAck?.addEventListener('change', function() {
        elements.welcomeContinue.disabled = !this.checked;
    });
    
    elements.welcomeContinue?.addEventListener('click', function() {
        closeWelcomeModal();
    });
}

function setupPWABannerListeners() {
    elements.updateAction?.addEventListener('click', function() {
        updateApp();
    });
}

function setupCategoryTabListeners() {
    const categoryTabs = document.querySelectorAll('.category-tab');
    
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const category = this.dataset.category;
            
            categoryTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            filterGameCards(category);
        });
    });
}

function setupServiceWorkerListeners() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(function(registration) {
            updateAppStatus('ready');
            
            registration.addEventListener('updatefound', function() {
                updateAppStatus('update');
            });
        });
    }
}

function setupDeveloperDashboardListeners() {
    const closeBtn = document.getElementById('developer-close-dashboard');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            DeveloperMode.logout();
        });
    }
    
    const navBtns = document.querySelectorAll('.developer-nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.developerTab;
            switchDeveloperTab(tab);
        });
    });
    
    const addAppBtn = document.getElementById('add-new-app-btn');
    if (addAppBtn) {
        addAppBtn.addEventListener('click', () => DeveloperMode.showAddAppForm());
    }
    
    const publishBtn = document.getElementById('publish-announcement');
    if (publishBtn) {
        publishBtn.addEventListener('click', () => DeveloperMode.publishAnnouncement());
    }
    
    const devLoginBtn = document.getElementById('developer-login-button');
    if (devLoginBtn) {
        devLoginBtn.addEventListener('click', () => DeveloperMode.toggleLogin());
    }
    
    const devCancelBtn = document.getElementById('developer-cancel');
    if (devCancelBtn) {
        devCancelBtn.addEventListener('click', () => DeveloperMode.closeLoginModal());
    }
    
    const devSubmitBtn = document.getElementById('developer-submit');
    if (devSubmitBtn) {
        devSubmitBtn.addEventListener('click', () => {
            const passwordInput = document.getElementById('developer-password');
            if (passwordInput) {
                const success = DeveloperMode.login(passwordInput.value);
                if (!success) {
                    showNotification('Invalid developer password');
                    passwordInput.value = '';
                }
            }
        });
    }
    
    const exitDevBtn = document.getElementById('exit-developer-mode');
    if (exitDevBtn) {
        exitDevBtn.addEventListener('click', () => {
            DeveloperMode.logout();
        });
    }
    
    const devModal = document.getElementById('developer-login-modal');
    if (devModal) {
        const backdrop = devModal.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => DeveloperMode.closeLoginModal());
        }
    }
    
    const devPasswordInput = document.getElementById('developer-password');
    if (devPasswordInput) {
        devPasswordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const success = DeveloperMode.login(devPasswordInput.value);
                if (!success) {
                    showNotification('Invalid developer password');
                    devPasswordInput.value = '';
                }
            }
        });
    }
}

function setupAuthModalListeners() {
    // Already handled in UserAuth.setupAuthListeners()
}

function setupOfflineTagListeners() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('offline-tag')) {
            e.stopPropagation();
            const appId = e.target.dataset.app;
            const app = appData[appId];
            if (app) {
                OfflineTagSystem.showHackPassword(appId, app.name);
            }
        }
    });
    
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('offline-tag')) {
            e.stopPropagation();
        }
    });
}

function setupMinecraftWarningListeners() {
    const cancelBtn = document.getElementById('minecraft-cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => MinecraftReGuest.closeWarning());
    }
    
    const overlay = document.getElementById('minecraft-warning-overlay');
    if (overlay) {
        const backdrop = overlay.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => MinecraftReGuest.closeWarning());
        }
    }
}

// ============================================================
// NAVIGATION FUNCTIONS
// ============================================================
function switchTab(tabName) {
    elements.navItems.forEach(item => {
        if (item.dataset.tab === tabName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    elements.tabButtons.forEach(button => {
        if (button.dataset.tab === tabName) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    elements.pages.forEach(page => {
        if (page.dataset.page === tabName) {
            page.classList.add('visible');
        } else {
            page.classList.remove('visible');
        }
    });
    
    AppState.currentPage = tabName;
    
    if (window.innerWidth <= 768) {
        elements.sidebar?.classList.remove('open');
    }
}

function scrollToSection(sectionId) {
    const section = document.querySelector(`[data-page="${sectionId}"]`);
    if (section) {
        switchTab(sectionId);
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

function switchDeveloperTab(tabName) {
    const navBtns = document.querySelectorAll('.developer-nav-btn');
    navBtns.forEach(btn => {
        if (btn.dataset.developerTab === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    const contents = document.querySelectorAll('.developer-tab-content');
    contents.forEach(content => {
        if (content.dataset.developerContent === tabName) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

// ============================================================
// EXPANDED APP VIEW
// ============================================================
function openExpandedApp(appId) {
    const app = appData[appId];
    if (!app) {
        console.error('App not found:', appId);
        return;
    }
    
    AppState.expandedApp = appId;
    
    if (appId === 'minecraft') {
        MinecraftReGuest.showWarning(appId, app.name, app.link);
        return;
    }
    
    const content = buildExpandedContent(app, appId, 0, 0, {5:0,4:0,3:0,2:0,1:0});
    elements.expandedContentWrapper.innerHTML = content;
    
    elements.expandedOverlay.classList.remove('hidden');
    elements.expandedOverlay.setAttribute('aria-hidden', 'false');
    
    document.body.style.overflow = 'hidden';
    
    loadAppRatings(appId);
    
    setupRatingForm(appId);
    
    subscribeToAppReviews(appId);
}

async function loadAppRatings(appId) {
    try {
        const [avgRating, distribution, totalReviews] = await Promise.all([
            FirestoreComments.getAverageRating(appId),
            FirestoreComments.getRatingDistribution(appId),
            FirestoreComments.getTotalReviews(appId)
        ]);
        
        updateRatingDisplay(appId, avgRating, distribution, totalReviews);
        
        loadReviews(appId);
        
        const displayElement = document.querySelector(`[data-avg-rating="${appId}"]`);
        
        if (displayElement) {
            if (avgRating === null || avgRating === undefined) {
                displayElement.innerHTML = '<span class="rating-na">—</span>';
            } else {
                displayElement.innerHTML = getNumericRatingDisplay(avgRating);
            }
        }
    } catch (error) {
        console.error('Error loading ratings:', error);
    }
}

function updateRatingDisplay(appId, avgRating, distribution, totalReviews) {
    const bigRating = document.querySelector(`#expanded-overlay .rating-big`);
    const ratingCount = document.querySelector(`#expanded-overlay .rating-count`);
    
    if (bigRating) {
        if (avgRating === null || avgRating === undefined) {
            bigRating.innerHTML = '<span class="rating-na">—</span>';
            bigRating.classList.add('na-rating');
        } else {
            bigRating.innerHTML = getNumericRatingDisplay(avgRating);
            bigRating.classList.remove('na-rating');
        }
    }
    
    if (ratingCount) {
        ratingCount.textContent = `${totalReviews} reviews`;
    }
    
    const ratingBarsContainer = document.querySelector(`#expanded-overlay .rating-bars`);
    if (ratingBarsContainer) {
        ratingBarsContainer.innerHTML = buildRatingBars(distribution, totalReviews);
    }
}

function buildExpandedContent(app, appId, avgRating, totalReviews, distribution) {
    return `
        <article class="expanded-app" data-app="${appId}">
            <header class="expanded-app-header">
                <div class="expanded-app-icon">
                    <img src="${app.icon}" alt="${app.name} Icon">
                </div>
                <div class="expanded-app-info">
                    <h2>${app.name}</h2>
                    <p class="expanded-developer">By ${app.developer}</p>
                    <div class="expanded-app-meta">
                        <span class="app-category">${app.category}</span>
                    </div>
                </div>
            </header>
            
            <section class="expanded-summary">
                <p>${app.description}</p>
            </section>
            
            <section class="expanded-description">
                <h3>About This App</h3>
                <p>${app.features}</p>
                <p>${app.additional}</p>
            </section>
            
            <section class="expanded-screenshots">
                <h3>Screenshots</h3>
                <div class="screenshot-gallery">
                    <div class="screenshot-item">
                        <img src="${app.screenshots[0]}" alt="${app.name} Screenshot 1" loading="lazy">
                    </div>
                    <div class="screenshot-item">
                        <img src="${app.screenshots[1]}" alt="${app.name} Screenshot 2" loading="lazy">
                    </div>
                </div>
            </section>
            
            <section class="expanded-actions">
                <a href="${app.link}" target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    Open App
                </a>
            </section>
            
            <section class="expanded-ratings">
                <div class="ratings-header">
                    <h3>Ratings & Reviews</h3>
                </div>
                <div class="rating-stats">
                    <div class="rating-big">${avgRating !== null && avgRating !== undefined ? getNumericRatingDisplay(avgRating) : '<span class="rating-na">—</span>'}</div>
                    <div class="rating-details">
                        <div class="rating-count">${totalReviews} reviews</div>
                    </div>
                </div>
                <div class="rating-bars">
                    ${buildRatingBars(distribution, totalReviews)}
                </div>
            </section>
            
            <section class="expanded-comments">
                <h3>User Reviews</h3>
                <div class="comment-list" id="comment-list-${appId}">
                    <p class="muted">Loading reviews...</p>
                </div>
                
                <form class="comment-form" id="comment-form-${appId}">
                    <h4>Write a Review</h4>
                    <div class="form-group">
                        <label>Your Rating</label>
                        <div class="rating-input" id="rating-input-${appId}">
                            <button type="button" class="rating-num-btn" data-value="1">1</button>
                            <button type="button" class="rating-num-btn" data-value="2">2</button>
                            <button type="button" class="rating-num-btn" data-value="3">3</button>
                            <button type="button" class="rating-num-btn" data-value="4">4</button>
                            <button type="button" class="rating-num-btn" data-value="5">5</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="comment-input-${appId}">Your Review</label>
                        <textarea id="comment-input-${appId}" placeholder="Share your experience with this app..."></textarea>
                    </div>
                    <button type="submit" id="submit-review-${appId}">Submit Review</button>
                </form>
            </section>
        </article>
    `;
}

function buildRatingBars(distribution, total) {
    if (total === 0) {
        return '<p class="muted">No ratings yet. Be the first to rate!</p>';
    }
    
    let bars = '';
    for (let i = 5; i >= 1; i--) {
        const count = distribution[i] || 0;
        const percentage = total > 0 ? (count / total) * 100 : 0;
        bars += `
            <div class="rating-bar-row">
                <span class="rating-bar-label">${i}</span>
                <div class="rating-bar-track">
                    <div class="rating-bar-fill" style="width: ${percentage}%"></div>
                </div>
                <span class="rating-bar-count">${count}</span>
            </div>
        `;
    }
    return bars;
}

function closeExpandedApp() {
    if (AppState.expandedApp && AppState.reviewSubscriptions[AppState.expandedApp]) {
        AppState.reviewSubscriptions[AppState.expandedApp]();
        delete AppState.reviewSubscriptions[AppState.expandedApp];
    }
    
    elements.expandedOverlay.classList.add('hidden');
    elements.expandedOverlay.setAttribute('aria-hidden', 'true');
    AppState.expandedApp = null;
    
    document.body.style.overflow = '';
}

// ============================================================
// RATINGS AND REVIEWS
// ============================================================
function setupRatingForm(appId) {
    const form = document.getElementById(`comment-form-${appId}`);
    const ratingBtns = form?.querySelectorAll('.rating-num-btn');
    let selectedRating = 0;
    
    ratingBtns?.forEach(btn => {
        btn.addEventListener('click', function() {
            selectedRating = parseInt(this.dataset.value);
            updateRatingDisplayNumbers(form, selectedRating);
        });
    });
    
    form?.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const textarea = document.getElementById(`comment-input-${appId}`);
        const comment = textarea?.value.trim();
        
        if (selectedRating === 0) {
            alert('Please select a rating');
            return;
        }
        
        if (!UserAuth.canRate()) {
            alert('Please log in to leave a review');
            UserAuth.openAuthModal();
            return;
        }
        
        submitReview(appId, selectedRating, comment || '');
    });
}

function updateRatingDisplayNumbers(form, rating) {
    const btns = form.querySelectorAll('.rating-num-btn');
    btns.forEach(btn => {
        const value = parseInt(btn.dataset.value);
        if (value <= rating) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

async function submitReview(appId, rating, comment) {
    const isDeveloper = DeveloperMode.isLoggedIn;
    const userName = UserAuth.getReviewUsername();
    const userAvatar = UserAuth.getReviewAvatar();
    
    const review = await FirestoreComments.saveReview(appId, rating, comment, userName, isDeveloper, userAvatar);
    
    if (review) {
        showNotification(isDeveloper ? 'Developer response submitted!' : 'Review submitted successfully!');
        
        await loadAppRatings(appId);
        
        const textarea = document.getElementById(`comment-input-${appId}`);
        if (textarea) textarea.value = '';
        
        const form = document.getElementById(`comment-form-${appId}`);
        if (form) {
            form.querySelectorAll('.rating-num-btn').forEach(btn => btn.classList.remove('active'));
        }
        
        Achievements.checkAchievements('submit_rating');
    } else {
        alert('Failed to submit review. Please try again.');
    }
}

function subscribeToAppReviews(appId) {
    if (AppState.reviewSubscriptions[appId]) {
        AppState.reviewSubscriptions[appId]();
    }
    
    const unsubscribe = FirestoreComments.subscribeToReviews(appId, (reviews) => {
        displayReviews(appId, reviews);
    });
    
    AppState.reviewSubscriptions[appId] = unsubscribe;
}

function loadReviews(appId) {
    FirestoreComments.getReviews(appId).then(reviews => {
        displayReviews(appId, reviews);
    });
}

function displayReviews(appId, reviews) {
    const container = document.getElementById(`comment-list-${appId}`);
    
    if (!container) return;
    
    if (!reviews || reviews.length === 0) {
        container.innerHTML = '<p class="muted">No reviews yet. Be the first to leave a review!</p>';
        return;
    }
    
    container.innerHTML = reviews.map(review => {
        const isDeveloperReview = review.isDeveloper === true;
        const reviewClass = isDeveloperReview ? 'comment-item developer-response' : 'comment-item';
        
        let avatarHtml = '';
        if (review.userAvatar) {
            avatarHtml = `<img src="${review.userAvatar}" alt="${escapeHtml(review.user)}" class="comment-avatar-img">`;
        } else if (isDeveloperReview) {
            avatarHtml = `<div class="comment-avatar developer">D</div>`;
        } else {
            avatarHtml = `<div class="comment-avatar">${escapeHtml(review.user.charAt(0).toUpperCase())}</div>`;
        }
        
        return `
            <div class="${reviewClass}">
                <div class="comment-header">
                    <div class="comment-author">
                        ${avatarHtml}
                        <span class="comment-name">${escapeHtml(review.user)}</span>
                        ${isDeveloperReview ? '<span class="developer-badge">Developer</span>' : ''}
                    </div>
                    <div>
                        <span class="comment-rating">${review.rating}/5</span>
                        <span class="comment-date">${formatDate(review.timestamp)}</span>
                    </div>
                </div>
                ${review.comment ? `<div class="comment-body">${escapeHtml(review.comment)}</div>` : ''}
            </div>
        `;
    }).join('');
}

// ============================================================
// LOAD ALL RATINGS
// ============================================================
async function loadAllRatings() {
    const apps = Object.keys(appData);
    
    for (const appId of apps) {
        try {
            const avgRating = await FirestoreComments.getAverageRating(appId);
            const displayElement = document.querySelector(`[data-avg-rating="${appId}"]`);
            
            if (displayElement) {
                if (avgRating === null || avgRating === undefined) {
                    displayElement.innerHTML = '<span class="rating-na">—</span>';
                } else {
                    displayElement.innerHTML = getNumericRatingDisplay(avgRating);
                }
            }
        } catch (error) {
            console.error('Error loading rating for', appId, ':', error);
        }
    }
    
    console.log('All ratings loaded');
}

// ============================================================
// FILTER GAME CARDS
// ============================================================
function filterGameCards(category) {
    const cards = document.querySelectorAll('.page[data-page="games"] .app-card');
    
    cards.forEach(card => {
        const appId = card.dataset.app;
        const app = appData[appId];
        
        if (category === 'all') {
            card.style.display = '';
        } else if (app && app.category.toLowerCase().includes(category.toLowerCase())) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

// ============================================================
// WELCOME MODAL
// ============================================================
function showWelcomeModal(isFirstVisit) {
    if (!elements.welcomeModal) return;
    
    if (isFirstVisit) {
        elements.welcomeScrollContent.classList.remove('hidden');
        elements.welcomeReturningContent.classList.add('hidden');
        elements.welcomeAckRow.classList.remove('hidden');
        elements.welcomeContinue.disabled = true;
    } else {
        elements.welcomeScrollContent.classList.add('hidden');
        elements.welcomeReturningContent.classList.remove('hidden');
        elements.welcomeAckRow.classList.add('hidden');
        elements.welcomeContinue.disabled = false;
    }
    
    elements.welcomeModal.classList.remove('hidden');
    elements.welcomeModal.setAttribute('aria-hidden', 'false');
}

function closeWelcomeModal() {
    if (!elements.welcomeModal) return;
    
    elements.welcomeModal.classList.add('hidden');
    elements.welcomeModal.setAttribute('aria-hidden', 'true');
    
    localStorage.setItem('sawfish_welcome_acknowledged', 'true');
}

// ============================================================
// PWA UPDATE FUNCTIONS
// ============================================================
function updateAppStatus(status) {
    if (!elements.updateStatus || !elements.updateAction) return;
    
    switch (status) {
        case 'checking':
            elements.updateStatus.textContent = 'Checking for updates...';
            break;
        case 'ready':
            elements.updateStatus.textContent = 'Up to date';
            elements.updateAction.innerHTML = '<span class="btn-text">Up to date</span>';
            break;
        case 'update':
            elements.updateStatus.textContent = 'Update available!';
            elements.updateAction.innerHTML = '<span class="btn-text">Update</span><span class="btn-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></span>';
            break;
    }
}

function updateApp() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            updateAppStatus('updating');
        });
        
        window.addEventListener('swUpdated', () => {
            location.reload(true);
        });
    }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(timestamp) {
    try {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    } catch (e) {
        return 'Unknown date';
    }
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification-toast';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--accent-primary);
        color: var(--text-inverse);
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 500;
        z-index: 2000;
        animation: slideUp 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function getNumericRatingDisplay(rating) {
    if (rating === null || rating === undefined) return '<span class="rating-na">—</span>';
    return `<span class="rating-number">${rating.toFixed(1)}</span>`;
}

function updateDevOnlyElements() {
    const devOnlyElements = document.querySelectorAll('.developer-only');
    const isDev = DeveloperMode.isLoggedIn || UserAuth.isDeveloperMode;
    
    devOnlyElements.forEach(el => {
        if (isDev) {
            el.style.display = '';
            el.classList.add('visible');
        } else {
            el.style.display = 'none';
            el.classList.remove('visible');
        }
    });
}

// ============================================================
// GLOBAL FUNCTIONS
// ============================================================
window.scrollToSection = scrollToSection;
window.DeveloperMode = DeveloperMode;
window.UserAuth = UserAuth;
window.openExpandedApp = openExpandedApp;
window.CommunityBoard = CommunityBoard;

console.log('Sawfish App Store JavaScript loaded successfully');
