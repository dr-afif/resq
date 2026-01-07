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
});
