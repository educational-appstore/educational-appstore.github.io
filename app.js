/* ==========================================================================
   SAWFISH APP STORE — MODULAR APP LOGIC
   Fully rewritten for Apple-style PWA behavior
   Handles:
     • Install detection
     • Screen switching
     • Tab navigation
     • Smooth page transitions
=========================================================================== */

/* -----------------------------
   GLOBAL ELEMENT REFERENCES
------------------------------ */
const Screens = {
    install: document.querySelector("[data-screen='install']"),
    app: document.querySelector("[data-screen='app']")
};

const Tabs = Array.from(document.querySelectorAll("[data-tab]"));
const Pages = Array.from(document.querySelectorAll("[data-page]"));


/* ==========================================================================
   1 — PWA / HOME SCREEN DETECTION
   Returns true if the app is running as a standalone PWA
=========================================================================== */
function isPWAInstalled() {
    // iOS standalone or standard PWA detection
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

/* ==========================================================================
   2 — SCREEN STATE CONTROL
   Shows install screen or app screen
=========================================================================== */
function updateScreenState() {
    if (isPWAInstalled()) {
        Screens.install.classList.remove('visible');
        Screens.app.classList.add('visible');
        setActiveTab('home'); // default tab
    } else {
        Screens.app.classList.remove('visible');
        Screens.install.classList.add('visible');
    }
}


/* ==========================================================================
   3 — TAB NAVIGATION SYSTEM
   Handles tab clicks and page visibility
=========================================================================== */
function setActiveTab(tabName) {
    // Highlight active tab
    Tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabName));

    // Show associated page
    Pages.forEach(page => page.classList.toggle('visible', page.dataset.page === tabName));

    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initializeTabs() {
    Tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            setActiveTab(tab.dataset.tab);
        });
    });
}


/* ==========================================================================
   4 — VISIBILITY / FOCUS HANDLER
   Updates screen state if the user switches apps or tabs
=========================================================================== */
function handleVisibilityChange() {
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            updateScreenState();
        }
    });
}


/* ==========================================================================
   5 — INITIALIZATION
=========================================================================== */
function initializeApp() {
    updateScreenState();
    initializeTabs();
    handleVisibilityChange();
}


/* ==========================================================================
   6 — START APPLICATION
=========================================================================== */
window.addEventListener('load', initializeApp);
