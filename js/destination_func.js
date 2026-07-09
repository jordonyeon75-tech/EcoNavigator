$(document).ready(function() {
    // --- NEW: Load Admin Statuses from Database ---
    window.customStatusMap = {}; // Global variable to store your DB statuses

    function loadLocalStatuses() {
        $.getJSON('/controller/getStationStatus.php', function(data) {
            if(Array.isArray(data)) {
                data.forEach(function(item) {
                    // Map station_id -> status string (e.g. "Under Maintain")
                    window.customStatusMap[item.station_id] = item.status;
                });
                console.log("Custom Admin Statuses Loaded:", window.customStatusMap);
            }
        });
    }
    loadLocalStatuses(); // Run immediately

    // --- VARIABLES ---
    let routeLayerGroup = L.layerGroup().addTo(map);
    let selectedStationMarker = null;
    let currentSearchCoords = null;
    let currentRadius = 0.5;
    let transportMode = 'driving';
    let stopCount = 0;

    // --- EVENT LISTENERS ---
    $('.mode-btn').click(function() {
        $('.mode-btn').removeClass('active');
        $(this).addClass('active');
        const title = $(this).attr('title');
        transportMode = (title === 'Walking') ? 'walking' : 'driving';

        $('.summary-option').removeClass('active-option');
        if(transportMode === 'driving') $('#summary-drive-box').addClass('active-option');
        else $('#summary-walk-box').addClass('active-option');

        if($('#start-input').val() && $('.dest-input-field').first().val()) {
            $('#get-directions-btn').click();
        }
    });

    $('.dir-swap button').click(function() {
        const startVal = $('#start-input').val();
        const firstDest = $('.dest-input-field').first();
        const destVal = firstDest.val();
        $('#start-input').val(destVal);
        firstDest.val(startVal);
    });

    $('#get-directions-btn').click(() => handleSearch());
    $('#clear-route-btn').click(clearRoute);

    $('#add-stop-btn').click(function() {
        if ($('.dest-input-field').length >= 10) { alert("Maximum 10 stops allowed."); return; }
        stopCount++;
        const newRowId = `wp-row-${stopCount}`;
        const inputId = `dest-input-${stopCount}`;

        const html = `
            <div class="waypoint-row position-relative mb-2" id="${newRowId}">
                <div class="d-flex align-items-center">
                    <div class="timeline-icon">
                        <div class="line-dotted"></div>
                        <i class="fa fa-circle-o text-muted" style="font-size:10px;"></i>
                    </div>
                    <input type="text" class="form-control dir-input waypoint-input dest-input-field" 
                           data-id="${stopCount}" id="${inputId}" placeholder="Stop ${stopCount}..." autocomplete="off">
                    <button class="btn-remove-stop" onclick="removeStop('${newRowId}')">
                        <i class="fa fa-times"></i>
                    </button>
                </div>
                <div class="search-suggestions list-group" id="suggestions-${stopCount}"></div>
            </div>
        `;
        $('#waypoints-container').append(html);
        bindSuggestionEvents();
    });

    // Global function to remove stop and INSTANTLY recalculate
    window.removeStop = function(rowId) {
        $(`#${rowId}`).remove();
        const hasStart = $('#start-input').val().trim() !== '';
        let validDestCount = 0;
        $('.dest-input-field').each(function() { if($(this).val().trim() !== '') validDestCount++; });

        if (hasStart && validDestCount > 0) {
            handleSearch(); // Instant Recalculate
        } else {
            routeLayerGroup.clearLayers();
            $('#direction-results-list').show();
            $('#trip-summary-footer').hide();
            $('#route-alert-box').hide();
        }
    };

    bindSuggestionEvents();

    function bindSuggestionEvents() {
        $('.dest-input-field, #start-input').off('keyup');
        let typingTimer;
        $('.dest-input-field, #start-input').on('keyup', function() {
            clearTimeout(typingTimer);
            const query = $(this).val();
            const inputElem = $(this);
            const isStart = inputElem.attr('id') === 'start-input';
            const suggestionBoxId = isStart ? '#suggestions-start' : `#suggestions-${inputElem.data('id')}`;

            if(query.length < 3) { $(suggestionBoxId).hide(); return; }
            typingTimer = setTimeout(() => { doLiveSearch(query, suggestionBoxId, inputElem); }, 300);
        });
    }

    // ==========================================
    // 0. HELPER: TOGGLE FULL SIDEBAR (Google Maps Style)
    // ==========================================
    // This hides the input controls when viewing details/preview
    function toggleSidebarMode(isFullView) {
        if (isFullView) {
            // Hide the controls (inputs, buttons) - using CSS class we added
            $('.dir-header, .dir-body').addClass('sidebar-hidden');
            // Hide the footer summary (since details/preview has its own info)
            $('#trip-summary-footer').addClass('sidebar-hidden');

            // Show the details view container and ensure it's visible
            $('#direction-details-view').show();
            $('#direction-results-list').hide();
        } else {
            // Show controls again
            $('.dir-header, .dir-body').removeClass('sidebar-hidden');
            $('#trip-summary-footer').removeClass('sidebar-hidden');

            // Hide details, show list
            $('#direction-details-view').hide();
            $('#direction-results-list').show();
        }
    }

    // ==========================================
    // 1. CONSISTENCY LOGIC (Preserved)
    // ==========================================
    function getSeededRandom(seed) {
        var x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    function getStationSimulation(stationId, totalSlots) {
        let occupied = 0;
        let slotsData = [];
        for (let i = 0; i < totalSlots; i++) {
            const seed = stationId + (i * 123);
            const isOccupied = getSeededRandom(seed) > 0.4;
            let slotInfo = { status: 'Available', battery: 0, isOccupied: false };
            if (isOccupied) {
                occupied++;
                slotInfo.isOccupied = true;
                slotInfo.status = 'Charging';
                slotInfo.battery = Math.floor(getSeededRandom(seed + 5) * 80) + 10;
            }
            slotsData.push(slotInfo);
        }
        return { total: totalSlots, free: totalSlots - occupied, occupied: occupied, slots: slotsData };
    }

    // ==========================================
    // UPDATED: CHECK LOCAL DATABASE FIRST
    // ==========================================
    function getStationStatus(st) {
        let title = 'Unknown';
        let id = st.StatusTypeID;

        // 1. CHECK YOUR LOCAL DATABASE OVERRIDE FIRST
        // If this station ID exists in your custom DB, use THAT status
        if (window.customStatusMap && window.customStatusMap[st.ID]) {
            const dbStatus = window.customStatusMap[st.ID]; // e.g., "Under Maintain"

            if (dbStatus === 'Under Maintain') {
                return { title: 'Under Maintain', class: 'status-maintain', color: '#f39c12' };
            }
            if (dbStatus === 'Out of Service') {
                return { title: 'Out of Service', class: 'status-full', color: '#dc3545' };
            }
            if (dbStatus === 'Available') {
                return { title: 'Available', class: 'status-open', color: '#28a745' };
            }
        }

        // 2. FALLBACK: Use OpenChargeMap Data (if no Admin override)
        if (st.StatusType && st.StatusType.Title) {
            title = st.StatusType.Title;
        }

        let lowerTitle = title.toLowerCase();

        // --- Standard Logic ---

        // Under Maintain
        if (id == 200 || lowerTitle.includes('maintain') || lowerTitle.includes('planned')) {
            return { title: 'Under Maintain', class: 'status-maintain', color: '#f39c12' };
        }

        // Out of Service
        if (id == 100 || lowerTitle.includes('out of service') || lowerTitle.includes('not operational')) {
            return { title: 'Out of Service', class: 'status-full', color: '#dc3545' };
        }

        // Available (Default catch-all for working stations)
        if (id == 50 || id == 10 || lowerTitle.includes('available') || lowerTitle.includes('operational')) {
            return { title: 'Available', class: 'status-open', color: '#28a745' };
        }

        // Unknown
        return { title: title, class: 'status-unknown', color: '#666' };
    }

    // --- SEARCH FUNCTIONS ---
    function doLiveSearch(query, outputId, inputElem) {
        const suggestions = $(outputId);
        suggestions.empty().show();
        if(window.allStations) {
            const matches = window.allStations.filter(s =>
                s.AddressInfo.Title.toLowerCase().includes(query.toLowerCase())
            ).slice(0, 3);
            matches.forEach(s => {
                const safeTitle = s.AddressInfo.Title.replace(/'/g, "\\'");
                const isStart = inputElem.attr('id') === 'start-input';
                const dataId = inputElem.data('id');
                suggestions.append(`
                    <a href="#" class="list-group-item list-group-item-action p-2 small" 
                       onclick="selectSuggestion('${safeTitle}', ${s.AddressInfo.Latitude}, ${s.AddressInfo.Longitude}, true, ${s.ID}, ${isStart}, ${dataId})">
                        <div class="d-flex align-items-center">
                            <span style="width:25px; text-align:center; margin-right:10px;"><i class="fa fa-bolt text-success" style="font-size:16px;"></i></span>
                            <span>${s.AddressInfo.Title}</span>
                        </div>
                    </a>
                `);
            });
        }
    }

    window.selectSuggestion = function(name, lat, lng, isStation, id, isStart, dataId) {
        let targetInput = isStart ? $('#start-input') : $(`.dest-input-field[data-id="${dataId}"]`);
        targetInput.val(name);
        targetInput.data('coords', { lat: lat, lng: lng, isStation: isStation, id: id, title: name });
        $('.search-suggestions').hide();
    };

    // ==========================================
    // MAIN HANDLER
    // ==========================================
    async function handleSearch() {
        $('#search-suggestions').hide();
        $('#direction-results-list').show();
        $('#direction-details-view').hide();
        $('#route-alert-box').hide();
        $('#trip-summary-footer').show();

        // Ensure we are in "List Mode" (search visible)
        toggleSidebarMode(false);

        let startCoords = null;
        const startInput = $('#start-input');
        const startVal = startInput.val();

        if(startVal.toLowerCase().includes("current") || startVal.trim() === "") {
            try {
                const pos = await getCurrentPositionPromise();
                startCoords = L.latLng(pos.coords.latitude, pos.coords.longitude);
            } catch(e) { alert("Enable location services"); return; }
        } else if (startInput.data('coords')) {
            startCoords = L.latLng(startInput.data('coords').lat, startInput.data('coords').lng);
        } else {
            startCoords = await searchAddressAPI(startVal);
        }
        if(!startCoords) return;

        let waypoints = [];
        waypoints.push({ latLng: startCoords, isStation: false, title: "Start Location" });

        const destInputs = $('.dest-input-field');
        for(let i=0; i<destInputs.length; i++) {
            const input = $(destInputs[i]);
            const val = input.val();
            if(val.trim() === '') continue;
            let coordsData = input.data('coords');
            if(!coordsData) {
                const apiCoords = await searchAddressAPI(val);
                if(apiCoords) coordsData = { lat: apiCoords.lat, lng: apiCoords.lng, isStation: false, title: val, id: null };
            }
            if(coordsData) {
                waypoints.push({
                    latLng: L.latLng(coordsData.lat, coordsData.lng),
                    isStation: coordsData.isStation,
                    id: coordsData.id,
                    title: coordsData.title
                });
            }
        }
        if(waypoints.length < 2) return;

        // Trip Planner Logic (Range > 300km)
        const firstSegmentDist = waypoints[0].latLng.distanceTo(waypoints[1].latLng) / 1000;
        if (firstSegmentDist > 300) {
            const p1 = waypoints[0].latLng;
            const p2 = waypoints[1].latLng;
            const midLat = (p1.lat + p2.lat) / 2;
            const midLng = (p1.lng + p2.lng) / 2;

            if(window.allStations) {
                let bestStation = null, minDiff = 9999999;
                window.allStations.forEach(st => {
                    const d = Math.sqrt(Math.pow(st.AddressInfo.Latitude - midLat, 2) + Math.pow(st.AddressInfo.Longitude - midLng, 2));
                    if(d < minDiff) { minDiff = d; bestStation = st; }
                });
                if(bestStation) {
                    waypoints.splice(1, 0, {
                        latLng: L.latLng(bestStation.AddressInfo.Latitude, bestStation.AddressInfo.Longitude),
                        isStation: true, id: bestStation.ID, title: bestStation.AddressInfo.Title, autoAdded: true
                    });
                    $('#route-alert-box').html(`<i class="fa fa-exclamation-triangle"></i> <b>Long Trip (>300km)</b><br>Added stop: <b>${bestStation.AddressInfo.Title}</b>`).fadeIn();
                }
            }
        }

        const finalDest = waypoints[waypoints.length - 1];
        currentSearchCoords = finalDest.latLng;
        currentRadius = 0.5;

        drawMultiRoute(waypoints);
        generateNearbyList(finalDest.latLng, currentRadius, finalDest.isStation);
        $('#clear-route-btn').show();
        calculateTripStats(waypoints);
    }

    function drawMultiRoute(pointsData) {
        routeLayerGroup.clearLayers();

        // 1. Draw Markers
        pointsData.forEach((pt, index) => {
            let iconUrl, iconSize, anchor;
            if (index === 0) {
                // Start Icon (Green)
                iconUrl = '../image/markers/location_here.png';
                iconSize = [50, 50]; anchor = [12, 41];
            } else if (index === pointsData.length - 1) {
                // Final Destination Icon
                if(pt.isStation) {
                    iconUrl = '../image/markers/charging_station_info.png'; // Your Station Icon
                    iconSize = [50, 50]; anchor = [22, 45];
                } else {
                    iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/markers-default/red-2x.png'; // Red Pin
                    iconSize = [25, 41]; anchor = [12, 41];
                }
            } else {
                // Intermediate Stops (Blue or Special Auto-Added)
                iconUrl = pt.autoAdded ? 'https://cdn-icons-png.flaticon.com/512/3448/3448330.png' : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/markers-default/blue-2x.png';
                iconSize = pt.autoAdded ? [35, 35] : [25, 41]; anchor = pt.autoAdded ? [17, 35] : [12, 41];
            }

            const marker = L.marker(pt.latLng, {icon: new L.Icon({iconUrl, shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize, iconAnchor: anchor, popupAnchor: [1, -34], shadowSize: [41, 41]})}).addTo(routeLayerGroup);

            // Bind Popups
            if (pt.isStation && pt.id) {
                let stData = window.allStations.find(s => s.ID == pt.id);
                // Safety check if station data exists
                let title = pt.title;
                let simData = {free: '--', total: '--'};
                let statusColor = '#666'; let statusTitle = 'Unknown';

                if (stData) {
                    const statusInfo = getStationStatus(stData);
                    statusColor = statusInfo.color;
                    statusTitle = statusInfo.title;
                    const numPoints = stData.NumberOfPoints || (stData.Connections ? stData.Connections.length : 1);
                    simData = getStationSimulation(pt.id, numPoints);
                }

                marker.bindPopup(`
                    <div style="text-align:center;">
                        <b>${title}</b><br>
                        <span style="color:${statusColor}; font-weight:bold;">${statusTitle}</span><br>
                        <span style="font-size:11px;">${simData.free} / ${simData.total} Plugs Free</span><br>
                        <div class="btn-group-custom justify-content-center mt-2">
                             <button class="btn btn-sm btn-primary" onclick="panToPanelStation(${pt.id}, ${pt.latLng.lat}, ${pt.latLng.lng})">Details</button>
                             <button class="btn btn-sm btn-outline-primary" onclick="showRoutePreview(${pt.latLng.lat}, ${pt.latLng.lng}, '${title.replace(/'/g, "\\'")}')">Preview</button>
                        </div>
                    </div>
                `);
            } else {
                marker.bindPopup(`<b>${pt.title}</b>`);
            }
            if (index === pointsData.length - 1 && pt.isStation) { selectedStationMarker = marker; marker.openPopup(); }
        });

        // 2. RESTORED: Draw Radius Circle around the FINAL destination
        // This was the missing part!
        const lastPt = pointsData[pointsData.length - 1];
        if (lastPt) {
            L.circle(lastPt.latLng, {
                color: '#3498DB',
                fillColor: '#3498DB',
                fillOpacity: 0.1,
                radius: currentRadius * 1000 // Convert km to meters
            }).addTo(routeLayerGroup);
        }

        // 3. Draw Route Line (OSRM)
        const coordString = pointsData.map(p => `${p.latLng.lng},${p.latLng.lat}`).join(';');
        const url = `https://router.project-osrm.org/route/v1/${transportMode}/${coordString}?overview=full&geometries=geojson`;

        $.get(url, function(data) {
            if(data.routes && data.routes.length > 0) {
                const routeStyle = (transportMode === 'walking') ? { color: '#e67e22', weight: 5, opacity: 0.7, dashArray: '10, 10' } : { color: 'blue', weight: 5, opacity: 0.6 };
                const line = L.geoJSON(data.routes[0].geometry, { style: routeStyle });
                line.addTo(routeLayerGroup);
                map.fitBounds(line.getBounds(), { padding: [50, 50] });
            }
        });
    }

    function calculateTripStats(pointsData) {
        const coordString = pointsData.map(p => `${p.latLng.lng},${p.latLng.lat}`).join(';');
        $('#summary-car-time').text('...'); $('#summary-car-dist').text('...');
        $('#summary-walk-time').text('...'); $('#summary-walk-dist').text('...');

        $.get(`https://router.project-osrm.org/route/v1/driving/${coordString}?overview=false`, function(data) {
            if(data.routes && data.routes.length > 0) {
                $('#summary-car-time').text(formatTime(data.routes[0].duration));
                $('#summary-car-dist').text((data.routes[0].distance/1000).toFixed(1) + ' km');
            } else $('#summary-car-time').text('N/A');
        }).fail(() => $('#summary-car-time').text('Error'));

        $.get(`https://router.project-osrm.org/route/v1/walking/${coordString}?overview=false`, function(data) {
            if(data.routes && data.routes.length > 0) {
                $('#summary-walk-time').text(formatTime(data.routes[0].duration));
                $('#summary-walk-dist').text((data.routes[0].distance/1000).toFixed(1) + ' km');
            } else { $('#summary-walk-time').text('--'); $('#summary-walk-dist').text('No Path'); }
        }).fail(() => { $('#summary-walk-time').text('--'); $('#summary-walk-dist').text('Unavailable'); });
    }

    function formatTime(seconds) {
        const min = Math.round(seconds / 60);
        if (min > 60) {
            const h = Math.floor(min / 60);
            const m = min % 60;
            return `${h} h ${m} min`;
        }
        return `${min} min`;
    }

    // ==========================================
    // UPDATED: GENERATE NEARBY LIST (With Connector Badges + Share + Status)
    // ==========================================
    function generateNearbyList(center, radius, isDestinationStation) {
        const list = $('#direction-results-list');
        list.empty();

        if(!isDestinationStation) {
            list.append(`<div class="alert alert-warning small p-2 mb-2">Destination is not a station. Showing nearby chargers.</div>`);
        }

        if(!window.allStations) return;

        // 1. Filter stations within radius
        let visibleStations = [];
        window.allStations.forEach(st => {
            const dist = center.distanceTo([st.AddressInfo.Latitude, st.AddressInfo.Longitude]) / 1000;
            if(dist <= radius) {
                st.dist = dist;
                visibleStations.push(st);
            }
        });

        // Sort by distance
        visibleStations.sort((a,b) => a.dist - b.dist);
        list.append(`<div class="p-2 small text-muted font-weight-bold">NEARBY STATIONS (${visibleStations.length}):</div>`);

        // 2. Loop through to create LIST items AND Map MARKERS
        visibleStations.forEach(st => {
            const status = getStationStatus(st);
            const safeTitle = st.AddressInfo.Title.replace(/'/g, "\\'");

            // --- ADD-ON: CONNECTOR BADGES ---
            let connectorBadges = '';
            if (st.Connections && st.Connections.length > 0) {
                const uniqueTypes = [...new Set(st.Connections.map(c => c.ConnectionType ? c.ConnectionType.Title : 'Unknown'))];
                uniqueTypes.forEach(type => {
                    connectorBadges += `<span style="font-size:10px; background:#f8f9fa; color:#555; padding:2px 5px; border-radius:3px; margin-right:4px; border:1px solid #ddd; display:inline-block; margin-bottom:2px;">${type}</span>`;
                });
            }
            // --------------------------------

            // --- A. ADD TO SIDEBAR LIST ---
            const html = `
                <div class="station-route-card" style="cursor:pointer;" 
                     onclick="panToMapMarker(${st.AddressInfo.Latitude}, ${st.AddressInfo.Longitude})">
                    <div class="d-flex justify-content-between">
                        <div class="station-route-name text-truncate" style="max-width:65%">${st.AddressInfo.Title}</div>
                        <div class="text-primary font-weight-bold" style="font-size:12px;">${st.dist.toFixed(1)} km</div>
                    </div>
                    
                    <div class="mb-1">${connectorBadges}</div>

                    <span class="route-status ${status.class}">${status.title}</span>
                    
                    <div class="btn-group-custom d-flex mt-2">
                        <button class="btn btn-sm btn-outline-primary flex-fill mr-1" 
                                onclick="event.stopPropagation(); panToPanelStation(${st.ID}, ${st.AddressInfo.Latitude}, ${st.AddressInfo.Longitude})">
                                Details
                        </button>
                        <button class="btn btn-sm btn-outline-dark flex-fill mr-1" 
                                onclick="event.stopPropagation(); showRoutePreview(${st.AddressInfo.Latitude}, ${st.AddressInfo.Longitude}, '${safeTitle}')">
                                <i class="fa fa-location-arrow"></i> Preview
                        </button>
                        <button class="btn btn-sm btn-outline-success" style="flex: 0 0 40px;" 
                                onclick="event.stopPropagation(); shareStationLocation(${st.AddressInfo.Latitude}, ${st.AddressInfo.Longitude}, '${safeTitle}')"
                                title="Share Location">
                                <i class="fa fa-share-alt"></i>
                        </button>
                    </div>
                </div>
            `;
            list.append(html);

            // --- B. ADD MARKER TO MAP (With Dynamic Colors) ---
            let iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png';
            if (status.class === 'status-maintain') iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png';
            else if (status.class === 'status-full') iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png';
            else if (status.class === 'status-unknown') iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png';

            let isAlreadyDrawn = false;
            routeLayerGroup.eachLayer(layer => {
                if(layer instanceof L.Marker) {
                    const ll = layer.getLatLng();
                    if (Math.abs(ll.lat - st.AddressInfo.Latitude) < 0.0001 && Math.abs(ll.lng - st.AddressInfo.Longitude) < 0.0001) isAlreadyDrawn = true;
                }
            });

            if (!isAlreadyDrawn) {
                const marker = L.marker([st.AddressInfo.Latitude, st.AddressInfo.Longitude], {
                    icon: new L.Icon({
                        iconUrl: iconUrl,
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
                    })
                }).addTo(routeLayerGroup);

                // Re-use simulation logic for popup text
                const numPoints = st.NumberOfPoints || (st.Connections ? st.Connections.length : 1);
                const simData = getStationSimulation(st.ID, numPoints);

                marker.bindPopup(`
                    <div style="text-align:center;">
                        <b>${st.AddressInfo.Title}</b><br>
                        <span style="color:${status.color}; font-weight:bold;">${status.title}</span><br>
                        <span style="font-size:11px;">${simData.free} / ${simData.total} Plugs Free</span><br>
                        <div class="btn-group-custom justify-content-center mt-2">
                             <button class="btn btn-sm btn-primary" onclick="panToPanelStation(${st.ID}, ${st.AddressInfo.Latitude}, ${st.AddressInfo.Longitude})">Details</button>
                        </div>
                    </div>
                `);
            }
        });

        // --- C. EXPAND RANGE BUTTON ---
        const btn = $(`<button class="btn btn-light btn-block btn-sm mt-3 mb-5">Expand Range (+0.5km)</button>`);
        btn.click(function() {
            currentRadius += 0.5;
            routeLayerGroup.eachLayer(function(layer) {
                if (layer instanceof L.Circle) layer.setRadius(currentRadius * 1000);
            });
            generateNearbyList(center, currentRadius, isDestinationStation);
        });
        list.append(btn);
    }

    // ==========================================
    // NEW: SHOW ROUTE PREVIEW (Turn-by-Turn)
    // ==========================================
    window.showRoutePreview = function(destLat, destLng, destTitle) {
        // 1. Enter Full Sidebar Mode (Hide Inputs)
        toggleSidebarMode(true);
        const details = $('#direction-details-view');
        details.show().html('<div class="text-center p-4"><i class="fa fa-spinner fa-spin"></i> Loading Route...</div>');

        // 2. Identify Start Location
        let startInputVal = $('#start-input').val();
        let startCoords = null;
        const sData = $('#start-input').data('coords');

        // Helper to run route after fetching start
        const runRoute = (sLat, sLng) => {
            fetchPreviewRoute(sLng, sLat, destLng, destLat, destTitle);
        };

        if (sData) {
            runRoute(sData.lat, sData.lng);
        } else if (startInputVal.toLowerCase().includes("current") || startInputVal.trim() === "") {
            // Fetch GPS if current location
            navigator.geolocation.getCurrentPosition(pos => {
                runRoute(pos.coords.latitude, pos.coords.longitude);
            }, () => {
                details.html('<div class="p-3 text-danger">Could not get location. <button class="btn btn-link" onclick="exitFullMode()">Back</button></div>');
            });
        } else {
            // Fallback: If text exists but no data, we can't route safely without geocoding
            // For now, ask user to search again
            details.html('<div class="p-3 text-danger">Please calculate a route first. <button class="btn btn-link" onclick="exitFullMode()">Back</button></div>');
        }
    };

    function fetchPreviewRoute(startLng, startLat, destLng, destLat, destTitle) {
        // Request steps=true from OSRM
        const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=false&steps=true`;

        $.get(url, function(data) {
            if(!data.routes || data.routes.length === 0) {
                $('#direction-details-view').html('<div class="p-3">No route found.</div>');
                return;
            }

            const route = data.routes[0];
            const steps = route.legs[0].steps;
            const duration = formatTime(route.duration);
            const dist = (route.distance/1000).toFixed(1) + " km";

            let stepsHtml = '';
            steps.forEach(step => {
                let icon = 'fa-arrow-up';
                const m = step.maneuver.type;
                const mod = step.maneuver.modifier; // left, right, slight right

                // Map OSRM maneuvers to FontAwesome Icons
                if(m === 'turn') {
                    if(mod && mod.includes('left')) icon = 'fa-arrow-left';
                    else if(mod && mod.includes('right')) icon = 'fa-arrow-right';
                } else if (m === 'new name') {
                    icon = 'fa-compass';
                } else if (m === 'depart') {
                    icon = 'fa-circle-o';
                } else if (m === 'arrive') {
                    icon = 'fa-map-marker';
                } else if (m === 'roundabout') {
                    icon = 'fa-refresh';
                } else if (mod && mod.includes('slight')) {
                    icon = (mod.includes('left')) ? 'fa-location-arrow' : 'fa-location-arrow fa-flip-horizontal';
                }

                // Construct Text
                let instr = step.name ? `Head on <b>${step.name}</b>` : "Continue";
                if(m === 'turn' && mod) instr = `Turn <b>${mod.replace(/_/g, ' ')}</b> onto <b>${step.name || 'road'}</b>`;
                else if (m === 'roundabout') instr = `At roundabout, take exit ${step.maneuver.exit}`;
                else if (m === 'arrive') instr = `Arrive at <b>${destTitle}</b>`;
                else if (m === 'depart') instr = `Head towards <b>${step.name || 'destination'}</b>`;

                stepsHtml += `
                    <div class="direction-step">
                        <div class="step-icon"><i class="fa ${icon}"></i></div>
                        <div class="step-content">
                            <div class="step-instr">${instr}</div>
                            <div class="step-dist">${step.distance > 0 ? Math.round(step.distance) + ' m' : ''}</div>
                        </div>
                    </div>
                `;
            });

            // Render Full Panel
            const html = `
                <div class="h-100 d-flex flex-column">
                    <div class="p-3 border-bottom bg-white shadow-sm">
                         <button class="btn btn-sm btn-link pl-0 mb-2 text-dark font-weight-bold" onclick="exitFullMode()">
                            <i class="fa fa-arrow-left"></i> Back to List
                        </button>
                        <h5 class="mb-0 text-truncate">${destTitle}</h5>
                        <div class="text-muted small mt-1">
                            <i class="fa fa-car"></i> ${duration} (${dist})
                        </div>
                    </div>
                    <div class="overflow-auto bg-white flex-fill">
                        ${stepsHtml}
                    </div>
                    <div class="p-3 border-top bg-light">
                        <button class="btn btn-primary btn-block" onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}', '_blank')">
                            <i class="fa fa-location-arrow"></i> Start Navigation
                        </button>
                    </div>
                </div>
            `;
            $('#direction-details-view').html(html);
        });
    }

    // ==========================================
    // UPDATED: STATION DETAILS (Full Sidebar)
    // ==========================================
    window.panToPanelStation = function(id, lat, lng) {
        toggleSidebarMode(true); // <--- HIDE INPUTS
        const details = $('#direction-details-view');
        details.show().html('<div class="text-center p-4"><i class="fa fa-spinner fa-spin"></i> Loading...</div>');

        let data = window.allStations.find(s => s.ID == id);
        if(data) renderPanelDetails(data);
    };

    window.exitFullMode = function() {
        toggleSidebarMode(false); // <--- SHOW INPUTS & LIST
    };

    // --- HELPER: Click List Item -> Show on Map ---
    window.panToMapMarker = function(lat, lng) {
        map.setView([lat, lng], 16); // Pan Map
        // Find the marker and open its popup
        routeLayerGroup.eachLayer(function(layer) {
            if(layer instanceof L.Marker) {
                const lLat = layer.getLatLng().lat;
                const lLng = layer.getLatLng().lng;
                // Check if this is the correct marker (using small tolerance for float precision)
                if(Math.abs(lLat - lat) < 0.00001 && Math.abs(lLng - lng) < 0.00001) {
                    layer.openPopup();
                }
            }
        });
    };

    function renderPanelDetails(data) {
        const title = data.AddressInfo ? data.AddressInfo.Title : data.Title;
        const addr = data.AddressInfo ? data.AddressInfo.AddressLine1 : '';
        const lat = data.AddressInfo ? data.AddressInfo.Latitude : data.Latitude;
        const lng = data.AddressInfo ? data.AddressInfo.Longitude : data.Longitude;
        const status = getStationStatus(data);
        const numPoints = data.NumberOfPoints || (data.Connections ? data.Connections.length : 0);
        const simData = getStationSimulation(data.ID, numPoints);

        // --- PRESERVED SLOT LOGIC (YOUR ORIGINAL CODE) ---
        let slotsHtml = '';
        if (data.Connections && data.Connections.length > 0) {
            data.Connections.forEach((conn, index) => {
                const slotState = simData.slots[index] || simData.slots[0] || {status:'Unknown', battery:0, isOccupied:false};
                const type = conn.ConnectionType ? conn.ConnectionType.Title : 'Unknown Connector';
                const power = conn.PowerKW ? `${conn.PowerKW} kW` : 'Unknown Power';
                let bgClass = slotState.isOccupied ? 'bg-light' : 'bg-white';

                let statusVisual = '';
                if(slotState.isOccupied) {
                    statusVisual = `
                    <div class="mt-2">
                         <div class="d-flex justify-content-between small text-muted mb-1">
                            <span>Vehicle Charging...</span>
                            <span>${slotState.battery}%</span>
                        </div>
                        <div class="progress" style="height: 10px;">
                            <div class="progress-bar progress-bar-striped progress-bar-animated bg-success" 
                                 role="progressbar" style="width: ${slotState.battery}%"></div>
                        </div>
                    </div>
                `;
                } else {
                    statusVisual = `
                    <div class="mt-2 text-success small font-weight-bold">
                        <i class="fa fa-check"></i> Ready to Charge
                    </div>
                `;
                }

                slotsHtml += `
                <div class="card mb-3 shadow-sm ${bgClass}" style="border-left: 5px solid ${slotState.isOccupied ? '#f1c40f' : '#2ecc71'};">
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-0 font-weight-bold"><i class="fa fa-plug text-muted"></i> ${type}</h6>
                                <small class="text-muted">${power} • ID: #${index+1}</small>
                            </div>
                            <div class="text-right">
                                <span class="badge ${slotState.isOccupied ? 'badge-warning' : 'badge-success'} p-2">
                                    ${slotState.status}
                                </span>
                            </div>
                        </div>
                        ${statusVisual}
                    </div>
                </div>
            `;
            });
        } else {
            slotsHtml = `<div class="alert alert-secondary mt-3">No specific connection details available.</div>`;
        }
        // --- END PRESERVED LOGIC ---

        let slotsBannerColor = (simData.free > 0) ? 'alert-success' : 'alert-danger';
        if (!status.isOperational) slotsBannerColor = 'alert-danger';
        let slotsText = `<b>${simData.free}</b> of <b>${simData.total}</b> plugs available`;
        if (!status.isOperational) slotsText = "Station currently unavailable";

        let imgHtml = '';
        if (data.MediaItems && data.MediaItems.length > 0) {
            let imgUrl = data.MediaItems[0].ItemURL || data.MediaItems[0].ItemThumbnailURL;
            imgHtml = `<img src="${imgUrl}" class="img-fluid rounded mb-3" style="width:100%; max-height:200px; object-fit:cover;" onerror="this.style.display='none'">`;
        }

        const googleMapsLink = `http://googleusercontent.com/maps.google.com/?q=${lat},${lng}`;

        // --- FULL VIEW CONTAINER (Updated Buttons) ---
        const html = `
        <div class="h-100 d-flex flex-column">
            <div class="p-3 bg-white border-bottom shadow-sm">
                 <button class="btn btn-sm btn-link pl-0 mb-2 text-dark font-weight-bold" onclick="exitFullMode()">
                    <i class="fa fa-arrow-left"></i> Back to List
                </button>
                <h5 class="mb-1 text-truncate">${title}</h5>
                <div class="alert ${slotsBannerColor} mt-2 text-center mb-0 p-1 small">
                    ${slotsText}
                </div>
            </div>

            <div class="p-3 overflow-auto bg-white flex-fill">
                ${imgHtml}
                <p class="text-muted small mb-3"><i class="fa fa-map-marker"></i> ${addr}</p>
                ${slotsHtml}
                <div class="small text-muted mt-3 text-center">Data Source: OpenChargeMap (Simulated Live Status)</div>
            </div>

            <div class="p-3 border-top bg-light">
                <div class="row no-gutters">
                    <div class="col-6 pr-1">
                        <button onclick="window.open('${googleMapsLink}', '_blank')" 
                                class="btn btn-primary btn-block shadow-sm d-flex align-items-center justify-content-center" 
                                style="height: 45px;">
                            <i class="fa fa-location-arrow mr-2"></i> Google Maps
                        </button>
                    </div>
                    <div class="col-6 pl-1">
                        <button onclick="window.open('https://waze.com/ul?ll=${lat},${lng}&navigate=yes', '_blank')" 
                                class="btn btn-info btn-block shadow-sm text-white d-flex align-items-center justify-content-center" 
                                style="height: 45px;">
                            <i class="fa fa-car mr-2"></i> Waze
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
        $('#direction-details-view').html(html).show();
    }

    function clearRoute() {
        routeLayerGroup.clearLayers();
        if(selectedStationMarker) routeLayerGroup.removeLayer(selectedStationMarker);
        $('.dest-input-field').not(':first').closest('.waypoint-row').remove();
        stopCount = 0;
        $('.dest-input-field').val('').removeData('coords');
        $('#start-input').val('Current Location');
        $('#direction-results-list').html('<div class="text-center text-muted mt-5">Select a destination to view route.</div>').show();
        $('#direction-details-view').hide();
        $('#clear-route-btn').hide();
        $('#trip-summary-footer').hide();
        $('#route-alert-box').hide();
        toggleSidebarMode(false);
    }

    async function searchAddressAPI(q) {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`);
        const data = await res.json();
        return (data && data.length) ? {lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon)} : null;
    }

    function getCurrentPositionPromise() {
        return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject));
    }
});

// --- ADD-ON: Share Specific Station ---
window.shareStationLocation = function(lat, lng, title) {
    // 1. Create a Google Maps Link
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    // 2. Copy to Clipboard
    navigator.clipboard.writeText(url).then(() => {
        // Success Alert
        alert(`Location link for "${title}" copied to clipboard!`);
    }).catch(err => {
        // Fallback if clipboard fails (opens in new tab)
        window.open(url, '_blank');
    });
};