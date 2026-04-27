/* =====================================================
   AREA CODE ATLAS - FULL CORRECT JS
===================================================== */

(() => {
  "use strict";

  if (window.__AREA_CODE_ATLAS_STARTED__) {
    console.warn("Area Code Atlas already started. Duplicate JS load ignored.");
    return;
  }

  window.__AREA_CODE_ATLAS_STARTED__ = true;

  const MAPTILER_KEY = "TRZg1QKiYa41B03OE9Bz";
  const AREA_CODE_DATA_URL = "area_code_data.json";

  /* =====================================================
     AUTO REFRESH PAGE EVERY 1 HOUR
  ===================================================== */

  setTimeout(() => {
    window.location.reload();
  }, 60 * 60 * 1000);

  let map;
  let activeMarker = null;
  let areaCodeIndex = new Map();

  function startApp() {
    const mapContainer = document.getElementById("map");

    if (!mapContainer) {
      console.error("Map container #map not found.");
      return;
    }

    if (!window.maptilersdk) {
      console.error("MapTiler SDK did not load.");
      return;
    }

    createMap();
    startTimezoneClocks();
    setupTimezoneClicks();
    setupSearch();
    loadAreaCodeData();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApp);
  } else {
    startApp();
  }

  /* =====================================================
     MAP SETUP - ONE ZOOM CONTROL ONLY
  ===================================================== */

  function createMap() {
    maptilersdk.config.apiKey = MAPTILER_KEY;

    map = new maptilersdk.Map({
      container: "map",
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
      center: [10, 20],
      zoom: 1.45,
      minZoom: 1,
      maxZoom: 18,
      projection: "globe",
      navigationControl: false,
      geolocateControl: false,
      terrainControl: false,
      attributionControl: true
    });

    map.addControl(new maptilersdk.NavigationControl(), "top-right");

    if (maptilersdk.GeolocateControl) {
      map.addControl(
        new maptilersdk.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: false
        }),
        "top-right"
      );
    }

    map.on("load", () => {
      removeExtraZoomControls();
    });

    setTimeout(removeExtraZoomControls, 500);
    setTimeout(removeExtraZoomControls, 1500);
  }

  function removeExtraZoomControls() {
    const mapEl = document.getElementById("map");

    if (!mapEl) return;

    const zoomGroups = Array.from(
      mapEl.querySelectorAll(".maplibregl-ctrl-group")
    ).filter((group) => {
      return group.querySelector(".maplibregl-ctrl-zoom-in");
    });

    zoomGroups.forEach((group, index) => {
      if (index > 0) {
        group.remove();
      }
    });
  }

  /* =====================================================
     TIME ZONE CLOCKS
  ===================================================== */

  function startTimezoneClocks() {
    updateTimezoneClocks();
    setInterval(updateTimezoneClocks, 1000);
  }

  function updateTimezoneClocks() {
    const cards = document.querySelectorAll(".timezone-card");

    cards.forEach((card) => {
      const timeZone = card.dataset.tz;
      const timeEl = card.querySelector(".tz-time");

      if (!timeZone || !timeEl) return;

      try {
        const timeText = new Intl.DateTimeFormat("en-GB", {
          timeZone: timeZone,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false
        }).format(new Date());

        timeEl.textContent = timeText;
      } catch (error) {
        console.warn("Invalid timezone:", timeZone);
        timeEl.textContent = "--:--:--";
      }
    });
  }

  /* =====================================================
     CLICK TIME ZONE BOXES TO FLY TO LOCATION
  ===================================================== */

  function setupTimezoneClicks() {
    const cards = document.querySelectorAll(".timezone-card");

    cards.forEach((card) => {
      card.addEventListener("click", () => {
        const lng = Number(card.dataset.lng);
        const lat = Number(card.dataset.lat);
        const zoom = Number(card.dataset.zoom || 4);
        const label = card.querySelector(".tz-label")?.textContent?.trim() || "Time Zone";
        const tz = card.dataset.tz || "---";

        if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

        flyToLocation(lng, lat, zoom);
        setMarker(lng, lat);

        setInfo({
          city: "---",
          state: "---",
          country: label,
          countryCode: "---",
          timezone: tz
        });

        setStatus(`Showing ${label}.`);
      });
    });
  }

  /* =====================================================
     SEARCH SETUP
  ===================================================== */

  function setupSearch() {
    const form = document.getElementById("searchForm");
    const input = document.getElementById("areaSearch");

    if (!form || !input) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const rawValue = input.value.trim();

      if (!rawValue) {
        setStatus("Enter an area code or country code.");
        return;
      }

      searchCode(rawValue);
    });
  }

  function searchCode(rawValue) {
    const startsWithPlus = rawValue.startsWith("+");
    const digits = rawValue.replace(/[^\d]/g, "");

    if (!digits) {
      setStatus("Enter numbers only, like 212 or +972.");
      return;
    }

    const areaMatch = areaCodeIndex.get(digits);
    const countryMatch = COUNTRY_CODE_INDEX.get(digits);

    if (startsWithPlus && countryMatch) {
      showCountryCodeResult(countryMatch);
      return;
    }

    if (!startsWithPlus && digits.length === 3 && areaMatch) {
      showAreaCodeResult(areaMatch);
      return;
    }

    if (countryMatch) {
      showCountryCodeResult(countryMatch);
      return;
    }

    if (areaMatch) {
      showAreaCodeResult(areaMatch);
      return;
    }

    clearInfo();
    setStatus(`No match found for ${rawValue}.`);
  }

  /* =====================================================
     AREA CODE DATA
  ===================================================== */

  async function loadAreaCodeData() {
    try {
      const response = await fetch(AREA_CODE_DATA_URL, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`Could not load ${AREA_CODE_DATA_URL}`);
      }

      const rawData = await response.json();
      const records = normalizeAreaCodeData(rawData);

      areaCodeIndex = new Map();

      records.forEach((record) => {
        if (record.areaCode && !areaCodeIndex.has(record.areaCode)) {
          areaCodeIndex.set(record.areaCode, record);
        }
      });

      setStatus(`Ready. Loaded ${areaCodeIndex.size} area codes. Enter an area code or country code like +972.`);
    } catch (error) {
      console.error(error);
      setStatus("Country-code search is ready. Area-code file did not load.");
    }
  }

  function normalizeAreaCodeData(rawData) {
    let source = [];

    if (Array.isArray(rawData)) {
      source = rawData;
    } else if (Array.isArray(rawData?.area_codes)) {
      source = rawData.area_codes;
    } else if (rawData?.area_codes && typeof rawData.area_codes === "object") {
      source = Object.entries(rawData.area_codes).map(([code, value]) => ({
        area_code: code,
        ...(typeof value === "object" && value !== null ? value : {})
      }));
    } else if (Array.isArray(rawData?.codes)) {
      source = rawData.codes;
    } else if (rawData?.codes && typeof rawData.codes === "object") {
      source = Object.entries(rawData.codes).map(([code, value]) => ({
        area_code: code,
        ...(typeof value === "object" && value !== null ? value : {})
      }));
    } else if (Array.isArray(rawData?.data)) {
      source = rawData.data;
    } else if (rawData && typeof rawData === "object") {
      source = Object.entries(rawData).map(([code, value]) => ({
        area_code: code,
        ...(typeof value === "object" && value !== null ? value : {})
      }));
    }

    return source
      .map((item) => {
        const areaCode = cleanDigits(
          pick(item, ["areaCode", "area_code", "code", "npa", "NPA", "area"])
        );

        const city = pick(item, [
          "city",
          "primary_city",
          "main_city",
          "location",
          "name"
        ]);

        const state = pick(item, [
          "state",
          "state_code",
          "stateRegion",
          "state_region",
          "region",
          "province"
        ]);

        const country = pick(item, ["country", "country_name"]) || "United States";

        const countryCode =
          normalizeCountryCode(
            pick(item, ["countryCode", "country_code", "callingCode", "calling_code"])
          ) || "+1";

        const timezone = pick(item, [
          "timezone",
          "timeZone",
          "time_zone",
          "tz"
        ]);

        const coords = getCoordinates(item);

        return {
          areaCode,
          city: city || "---",
          state: state || "---",
          country: country || "---",
          countryCode: countryCode || "---",
          timezone: timezone || "---",
          lng: coords.lng,
          lat: coords.lat,
          zoom: Number(pick(item, ["zoom"])) || 6
        };
      })
      .filter((item) => item.areaCode);
  }

  function pick(object, keys) {
    for (const key of keys) {
      if (
        object &&
        Object.prototype.hasOwnProperty.call(object, key) &&
        object[key] !== null &&
        object[key] !== undefined &&
        String(object[key]).trim() !== ""
      ) {
        return object[key];
      }
    }

    return "";
  }

  function cleanDigits(value) {
    return String(value || "").replace(/[^\d]/g, "");
  }

  function normalizeCountryCode(value) {
    const digits = cleanDigits(value);
    return digits ? `+${digits}` : "";
  }

  function getCoordinates(item) {
    let lng = Number(
      pick(item, ["lng", "lon", "long", "longitude", "center_lng", "centerLng"])
    );

    let lat = Number(
      pick(item, ["lat", "latitude", "center_lat", "centerLat"])
    );

    const possibleCoordinates = pick(item, [
      "coordinates",
      "coords",
      "center",
      "lngLat",
      "location_coordinates"
    ]);

    if ((!Number.isFinite(lng) || !Number.isFinite(lat)) && Array.isArray(possibleCoordinates)) {
      lng = Number(possibleCoordinates[0]);
      lat = Number(possibleCoordinates[1]);
    }

    if (
      (!Number.isFinite(lng) || !Number.isFinite(lat)) &&
      possibleCoordinates &&
      typeof possibleCoordinates === "object"
    ) {
      lng = Number(possibleCoordinates.lng ?? possibleCoordinates.lon ?? possibleCoordinates.longitude);
      lat = Number(possibleCoordinates.lat ?? possibleCoordinates.latitude);
    }

    return {
      lng,
      lat
    };
  }

  /* =====================================================
     COUNTRY CODE DATA
  ===================================================== */

  function country(code, name, timezone, lng, lat, zoom = 4) {
    return {
      code,
      country: name,
      timezone,
      lng,
      lat,
      zoom
    };
  }

  const COUNTRY_CODES = [
    country("1", "United States / Canada / Caribbean", "Multiple", -98.5795, 39.8283, 3),
    country("7", "Russia / Kazakhstan", "Multiple", 37.6173, 55.7558, 3),
    country("20", "Egypt", "Africa/Cairo", 31.2357, 30.0444, 5),
    country("27", "South Africa", "Africa/Johannesburg", 28.0473, -26.2041, 4),
    country("30", "Greece", "Europe/Athens", 23.7275, 37.9838, 5),
    country("31", "Netherlands", "Europe/Amsterdam", 4.9041, 52.3676, 5),
    country("32", "Belgium", "Europe/Brussels", 4.3517, 50.8503, 5),
    country("33", "France", "Europe/Paris", 2.3522, 48.8566, 4),
    country("34", "Spain", "Europe/Madrid", -3.7038, 40.4168, 4),
    country("36", "Hungary", "Europe/Budapest", 19.0402, 47.4979, 5),
    country("39", "Italy", "Europe/Rome", 12.4964, 41.9028, 4),
    country("40", "Romania", "Europe/Bucharest", 26.1025, 44.4268, 5),
    country("41", "Switzerland", "Europe/Zurich", 8.5417, 47.3769, 5),
    country("43", "Austria", "Europe/Vienna", 16.3738, 48.2082, 5),
    country("44", "United Kingdom", "Europe/London", -0.1276, 51.5072, 4),
    country("45", "Denmark", "Europe/Copenhagen", 12.5683, 55.6761, 5),
    country("46", "Sweden", "Europe/Stockholm", 18.0686, 59.3293, 4),
    country("47", "Norway", "Europe/Oslo", 10.7522, 59.9139, 4),
    country("48", "Poland", "Europe/Warsaw", 21.0122, 52.2297, 5),
    country("49", "Germany", "Europe/Berlin", 13.4050, 52.5200, 4),
    country("51", "Peru", "America/Lima", -77.0428, -12.0464, 4),
    country("52", "Mexico", "America/Mexico_City", -99.1332, 19.4326, 4),
    country("53", "Cuba", "America/Havana", -82.3666, 23.1136, 5),
    country("54", "Argentina", "America/Argentina/Buenos_Aires", -58.3816, -34.6037, 4),
    country("55", "Brazil", "America/Sao_Paulo", -47.8825, -15.7942, 4),
    country("56", "Chile", "America/Santiago", -70.6693, -33.4489, 4),
    country("57", "Colombia", "America/Bogota", -74.0721, 4.7110, 4),
    country("58", "Venezuela", "America/Caracas", -66.9036, 10.4806, 4),
    country("60", "Malaysia", "Asia/Kuala_Lumpur", 101.6869, 3.1390, 5),
    country("61", "Australia", "Australia/Sydney", 151.2093, -33.8688, 4),
    country("62", "Indonesia", "Asia/Jakarta", 106.8456, -6.2088, 4),
    country("63", "Philippines", "Asia/Manila", 120.9842, 14.5995, 5),
    country("64", "New Zealand", "Pacific/Auckland", 174.7633, -36.8485, 5),
    country("65", "Singapore", "Asia/Singapore", 103.8198, 1.3521, 6),
    country("66", "Thailand", "Asia/Bangkok", 100.5018, 13.7563, 5),
    country("81", "Japan", "Asia/Tokyo", 139.6917, 35.6895, 5),
    country("82", "South Korea", "Asia/Seoul", 126.9780, 37.5665, 5),
    country("84", "Vietnam", "Asia/Ho_Chi_Minh", 106.6297, 10.8231, 5),
    country("86", "China", "Asia/Shanghai", 116.4074, 39.9042, 4),
    country("90", "Turkey", "Europe/Istanbul", 28.9784, 41.0082, 5),
    country("91", "India", "Asia/Kolkata", 77.2090, 28.6139, 4),
    country("92", "Pakistan", "Asia/Karachi", 67.0011, 24.8607, 5),
    country("93", "Afghanistan", "Asia/Kabul", 69.2075, 34.5553, 5),
    country("94", "Sri Lanka", "Asia/Colombo", 79.8612, 6.9271, 5),
    country("95", "Myanmar", "Asia/Yangon", 96.1735, 16.8409, 5),
    country("98", "Iran", "Asia/Tehran", 51.3890, 35.6892, 5),
    country("211", "South Sudan", "Africa/Juba", 31.5825, 4.8594, 5),
    country("212", "Morocco", "Africa/Casablanca", -6.8498, 34.0209, 5),
    country("213", "Algeria", "Africa/Algiers", 3.0588, 36.7538, 4),
    country("216", "Tunisia", "Africa/Tunis", 10.1815, 36.8065, 5),
    country("218", "Libya", "Africa/Tripoli", 13.1913, 32.8872, 5),
    country("220", "Gambia", "Africa/Banjul", -16.5790, 13.4549, 6),
    country("221", "Senegal", "Africa/Dakar", -17.4677, 14.7167, 5),
    country("223", "Mali", "Africa/Bamako", -8.0029, 12.6392, 5),
    country("224", "Guinea", "Africa/Conakry", -13.5784, 9.6412, 5),
    country("225", "Ivory Coast", "Africa/Abidjan", -4.0083, 5.3600, 5),
    country("226", "Burkina Faso", "Africa/Ouagadougou", -1.5197, 12.3714, 5),
    country("227", "Niger", "Africa/Niamey", 2.1254, 13.5116, 5),
    country("228", "Togo", "Africa/Lome", 1.2314, 6.1725, 6),
    country("229", "Benin", "Africa/Porto-Novo", 2.6289, 6.4969, 6),
    country("230", "Mauritius", "Indian/Mauritius", 57.5012, -20.1609, 6),
    country("231", "Liberia", "Africa/Monrovia", -10.7978, 6.3156, 6),
    country("232", "Sierra Leone", "Africa/Freetown", -13.2317, 8.4657, 6),
    country("233", "Ghana", "Africa/Accra", -0.1869, 5.6037, 5),
    country("234", "Nigeria", "Africa/Lagos", 3.3792, 6.5244, 5),
    country("254", "Kenya", "Africa/Nairobi", 36.8219, -1.2921, 5),
    country("255", "Tanzania", "Africa/Dar_es_Salaam", 39.2083, -6.7924, 5),
    country("256", "Uganda", "Africa/Kampala", 32.5825, 0.3476, 5),
    country("260", "Zambia", "Africa/Lusaka", 28.3228, -15.3875, 5),
    country("263", "Zimbabwe", "Africa/Harare", 31.0530, -17.8216, 5),
    country("351", "Portugal", "Europe/Lisbon", -9.1393, 38.7223, 5),
    country("352", "Luxembourg", "Europe/Luxembourg", 6.1319, 49.6116, 6),
    country("353", "Ireland", "Europe/Dublin", -6.2603, 53.3498, 5),
    country("354", "Iceland", "Atlantic/Reykjavik", -21.9426, 64.1466, 5),
    country("355", "Albania", "Europe/Tirane", 19.8187, 41.3275, 5),
    country("356", "Malta", "Europe/Malta", 14.5146, 35.8997, 6),
    country("358", "Finland", "Europe/Helsinki", 24.9384, 60.1699, 4),
    country("359", "Bulgaria", "Europe/Sofia", 23.3219, 42.6977, 5),
    country("370", "Lithuania", "Europe/Vilnius", 25.2797, 54.6872, 5),
    country("371", "Latvia", "Europe/Riga", 24.1052, 56.9496, 5),
    country("372", "Estonia", "Europe/Tallinn", 24.7536, 59.4370, 5),
    country("373", "Moldova", "Europe/Chisinau", 28.8323, 47.0105, 5),
    country("374", "Armenia", "Asia/Yerevan", 44.5152, 40.1872, 5),
    country("375", "Belarus", "Europe/Minsk", 27.5615, 53.9045, 5),
    country("376", "Andorra", "Europe/Andorra", 1.5218, 42.5063, 6),
    country("377", "Monaco", "Europe/Monaco", 7.4246, 43.7384, 6),
    country("378", "San Marino", "Europe/San_Marino", 12.4578, 43.9424, 6),
    country("380", "Ukraine", "Europe/Kyiv", 30.5234, 50.4501, 4),
    country("381", "Serbia", "Europe/Belgrade", 20.4489, 44.7866, 5),
    country("385", "Croatia", "Europe/Zagreb", 15.9819, 45.8150, 5),
    country("386", "Slovenia", "Europe/Ljubljana", 14.5058, 46.0569, 5),
    country("387", "Bosnia and Herzegovina", "Europe/Sarajevo", 18.4131, 43.8563, 5),
    country("389", "North Macedonia", "Europe/Skopje", 21.4316, 41.9973, 5),
    country("420", "Czech Republic", "Europe/Prague", 14.4378, 50.0755, 5),
    country("421", "Slovakia", "Europe/Bratislava", 17.1077, 48.1486, 5),
    country("423", "Liechtenstein", "Europe/Vaduz", 9.5209, 47.1410, 6),
    country("852", "Hong Kong", "Asia/Hong_Kong", 114.1694, 22.3193, 6),
    country("853", "Macau", "Asia/Macau", 113.5439, 22.1987, 6),
    country("855", "Cambodia", "Asia/Phnom_Penh", 104.9282, 11.5564, 5),
    country("856", "Laos", "Asia/Vientiane", 102.6331, 17.9757, 5),
    country("880", "Bangladesh", "Asia/Dhaka", 90.4125, 23.8103, 5),
    country("886", "Taiwan", "Asia/Taipei", 121.5654, 25.0330, 5),
    country("961", "Lebanon", "Asia/Beirut", 35.5018, 33.8938, 5),
    country("962", "Jordan", "Asia/Amman", 35.9106, 31.9539, 5),
    country("963", "Syria", "Asia/Damascus", 36.2765, 33.5138, 5),
    country("964", "Iraq", "Asia/Baghdad", 44.3661, 33.3152, 5),
    country("965", "Kuwait", "Asia/Kuwait", 47.9783, 29.3759, 5),
    country("966", "Saudi Arabia", "Asia/Riyadh", 46.6753, 24.7136, 4),
    country("967", "Yemen", "Asia/Aden", 44.1910, 15.3694, 5),
    country("968", "Oman", "Asia/Muscat", 58.4059, 23.5880, 5),
    country("970", "West Bank/Gaza", "Asia/Gaza", 34.4668, 31.5017, 6),
    country("971", "United Arab Emirates", "Asia/Dubai", 55.2708, 25.2048, 5),
    country("972", "Israel", "Asia/Jerusalem", 34.7818, 32.0853, 6),
    country("973", "Bahrain", "Asia/Bahrain", 50.5860, 26.2285, 6),
    country("974", "Qatar", "Asia/Qatar", 51.5310, 25.2854, 6),
    country("975", "Bhutan", "Asia/Thimphu", 89.6390, 27.4712, 6),
    country("976", "Mongolia", "Asia/Ulaanbaatar", 106.9057, 47.8864, 4),
    country("977", "Nepal", "Asia/Kathmandu", 85.3240, 27.7172, 5),
    country("992", "Tajikistan", "Asia/Dushanbe", 68.7864, 38.5598, 5),
    country("993", "Turkmenistan", "Asia/Ashgabat", 58.3838, 37.9601, 5),
    country("994", "Azerbaijan", "Asia/Baku", 49.8671, 40.4093, 5),
    country("995", "Georgia", "Asia/Tbilisi", 44.8271, 41.7151, 5),
    country("996", "Kyrgyzstan", "Asia/Bishkek", 74.5698, 42.8746, 5),
    country("998", "Uzbekistan", "Asia/Tashkent", 69.2401, 41.2995, 5)
  ];

  const COUNTRY_CODE_INDEX = new Map(
    COUNTRY_CODES.map((item) => [item.code, item])
  );

  /* =====================================================
     DISPLAY RESULTS
  ===================================================== */

  function showAreaCodeResult(record) {
    setInfo({
      city: record.city,
      state: record.state,
      country: record.country,
      countryCode: record.countryCode,
      timezone: record.timezone
    });

    setStatus(`${record.areaCode} found: ${record.city}, ${record.state}.`);

    if (Number.isFinite(record.lng) && Number.isFinite(record.lat)) {
      flyToLocation(record.lng, record.lat, record.zoom || 6);
      setMarker(record.lng, record.lat);
    } else {
      setStatus(`${record.areaCode} found, but no map coordinates are in area_code_data.json.`);
    }
  }

  function showCountryCodeResult(record) {
    setInfo({
      city: "---",
      state: "---",
      country: record.country,
      countryCode: `+${record.code}`,
      timezone: record.timezone
    });

    setStatus(`+${record.code} found: ${record.country}.`);

    if (Number.isFinite(record.lng) && Number.isFinite(record.lat)) {
      flyToLocation(record.lng, record.lat, record.zoom || 4);
      setMarker(record.lng, record.lat);
    }
  }

  function setInfo(data) {
    setText("infoCity", data.city || "---");
    setText("infoState", data.state || "---");
    setText("infoCountry", data.country || "---");
    setText("infoCountryCode", data.countryCode || "---");
    setText("infoTimezone", data.timezone || "---");
  }

  function clearInfo() {
    setInfo({
      city: "---",
      state: "---",
      country: "---",
      countryCode: "---",
      timezone: "---"
    });
  }

  function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value || "---";
    }
  }

  function setStatus(message) {
    const status = document.getElementById("statusMessage");

    if (status) {
      status.textContent = message;
    }
  }

  /* =====================================================
     FLY AND PIN
  ===================================================== */

  function flyToLocation(lng, lat, zoom) {
    if (!map) return;

    map.flyTo({
      center: [lng, lat],
      zoom: zoom,
      speed: 1.2,
      curve: 1.4,
      essential: true
    });
  }

  function setMarker(lng, lat) {
    if (!map) return;

    if (activeMarker) {
      activeMarker.remove();
    }

    activeMarker = new maptilersdk.Marker({
      color: "#ef4444"
    })
      .setLngLat([lng, lat])
      .addTo(map);
  }
})();
