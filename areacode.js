"use strict";

/* =====================================================
   MAPTILER KEY
===================================================== */

const MAPTILER_KEY = "TRZg1QKiYa41B03OE9Bz";

/* =====================================================
   GLOBAL VARIABLES
===================================================== */

let map;
let resultMarker = null;
let areaCodeData = {};

/* =====================================================
   TIME ZONE BOX DATA
===================================================== */

const TIME_ZONE_CARDS = [
  {
    key: "hawaii",
    label: "HAWAII",
    iana: "Pacific/Honolulu",
    center: [-157.8583, 21.3069],
    zoom: 4,
    color: "#8a2fd6"
  },
  {
    key: "alaska",
    label: "ALASKA",
    iana: "America/Anchorage",
    center: [-149.9003, 61.2181],
    zoom: 3.6,
    color: "#138aa0"
  },
  {
    key: "pacific",
    label: "PACIFIC",
    iana: "America/Los_Angeles",
    center: [-118.2437, 34.0522],
    zoom: 4,
    color: "#e62d2d"
  },
  {
    key: "mountain",
    label: "MOUNTAIN",
    iana: "America/Denver",
    center: [-104.9903, 39.7392],
    zoom: 4,
    color: "#f59e0b",
    darkText: true
  },
  {
    key: "central",
    label: "CENTRAL",
    iana: "America/Chicago",
    center: [-87.6298, 41.8781],
    zoom: 4,
    color: "#18b95f"
  },
  {
    key: "eastern",
    label: "EASTERN",
    iana: "America/New_York",
    center: [-74.006, 40.7128],
    zoom: 4,
    color: "#3478ea"
  },
  {
    key: "atlantic",
    label: "ATLANTIC",
    iana: "America/Halifax",
    center: [-63.5752, 44.6488],
    zoom: 4,
    color: "#e68600"
  },
  {
    key: "newfoundland",
    label: "NEWFOUNDLAND",
    iana: "America/St_Johns",
    center: [-52.7126, 47.5615],
    zoom: 5,
    color: "#7330d8"
  },
  {
    key: "brasilia",
    label: "BRASÍLIA",
    iana: "America/Sao_Paulo",
    center: [-47.8825, -15.7942],
    zoom: 4,
    color: "#0f956f"
  },
  {
    key: "south_georgia",
    label: "SOUTH GEORGIA",
    iana: "Atlantic/South_Georgia",
    center: [-36.5879, -54.4296],
    zoom: 5,
    color: "#d21f52"
  },
  {
    key: "azores",
    label: "AZORES",
    iana: "Atlantic/Azores",
    center: [-25.6756, 37.7412],
    zoom: 5,
    color: "#5147d9"
  },
  {
    key: "greenwich",
    label: "GREENWICH",
    iana: "Etc/GMT",
    center: [0, 51.4779],
    zoom: 4,
    color: "#475569"
  },
  {
    key: "london",
    label: "LONDON",
    iana: "Europe/London",
    center: [-0.1276, 51.5072],
    zoom: 5,
    color: "#159d92"
  },
  {
    key: "central_europe",
    label: "CENTRAL EUROPE",
    iana: "Europe/Berlin",
    center: [13.405, 52.52],
    zoom: 4,
    color: "#d9480f"
  },
  {
    key: "israel",
    label: "ISRAEL",
    iana: "Asia/Jerusalem",
    center: [35.2137, 31.7683],
    zoom: 6,
    color: "#3b82f6"
  },
  {
    key: "gulf",
    label: "GULF",
    iana: "Asia/Dubai",
    center: [55.2708, 25.2048],
    zoom: 5,
    color: "#ea580c"
  },
  {
    key: "pakistan",
    label: "PAKISTAN",
    iana: "Asia/Karachi",
    center: [67.0011, 24.8607],
    zoom: 5,
    color: "#087652"
  },
  {
    key: "bangladesh",
    label: "BANGLADESH",
    iana: "Asia/Dhaka",
    center: [90.4125, 23.8103],
    zoom: 6,
    color: "#29963d"
  },
  {
    key: "indochina",
    label: "INDOCHINA",
    iana: "Asia/Bangkok",
    center: [100.5018, 13.7563],
    zoom: 5,
    color: "#d91646"
  },
  {
    key: "china_singapore",
    label: "CHINA / SINGAPORE",
    iana: "Asia/Shanghai",
    center: [103.8198, 1.3521],
    zoom: 4,
    color: "#c9252c"
  },
  {
    key: "japan_korea",
    label: "JAPAN / KOREA",
    iana: "Asia/Tokyo",
    center: [139.6917, 35.6895],
    zoom: 4,
    color: "#8b41db"
  },
  {
    key: "australian_eastern",
    label: "AUSTRALIAN EASTERN",
    iana: "Australia/Sydney",
    center: [151.2093, -33.8688],
    zoom: 4,
    color: "#159bd3"
  },
  {
    key: "solomon",
    label: "SOLOMON ISLANDS",
    iana: "Pacific/Guadalcanal",
    center: [160.1562, -9.6457],
    zoom: 5,
    color: "#168f86"
  },
  {
    key: "new_zealand",
    label: "NEW ZEALAND",
    iana: "Pacific/Auckland",
    center: [174.7633, -36.8485],
    zoom: 4,
    color: "#4f4bc2"
  },
  {
    key: "tonga",
    label: "TONGA",
    iana: "Pacific/Tongatapu",
    center: [-175.1982, -21.1393],
    zoom: 6,
    color: "#d12c78"
  },
  {
    key: "line_islands",
    label: "LINE ISLANDS",
    iana: "Pacific/Kiritimati",
    center: [-157.363, 1.8721],
    zoom: 5,
    color: "#f5b21a",
    darkText: true
  },
  {
    key: "baker",
    label: "BAKER ISLAND",
    iana: "Etc/GMT+12",
    center: [-176.4769, 0.1936],
    zoom: 6,
    color: "#64748b"
  },
  {
    key: "samoa",
    label: "SAMOA",
    iana: "Pacific/Pago_Pago",
    center: [-170.1322, -14.271],
    zoom: 6,
    color: "#1f5bd8"
  }
];

