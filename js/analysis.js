// CONFIG
const OCM_KEY = "e52e0fe4-6d46-48db-b854-707e9007dce1";
const OCM_URL = `https://api.openchargemap.io/v3/poi/?output=json&maxresults=8000&compact=false&verbose=true&key=${OCM_KEY}`;

// ==========================================
// SWEETALERT OVERRIDE (Upgrades all default alerts)
// ==========================================
window.alert = function(message) {
    Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: message,
        confirmButtonColor: '#3498db',
        confirmButtonText: 'Got it'
    });
};

// State
let stations = [];
let filteredStations = [];
let currentPage = 1;
const PER_PAGE = 9; // 3x3 grid

// ==== Top cards ====
// Total users from your controller
fetch("../controller/getUserInfo.php")
    .then(r => r.json())
    .then(data => {
        const el = document.getElementById("total-users");
        if (data && typeof data.total_users !== "undefined") el.innerText = `${data.total_users} Users`;
        else el.innerText = "Users: N/A";
    })
    .catch(err => {
        console.error("User fetch error", err);
        document.getElementById("total-users").innerText = "Users: Error";
    });

// Fake rotating usage with bigger set
const usageBrands = [
    "Tesla", "ChargeSini", "Shell Recharge", "BMW Charging", "EV Connect",
    "ChargePoint", "Electrify America", "BP Pulse", "IONITY", "EVgo",
    "Greenlots", "Blink", "EVBox", "Enel X", "Octopus"
];
let usageIndex = 0;
function rotateUsage() {
    const el = document.getElementById("total-usage");
    if (!el) return;
    el.innerText = `Top Provider: ${usageBrands[usageIndex]}`;
    usageIndex = (usageIndex + 1) % usageBrands.length;
}
rotateUsage();
setInterval(rotateUsage, 2500);

const malaysiaModal = document.getElementById("malaysia-report-modal");
const malaysiaBtn = document.getElementById("malaysia-report-btn");
const malaysiaDateInputs = document.getElementById("malaysia-date-inputs");
const malaysiaPeriod = document.getElementById("malaysia-period");

function updateResultCount() {
    const total = filteredStations.length;
    const start = (currentPage - 1) * PER_PAGE + 1;
    const end = Math.min(currentPage * PER_PAGE, total);

    const el = document.getElementById("result-count");

    if (total === 0) {
        el.textContent = "No stations found.";
    } else {
        el.textContent = `Showing ${start}-${end} of ${total} stations`;
    }
}

async function loadStations() {
    try {
        // 1️⃣ Malaysia stations
        const resMY = await fetch(
            `https://api.openchargemap.io/v3/poi/?output=json&countrycode=MY&maxresults=8000&compact=false&verbose=true&key=${OCM_KEY}`
        );
        const dataMY = await resMY.json();

        // 2️⃣ Other countries stations (exclude MY)
        const resOther = await fetch(
            `https://api.openchargemap.io/v3/poi/?output=json&maxresults=15000&compact=false&verbose=true&key=${OCM_KEY}`
        );
        const dataOther = await resOther.json();

        const malaysiaStations = Array.isArray(dataMY) ? dataMY : [];

        const otherStations = Array.isArray(dataOther)
            ? dataOther.filter(s => s.AddressInfo?.Country?.ISOCode !== "MY")
            : [];

        // 3️⃣ Combine → Malaysia first
        stations = [...malaysiaStations, ...otherStations];

        filteredStations = stations.slice();

        document.getElementById("total-worldwide").innerText =
            `${stations.length} Stations (World-Wide)`;

        populateCountryDropdown();
        renderStationsPage(1);

    } catch (err) {
        console.error("Error loading OCM stations:", err);
        alert("Failed to load OpenChargeMap data.");
        document.getElementById("total-worldwide").innerText = "Stations: Error";
    }
}

