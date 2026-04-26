/* ================================
   Area Code Atlas - areacode.js
   ================================ */

/* 
  Keep your real MapTiler key here.
  If you already set the key somewhere else, you can remove this line.
*/
maptilersdk.config.apiKey = "PASTE_YOUR_MAPTILER_KEY_HERE";

/* ================================
   GLOBAL VARIABLES
   ================================ */

let areaCodeData = {};
let countryCodeData = {};
let activeMarker = null;

/* ================================
   MAP SETUP
   ================================ */

const map = new maptilersdk.Map({
  container: "map",
  style: maptilersdk.MapStyle.STREETS,
  center: [-98.5795, 39.8283],
  zoom: 2,
  minZoom: 1.4,
  maxZoom: 10,
  projection: "globe",

  // This keeps the page scroll working normally
  scrollZoom: false
});

map.addControl(new maptilersdk.NavigationControl(), "top-right");

/* ================================
   ONLY ZOOM GLOBE WHEN MOUSE IS OVER IT
   ================================ */

map.scrollZoom.disable();

const mapContainer = document.getElementById("map");

if (mapContainer) {
  mapContainer.addEventListener("mouseenter", () => {
    map.scrollZoom.enable();
  });

  mapContainer.addEventListener("mouseleave", () => {
    map.scrollZoom.disable();
  });
}

/* =====================================================
   CLICK TIME ZONE BOXES TO FLY TO LOCATION
   ===================================================== */

const timezoneLocations = {
  "HAWAII": {
    center: [-157.8583, 21.3069],
    zoom: 4
  },
  "ALASKA": {
    center: [-149.9003, 61.2181],
    zoom: 4
  },
  "PACIFIC": {
    center: [-118.2437, 34.0522],
    zoom: 4
  },
  "MOUNTAIN": {
    center: [-104.9903, 39.7392],
    zoom: 4
  },
  "CENTRAL": {
    center: [-87.6298, 41.8781],
    zoom: 4
  },
  "EASTERN": {
    center: [-74.0060, 40.7128],
    zoom: 4
  },
  "ATLANTIC": {
    center: [-63.5752, 44.6488],
    zoom: 4
  },
  "NEWFOUNDLAND": {
    center: [-52.7126, 47.5615],
    zoom: 5
  },
  "BRASÍLIA": {
    center: [-47.8825, -15.7942],
    zoom: 4
  },
  "BRASILIA": {
    center: [-47.8825, -15.7942],
    zoom: 4
  },
  "SOUTH GEORGIA": {
    center: [-36.5879, -54.2811],
    zoom: 4
  },
  "AZORES": {
    center: [-25.6756, 37.7412],
    zoom: 5
  },
  "GREENWICH": {
    center: [0.0, 51.4779],
    zoom: 5
  },
  "LONDON": {
    center: [-0.1276, 51.5072],
    zoom: 5
  },
  "CENTRAL EUROPE": {
    center: [10.4515, 51.1657],
    zoom: 4
  },
  "ISRAEL": {
    center: [35.2137, 31.7683],
    zoom: 5
  },
  "GULF": {
    center: [55.2708, 25.2048],
    zoom: 5
  },
  "PAKISTAN": {
    center: [73.0479, 33.6844],
    zoom: 5
  },
  "BANGLADESH": {
    center: [90.4125, 23.8103],
    zoom: 5
  },
  "INDOCHINA": {
    center: [100.5018, 13.7563],
    zoom: 5
  },
  "CHINA / SINGAPORE": {
    center: [103.8198, 1.3521],
    zoom: 4
  },
  "JAPAN / KOREA": {
    center: [139.6917, 35.6895],
    zoom: 5
  },
  "AUSTRALIAN EASTERN": {
    center: [151.2093, -33.8688],
    zoom: 4
  },
  "SOLOMON ISLANDS": {
    center: [160.1562, -9.6457],
    zoom: 5
  },
  "NEW ZEALAND": {
    center: [174.7633, -36.8485],
    zoom: 5
  },
  "TONGA": {
    center: [-175.1982, -21.1789],
    zoom: 5
  },
  "LINE ISLANDS": {
    center: [-157.3630, 1.8721],
    zoom: 4
  },
  "BAKER ISLAND": {
    center: [-176.4790, 0.1936],
    zoom: 5
  },
  "SAMOA": {
    center: [-171.7514, -13.8507],
    zoom: 5
  }
};

