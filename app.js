// ============================================================
// Sawfish App Store JavaScript
// Full Logic for PWA, Expanded Views, Comments, Ratings
// Author: Eric Zhu
// Date: Jan 5, 2026
// ============================================================

// -------------------------
// INITIAL SETUP
// -------------------------

// Remove "loading" class from <html>
document.documentElement.classList.remove("loading");

// Detect if the app is running as a PWA (standalone) or web preview
const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

// Grab main screens
const installScreen = document.querySelector('[data-screen="install"]');
const appScreen = document.querySelector('[data-screen="app"]');

// -------------------------
// WEBSITE vs PWA DISPLAY
// -------------------------

/*
    Logic:
    - If running in PWA, show the app screen, hide the install/instructions screen.
    - If running in the browser, show the instructions screen, hide the PWA app.
    - This separation prevents messy overlapping content and keeps the experience clean.
*/
if (isPWA) {
    installScreen.classList.remove("visible");
    appScreen.classList.add("visible");
} else {
    installScreen.classList.add("visible");
    appScreen.classList.remove("visible");
}

// -------------------------
// EXPANDED APP VIEW SETUP
// -------------------------

/*
    We create a single "expanded view" container that will be populated dynamically
    when a user clicks an app, game, social, or OS card. This ensures only one expanded
    card exists in the DOM, reducing memory usage and avoiding multiple overlapping popups.
*/
const expandedView = document.createElement("div");
expandedView.id = "expanded-view";
expandedView.className = "expanded-view hidden"; // hidden by default
document.body.appendChild(expandedView);

/**
 * Open the expanded view for a card
 * @param {HTMLElement} card - The clicked app/game/connect/os card
 */
function openExpanded(card) {
    if (!card.dataset.appId) return; // safety check

    const appId = card.dataset.appId;
    const name = card.dataset.name || "Unknown App";
    const dev = card.dataset.dev || "Unknown Developer";
    const icon = card.dataset.icon || "icons/default.png";
    const brief = card.dataset.brief || "No description available.";
    const longdesc = card.dataset.longdesc || "No detailed description available.";
    const link = card.dataset.link || "#";

    // Fetch average rating asynchronously
    calculateAverageRating(appId).then(avgRating => {
        expandedView.innerHTML = `
            <div class="expanded-card">
                <button id="expanded-close">&times;</button>

                <div class="expanded-header">
                    <img src="${icon}" alt="${name} Icon" class="expanded-icon">
                    <div class="expanded-info">
                        <h2>${name}</h2>
                        <p class="dev">By ${dev}</p>
                        <p class="brief">${brief}</p>
                        <p class="rating">Average Rating: ${avgRating.toFixed(1)} ⭐</p>
                    </div>
                </div>

                <div class="expanded-body">
                    ${longdesc}

                    <div class="comment-section">
                        <h3>Comments</h3>
                        <div id="comments-${appId}" class="comments-list">
                            <p class="muted">Loading comments…</p>
                        </div>

                        <textarea id="comment-input-${appId}" placeholder="Write your comment here..."></textarea>
                        <label for="rating-input-${appId}">Rating:</label>
                        <select id="rating-input-${appId}">
                            <option value="1">1 ⭐</option>
                            <option value="2">2 ⭐</option>
                            <option value="3">3 ⭐</option>
                            <option value="4">4 ⭐</option>
                            <option value="5">5 ⭐</option>
                        </select>
                        <button id="submit-comment-${appId}">Submit Comment</button>
                    </div>

                    <a href="${link}" target="_blank" class="app-launch-btn">Open App</a>
                </div>
            </div>
        `;

        // Show the expanded view
        expandedView.classList.remove("hidden");

        // Close button logic
        document.getElementById("expanded-close").addEventListener("click", () => {
            expandedView.classList.add("hidden");
        });

        // Load Firebase comments
        loadComments(appId);

        // Handle comment submission
        document.getElementById(`submit-comment-${appId}`).addEventListener("click", () => {
            const text = document.getElementById(`comment-input-${appId}`).value.trim();
            const rating = parseInt(document.getElementById(`rating-input-${appId}`).value);
            if (!text || !rating) return; // simple validation

            addComment(appId, text, rating);
            document.getElementById(`comment-input-${appId}`).value = "";
        });
    });
}

