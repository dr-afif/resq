document.addEventListener('DOMContentLoaded', () => {
    // URL of your Google Apps Script Web App
    // Note: You must update this URL if you deploy a new script.
    // Ensure the script is deployed with "Execute as: Me" and "Who has access: Anyone".
    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzMYWwVyXIuehLiModrZqciIFH_L82R5m0b1TuHjABkWAUQZtIZaF6zecF13-yvrLbm/exec";

    const updateInterval = 5000; // Update every 5 seconds (Near-Instant feel)

    async function fetchZoneData() {
        try {
            // We use the 'action=getZones' parameter to distinguish from the form submission
            // Note: This requires the GAS to handle this parameter.
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getZones`);
            const data = await response.json();

            if (data && data.status === 'success' && data.zones) {
                updateDashboard(data.zones, data.timestamp);
            } else {
                console.warn("Invalid data format received from server", data);
            }
        } catch (error) {
            console.error("Failed to fetch zone data:", error);
            // Optional: Show error state in UI
        }
    }

    function updateDashboard(zones, timestamp) {
        // Timestamp
        const date = new Date(timestamp || Date.now());
        document.getElementById('last-updated').textContent = `Last updated: ${date.toLocaleTimeString()}`;

        // Helper to animate numbers
        const animateValue = (id, start, end, duration) => {
            const obj = document.getElementById(id);
            if (!obj) return;
            let startTimestamp = null;
            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                obj.innerText = Math.floor(progress * (end - start) + start);
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                }
            };
            window.requestAnimationFrame(step);
        };

        // Update Zones
        ['green', 'yellow', 'red'].forEach(zoneKey => {
            const data = zones[zoneKey];
            if (!data) return;

            const prefix = zoneKey.charAt(0); // 'g', 'y', 'r'

            // Text values
            document.getElementById(`${prefix}-seen`).innerText = data.seen;
            document.getElementById(`${prefix}-total`).innerText = data.total;
            document.getElementById(`${prefix}-4h`).innerText = data.over4h;
            document.getElementById(`${prefix}-6h`).innerText = data.over6h;

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

    // Polling
    setInterval(fetchZoneData, updateInterval);

    // DEMO MODE: If fetch fails normally (CORS/No backend logic yet), populate with dummy data
    // Remove this in production
    /*
    setTimeout(() => {
        if (document.getElementById('g-total').innerText === '0') {
            console.log("Demo mode: Populating dummy data");
            const dummy = {
                green: { seen: 45, total: 60, over4h: 2, over6h: 0 },
                yellow: { seen: 20, total: 25, over4h: 5, over6h: 1 },
                red: { seen: 8, total: 8, over4h: 0, over6h: 0 }
            };
            updateDashboard(dummy, Date.now());
        }
    }, 2000);
    */
    // Generate Persistent User ID
    let userId = localStorage.getItem('resq_user_id');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('resq_user_id', userId);
    }
    console.log("My User ID:", userId);

    // Screenshot Logic (Local)
    const screenshotBtn = document.getElementById('screenshot-btn');
    if (screenshotBtn) {
        screenshotBtn.addEventListener('click', async () => {
            const originalText = screenshotBtn.textContent;
            screenshotBtn.textContent = "📸 Capturing...";
            screenshotBtn.disabled = true;

            try {
                // Determine target - entire monitor container
                const target = document.querySelector('.monitor-container');
                if (!target) throw new Error("Monitor container not found");

                const canvas = await html2canvas(target, {
                    scale: 2, // Retain high quality
                    backgroundColor: '#ffffff', // Ensure white background
                    useCORS: true,
                    logging: false
                });

                showInModal(canvas.toDataURL('image/png'));

            } catch (err) {
                console.error("Local screenshot failed:", err);
                alert("Failed to capture local screenshot. Check console.");
            } finally {
                screenshotBtn.textContent = originalText;
                screenshotBtn.disabled = false;
            }
        });
    }

    // Remote Screenshot Logic
    const remoteBtn = document.getElementById('remote-screenshot-btn');
    if (remoteBtn) {
        let originalText = remoteBtn.textContent; // Store original text for reset

        remoteBtn.addEventListener('click', async () => {
            originalText = remoteBtn.textContent; // Update original text in case it changed
            remoteBtn.textContent = "⏳ Requesting...";
            remoteBtn.disabled = true;

            try {
                // 1. Send Request
                const req = await fetch(`${GOOGLE_SCRIPT_URL}?action=requestScreenshot&userId=${userId}`);
                const res = await req.json();

                if (res.status !== 'queued') throw new Error("Server failed to queue request");

                remoteBtn.textContent = "📡 Waiting for Host...";

                // 2. Poll for Result (timeout after 60s)
                let attempts = 0;
                const maxAttempts = 30; // 30 * 2s = 60s

                const poll = setInterval(async () => {
                    attempts++;
                    if (attempts > maxAttempts) {
                        clearInterval(poll);
                        alert("Timeout: Host did not respond in time. Is the Tampermonkey script running?");
                        resetRemoteBtn();
                        return;
                    }

                    try {
                        const checkPos = await fetch(`${GOOGLE_SCRIPT_URL}?action=checkScreenshot&userId=${userId}`);
                        const checkData = await checkPos.json();

                        if (checkData.status === 'ready' && checkData.url) {
                            clearInterval(poll);
                            showInModal(checkData.url); // Show the remote URL
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

    function showInModal(imgSrc) {
        const modal = document.getElementById('screenshot-modal');
        const previewImg = document.getElementById('screenshot-preview');
        const downloadBtn = document.getElementById('modal-download-btn');
        const closeBtn = document.getElementById('modal-close-btn');

        if (modal && previewImg && downloadBtn) {
            previewImg.src = imgSrc;

            // Setup download button
            // If it's a data URL, we can download directly.
            // If it's a Drive URL, download might open in new tab due to CORS, but 'download' attr helps.
            const filename = `resq-capture-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.png`;
            downloadBtn.download = filename;
            downloadBtn.href = imgSrc;

            modal.style.display = 'flex';

            const closeModal = () => { modal.style.display = 'none'; };
            closeBtn.onclick = closeModal;
            modal.onclick = (e) => { if (e.target === modal) closeModal(); };
        } else {
            console.error("Modal elements not found for showInModal");
        }
    }
});