/* =====================================================
   COUNTRY CODE DATA
===================================================== */

const COUNTRY_CODES = {
  "1": {
    name: "United States / Canada",
    code: "+1",
    center: [-98.5795, 39.8283],
    zoom: 3.4,
    zoneKey: "central"
  },
  "27": {
    name: "South Africa",
    code: "+27",
    center: [24.9916, -28.8166],
    zoom: 4.3,
    zoneKey: "central_europe"
  },
  "44": {
    name: "United Kingdom",
    code: "+44",
    center: [-2.5, 54.5],
    zoom: 4.5,
    zoneKey: "london"
  },
  "46": {
    name: "Sweden",
    code: "+46",
    center: [18.6435, 60.1282],
    zoom: 4.2,
    zoneKey: "central_europe"
  },
  "49": {
    name: "Germany",
    code: "+49",
    center: [10.4515, 51.1657],
    zoom: 4.6,
    zoneKey: "central_europe"
  },
  "55": {
    name: "Brazil",
    code: "+55",
    center: [-51.9253, -14.235],
    zoom: 3.7,
    zoneKey: "brasilia"
  },
  "61": {
    name: "Australia",
    code: "+61",
    center: [133.7751, -25.2744],
    zoom: 3.5,
    zoneKey: "australian_eastern"
  },
  "64": {
    name: "New Zealand",
    code: "+64",
    center: [174.886, -40.9006],
    zoom: 4.2,
    zoneKey: "new_zealand"
  },
  "81": {
    name: "Japan",
    code: "+81",
    center: [138.2529, 36.2048],
    zoom: 4.5,
    zoneKey: "japan_korea"
  },
  "82": {
    name: "South Korea",
    code: "+82",
    center: [127.7669, 35.9078],
    zoom: 5,
    zoneKey: "japan_korea"
  },
  "86": {
    name: "China",
    code: "+86",
    center: [104.1954, 35.8617],
    zoom: 3.8,
    zoneKey: "china_singapore"
  },
  "91": {
    name: "India",
    code: "+91",
    center: [78.9629, 20.5937],
    zoom: 4
  },
  "972": {
    name: "Israel",
    code: "+972",
    center: [35.2137, 31.7683],
    zoom: 6,
    zoneKey: "israel"
  }
};