// Malaysia Card: Get Malaysia station count directly (not from worldwide array)
async function updateMalaysiaCard() {
    try {
        const res = await fetch(
            `https://api.openchargemap.io/v3/poi/?output=json&countrycode=MY&compact=false&verbose=true&key=${OCM_KEY}&maxresults=7000`
        );
        const data = await res.json();
        const malaysiaCount = Array.isArray(data) ? data.length : 0;

        // Keep the Report button always visible
        const malaysiaCard = document.getElementById("total-malaysia");
        malaysiaCard.innerHTML = `
            ${malaysiaCount} Stations (Malaysia)
            <button id="malaysia-report-btn" class="malaysia-report-btn">Report</button>
        `;

        // Reattach the click handler since we replaced the button
        const malaysiaBtn = document.getElementById("malaysia-report-btn");
        if (malaysiaBtn) {
            malaysiaBtn.addEventListener("click", () => {
                malaysiaModal.style.display = "block";
                malaysiaModal.setAttribute("aria-hidden", "false");
            });
        }

    } catch (err) {
        console.error("Malaysia count error:", err);
        const malaysiaCard = document.getElementById("total-malaysia");
        malaysiaCard.innerHTML = `
            Stations (Malaysia): Error
            <button id="malaysia-report-btn" class="malaysia-report-btn">Report</button>
        `;
    }
}

// initial load
loadStations().then(updateMalaysiaCard);

// Build unique country list (from stations) then fill dropdown
function populateCountryDropdown() {
    const select = document.getElementById("filter-country");
    select.innerHTML = `<option value="">All Countries</option>`;

    const countryMap = new Map();
    stations.forEach(s => {
        const c = s.AddressInfo?.Country;
        if (c && c.ISOCode) countryMap.set(c.ISOCode, c.Title);
    });

    // Sort by country name
    const entries = Array.from(countryMap.entries()).sort((a,b) => a[1].localeCompare(b[1]));
    entries.forEach(([iso, title]) => {
        const opt = document.createElement("option");
        opt.value = iso;
        opt.textContent = `${title} (${iso})`;
        select.appendChild(opt);
    });
}

// Populate states dropdown based on selected country
function populateStateDropdown(countryIso) {
    const stateSel = document.getElementById("filter-state");
    stateSel.innerHTML = `<option value="">All States</option>`;

    if (!countryIso) return;

    const states = new Set();
    stations.forEach(s => {
        const cIso = s.AddressInfo?.Country?.ISOCode;
        if (!cIso) return;
        if (cIso.toUpperCase() !== countryIso.toUpperCase()) return;
        const st = s.AddressInfo?.StateOrProvince;
        if (st) states.add(st);
    });

    Array.from(states).sort().forEach(st => {
        const opt = document.createElement("option");
        opt.value = st;
        opt.textContent = st;
        stateSel.appendChild(opt);
    });
}

