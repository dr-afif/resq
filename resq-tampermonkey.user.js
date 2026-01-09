// ==UserScript==
// @name         UPM RESQ Full Panel + Telegram Multi-User + Overdue Breakdown (Long-Polling) + Hi-Res Screenshot
// @namespace    http://tampermonkey.net/
// @version      3.5
// @description  RESQ panel + overdue tracking + Telegram long-polling + hi-res /screenshot (as document) and /screenshot_photo
// @match        https://putrahis.hsaas.upm.edu.my/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @require      https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // ====== CONFIG ======
    let TELEGRAM_BOT_TOKEN = GM_getValue('TELEGRAM_BOT_TOKEN', '');

    // Prompt user if token is missing
    if (!TELEGRAM_BOT_TOKEN) {
        const input = prompt('Please enter your Telegram Bot Token for RESQ Script:', '');
        if (input) {
            TELEGRAM_BOT_TOKEN = input.trim();
            GM_setValue('TELEGRAM_BOT_TOKEN', TELEGRAM_BOT_TOKEN);
        } else {
            console.warn('Telegram Bot Token not provided. Telegram features will be disabled.');
        }
    }

    // Add menu command to change token
    GM_registerMenuCommand('Change Telegram Bot Token', () => {
        const current = GM_getValue('TELEGRAM_BOT_TOKEN', '');
        const input = prompt('Enter new Telegram Bot Token:', current);
        if (input !== null) {
            GM_setValue('TELEGRAM_BOT_TOKEN', input.trim());
            location.reload();
        }
    });
    // Replace this with your Google Apps Script Web App URL
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzMYWwVyXIuehLiModrZqciIFH_L82R5m0b1TuHjABkWAUQZtIZaF6zecF13-yvrLbm/exec';


    // Telegram long-poll state
    let lastProcessedUpdateId = parseInt(localStorage.getItem('lastUpdateId') || '0', 10);
    let longPollController = null;
    let isLongPolling = false;

    // ====== STYLES ======
    const style = document.createElement("style");
    style.textContent = `
    #zoneCounterPanel {
      position: fixed;
      top: 80px;
      left: 20px;
      background: #fff;
      border: 2px solid #888;
      padding: 12px 14px;
      z-index: 9999;
      font-family: Arial, sans-serif;
      font-size: 14px;
      border-radius: 12px;
      box-shadow: 0 0 12px rgba(0,0,0,0.3);
      max-width: 260px;
      width: 240px;
    }
    .zone-bar { background: #eee; border-radius: 6px; overflow: hidden; height: 12px; margin-bottom: 6px; }
    .zone-fill { height: 100%; transition: width 0.3s; }
    .green { background: #77DD77; }
    .yellow { background: #FAF884; }
    .red { background: #FF6961; }

    #sessionStatus {
      position: fixed;
      bottom: 16px;
      right: 16px;
      width: 18px; height: 18px;
      border-radius: 50%;
      background-color: #4caf50;
      box-shadow: 0 0 8px rgba(0,0,0,0.2);
      z-index: 9999;
      animation: blink 0.3s ease-out;
    }
    @keyframes blink {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.5); opacity: 0.5; }
      100% { transform: scale(1); opacity: 1; }
    }
    #sessionStatus.error { background-color: red !important; }

    #telegramStatus {
      position: fixed;
      bottom: 16px;
      right: 40px;
      width: 18px; height: 18px;
      border-radius: 50%;
      background-color: #0088cc;
      box-shadow: 0 0 8px rgba(0,0,0,0.2);
      z-index: 9999;
    }
    #telegramStatus.connecting { background-color: orange; animation: pulse 1s infinite; }
    #telegramStatus.error { background-color: red; }
    @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.5;} }
  `;
    document.head.appendChild(style);

    // ====== UI ======
    const panel = document.createElement("div");
    panel.id = "zoneCounterPanel";
    panel.innerHTML = `<b>⏱ RESQ Zone Summary</b><br><i>Loading...</i>`;
    document.body.appendChild(panel);

    const sessionIcon = document.createElement("div");
    sessionIcon.id = "sessionStatus";
    document.body.appendChild(sessionIcon);

    const telegramIcon = document.createElement("div");
    telegramIcon.id = "telegramStatus";
    telegramIcon.title = "Telegram Long-Polling Status";
    document.body.appendChild(telegramIcon);

    // ====== ZONE PARSER ======
    function getZoneSummary() {
        const zones = {
            green: { seen: 0, total: 0, over4h: 0, over6h: 0 },
            yellow: { seen: 0, total: 0, over4h: 0, over6h: 0 },
            red: { seen: 0, total: 0, over4h: 0, over6h: 0 }
        };

        const rows = document.querySelectorAll("table.table-hover tbody tr");
        rows.forEach(row => {
            if (row.offsetParent === null) return;
            const cells = row.querySelectorAll("td");
            if (cells.length < 5) return;

            const zoneText = row.innerText.toLowerCase();
            let zone = null;
            if (zoneText.includes("green zone")) zone = "green";
            else if (zoneText.includes("yellow zone")) zone = "yellow";
            else if (zoneText.includes("red zone")) zone = "red";
            if (!zone) return;

            zones[zone].total++;
            const seenText = cells[4].textContent.trim();
            if (seenText && seenText !== "-") zones[zone].seen++;

            const over6 = row.querySelector("span.blinking");
            const over4 = row.querySelector("span.blinking2");
            if (over6) zones[zone].over6h++;
            else if (over4) zones[zone].over4h++;
        });

        return zones;
    }

    function makeBar(color, percent) {
        return `
      <div class="zone-bar">
        <div class="zone-fill ${color}" style="width:${percent}%"></div>
      </div>`;
    }

    function updatePanel() {
        const zones = getZoneSummary();
        const format = (zone, label, color) => {
            const { total, seen, over4h, over6h } = zones[zone];
            const percent = total > 0 ? (seen / total * 100).toFixed(0) : 0;
            return `
        <div style="text-align:center; font-weight:bold; margin-bottom:4px;">${label}</div>
        ${makeBar(color, percent)}
        <div style="font-size:12px; text-align:center;">${seen}/${total} seen</div>
        <div style="font-size:12px; text-align:center;"> >4h: ${over4h} <br> >6h: ${over6h}</div>
      `;
        };

        panel.innerHTML = `
      <b style="display:block; text-align:center;">⏱ RESQ Zone Summary</b>
      <div style="display:flex; justify-content:space-between; gap:10px; margin-top:8px;">
        <div style="flex:1;">${format("green", "🟢 Green", "green")}</div>
        <div style="flex:1;">${format("yellow", "🟡 Yellow", "yellow")}</div>
        <div style="flex:1;">${format("red", "🔴<br>Red", "red")}</div>
      </div>
      <small style="display:block; text-align:right; margin-top:8px;">Updated ${new Date().toLocaleTimeString()}</small>
    `;
    }

    // ====== CLOUD SYNC (GOOGLE SHEETS) ======
    let lastSentJson = ""; // Track the last sent data

    function postToGoogleSheet(zones) {

        if (!GOOGLE_SCRIPT_URL) return;

        // We send data via POST
        // The GAS must handle doPost(e) and look for parameter 'action=updateZones'
        // or parse the JSON body.
        // Using no-cors mode is typical for GAS unless strict CORS headers are set,
        // but with no-cors we can't check response.

        // Simple payload
        const payload = {
            action: "updateZones",
            zones: zones,
            timestamp: Date.now()
        };

        // Using navigator.sendBeacon is better for "fire and forget" but fetch is fine
        fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors", // Likely needed for Google Script simple triggers
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        }).then(() => console.log("Zones sent to cloud"))
            .catch(e => console.error("Cloud sync failed", e));
    }

    // ====== TELEGRAM HELPERS ======
    function sendTelegramMessage(chatId, text) {
        return fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" })
        });
    }

    function sendToTelegram(zones, chatId) {
        const msg = `
🧾 *RESQ Zone Summary* (${new Date().toLocaleTimeString()}):
🟢Green: ${zones.green.seen}/${zones.green.total} seen
   → >4h: ${zones.green.over4h}
   → >6h: ${zones.green.over6h}

🟡Yellow: ${zones.yellow.seen}/${zones.yellow.total} seen
   → >4h: ${zones.yellow.over4h}
   → >6h: ${zones.yellow.over6h}

🔴Red: ${zones.red.seen}/${zones.red.total} seen
   → >4h: ${zones.red.over4h}
   → >6h: ${zones.red.over6h}`.trim();

        fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text: msg,
                parse_mode: "Markdown",
                reply_markup: {
                    keyboard: [[{ text: "/update" }, { text: "/screenshot" }]],
                    resize_keyboard: true,
                    one_time_keyboard: false
                }
            })
        }).catch(err => console.error('Failed to send Telegram message:', err));
    }

    function sendChatAction(chatId, action) {
        // action: typing | upload_photo | upload_document
        return fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, action })
        });
    }

    // ====== SCREENSHOT: html2canvas loader & capture ======
    // ====== SCREENSHOT: html2canvas loader & capture ======
    // ensureHtml2Canvas removed - using @require instead


    function findTargetPanel() {
        const candidates = Array.from(document.querySelectorAll('div.panel.panel-inverse'));
        return candidates.find(el => el && el.offsetParent !== null) || null;
    }

    // Returns a Blob (PNG by default)
    async function capturePanelBlob(scaleInput) {
        const node = findTargetPanel();
        if (!node) throw new Error('Panel not found on page');

        // Default hi-res scale: devicePixelRatio*2 (min 3), capped to 4
        let scale = Number(scaleInput);
        if (!Number.isFinite(scale) || scale <= 0) {
            scale = Math.min(4, Math.max(3, (window.devicePixelRatio || 1) * 2));
        }

        await new Promise(r => setTimeout(r, 50)); // layout settle
        // properly access html2canvas from @require scope
        const canvas = await html2canvas(node, {
            backgroundColor: '#ffffff',
            scale,
            useCORS: true,
            logging: false
        });

        return new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/png'));
    }

    async function sendPanelImage(chatId, { asDocument = true, scale } = {}) {
        try {
            await sendChatAction(chatId, asDocument ? 'upload_document' : 'upload_photo');
            // await ensureHtml2Canvas(); // handled by @require
            const blob = await capturePanelBlob(scale);
            if (!blob) throw new Error('Failed to render panel');

            const fd = new FormData();
            fd.append('chat_id', String(chatId));
            fd.append('caption', `RESQ Panel • ${new Date().toLocaleTimeString()} • ${asDocument ? 'Full-Res' : 'Photo'}`);

            if (asDocument) {
                fd.append('document', blob, `panel-${Date.now()}.png`); // preserves full resolution (no Telegram photo compression)
                const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, { method: 'POST', body: fd });
                if (!resp.ok) throw new Error(`sendDocument HTTP ${resp.status}`);
            } else {
                fd.append('photo', blob, `panel-${Date.now()}.png`); // Telegram may compress
                const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: 'POST', body: fd });
                if (!resp.ok) throw new Error(`sendPhoto HTTP ${resp.status}`);
            }
        } catch (err) {
            console.error('sendPanelImage error:', err);
            await sendTelegramMessage(chatId, `⚠️ *Screenshot failed:* ${err.message}`);
        }
    }

    // ====== TELEGRAM LONG-POLL ======
    async function longPollTelegram() {
        if (isLongPolling) return;
        isLongPolling = true;

        while (isLongPolling) {
            try {
                telegramIcon.className = 'connecting';

                if (longPollController) {
                    longPollController.abort();
                }
                longPollController = new AbortController();

                const offset = lastProcessedUpdateId + 1;
                const timeout = 30;
                const limit = 100;

                const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=${timeout}&limit=${limit}`;
                const response = await fetch(url, {
                    signal: longPollController.signal,
                    headers: { 'Cache-Control': 'no-cache' }
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

                const data = await response.json();
                if (!data.ok) throw new Error(`Telegram API error: ${data.description || 'Unknown error'}`);

                telegramIcon.className = '';

                const updates = data.result || [];
                for (const update of updates) {
                    const updateId = update.update_id;
                    if (updateId <= lastProcessedUpdateId) continue;

                    const message = update.message;
                    if (!message) {
                        lastProcessedUpdateId = updateId;
                        localStorage.setItem('lastUpdateId', updateId.toString());
                        continue;
                    }

                    const rawText = (message.text || '').trim();
                    let [cmd, maybeScale] = rawText.split(/\s+/);
                    if (cmd) cmd = cmd.split('@')[0]; // Remove @botname suffix if present
                    const chatId = message.chat.id;

                    console.log(`Received Telegram command: ${rawText} from chat ${chatId}`);

                    if (cmd === '/update') {
                        const zones = getZoneSummary();
                        sendToTelegram(zones, chatId);

                    } else if (cmd === '/screenshot') {
                        // Full-res (as Document). Optional scale: "/screenshot 4"
                        await sendTelegramMessage(chatId, `📸 Capturing panel (full-res)…${maybeScale ? ' scale=' + maybeScale : ''}`);
                        await sendPanelImage(chatId, { asDocument: true, scale: maybeScale });

                    } else if (cmd === '/screenshot_photo') {
                        // Photo (Telegram compression). Optional scale: "/screenshot_photo 3"
                        await sendTelegramMessage(chatId, `📷 Capturing panel (photo)…${maybeScale ? ' scale=' + maybeScale : ''}`);
                        await sendPanelImage(chatId, { asDocument: false, scale: maybeScale });
                    }

                    lastProcessedUpdateId = updateId;
                    localStorage.setItem('lastUpdateId', updateId.toString());
                }

                if (isLongPolling) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

            } catch (error) {
                console.error('Long-polling error:', error);
                telegramIcon.className = 'error';
                if (isLongPolling) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        }
    }

    function stopLongPolling() {
        isLongPolling = false;
        if (longPollController) {
            longPollController.abort();
            longPollController = null;
        }
    }

    function startLongPolling() {
        if (!TELEGRAM_BOT_TOKEN) return; // Don't start if no token
        console.log('Starting Telegram long-polling...');
        longPollTelegram().catch(err => {
            console.error('Failed to start long-polling:', err);
            telegramIcon.className = 'error';
        });
    }

    // ====== SESSION KEEP-ALIVE ======
    function getPvId() {
        const el = document.querySelector('[id^="alert_"]');
        return el?.id?.replace("alert_", "") || null;
    }

    function startSessionKeepAlive() {
        const interval = 2 * 60 * 1000;
        setInterval(async () => {
            const pvId = getPvId();
            if (!pvId) return;

            try {
                const res = await fetch(`https://putrahis.hsaas.upm.edu.my/REST/ajaxShowZoneAlert.php?pvId=${pvId}`, {
                    credentials: "include"
                });
                const text = await res.text();

                if (text.toLowerCase().includes("login") || text.toLowerCase().includes("expired")) {
                    sessionIcon.classList.add("error");
                    location.reload();
                } else {
                    sessionIcon.classList.remove("error");
                    sessionIcon.style.animation = "blink 0.3s ease-out";
                }
            } catch (err) {
                sessionIcon.classList.add("error");
            }
        }, interval);
    }

    // ====== BOOTSTRAP ======
    window.addEventListener('beforeunload', () => {
        stopLongPolling();
    });

    function waitForTableThenStart() {
        const target = document.querySelector("table.table-hover tbody");
        if (!target) return setTimeout(waitForTableThenStart, 500);

        updatePanel();

        // Interval for updating panel AND syncing to cloud
        setInterval(() => {
            const zones = getZoneSummary(); // Re-calculate
            updatePanel(); // Update UI

            // Cloud Sync logic
            const currentJson = JSON.stringify(zones);
            if (currentJson !== lastSentJson) {
                console.log("Zone data changed, syncing to cloud... New:", currentJson);
                postToGoogleSheet(zones); // Sync to Cloud
                lastSentJson = currentJson;
            }
        }, 5000);


        // POLL for Remote Screenshot Requests (Every 6s)
        const processedRequests = new Set();
        setInterval(async () => {
            try {
                // 1. Check for requests
                const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=pollRequests`);
                const data = await res.json();

                if (data.status === 'success' && data.requests && data.requests.length > 0) {
                    // console.log("Found remote screenshot requests:", data.requests);

                    // 2. Process each request
                    for (const userId of data.requests) {
                        // Prevent infinite loop if server fails to clear request
                        if (processedRequests.has(userId)) continue;

                        console.log(`Processing screenshot for User: ${userId}...`);
                        processedRequests.add(userId); // Mark as processed locally

                        // Capture (using same logic as Telegram)
                        // await ensureHtml2Canvas(); // Removed: loaded via @require
                        const blob = await capturePanelBlob(2); // Scale 2

                        // Convert Blob to Base64
                        const reader = new FileReader();
                        reader.readAsDataURL(blob);
                        reader.onloadend = async () => {
                            const base64data = reader.result.split(',')[1]; // remove data:image/png;base64,

                            // 3. Upload to GAS
                            // Use text/plain to avoid CORS Preflight (OPTIONS) which GAS doesn't support
                            await fetch(GOOGLE_SCRIPT_URL, {
                                method: 'POST',
                                mode: 'no-cors',
                                headers: { "Content-Type": "text/plain" },
                                body: JSON.stringify({
                                    action: 'uploadScreenshot',
                                    userId: userId,
                                    image: base64data
                                })
                            });
                            console.log(`Uploaded screenshot for User: ${userId}`);
                        };
                    }
                }
            } catch (err) {
                console.error("Remote polling error:", err);
            }
        }, 6000);


        startLongPolling();

        startSessionKeepAlive();
        setInterval(() => location.reload(), 10 * 60 * 1000);
    }

    waitForTableThenStart();
})();
