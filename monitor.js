document.addEventListener('DOMContentLoaded', () => {
    // URL of your Google Apps Script Web App
    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzMYWwVyXIuehLiModrZqciIFH_L82R5m0b1TuHjABkWAUQZtIZaF6zecF13-yvrLbm/exec";

    const updateInterval = 5000; // Update every 5 seconds

    async function fetchZoneData() {
        try {
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getZones`);
            const data = await response.json();

            if (data && data.status === 'success' && data.zones) {
                updateDashboard(data.zones, data.timestamp);
            } else {
                console.warn("Invalid data format received from server", data);
            }
        } catch (error) {
            console.error("Failed to fetch zone data:", error);
        }
    }

    function updateDashboard(zones, timestamp) {
        const date = new Date(timestamp || Date.now());
        const lastUpdatedEl = document.getElementById('last-updated');
        if (lastUpdatedEl) lastUpdatedEl.textContent = `Last updated: ${date.toLocaleTimeString()}`;

        // Update Zones
        ['green', 'yellow', 'red'].forEach(zoneKey => {
            const data = zones[zoneKey];
            if (!data) return;

            const prefix = zoneKey.charAt(0); // 'g', 'y', 'r'

            // Text values
            const elSeen = document.getElementById(`${prefix}-seen`);
            const elTotal = document.getElementById(`${prefix}-total`);
            const el4h = document.getElementById(`${prefix}-4h`);
            const el6h = document.getElementById(`${prefix}-6h`);

            if (elSeen) elSeen.innerText = data.seen;
            if (elTotal) elTotal.innerText = data.total;
            if (el4h) el4h.innerText = data.over4h;
            if (el6h) el6h.innerText = data.over6h;

            // Progress Bar
            const percent = data.total > 0 ? (data.seen / data.total) * 100 : 0;
            const bar = document.getElementById(`${prefix}-bar`);
            if (bar) {
                bar.style.width = `${percent}%`;
            }
        });
    }

    // Initial load
    fetchZoneData();
    setInterval(fetchZoneData, updateInterval);

    // ------------------------------------------------------------------
    // REMOTE SCREENSHOT LOGIC
    // ------------------------------------------------------------------

    // Generate Persistent User ID
    let userId = localStorage.getItem('resq_user_id');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('resq_user_id', userId);
    }
    console.log("My User ID:", userId);

    const remoteBtn = document.getElementById('remote-screenshot-btn');
    if (remoteBtn) {
        let originalText = remoteBtn.textContent;

        remoteBtn.addEventListener('click', async () => {
            originalText = remoteBtn.textContent;
            remoteBtn.textContent = "⏳ Requesting...";
            remoteBtn.disabled = true;

            try {
                // 1. Send Request
                const req = await fetch(`${GOOGLE_SCRIPT_URL}?action=requestScreenshot&userId=${userId}`);
                const res = await req.json();

                if (res.status !== 'queued') throw new Error("Server failed to queue request");

                remoteBtn.textContent = "📡 Waiting for Host...";

                // 2. Poll Loop
                let attempts = 0;
                const maxAttempts = 30; // 30 * 2s = 60s

                const poll = setInterval(async () => {
                    attempts++;
                    if (attempts > maxAttempts) {
                        clearInterval(poll);
                        alert("Timeout: Host did not respond in time.");
                        resetRemoteBtn();
                        return;
                    }

                    try {
                        const checkPos = await fetch(`${GOOGLE_SCRIPT_URL}?action=checkScreenshot&userId=${userId}`);
                        const checkData = await checkPos.json();

                        if (checkData.status === 'ready' && checkData.url) {
                            clearInterval(poll);
                            // SUCCESS: Show in Slide
                            updateScreenshotDisplay(checkData.url);
                            resetRemoteBtn();
                        }
                    } catch (e) {
                        console.error("Polling error", e);
                    }
                }, 2000);

            } catch (err) {
                console.error("Remote request failed:", err);
                alert("Failed to request remote screenshot.");
                resetRemoteBtn();
            }
        });

        function resetRemoteBtn() {
            remoteBtn.textContent = originalText;
            remoteBtn.disabled = false;
        }
    }

    function updateScreenshotDisplay(imgSrc) {
        const img = document.getElementById('live-screenshot-img');
        const container = document.getElementById('screenshot-container');
        const placeholderText = document.getElementById('screenshot-placeholder-text');

        if (img && container) {
            // When image loads, show it and hide placeholder text
            img.onload = () => {
                img.classList.add('loaded');
                container.classList.add('has-image');
                if (placeholderText) placeholderText.style.display = 'none';
            };
            // Set source (this triggers the load)
            img.src = imgSrc;

            // Auto-scroll to image if needed? 
            // The user is likely already looking at this slide since the button is there.
        } else {
            console.error("Screenshot elements not found in DOM");
        }
    }
});