function setupTimezoneCardClicks() {
  document.querySelectorAll(".timezone-card").forEach((card) => {
    card.style.cursor = "pointer";

    card.addEventListener("click", () => {
      const label = card.querySelector(".tz-label");

      if (!label) return;

      const timezoneName = label.textContent.trim().toUpperCase();
      const location = timezoneLocations[timezoneName];

      if (!location) {
        console.warn("No map location found for:", timezoneName);
        return;
      }

      map.flyTo({
        center: location.center,
        zoom: location.zoom,
        speed: 0.8,
        curve: 1.4,
        essential: true
      });
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupTimezoneCardClicks);
} else {
  setupTimezoneCardClicks();
}

/* ================================
   TIME ZONE COLORS
   ================================ */

const TIMEZONE_COLORS = {
  "Newfoundland": "#a855f7",
  "Atlantic": "#d6a85a",
  "Eastern": "#3b82f6",
  "Central": "#22c55e",
  "Mountain": "#f59e0b",
  "Pacific": "#ef4444",
  "Alaska": "#06b6d4",
  "Hawaii": "#ec4899",
  "UTC": "#94a3b8",
  "Unknown": "#64748b"
};

function getTimezoneColor(timezone) {
  return TIMEZONE_COLORS[timezone] || TIMEZONE_COLORS.Unknown;
}

/* ================================
   LOAD AREA CODE DATA
   ================================ */

async function loadAreaCodeData() {
  try {
    const response = await fetch("area_code_data.json");

    if (!response.ok) {
      throw new Error("Could not load area_code_data.json");
    }

    const data = await response.json();

    if (data.area_codes) {
      areaCodeData = data.area_codes;
    } else {
      areaCodeData = data;
    }

    console.log("Area code data loaded:", areaCodeData);
  } catch (error) {
    console.error("Area code data error:", error);
    showStatus("Could not load area code data.");
  }
}

/* ================================
   LOAD COUNTRY CODE DATA
   ================================ */

async function loadCountryCodeData() {
  try {
    const response = await fetch("country_codes.json");

    if (!response.ok) {
      console.warn("country_codes.json not found. Country-code search will use fallback data.");
      countryCodeData = getFallbackCountryCodes();
      return;
    }

    const data = await response.json();

    if (data.country_codes) {
      countryCodeData = data.country_codes;
    } else {
      countryCodeData = data;
    }

    console.log("Country code data loaded:", countryCodeData);
  } catch (error) {
    console.warn("Country code data error. Using fallback country codes.", error);
    countryCodeData = getFallbackCountryCodes();
  }
}

function getFallbackCountryCodes() {
  return {
    "1": {
      country: "United States / Canada",
      code: "+1",
      timezone: "Multiple",
      tzid: "America/New_York",
      lat: 39.8283,
      lng: -98.5795
    },
    "972": {
      country: "Israel",
      code: "+972",
      timezone: "Israel Time",
      tzid: "Asia/Jerusalem",
      lat: 31.0461,
      lng: 34.8516
    },
    "44": {
      country: "United Kingdom",
      code: "+44",
      timezone: "Greenwich Mean Time / British Time",
      tzid: "Europe/London",
      lat: 55.3781,
      lng: -3.4360
    },
    "33": {
      country: "France",
      code: "+33",
      timezone: "Central European Time",
      tzid: "Europe/Paris",
      lat: 46.2276,
      lng: 2.2137
    },
    "49": {
      country: "Germany",
      code: "+49",
      timezone: "Central European Time",
      tzid: "Europe/Berlin",
      lat: 51.1657,
      lng: 10.4515
    }
  };
}

/* ================================
   LOAD TIME ZONE GEOJSON
   ================================ */

map.on("load", async () => {
  await loadTimezoneLayer();
});

async function loadTimezoneLayer() {
  const possibleFiles = [
    "timezones-now.geojson",
    "timezones.geojson",
    "timezones_simplified.geojson"
  ];

  for (const file of possibleFiles) {
    try {
      const response = await fetch(file);

      if (!response.ok) {
        continue;
      }

      const geojson = await response.json();

      geojson.features.forEach((feature) => {
        const props = feature.properties || {};
        const tzid =
          props.tzid ||
          props.TZID ||
          props.timezone ||
          props.time_zone ||
          props.zone ||
          props.name ||
          props.Name ||
          "";

        feature.properties.__tz_label = getTimezoneLabelFromTzid(tzid);
      });

      map.addSource("timezones", {
        type: "geojson",
        data: geojson
      });

      map.addLayer({
        id: "timezones-fill",
        type: "fill",
        source: "timezones",
        paint: {
          "fill-color": [
            "match",
            ["get", "__tz_label"],
            "Newfoundland", getTimezoneColor("Newfoundland"),
            "Atlantic", getTimezoneColor("Atlantic"),
            "Eastern", getTimezoneColor("Eastern"),
            "Central", getTimezoneColor("Central"),
            "Mountain", getTimezoneColor("Mountain"),
            "Pacific", getTimezoneColor("Pacific"),
            "Alaska", getTimezoneColor("Alaska"),
            "Hawaii", getTimezoneColor("Hawaii"),
            getTimezoneColor("Unknown")
          ],
          "fill-opacity": 0.42
        }
      });

      map.addLayer({
        id: "timezones-line",
        type: "line",
        source: "timezones",
        paint: {
          "line-color": "#ffffff",
          "line-width": 0.6,
          "line-opacity": 0.35
        }
      });

      console.log("Timezone layer loaded from:", file);
      return;
    } catch (error) {
      console.warn("Could not load timezone file:", file, error);
    }
  }

  console.warn("No timezone GeoJSON file was loaded.");
}

function getTimezoneLabelFromTzid(tzid) {
  const value = String(tzid).toLowerCase();

  if (value.includes("st_johns") || value.includes("newfoundland")) {
    return "Newfoundland";
  }

  if (
    value.includes("halifax") ||
    value.includes("puerto_rico") ||
    value.includes("bermuda") ||
    value.includes("atlantic")
  ) {
    return "Atlantic";
  }

  if (
    value.includes("new_york") ||
    value.includes("toronto") ||
    value.includes("detroit") ||
    value.includes("indiana") ||
    value.includes("eastern")
  ) {
    return "Eastern";
  }

  if (
    value.includes("chicago") ||
    value.includes("winnipeg") ||
    value.includes("central")
  ) {
    return "Central";
  }

  if (
    value.includes("denver") ||
    value.includes("edmonton") ||
    value.includes("phoenix") ||
    value.includes("mountain")
  ) {
    return "Mountain";
  }

  if (
    value.includes("los_angeles") ||
    value.includes("vancouver") ||
    value.includes("tijuana") ||
    value.includes("pacific")
  ) {
    return "Pacific";
  }

  if (value.includes("anchorage") || value.includes("alaska")) {
    return "Alaska";
  }

  if (value.includes("honolulu") || value.includes("hawaii")) {
    return "Hawaii";
  }

  if (value.includes("utc") || value.includes("gmt")) {
    return "UTC";
  }

  return "Unknown";
}

/* ================================
   SEARCH
   ================================ */

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("areaSearch");

if (searchForm) {
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const rawValue = searchInput.value.trim();

    if (!rawValue) {
      showStatus("Enter an area code or country code.");
      return;
    }

    searchCode(rawValue);
  });
}

function searchCode(rawValue) {
  const cleaned = rawValue.replace(/\s+/g, "");
  const digitsOnly = cleaned.replace("+", "").replace(/\D/g, "");

  if (!digitsOnly) {
    showStatus("Enter a valid area code or country code.");
    return;
  }

  // Area-code search first for 3-digit NANP codes
  if (digitsOnly.length === 3 && areaCodeData[digitsOnly]) {
    showAreaCodeResult(digitsOnly, areaCodeData[digitsOnly]);
    return;
  }

  // Country-code search
  const countryResult = findCountryCode(digitsOnly);

  if (countryResult) {
    showCountryCodeResult(countryResult);
    return;
  }

  showStatus(`No result found for ${rawValue}.`);
}

function findCountryCode(digitsOnly) {
  if (!countryCodeData) return null;

  if (!Array.isArray(countryCodeData)) {
    if (countryCodeData[digitsOnly]) {
      return countryCodeData[digitsOnly];
    }

    if (countryCodeData[`+${digitsOnly}`]) {
      return countryCodeData[`+${digitsOnly}`];
    }

    for (const key in countryCodeData) {
      const cleanKey = key.replace("+", "").replace(/\D/g, "");

      if (cleanKey === digitsOnly) {
        return countryCodeData[key];
      }
    }
  }

  if (Array.isArray(countryCodeData)) {
    return countryCodeData.find((item) => {
      const code =
        item.code ||
        item.country_code ||
        item.dial_code ||
        item.calling_code ||
        "";

      const cleanCode = String(code).replace("+", "").replace(/\D/g, "");

      return cleanCode === digitsOnly;
    });
  }

  return null;
}

/* ================================
   SHOW AREA CODE RESULT
   ================================ */

function showAreaCodeResult(code, data) {
  const city = data.city || "Unknown";
  const state = data.state || "Unknown";
  const timezone = data.timezone || "Unknown";
  const lat = Number(data.lat);
  const lng = Number(data.lng);

  setInfoPanel({
    areaCode: code,
    city,
    state,
    timezone,
    country: data.country || "United States / Canada"
  });

  showStatus(`Area code ${code}: ${city}, ${state}`);

  if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
    flyToLocation(lng, lat, `${code} - ${city}, ${state}`);
  }

  highlightTimezone(timezone);
}