// Filter logic and render
function applyFilters() {
    const country = document.getElementById("filter-country").value;
    const state = document.getElementById("filter-state").value;
    const q = document.getElementById("filter-search").value.trim().toLowerCase();

    filteredStations = stations.filter(s => {
        const ai = s.AddressInfo || {};
        if (country) {
            if ((ai.Country?.ISOCode || "").toUpperCase() !== country.toUpperCase()) return false;
        }
        if (state) {
            if (!ai.StateOrProvince) return false;
            if (!ai.StateOrProvince.toLowerCase().includes(state.toLowerCase())) return false;
        }
        if (q) {
            const hay = (
                (ai.Title || "") + " " +
                (ai.AddressLine1 || "") + " " +
                (ai.Town || "") + " " +
                (ai.StateOrProvince || "") + " " +
                (ai.Country?.Title || "")
            ).toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });

    currentPage = 1;
    renderStationsPage(currentPage);
}

// Clear filters
function clearFilters() {
    document.getElementById("filter-country").value = "";
    document.getElementById("filter-state").innerHTML = `<option value="">All States</option>`;
    document.getElementById("filter-search").value = "";
    filteredStations = stations.slice();
    currentPage = 1;
    renderStationsPage(currentPage);
}

// Render a page (cards)
function renderStationsPage(page) {
    const container = document.getElementById("stations-container");
    container.innerHTML = "";

    const start = (page - 1) * PER_PAGE;
    const slice = filteredStations.slice(start, start + PER_PAGE);

    if (slice.length === 0) {
        container.innerHTML = `<div class="no-results">No stations to show for selected filters.</div>`;
    }

    slice.forEach(station => {
        const ai = station.AddressInfo || {};
        const title = ai.Title || "Unknown Station";
        const town = ai.Town || "-";
        const state = ai.StateOrProvince || "-";
        const postcode = ai.Postcode || "-";
        const country = ai.Country?.Title || "-";
        const operator = station.OperatorInfo?.Title || "-";
        const usage = station.UsageType?.Title || "-";
        const status = station.StatusType?.Title || "-";
        const connectors = Array.isArray(station.Connections) ? station.Connections.length : 0;
        const points = station.NumberOfPoints || "-";
        const lat = ai.Latitude || "-";
        const lon = ai.Longitude || "-";

        const card = document.createElement("div");
        card.className = "station-card";

        // connectors summary string
        const connSummary = (station.Connections || []).map(c => {
            const name = c.ConnectionType?.Title || c.ConnectionTypeID || "Unknown";
            const power = (typeof c.PowerKW === "number") ? `${c.PowerKW} kW` : "";
            return `${name}${power ? ` (${power})` : ''}`;
        }).join(", ");

        card.innerHTML = `
            <div class="card-head">
                <h3 class="station-title">${escapeHtml(title)}</h3>
                <div class="station-actions">
                    <button class="btn-report" data-id="${station.ID}">Report</button>
                    <button class="btn-data" data-id="${station.ID}">Data</button>
                </div>
            </div>

            <div class="station-body">
                <p><strong>Address:</strong> ${escapeHtml(ai.AddressLine1 || "-")}</p>
                <p><strong>Town:</strong> ${escapeHtml(town)} &nbsp; <strong>State:</strong> ${escapeHtml(state)}</p>
                <p><strong>Postcode:</strong> ${escapeHtml(postcode)} &nbsp; <strong>Country:</strong> ${escapeHtml(country)}</p>
                <p><strong>Operator:</strong> ${escapeHtml(operator)}</p>
                <p><strong>Usage:</strong> ${escapeHtml(usage)} &nbsp; <strong>Status:</strong> ${escapeHtml(status)}</p>
                <p><strong>Connectors:</strong> ${connectors} &nbsp; <strong>Points:</strong> ${points}</p>
                <p class="small"><strong>Connectors details:</strong> ${escapeHtml(connSummary || "-")}</p>
                <p class="small"><strong>Lat / Lon:</strong> ${lat} / ${lon}</p>
            </div>
        `;

        // report button handler
        card.querySelector(".btn-report").addEventListener("click", () => openReportModal(station));

        // data button handler
        card.querySelector(".btn-data").addEventListener("click", () => openDataModal(station));
        container.appendChild(card);
    });

    renderPagination(filteredStations.length, page, PER_PAGE);
    updateResultCount();
}

// Pagination render
function renderPagination(total, page, perPage) {
    const pagination = document.getElementById("pagination");
    pagination.innerHTML = "";
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    const prev = document.createElement("button");
    prev.textContent = "Prev";
    prev.disabled = page <= 1;
    prev.addEventListener("click", () => {
        if (page > 1) {
            currentPage--;
            renderStationsPage(currentPage);
        }
    });

    const info = document.createElement("span");
    info.className = "page-info";
    info.textContent = `Page ${page} of ${totalPages}`;

    const next = document.createElement("button");
    next.textContent = "Next";
    next.disabled = page >= totalPages;
    next.addEventListener("click", () => {
        if (page < totalPages) {
            currentPage++;
            renderStationsPage(currentPage);
        }
    });

    pagination.appendChild(prev);
    pagination.appendChild(info);
    pagination.appendChild(next);
}

// Simple escape for HTML injection safety (small)
function escapeHtml(str) {
    if (str === null || typeof str === "undefined") return "";
    return String(str).replace(/[&<>"'`=\/]/g, s => ({
        "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;","/":"&#x2F;","`":"&#x60;","=":"&#x3D;"
    }[s]));
}

// ===== Report modal logic =====
const modal = document.getElementById("report-modal");
const modalBody = document.getElementById("report-body");
const modalTitle = document.getElementById("report-title");
const printArea = document.getElementById("printable-area");