/* =====================================================
   START APP
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
  setupMap();
  renderTimeZoneCards();
  startClocks();
  setupSearch();
  loadAreaCodeData();
});

/* =====================================================
   MAP SETUP
===================================================== */

function setupMap() {
  if (typeof maptilersdk === "undefined") {
    setStatus("MapTiler SDK did not load. Check the MapTiler script in your HTML file.");
    return;
  }

  maptilersdk.config.apiKey = MAPTILER_KEY;

  map = new maptilersdk.Map({
    container: "map",
    style: maptilersdk.MapStyle.STREETS,
    center: [0, 20],
    zoom: 1.6,
    projection: "globe",
    navigationControl: false,
    geolocateControl: false
  });

  map.addControl(new maptilersdk.NavigationControl(), "top-right");
}

/* =====================================================
   TIME ZONE CARD RENDERING
===================================================== */

function renderTimeZoneCards() {
  const grid = document.querySelector("#timezoneGrid, .timezone-grid, .time-zone-grid");

  if (!grid) return;

  grid.innerHTML = "";

  TIME_ZONE_CARDS.forEach((zone) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "timezone-card";
    card.dataset.zoneKey = zone.key;
    card.style.background = zone.color;

    if (zone.darkText) {
      card.dataset.light = "true";
    }

    card.innerHTML = `
      <span class="timezone-name">${zone.label}</span>
      <strong class="timezone-time" data-clock="${zone.key}">--:--:--</strong>
    `;

    card.addEventListener("click", () => {
      selectTimeZone(zone.key, true);
    });

    grid.appendChild(card);
  });
}

/* =====================================================
   CLOCKS
===================================================== */

function startClocks() {
  updateClocks();
  setInterval(updateClocks, 1000);
}

function updateClocks() {
  const now = new Date();

  TIME_ZONE_CARDS.forEach((zone) => {
    const timeText = new Intl.DateTimeFormat("en-US", {
      timeZone: zone.iana,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }).format(now);

    document.querySelectorAll(`[data-clock="${zone.key}"]`).forEach((element) => {
      element.textContent = timeText;
    });
  });
}

/* =====================================================
   CLICK TIME ZONE BOXES
===================================================== */

function selectTimeZone(zoneKey, shouldFly = false) {
  const zone = TIME_ZONE_CARDS.find((item) => item.key === zoneKey);
  if (!zone) return;

  updateInfoPanel({
    areaCode: "---",
    city: zone.label,
    state: "Time Zone",
    timeZone: zone.label,
    localTime: getTimeForZone(zone.iana)
  });

  if (shouldFly) {
    flyToLocation(zone.center, zone.zoom);
    setStatus(`${zone.label} selected.`);
  }
}

/* =====================================================
   SEARCH
===================================================== */

function setupSearch() {
  const form = document.getElementById("searchForm");
  const input = document.getElementById("areaSearch");

  if (!form || !input) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const rawValue = input.value.trim();

    if (!rawValue) {
      setStatus("Enter a 3-digit area code or a country code like +972.");
      return;
    }

    searchCode(rawValue);
  });
}

function searchCode(rawValue) {
  const cleanCode = rawValue.replace(/[^\d]/g, "");

  if (!cleanCode) {
    setStatus("Enter numbers only, like 212 or +972.");
    return;
  }

  if (COUNTRY_CODES[cleanCode]) {
    showCountryResult(COUNTRY_CODES[cleanCode]);
    return;
  }

  if (areaCodeData[cleanCode]) {
    showAreaCodeResult(cleanCode, areaCodeData[cleanCode]);
    return;
  }

  setStatus(`No match found for ${rawValue}. Try a 3-digit area code or country code like +972.`);
}

/* =====================================================
   AREA CODE DATA LOADING
===================================================== */

