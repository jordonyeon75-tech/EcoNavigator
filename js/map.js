window.alert = function(message) {
    // Check if the message is a success message (like bookmarks)
    if (message.toLowerCase().includes("success")) {
        Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: message,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
    } else {
        // Default to a warning for things like "Geolocation not supported"
        Swal.fire({
            icon: 'warning',
            title: 'Notice',
            text: message,
            confirmButtonColor: '#28a745',
            confirmButtonText: 'Got it'
        });
    }
};
// 1. Define Layers
const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
});

const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

// 1 Define Traffic Layer (Using TomTom API)
const trafficApiKey = 'CTk6JeXQZUCw0dkiB4670WHiSXhujiu9';
const trafficLayer = L.tileLayer(`https://{s}.api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${trafficApiKey}`, {
    maxZoom: 22,
    tileSize: 256,
    opacity: 1.0, // Slightly transparent so you can see the roads underneath
    attribution: 'Traffic © TomTom'
});

// 2. Initialize Map (Default: Street)
window.map = L.map('map', {
    zoomControl: true,
    layers: [streetLayer] // Start with street map
}).setView([3.139, 101.6869], 7);

// 3. Add Layer Control (Top Right)
const baseMaps = {
    "Street Map": streetLayer,
    "Satellite": satelliteLayer
};

const overlays = {
    "Traffic": trafficLayer
};

L.control.layers(baseMaps, overlays).addTo(map);

// Sidebar toggle with overlay
const sidebar = $("#sidebar");
const overlay = $("<div id='overlay'></div>").appendTo("body").hide();

$("#menu-toggle").click(() => {
    sidebar.addClass("open");
    overlay.show();
});

$("#close-sidebar, #overlay").click(() => {
    sidebar.removeClass("open");
    overlay.hide();
});

// Geolocation (Updated with Pulse Effect)
$("#locate-btn").click(() => {
    if (!navigator.geolocation) return alert("Geolocation not supported");

    // Show loading cursor
    $('body').css('cursor', 'wait');

    navigator.geolocation.getCurrentPosition(pos => {
        $('body').css('cursor', 'default');
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], 15);

        if (window.locMarker) map.removeLayer(window.locMarker);

        // ADD-ON: Use the custom DivIcon with CSS animation
        window.locMarker = L.marker([latitude, longitude], {
            icon: L.divIcon({
                className: 'user-location-pulse', // Class from styles.css
                iconSize: [20, 20],
                popupAnchor: [0, -10]
            })
        }).addTo(map).bindPopup("<b>You Are Here</b>").openPopup();
    }, () => {
        $('body').css('cursor', 'default');
        alert("Unable to retrieve your location.");
    });
});
// =====================
// LIVE SEARCH
// =====================
let searchTimeout = null;
let searchMarker = null;

// Remove dropdown if exists
function removeDropdown() {
    const box = $("#search-results");
    if (box.length) {
        box.stop(true, true).remove();
    }
    searchTimeout = null;
}

// Close dropdown when clicking outside or pressing ESC
$(document).on("click", function (e) {
    if (!$(e.target).closest("#search-input, #search-results").length) removeDropdown();
});

$(document).on("keydown", function (e) {
    if (e.key === "Escape") removeDropdown();
});

$("#search-input").on("input", function () {
    const query = $(this).val().trim();

    // If input is cleared — reset map & markers
    if (query.length < 2) {
        removeDropdown();

        // Remove the temporary search marker
        if (searchMarker) {
            map.removeLayer(searchMarker);
            searchMarker = null;
        }

        // Reload full map markers (return to normal view)
        requestAnimationFrame(() => renderStations());
        return;
    }

    // Debounce fetch to avoid spam calls
    if (searchTimeout) clearTimeout(searchTimeout);

    searchTimeout = setTimeout(() => {
        const { lat, lng } = map.getCenter();
        fetch(`/controller/searchStations.php?q=${encodeURIComponent(query)}&lat=${lat}&lon=${lng}`, { cache: "no-store" })
            .then(r => {
                if (!r.ok) throw new Error(`HTTP error: ${r.status}`);
                return r.json();
            })
            .then(results => {
                removeDropdown();
                if (!results || !Array.isArray(results) || results.length === 0) return;

                const dropdown = $("<div id='search-results' class='search-dropdown'></div>");
                results.forEach(station => {
                    const name = station.AddressInfo?.Title || "Unknown Station";
                    const addr = station.AddressInfo?.AddressLine1 || "No address provided";
                    const lat = station.AddressInfo?.Latitude;
                    const lon = station.AddressInfo?.Longitude;

                    if (!lat || !lon) return;

                    dropdown.append(`
                        <div class="search-item" data-lat="${lat}" data-lon="${lon}">
                            <b>${name}</b><br><small>${addr}</small>
                        </div>
                    `);
                });

                $("body").append(dropdown);
                const input = $("#search-input");

                // Prevent overflow
                const maxLeft = window.innerWidth - dropdown.outerWidth() - 10;

                dropdown.css({
                    top: input.offset().top + input.outerHeight(),
                    left: Math.min(input.offset().left, maxLeft),
                    width: input.outerWidth(),
                    display: "block",
                    "z-index": 10000
                });


                // When user clicks a search result
                $(".search-item").off("click").on("click", function () {
                    const lat = parseFloat($(this).data("lat"));
                    const lon = parseFloat($(this).data("lon"));
                    const title = $(this).find("b").text();
                    const addr = $(this).find("small").text();

                    if (!lat || !lon) return;

                    // Remove previous search marker
                    if (searchMarker) map.removeLayer(searchMarker);

                    // Center map on selected station
                    map.setView([lat, lon], 15);

                    // Create new marker
                    searchMarker = L.marker([lat, lon], {
                        icon: L.icon({
                            iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                            iconSize: [29, 40],
                            iconAnchor: [20, 32],
                            popupAnchor: [0, -41]
                        })
                    }).addTo(map).bindPopup(title).openPopup();

                    saveStationToHistory(title, addr, lat, lon);

                    removeDropdown();

                });
            })
            .catch(err => console.error("Search fetch error:", err));
    }, 240);
});