function openReportModal(station) {
    // Populate report body
    const ai = station.AddressInfo || {};
    modalTitle.textContent = `Report: ${ai.Title || "Unknown"}`;
    const connectorsHTML = (station.Connections || []).map((c, idx) => {
        const name = c.ConnectionType?.Title || "Unknown";
        const power = (typeof c.PowerKW === "number") ? `${c.PowerKW} kW` : "—";
        const qty = c.Quantity || 1;
        return `<li><strong>#${idx+1}</strong> ${escapeHtml(name)} — Power: ${power} — Qty: ${qty}</li>`;
    }).join("");

    // Fake usage stats (randomized) — keeps structure so you can replace with real data later
    const fakeTotalUsers = Math.floor(Math.random()*200) + 1;
    const perConnector = (station.Connections || []).map(() => Math.floor(Math.random()*fakeTotalUsers));

    const perConnHTML = perConnector.map((v, i) => `<li>Connector ${i+1}: ${v} sessions / day </li>`).join("");

    modalBody.innerHTML = `
        <div class="report-station-info">
            <p><strong>Name:</strong> ${escapeHtml(ai.Title || "-")}</p>
            <p><strong>Address:</strong> ${escapeHtml(ai.AddressLine1 || "-")}, ${escapeHtml(ai.Town || "")}</p>
            <p><strong>Country:</strong> ${escapeHtml(ai.Country?.Title || "-")} &nbsp; <strong>State:</strong> ${escapeHtml(ai.StateOrProvince || "-")}</p>
            <p><strong>Lat/Lon:</strong> ${ai.Latitude || "-"} / ${ai.Longitude || "-"}</p>
        </div>

        <div class="report-connectors">
            <h4>Connectors</h4>
            <ul>${connectorsHTML || "<li>No connector info</li>"}</ul>
        </div>

        <div class="report-usage">
            <h4>Usage :</h4>
            <p>Projected sessions today : <strong>${fakeTotalUsers}</strong></p>
            <ul>${perConnHTML}</ul>
        </div>
    `;

    // Save station for printing context
    modal.dataset.stationId = station.ID;

    // show modal
    modal.style.display = "block";
    modal.setAttribute("aria-hidden", "false");
}

// Close modal
document.getElementById("close-report").addEventListener("click", () => {
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
});

// Clicking outside modal closes
window.addEventListener("click", e => {
    if (e.target === modal) {
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
    }
});

// ===== Dynamic date input fields =====
const dateInputs = document.getElementById("date-inputs");
const periodSelect = document.getElementById("report-period");

// Generate year options (last 5 years up to current year)
function generateYearOptions() {
    const now = new Date();
    const currentYear = now.getFullYear();
    let opts = "";
    for (let y = currentYear; y >= currentYear - 5; y--) {
        opts += `<option value="${y}">${y}</option>`;
    }
    return opts;
}

// Keep year dropdowns valid (for yearly report)
function syncYearDropdowns() {
    const startSel = document.getElementById("report-year-start");
    const endSel = document.getElementById("report-year-end");
    if (!startSel || !endSel) return;

    startSel.addEventListener("change", () => {
        if (parseInt(startSel.value) > parseInt(endSel.value)) {
            endSel.value = startSel.value; // auto-fix
        }
    });

    endSel.addEventListener("change", () => {
        if (parseInt(endSel.value) < parseInt(startSel.value)) {
            startSel.value = endSel.value; // auto-fix
        }
    });
}

periodSelect.addEventListener("change", () => {
    const value = periodSelect.value;
    dateInputs.innerHTML = ""; // reset

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    if (value === "day") {
        dateInputs.innerHTML = `<input type="date" id="report-date" max="${today}">`;
    }
    else if (value === "week") {
        dateInputs.innerHTML = `
            <label>Start:</label><input type="date" id="report-week-start" max="${today}">
            <label>End:</label><input type="date" id="report-week-end" max="${today}">
        `;
    }
    else if (value === "month") {
        dateInputs.innerHTML = `
            <select id="report-month">
                ${[...Array(12).keys()].map(m =>
            `<option value="${m+1}">${new Date(0, m).toLocaleString('default',{month:'long'})}</option>`
        ).join("")}
            </select>
            <select id="report-year">${generateYearOptions()}</select>
        `;
    }
    else if (value === "year") {
        dateInputs.innerHTML = `
        <label>From:</label><select id="report-year-start">${generateYearOptions()}</select>
        <label>To:</label><select id="report-year-end">${generateYearOptions()}</select>
    `;
        syncYearDropdowns(); // ✅ call helper after rendering
    }
});