/* ================================
   SHOW COUNTRY CODE RESULT
   ================================ */

function showCountryCodeResult(data) {
  const country = data.country || data.name || "Unknown Country";
  const code =
    data.code ||
    data.country_code ||
    data.dial_code ||
    data.calling_code ||
    "";

  const timezone = data.timezone || data.time_zone || "Multiple / Unknown";
  const lat = Number(data.lat || data.latitude);
  const lng = Number(data.lng || data.lon || data.longitude);

  setInfoPanel({
    areaCode: code,
    city: country,
    state: "Country Code",
    timezone,
    country
  });

  showStatus(`Country code ${code}: ${country}`);

  if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
    flyToLocation(lng, lat, `${code} - ${country}`);
  }
}

/* ================================
   MAP FLY / MARKER
   ================================ */

function flyToLocation(lng, lat, label) {
  map.flyTo({
    center: [lng, lat],
    zoom: 4,
    speed: 1.2,
    curve: 1.4,
    essential: true
  });

  if (activeMarker) {
    activeMarker.remove();
  }

  activeMarker = new maptilersdk.Marker({
    color: "#ffffff"
  })
    .setLngLat([lng, lat])
    .setPopup(new maptilersdk.Popup().setText(label))
    .addTo(map);
}

/* ================================
   HIGHLIGHT TIME ZONE
   ================================ */