// -------------------------
// ATTACH CARD CLICK LISTENERS
// -------------------------

/*
    All app, game, connect, and OS cards get a click listener.
    - Expanded view will only open when in PWA.
    - Clicking in web preview does nothing (instructions only).
*/
document.querySelectorAll(".app-card, .game-card, .connect-card, .os-card").forEach(card => {
    card.addEventListener("click", () => {
        if (!isPWA) return;
        openExpanded(card);
    });
});

// -------------------------
// FIREBASE SETUP
// -------------------------

/*
    Connect to Firebase to allow:
    - Real-time comments for each app
    - Average rating calculation
*/
const firebaseConfig = {
    apiKey: "AIzaSyB5JaGq3ezv1ghif7ggRr8_jxuq7ZGw4Bo",
    authDomain: "appstore-cb2fa.firebaseapp.com",
    projectId: "appstore-cb2fa",
    storageBucket: "appstore-cb2fa.firebasestorage.app",
    messagingSenderId: "122307463006",
    appId: "1:122307463006:web:25993ed888531908fbb1cf"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// -------------------------
// COMMENTS & RATINGS
// -------------------------

/**
 * Load all comments for a given app
 * @param {string} appId
 */
function loadComments(appId) {
    const container = document.getElementById(`comments-${appId}`);
    container.innerHTML = "<p class='muted'>Loading comments...</p>";

    db.collection("comments").where("appId", "==", appId).orderBy("timestamp", "desc").get()
        .then(snapshot => {
            container.innerHTML = "";
            if (snapshot.empty) {
                container.innerHTML = "<p class='muted'>No comments yet. Be the first!</p>";
            }
            snapshot.forEach(doc => {
                const c = doc.data();
                const commentEl = document.createElement("div");
                commentEl.className = "comment";
                commentEl.innerHTML = `
                    <strong>${c.user || "Anonymous"}</strong>: ${c.text} 
                    <span class="comment-rating">${c.rating} ⭐</span>
                `;
                container.appendChild(commentEl);
            });
        })
        .catch(err => {
            container.innerHTML = "<p class='muted'>Failed to load comments.</p>";
            console.error(err);
        });
}

/**
 * Add a new comment for a given app
 * @param {string} appId
 * @param {string} text
 * @param {number} rating
 */
function addComment(appId, text, rating) {
    db.collection("comments").add({
        appId,
        text,
        rating,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        user: "Anonymous"
    }).then(() => {
        loadComments(appId); // refresh comments after submit
    }).catch(err => {
        console.error("Failed to add comment:", err);
    });
}

/**
 * Calculate average rating for a given app
 * Returns a Promise with the average
 * @param {string} appId
 * @returns {Promise<number>}
 */
async function calculateAverageRating(appId) {
    try {
        const snapshot = await db.collection("comments").where("appId", "==", appId).get();
        if (snapshot.empty) return 0;

        let total = 0;
        snapshot.forEach(doc => {
            total += doc.data().rating || 0;
        });
        return total / snapshot.size;
    } catch (err) {
        console.error("Failed to calculate rating:", err);
        return 0;
    }
}

// -------------------------
// DEFAULT STATE
// -------------------------

expandedView.classList.add("hidden"); // Hide expanded view by default

// Ensure PWA iframe overlays (OS previews) display correctly
document.querySelectorAll('.os-container iframe').forEach(iframe => {
    iframe.addEventListener('load', () => {
        const overlay = iframe.parentElement.querySelector('.overlay');
        if (overlay) overlay.classList.add('visible');
    });
});

console.log("Sawfish App JS initialized. PWA mode:", isPWA);