// Print Report (simplest)
document.getElementById("print-report").addEventListener("click", () => {
    const period = periodSelect.value;
    if (!period) return alert("Please select a period before printing.");

    // Validate required date inputs
    if (period === "day" && !document.getElementById("report-date")?.value) {
        alert("Please select a date before printing.");
        return;
    }
    if (period === "week" && (!document.getElementById("report-week-start")?.value || !document.getElementById("report-week-end")?.value)) {
        alert("Please select a start and end date for the week.");
        return;
    }
    if (period === "month" && (!document.getElementById("report-month")?.value || !document.getElementById("report-year")?.value)) {
        alert("Please select a month and year.");
        return;
    }
    if (period === "year" && (!document.getElementById("report-year-start")?.value || !document.getElementById("report-year-end")?.value)) {
        alert("Please select a year range.");
        return;
    }

    if (!modalBody.innerHTML) return alert("Nothing to print");

    const title = modalTitle.textContent;
    const summary = `<p><strong>Report Type:</strong> Station Specific Details</p>`;
    printProfessionalReport(title, period, summary, modalBody.innerHTML);
});

// Print Data (with chart)
document.getElementById("print-data").addEventListener("click", () => {
    const period = dataPeriodSelect.value;
    if (!period) return alert("Please select a period before printing.");

    if (!dataBody.innerHTML.trim()) return alert("No data available to print.");

    // Extra validation for each period
    if (period === "day") {
        const d = document.getElementById("data-date")?.value;
        if (!d) { alert("Please select a date."); return; }
    }
    else if (period === "week") {
        const ws = document.getElementById("data-week-start")?.value;
        const we = document.getElementById("data-week-end")?.value;
        if (!ws || !we) { alert("Please select both start and end week."); return; }
    }
    else if (period === "month") {
        const m = document.getElementById("data-month")?.value;
        const y = document.getElementById("data-year")?.value;
        if (!m || !y) { alert("Please select both month and year."); return; }
    }
    else if (period === "year") {
        const ys = document.getElementById("data-year-start")?.value;
        const ye = document.getElementById("data-year-end")?.value;
        if (!ys || !ye) { alert("Please select both start and end year."); return; }
    }

    // Convert chart canvas to an image tag
    const canvas = document.getElementById("dataUsageChart");
    let chartHTML = "";
    if (canvas) {
        try {
            const imgData = canvas.toDataURL("image/png");
            chartHTML = `<img src="${imgData}" alt="Data Chart">`;
        } catch (e) { console.error("Chart export failed:", e); }
    }

    const title = dataTitle.textContent;
    const summary = `<p><strong>Report Type:</strong> Usage & Revenue Analytics</p>`;
    // Combine the text body and the chart image
    const content = dataBody.innerHTML + chartHTML;

    // Pass to master function
    printProfessionalReport(title, period, summary, content);
});

// ===== Data modal logic =====
const dataModal = document.getElementById("data-modal");
const dataBody = document.getElementById("data-body");
const dataTitle = document.getElementById("data-title");
const dataDateInputs = document.getElementById("data-date-inputs");
const dataPeriodSelect = document.getElementById("data-period");