function loadAreaCodeData() {
  fetch("area_code_data.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("area_code_data.json not found");
      }

      return response.json();
    })
    .then((data) => {
      areaCodeData = normalizeAreaCodeData(data);
      setStatus("Enter a 3-digit area code or country code like +972.");
    })
    .catch(() => {
      areaCodeData = {};
      setStatus("Enter a country code like +972, +55, +27, +46, +81, +82, or +44.");
    });
}

function normalizeAreaCodeData(data) {
  const normalized = {};

  if (Array.isArray(data)) {
    data.forEach((item) => {
      const code = String(
        item.area_code ||
        item.areaCode ||
        item.code ||
        item.npa ||
        ""
      ).trim();

      if (code) {
        normalized[code] = item;
      }
    });

    return normalized;
  }

  if (data && typeof data === "object") {
    Object.entries(data).forEach(([code, value]) => {
      normalized[String(code).trim()] = value;
    });
  }

  return normalized;
}

/* =====================================================
   SHOW SEARCH RESULTS
===================================================== */

function showCountryResult(country) {
  updateInfoPanel({
    areaCode: country.code,
    city: country.name,
    state: "Country Code",
    timeZone: country.zoneKey ? getZoneLabel(country.zoneKey) : "---",
    localTime: country.zoneKey ? getTimeForZone(getZoneIana(country.zoneKey)) : "---"
  });

  flyToLocation(country.center, country.zoom);
  placeMarker(country.center, country.name);

  setStatus(`${country.code} found: ${country.name}.`);
}

function showAreaCodeResult(code, data) {
  const result = normalizeAreaResult(code, data);

  updateInfoPanel({
    areaCode: code,
    city: result.city,
    state: result.state,
    timeZone: result.timeZoneLabel,
    localTime: result.zoneKey ? getTimeForZone(getZoneIana(result.zoneKey)) : "---"
  });

  if (result.center) {
    flyToLocation(result.center, result.zoom);
    placeMarker(result.center, `${code} - ${result.city}`);
  }

  setStatus(`${code} found: ${result.city}${result.state ? ", " + result.state : ""}.`);
}

function normalizeAreaResult(code, data) {
  const item = typeof data === "string" ? { city: data } : data || {};

  const city =
    item.city ||
    item.location ||
    item.name ||
    item.primary_city ||
    item.main_city ||
    "---";

  const state =
    item.state ||
    item.region ||
    item.province ||
    item.country ||
    "";

  const lat = Number(
    item.lat ||
    item.latitude ||
    item.Latitude ||
    item.y
  );

  const lng = Number(
    item.lng ||
    item.lon ||
    item.longitude ||
    item.Longitude ||
    item.x
  );

  const center =
    Number.isFinite(lat) && Number.isFinite(lng)
      ? [lng, lat]
      : null;

  const rawTimeZone =
    item.timezone ||
    item.time_zone ||
    item.timeZone ||
    item.tz ||
    item.zone ||
    "";

  const zoneKey =
    getZoneKeyFromValue(rawTimeZone) ||
    getZoneKeyFromState(state);

  return {
    code,
    city,
    state,
    center,
    zoom: center ? 7 : 4,
    zoneKey,
    timeZoneLabel: zoneKey ? getZoneLabel(zoneKey) : rawTimeZone || "---"
  };
}

/* =====================================================
   TIME ZONE LOOKUPS
===================================================== */

function getZoneKeyFromValue(value) {
  if (!value) return null;

  const text = String(value).toLowerCase();

  if (text.includes("hawaii") || text.includes("honolulu")) return "hawaii";
  if (text.includes("alaska") || text.includes("anchorage")) return "alaska";
  if (text.includes("pacific") || text.includes("los_angeles") || text.includes("los angeles")) return "pacific";
  if (text.includes("mountain") || text.includes("denver")) return "mountain";
  if (text.includes("central") || text.includes("chicago")) return "central";
  if (text.includes("eastern") || text.includes("new_york") || text.includes("new york")) return "eastern";
  if (text.includes("atlantic") || text.includes("halifax")) return "atlantic";
  if (text.includes("newfoundland") || text.includes("st_johns") || text.includes("st johns")) return "newfoundland";
  if (text.includes("sao_paulo") || text.includes("são paulo") || text.includes("brasilia")) return "brasilia";
  if (text.includes("jerusalem") || text.includes("israel")) return "israel";
  if (text.includes("dubai") || text.includes("gulf")) return "gulf";
  if (text.includes("karachi") || text.includes("pakistan")) return "pakistan";
  if (text.includes("dhaka") || text.includes("bangladesh")) return "bangladesh";
  if (text.includes("bangkok") || text.includes("indochina")) return "indochina";
  if (text.includes("shanghai") || text.includes("singapore") || text.includes("china")) return "china_singapore";
  if (text.includes("tokyo") || text.includes("seoul") || text.includes("japan") || text.includes("korea")) return "japan_korea";
  if (text.includes("sydney") || text.includes("australia")) return "australian_eastern";
  if (text.includes("auckland") || text.includes("new zealand")) return "new_zealand";

  return null;
}

