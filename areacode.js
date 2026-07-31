/* =====================================================
   AREA CODE ATLAS - ONE COMBINED FULL JS CODE
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
  const TIMEZONE_LAYOUT_GEOJSON_URLS = [
    "geo.json",
    "https://raw.githubusercontent.com/evansiroky/timezone-boundary-builder/master/dist/timezones.geojson"
  ];
  const TIMEZONE_BANDS_SOURCE_ID = "timezone-bands-source";
  const TIMEZONE_BANDS_FILL_LAYER_ID = "timezone-bands-fill";
  const TIMEZONE_BANDS_LINE_CASING_LAYER_ID = "timezone-bands-line-casing";
  const TIMEZONE_BANDS_LINE_LAYER_ID = "timezone-bands-line";
  const TIMEZONE_BANDS_GRID_LAYER_ID = "timezone-bands-grid";
  const COUNTRY_OUTLINE_SOURCE_ID = "country-outline-source";
  const COUNTRY_OUTLINE_FILL_LAYER_ID = "country-outline-fill";
  const COUNTRY_OUTLINE_LINE_LAYER_ID = "country-outline-line";
  const TIMEZONE_CARD_MAX_ZOOM = 3.2;
  const TIMEZONE_GLOBE_FOCUS_ZOOM = 1.7;
  const TIMEZONE_GLOBE_FOCUS_LAT = -10;
  const DEFAULT_COUNTRY_VIEW = {
    name: "United States",
    countryCode: "+1",
    center: [-98.5795, 39.8283],
    zoom: 2.2
  };
  const AREA_CODE_SEARCH_ZOOM = 4.2;
  const TIMEZONE_WRAP_MIN_HEIGHT = 78;
  const TIMEZONE_WRAP_HEIGHT_STORAGE_KEY = "areaCodeAtlasTimezoneWrapHeight";

  let map;
  let activeMarker = null;
  let areaCodeIndex = new Map();
  let selectedTimeZoneId = null;
  let timeZoneLayoutByTz = new Map();
  let offsetColorByMinutes = new Map();

  /* =====================================================
     START APP
  ===================================================== */

  async function startApp() {
    const mapContainer = document.getElementById("map");

    if (!mapContainer) {
      console.error("Map container #map not found.");
      return;
    }

    if (!window.maptilersdk) {
      console.error("MapTiler SDK did not load.");
      return;
    }

    setStatus("");
    await loadTimeZoneLayoutGeoJson();
    createMap();
    buildTimeZoneCards();
    initTimezoneResizer();
    startTimezoneClocks();
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
      center: DEFAULT_COUNTRY_VIEW.center,
      zoom: DEFAULT_COUNTRY_VIEW.zoom,
      minZoom: 1,
      maxZoom: 18,
      projection: "globe",
      navigationControl: false,
      geolocateControl: false,
      terrainControl: false,
      attributionControl: true
    });

    map.addControl(new maptilersdk.NavigationControl(), "top-right");
    setupGlobeOnlyWheelZoom();

    map.on("load", async () => {
      ensureTimeZoneBandLayer();
      removeExtraZoomControls();
      await focusDefaultCountryOnLoad();
    });

    setTimeout(removeExtraZoomControls, 500);
    setTimeout(removeExtraZoomControls, 1500);
    setTimeout(removeExtraZoomControls, 3000);
  }

  function initTimezoneResizer() {
    const timezoneWrap = document.getElementById("timezoneWrap");
    const resizeHandle = document.getElementById("timezoneResizeHandle");

    if (!timezoneWrap || !resizeHandle) return;

    let manualDragInProgress = false;
    let dragStartY = 0;
    let dragStartHeight = 0;

    const savedHeight = Number(localStorage.getItem(TIMEZONE_WRAP_HEIGHT_STORAGE_KEY));
    if (Number.isFinite(savedHeight) && savedHeight >= TIMEZONE_WRAP_MIN_HEIGHT) {
      timezoneWrap.style.height = `${savedHeight}px`;
    }
    timezoneWrap.style.minHeight = `${TIMEZONE_WRAP_MIN_HEIGHT}px`;

    const observer = new ResizeObserver(() => {
      if (manualDragInProgress) return;
      const currentHeight = Math.max(
        TIMEZONE_WRAP_MIN_HEIGHT,
        Math.round(timezoneWrap.getBoundingClientRect().height)
      );
      localStorage.setItem(TIMEZONE_WRAP_HEIGHT_STORAGE_KEY, String(currentHeight));
    });
    observer.observe(timezoneWrap);

    const onPointerMove = (event) => {
      if (!manualDragInProgress) return;
      const nextHeight = Math.max(
        TIMEZONE_WRAP_MIN_HEIGHT,
        dragStartHeight + (event.clientY - dragStartY)
      );
      timezoneWrap.style.height = `${Math.round(nextHeight)}px`;
    };

    const onPointerUp = () => {
      if (!manualDragInProgress) return;
      manualDragInProgress = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);

      const finalHeight = Math.max(
        TIMEZONE_WRAP_MIN_HEIGHT,
        Math.round(timezoneWrap.getBoundingClientRect().height)
      );
      timezoneWrap.style.height = `${finalHeight}px`;
      localStorage.setItem(TIMEZONE_WRAP_HEIGHT_STORAGE_KEY, String(finalHeight));
    };

    resizeHandle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      manualDragInProgress = true;
      dragStartY = event.clientY;
      dragStartHeight = timezoneWrap.getBoundingClientRect().height;
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    });
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


  function setupGlobeOnlyWheelZoom() {
    if (!map) return;

    const mapEl = document.getElementById("map");

    if (!mapEl) return;

    map.scrollZoom.disable();

    mapEl.addEventListener(
      "wheel",
      (event) => {
        if (!isPointerOverGlobe(event.clientX, event.clientY)) {
          return;
        }

        event.preventDefault();

        const currentZoom = map.getZoom();
        const zoomDirection = event.deltaY < 0 ? 1 : -1;
        const nextZoom = Math.min(18, Math.max(1, currentZoom + zoomDirection * 0.25));

        map.easeTo({
          zoom: nextZoom,
          duration: 150,
          essential: true
        });
      },
      { passive: false }
    );
  }

  function isPointerOverGlobe(clientX, clientY) {
    const mapEl = document.getElementById("map");

    if (!mapEl) return false;

    const rect = mapEl.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = Math.min(rect.width, rect.height) / 2;
    const distance = Math.hypot(x - centerX, y - centerY);

    return distance <= radius;
  }

  async function focusDefaultCountryOnLoad() {
    flyToLocation(
      DEFAULT_COUNTRY_VIEW.center[0],
      DEFAULT_COUNTRY_VIEW.center[1],
      DEFAULT_COUNTRY_VIEW.zoom
    );

    clearInfoPanel();

    setStatus("");
    clearMarker();
    clearCountryOutline();
    clearActiveTimeZoneCard();
    hideTimeZoneBand();
  }

  /* =====================================================
     TIME ZONE CARDS
  ===================================================== */

  const TIMEZONE_COLORS = [
    "#cbd5e1",
    "#d946ef",
    "#7c3aed",
    "#ef4444",
    "#f59e0b",
    "#22c55e",
    "#3b82f6",
    "#f97316",
    "#ea580c",
    "#d97706",
    "#ca8a04",
    "#65a30d",
    "#16a34a",
    "#2563eb",
    "#0d9488",
    "#0ea5a4",
    "#0284c7",
    "#1d4ed8",
    "#4338ca",
    "#6d28d9",
    "#be185d",
    "#dc2626",
    "#b45309",
    "#4d7c0f",
    "#047857",
    "#0369a1",
    "#334155",
    "#64748b",
    "#0f766e",
    "#22c55e",
    "#a3e635",
    "#facc15",
    "#fb7185",
    "#f472b6",
    "#a78bfa",
    "#818cf8",
    "#38bdf8",
    "#2dd4bf"
  ];

  const timeZones = [
    {
      name: "HAWAII",
      timeZone: "Pacific/Honolulu",
      center: [-157.8583, 21.3069],
      zoom: 4,
      utcOffset: -10
    },
    {
      name: "ALASKA",
      timeZone: "America/Anchorage",
      center: [-149.9003, 61.2181],
      zoom: 3.5,
      utcOffset: -9
    },
    {
      name: "MARQUESAS",
      timeZone: "Pacific/Marquesas",
      center: [-139.0368, -9.8],
      zoom: 4,
      utcOffset: -9.5
    },
    {
      name: "PACIFIC",
      timeZone: "America/Los_Angeles",
      center: [-118.2437, 34.0522],
      zoom: 4,
      utcOffset: -8
    },
    {
      name: "MOUNTAIN",
      timeZone: "America/Denver",
      center: [-104.9903, 39.7392],
      zoom: 4,
      utcOffset: -7
    },
    {
      name: "CENTRAL",
      timeZone: "America/Chicago",
      center: [-87.6298, 41.8781],
      zoom: 4,
      utcOffset: -6
    },
    {
      name: "EASTERN",
      timeZone: "America/New_York",
      center: [-74.006, 40.7128],
      zoom: 4,
      utcOffset: -5,
      bandBounds: {
        west: -90,
        east: -66
      }
    },
    {
      name: "ATLANTIC",
      timeZone: "America/Halifax",
      center: [-63.5752, 44.6488],
      zoom: 4,
      utcOffset: -4
    },
    {
      name: "NEWFOUNDLAND",
      timeZone: "America/St_Johns",
      center: [-52.7126, 47.5615],
      zoom: 4,
      utcOffset: -3.5
    },
    {
      name: "BRAZIL",
      timeZone: "America/Sao_Paulo",
      center: [-47.8825, -15.7942],
      zoom: 4,
      utcOffset: -3
    },
    {
      name: "SOUTH GEORGIA",
      timeZone: "Atlantic/South_Georgia",
      center: [-36.5879, -54.4296],
      zoom: 4,
      utcOffset: -2
    },
    {
      name: "AZORES",
      timeZone: "Atlantic/Azores",
      center: [-25.6756, 37.7412],
      zoom: 4,
      utcOffset: -1
    },
    {
      name: "GREENWICH",
      timeZone: "Etc/GMT",
      center: [-0.1276, 51.5072],
      zoom: 4,
      utcOffset: 0
    },
    {
      name: "LONDON",
      timeZone: "Europe/London",
      center: [-0.1276, 51.5072],
      zoom: 4,
      utcOffset: 0
    },
    {
      name: "CENTRAL EUROPE",
      timeZone: "Europe/Berlin",
      center: [13.405, 52.52],
      zoom: 4,
      utcOffset: 1
    },
    {
      name: "ISRAEL",
      timeZone: "Asia/Jerusalem",
      center: [35.2137, 31.7683],
      zoom: 5,
      utcOffset: 2
    },
    {
      name: "ARABIA",
      timeZone: "Asia/Riyadh",
      center: [46.6753, 24.7136],
      zoom: 5,
      utcOffset: 3
    },
    {
      name: "IRAN",
      timeZone: "Asia/Tehran",
      center: [51.389, 35.6892],
      zoom: 5,
      utcOffset: 3.5
    },
    {
      name: "GULF",
      timeZone: "Asia/Dubai",
      center: [55.2708, 25.2048],
      zoom: 5,
      utcOffset: 4
    },
    {
      name: "AFGHANISTAN",
      timeZone: "Asia/Kabul",
      center: [69.2075, 34.5553],
      zoom: 5,
      utcOffset: 4.5
    },
    {
      name: "PAKISTAN",
      timeZone: "Asia/Karachi",
      center: [67.0011, 24.8607],
      zoom: 5,
      utcOffset: 5
    },
    {
      name: "INDIA / SRI LANKA",
      timeZone: "Asia/Kolkata",
      center: [77.209, 28.6139],
      zoom: 4,
      utcOffset: 5.5
    },
    {
      name: "NEPAL",
      timeZone: "Asia/Kathmandu",
      center: [85.324, 27.7172],
      zoom: 5,
      utcOffset: 5.75
    },
    {
      name: "BANGLADESH",
      timeZone: "Asia/Dhaka",
      center: [90.4125, 23.8103],
      zoom: 5,
      utcOffset: 6
    },
    {
      name: "MYANMAR",
      timeZone: "Asia/Yangon",
      center: [96.1951, 16.8661],
      zoom: 5,
      utcOffset: 6.5
    },
    {
      name: "INDOCHINA",
      timeZone: "Asia/Bangkok",
      center: [100.5018, 13.7563],
      zoom: 5,
      utcOffset: 7
    },
    {
      name: "CHINA / SINGAPORE",
      timeZone: "Asia/Singapore",
      center: [103.8198, 1.3521],
      zoom: 5,
      utcOffset: 8
    },
    {
      name: "AUSTRALIAN WESTERN CENTRAL",
      timeZone: "Australia/Eucla",
      center: [128.8763, -31.6769],
      zoom: 5,
      utcOffset: 8.75
    },
    {
      name: "JAPAN / KOREA",
      timeZone: "Asia/Tokyo",
      center: [139.6917, 35.6895],
      zoom: 5,
      utcOffset: 9
    },
    {
      name: "AUSTRALIAN CENTRAL",
      timeZone: "Australia/Adelaide",
      center: [138.6007, -34.9285],
      zoom: 5,
      utcOffset: 9.5
    },
    {
      name: "AUSTRALIAN EASTERN",
      timeZone: "Australia/Sydney",
      center: [151.2093, -33.8688],
      zoom: 4,
      utcOffset: 10
    },
    {
      name: "LORD HOWE",
      timeZone: "Australia/Lord_Howe",
      center: [159.082, -31.5509],
      zoom: 5,
      utcOffset: 10.5
    },
    {
      name: "SOLOMON ISLANDS",
      timeZone: "Pacific/Guadalcanal",
      center: [159.9729, -9.4456],
      zoom: 5,
      utcOffset: 11
    },
    {
      name: "NEW ZEALAND",
      timeZone: "Pacific/Auckland",
      center: [174.7633, -36.8485],
      zoom: 5,
      utcOffset: 12
    },
    {
      name: "CHATHAM ISLANDS",
      timeZone: "Pacific/Chatham",
      center: [-176.5597, -43.9556],
      zoom: 5,
      utcOffset: 12.75
    },
    {
      name: "TONGA",
      timeZone: "Pacific/Tongatapu",
      center: [-175.1982, -21.1394],
      zoom: 5,
      utcOffset: 13
    },
    {
      name: "LINE ISLANDS",
      timeZone: "Pacific/Kiritimati",
      center: [-157.3768, 1.8721],
      zoom: 5,
      utcOffset: 14
    },
    {
      name: "BAKER ISLAND",
      timeZone: "Etc/GMT+12",
      center: [-176.4769, 0.1936],
      zoom: 5,
      utcOffset: -12
    },
    {
      name: "SAMOA",
      timeZone: "Pacific/Pago_Pago",
      center: [-170.1322, -14.2756],
      zoom: 5,
      utcOffset: -11
    },
  ];


  function getCurrentUtcOffsetHours(timeZone, fallbackOffset) {
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        timeZoneName: "shortOffset"
      });
      const zonePart = formatter
        .formatToParts(new Date())
        .find((part) => part.type === "timeZoneName")?.value;

      if (!zonePart) return fallbackOffset;
      if (zonePart === "GMT" || zonePart === "UTC") return 0;

      const match = zonePart.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/i);
      if (!match) return fallbackOffset;

      const sign = match[1] === "-" ? -1 : 1;
      const hours = Number(match[2]);
      const minutes = Number(match[3] || 0);

      return sign * (hours + minutes / 60);
    } catch (error) {
      return fallbackOffset;
    }
  }

  function getZoneUtcOffset(zone) {
    if (typeof zone.currentUtcOffset === "number") return zone.currentUtcOffset;
    if (typeof zone.utcOffset === "number") return zone.utcOffset;
    return 0;
  }


  function getOffsetMinutes(zone) {
    return Math.round(getZoneUtcOffset(zone) * 60);
  }

  function getZoneFillColor(zone, fallbackIndex) {
    const offsetMinutes = getOffsetMinutes(zone);

    if (offsetColorByMinutes.has(offsetMinutes)) {
      return offsetColorByMinutes.get(offsetMinutes);
    }

    const fallbackColor = TIMEZONE_COLORS[fallbackIndex] || "#0ea5e9";
    offsetColorByMinutes.set(offsetMinutes, fallbackColor);
    return fallbackColor;
  }


  timeZones.forEach((zone, index) => {
    zone.currentUtcOffset = getCurrentUtcOffsetHours(zone.timeZone, zone.utcOffset);
    zone.displayOrder = index;
  });

  // Keep timezone cards in a stable, explicit sequence (Hawaii first).
  // Do not re-order cards based on DST or current UTC offsets.
  timeZones.sort((a, b) => a.displayOrder - b.displayOrder);

  const MAIN_TIME_ZONE_NAME_BY_ID = {
    "Pacific/Honolulu": "Hawaii-Aleutian Time",
    "America/Anchorage": "Alaska Time",
    "Pacific/Marquesas": "Marquesas Time",
    "America/Los_Angeles": "Pacific Time",
    "America/Denver": "Mountain Time",
    "America/Chicago": "Central Time",
    "America/New_York": "Eastern Time",
    "America/Halifax": "Atlantic Time",
    "America/St_Johns": "Newfoundland Time",
    "America/Sao_Paulo": "Argentina / Brazil Time",
    "Atlantic/South_Georgia": "Fernando de Noronha Time",
    "Atlantic/Azores": "Azores / Cape Verde Time",
    "Etc/GMT": "Greenwich Mean Time / Western European Time",
    "Europe/London": "Greenwich Mean Time / Western European Time",
    "Europe/Berlin": "Central European Time / West Africa Time",
    "Asia/Jerusalem": "Eastern European Time / Israel Time / South Africa Time",
    "Asia/Riyadh": "Arabia Time",
    "Asia/Tehran": "Iran Time",
    "Asia/Dubai": "Gulf / Samara Time",
    "Asia/Kabul": "Afghanistan Time",
    "Asia/Karachi": "Pakistan / Yekaterinburg Time",
    "Asia/Kolkata": "India / Sri Lanka Time",
    "Asia/Kathmandu": "Nepal Time",
    "Asia/Dhaka": "Bangladesh / Omsk Time",
    "Asia/Yangon": "Myanmar / Cocos Time",
    "Asia/Bangkok": "Indochina / Western Indonesia Time",
    "Asia/Singapore": "China / Singapore / Western Australia Time",
    "Australia/Eucla": "Australian Central Western Time",
    "Asia/Tokyo": "Japan / Korea Time",
    "Australia/Adelaide": "Australian Central Time",
    "Australia/Sydney": "Australian Eastern Time / Vladivostok Time",
    "Australia/Lord_Howe": "Lord Howe Time",
    "Pacific/Guadalcanal": "Solomon / New Caledonia / Magadan Time",
    "Pacific/Auckland": "New Zealand / Fiji / Kamchatka Time",
    "Pacific/Chatham": "Chatham Islands Time",
    "Pacific/Tongatapu": "Tonga / Samoa / Phoenix Islands Time",
    "Pacific/Kiritimati": "Line Islands Time",
    "Etc/GMT+12": "Baker Island Time",
    "Pacific/Pago_Pago": "Samoa Time"
  };

  const HEMISPHERE_BY_OFFSET = {
    "-12": "Northern / Southern Hemisphere",
    "-11": "Southern Hemisphere",
    "-10": "Northern / Southern Hemisphere",
    "-9.5": "Southern Hemisphere",
    "-9": "Northern Hemisphere",
    "-8": "Northern Hemisphere",
    "-7": "Northern Hemisphere",
    "-6": "Northern / Southern Hemisphere",
    "-5": "Northern / Southern Hemisphere",
    "-4": "Northern / Southern Hemisphere",
    "-3.5": "Northern Hemisphere",
    "-3": "Southern Hemisphere",
    "-2": "Southern Hemisphere",
    "-1": "Northern Hemisphere",
    "0": "Northern / Southern Hemisphere",
    "1": "Northern / Southern Hemisphere",
    "2": "Northern / Southern Hemisphere",
    "3": "Northern / Southern Hemisphere",
    "3.5": "Northern Hemisphere",
    "4": "Northern / Southern Hemisphere",
    "4.5": "Northern Hemisphere",
    "5": "Northern / Southern Hemisphere",
    "5.5": "Northern / Southern Hemisphere",
    "5.75": "Northern Hemisphere",
    "6": "Northern Hemisphere",
    "6.5": "Northern / Southern Hemisphere",
    "7": "Northern / Southern Hemisphere",
    "8": "Northern / Southern Hemisphere",
    "8.75": "Southern Hemisphere",
    "9": "Northern / Southern Hemisphere",
    "9.5": "Southern Hemisphere",
    "10": "Northern / Southern Hemisphere",
    "10.5": "Southern Hemisphere",
    "11": "Northern / Southern Hemisphere",
    "12": "Northern / Southern Hemisphere",
    "12.75": "Southern Hemisphere",
    "13": "Southern Hemisphere",
    "14": "Northern / Southern Hemisphere"
  };

  function getMainTimeZoneName(zone) {
    return MAIN_TIME_ZONE_NAME_BY_ID[zone.timeZone] || `${zone.name} Time`;
  }

  function getHemisphereByZone(zone) {
    return HEMISPHERE_BY_OFFSET[String(getZoneUtcOffset(zone))] || "Northern / Southern Hemisphere";
  }

  function formatUtcOffset(offset) {
    const sign = offset >= 0 ? "+" : "-";
    const absoluteValue = Math.abs(offset);
    const hours = Math.floor(absoluteValue);
    const minutes = Math.round((absoluteValue - hours) * 60);

    return `UTC${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  function buildTimeZoneCards() {
    const timezoneGrid = document.getElementById("timezoneGrid");

    if (!timezoneGrid) return;

    timezoneGrid.innerHTML = "";

    timeZones.forEach((zone, index) => {
      const zoneId = `tz-zone-${index}`;
      const zoneColor = TIMEZONE_COLORS[index] || "#0ea5e9";
      const card = document.createElement("button");

      card.type = "button";
      const colorIndex = TIMEZONE_COLORS.indexOf(getZoneFillColor(zone, index));
      card.className = `timezone-card tz-color-${Math.max(0, colorIndex)}`;
      card.dataset.zoneId = zoneId;
      card.dataset.tz = zone.timeZone;
      card.dataset.lng = zone.center[0];
      card.dataset.lat = zone.center[1];
      card.dataset.zoom = zone.zoom;
      card.dataset.color = zoneColor;

      card.innerHTML = `
        <div class="tz-label timezone-card-name">${zone.name}</div>
        <div class="tz-time timezone-card-time" data-timezone="${zone.timeZone}">
          ${formatTime(zone.timeZone)}
        </div>
        <div class="tz-utc">${formatUtcOffset(getZoneUtcOffset(zone))}</div>
      `;

      card.addEventListener("click", () => {
        const hemisphere = getHemisphereByZone(zone);
        selectedTimeZoneId = zoneId;
        setActiveTimeZoneCard(zoneId);
        showTimeZoneLines();
        highlightTimeZoneBand(zoneId);

        focusTimeZoneBandOnGlobe(zone);
        clearMarker();
        clearCountryOutline();

        setInfoPanel({
          areaCode: "-",
          region: hemisphere || "-",
          state: "-",
          country: "-",
          localTime: formatTime(zone.timeZone),
          timeZone: zone.timeZone,
          timezone: zone.timeZone,
          mode: "timezone"
        });

        setStatus("");
      });

      timezoneGrid.appendChild(card);
    });
  }

  function focusTimeZoneBandOnGlobe(zone) {
    if (!zone) return;

    const initialGlobeZoom = DEFAULT_COUNTRY_VIEW.zoom;
    const fallbackLongitude = Number(getZoneUtcOffset(zone)) * 15;
    const centerLongitude = Number(zone?.center?.[0] ?? fallbackLongitude);
    const centerLatitude = Number(zone?.center?.[1] ?? TIMEZONE_GLOBE_FOCUS_LAT);

    flyToLocation(centerLongitude, centerLatitude, initialGlobeZoom);
  }

  function startTimezoneClocks() {
    updateTimeZoneClocks();
    setInterval(updateTimeZoneClocks, 1000);
  }

  function formatTime(timeZone) {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      })
        .format(new Date())
        .replace(/^24:/, "00:");
    } catch (error) {
      return "--:--:--";
    }
  }

  function updateTimeZoneClocks() {
    const clockElements = document.querySelectorAll("[data-timezone], .tz-time");

    clockElements.forEach((element) => {
      const timeZone =
        element.getAttribute("data-timezone") ||
        element.closest(".timezone-card")?.dataset?.tz;

      if (!timeZone) return;

      element.textContent = formatTime(timeZone);
    });
  }

  function setActiveTimeZoneCard(zoneId) {
    const cards = document.querySelectorAll(".timezone-card");
    cards.forEach((card) => {
      card.classList.toggle("is-active", card.dataset.zoneId === zoneId);
    });
  }

  function clearActiveTimeZoneCard() {
    selectedTimeZoneId = null;
    setActiveTimeZoneCard(null);
  }

  function findZoneIdByTimezone(timezone) {
    if (!timezone || timezone === "---" || /^multiple$/i.test(timezone)) {
      return null;
    }

    const normalized = String(timezone).trim().toLowerCase();
    const exactIndex = timeZones.findIndex(
      (zone) => zone.timeZone.toLowerCase() === normalized
    );

    if (exactIndex >= 0) {
      return `tz-zone-${exactIndex}`;
    }

    const partialIndex = timeZones.findIndex((zone) => {
      const zoneValue = zone.timeZone.toLowerCase();
      return zoneValue.includes(normalized) || normalized.includes(zoneValue);
    });

    if (partialIndex >= 0) {
      return `tz-zone-${partialIndex}`;
    }

    return null;
  }

  function applyTimezoneSelection(timezone) {
    const matchedZoneId = findZoneIdByTimezone(timezone);

    if (!matchedZoneId) {
      clearActiveTimeZoneCard();
      hideTimeZoneBand();
      return;
    }

    selectedTimeZoneId = matchedZoneId;
    setActiveTimeZoneCard(matchedZoneId);
    highlightTimeZoneBand(matchedZoneId);
  }

  function formatTimezoneDisplayValue(timezoneValue) {
    if (!timezoneValue || timezoneValue === "---") {
      return "---";
    }

    const normalized = String(timezoneValue).trim().toLowerCase();
    const matchedZone = timeZones.find(
      (zone) => zone.timeZone.toLowerCase() === normalized
    );

    if (matchedZone?.name) {
      return matchedZone.name;
    }

    return timezoneValue;
  }


  async function loadTimeZoneLayoutGeoJson() {
    const urls = Array.isArray(TIMEZONE_LAYOUT_GEOJSON_URLS)
      ? TIMEZONE_LAYOUT_GEOJSON_URLS
      : [TIMEZONE_LAYOUT_GEOJSON_URLS];

    for (const url of urls) {
      try {
        const response = await fetch(url, { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Failed loading ${url}: ${response.status}`);
        }

        const geoJson = await response.json();
        const features = Array.isArray(geoJson?.features) ? geoJson.features : [];
        const nextLayout = new Map();

        features.forEach((feature) => {
          const rawTimeZone = feature?.properties?.timeZone
            || feature?.properties?.tzid
            || feature?.properties?.timezone
            || feature?.properties?.name;
          const timeZone = String(rawTimeZone || "").trim();
          const geometryType = feature?.geometry?.type;
          const isPolygon = geometryType === "Polygon" || geometryType === "MultiPolygon";

          if (!timeZone || !isPolygon) return;

          const existing = nextLayout.get(timeZone) || [];
          existing.push(feature.geometry);
          nextLayout.set(timeZone, existing);
        });

        if (nextLayout.size) {
          timeZoneLayoutByTz = nextLayout;
          return;
        }
      } catch (error) {
        console.warn(`Timezone layout source unavailable (${url}).`, error);
      }
    }

    console.warn("No timezone layout source loaded; timezone overlays disabled to avoid synthetic bands.");
    timeZoneLayoutByTz = new Map();
  }

  function ensureTimeZoneBandLayer() {
    if (!map || !map.isStyleLoaded()) return;
    if (map.getSource(TIMEZONE_BANDS_SOURCE_ID)) return;

    map.addSource(TIMEZONE_BANDS_SOURCE_ID, {
      type: "geojson",
      data: buildTimeZoneBandGeoJson()
    });

    map.addLayer({
      id: TIMEZONE_BANDS_FILL_LAYER_ID,
      type: "fill",
      source: TIMEZONE_BANDS_SOURCE_ID,
      layout: {
        visibility: "none"
      },
      paint: {
        "fill-color": ["coalesce", ["get", "fillColor"], "#0ea5e9"],
        "fill-opacity": 0.28
      }
    });

    map.addLayer({
      id: TIMEZONE_BANDS_LINE_CASING_LAYER_ID,
      type: "line",
      source: TIMEZONE_BANDS_SOURCE_ID,
      layout: {
        visibility: "none",
        "line-cap": "butt",
        "line-join": "miter"
      },
      paint: {
        "line-color": "#0b1020",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          1, 1.4,
          3, 1.8,
          6, 2.4
        ],
        "line-opacity": 0.95
      }
    });

    map.addLayer({
      id: TIMEZONE_BANDS_LINE_LAYER_ID,
      type: "line",
      source: TIMEZONE_BANDS_SOURCE_ID,
      layout: {
        visibility: "none",
        "line-cap": "butt",
        "line-join": "miter"
      },
      paint: {
        "line-color": ["coalesce", ["get", "fillColor"], "#0ea5e9"],
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          1, 0.8,
          3, 1.1,
          6, 1.6
        ],
        "line-opacity": 1
      }
    });

    map.addLayer({
      id: TIMEZONE_BANDS_GRID_LAYER_ID,
      type: "line",
      source: TIMEZONE_BANDS_SOURCE_ID,
      layout: {
        visibility: "none"
      },
      paint: {
        "line-color": "#f8fafc",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          1, 0.75,
          3, 0.95,
          6, 1.2
        ],
        "line-dasharray": [1, 0],
        "line-opacity": 0.9
      }
    });

    if (selectedTimeZoneId) {
      highlightTimeZoneBand(selectedTimeZoneId);
    }
  }

  function highlightTimeZoneBand(zoneId) {
    if (!map || !map.getSource(TIMEZONE_BANDS_SOURCE_ID)) return;

    showTimeZoneLines();

    const filter = ["==", ["get", "zoneId"], zoneId];
    map.setFilter(TIMEZONE_BANDS_LINE_CASING_LAYER_ID, filter);
    map.setFilter(TIMEZONE_BANDS_LINE_LAYER_ID, filter);
    map.setLayoutProperty(TIMEZONE_BANDS_FILL_LAYER_ID, "visibility", "none");
    map.setLayoutProperty(TIMEZONE_BANDS_LINE_CASING_LAYER_ID, "visibility", "visible");
    map.setLayoutProperty(TIMEZONE_BANDS_LINE_LAYER_ID, "visibility", "visible");
  }

  function showTimeZoneLines() {
    if (!map || !map.getSource(TIMEZONE_BANDS_SOURCE_ID)) return;
    map.setLayoutProperty(TIMEZONE_BANDS_GRID_LAYER_ID, "visibility", "visible");
  }

  function hideTimeZoneBand() {
    if (!map || !map.getSource(TIMEZONE_BANDS_SOURCE_ID)) return;
    map.setLayoutProperty(TIMEZONE_BANDS_FILL_LAYER_ID, "visibility", "none");
    map.setLayoutProperty(TIMEZONE_BANDS_LINE_CASING_LAYER_ID, "visibility", "none");
    map.setLayoutProperty(TIMEZONE_BANDS_LINE_LAYER_ID, "visibility", "none");
    map.setLayoutProperty(TIMEZONE_BANDS_GRID_LAYER_ID, "visibility", "none");
  }

  function buildTimeZoneBandGeoJson() {
    const features = timeZones.flatMap((zone, index) => {
      const zoneId = `tz-zone-${index}`;
      const fillColor = getZoneFillColor(zone, index);
      const geometries = buildZoneBandGeometries(zone);

      return geometries.map((geometry) => ({
        type: "Feature",
        properties: {
          zoneId,
          fillColor
        },
        geometry
      }));
    });

    return {
      type: "FeatureCollection",
      features
    };
  }

  function buildZoneBandGeometries(zone) {
    const layoutGeometries = getTimeZoneLayoutGeometries(zone);

    if (layoutGeometries.length) {
      return layoutGeometries;
    }

    // Do not render synthetic bands when real IANA boundaries are unavailable.
    return [];
  }


  function getTimeZoneLayoutGeometries(zone) {
    if (!zone?.timeZone) return [];

    const geometries = timeZoneLayoutByTz.get(zone.timeZone);

    if (!Array.isArray(geometries) || !geometries.length) {
      return [];
    }

    return geometries.map((geometry) => JSON.parse(JSON.stringify(geometry)));
  }





  /* =====================================================
     AREA INFORMATION PANEL
  ===================================================== */

  function setInfoPanel({
    city = "-",
    areaCode = "-",
    countryCode = "-",
    region = "-",
    state = "-",
    country = "-",
    localTime = "-",
    timeZone = "-",
    timezone = "-",
    mode = "default"
  }) {
    setText("infoCity", city || "-");
    setText("infoCountry", country || "-");
    setText("infoRegion", region || state || "-");
    setText("infoCountryCode", countryCode || areaCode || "-");

    const timezoneDisplay = formatTimezoneDisplayValue(
      timeZone || timezone || "---"
    );

    setText("infoTimeZone", timezoneDisplay);
    setInfoPanelMode(mode);
  }

  function setInfoPanelMode(mode) {}

  function clearInfoPanel() {
    setInfoPanel({
      city: "-",
      areaCode: "-",
      countryCode: "---",
      region: "-",
      state: "-",
      country: "-",
      timeZone: "---",
      timezone: "---",
      mode: "default"
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
      status.textContent = message || "";
    }
  }

  /* =====================================================
     COUNTRY CODE DATA
  ===================================================== */

  function country(code, name, region, timezone, lng, lat, zoom = 4) {
    return {
      code,
      country: name,
      region,
      timezone,
      lng,
      lat,
      zoom
    };
  }

  const COUNTRY_CODES = [
    country("1", "United States / Canada / Caribbean", "North America", "Multiple", -98.5795, 39.8283, 3),
    country("7", "Russia / Kazakhstan", "Europe / Asia", "Multiple", 37.6173, 55.7558, 3),
    country("20", "Egypt", "North Africa", "Africa/Cairo", 31.2357, 30.0444, 5),
    country("27", "South Africa", "Southern Africa", "Africa/Johannesburg", 28.0473, -26.2041, 4),
    country("30", "Greece", "Southern Europe", "Europe/Athens", 23.7275, 37.9838, 5),
    country("31", "Netherlands", "Western Europe", "Europe/Amsterdam", 4.9041, 52.3676, 5),
    country("32", "Belgium", "Western Europe", "Europe/Brussels", 4.3517, 50.8503, 5),
    country("33", "France", "Western Europe", "Europe/Paris", 2.3522, 48.8566, 4),
    country("34", "Spain", "Southern Europe", "Europe/Madrid", -3.7038, 40.4168, 4),
    country("36", "Hungary", "Central Europe", "Europe/Budapest", 19.0402, 47.4979, 5),
    country("39", "Italy", "Southern Europe", "Europe/Rome", 12.4964, 41.9028, 4),
    country("40", "Romania", "Eastern Europe", "Europe/Bucharest", 26.1025, 44.4268, 5),
    country("41", "Switzerland", "Central Europe", "Europe/Zurich", 8.5417, 47.3769, 5),
    country("43", "Austria", "Central Europe", "Europe/Vienna", 16.3738, 48.2082, 5),
    country("44", "United Kingdom", "Western Europe", "Europe/London", -0.1276, 51.5072, 4),
    country("45", "Denmark", "Northern Europe", "Europe/Copenhagen", 12.5683, 55.6761, 5),
    country("46", "Sweden", "Northern Europe", "Europe/Stockholm", 18.0686, 59.3293, 4),
    country("47", "Norway", "Northern Europe", "Europe/Oslo", 10.7522, 59.9139, 4),
    country("48", "Poland", "Central Europe", "Europe/Warsaw", 21.0122, 52.2297, 5),
    country("49", "Germany", "Central Europe", "Europe/Berlin", 13.405, 52.52, 4),
    country("51", "Peru", "South America", "America/Lima", -77.0428, -12.0464, 4),
    country("52", "Mexico", "North America", "America/Mexico_City", -99.1332, 19.4326, 4),
    country("53", "Cuba", "Caribbean", "America/Havana", -82.3666, 23.1136, 5),
    country("54", "Argentina", "South America", "America/Argentina/Buenos_Aires", -58.3816, -34.6037, 4),
    country("55", "Brazil", "South America", "America/Sao_Paulo", -47.8825, -15.7942, 4),
    country("56", "Chile", "South America", "America/Santiago", -70.6693, -33.4489, 4),
    country("57", "Colombia", "South America", "America/Bogota", -74.0721, 4.711, 4),
    country("58", "Venezuela", "South America", "America/Caracas", -66.9036, 10.4806, 4),
    country("60", "Malaysia", "Southeast Asia", "Asia/Kuala_Lumpur", 101.6869, 3.139, 5),
    country("61", "Australia", "Oceania", "Australia/Sydney", 151.2093, -33.8688, 4),
    country("62", "Indonesia", "Southeast Asia", "Asia/Jakarta", 106.8456, -6.2088, 4),
    country("63", "Philippines", "Southeast Asia", "Asia/Manila", 120.9842, 14.5995, 5),
    country("64", "New Zealand", "Oceania", "Pacific/Auckland", 174.7633, -36.8485, 5),
    country("65", "Singapore", "Southeast Asia", "Asia/Singapore", 103.8198, 1.3521, 6),
    country("66", "Thailand", "Southeast Asia", "Asia/Bangkok", 100.5018, 13.7563, 5),
    country("81", "Japan", "East Asia", "Asia/Tokyo", 139.6917, 35.6895, 5),
    country("82", "South Korea", "East Asia", "Asia/Seoul", 126.978, 37.5665, 5),
    country("84", "Vietnam", "Southeast Asia", "Asia/Ho_Chi_Minh", 106.6297, 10.8231, 5),
    country("86", "China", "East Asia", "Asia/Shanghai", 116.4074, 39.9042, 4),
    country("90", "Turkey", "Western Asia", "Europe/Istanbul", 28.9784, 41.0082, 5),
    country("91", "India", "South Asia", "Asia/Kolkata", 77.209, 28.6139, 4),
    country("92", "Pakistan", "South Asia", "Asia/Karachi", 67.0011, 24.8607, 5),
    country("93", "Afghanistan", "South Asia", "Asia/Kabul", 69.2075, 34.5553, 5),
    country("94", "Sri Lanka", "South Asia", "Asia/Colombo", 79.8612, 6.9271, 5),
    country("95", "Myanmar", "Southeast Asia", "Asia/Yangon", 96.1735, 16.8409, 5),
    country("98", "Iran", "Middle East", "Asia/Tehran", 51.389, 35.6892, 5),
    country("211", "South Sudan", "East Africa", "Africa/Juba", 31.5825, 4.8594, 5),
    country("212", "Morocco", "North Africa", "Africa/Casablanca", -6.8498, 34.0209, 5),
    country("213", "Algeria", "North Africa", "Africa/Algiers", 3.0588, 36.7538, 4),
    country("216", "Tunisia", "North Africa", "Africa/Tunis", 10.1815, 36.8065, 5),
    country("218", "Libya", "North Africa", "Africa/Tripoli", 13.1913, 32.8872, 5),
    country("220", "Gambia", "West Africa", "Africa/Banjul", -16.579, 13.4549, 6),
    country("221", "Senegal", "West Africa", "Africa/Dakar", -17.4677, 14.7167, 5),
    country("223", "Mali", "West Africa", "Africa/Bamako", -8.0029, 12.6392, 5),
    country("224", "Guinea", "West Africa", "Africa/Conakry", -13.5784, 9.6412, 5),
    country("225", "Ivory Coast", "West Africa", "Africa/Abidjan", -4.0083, 5.36, 5),
    country("226", "Burkina Faso", "West Africa", "Africa/Ouagadougou", -1.5197, 12.3714, 5),
    country("227", "Niger", "West Africa", "Africa/Niamey", 2.1254, 13.5116, 5),
    country("228", "Togo", "West Africa", "Africa/Lome", 1.2314, 6.1725, 6),
    country("229", "Benin", "West Africa", "Africa/Porto-Novo", 2.6289, 6.4969, 6),
    country("230", "Mauritius", "East Africa", "Indian/Mauritius", 57.5012, -20.1609, 6),
    country("231", "Liberia", "West Africa", "Africa/Monrovia", -10.7978, 6.3156, 6),
    country("232", "Sierra Leone", "West Africa", "Africa/Freetown", -13.2317, 8.4657, 6),
    country("233", "Ghana", "West Africa", "Africa/Accra", -0.1869, 5.6037, 5),
    country("234", "Nigeria", "West Africa", "Africa/Lagos", 3.3792, 6.5244, 5),
    country("242", "Republic of the Congo", "Central Africa", "Africa/Brazzaville", 15.2663, -4.2634, 5),
    country("246", "British Indian Ocean Territory", "Indian Ocean", "Indian/Chagos", 72.4290, -7.3346, 5), 
    country("254", "Kenya", "East Africa", "Africa/Nairobi", 36.8219, -1.2921, 5),
    country("255", "Tanzania", "East Africa", "Africa/Dar_es_Salaam", 39.2083, -6.7924, 5),
    country("256", "Uganda", "East Africa", "Africa/Kampala", 32.5825, 0.3476, 5),
    country("260", "Zambia", "Southern Africa", "Africa/Lusaka", 28.3228, -15.3875, 5),
    country("263", "Zimbabwe", "Southern Africa", "Africa/Harare", 31.053, -17.8216, 5),
    country("264", "Namibia", "Southern Africa", "Africa/Windhoek", 17.0832, -22.5597, 5),
    country("268", "Eswatini", "Southern Africa", "Africa/Mbabane", 31.1367, -26.3054, 6), 
    country("351", "Portugal", "Western Europe", "Europe/Lisbon", -9.1393, 38.7223, 5),
    country("352", "Luxembourg", "Western Europe", "Europe/Luxembourg", 6.1319, 49.6116, 6),
    country("353", "Ireland", "Western Europe", "Europe/Dublin", -6.2603, 53.3498, 5),
    country("354", "Iceland", "Northern Europe", "Atlantic/Reykjavik", -21.9426, 64.1466, 5),
    country("355", "Albania", "Southern Europe", "Europe/Tirane", 19.8187, 41.3275, 5),
    country("356", "Malta", "Southern Europe", "Europe/Malta", 14.5146, 35.8997, 6),
    country("358", "Finland", "Northern Europe", "Europe/Helsinki", 24.9384, 60.1699, 4),
    country("359", "Bulgaria", "Eastern Europe", "Europe/Sofia", 23.3219, 42.6977, 5),
    country("370", "Lithuania", "Northern Europe", "Europe/Vilnius", 25.2797, 54.6872, 5),
    country("371", "Latvia", "Northern Europe", "Europe/Riga", 24.1052, 56.9496, 5),
    country("372", "Estonia", "Northern Europe", "Europe/Tallinn", 24.7536, 59.437, 5),
    country("373", "Moldova", "Eastern Europe", "Europe/Chisinau", 28.8323, 47.0105, 5),
    country("374", "Armenia", "Western Asia", "Asia/Yerevan", 44.5152, 40.1872, 5),
    country("375", "Belarus", "Eastern Europe", "Europe/Minsk", 27.5615, 53.9045, 5),
    country("376", "Andorra", "Southern Europe", "Europe/Andorra", 1.5218, 42.5063, 6),
    country("377", "Monaco", "Western Europe", "Europe/Monaco", 7.4246, 43.7384, 6),
    country("378", "San Marino", "Southern Europe", "Europe/San_Marino", 12.4578, 43.9424, 6),
    country("380", "Ukraine", "Eastern Europe", "Europe/Kyiv", 30.5234, 50.4501, 4),
    country("381", "Serbia", "Southern Europe", "Europe/Belgrade", 20.4489, 44.7866, 5),
    country("385", "Croatia", "Southern Europe", "Europe/Zagreb", 15.9819, 45.815, 5),
    country("386", "Slovenia", "Southern Europe", "Europe/Ljubljana", 14.5058, 46.0569, 5),
    country("387", "Bosnia and Herzegovina", "Southern Europe", "Europe/Sarajevo", 18.4131, 43.8563, 5),
    country("389", "North Macedonia", "Southern Europe", "Europe/Skopje", 21.4316, 41.9973, 5),
    country("420", "Czech Republic", "Central Europe", "Europe/Prague", 14.4378, 50.0755, 5),
    country("421", "Slovakia", "Central Europe", "Europe/Bratislava", 17.1077, 48.1486, 5),
    country("423", "Liechtenstein", "Central Europe", "Europe/Vaduz", 9.5209, 47.141, 6),
    country("501", "Belize", "Central America", "America/Belize", -88.4976, 17.1899, 6), 
    country("506", "Costa Rica", "Central America", "America/Costa_Rica", -84.0907, 9.9281, 6),
    country("507", "Panama", "Central America", "America/Panama", -79.5199, 8.9824, 6),
    country("593", "Ecuador", "South America", "America/Guayaquil", -78.4678, -0.1807, 5),
    country("852", "Hong Kong", "East Asia", "Asia/Hong_Kong", 114.1694, 22.3193, 6),
    country("853", "Macau", "East Asia", "Asia/Macau", 113.5439, 22.1987, 6),
    country("855", "Cambodia", "Southeast Asia", "Asia/Phnom_Penh", 104.9282, 11.5564, 5),
    country("856", "Laos", "Southeast Asia", "Asia/Vientiane", 102.6331, 17.9757, 5),
    country("880", "Bangladesh", "South Asia", "Asia/Dhaka", 90.4125, 23.8103, 5),
    country("886", "Taiwan", "East Asia", "Asia/Taipei", 121.5654, 25.033, 5),
    country("961", "Lebanon", "Middle East", "Asia/Beirut", 35.5018, 33.8938, 5),
    country("962", "Jordan", "Middle East", "Asia/Amman", 35.9106, 31.9539, 5),
    country("963", "Syria", "Middle East", "Asia/Damascus", 36.2765, 33.5138, 5),
    country("964", "Iraq", "Middle East", "Asia/Baghdad", 44.3661, 33.3152, 5),
    country("965", "Kuwait", "Middle East", "Asia/Kuwait", 47.9783, 29.3759, 5),
    country("966", "Saudi Arabia", "Middle East", "Asia/Riyadh", 46.6753, 24.7136, 4),
    country("967", "Yemen", "Middle East", "Asia/Aden", 44.191, 15.3694, 5),
    country("968", "Oman", "Middle East", "Asia/Muscat", 58.4059, 23.588, 5),
    country("970", "West Bank/Gaza", "Middle East", "Asia/Gaza", 34.4668, 31.5017, 6),
    country("971", "United Arab Emirates", "Middle East", "Asia/Dubai", 55.2708, 25.2048, 5),
    country("972", "Israel", "Middle East", "Asia/Jerusalem", 34.7818, 32.0853, 6),
    country("973", "Bahrain", "Middle East", "Asia/Bahrain", 50.586, 26.2285, 6),
    country("974", "Qatar", "Middle East", "Asia/Qatar", 51.531, 25.2854, 6),
    country("975", "Bhutan", "South Asia", "Asia/Thimphu", 89.639, 27.4712, 6),
    country("976", "Mongolia", "East Asia", "Asia/Ulaanbaatar", 106.9057, 47.8864, 4),
    country("977", "Nepal", "South Asia", "Asia/Kathmandu", 85.324, 27.7172, 5),
    country("992", "Tajikistan", "Central Asia", "Asia/Dushanbe", 68.7864, 38.5598, 5),
    country("993", "Turkmenistan", "Central Asia", "Asia/Ashgabat", 58.3838, 37.9601, 5),
    country("994", "Azerbaijan", "Western Asia", "Asia/Baku", 49.8671, 40.4093, 5),
    country("995", "Georgia", "Western Asia", "Asia/Tbilisi", 44.8271, 41.7151, 5),
    country("996", "Kyrgyzstan", "Central Asia", "Asia/Bishkek", 74.5698, 42.8746, 5),
    country("998", "Uzbekistan", "Central Asia", "Asia/Tashkent", 69.2401, 41.2995, 5)
  ];

  const COUNTRY_CODE_INDEX = new Map(
    COUNTRY_CODES.map((item) => [item.code, item])
  );
  const COUNTRY_CODES_BY_LENGTH = [...COUNTRY_CODE_INDEX.keys()].sort(
    (a, b) => b.length - a.length
  );
  const COUNTRY_AREA_REGION_OVERRIDES = new Map([
    ["972:2", "Jerusalem area"],
    ["972:3", "Tel Aviv area"],
    ["44:20", "London"],
    ["1:212", "New York City"],
    ["1:416", "Toronto"]
  ]);

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

      setStatus("");
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
    } else if (Array.isArray(rawData?.areaCodes)) {
      source = rawData.areaCodes;
    } else if (rawData?.area_codes && typeof rawData.area_codes === "object") {
      source = Object.entries(rawData.area_codes).map(([code, value]) => ({
        area_code: code,
        ...(typeof value === "object" && value !== null ? value : {})
      }));
    } else if (rawData?.codes && typeof rawData.codes === "object") {
      source = Object.entries(rawData.codes).map(([code, value]) => ({
        area_code: code,
        ...(typeof value === "object" && value !== null ? value : {})
      }));
    } else if (Array.isArray(rawData?.codes)) {
      source = rawData.codes;
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
          pick(item, ["areaCode", "area_code", "area", "code", "npa", "NPA"])
        );

        const city = pick(item, [
          "city",
          "City",
          "primary_city",
          "main_city",
          "major_city",
          "majorCity",
          "location",
          "Location",
          "name",
          "Name"
        ]);

        const state = pick(item, [
          "state",
          "State",
          "state_code",
          "stateRegion",
          "state_region",
          "region",
          "Region",
          "province",
          "Province"
        ]);

        const countryName =
          pick(item, ["country", "Country", "country_name", "nation", "Nation"]) ||
          "United States / Canada";

        const countryCode =
          normalizeCountryCode(
            pick(item, [
              "countryCode",
              "country_code",
              "callingCode",
              "calling_code"
            ])
          ) || "+1";

        const timezone = pick(item, [
          "timezone",
          "timeZone",
          "time_zone",
          "TimeZone",
          "Time Zone",
          "tz"
        ]);

        const coords = getCoordinates(item);

        return {
          areaCode,
          city: city || "---",
          state: state || "---",
          country: countryName || "---",
          countryCode: countryCode || "---",
          timezone: timezone || "---",
          lng: coords.lng,
          lat: coords.lat,
          zoom: Number(pick(item, ["zoom"])) || 8
        };
      })
      .filter((item) => item.areaCode);
  }

  /* =====================================================
     SEARCH SETUP
  ===================================================== */

  function setupSearch() {
    const form = document.getElementById("searchForm");
    const input = document.getElementById("areaSearch");

    if (!form || !input) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const rawValue = input.value.trim();

      if (!rawValue) {
        clearInfoPanel();
        setStatus("");
        clearActiveTimeZoneCard();
        hideTimeZoneBand();
        return;
      }

      await searchCode(rawValue);
    });
  }

  async function searchCode(rawValue) {
    const startsWithPlus = rawValue.startsWith("+");
    const digits = cleanDigits(rawValue);
    const countryRegionMatch = parseCountryRegionMatch(rawValue);

    if (!digits) {
      clearInfoPanel();
      setStatus("Enter numbers only, like 212 or +972.");
      return;
    }

    const areaMatch = areaCodeIndex.get(digits);
    const countryMatch = COUNTRY_CODE_INDEX.get(digits);

    if (startsWithPlus && countryMatch) {
      await showCountryCodeResult(countryMatch);
      return;
    }

    if (countryRegionMatch) {
      await showCountryAreaRegionResult(countryRegionMatch);
      return;
    }

    if (!startsWithPlus && digits.length === 3 && areaMatch) {
      showAreaCodeResult(areaMatch);
      return;
    }

    if (countryMatch) {
      await showCountryCodeResult(countryMatch);
      return;
    }

    if (areaMatch) {
      showAreaCodeResult(areaMatch);
      return;
    }

    clearInfoPanel();
    clearActiveTimeZoneCard();
    hideTimeZoneBand();
    setStatus(`No match found for ${rawValue}.`);
  }

  /* =====================================================
     DISPLAY RESULTS
  ===================================================== */

  function showAreaCodeResult(record) {
    setInfoPanel({
      city: record.city || "---",
      countryCode: "+1",
      region: record.state,
      state: record.state,
      country: record.country,
      timeZone: record.timezone,
      timezone: record.timezone,
      mode: "default"
    });

    setStatus("");
    clearCountryOutline();
    showTimeZoneLines();
    applyTimezoneSelection(record.timezone);

    if (Number.isFinite(record.lng) && Number.isFinite(record.lat)) {
      flyToLocation(record.lng, record.lat, AREA_CODE_SEARCH_ZOOM);
      setMarker(record.lng, record.lat);
    } else {
      setStatus(`${record.areaCode} found, but no map coordinates are in area_code_data.json.`);
    }
  }

  async function showCountryCodeResult(record) {
    setInfoPanel({
      city: "---",
      countryCode: `+${record.code}`,
      region: record.region || "---",
      state: record.region || "---",
      country: record.country,
      timeZone: record.timezone,
      timezone: record.timezone,
      mode: "default"
    });

    setStatus("");
    showTimeZoneLines();
    applyTimezoneSelection(record.timezone);

    if (Number.isFinite(record.lng) && Number.isFinite(record.lat)) {
      flyToLocation(record.lng, record.lat, record.zoom || 4);
    }

    clearMarker();
    await outlineCountry(record.country);
  }

  async function showCountryAreaRegionResult(record) {
    setInfoPanel({
      city: "---",
      countryCode: `+${record.country.code}`,
      region: record.regionName,
      state: record.regionName,
      country: record.country.country,
      timeZone: record.country.timezone,
      timezone: record.country.timezone,
      mode: "default"
    });

    setStatus("");
    showTimeZoneLines();
    applyTimezoneSelection(record.country.timezone);

    if (Number.isFinite(record.country.lng) && Number.isFinite(record.country.lat)) {
      flyToLocation(record.country.lng, record.country.lat, record.country.zoom || 5);
    }

    clearMarker();
    await outlineCountry(record.country.country);
  }

  function parseCountryRegionMatch(rawValue) {
    const tokens = rawValue
      .split(/[\s-]+/)
      .map((token) => cleanDigits(token))
      .filter(Boolean);

    if (tokens.length < 2) return null;

    const normalized = rawValue.startsWith("+") ? tokens : [tokens.join("")];

    for (const candidate of normalized) {
      for (const code of COUNTRY_CODES_BY_LENGTH) {
        if (!candidate.startsWith(code)) continue;
        const remainder = candidate.slice(code.length);
        if (!remainder) continue;

        const regionName = getCountryAreaRegionName(code, remainder);
        if (!regionName) continue;

        const country = COUNTRY_CODE_INDEX.get(code);
        if (!country) continue;

        return { country, regionName, regionCode: remainder };
      }
    }

    const [countryToken, regionToken] = tokens;
    const regionName = getCountryAreaRegionName(countryToken, regionToken);
    const country = COUNTRY_CODE_INDEX.get(countryToken);

    if (regionName && country) {
      return { country, regionName, regionCode: regionToken };
    }

    return null;
  }

  function getCountryAreaRegionName(countryCode, regionCode) {
    const override = COUNTRY_AREA_REGION_OVERRIDES.get(`${countryCode}:${regionCode}`);
    if (override) return override;

    if (countryCode === "1") {
      const areaRecord = areaCodeIndex.get(regionCode);
      if (areaRecord?.city && areaRecord?.state && areaRecord.city !== "---" && areaRecord.state !== "---") {
        return `${areaRecord.city}, ${areaRecord.state}`;
      }
      if (areaRecord?.city && areaRecord.city !== "---") {
        return areaRecord.city;
      }
    }

    return null;
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

  function clearMarker() {
    if (!activeMarker) return;
    activeMarker.remove();
    activeMarker = null;
  }

  async function outlineCountry(countryName) {
    if (!map || !map.isStyleLoaded() || !countryName || countryName === "---") {
      clearCountryOutline();
      return;
    }

    const outlineGeometry = await fetchCountryOutlineGeometry(countryName);

    if (!outlineGeometry) {
      clearCountryOutline();
      setStatus(`Found ${countryName}, but could not draw the country outline.`);
      return;
    }

    const geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: outlineGeometry
        }
      ]
    };

    if (!map.getSource(COUNTRY_OUTLINE_SOURCE_ID)) {
      map.addSource(COUNTRY_OUTLINE_SOURCE_ID, {
        type: "geojson",
        data: geojson
      });

      map.addLayer({
        id: COUNTRY_OUTLINE_FILL_LAYER_ID,
        type: "fill",
        source: COUNTRY_OUTLINE_SOURCE_ID,
        paint: {
          "fill-color": "#22d3ee",
          "fill-opacity": 0.06
        }
      });

      map.addLayer({
        id: COUNTRY_OUTLINE_LINE_LAYER_ID,
        type: "line",
        source: COUNTRY_OUTLINE_SOURCE_ID,
        paint: {
          "line-color": "#22d3ee",
          "line-width": 2.5,
          "line-opacity": 0.95
        }
      });
      return;
    }

    map.getSource(COUNTRY_OUTLINE_SOURCE_ID).setData(geojson);
    map.setLayoutProperty(COUNTRY_OUTLINE_FILL_LAYER_ID, "visibility", "visible");
    map.setLayoutProperty(COUNTRY_OUTLINE_LINE_LAYER_ID, "visibility", "visible");
  }

  function clearCountryOutline() {
    if (!map || !map.getSource(COUNTRY_OUTLINE_SOURCE_ID)) return;
    map.setLayoutProperty(COUNTRY_OUTLINE_FILL_LAYER_ID, "visibility", "none");
    map.setLayoutProperty(COUNTRY_OUTLINE_LINE_LAYER_ID, "visibility", "none");
  }

  async function fetchCountryOutlineGeometry(countryName) {
    try {
      const endpoint =
        `https://api.maptiler.com/geocoding/${encodeURIComponent(countryName)}.json` +
        `?types=country&limit=1&key=${MAPTILER_KEY}`;
      const response = await fetch(endpoint);
      if (!response.ok) return null;

      const data = await response.json();
      const feature = data?.features?.[0];
      const bbox = feature?.bbox;

      if (!Array.isArray(bbox) || bbox.length !== 4) return null;

      const [west, south, east, north] = bbox.map(Number);
      if (![west, south, east, north].every(Number.isFinite)) return null;

      return {
        type: "Polygon",
        coordinates: [[
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south]
        ]]
      };
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  /* =====================================================
     HELPERS
  ===================================================== */

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
      pick(item, [
        "lng",
        "lon",
        "long",
        "longitude",
        "Long",
        "LONG",
        "center_lng",
        "centerLng",
        "x"
      ])
    );

    let lat = Number(
      pick(item, [
        "lat",
        "latitude",
        "Lat",
        "LAT",
        "center_lat",
        "centerLat",
        "y"
      ])
    );

    const possibleCoordinates = pick(item, [
      "coordinates",
      "coords",
      "center",
      "lngLat",
      "location_coordinates"
    ]);

    if (
      (!Number.isFinite(lng) || !Number.isFinite(lat)) &&
      Array.isArray(possibleCoordinates)
    ) {
      lng = Number(possibleCoordinates[0]);
      lat = Number(possibleCoordinates[1]);
    }

    if (
      (!Number.isFinite(lng) || !Number.isFinite(lat)) &&
      possibleCoordinates &&
      typeof possibleCoordinates === "object"
    ) {
      lng = Number(
        possibleCoordinates.lng ??
          possibleCoordinates.lon ??
          possibleCoordinates.longitude
      );

      lat = Number(possibleCoordinates.lat ?? possibleCoordinates.latitude);
    }

    return {
      lng,
      lat
    };
  }
})();
