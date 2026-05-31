// Top Navigation Active State Logic
function initTopNav() {
    const path = window.location.pathname.split('/').pop() || 'index.html';

    let activeId = '';
    if (path === 'index.html' || path === '') activeId = 'nav-dashboard';
    else if (path === 'webform1.html') activeId = 'nav-referral';
    else if (path === 'roster.html') activeId = 'nav-roster';

    if (activeId) {
        const el = document.getElementById(activeId);
        if (el) el.classList.add('active');
    }
}

function loadTopNav() {
    const container = document.getElementById('topnav-container');
    if (!container) return;

    fetch('top-navigation.html?t=' + Date.now())
        .then(res => res.text())
        .then(html => {
            container.innerHTML = html;
            initTopNav();
        })
        .catch(err => console.error('Error loading top nav:', err));
}

// Global initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTopNav);
} else {
    loadTopNav();
}