function highlightTimezone(timezone) {
  if (!map.getLayer("timezones-fill")) return;

  const color = getTimezoneColor(timezone);

  map.setPaintProperty("timezones-fill", "fill-opacity", [
    "case",
    ["==", ["get", "__tz_label"], timezone],
    0.7,
    0.25
  ]);

  map.setPaintProperty("timezones-line", "line-opacity", [
    "case",
    ["==", ["get", "__tz_label"], timezone],
    0.9,
    0.25
  ]);

  console.log("Highlighted timezone:", timezone, color);
}

/* ================================
   INFO PANEL
   ================================ */

function setInfoPanel(info) {
  setTextByIds(["infoAreaCode", "areaCodeInfo", "areaCodeValue"], info.areaCode || "--");
  setTextByIds(["infoCity", "cityInfo", "cityValue"], info.city || "--");
  setTextByIds(["infoState", "stateInfo", "stateValue"], info.state || "--");
  setTextByIds(["infoTimezone", "timezoneInfo", "timezoneValue"], info.timezone || "--");
  setTextByIds(["infoCountry", "countryInfo", "countryValue"], info.country || "--");
}

function setTextByIds(ids, value) {
  ids.forEach((id) => {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  });
}

function showStatus(message) {
  const status = document.getElementById("statusMessage");

  if (status) {
    status.textContent = message;
  }

  console.log(message);
}

