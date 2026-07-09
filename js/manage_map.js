// CONFIG
const OCM_KEY = "e52e0fe4-6d46-48db-b854-707e9007dce1";
const TOMTOM_KEY = "CTk6JeXQZUCw0dkiB4670WHiSXhujiu9"; // Added your TomTom Key

const OCM_MY_URL =
    `https://api.openchargemap.io/v3/poi/?output=json&countrycode=MY&maxresults=5000&compact=false&verbose=true&key=${OCM_KEY}`;
const OCM_GLOBAL_URL =
    `https://api.openchargemap.io/v3/poi/?output=json&maxresults=15000&compact=false&verbose=true&key=${OCM_KEY}`;
const TOMTOM_URL =
    `https://api.tomtom.com/search/2/categorySearch/EV%20Charging%20Station.json?key=${TOMTOM_KEY}&categorySet=7309&limit=100`;

// ==========================================
// SWEETALERT OVERRIDE (Upgrades all default alerts)
// ==========================================
window.alert = function(message) {
    Swal.fire({
        icon: 'warning',
        title: 'Notice',
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

        // 3️⃣ Merge & remove duplicates by station ID (OCM Data)
        const stationMap = new Map();

        malaysiaStations.forEach(s => stationMap.set(s.ID, s));
        globalStations.forEach(s => {
            if (!stationMap.has(s.ID)) {
                stationMap.set(s.ID, s);
            }
        });

        // ==========================================
        // 🚀 NEW: TOMTOM API INTEGRATION ADDED HERE
        // ==========================================
        try {
            const ttRes = await fetch(TOMTOM_URL);
            const ttData = await ttRes.json();

            if (ttData && ttData.results) {
                // Map TomTom data to match OCM format exactly so your code doesn't break
                const tomtomStations = ttData.results.map(item => ({
                    ID: "TT-" + item.id, // Prefix to avoid ID clashes with OCM
                    AddressInfo: {
                        Title: item.poi.name || "TomTom EV Station",
                        AddressLine1: item.address.freeformAddress || "-",
                        Town: item.address.municipality || "-",
                        StateOrProvince: item.address.countrySubdivision || "-",
                        Postcode: item.address.postalCode || "-",
                        Country: {
                            Title: item.address.country || "-",
                            ISOCode: item.address.countryCodeISO3 || ""
                        },
                        Latitude: item.position.lat,
                        Longitude: item.position.lon
                    },
                    OperatorInfo: { Title: "TomTom API POI" },
                    UsageType: { Title: "Unknown" },
                    StatusType: { Title: "Operational" },
                    Connections: [],
                    NumberOfPoints: 1,
                    status: "Available"
                }));

                // Check for duplicates using GPS coordinates (approx 150 meters)
                tomtomStations.forEach(tt => {
                    let isDuplicate = false;
                    stationMap.forEach(ocm => {
                        const lat1 = ocm.AddressInfo?.Latitude || 0;
                        const lon1 = ocm.AddressInfo?.Longitude || 0;
                        const lat2 = tt.AddressInfo.Latitude;
                        const lon2 = tt.AddressInfo.Longitude;

                        if (Math.abs(lat1 - lat2) < 0.0015 && Math.abs(lon1 - lon2) < 0.0015) {
                            isDuplicate = true;
                        }
                    });

                    if (!isDuplicate) {
                        stationMap.set(tt.ID, tt);
                    }
                });
            }
        } catch (ttErr) {
            console.error("TomTom API failed, continuing with OCM only:", ttErr);
        }
        // ==========================================
        // END OF TOMTOM INTEGRATION
        // ==========================================

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

            // 1. Warning Validation (If they didn't select a status)
            if (!chosen) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Missing Selection',
                    text: 'Please select a status before confirming.',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true
                });
                return;
            }

            // 2. The "Are you sure?" Confirmation Pop-up
            const confirmResult = await Swal.fire({
                title: 'Are you sure?',
                text: `Set station "${ai.Title || 'Unknown'}" (ID: ${station.ID}) status to: ${chosen}?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#28a745', // Green button
                cancelButtonColor: '#d33',     // Red button
                confirmButtonText: 'Yes, update it!',
                cancelButtonText: 'Cancel'
            });

            // If the user clicks "Cancel" or outside the box, stop here.
            if (!confirmResult.isConfirmed) {
                return;
            }

            // --- PROCEED WITH SAVING ---
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

                // 3. Success Message (Slides in from top-right)
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: json.message || 'Status saved successfully.',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true
                });

                station.status = chosen;
                applyFilters();

            } catch (err) {
                console.error('Update error:', err);

                // 4. Error Message Pop-up
                Swal.fire({
                    icon: 'error',
                    title: 'Failed to Save',
                    text: err.message || err,
                    confirmButtonColor: '#3085d6'
                });
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