// Open/Close Filter Modal
$("#filter-btn").click(() => $("#filter-modal").fadeIn());
$("#close-filter-btn").click(() => $("#filter-modal").fadeOut());

// =====================
// DYNAMIC COUNTRY DROPDOWN
// =====================
async function loadCountries() {
    try {
        const res = await fetch("https://api.openchargemap.io/v3/referencedata/?output=json&key=e52e0fe4-6d46-48db-b854-707e9007dce1");
        const data = await res.json();
        const countries = data.Countries || [];

        // Move Malaysia on top
        const malaysia = countries.find(c => c.ISOCode === "MY");
        const others = countries.filter(c => c.ISOCode !== "MY").sort((a, b) => a.Title.localeCompare(b.Title));

        const dropdown = $("#filter-country");
        dropdown.html("");
        dropdown.append(`<option value="">All</option>`);
        if (malaysia) dropdown.append(`<option value="${malaysia.ISOCode}" selected>${malaysia.Title}</option>`);
        others.forEach(c => dropdown.append(`<option value="${c.ISOCode}">${c.Title}</option>`));
    } catch (err) {
        console.error("Error loading countries:", err);
    }
}

loadCountries();

function loadReferenceData() {
    fetch("https://api.openchargemap.io/v3/referencedata/?output=json&key=e52e0fe4-6d46-48db-b854-707e9007dce1")
        .then(res => res.json())
        .then(data => {
            // Countries already loaded separately
            // Usage Types
            const usageDropdown = $("#filter-usage");
            usageDropdown.html('<option value="">All Usage</option>');
            data.UsageTypes.forEach(u => {
                usageDropdown.append(`<option value="${u.Title}">${u.Title}</option>`);
            });

            // --- Replace this block entirely ---
            const statusDropdown = $("#filter-status");
            statusDropdown.html(`
            <option value="">All Status</option>
            <option value="Available">Available</option>
            <option value="Under Maintain">Under Maintain</option>
            <option value="Out of Service">Out of Service</option>
            `);

            // Connection Types
            const connDropdown = $("#filter-connection");
            connDropdown.html('<option value="">All Connection Types</option>');
            data.ConnectionTypes.forEach(c => {
                connDropdown.append(`<option value="${c.Title}">${c.Title}</option>`);
            });
        })
        .catch(err => console.error("Reference data load error:", err));
}

loadReferenceData();

window.filterActive = false;
window.filterMarkers = [];
window.allMarkers = window.allMarkers || [];

// =====================
// ADVANCED FILTER LOGIC (Highlight filtered with RED markers)
$("#apply-filter-btn").on("click", async function () {
    const filters = {
        country: $("#filter-country").val(),
        location: $("#filter-location").val(),
        usage: $("#filter-usage").val(),
        status: $("#filter-status").val(),
        connection: $("#filter-connection").val()
    };

    fetch("../controller/getFilteredStations.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters)
    })
        .then(res => res.json())
        .then(data => {
            // Remove existing normal markers
            window.allMarkers.forEach(m => map.removeLayer(m));
            window.allMarkers = [];

            // Remove old filter markers
            window.filterMarkers.forEach(m => map.removeLayer(m));
            window.filterMarkers = [];

            if (!data.length) {
                alert("No stations found with these filters");
                return;
            }

            window.filterActive = true;

            data.forEach(station => {
                if (!station.lat || !station.lon) return;

                const fullStation = window.allStations.find(s => s.ID == station.id);
                if (!fullStation) return;

                // Determine adminStatus
                const adminStatus = fullStation.adminStatus || window.stationStatusMap[station.id] || 'Available';

                // Choose icon by adminStatus or use red marker if filtering by other fields
                const ICONS = {
                    'Available': '../image/markers/charging_station.png',
                    'Under Maintain': '../image/markers/maintenance.png',
                    'Out of Service': '../image/markers/out_of_service.png'
                };
                const iconUrl = ICONS[adminStatus] || "https://cdn-icons-png.flaticon.com/512/252/252025.png";

                const popupHTML = buildPopupHTML(fullStation, adminStatus);

                const marker = L.marker([station.lat, station.lon], {
                    icon: L.icon({
                        iconUrl: iconUrl,
                        iconSize: [50, 50]
                    })
                }).addTo(map).bindPopup(popupHTML, {
                    maxWidth: 450,
                    minWidth: 450,
                    className: 'charging-station-popup'
                });

                marker.on("popupopen", () => {
                    const id = fullStation.ID;
                    loadRating(id);
                    loadFeedback(id);

                    // --- Save History Automatically ---
                    const addrInfo = station.AddressInfo || {};
                    const address = [addrInfo.AddressLine1, addrInfo.Town, addrInfo.StateOrProvince].filter(Boolean).join(", ");

                    // Safely get category and type
                    let category = "";
                    let type = "";
                    if (station.Connections && station.Connections.length > 0) {
                        category = station.Connections[0].ConnectionType ? station.Connections[0].ConnectionType.Title : "";
                        type = station.Connections[0].Level ? station.Connections[0].Level.Title : "";
                    }

                    // Make sure we use addrInfo.Latitude and addrInfo.Longitude!
                    saveStationToHistory(addrInfo.Title, address, addrInfo.Latitude, addrInfo.Longitude, category, type);
                });

                window.allMarkers.push(marker);
            });

            // Center map
            const first = data[0];
            if (first && first.lat && first.lon) {
                map.setView([first.lat, first.lon], 12);
            }

            $("#filter-modal").fadeOut();
        })
        .catch(err => {
            console.error("Filter error:", err);
            alert("Error applying filters");
        });
});

//----Filter Thing----//
let lastMapView = map.getCenter();
let lastMapZoom = map.getZoom();

// Track user's last map position before filter
map.on("movestart", () => {
    lastMapView = map.getCenter();
    lastMapZoom = map.getZoom();
});


// --- Clear Filter ---
// Add these variables near the top of your script if not already there
let preFilterZoom = null;
let preFilterCenter = null;

// Before applying a filter, save the current map view
$("#apply-filter-btn").on("click", function() {
    preFilterZoom = map.getZoom();
    preFilterCenter = map.getCenter();
});