// ===== Dynamic date input fields for Data modal =====
dataPeriodSelect.addEventListener("change", () => {
    const value = dataPeriodSelect.value;
    dataDateInputs.innerHTML = ""; // reset

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    if (value === "day") {
        dataDateInputs.innerHTML = `<input type="date" id="data-date" max="${today}">`;
    } else if (value === "week") {
        dataDateInputs.innerHTML = `
            <label>Start:</label><input type="date" id="data-week-start" max="${today}">
            <label>End:</label><input type="date" id="data-week-end" max="${today}">
        `;
    } else if (value === "month") {
        dataDateInputs.innerHTML = `
            <select id="data-month">
                ${[...Array(12).keys()].map(m =>
            `<option value="${m+1}">${new Date(0, m).toLocaleString('default',{month:'long'})}</option>`
        ).join("")}
            </select>
            <select id="data-year">${generateYearOptions()}</select>
        `;
    } else if (value === "year") {
        dataDateInputs.innerHTML = `
            <label>From:</label><select id="data-year-start">${generateYearOptions()}</select>
            <label>To:</label><select id="data-year-end">${generateYearOptions()}</select>
        `;

        // sync year dropdowns after rendering
        const startSel = document.getElementById("data-year-start");
        const endSel = document.getElementById("data-year-end");
        if (startSel && endSel) {
            startSel.addEventListener("change", () => {
                if (+startSel.value > +endSel.value) endSel.value = startSel.value;
            });
            endSel.addEventListener("change", () => {
                if (+endSel.value < +startSel.value) startSel.value = endSel.value;
            });
        }
    }
});

// Open Data Modal
function openDataModal(station) {
    const ai = station.AddressInfo || {};
    dataTitle.textContent = ai.Title || "Unknown Station";

    // Reset previous chart if exists
    dataBody.innerHTML = `
        <p><strong>Location:</strong> ${escapeHtml(ai.Title || "-")}</p>
        <p><strong>Address:</strong> ${escapeHtml(ai.AddressLine1 || "-")}, ${escapeHtml(ai.Town || "-")}</p>
        <p><strong>Country/State:</strong> ${escapeHtml(ai.Country?.Title || "-")} / ${escapeHtml(ai.StateOrProvince || "-")}</p>
        <p><strong>Lat/Lon:</strong> ${ai.Latitude || "-"} / ${ai.Longitude || "-"}</p>
        <canvas id="dataUsageChart" width="600" height="300"></canvas>
        <div id="dataKPI" style="margin-top:12px; font-weight:bold;"></div>
    `;

    dataModal.style.display = "block";
    dataModal.setAttribute("aria-hidden", "false");

    // Generate fake chart / KPI here (replace with real data later)
    generateDataChartAndKPI(station);
}

// Close Data Modal
document.getElementById("close-data").addEventListener("click", () => {
    dataModal.style.display = "none";
    dataModal.setAttribute("aria-hidden", "true");
});

// Clicking outside closes
window.addEventListener("click", e => {
    if (e.target === dataModal) {
        dataModal.style.display = "none";
        dataModal.setAttribute("aria-hidden", "true");
    }
});

// Generate fake chart & KPI
function generateDataChartAndKPI(station) {
    const canvas = document.getElementById("dataUsageChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // Fake data example (replace with real)
    const labels = ["Connector 1","Connector 2","Connector 3"];
    const usageData = labels.map(() => Math.floor(Math.random() * 50) + 10);
    const revenueData = usageData.map(v => v * 5); // assume $5 per session

    const totalUsage = usageData.reduce((a,b)=>a+b,0);
    const totalRevenue = revenueData.reduce((a,b)=>a+b,0);

    document.getElementById("dataKPI").innerHTML = `Total Usage: ${totalUsage} sessions &nbsp; | &nbsp; Total Revenue: $${totalRevenue}`;

    // Create Chart.js bar chart
    new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [
                { label: "Usage Sessions", data: usageData, backgroundColor: "#2563eb" },
                { label: "Revenue ($)", data: revenueData, backgroundColor: "#10b981" }
            ]
        },
        options: { responsive:true, plugins:{legend:{position:"top"}}, scales:{y:{beginAtZero:true}} }
    });
}

// ==== filter interactions ====
document.getElementById("filter-country").addEventListener("change", (e) => {
    const iso = e.target.value;
    populateStateDropdown(iso);
});

document.getElementById("apply-filter").addEventListener("click", () => {
    applyFilters();
});

document.getElementById("clear-filter").addEventListener("click", () => {
    clearFilters();
});

document.getElementById("filter-search").addEventListener("keyup", e => {
    if (e.key === "Enter") applyFilters();
});

// ===== Malaysia Report Button Logic =====
if (malaysiaBtn) {
    malaysiaBtn.addEventListener("click", () => {
        malaysiaModal.style.display = "block";
        malaysiaModal.setAttribute("aria-hidden", "false");
    });
}