function getZoneKeyFromState(state) {
  if (!state) return null;

  const value = String(state).trim().toUpperCase();

  const stateZones = {
    ME: "eastern",
    NH: "eastern",
    VT: "eastern",
    MA: "eastern",
    RI: "eastern",
    CT: "eastern",
    NY: "eastern",
    NJ: "eastern",
    PA: "eastern",
    DE: "eastern",
    MD: "eastern",
    DC: "eastern",
    VA: "eastern",
    NC: "eastern",
    SC: "eastern",
    GA: "eastern",
    FL: "eastern",
    OH: "eastern",
    MI: "eastern",
    IN: "eastern",
    KY: "eastern",
    TN: "central",

    AL: "central",
    MS: "central",
    LA: "central",
    AR: "central",
    MO: "central",
    IA: "central",
    MN: "central",
    WI: "central",
    IL: "central",
    OK: "central",
    TX: "central",
    KS: "central",
    NE: "central",
    SD: "central",
    ND: "central",

    MT: "mountain",
    WY: "mountain",
    CO: "mountain",
    NM: "mountain",
    UT: "mountain",
    ID: "mountain",
    AZ: "mountain",

    CA: "pacific",
    OR: "pacific",
    WA: "pacific",
    NV: "pacific",

    AK: "alaska",
    HI: "hawaii"
  };

  return stateZones[value] || null;
}

function getZoneLabel(zoneKey) {
  const zone = TIME_ZONE_CARDS.find((item) => item.key === zoneKey);
  return zone ? zone.label : "---";
}

function getZoneIana(zoneKey) {
  const zone = TIME_ZONE_CARDS.find((item) => item.key === zoneKey);
  return zone ? zone.iana : "Etc/GMT";
}

function getTimeForZone(iana) {
  if (!iana) return "---";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: iana,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  }).format(new Date());
}

/* =====================================================
   MAP MOVEMENT / MARKERS
===================================================== */

function flyToLocation(center, zoom = 5) {
  if (!map || !Array.isArray(center)) return;

  if (!map.loaded()) {
    map.once("load", () => flyToLocation(center, zoom));
    return;
  }

  map.flyTo({
    center,
    zoom,
    speed: 0.9,
    curve: 1.4,
    essential: true
  });
}

function placeMarker(center, label) {
  if (!map || !Array.isArray(center)) return;

  if (!map.loaded()) {
    map.once("load", () => placeMarker(center, label));
    return;
  }

  if (!resultMarker) {
    resultMarker = new maptilersdk.Marker({
      color: "#f97316"
    })
      .setLngLat(center)
      .setPopup(new maptilersdk.Popup().setText(label))
      .addTo(map);
  } else {
    resultMarker.setLngLat(center);
    resultMarker.setPopup(new maptilersdk.Popup().setText(label));
  }
}

/* =====================================================
   INFO PANEL
===================================================== */

function updateInfoPanel(info) {
  setText("infoAreaCode", info.areaCode || "---");
  setText("infoCity", info.city || "---");
  setText("infoState", info.state || "---");
  setText("infoTimeZone", info.timeZone || "---");
  setText("infoLocalTime", info.localTime || "---");
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function setStatus(message) {
  const status = document.getElementById("statusMessage");
  if (status) {
    status.textContent = message;
  }
}