// --- Clear Filter ---
$("#clear-filter-btn").on("click", function (e) {
    e.preventDefault();

    window.filterActive = false;

    const btn = $(this);
    btn.prop("disabled", true).text("Clearing...");

    // 2. Reset dropdowns (Defaults back to Malaysia to avoid global fetching)
    const defaultCountry = window.userCountryCode || "MY";
    $("#filter-country").val(defaultCountry);
    $("#filter-status").val("");
    $("#filter-usage").val("");
    $("#filter-connection").val("");

    // 3. Clear the current filter markers off the map immediately
    if (window.markers) {
        window.markers.clearLayers();
    }
    if (window.allMarkers) {
        window.allMarkers.forEach(m => map.removeLayer(m));
    }
    window.allMarkers = [];

    // 4. Restore the map view to exactly where the user was before filtering
    if (typeof preFilterCenter !== 'undefined' && preFilterZoom) {
        map.setView(preFilterCenter, preFilterZoom);
    } else if (window.userMarker) {
        map.setView(window.userMarker.getLatLng(), 14);
    } else {
        map.setView([3.139, 101.6869], 7); // Default to Malaysia center
    }

    // 5. STEP:
    // Trigger your existing highly-optimized render function.
    if (typeof renderStations === 'function') {
        setTimeout(() => {
            renderStations();
        }, 150);
    }

    // 6. Reset button UI
    btn.prop("disabled", false).text("Clear");
});

// Overlay styles
$("<style>")
    .prop("type", "text/css")
    .html(`
        #overlay {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.4);
            z-index: 1099;
        }
    `)
    .appendTo("head");

// ---- OCM helpers (safe text, badges, connection formatting) ----
function esc(v) {
    if (v === null || v === undefined) return "";
    return String(v).replace(/[&<>"'`=\/]/g, s => ({
        "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;","/":"&#x2F;","`":"&#x60;","=":"&#x3D;"
    }[s]));
}
function vOrNA(v) { return (v === null || v === undefined || v === "") ? "N/A" : esc(v); }

function badge(text, tone="grey") {
    if (!text) return "";
    return `<span class="ocm-badge ocm-badge-${tone}">${esc(text)}</span>`;
}

function statusTone(title) {
    if (!title) return "grey";
    const t = title.toLowerCase();
    if (t.includes("operational") || t.includes("in service") || t.includes("available")) return "green";
    if (t.includes("planned") || t.includes("unknown")) return "grey";
    return "orange";
}

function kw(v) { return (typeof v === "number" && !isNaN(v)) ? `${v} kW` : "—"; }

// === Add this lookup table near the top of your helpers (before formatConnections) ===
const CONNECTION_TYPES = {
    1: "NEMA 5-15R",
    2: "NEMA 5-20R",
    3: "CHAdeMO",
    25: "Type 2 (Socket Only)",
    27: "CCS (Combo 1)",
    33: "CCS (Combo 2)",
    1036: "Tesla Supercharger"
    // ⚡ You can expand this list with more IDs from OCM /referencedata
};

