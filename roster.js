// RESQ Roster Page Controller

document.addEventListener('DOMContentLoaded', () => {
  // Google Apps Script URL from REQUEST-APP
  const config = window.RESQ_CONFIG || {};
  const APPS_SCRIPT_URL = config.rosterGoogleAppsScriptUrl || "";
  const ROSTER_CACHE_KEY = 'resq_cache_masterRoster';
  const ROSTER_CACHE_TIMESTAMP_KEY = 'resq_cache_masterRoster_timestamp';

  // Selangor Public Holidays (2025-2026)
  const HOLIDAYS = {
    // 2025 Selangor Public Holidays
    '2025-01-01': "New Year's Day",
    '2025-01-29': "Chinese New Year",
    '2025-01-30': "Chinese New Year (Day 2)",
    '2025-02-11': "Thaipusam",
    '2025-03-18': "Nuzul Al-Quran",
    '2025-03-31': "Hari Raya Aidilfitri",
    '2025-04-01': "Hari Raya Aidilfitri (Day 2)",
    '2025-05-01': "Labour Day",
    '2025-05-12': "Wesak Day",
    '2025-06-02': "Agong's Birthday",
    '2025-06-07': "Hari Raya Haji",
    '2025-06-27': "Awal Muharram",
    '2025-08-31': "National Day",
    '2025-09-01': "National Day Replacement",
    '2025-09-05': "Maulidur Rasul",
    '2025-09-16': "Malaysia Day",
    '2025-10-20': "Deepavali",
    '2025-12-11': "Sultan of Selangor's Birthday",
    '2025-12-25': "Christmas Day",

    // 2026 Selangor Public Holidays
    '2026-01-01': "New Year's Day",
    '2026-02-01': "Thaipusam",
    '2026-02-02': "Thaipusam Holiday",
    '2026-02-17': "Chinese New Year",
    '2026-02-18': "Chinese New Year Holiday",
    '2026-03-07': "Nuzul Al-Quran",
    '2026-03-20': "Hari Raya Aidilfitri Holiday",
    '2026-03-21': "Hari Raya Aidilfitri",
    '2026-03-22': "Hari Raya Aidilfitri Holiday",
    '2026-03-23': "Hari Raya Aidilfitri Holiday",
    '2026-05-01': "Labour Day",
    '2026-05-27': "Hari Raya Haji",
    '2026-05-31': "Wesak Day",
    '2026-06-01': "Agong's Birthday",
    '2026-06-02': "Wesak Day Holiday",
    '2026-06-17': "Awal Muharram",
    '2026-08-25': "Maulidur Rasul",
    '2026-08-31': "National Day",
    '2026-09-16': "Malaysia Day",
    '2026-11-08': "Deepavali",
    '2026-11-09': "Deepavali Holiday",
    '2026-12-11': "Sultan of Selangor's Birthday",
    '2026-12-25': "Christmas Day",
  };

  // State Variables
  let masterRoster = [];
  let isSyncing = false;
  let activeMonth = ""; // Format: YYYY-MM
  let searchQuery = "";

  // Initialize Month to Current Date
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  activeMonth = currentMonthStr;

  // Cache loading
  const cachedRosterLoaded = loadCachedRoster();

  // DOM Elements
  const prevBtn = document.getElementById('prev-month-btn');
  const nextBtn = document.getElementById('next-month-btn');
  const currentBtn = document.getElementById('current-month-btn');
  const refreshBtn = document.getElementById('refresh-roster-btn');
  const syncStatus = document.getElementById('roster-sync-status');
  const monthLabel = document.getElementById('active-month-label');
  const tableContainer = document.getElementById('table-container');

  // Event Listeners
  if (prevBtn) prevBtn.addEventListener('click', handlePrevMonth);
  if (nextBtn) nextBtn.addEventListener('click', handleNextMonth);
  if (currentBtn) currentBtn.addEventListener('click', handleCurrentMonth);
  if (refreshBtn) refreshBtn.addEventListener('click', fetchRosterData);

  const searchInput = document.getElementById('roster-doctor-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      render();
    });
  }

  // Initial render with cached data (if available) and background fetch
  render();
  if (cachedRosterLoaded) {
    setSyncStatus(`Showing cached roster from ${formatStatusTime(getCachedRosterTimestamp())}`);
  }
  fetchRosterData();

  // Functions
  function formatStatusTime(timestamp) {
    const date = new Date(Number(timestamp) || Date.now());
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function setSyncStatus(message) {
    if (syncStatus) syncStatus.textContent = message;
  }

  function getCachedRosterTimestamp() {
    try {
      return localStorage.getItem(ROSTER_CACHE_TIMESTAMP_KEY);
    } catch (e) {
      return null;
    }
  }

  function loadCachedRoster() {
    try {
      const cachedRoster = localStorage.getItem(ROSTER_CACHE_KEY);
      if (cachedRoster) {
        const parsedRoster = JSON.parse(cachedRoster);
        if (Array.isArray(parsedRoster)) {
          masterRoster = parsedRoster;
          return masterRoster.length > 0;
        }
      }
    } catch (e) {
      console.warn("Failed to load cached masterRoster:", e);
    }
    return false;
  }

  function saveRosterCache(roster, timestamp) {
    try {
      localStorage.setItem(ROSTER_CACHE_KEY, JSON.stringify(roster));
      localStorage.setItem(ROSTER_CACHE_TIMESTAMP_KEY, String(timestamp || Date.now()));
    } catch (e) {
      console.warn("Failed to save cached masterRoster:", e);
    }
  }

  async function fetchRosterData() {
    if (isSyncing) return;

    isSyncing = true;
    if (refreshBtn) refreshBtn.disabled = true;
    showLoadingState();

    try {
      if (!APPS_SCRIPT_URL) throw new Error("Roster Google Apps Script URL is not configured");

      const response = await fetch(`${APPS_SCRIPT_URL}?action=alldata`);
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      const updatedAt = Date.now();

      if (data && typeof data === 'object' && Array.isArray(data.masterRoster)) {
        masterRoster = data.masterRoster || [];
        // Save to cache
        saveRosterCache(masterRoster, updatedAt);
      } else if (Array.isArray(data)) {
        // Fallback if Apps Script returns only masterRoster directly
        masterRoster = data;
        saveRosterCache(masterRoster, updatedAt);
      } else {
        throw new Error("Invalid roster data format received from server");
      }
      
      render();
      setSyncStatus(`Roster updated ${formatStatusTime(updatedAt)}`);
    } catch (error) {
      console.error("Failed to fetch roster data:", error);
      if (masterRoster.length === 0) {
        showErrorState("Could not synchronize roster data. Please check your network connection.");
      } else {
        // Render cached data but log error
        render();
        setSyncStatus("Offline / cached roster");
        console.warn("Displaying cached roster due to fetch failure.");
      }
    } finally {
      isSyncing = false;
      if (refreshBtn) refreshBtn.disabled = false;
    }
  }

  function handlePrevMonth() {
    let [year, month] = activeMonth.split('-').map(Number);
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    activeMonth = `${year}-${String(month).padStart(2, '0')}`;
    render();
  }

  function handleNextMonth() {
    let [year, month] = activeMonth.split('-').map(Number);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    activeMonth = `${year}-${String(month).padStart(2, '0')}`;
    render();
  }

  function handleCurrentMonth() {
    activeMonth = currentMonthStr;
    render();
  }

  function getDaysInMonthList(year, month) {
    const date = new Date(year, month - 1, 1);
    const list = [];
    while (date.getMonth() === month - 1) {
      const dayNum = date.getDate();
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(dayNum).padStart(2, '0');
      const fullDateStr = `${yyyy}-${mm}-${dd}`;
      list.push({ dayNum, dayName, dateStr: fullDateStr });
      date.setDate(date.getDate() + 1);
    }
    return list;
  }

  function toIsoDate(dateLike) {
    if (!dateLike) return null;
    if (typeof dateLike === 'string' && dateLike.includes('/')) {
      const [day, month, year] = dateLike.split(/[\\/]/);
      if (day && month && year) {
        const mm = month.padStart(2, '0');
        const dd = day.padStart(2, '0');
        return `${year}-${mm}-${dd}`;
      }
    }
    const date = new Date(dateLike);
    if (Number.isNaN(date.getTime())) return null;
    const mm = `${date.getMonth() + 1}`.padStart(2, '0');
    const dd = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${mm}-${dd}`;
  }

  function mapName(name) {
    if (!name) return '';
    const upper = String(name).trim().toUpperCase();
    if (upper === 'SYU') return 'SYUHADA';
    return String(name).trim();
  }

  function isNightShift(shiftName) {
    const up = String(shiftName || '').trim().toUpperCase();
    return up === 'NIGHT' || up === 'N' || up.includes('NIGHT') || up === 'ON' || up === 'ON1' || up === 'ON2';
  }

  function parseShiftValue(rawVal) {
    if (!rawVal) return { cleanShift: '', isStandby: false, isExtended: false };
    const str = String(rawVal).trim().toUpperCase();
    const isStandby = str.endsWith('(S)') || str.endsWith('-S') || str.includes('(S)');
    const isExtended = str.endsWith('(X)') || str.endsWith('-X') || str.includes('(X)');
    const cleanShift = str
      .replace(/\(S\)/g, '')
      .replace(/-S/g, '')
      .replace(/\(X\)/g, '')
      .replace(/-X/g, '')
      .trim();
    return { cleanShift, isStandby, isExtended };
  }

  function showLoadingState() {
    if (masterRoster.length === 0 && tableContainer) {
      tableContainer.innerHTML = `
        <div class="loader-container">
          <div class="spinner"></div>
          <p>Loading roster schedule...</p>
        </div>
      `;
    }
  }

  function showErrorState(message) {
    if (tableContainer) {
      tableContainer.innerHTML = `
        <div class="error-container">
          <h3>Sync Failed</h3>
          <p>${message}</p>
          <button class="control-btn" style="margin-top: 1rem;" id="retry-btn">Retry</button>
        </div>
      `;
      const retryBtn = document.getElementById('retry-btn');
      if (retryBtn) retryBtn.addEventListener('click', fetchRosterData);
    }
  }

  function render() {
    const [year, month] = activeMonth.split('-').map(Number);
    const dateObj = new Date(year, month - 1, 1);
    const labelText = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
    
    if (monthLabel) {
      monthLabel.textContent = labelText;
    }

    const daysList = getDaysInMonthList(year, month);
    
    // Group masterRoster by Date and Shift
    const rosterGrid = {};
    const doctorRosterMap = {};

    masterRoster.forEach((row) => {
      const rawDate = row.Date || row.date;
      const dateStr = toIsoDate(rawDate);
      const nameRaw = mapName(row.Name || row.name || '');
      const shiftVal = row.Shift || row.shift;

      if (!dateStr || !nameRaw || !shiftVal) return;

      const name = String(nameRaw).trim();
      const shiftRaw = String(shiftVal).trim().toUpperCase();
      const nameKey = name.toLowerCase();

      // Store in doctorRosterMap for standby/extended lookup
      if (!doctorRosterMap[nameKey]) {
        doctorRosterMap[nameKey] = {};
      }
      doctorRosterMap[nameKey][dateStr] = shiftRaw;

      // Group into shifts
      let shiftCol = '';
      if (shiftRaw === 'AM' || shiftRaw.includes('AM')) shiftCol = 'AM';
      else if (shiftRaw === 'PM' || shiftRaw.includes('PM')) shiftCol = 'PM';
      else if (isNightShift(shiftRaw)) shiftCol = 'NIGHT';
      else if (shiftRaw === 'EP_OFFICE_HOUR') shiftCol = 'EP_OFFICE_HOUR';
      else if (shiftRaw === 'EP_ONCALL') shiftCol = 'EP_ONCALL';

      if (shiftCol) {
        if (!rosterGrid[dateStr]) {
          rosterGrid[dateStr] = { AM: [], PM: [], NIGHT: [], EP_OFFICE_HOUR: [], EP_ONCALL: [] };
        }
        if (!rosterGrid[dateStr][shiftCol].includes(name)) {
          rosterGrid[dateStr][shiftCol].push(name);
        }
      }
    });

    // Build Table HTML
    let tableHtml = `
      <div class="roster-card">
        <div class="roster-table-wrapper">
          <table class="roster-table">
            <thead>
              <tr class="header-row-1">
                <th rowspan="2" class="col-date">DATE</th>
                <th rowspan="2" class="col-day">DAY</th>
                <th colspan="3">MEDICAL OFFICER</th>
                <th colspan="2" class="ep-header-bg-1">EMERGENCY PHYSICIAN</th>
              </tr>
              <tr class="header-row-2">
                <th class="col-shift">AM</th>
                <th class="col-shift">PM</th>
                <th class="col-shift">NIGHT</th>
                <th class="col-ep ep-header-bg-2">OFFICE HOUR</th>
                <th class="col-ep ep-header-bg-2">ON CALL</th>
              </tr>
            </thead>
            <tbody>
    `;

    const systemTodayStr = toIsoDate(new Date());
    let mobileAgendaHtml = '';

    function renderDoctorChips(doctors, dateStr, isEp = false) {
      if (!doctors || doctors.length === 0) {
        return `<span class="empty-cell-dash">-</span>`;
      }

      return doctors.map((doc) => {
        const isMatch = searchQuery && doc.toLowerCase().includes(searchQuery);
        const highlightClass = isMatch ? ' highlighted' : '';

        if (!isEp) {
          return `
            <span class="doctor-chip${highlightClass}">
              <span>${doc}</span>
            </span>
          `;
        }

        let formattedName = `<span>${doc}</span>`;
        const docUpper = doc.toUpperCase().trim();
        if (docUpper.startsWith('DR. ')) {
          formattedName = `<span>DR.</span><br><span>${doc.trim().substring(4)}</span>`;
        } else if (docUpper.startsWith('DR ')) {
          formattedName = `<span>DR</span><br><span>${doc.trim().substring(3)}</span>`;
        }

        return `
          <span class="doctor-chip ep-doctor-chip${highlightClass}">
            ${formattedName}
          </span>
        `;
      }).join('');
    }

    daysList.forEach(({ dayNum, dayName, dateStr }) => {
      const isWeekend = dayName === 'SAT' || dayName === 'SUN';
      const isToday = dateStr === systemTodayStr;
      const holidayName = HOLIDAYS[dateStr] || '';
      const isHoliday = !!holidayName;

      let rowClass = '';
      if (isToday) rowClass = 'row-today';
      else if (isHoliday) rowClass = 'row-holiday';
      else if (isWeekend) rowClass = 'row-weekend';

      const dayAssignments = rosterGrid[dateStr] || { AM: [], PM: [], NIGHT: [], EP_OFFICE_HOUR: [], EP_ONCALL: [] };

      mobileAgendaHtml += `
        <article class="roster-agenda-row ${rowClass}">
          <div class="roster-agenda-date">
            <span class="agenda-day-num">${dayNum}</span>
            <span class="agenda-day-name" title="${holidayName}">${dayName}</span>
            ${isToday ? '<span class="today-label">TODAY</span>' : ''}
            ${isHoliday ? `<span class="holiday-label" title="${holidayName}">${holidayName}</span>` : ''}
          </div>
          <div class="roster-agenda-shifts">
            <div class="agenda-shift"><span class="agenda-shift-label">AM</span><div class="doctor-chips-container">${renderDoctorChips(dayAssignments.AM, dateStr)}</div></div>
            <div class="agenda-shift"><span class="agenda-shift-label">PM</span><div class="doctor-chips-container">${renderDoctorChips(dayAssignments.PM, dateStr)}</div></div>
            <div class="agenda-shift"><span class="agenda-shift-label">N</span><div class="doctor-chips-container">${renderDoctorChips(dayAssignments.NIGHT, dateStr)}</div></div>
            <div class="agenda-shift ep-agenda-shift"><span class="agenda-shift-label">EP OH</span><div class="doctor-chips-container">${renderDoctorChips(dayAssignments.EP_OFFICE_HOUR, dateStr, true)}</div></div>
            <div class="agenda-shift ep-agenda-shift"><span class="agenda-shift-label">EP OC</span><div class="doctor-chips-container">${renderDoctorChips(dayAssignments.EP_ONCALL, dateStr, true)}</div></div>
          </div>
        </article>
      `;

      tableHtml += `<tr class="${rowClass}">`;
      
      // Date Cell
      tableHtml += `<td class="col-date">`;
      tableHtml += `<span>${dayNum}</span>`;
      if (isToday) {
        tableHtml += `<span class="today-label">TODAY</span>`;
      } else if (isHoliday) {
        tableHtml += `<span class="holiday-label" title="${holidayName}">PH</span>`;
      }
      tableHtml += `</td>`;

      // Day Cell
      tableHtml += `<td class="col-day" title="${holidayName}">`;
      tableHtml += `<span>${dayName}</span>`;
      if (isHoliday) {
        tableHtml += `<span class="holiday-label" title="${holidayName}">${holidayName}</span>`;
      }
      tableHtml += `</td>`;

      // MO Shifts (AM, PM, NIGHT)
      ['AM', 'PM', 'NIGHT'].forEach((shiftKey) => {
        tableHtml += `<td><div class="doctor-chips-container">`;
        const doctors = dayAssignments[shiftKey];
        if (doctors && doctors.length > 0) {
          doctors.forEach((doc) => {
            tableHtml += renderDoctorChips([doc], dateStr);
          });
        } else {
          tableHtml += `<span class="empty-cell-dash">-</span>`;
        }
        tableHtml += `</div></td>`;
      });

      // EP Shifts (EP_OFFICE_HOUR, EP_ONCALL)
      ['EP_OFFICE_HOUR', 'EP_ONCALL'].forEach((shiftKey) => {
        tableHtml += `<td class="ep-cell"><div class="doctor-chips-container">`;
        const doctors = dayAssignments[shiftKey];
        if (doctors && doctors.length > 0) {
          doctors.forEach((doc) => {
            tableHtml += renderDoctorChips([doc], dateStr, true);
          });
        } else {
          tableHtml += `<span class="empty-cell-dash">-</span>`;
        }
        tableHtml += `</div></td>`;
      });

      tableHtml += `</tr>`;
    });

    tableHtml += `
            </tbody>
          </table>
        </div>
        <div class="roster-mobile-agenda">
          ${mobileAgendaHtml}
        </div>
      </div>
    `;

    if (tableContainer) {
      tableContainer.innerHTML = tableHtml;
    }
  }
});
