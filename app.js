/* ==========================================================================
   SAWFISH APP STORE — FULL APP LOGIC
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
const OSContainers = Array.from(document.querySelectorAll('.os-container'));

/* ==========================================================================
   1 — PWA / HOME SCREEN DETECTION
=========================================================================== */
function isPWAInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function showAppScreen() {
    Screens.install.classList.remove('visible');
    Screens.app.classList.add('visible');
    setActiveTab('home'); // default tab
}

function showInstallScreen() {
    Screens.app.classList.remove('visible');
    Screens.install.classList.add('visible');
}

function enforceAppView() {
    if (isPWAInstalled()) {
        document.documentElement.style.visibility = 'hidden';
        showAppScreen();
        document.documentElement.style.visibility = 'visible';
    }
}

/* ==========================================================================
   2 — SCREEN STATE CONTROL
=========================================================================== */
function updateScreenState() {
    if (isPWAInstalled()) {
        showAppScreen();
    } else {
        showInstallScreen();
    }
}

/* ==========================================================================
   3 — TAB NAVIGATION
=========================================================================== */
function setActiveTab(tabName) {
    Tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabName));
    Pages.forEach(page => page.classList.toggle('visible', page.dataset.page === tabName));

    const activePage = document.querySelector(`[data-page='${tabName}']`);
    if (activePage) activePage.scrollTop = 0;
}

function initializeTabs() {
    Tabs.forEach(tab => {
        tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
    });
}

/* ==========================================================================
   4 — OS IFRAME OVERLAYS
=========================================================================== */
function initializeOSOverlays() {
    OSContainers.forEach(container => {
        const iframe = container.querySelector('iframe');
        const overlay = container.querySelector('.overlay');
        if (iframe && overlay) {
            iframe.addEventListener('load', () => {
                overlay.classList.add('visible');
            });
        }
    });
}

/* ==========================================================================
   5 — VISIBILITY / FOCUS HANDLER
=========================================================================== */
function handleVisibilityChange() {
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) updateScreenState();
    });
}

/* ==========================================================================
   6 — INITIALIZATION
=========================================================================== */
function initializeApp() {
    enforceAppView();        // Force PWA app view
    initializeTabs();        // Enable tab switching
    handleVisibilityChange(); // Visibility/focus updates
    initializeOSOverlays();  // Activate OS overlays
}

/* ==========================================================================
   7 — START APPLICATION
=========================================================================== */
window.addEventListener('DOMContentLoaded', initializeApp);
