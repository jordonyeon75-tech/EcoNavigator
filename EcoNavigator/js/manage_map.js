// CONFIG
const OCM_KEY = "e52e0fe4-6d46-48db-b854-707e9007dce1";
const OCM_MY_URL =
    `https://api.openchargemap.io/v3/poi/?output=json&countrycode=MY&maxresults=5000&compact=false&verbose=true&key=${OCM_KEY}`;
const OCM_GLOBAL_URL =
    `https://api.openchargemap.io/v3/poi/?output=json&maxresults=15000&compact=false&verbose=true&key=${OCM_KEY}`;

// State
let stations = [];
let filteredStations = [];
let currentPage = 1;
const PER_PAGE = 9; // 3x3 grid

async function loadStations() {
    try {
        // 1️⃣ Load Malaysia stations FIRST
        const myRes = await fetch(OCM_MY_URL);
        const myData = await myRes.json();
        const malaysiaStations = Array.isArray(myData) ? myData : [];

        // 2️⃣ Load global stations
        const globalRes = await fetch(OCM_GLOBAL_URL);
        const globalData = await globalRes.json();
        const globalStations = Array.isArray(globalData) ? globalData : [];

        // 3️⃣ Merge & remove duplicates by station ID
        const stationMap = new Map();

        malaysiaStations.forEach(s => stationMap.set(s.ID, s));
        globalStations.forEach(s => {
            if (!stationMap.has(s.ID)) {
                stationMap.set(s.ID, s);
            }
        });

        stations = Array.from(stationMap.values());

        // 4️⃣ Load DB statuses
        const statusRes = await fetch('../controller/getStationStatus.php');
        const statusArr = await statusRes.json();

        const statusMap = {};
        statusArr.forEach(row => {
            statusMap[row.station_id] = row.status;
        });

        // 5️⃣ Merge DB status
        stations.forEach(st => {
            st.status = statusMap[st.ID] || "Available";
        });

        filteredStations = stations.slice();

        populateCountryDropdown();
        renderStationsPage(1);

    } catch (err) {
        console.error("Error loading stations:", err);
    }
}

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
        const ai = s.AddressInfo;
        if (!ai || !ai.Country) return;
        if ((ai.Country.ISOCode || "").toUpperCase() !== countryIso.toUpperCase()) return;
        if (ai.StateOrProvince) states.add(ai.StateOrProvince.trim());
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
    const status = document.getElementById("filter-status").value;

    filteredStations = stations.filter(s => {
        const ai = s.AddressInfo || {};
        const stationStatus = s.status || "Available";

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
                (ai.AddressLine2 || "") + " " +
                (ai.Town || "") + " " +
                (ai.StateOrProvince || "") + " " +
                (ai.Postcode || "") + " " +
                (ai.Country?.Title || "")
            ).toLowerCase();
            if (!hay.includes(q)) return false;
        }

        if (status && stationStatus !== status) {
            return false;
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
    document.getElementById("filter-status").value = "";

    filteredStations = stations.slice();
    currentPage = 1;
    renderStationsPage(currentPage);
}

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
        const currentStatus = station.status || "Available";

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
                    <label for="status-select-${station.ID}" style="display:none">Status</label>
                    <select id="status-select-${station.ID}">
                    <option value="">Status</option>
                    <option value="Out of Service" ${currentStatus==="Out of Service"?"selected":""}>Out of Service</option>
                    <option value="Under Maintain" ${currentStatus==="Under Maintain"?"selected":""}>Under Maintain</option>
                    <option value="Available" ${currentStatus==="Available"?"selected":""}>Available</option>
                    </select>
                    <button class="btn-confirm" data-id="${station.ID}">Confirm</button>
                </div>
            </div>

            <div class="station-body">
                <p><strong>Address:</strong> ${escapeHtml(ai.AddressLine1 || "-")}</p>
                <p><strong>Town:</strong> ${escapeHtml(town)} &nbsp; <strong>State:</strong> ${escapeHtml(state)}</p>
                <p><strong>Postcode:</strong> ${escapeHtml(postcode)} &nbsp; <strong>Country:</strong> ${escapeHtml(country)}</p>
                <p><strong>Operator:</strong> ${escapeHtml(operator)}</p>
                <p><strong>Usage:</strong> ${escapeHtml(usage)} &nbsp;</p>
                <p>
                <strong>Status:</strong>
                <span class="status-badge" data-status="${currentStatus}">
                ${escapeHtml(currentStatus)}
                </span>
                </p>
                <p><strong>Connectors:</strong> ${connectors} &nbsp; <strong>Points:</strong> ${points}</p>
                <p class="small"><strong>Connectors details:</strong> ${escapeHtml(connSummary || "-")}</p>
                <p class="small"><strong>Lat / Lon:</strong> ${lat} / ${lon}</p>
            </div>
                `;
                // Confirm button handler — sends status to backend and updates UI on success
                card.querySelector(".btn-confirm").addEventListener("click", async (e) => {
                    const btn = e.target;
                    const sel = document.getElementById(`status-select-${station.ID}`);
                    const chosen = sel?.value || "";

                    if (!chosen) {
                        alert('Please select a status before confirming.');
                        return;
                    }

                    if (!confirm(`Set station "${ai.Title || 'Unknown'}" (ID: ${station.ID}) status to: ${chosen}?`)) {
                        return;
                    }

                    btn.disabled = true;
                    btn.textContent = "Saving...";

                    try {
                        const res = await fetch('../controller/updateStationStatus.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                id: station.ID,
                                status: chosen,
                                title: ai.Title || ''
                            })
                        });

                        const json = await res.json();
                        if (!json || !json.success) {
                            throw new Error(json.message || "Update failed");
                        }

                        alert(json.message || 'Status saved');

                        station.status = chosen;
                        applyFilters();

                    } catch (err) {
                        console.error('Update error:', err);
                        alert('Failed to save status: ' + (err.message || err));
                    } finally {
                        btn.disabled = false;
                        btn.textContent = "Confirm";
                    }
                });

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
    return String(str).replace(/[&<>\"'`=\/]/g, s => ({
        "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;","/":"&#x2F;","`":"&#x60","=":"&#x3D;"
    }[s]));
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

document.getElementById("filter-status").addEventListener("change", () => {
    applyFilters();
});

// 🔍 LIVE SEARCH
document.getElementById("filter-search").addEventListener("input", () => {
    applyFilters();
});

// initial load
loadStations();