/* ================================
   LIVE CLOCKS
   ================================ */

const TIME_CLOCKS = [
  {
    ids: ["localTime"],
    timeZone: null
  },
  {
    ids: ["newfoundlandTime"],
    timeZone: "America/St_Johns"
  },
  {
    ids: ["atlanticTime"],
    timeZone: "America/Halifax"
  },
  {
    ids: ["easternTime"],
    timeZone: "America/New_York"
  },
  {
    ids: ["centralTime"],
    timeZone: "America/Chicago"
  },
  {
    ids: ["mountainTime"],
    timeZone: "America/Denver"
  },
  {
    ids: ["pacificTime"],
    timeZone: "America/Los_Angeles"
  },
  {
    ids: ["alaskaTime"],
    timeZone: "America/Anchorage"
  },
  {
    ids: ["hawaiiTime"],
    timeZone: "Pacific/Honolulu"
  },
  {
    ids: ["utcTime", "utc0Time"],
    timeZone: "UTC"
  },
  {
    ids: ["utcMinus1Time"],
    timeZone: "Etc/GMT+1"
  },
  {
    ids: ["utcMinus2Time"],
    timeZone: "Etc/GMT+2"
  },
  {
    ids: ["utcMinus3Time"],
    timeZone: "Etc/GMT+3"
  },
  {
    ids: ["utcMinus4Time"],
    timeZone: "Etc/GMT+4"
  },
  {
    ids: ["utcMinus5Time"],
    timeZone: "Etc/GMT+5"
  },
  {
    ids: ["utcMinus6Time"],
    timeZone: "Etc/GMT+6"
  },
  {
    ids: ["utcMinus7Time"],
    timeZone: "Etc/GMT+7"
  },
  {
    ids: ["utcMinus8Time"],
    timeZone: "Etc/GMT+8"
  },
  {
    ids: ["utcMinus9Time"],
    timeZone: "Etc/GMT+9"
  },
  {
    ids: ["utcMinus10Time"],
    timeZone: "Etc/GMT+10"
  },
  {
    ids: ["utcMinus11Time"],
    timeZone: "Etc/GMT+11"
  },
  {
    ids: ["utcMinus12Time"],
    timeZone: "Etc/GMT+12"
  }
];

function updateClocks() {
  const now = new Date();

  TIME_CLOCKS.forEach((clock) => {
    const options = {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    };

    if (clock.timeZone) {
      options.timeZone = clock.timeZone;
    }

    const timeText = new Intl.DateTimeFormat("en-US", options).format(now);

    clock.ids.forEach((id) => {
      const element = document.getElementById(id);

      if (element) {
        element.textContent = timeText;
      }
    });
  });
}

setInterval(updateClocks, 1000);
updateClocks();

/* ================================
   START APP
   ================================ */

async function initApp() {
  await loadAreaCodeData();
  await loadCountryCodeData();

  showStatus("Enter a 3-digit area code or country code like +972.");
}

initApp();
