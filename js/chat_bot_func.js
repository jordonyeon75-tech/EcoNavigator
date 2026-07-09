$(document).ready(function () {
    // ============================================
    // 1. CONFIGURATION & VARIABLES
    // ============================================
    const windowEl = $("#chatbot-window");
    const msgsArea = $("#chatbot-messages");
    const inputEl = $("#chatbot-input");
    const timerDisplay = $("#chatbot-timer");
    const launcher = $("#chatbot-launcher");

    // OCM API Key
    const OCM_API_KEY = "e52e0fe4-6d46-48db-b854-707e9007dce1";

    // User Context
    const user = (typeof CURRENT_USER !== 'undefined') ? CURRENT_USER : { name: 'Guest', usertype: null };

    // SEARCH CONTEXT (Memory)
    let searchContext = {
        active: false,
        lat: null,
        lon: null,
        locationName: "",
        radius: 5,
        shownIDs: [],
        brandFilter: null,
        connectorFilter: null,
        focusedStation: null,
        lastFoundStations: []
    };

    // TIMERS
    let inactivityTimer, warningTimer;
    const INACTIVITY_LIMIT = 5 * 60 * 1000;
    const WARNING_LIMIT = 1 * 60 * 1000;

    // ============================================
    // 2. KNOWLEDGE BASE (Pattern Matching)
    // ============================================
    const KNOWLEDGE_BASE = [
        {
            pattern: /(sales|sold|market|statistic|trend|growth|adoption|how many)/i,
            required_context: ["ev", "car", "vehicle", "global", "malaysia", "2024", "2025"],
            answer: "In 2024, global EV sales hit over 14 million units! In Malaysia, EV adoption is growing fast. Final 2025 numbers are still being tallied, but the trend is skyrocketing! 📈"
        },
        {
            pattern: /(battery|batteries|lifespan|degrade|last long|replace)/i,
            required_context: [],
            answer: "Modern EV batteries are built to last 10-20 years. They usually lose only 1-2% capacity per year. You will likely replace the car before the battery! 🔋"
        },
        {
            pattern: /(cost|price|expensive|rate|pay|fee|how much|rm)/i,
            required_context: ["charge", "charging", "station"],
            answer: "Public charging in Malaysia usually costs between RM 1.00 to RM 2.50 per kWh for DC Fast Charging. AC charging at malls is often cheaper or sometimes free."
        },
        {
            pattern: /(how long|time|minutes|hours|wait|duration|fast)/i,
            required_context: ["charge", "charging", "full"],
            answer: "AC Charging (Home/Office) takes 4-8 hours. DC Fast Charging (Highways) is much faster—usually 20% to 80% in just 20-30 minutes! ⚡"
        },
        {
            pattern: /(connector|plug|socket|type|ccs|chademo|adapter|pin)/i,
            required_context: [],
            answer: "In Malaysia, the standard is **Type 2** for AC charging and **CCS2** for DC fast charging."
        }
    ];

    // ============================================
    // 3. INITIALIZATION
    // ============================================
    initChat();

    function initChat() {
        if (user.usertype == 2) {
            const history = sessionStorage.getItem('ecoChatHistory_' + user.id);
            if (history) {
                msgsArea.html(history);
                scrollToBottom();
                reattachButtonEvents();
                if (sessionStorage.getItem('ecoChatOpen_' + user.id) === 'true') {
                    windowEl.removeClass('chatbot-hidden').addClass('chatbot-visible');
                    resetTimers();
                }
            } else {
                greetUser();
            }
        } else {
            sessionStorage.removeItem('ecoChatHistory_guest');
            greetUser();
        }
    }

    // ============================================
    // 4. EVENT LISTENERS
    // ============================================
    launcher.click(() => {
        windowEl.toggleClass("chatbot-hidden chatbot-visible");
        if (windowEl.hasClass("chatbot-visible")) {
            inputEl.focus();
            if(user.usertype == 2) sessionStorage.setItem('ecoChatOpen_' + user.id, 'true');
            resetTimers();
        } else {
            if(user.usertype == 2) sessionStorage.setItem('ecoChatOpen_' + user.id, 'false');
        }
    });

    $("#chatbot-close").click(closeChat);
    $("#chatbot-send").click(handleUserMessage);
    inputEl.keypress((e) => { if (e.which == 13) handleUserMessage(); });
    inputEl.on('input', resetTimers);

    // ============================================
    // 5. CORE LOGIC (THE BRAIN)
    // ============================================

    function greetUser() {
        let greeting = user.usertype == 2 ? `Hi <b>${user.name}</b>!` : `Hi there!`;
        addBotMessage(greeting + " I'm your EV Assistant. 🤖<br>I can understand locations and coordinates. Try:<br><i>'(5.40, 100.28)'</i> or <i>'Check McDonald's'</i>.");
    }

    function handleUserMessage() {
        const text = inputEl.val().trim();
        if (!text) return;

        addUserMessage(text);
        inputEl.val("");
        resetTimers();
        showTypingIndicator();

        setTimeout(() => {
            removeTypingIndicator();
            processQuery(text);
        }, 600);
    }

    function closeChat() {
        windowEl.removeClass("chatbot-visible").addClass("chatbot-hidden");
        if(user.usertype == 2) sessionStorage.setItem('ecoChatOpen_' + user.id, 'false');
        clearTimeout(inactivityTimer);
        clearTimeout(warningTimer);
        timerDisplay.hide();
    }

    function processQuery(rawInput) {
        const q = rawInput.toLowerCase();

        // --- A. GREETINGS (Priority 1) ---
        if (/^(hi|hello|hey|good morning|yo|greetings)(\s|$)/i.test(q)) {
            addBotMessage(`Hello! 👋 Where are you planning to go today? I can find chargers for you.`);
            return;
        }

        if (/^(bye|goodbye|thanks|thank you|thx)(\s|$)/i.test(q)) {
            addBotMessage("You're welcome! Safe driving! 🚗⚡");
            return;
        }

        // --- B. PDF GUIDES & FEEDBACK (Priority 2 - MOVED UP) ---
        // [FIX] We check this NOW so it never gets blocked by other logic.
        if (/bookmark|save/i.test(q)) { sendPdf("bookmark_AR.pdf", "Here is how to bookmark stations:"); return; }
        if (/feedback|complain|report/i.test(q)) { sendPdf("feedback_AR.pdf", "We value your feedback! Instructions here:"); return; }
        if (/rating|rate|star/i.test(q)) { sendPdf("rating_AR.pdf", "Here is how to rate a station:"); return; }
        if (/account|register|login/i.test(q)) { addBotMessage("Account registration guide coming soon!"); return; }
        if (/contact|support|help/i.test(q)) {
            addBotMessage("You can contact support directly:");
            addBotAction("📞 Go to Contact Us", () => window.location.href = "contact_us.php");
            return;
        }

        // --- C. GPS LOCATION (Priority 3) ---
        if (/(near me|my location|current location|here)/i.test(q)) {
            handleGeoLocation();
            return;
        }

        // --- D. CONTEXTUAL QUESTIONS (Price, Amenities, etc.) ---
        if (searchContext.focusedStation) {
            if (/(how much|price|cost|pay|rate|fee)/i.test(q)) { checkStationPrice(); return; }
            if (/(fast|supercharg|quick|speed|dc|level 3)/i.test(q)) { checkStationSpeed(); return; }
            if (/(eat|food|drink|restaurant|cafe|waiting|do|shop|mall|nearby)/i.test(q)) { checkNearbyAmenities(); return; }
            if (/(how long|time|reach|far|distance|drive)/i.test(q)) { checkTravelTime(); return; }
        }

        // --- E. PREPARE DATA (CLEAN THE INPUT) ---
        const brandDetected = detectBrand(q);
        const cleanedLocation = extractLocationFromSentence(q, brandDetected);

        // --- F. CHECK IF USER IS SELECTING A STATION FROM THE LIST ---
        if (searchContext.active && searchContext.lastFoundStations && searchContext.lastFoundStations.length > 0) {
            if (cleanedLocation && cleanedLocation.length > 2) {
                const matched = trySelectStationFromList(cleanedLocation);
                if (matched) return; // Found it in the list! Stop here.
            }
        }

        // --- G. OFF-TOPIC GUARDRAIL ---
        // [FIX] Removed "report" from here so it doesn't block the Feedback PDF
        if (/(code|script|essay|homework|recipe|finance|weather|stock)/i.test(q) && !/(charge|station|ev|map)/i.test(q)) {
            addBotMessage("I specialize only in **EV Charging Stations**. I can't help with reports or other topics, but I can find a charger for you!");
            return;
        }

        // --- H. KNOWLEDGE BASE ---
        for (let entry of KNOWLEDGE_BASE) {
            if (entry.pattern.test(q)) {
                const hasContext = entry.required_context.length === 0 || entry.required_context.some(word => q.includes(word));
                if (hasContext) {
                    addBotMessage(entry.answer);
                    return;
                }
            }
        }

        // Connector Filters
        if (q.includes("ccs") || q.includes("ccs2")) searchContext.connectorFilter = "CCS";
        else if (q.includes("type 2") || q.includes("ac")) searchContext.connectorFilter = "Type 2";
        else if (q.includes("chademo")) searchContext.connectorFilter = "CHAdeMO";
        else if (q.includes("all") || q.includes("reset")) searchContext.connectorFilter = null;

        // --- I. MAP SEARCH (Load More) ---
        if (/more|far|expand/i.test(q) && searchContext.active) {
            handleLoadMore();
            return;
        }

        // --- J. SMART MAP SEARCH (New Location) ---
        if (cleanedLocation && cleanedLocation.length > 2) {
            handleNewSearch(cleanedLocation, brandDetected);
        } else {
            if (searchContext.active && (searchContext.connectorFilter || brandDetected)) {
                if(brandDetected) searchContext.brandFilter = brandDetected;
                addBotMessage(`Updating search filters...`);
                fetchChargers(true);
            } else {
                addBotMessage("I didn't catch the location. Try <b>'Near KLCC'</b> or click <b>'Near Me'</b>.");
            }
        }
    }

    // ============================================
    // 6. SMART PARSER (COORDINATES + TEXT)
    // ============================================
    function extractLocationFromSentence(sentence, brand) {
        let text = sentence.toLowerCase();

        // 1. Coordinate Detection
        const coordPattern = /([\[\(]?\s*[-+]?\d{1,3}\.\d+\s*,\s*[-+]?\d{1,3}\.\d+\s*[\]\)]?)/;
        const coordMatch = text.match(coordPattern);
        if (coordMatch) return coordMatch[1].replace(/[\[\(\)\]]/g, '').trim();

        // 2. Remove Brand
        if (brand) text = text.replace(brand.toLowerCase(), "");

        // 3. Remove "Intent Phrases" (UPDATED with your requests)
        // This Regex now understands: "I will go to", "Check for me", "What can I do there", etc.
        const searchPattern = /(?:i\s+wan(?:na|t)?\s+to\s+go\s+(?:to\s+)?|i\s+will\s+go\s+(?:to\s+)?|if\s+i\s+go\s+(?:there\s+)?|what\s+can\s+i\s+do\s+(?:there\s+)?|check\s+(?:for\s+me\s+)?|find\s+(?:for\s+me\s+)?|can\s+(?:you\s+)?check\s+(?:for\s+me\s+)?|go\s+to|search\s+(?:for\s+)?|where\s+is|near\s+|at\s+)(.+)/i;

        const match = text.match(searchPattern);
        if (match && match[1]) {
            text = match[1];
        }

        // 4. Remove noise words
        text = text.replace(/\b(near|nearby|station|charger|charging|point|ev|place|location|please|help|got|the)\b/g, " ");

        // 5. Final Cleanup
        return text.replace(/[^\w\s]/gi, '').replace(/\s+/g, " ").trim();
    }

    function detectBrand(text) {
        if (/shell/i.test(text)) return "Shell";
        if (/tesla/i.test(text)) return "Tesla";
        if (/petronas|gentari/i.test(text)) return "Gentari";
        if (/chargev/i.test(text)) return "ChargEV";
        if (/porsche/i.test(text)) return "Porsche";
        if (/tnb|electron/i.test(text)) return "TNB";
        if (/jomcharge/i.test(text)) return "JomCharge";
        if (/byd/i.test(text)) return "BYD";
        return null;
    }

    function handleLoadMore() {
        if (!searchContext.active) {
            addBotMessage("I don't have an active search. Try saying <b>'Find chargers near me'</b> first.");
            return;
        }
        addBotMessage("Okay, looking for more stations...");
        fetchChargers(false);
    }

    // ============================================
    // 7. SEARCH & MAP FUNCTIONS (INTELLIGENT TYPE CHECK)
    // ============================================

    function handleNewSearch(placeName, brandFilter) {
        addBotMessage(`Checking map for <b>"${placeName}"</b>...`);

        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}&addressdetails=1&limit=1`;

        fetch(url, { headers: { "User-Agent": "EcoNavigatorBot/1.0" } })
            .then(r => r.json())
            .then(data => {
                if (!data || data.length === 0) {
                    addBotMessage(`🤔 I couldn't find <b>"${placeName}"</b> on the map.`);
                    return;
                }

                const location = data[0];
                let displayName = location.display_name.split(',')[0];

                // Get Type Info (e.g., "restaurant", "charging_station")
                let rawType = location.type.toLowerCase();
                let cleanType = rawType.charAt(0).toUpperCase() + rawType.slice(1).replace(/_/g, " ");

                // --- LOGIC: IS IT A CHARGER? ---
                let isCharger = (rawType === 'charging_station' || rawType === 'station');

                // Update Context
                searchContext = {
                    active: true,
                    lat: location.lat,
                    lon: location.lon,
                    locationName: displayName,
                    radius: 5,
                    shownIDs: [],
                    brandFilter: brandFilter
                };

                // --- CONSTRUCT SMART MESSAGE ---
                addBotMessage(`Found <b>${displayName}</b>.`);

                if (isCharger) {
                    addBotMessage(`✅ <b>This is a Charging Station!</b>`);
                    addBotMessage(`Showing details and connector availability...`);
                } else {
                    addBotMessage(`ℹ️ This appears to be a <b>${cleanType}</b> (Non-Charging Station).`);
                    if (brandFilter) addBotMessage(`Searching for <b>${brandFilter}</b> chargers nearby...`);
                    else addBotMessage(`Scanning 5km radius for the nearest chargers...`);
                }

                // Fetch data (If it's a charger, it will likely show up first in the list)
                fetchChargers(true);
            })
            .catch(() => {
                addBotMessage("Network error connecting to map service.");
            });
    }

    function handleGeoLocation() {
        if (!navigator.geolocation) {
            addBotMessage("❌ Your browser doesn't support geolocation.");
            return;
        }

        addBotMessage("📍 Locating you...");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                searchContext = {
                    active: true,
                    lat: lat,
                    lon: lon,
                    locationName: "Your Location",
                    radius: 5,
                    shownIDs: [],
                    brandFilter: null,
                    connectorFilter: null
                };

                addBotMessage(`✅ Location found! Scanning 5km around you...`);

                // Optional: Move map to user immediately
                if(typeof window.map !== 'undefined') window.map.setView([lat, lon], 15);

                fetchChargers(true);
            },
            () => {
                addBotMessage("❌ I couldn't get your location. Please check your browser permissions.");
            }
        );
    }

    function fetchChargers(isNewSearch) {
        const { lat, lon, radius, brandFilter, connectorFilter } = searchContext; // <--- Extract connectorFilter
        const url = `https://api.openchargemap.io/v3/poi/?output=json&latitude=${lat}&longitude=${lon}&distance=${radius}&distanceunit=KM&maxresults=50&key=${OCM_API_KEY}`;

        fetch(url)
            .then(r => r.json())
            .then(stations => {
                let available = stations.filter(s => !searchContext.shownIDs.includes(s.ID));

                // If it's a new search, start a new list. If "Load More", add to existing.
                if (isNewSearch) {
                    searchContext.lastFoundStations = available;
                } else {
                    searchContext.lastFoundStations = searchContext.lastFoundStations.concat(available);
                }

                // 1. Filter by Brand
                if (brandFilter) {
                    const b = brandFilter.toLowerCase();
                    available = available.filter(s => {
                        const t = (s.AddressInfo.Title || "").toLowerCase();
                        const op = (s.OperatorInfo && s.OperatorInfo.Title ? s.OperatorInfo.Title : "").toLowerCase();
                        return t.includes(b) || op.includes(b);
                    });
                }

                // 2. NEW: Filter by Connector (CCS2, Type 2, etc)
                if (connectorFilter) {
                    const c = connectorFilter.toLowerCase();
                    available = available.filter(s => {
                        // Check if ANY connection in the list matches our filter
                        return s.Connections && s.Connections.some(conn =>
                            conn.ConnectionType && conn.ConnectionType.Title && conn.ConnectionType.Title.toLowerCase().includes(c)
                        );
                    });

                    if(isNewSearch && available.length > 0) addBotMessage(`Filtering for <b>${connectorFilter}</b> chargers...`);
                }

                // 3. Display Logic
                if (available.length === 0) {
                    if (stations.length === 0) {
                        addBotMessage(`No charging stations found within ${radius}km.`);
                        addBotAction("🔍 Expand Search to 15km", () => {
                            searchContext.radius = 15;
                            fetchChargers(false);
                        });
                    } else {
                        addBotMessage(`No matching stations found (Brand/Type) nearby.`);
                        addBotAction("🔄 Reset Filters & Show All", () => {
                            searchContext.brandFilter = null;
                            searchContext.connectorFilter = null;
                            searchContext.shownIDs = [];
                            fetchChargers(true);
                        });
                    }
                } else {
                    const toShow = available.slice(0, 3);

                    if(toShow.length > 0) searchContext.focusedStation = toShow[0];

                    addBotMessage(`Here are ${toShow.length} station(s):`);

                    toShow.forEach(st => {
                        searchContext.shownIDs.push(st.ID);
                        const title = st.AddressInfo.Title;
                        const dist = st.AddressInfo.Distance ? st.AddressInfo.Distance.toFixed(1) + "km" : "";
                        const status = st.StatusType && st.StatusType.IsOperational ? "🟢" : "⚪";

                        addBotAction(`${status} ${title} (${dist})`, () => {
                            // If they CLICK the button, focus that station
                            searchContext.focusedStation = st;
                            highlightMap(st.AddressInfo.Latitude, st.AddressInfo.Longitude, title, st.AddressInfo.AddressLine1);
                        });
                    });

                    if (available.length > 3) addBotMessage("<i>Type <b>'More'</b> to see others.</i>");
                }
            })
            .catch(() => addBotMessage("Error fetching station data."));
    }
    // ============================================
    // NEW: FOLLOW-UP QUESTION HANDLERS
    // ============================================

    function checkStationPrice() {
        const st = searchContext.focusedStation;
        if (!st) return;

        const cost = st.UsageCost; // From OpenChargeMap API
        const title = st.AddressInfo.Title;

        if (cost && cost.length > 2) {
            addBotMessage(`💰 <b>Price at ${title}:</b><br>${cost}`);
        } else {
            // Fallback if API has no price
            addBotMessage(`💰 <b>Price at ${title}:</b><br>The detailed rates aren't listed, but typical rates are:<br>• AC: RM 1.00 - RM 1.50 / minute (or kWh)<br>• DC: RM 1.50 - RM 2.50 / kWh.`);
        }
    }
    function checkStationSpeed() {
        const st = searchContext.focusedStation;
        if (!st) return;

        // Check connectors for "DC" or Level 3
        const fast = st.Connections.some(c => c.LevelID === 3 || (c.PowerKW && c.PowerKW >= 22));
        const maxPower = Math.max(...st.Connections.map(c => c.PowerKW || 0));

        if (fast) {
            addBotMessage(`⚡ <b>Yes! It supports Fast Charging.</b><br>Max Power: <b>${maxPower} kW</b> (DC).<br>Great for a quick top-up!`);
        } else {
            addBotMessage(`🔋 <b>This looks like a Standard Charger (AC).</b><br>Max Power: ~${maxPower > 0 ? maxPower : '7-11'} kW.<br>Good for parking while you shop or eat.`);
        }
    }

    function checkTravelTime() {
        const st = searchContext.focusedStation;
        if (!st) return;

        if (!navigator.geolocation) {
            addBotMessage("I need your GPS location to calculate time. Please enable GPS.");
            return;
        }

        addBotMessage("⏳ Calculating drive time...");

        navigator.geolocation.getCurrentPosition(pos => {
            const userLat = pos.coords.latitude;
            const userLon = pos.coords.longitude;
            const destLat = st.AddressInfo.Latitude;
            const destLon = st.AddressInfo.Longitude;

            // Use OSRM (Open Source Routing Machine) - Free API
            const url = `https://router.project-osrm.org/route/v1/driving/${userLon},${userLat};${destLon},${destLat}?overview=false`;

            fetch(url)
                .then(r => r.json())
                .then(data => {
                    if (data.routes && data.routes.length > 0) {
                        const seconds = data.routes[0].duration;
                        const meters = data.routes[0].distance;

                        const mins = Math.round(seconds / 60);
                        const km = (meters / 1000).toFixed(1);

                        addBotMessage(`🚗 <b>Distance:</b> ${km} km`);
                        addBotMessage(`⏱️ <b>Estimated Drive:</b> ${mins} mins`);
                    } else {
                        addBotMessage("Could not calculate exact route.");
                    }
                })
                .catch(() => addBotMessage("Routing service unavailable."));
        });
    }
    // --- NEW HELPER: Select Station from List ---
    function trySelectStationFromList(userInput) {
        // We look for a station where the Title contains the user input
        // e.g. User says "Union", Station is "MBPP Lebuh Union" -> Match!
        const match = searchContext.lastFoundStations.find(s =>
            s.AddressInfo.Title.toLowerCase().includes(userInput)
        );

        if (match) {
            searchContext.focusedStation = match;
            addBotMessage(`✅ Selected: <b>${match.AddressInfo.Title}</b>`);
            addBotMessage("You can now ask: <i>'Price?'</i>, <i>'Speed?'</i>, or <i>'What to do nearby?'</i>");

            // Show on map
            highlightMap(match.AddressInfo.Latitude, match.AddressInfo.Longitude, match.AddressInfo.Title, match.AddressInfo.AddressLine1);
            return true; // Return true to tell processQuery we succeeded
        }
        return false;
    }

    // --- UPDATED AMENITIES: More than just food ---
    function checkNearbyAmenities() {
        const st = searchContext.focusedStation;
        if (!st) return;

        const lat = st.AddressInfo.Latitude;
        const lon = st.AddressInfo.Longitude;

        addBotMessage(`🕒 <b>While you wait at ${st.AddressInfo.Title}:</b>`);

        // Buttons for different categories
        addBotAction("☕ Cafes & Food", () => {
            window.open(`https://www.google.com/maps/search/restaurants/@${lat},${lon},16z`, '_blank');
        });

        addBotAction("🛍️ Shopping Malls", () => {
            window.open(`https://www.google.com/maps/search/shopping+mall/@${lat},${lon},16z`, '_blank');
        });

        addBotAction("🎡 Tourist Spots", () => {
            window.open(`https://www.google.com/maps/search/tourist+attraction/@${lat},${lon},16z`, '_blank');
        });

        // Also try to text search specifically for "tourism" or "shop"
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=tourism&lat=${lat}&lon=${lon}&limit=3`;

        fetch(url)
            .then(r => r.json())
            .then(places => {
                if(places && places.length > 0) {
                    let msg = "Here are some popular spots nearby:<br>";
                    places.forEach(p => {
                        let name = p.display_name.split(',')[0];
                        msg += `• ${name}<br>`;
                    });
                    addBotMessage(msg);
                } else {
                    addBotMessage("Click the buttons above to explore the area! 👆");
                }
            });
    }

    // ============================================
    // 8. UTILITIES
    // ============================================

    function highlightMap(lat, lon, title, addr) {
        if (typeof window.map !== 'undefined') {
            window.map.setView([lat, lon], 17);

            // Create nice HTML for the popup with Navigation Buttons
            const popupContent = `
                <div style="text-align:center;">
                    <b>${title}</b><br>
                    <span style="font-size:12px; color:#666;">${addr}</span><br><br>
                    <a href="https://www.waze.com/ul?ll=${lat},${lon}&navigate=yes" target="_blank" 
                       style="background:#3498db; color:white; padding:5px 10px; border-radius:4px; text-decoration:none; font-size:12px;">
                       🚗 Waze
                    </a>
                    &nbsp;
                    <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}" target="_blank" 
                       style="background:#2ecc71; color:white; padding:5px 10px; border-radius:4px; text-decoration:none; font-size:12px;">
                       🗺️ Maps
                    </a>
                </div>
            `;

            L.popup().setLatLng([lat, lon])
                .setContent(popupContent)
                .openOn(window.map);

            if (window.innerWidth < 768) closeChat();
        } else {
            addBotMessage("Map is not active.");
        }
    }

    function addUserMessage(msg) {
        msgsArea.append(`<div class="message user-msg">${escapeHtml(msg)}</div>`);
        scrollToBottom();
        saveHistory();
    }

    function addBotMessage(html) {
        msgsArea.append(`<div class="message bot-msg">${html}</div>`);
        scrollToBottom();
        saveHistory();
    }

    function addBotAction(text, cb) {
        const id = "btn-" + Date.now() + Math.floor(Math.random() * 1000);
        msgsArea.append(`<button id="${id}" class="chat-action-btn">${text}</button>`);
        scrollToBottom();
        $(document).off("click", "#" + id).on("click", "#" + id, cb);
        saveHistory();
    }

    function reattachButtonEvents() {
        $(".chat-action-btn").prop("disabled", true).css("opacity", 0.6);
    }

    function sendPdf(file, msg) {
        addBotMessage(msg);
        addBotAction("📄 Open PDF Guide", () => window.open(`/Doc_pdf_faq/${file}`, '_blank'));
    }

    function showTypingIndicator() {
        msgsArea.append(`<div id="typing-indicator" class="message bot-msg">...</div>`);
        scrollToBottom();
    }
    function removeTypingIndicator() { $("#typing-indicator").remove(); }
    function scrollToBottom() { msgsArea.scrollTop(msgsArea[0].scrollHeight); }
    function escapeHtml(text) { return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
    function saveHistory() { if (user.usertype == 2) sessionStorage.setItem('ecoChatHistory_' + user.id, msgsArea.html()); }

    function startInactivityTimer() {
        clearTimeout(inactivityTimer);
        clearTimeout(warningTimer);
        timerDisplay.hide();
        inactivityTimer = setTimeout(() => {
            addBotMessage("<i>Closing soon due to inactivity...</i>");
            timerDisplay.show();
            warningTimer = setTimeout(endConversation, WARNING_LIMIT);
        }, INACTIVITY_LIMIT);
    }
    function resetTimers() { if (windowEl.hasClass('chatbot-visible')) startInactivityTimer(); }

    function endConversation() {
        closeChat();
        msgsArea.html("");
        searchContext = { active: false, shownIDs: [] };
        if (user.usertype == 2) {
            sessionStorage.removeItem('ecoChatHistory_' + user.id);
            sessionStorage.setItem('ecoChatOpen_' + user.id, 'false');
        }
    }
});