// ============================================
// 1. CONSISTENCY HELPER
// ============================================
function getSeededRandomMap(seed) {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function renderBatteryBars(station) {
    // 1. Get Connections or default to NumberOfPoints
    const conns = station.Connections || [];
    // Ensure we have at least 'NumberOfPoints' loops, or 1
    const count = Math.max(conns.length, station.NumberOfPoints || 1);

    let html = '<div class="battery-list mt-2">';
    let free = 0;

    for(let i = 0; i < count; i++) {
        // Get Connector Data
        const conn = conns[i] || {};
        const typeId = conn.ConnectionTypeID; // Needed for Image
        const type = conn.ConnectionType?.Title || "Connector " + (i+1);
        const power = conn.PowerKW ? `${conn.PowerKW} kW` : '';

        // IMAGE LOGIC: Get the icon path
        const iconPath = getConnectorImage(typeId);
        // HTML for the image (Hidden if no image found)
        const imgHtml = iconPath
            ? `<img src="${iconPath}" alt="${type}" style="width:32px; height:32px; object-fit:contain; margin-right:10px;" onerror="this.style.display='none'">`
            : `<i class="fa fa-plug" style="font-size:24px; color:#aaa; margin-right:10px; width:32px; text-align:center;"></i>`;

        // --- SEEDED RANDOM STATUS ---
        const seed = station.ID + (i * 123);
        const isOccupied = getSeededRandomMap(seed) > 0.4;

        // UI Variables
        let statusText = "Available";
        let badgeClass = "badge-success";
        let borderStyle = "4px solid #2ecc71";
        let bgClass = "bg-white";
        let barHtml = "";

        if (isOccupied) {
            statusText = "In Use";
            badgeClass = "badge-warning";
            borderStyle = "4px solid #f1c40f";
            bgClass = "bg-light";

            const battery = Math.floor(getSeededRandomMap(seed + 5) * 80) + 10;
            barHtml = `
                <div class="mt-2">
                    <div class="d-flex justify-content-between small text-muted mb-1">
                        <span><i class="fa fa-bolt"></i> Vehicle Charging...</span>
                        <span class="font-weight-bold">${battery}%</span>
                    </div>
                    <div class="progress" style="height: 8px; background:#e9ecef;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated bg-success" 
                             style="width: ${battery}%"></div>
                    </div>
                </div>
            `;
        } else {
            free++;
            barHtml = `<div class="mt-2 small text-success font-weight-bold"><i class="fa fa-check-circle"></i> Ready to Charge</div>`;
        }

        // GENERATE THE CARD
        html += `
            <div class="card mb-2 shadow-sm ${bgClass}" style="border-left: ${borderStyle};">
                <div class="card-body p-2">
                    
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            
                            ${imgHtml}

                            <div style="line-height:1.2;">
                                <div class="font-weight-bold small text-dark">${type}</div>
                                <div class="small text-muted">${power}</div>
                            </div>
                        </div>
                        
                        <span class="badge ${badgeClass}">${statusText}</span>
                    </div>

                    ${barHtml}
                </div>
            </div>
        `;
    }

    html += '</div>';

    return { html, free, total: count };
}
function buildPopupHTML(station, adminStatus = 'Available') {
// Get slot data and bars HTML in one go
    const { html: batteryBars, free, total } = renderBatteryBars(station);

    const id    = station.ID;
    const addr  = station.AddressInfo || {};

    const lat   = addr.Latitude, lon = addr.Longitude;
    const name  = addr.Title || "Charging Location";
    const addrLine = [addr.AddressLine1, addr.Town, addr.StateOrProvince, addr.Postcode].filter(Boolean).join(", ");
    const country  = addr.Country?.Title;


    const phone = addr.ContactTelephone1 || station.OperatorInfo?.PhonePrimaryContact;
    const email = addr.ContactEmail || station.OperatorInfo?.ContactEmail;

    const operator = station.OperatorInfo?.Title;
    const operatorURL = station.OperatorInfo?.WebsiteURL;

    const usageType  = station.UsageType?.Title;
    const usageCostRaw  = station.UsageCost;
    const usageCost  = usageCostRaw || (usageType !== "Public" ? usageType : null);

    const access     = addr.AccessComments || station.AccessComments || station.GeneralComments;

    const statusTitle = station.StatusType?.Title;
    const _statusTone = statusTone(statusTitle);
    const points = station.NumberOfPoints;
    const lastUpdate = station.DateLastStatusUpdate ? new Date(station.DateLastStatusUpdate).toLocaleString() : null;
    const general = station.GeneralComments;
    const provider = station.DataProvider?.Title;
    const submission = station.SubmissionStatus?.Title;

    const opening = station.OpeningTimes || (addr.AccessComments && addr.AccessComments.includes("24") ? "See Access Notes" : null);

    return `
     <div class="ion-overlay-wrapper">
      <div class="popup-inner-scroll">
        <div class="popup-container">
          <div class="ocm-header">
               ${(adminStatus && adminStatus !== 'Available') ? `
                <div class="status-alert" style="background:#f3f4f6; color:#374151; padding:8px; border-radius:6px; margin-bottom:8px;">
                <strong>Notice:</strong> ${esc(adminStatus)}
                </div>
                ` : ''}
            <h3 class="ocm-title">${esc(name)}</h3>
            <div class="ocm-badges">
              ${statusTitle ? badge(statusTitle, _statusTone) : ""}
              ${usageType ? badge(usageType, "grey") : ""}
            <span class="badge" style="background:#2563eb; color:#fff;">${free}/${total} Slots
            Open</span>
            </div>
          </div>

          <div id="rating-${id}" class="rating-stars">Loading...</div>

          <div class="ocm-section">
            <div class="ocm-section-title">Location</div>
            <div class="ocm-line"><b>Address:</b> ${vOrNA(addrLine)}</div>
            <div class="ocm-line"><b>Country:</b> ${vOrNA(country)}</div>
            <div class="ocm-line"><b>Lat / Lon:</b> ${lat ?? "?"}, ${lon ?? "?"}</div>
            
            ${phone ? `<div class="ocm-line"><b>Phone:</b> <a href="tel:${esc(phone)}">${esc(phone)}</a></div>` : ''}
            ${email ? `<div class="ocm-line"><b>Email:</b> <a href="mailto:${esc(email)}">${esc(email)}</a></div>` : ''}
          </div>

          <div class="ocm-section">
                <div class="ocm-section-title">Equipment</div>
                <div class="ocm-line"><b>Points:</b> ${points ?? "N/A"}</div>
                <ul class="ocm-conn-list">
                ${station.Connections.map((c, idx) => {
                const type = c.ConnectionType?.Title || CONNECTION_TYPES[c.ConnectionTypeID] || "Unknown connector";
                const level = c.Level?.Title || (c.LevelID ? `Level ${c.LevelID}` : "Level ?");
                const pwr  = kw(c.PowerKW);
                const cur  = c.CurrentType?.Title || "";

                const volt = c.Voltage ? ` • ${c.Voltage}V` : "";
                const amp  = c.Amperage ? ` • ${c.Amperage}A` : "";
        
                const qty  = (c.Quantity ? `×${c.Quantity}` : "");
                const cStat = c.StatusType?.Title ? ` • ${esc(c.StatusType.Title)}` : "";
                // get this connector’s battery bar from renderBatteryBars output
                const batterySlot = $("<div>").html(batteryBars).find(".card").eq(idx).prop("outerHTML") || "";            
                return `
                <li style="list-style:none; margin-bottom:5px;">
                <div class="ocm-conn-type">${esc(type)} ${qty}</div>
                <div class="ocm-conn-meta">
                ${esc(level)} • ${pwr}${cur ? " • " + esc(cur) : ""}${volt}${amp}${cStat}
                </div>
                ${batterySlot}
                </li>
                `;
                }).join("")}
                </ul>
                </div>
          
          <div class="ocm-section">
            <div class="ocm-section-title">Usage & Access</div>
            <div class="ocm-line"><b>Cost:</b> ${vOrNA(usageCost)}</div>
            <div class="ocm-line"><b>Restrictions/Notes:</b> ${vOrNA(access)}</div>
            <div class="ocm-line"><b>Opening Times:</b> ${vOrNA(opening)}</div>
          </div>

          <div class="ocm-section">
            <div class="ocm-section-title">Network / Operator</div>
            <div class="ocm-line"><b>Operator:</b> ${vOrNA(operator)}
            ${operatorURL ? ` — <a href="${esc(operatorURL)}" target="_blank" rel="noopener">Website</a>` : ""}</div>
          </div>

          <div class="ocm-section">
            <div class="ocm-section-title">Additional Info</div>
            <div class="ocm-line"><b>Last Update:</b> ${vOrNA(lastUpdate)}</div>
            <div class="ocm-line"><b>Submission:</b> ${vOrNA(submission)}</div>
            <div class="ocm-line"><b>Data Provider:</b> ${vOrNA(provider)}</div>
            ${general ? `<div class="ocm-note">${esc(general)}</div>` : ""}
          </div>

          <div class="popup-buttons">
          <button class="btn-bookmark" onclick='handleBookmark(${id}, true, {
            name: "${esc(name)}",
            address: "${esc(addrLine)}",
            lat: ${lat ?? "null"},
            lng: ${lon ?? "null"},
            categories: "${esc(station.Connections?.[0]?.ConnectionType?.Title || "")}",
            type: "${esc(station.Connections?.[0]?.Level?.Title || "")}",
            voltage: "${esc(station.Connections?.[0]?.Voltage || "")}",
            image: ""
            })'>🔖 Bookmark</button>
            <button class="btn-navigate" onclick="openGoogleMaps(${lat},${lon})">📍 Navigate</button>
          </div>
            <div class="popup-feedback">
            <h4>Feedback</h4>
            ${(typeof USER_ID !== 'undefined' && USER_ID && USER_ID !== '0') ? `
                <textarea id="feedback-${id}" placeholder="Write your feedback..." rows="2"></textarea>
                <button onclick="submitFeedback(${id})" class="btn-submit">Submit</button>
            ` : `
                <textarea id="feedback-${id}" placeholder="Please login to leave feedback..." rows="2" disabled style="background-color: #f5f5f5;"></textarea>
                <button class="btn-submit" onclick="alert('Please login to leave feedback')" style="opacity: 0.5; cursor: not-allowed;">Submit</button>
            `}
            <div id="feedback-list-${id}"></div>
          </div>
        </div>
      </div>
    </div>
    `;
}

// ==== LOAD ALL STATIONS (initial fetch) ====
window.allStations = [];
window.allMarkers = [];

// ---- Fetch admin-set statuses and build a lookup ----
window.stationStatusMap = {}; // keyed by station ID (OCM ID) -> status text

async function loadStationStatuses() {
    try {
        const res = await fetch('../controller/getStationStatus.php', { cache: 'no-store' });
        if (!res.ok) throw new Error('Status API fetch failed: ' + res.status);
        const rows = await res.json(); // expects [{station_id: 1234, status: "Out of Service"}, ...]
        if (!Array.isArray(rows)) return;
        rows.forEach(r => {
            // ensure numeric ID
            const id = Number(r.station_id);
            if (id) window.stationStatusMap[id] = r.status;
        });

        // If allStations is already loaded, merge statuses and re-render
        if (window.allStations && window.allStations.length) {
            // optional: annotate stations with adminStatus for easy use
            window.allStations.forEach(s => {
                if (s && s.ID && window.stationStatusMap[s.ID]) {
                    s.adminStatus = window.stationStatusMap[s.ID];
                } else {
                    s.adminStatus = 'Available';
                }
            });
        }
    } catch (err) {
        console.error('Error loading station statuses:', err);
    }
}

// Fetch once (keep in memory)
fetch("https://api.openchargemap.io/v3/poi/?output=json&maxresults=40000&verbose=true&compact=false&key=e52e0fe4-6d46-48db-b854-707e9007dce1")
    .then(r => r.json())
    .then(async data => {
        window.allStations = data;
        await loadStationStatuses(); // ensure admin statuses are loaded and merged
        // annotate if not done
        window.allStations.forEach(s => {
            s.adminStatus = s.adminStatus || window.stationStatusMap[s.ID] || 'Available';
        });
        renderStations();
    })
    .catch(err => console.error("Error loading OCM data:", err));

// ==== Search this area button logic ====
const searchBtn = document.getElementById("search-area-btn");

// Show button whenever map is moved
map.on("moveend", () => {
    if (!searchMarker) {
        searchBtn.style.display = "block";
    }
});

// When clicking button → re-render stations in current bounds
searchBtn.addEventListener("click", () => {
    setTimeout(() => renderStations(), 80);
    searchBtn.style.display = "none";
});

//renderStations()
let renderTimeout = null;
// ==== Rendering logic (unchanged except bounds check) ====
function renderStations() {

    //Debounce Start
    if (renderTimeout) clearTimeout(renderTimeout);
    renderTimeout = setTimeout(() => {

        if (window.filterActive) {
            searchBtn.style.display = "none";
            return;
        }

        const bounds = map.getBounds();

        // Remove old markers
        window.allMarkers.forEach(m => map.removeLayer(m));
        window.allMarkers = [];

        if (searchMarker) {
            map.removeLayer(searchMarker);
            searchMarker = null;
        }

        // Filter stations within bounds
        const visibleStations = window.allStations.filter(station => {
            const lat = station.AddressInfo?.Latitude;
            const lon = station.AddressInfo?.Longitude;
            if (typeof lat !== "number" || typeof lon !== "number") return false;
            return bounds.contains([lat, lon]);
        });

        // inside renderStations() — where you create each marker for visibleStations
        visibleStations.forEach(station => {
            const lat = station.AddressInfo.Latitude;
            const lon = station.AddressInfo.Longitude;

            // use adminStatus if present, else fallback to OCM status / Available
            const adminStatus = station.adminStatus || window.stationStatusMap[station.ID] || 'Available';

            // choose icon URL by adminStatus
            const ICONS = {
                'Available': '../image/markers/charging_station.png', // default green pin
                'Under Maintain': '../image/markers/maintenance.png', // orange / warning pin
                'Maintain': '../image/markers/maintenance.png',
                'Out of Service': '../image/markers/out_of_service.png' // red pin
            };

            // fallback to Available icon if not mapped
            const iconUrl = ICONS[adminStatus] || ICONS['Available'];
            const popupHTML = buildPopupHTML(station, adminStatus); // pass adminStatus for overlay

            const marker = L.marker([lat, lon], {
                icon: L.icon({
                    iconUrl: iconUrl,
                    iconSize: [50, 50]
                })
            }).addTo(map).bindPopup(popupHTML, {
                maxWidth: 450,
                minWidth: 450,
                className: 'charging-station-popup'
            });

            marker.on("popupopen", () => {
                const id = station.ID;
                loadRating(id);
                loadFeedback(id);

                // --- Save History Automatically ---
                const addrInfo = station.AddressInfo || {};
                const address = [addrInfo.AddressLine1, addrInfo.Town, addrInfo.StateOrProvince].filter(Boolean).join(", ");

                // Safely get category and type
                let category = "";
                let type = "";
                if (station.Connections && station.Connections.length > 0) {
                    category = station.Connections[0].ConnectionType ? station.Connections[0].ConnectionType.Title : "";
                    type = station.Connections[0].Level ? station.Connections[0].Level.Title : "";
                }

                // Make sure we use addrInfo.Latitude and addrInfo.Longitude!
                saveStationToHistory(addrInfo.Title, address, addrInfo.Latitude, addrInfo.Longitude, category, type);
            });

            window.allMarkers.push(marker);
        });
    }, 120);
}

// ==========================================
// DYNAMIC GLOBAL FETCHING (Map Movement)
// ==========================================
let isFetchingRegional = false;

map.on('moveend', async function() {
    // 1. Don't fetch if the user is currently using the Filter Tool
    if (window.filterActive) return;

    // 2. Prevent fetching if the user is zoomed too far out (saves data & prevents lag)
    // Zoom level 9 is roughly the size of a whole state/province.
    if (map.getZoom() < 9) return;

    // 3. Calculate the center and distance to the edge of the screen
    const center = map.getCenter();
    const bounds = map.getBounds();
    // distanceTo returns meters, so we divide by 1000 to get Kilometers
    const distanceKm = center.distanceTo(bounds.getNorthEast()) / 1000;

    // Cap the search radius at 150km to prevent massive API overloads
    const fetchRadius = Math.min(distanceKm, 150);

    const ocmKey = "e52e0fe4-6d46-48db-b854-707e9007dce1";
    // We use latitude, longitude, and distance instead of a country code!
    const apiUrl = `https://api.openchargemap.io/v3/poi/?output=json&latitude=${center.lat}&longitude=${center.lng}&distance=${fetchRadius}&distanceunit=KM&maxresults=300&compact=false&verbose=true&key=${ocmKey}`;

    if (isFetchingRegional) return;
    isFetchingRegional = true;

    try {
        const res = await fetch(apiUrl);
        const newStations = await res.json();

        if (!window.allStations) window.allStations = [];

        // 4. Merge new stations into our master list WITHOUT duplicates
        const existingIds = new Set(window.allStations.map(s => s.ID));
        let addedCount = 0;

        newStations.forEach(station => {
            if (!existingIds.has(station.ID)) {
                window.allStations.push(station);
                addedCount++;
            }
        });

        // 5. Only re-render if we actually discovered new stations
        if (addedCount > 0) {
            console.log(`🌍 Explored new area: Added ${addedCount} stations to memory.`);
            if (typeof renderStations === 'function') {
                renderStations();
            }
        }
    } catch (err) {
        console.error("Error fetching regional stations:", err);
    } finally {
        isFetchingRegional = false;
    }
});

// Bookmark
// Bookmark
let isProcessingBookmark = false; // Anti-spam flag

function handleBookmark(locationId, isApi = false, locationData = {}) {
    if (!USER_ID) return alert("Login to bookmark");

    // 1. If it's already processing, ignore the click!
    if (isProcessingBookmark) return;

    // 2. Lock the function and update the button UI
    isProcessingBookmark = true;
    let $btn = $('.leaflet-popup .btn-bookmark');
    let originalText = $btn.text();
    $btn.prop('disabled', true).text('Saving...');

    let data;
    if (isApi) {
        data = {
            is_api: 1,
            name: locationData.name,
            address: locationData.address,
            lat: locationData.lat,
            lng: locationData.lng,
            categories: locationData.categories,
            type: locationData.type,
            voltage: locationData.voltage,
            image: locationData.image
        };
    } else {
        data = { location_id: locationId };
    }

    // 3. Send the request
    $.post('../controller/LocationController.php?action=bookmark', data, r => {
        alert(r.message);
    }, 'json').always(() => {
        // 4. ALWAYS unlock the function and reset the button when done (success or fail)
        isProcessingBookmark = false;
        $btn.prop('disabled', false).text(originalText);
    });
}

// Feedback
function submitFeedback(locationId) {
    const feedback = $(`#feedback-${locationId}`).val().trim();
    if (!USER_ID) return alert("Login to leave feedback");
    if (!feedback) return alert("Write something");
    $.post('../controller/LocationController.php?action=feedback', { location_id: locationId, feedback }, r => {
        if (r.success) { alert("Feedback added"); loadFeedback(locationId); }
        else alert(r.message);
    }, 'json');
}

function loadFeedback(locationId) {
    $.get(`../controller/LocationController.php?action=getFeedback&location_id=${locationId}`, r => {
        if (!r.length) {
            $(`#feedback-list-${locationId}`).html("<p>No feedback yet.</p>");
            return;
        }

        let html = r.map(f => {
            const isOwner = USER_ID && USER_ID === f.user_id;
            const deleteBtn = isOwner
                ? `<button class="btn-delete" onclick="deleteFeedback(${f.id}, ${locationId})">Delete</button>`
                : "";

            return `
                <div class="feedback-item">
                    <p><strong>${f.username || "Anonymous"}</strong>: ${esc(f.feedback)}</p>
                    ${deleteBtn}
                </div>
            `;
        }).join("");

        $(`#feedback-list-${locationId}`).html(html);
    }, "json");
}

function deleteFeedback(feedbackId, locationId) {
    if (!confirm("Delete this feedback?")) return;

    $.post("../controller/LocationController.php?action=deleteFeedback", { id: feedbackId }, r => {
        if (r.success) {
            alert("Deleted successfully");
            loadFeedback(locationId);
        } else {
            alert(r.message);
        }
    }, "json");
}

// Ratings
// Ratings
let isProcessingRating = false; // Anti-spam flag

function rateLocation(locationId, rating) {
    if (!USER_ID) return alert("Please login to rate.");

    // 1. If already rating, ignore the click
    if (isProcessingRating) return;

    // 2. Lock the function and fade out the stars slightly so they know it's loading
    isProcessingRating = true;
    $(`#rating-${locationId}`).css('opacity', '0.5');

    // 3. Send the request
    $.post('../controller/LocationController.php?action=rating',
        { location_id: locationId, rating }, r => {
            if (r.success) loadRating(locationId);
            else alert(r.message);
        }, 'json').always(() => {
        // 4. Unlock the function and restore opacity when done
        isProcessingRating = false;
        $(`#rating-${locationId}`).css('opacity', '1');
    });
}

function renderStars(locationId, userRating) {
    let stars = `<p><strong>Your Rating:</strong></p>`;
    for (let i = 1; i <= 5; i++) {
        stars += `<span class="star ${i <= userRating ? 'filled' : ''}" 
            onclick="${!USER_ID ? 'alertLogin()' : `rateLocation(${locationId},${i})`}">★</span>`;
    }
    if (userRating > 0 && USER_ID) {
        stars += `<button onclick="deleteRating(${locationId})" class="delete-rating-btn">🗑️ Remove</button>`;
    }
    return stars;
}

function deleteRating(locationId) {
    if (!USER_ID) return alert("Login to remove rating");
    if (!confirm("Are you sure you want to remove your rating?")) return;
    $.post('../controller/LocationController.php?action=deleteRating', { location_id: locationId }, r => {
        if (r.success) loadRating(locationId);
        else alert("Failed to remove rating");
    }, 'json');
}

function loadRating(locationId) {
    $.get(`../controller/LocationController.php?action=getRatings&location_id=${locationId}`, r => {
        // Even if success is false, we might still have the avg_rating data if it was just an empty result
        if (!r || typeof r.avg_rating === 'undefined') {
            $(`#rating-${locationId}`).html('<p>Unable to load rating</p>');
            return;
        }

        let avgHtml = `<p class="avg-rating"><strong>Average Rating:</strong> ${r.avg_rating.toFixed(1)} ★ (${r.total} ratings)</p>`;
        let userHtml = '';

        if (!USER_ID || USER_ID === '0' || USER_ID === '') {
            // Guest user - show empty stars, click to alert login
            userHtml = `
        <div class="your-rating">
            <p><strong>Your Rating:</strong></p>
            ${[1,2,3,4,5].map(() => `<span class="star" style="cursor:pointer;" onclick="alert('Please login to rate.')">☆</span>`).join('')}
            <p><em>Login to rate this location</em></p>
        </div>
    `;
        } else {
            // Logged-in user
            userHtml = `
        <div class="your-rating">
            ${renderStars(locationId, r.user_rating || 0)}
        </div>
    `;
        }

        $(`#rating-${locationId}`).html(avgHtml + userHtml);
    }, 'json');
}

// Reusable function to save station to history
function saveStationToHistory(stationName, address, lat, lng, category = "", type = "") {
    // Check if user is logged in AND is usertype 2
    if (typeof CURRENT_USER !== 'undefined' && CURRENT_USER.id && CURRENT_USER.id !== '0' && parseInt(CURRENT_USER.usertype) === 2) {
        $.post('../controller/LocationController.php?action=addHistory', {
            is_api: 1,
            name: stationName || 'Unknown Location',
            address: address || '',
            lat: lat,
            lng: lng,
            categories: category,
            type: type
        });
    }
}

// --- GLOBAL POPUP LISTENER (Bypasses MarkerCluster blocking) ---
window.map.on('popupopen', function(e) {
    // e.popup._source is the specific marker that was clicked
    const markerData = e.popup._source.historyData;

    // If this marker has our history data, save it!
    if (markerData) {
        saveStationToHistory(
            markerData.title,
            markerData.address,
            markerData.lat,
            markerData.lng,
            markerData.category,
            markerData.type
        );
    }
});

// Google Maps
function openGoogleMaps(lat, lon) {
    window.open(`https://www.google.com/maps?q=${lat},${lon}`, "_blank");
}

// =========================================================
// GLOBAL BRIDGE: Allow Destination List to Open Sidebar
// =========================================================
window.showLocationDetails = function(locationId) {
    const sidebar = $("#sidebar");
    const overlay = $("#overlay");

    sidebar.addClass("open");
    overlay.show();

    const menuContent = $("#sidebar").children().not("#sidebar-details-view");
    menuContent.hide();

    let detailsView = $('#sidebar-details-view');
    if (detailsView.length === 0) {
        $('#sidebar').append('<div id="sidebar-details-view" style="color:white; overflow-y:auto; height:100%;"></div>');
        detailsView = $('#sidebar-details-view');
    }

    detailsView.show().html('<div class="text-center p-4"><i class="fa fa-spinner fa-spin fa-2x"></i><br>Loading details...</div>');

    let stationData = null;
    if (window.allStations) {
        stationData = window.allStations.find(s => s.ID == locationId);
    }

    if (stationData) {
        renderSidebarContent(stationData);
    } else {
        $.getJSON('../controller/LocationController.php', { action: 'getLocationDetails', id: locationId }, function(data) {
            renderSidebarContent(data);
        });
    }

    function renderSidebarContent(data) {
        const title = data.AddressInfo ? data.AddressInfo.Title : (data.Title || 'Unknown');
        const addr = data.AddressInfo ? data.AddressInfo.AddressLine1 : (data.AddressLine1 || '');
        const lat = data.AddressInfo ? data.AddressInfo.Latitude : data.Latitude;
        const lng = data.AddressInfo ? data.AddressInfo.Longitude : data.Longitude;

        // FIXED 3: Status Logic Sync
        let statusTitle = (data.StatusType && data.StatusType.Title) ? data.StatusType.Title : "Unknown";
        let isOperational = (data.StatusType && data.StatusType.IsOperational);

        if(statusTitle.toLowerCase().includes('maintain') ||
            statusTitle.toLowerCase().includes('service') ||
            statusTitle.toLowerCase().includes('planned')) {
            isOperational = false;
        }

        const googleMapsLink = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

        // FIXED 2: Image Logic - Strict check to prevent empty img tag
        let imgHtml = '';
        if (data.MediaItems && data.MediaItems.length > 0) {
            let imgUrl = data.MediaItems[0].ItemURL || data.MediaItems[0].ItemThumbnailURL;
            if(imgUrl && imgUrl !== 'undefined' && imgUrl !== 'null') {
                imgHtml = `<img src="${imgUrl}" class="img-fluid rounded mb-3" style="width:100%; border:1px solid #444;" onerror="this.style.display='none'">`;
            }
        }

        let html = `
            <div class="p-3">
                <button class="btn btn-sm btn-outline-secondary mb-3" onclick="closeDetailsView()" style="border-color:#555; color:#ccc;">
                    <i class="fa fa-arrow-left"></i> Back
                </button>
                
                ${imgHtml}

                <h4 style="color:#fff;">${title}</h4>
                <p style="color:#bbb; font-size:13px;"><i class="fa fa-map-marker"></i> ${addr}</p>
                <hr style="border-color: #333;">
                
                <div class="row mb-3">
                    <div class="col-6">
                        <small style="color:#888;">Status</small><br>
                        <strong style="color:${isOperational ? '#2ecc71' : '#e74c3c'}">${statusTitle}</strong>
                    </div>
                </div>
                
                <p class="small text-muted">${data.GeneralComments || ''}</p>
                
                <button onclick="window.open('${googleMapsLink}', '_blank')" class="btn btn-success btn-block mt-3">
                   <i class="fa fa-location-arrow"></i> Navigate via Google Maps
                </button>
            </div>
        `;
        detailsView.html(html);
    }
};

window.closeDetailsView = function() {
    $('#sidebar-details-view').hide();
    $("#sidebar").children().not("#sidebar-details-view").fadeIn();
};

window.renderMapMarkers = function(stations) {
    if (!window.markers) {
        if(typeof L.markerClusterGroup === 'function') {
            window.markers = L.markerClusterGroup();
        } else {
            window.markers = L.layerGroup();
        }
        map.addLayer(window.markers);
    } else {
        window.markers.clearLayers();
    }

    stations.forEach(station => {
        const lat = station.AddressInfo.Latitude;
        const lng = station.AddressInfo.Longitude;

        // FIXED 3: Status Logic Sync
        let statusTitle = (station.StatusType && station.StatusType.Title) ? station.StatusType.Title : "Unknown";
        let isOperational = true;

        if (station.StatusType && !station.StatusType.IsOperational) isOperational = false;

        // Force non-operational if text says maintenance
        if (statusTitle.toLowerCase().includes('maintain') ||
            statusTitle.toLowerCase().includes('service') ||
            statusTitle.toLowerCase().includes('planned')) {
            isOperational = false;
        }

        const markerIcon = L.icon({
            iconUrl: isOperational
                ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/markers-default/green-2x.png'
                : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/markers-default/grey-2x.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
        });

        const marker = L.marker([lat, lng], { icon: markerIcon });

        // FIXED 2: Image Logic - Strict check
        let imageHtml = '';
        if(station.MediaItems && station.MediaItems.length > 0) {
            let imgUrl = station.MediaItems[0].ItemURL || station.MediaItems[0].ItemThumbnailURL;
            if(imgUrl && imgUrl !== 'undefined' && imgUrl !== 'null') {
                imageHtml = `<img src="${imgUrl}" style="width:100%; height:120px; object-fit:cover; border-radius:4px; margin-bottom:8px;" onerror="this.style.display='none'">`;
            }
        }

        const popupContent = `
            <div style="min-width:200px;">
                ${imageHtml}
                <h6 style="margin:0 0 5px 0; font-weight:bold;">${station.AddressInfo.Title}</h6>
                <p style="font-size:12px; color:#666; margin-bottom:8px;">${station.AddressInfo.AddressLine1 || ''}</p>
                <div style="font-size:11px; margin-bottom:5px;">
                    Status: <strong style="color:${isOperational ? 'green' : 'red'}">${statusTitle}</strong>
                </div>
                <button class="btn btn-primary btn-sm btn-block" onclick="panToPanelStation(${station.ID}, ${lat}, ${lng})">View Details</button>
            </div>
        `;

        marker.bindPopup(popupContent);

        // --- NEW CODE: Just store the data inside the marker! ---
        marker.historyData = {
            title: station.AddressInfo.Title || 'Unknown Location',
            address: [station.AddressInfo.AddressLine1, station.AddressInfo.Town, station.AddressInfo.StateOrProvince].filter(Boolean).join(", "),
            lat: station.AddressInfo.Latitude,
            lng: station.AddressInfo.Longitude,
            category: (station.Connections && station.Connections.length > 0 && station.Connections[0].ConnectionType) ? station.Connections[0].ConnectionType.Title : "",
            type: (station.Connections && station.Connections.length > 0 && station.Connections[0].Level) ? station.Connections[0].Level.Title : ""
        };
        window.markers.addLayer(marker);
    });
};

function getConnectorImage(id) {
    // OpenChargeMap IDs
    switch (id) {
        case 1:  return '../image/connectors/type1.png';    // Type 1 (J1772)
        case 2:  return '../image/connectors/chademo.png';  // CHAdeMO
        case 25: return '../image/connectors/type2.png';    // Type 2 (Socket)
        case 1036: return '../image/connectors/type2.png';  // Type 2 (Tethered)
        case 33: return '../image/connectors/ccs2.png';     // CCS (Type 2)
        case 32: return '../image/connectors/ccs1.png';     // CCS (Type 1)
        case 27:
        case 30: return '...-/image/connectors/tesla.png';    // Tesla
        case 28: return '../image/connectors/wall.png';     // 3-Pin / Wall
        default: return null; // No image found
    }
}
// Trigger Direction Panel from Sidebar
$("#sidebar-search-trigger").click(function(e) {
    e.preventDefault(); // Stop the page from jumping/reloading

    // 1. Close the sidebar and hide the overlay
    $("#sidebar").removeClass("open");
    $("#overlay").hide();

    // 2. Trigger the Direction Panel
    // This uses your existing logic in dashboard.php for the #direction-panel
    $('.navbar').slideUp(200);
    $('.top-controls').slideUp(200);
    $('#direction-panel').fadeIn(200);

    // 3. Adjust the map position to the top
    $('#map').animate({ top: '0' }, 200);

});