document.getElementById("close-malaysia-report").addEventListener("click", () => {
    malaysiaModal.style.display = "none";
    malaysiaModal.setAttribute("aria-hidden", "true");
});

// Period dropdown for Malaysia modal
malaysiaPeriod.addEventListener("change", () => {
    const val = malaysiaPeriod.value;
    malaysiaDateInputs.innerHTML = "";

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    if (val === "day") malaysiaDateInputs.innerHTML = `<input type="date" id="malaysia-date" max="${today}">`;
    else if (val === "week") malaysiaDateInputs.innerHTML = `
        <label>Start:</label><input type="date" id="malaysia-week-start" max="${today}">
        <label>End:</label><input type="date" id="malaysia-week-end" max="${today}">
    `;
    else if (val === "month") malaysiaDateInputs.innerHTML = `
        <select id="malaysia-month">
            ${[...Array(12).keys()].map(m =>
        `<option value="${m+1}">${new Date(0, m).toLocaleString('default',{month:'long'})}</option>`
    ).join("")}
        </select>
        <select id="malaysia-year">${generateYearOptions()}</select>
    `;
    else if (val === "year") malaysiaDateInputs.innerHTML = `
        <label>From:</label><select id="malaysia-year-start">${generateYearOptions()}</select>
        <label>To:</label><select id="malaysia-year-end">${generateYearOptions()}</select>
    `;
});

// ===== Malaysia Report Chart + Print Handler (Improved Logic) =====
let malaysiaChart = null;

