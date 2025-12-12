let deferredPrompt;
const installScreen = document.getElementById("install-screen");
const appStore = document.getElementById("app-store");
const appList = document.getElementById("app-list");
const searchInput = document.getElementById("search");

// Apps only
const apps = [
  {
    name: "Chat App",
    icon: "💬",
    url: "https://the-sawfish.github.io/chat1234567890/login.html",
    category: "chat",
    desc: "Safe in-browser chat with friends!"
  },
  {
    name: "Call App",
    icon: "📞",
    url: "https://the-sawfish.github.io/call-app/",
    category: "chat",
    desc: "Voice & video calls in-browser!"
  },
  {
    name: "Game Station",
    icon: "🎮",
    url: "https://the-sawfish.github.io/game-portal/",
    category: "games",
    desc: "Play mini-games and challenges!"
  }
];

// Detect if PWA installed
function isPWA() {
  return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
}

// Load apps dynamically
function loadApps(filter = "all") {
  appList.innerHTML = "";
  apps.filter(app => filter === "all" || app.category === filter)
      .forEach(app => {
        const card = document.createElement("div");
        card.className = "app-card";
        card.innerHTML = `
          <div class="app-icon">${app.icon}</div>
          <div class="app-name">${app.name}</div>
          <div class="app-desc">${app.desc}</div>
          <button class="open-btn" onclick="window.open('${app.url}','_blank')">Open App</button>
        `;
        appList.appendChild(card);
      });
}

// Category filter
document.querySelectorAll("#categories button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#categories button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    loadApps(btn.dataset.cat);
  });
});

// Search filter
searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();
  appList.childNodes.forEach(card => {
    card.style.display = card.querySelector(".app-name").textContent.toLowerCase().includes(query) ? "block" : "none";
  });
});

// Before install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById("prompt-install").style.display = "block";
});

// Install button
document.getElementById("prompt-install").addEventListener("click", async () => {
  if(deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    document.getElementById("prompt-install").style.display = "none";
  }
});

// Show app store if PWA
window.addEventListener("load", () => {
  if(isPWA()){
    installScreen.style.display = "none";
    appStore.style.display = "block";
    loadApps();
  }
});

// Register Service Worker
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('service-worker.js')
  .then(() => console.log("Service Worker Registered"));
}