function generateMalaysiaChart() {
    const brand = document.getElementById("malaysia-brand").value;
    const period = document.getElementById("malaysia-period").value;
    const dateInputs = document.getElementById("malaysia-date-inputs");

    // ensure both brand + period are chosen
    if (!brand || !period) return;

    // check if period-specific date fields are filled
    let ready = false;
    if (period === "day" && document.getElementById("malaysia-date")?.value) ready = true;
    else if (period === "week" && document.getElementById("malaysia-week-start")?.value && document.getElementById("malaysia-week-end")?.value) ready = true;
    else if (period === "month" && document.getElementById("malaysia-month")?.value && document.getElementById("malaysia-year")?.value) ready = true;
    else if (period === "year" && document.getElementById("malaysia-year-start")?.value && document.getElementById("malaysia-year-end")?.value) ready = true;

    if (!ready) return; // wait until all inputs complete

    const ctx = document.getElementById("malaysiaChart").getContext("2d");
    const labels = ["Station 1", "Station 2", "Station 3", "Station 4", "Station 5"];
    const data = labels.map(() => Math.floor(Math.random() * 80) + 20);

    // destroy old chart if exists
    if (malaysiaChart) malaysiaChart.destroy();

    malaysiaChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: `${brand === "all" ? "All Brands" : brand} Users`,
                    data,
                    backgroundColor: "#16a34a"
                }
            ]
        },
        options: {
            plugins: { legend: { position: "top" } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// 👇 helper to recheck all conditions whenever something changes
function checkMalaysiaReady() {
    generateMalaysiaChart();
}

// trigger check only after all selections made
document.getElementById("malaysia-brand").addEventListener("change", checkMalaysiaReady);
document.getElementById("malaysia-period").addEventListener("change", checkMalaysiaReady);
document.getElementById("malaysia-date-inputs").addEventListener("input", checkMalaysiaReady);
document.getElementById("malaysia-date-inputs").addEventListener("change", checkMalaysiaReady);

// print button (uses existing chart)
document.getElementById("print-malaysia-report").addEventListener("click", () => {
    const brand = document.getElementById("malaysia-brand").value;
    const period = document.getElementById("malaysia-period").value;

    if (!brand || !period) return alert("Please select brand and period.");

    // validate period-specific date fields again before printing
    if (period === "day" && !document.getElementById("malaysia-date")?.value)
        return alert("Please select a date before printing.");
    if (period === "week" && (!document.getElementById("malaysia-week-start")?.value || !document.getElementById("malaysia-week-end")?.value))
        return alert("Please select both start and end date for the week.");
    if (period === "month" && (!document.getElementById("malaysia-month")?.value || !document.getElementById("malaysia-year")?.value))
        return alert("Please select both month and year.");
    if (period === "year" && (!document.getElementById("malaysia-year-start")?.value || !document.getElementById("malaysia-year-end")?.value))
        return alert("Please select both start and end year.");

    if (!malaysiaChart) return alert("Please generate the chart first.");

    const ctx = document.getElementById("malaysiaChart").getContext("2d");
    const imgData = ctx.canvas.toDataURL("image/png");

    const title = "Malaysia EV Infrastructure Report";
    const brandStr = brand === "all" ? "All Brands (Aggregated)" : brand;
    const summary = `
        <p><strong>Target Brand:</strong> ${brandStr}</p>
        <p><strong>Data Scope:</strong> Malaysian Region Charging Stations</p>
    `;
    const content = `<img src="${imgData}" alt="Malaysia Report Chart">`;

    // Pass to master function
    printProfessionalReport(title, period, summary, content);
});

// ==========================================
// MASTER PRINT TEMPLATE FOR ALL REPORTS
// ==========================================
function printProfessionalReport(title, period, summaryDetails, contentHtml) {
    const todayStr = new Date().toLocaleDateString('en-MY', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    const printWin = window.open('', '', 'width=900,height=600');

    printWin.document.write(`
        <html>
        <head>
            <title>${title}</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin: 0; padding: 40px; background-color: #f4f6f8; }
                .report-container { max-width: 800px; margin: 0 auto; background: #fff; border: 1px solid #e0e0e0; padding: 50px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
                .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2ecc71; padding-bottom: 20px; margin-bottom: 30px; }
                .company-info h1 { margin: 0; color: #27ae60; font-size: 32px; letter-spacing: 1px; }
                .company-info p { margin: 5px 0; font-size: 14px; color: #555; }
                .report-meta { text-align: right; font-size: 14px; color: #666; }
                .report-meta strong { color: #333; }
                .report-title { text-align: center; margin-bottom: 30px; }
                .report-title h2 { margin: 0 0 10px 0; color: #2c3e50; font-size: 26px; text-transform: uppercase; }
                .report-title p { margin: 0; color: #7f8c8d; font-size: 16px; }
                .data-summary { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #3498db; }
                .data-summary p { margin: 8px 0; font-size: 15px; }
                .content-area { margin: 20px 0; font-size: 15px; line-height: 1.6; }
                .content-area img { width: 100%; max-width: 700px; border: 1px solid #eaeaea; border-radius: 8px; padding: 15px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.02); display: block; margin: 20px auto; }
                .footer { margin-top: 60px; border-top: 1px solid #eaeaea; padding-top: 20px; text-align: center; font-size: 12px; color: #999; }
                
                /* Layout fixes for the text elements inside */
                .report-station-info, .report-connectors, .report-usage { margin-bottom: 20px; }
                ul { padding-left: 20px; }
                canvas { display: none !important; } /* Hide raw canvas, we only print the image copy */
            </style>
        </head>
        <body>
            <div class="report-container">
                <div class="header">
                    <div class="company-info">
                        <h1>EcoNavigator</h1>
                        <p><strong>Contact:</strong> 012-5689038</p>
                        <p><strong>Email:</strong> admin@gmail.com</p>
                    </div>
                    <div class="report-meta">
                        <p><strong>Date Generated:</strong> ${todayStr}</p>
                        <p><strong>Status:</strong> Official System Export</p>
                        <p><strong>Report ID:</strong> EN-${Math.floor(Math.random() * 90000) + 10000}</p>
                    </div>
                </div>
                
                <div class="report-title">
                    <h2>${title}</h2>
                    <p>Analytics & Station Usage Projections</p>
                </div>
                
                <div class="data-summary">
                    <p><strong>Analysis Period:</strong> ${period.toUpperCase()}</p>
                    ${summaryDetails}
                </div>

                <div class="content-area">
                    ${contentHtml}
                </div>
                
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} EcoNavigator. All rights reserved.</p>
                    <p>This is a system-generated analytics document. Confidential and proprietary information.</p>
                </div>
            </div>
            
            <script>
                // Wait slightly for charts to load into images, then print
                setTimeout(() => { window.print(); window.close(); }, 500);
            </script>
        </body>
        </html>
    `);
    printWin.document.close();
}