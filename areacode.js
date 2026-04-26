"use strict";

/* =========================
   AREA CODE ATLAS - FULL JS
   ========================= */

/* Put your real MapTiler key here */
const MAPTILER_KEY = "TRZg1QKiYa41B03OE9Bz";

/* File names */
const AREA_CODE_DATA_FILE = "area_code_data.json";
const TIMEZONE_GEOJSON_FILE = "timezones.geojson";

/* Map globals */
let map = null;
let areaMarker = null;
let areaCodeData = {};
let selectedAreaTzid = null;

/* =========================
   TIMEZONE CLOCKS
   ========================= */

const TIMEZONE_CLOCKS = [
  {
    label: "Baker Island",
    timeZone: "Etc/GMT+12",
    ids: ["utcMinus12Time", "bakerIslandTime"]
  },
  {
    label: "Samoa",
    timeZone: "Pacific/Pago_Pago",
    ids: ["utcMinus11Time", "samoaTime"]
  },
  {
    label: "Hawaii",
    timeZone: "Pacific/Honolulu",
    ids: ["hawaiiTime"]
  },
  {
    label: "Alaska",
    timeZone: "America/Anchorage",
    ids: ["alaskaTime"]
  },
  {
    label: "Pacific",
    timeZone: "America/Los_Angeles",
    ids: ["pacificTime"]
  },
  {
    label: "Mountain",
    timeZone: "America/Denver",
    ids: ["mountainTime"]
  },
  {
    label: "Central",
    timeZone: "America/Chicago",
    ids: ["centralTime"]
  },
  {
    label: "Eastern",
    timeZone: "America/New_York",
    ids: ["easternTime"]
  },
  {
    label: "Atlantic",
    timeZone: "America/Halifax",
    ids: ["atlanticTime"]
  },
  {
    label: "Newfoundland",
    timeZone: "America/St_Johns",
    ids: ["newfoundlandTime"]
  },
  {
    label: "Brasília",
    timeZone: "America/Sao_Paulo",
    ids: ["brazilTime", "brasiliaTime"]
  },
  {
    label: "South Georgia",
    timeZone: "Atlantic/South_Georgia",
    ids: ["southGeorgiaTime", "sGeorgiaTime"]
  },
  {
    label: "Azores",
    timeZone: "Atlantic/Azores",
    ids: ["azoresTime"]
  },
  {
    label: "Greenwich",
    timeZone: "UTC",
    ids: ["utcTime", "greenwichTime"]
  },
  {
    label: "London",
    timeZone: "Europe/London",
    ids: ["londonTime"]
  },
  {
    label: "Central Europe",
    timeZone: "Europe/Paris",
    ids: ["centralEuropeTime", "europeTime"]
  },
  {
    label: "Israel",
    timeZone: "Asia/Jerusalem",
    ids: ["israelTime"]
  },
  {
    label: "Gulf",
    timeZone: "Asia/Dubai",
    ids: ["gulfTime"]
  },
  {
    label: "Pakistan",
    timeZone: "Asia/Karachi",
    ids: ["utcPlus5Time", "pakistanTime"]
  },
  {
    label: "Bangladesh",
    timeZone: "Asia/Dhaka",
    ids: ["utcPlus6Time", "bangladeshTime"]
  },
  {
    label: "Indochina",
    timeZone: "Asia/Bangkok",
    ids: ["utcPlus7Time", "indochinaTime"]
  },
  {
    label: "China / Singapore",
    timeZone: "Asia/Shanghai",
    ids: ["utcPlus8Time", "chinaTime"]
  },
  {
    label: "Japan / Korea",
    timeZone: "Asia/Tokyo",
    ids: ["utcPlus9Time", "japanTime"]
  },
  {
    label: "Australian Eastern",
    timeZone: "Australia/Sydney",
    ids: ["utcPlus10Time", "australiaTime"]
  },
  {
    label: "Solomon Islands",
    timeZone: "Pacific/Guadalcanal",
    ids: ["utcPlus11Time", "solomonTime"]
  },
  {
    label: "New Zealand",
    timeZone: "Pacific/Auckland",
    ids: ["utcPlus12Time", "newZealandTime"]
  },
  {
    label: "Tonga",
    timeZone: "Pacific/Tongatapu",
    ids: ["utcPlus13Time", "tongaTime"]
  },
  {
    label: "Line Islands",
    timeZone: "Pacific/Kiritimati",
    ids: ["utcPlus14Time", "lineIslandsTime"]
  }
];

function formatTimeForZone(timeZone) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone,
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }).format(new Date());
  } catch (error) {
    console.error("Invalid timezone:", timeZone, error);
    return "--:--:--";
  }
}

function updateTimezoneLabels() {
  TIMEZONE_CLOCKS.forEach((clock) => {
    clock.ids.forEach((id) => {
      const timeElement = document.getElementById(id);

      if (!timeElement) return;

      const card = timeElement.closest(".timezone-card");

      if (!card) return;

      const labelElement = card.querySelector(".tz-label");

      if (labelElement) {
        labelElement.textContent = clock.label;
      }
    });
  });
}

function updateTimezoneClocks() {
  TIMEZONE_CLOCKS.forEach((clock) => {
    clock.ids.forEach((id) => {
      const timeElement = document.getElementById(id);

      if (!timeElement) return;

      timeElement.textContent = formatTimeForZone(clock.timeZone);
    });
  });

  updateSelectedAreaLocalTime();
}

function startTimezoneClocks() {
  updateTimezoneLabels();
  updateTimezoneClocks();
  setInterval(updateTimezoneClocks, 1000);
}

/* =========================
   AREA INFORMATION PANEL
   ========================= */

const INFO_FIELDS = {
  areaCode: {
    label: "Area Code",
    ids: ["infoAreaCode", "areaCodeInfo", "areaCodeValue", "selectedAreaCode"]
  },
  city: {
    label: "City",
    ids: ["infoCity", "cityInfo", "cityValue", "selectedCity"]
  },
  state: {
    label: "State / Province",
    ids: ["infoState", "stateInfo", "stateValue", "provinceInfo", "selectedState"]
  },
  country: {
    label: "Country",
    ids: ["infoCountry", "countryInfo", "countryValue", "selectedCountry"]
  },
  timezone: {
    label: "Time Zone",
    ids: ["infoTimezone", "timezoneInfo", "timezoneValue", "timeZoneValue", "selectedTimezone"]
  },
  localTime: {
    label: "Local Time",
    ids: ["infoLocalTime", "localTimeInfo", "localTimeValue", "selectedLocalTime"]
  }
};

function setInfoValue(fieldKey, value) {
  const field = INFO_FIELDS[fieldKey];

  if (!field) return;

  let updated = false;

  field.ids.forEach((id) => {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
      updated = true;
    }
  });

  if (updated) return;

  const rows = document.querySelectorAll(".info-row");

  rows.forEach((row) => {
    const labelElement =
      row.querySelector(".info-label") ||
      row.firstElementChild;

    const valueElement =
      row.querySelector(".info-value") ||
      row.lastElementChild;

    if (!labelElement || !valueElement) return;

    const labelText = labelElement.textContent.trim().toLowerCase();
    const wantedLabel = field.label.toLowerCase();

    if (labelText.includes(wantedLabel)) {
      valueElement.textContent = value;
    }
  });
}

function clearAreaInfo() {
  selectedAreaTzid = null;

  setInfoValue("areaCode", "---");
  setInfoValue("city", "---");
  setInfoValue("state", "---");
  setInfoValue("country", "---");
  setInfoValue("timezone", "---");
  setInfoValue("localTime", "---");
}

function updateSelectedAreaLocalTime() {
  if (!selectedAreaTzid) return;

  setInfoValue("localTime", formatTimeForZone(selectedAreaTzid));
}

/* =========================
   AREA CODE DATA
   ========================= */

async function loadAreaCodeData() {
  try {
    const response = await fetch(AREA_CODE_DATA_FILE);

    if (!response.ok) {
      throw new Error(`Could not load ${AREA_CODE_DATA_FILE}`);
    }

    const data = await response.json();

    areaCodeData =
      data.area_codes ||
      data.areaCodes ||
      data.codes ||
      data;

    console.log("Area code data loaded:", Object.keys(areaCodeData).length);
  } catch (error) {
    console.error("Area code data failed to load:", error);
    setStatus("Area code data failed to load. Check area_code_data.json.");
  }
}

function getAreaCodeInfo(code) {
  if (!areaCodeData) return null;

  return areaCodeData[code] || null;
}

function getCountryFromInfo(info) {
  if (info.country) return info.country;

  const state = String(info.state || "").toUpperCase();

  const canadianProvinces = [
    "AB", "BC", "MB", "NB", "NL", "NS",
    "NT", "NU", "ON", "PE", "QC", "SK", "YT"
  ];

  if (canadianProvinces.includes(state)) return "Canada";

  return "United States";
}

function getTzidFromInfo(info) {
  if (info.tzid) return info.tzid;
  if (info.timezone_id) return info.timezone_id;
  if (info.timeZoneId) return info.timeZoneId;

  return timezoneNameToTzid(info.timezone || "");
}

function timezoneNameToTzid(timezoneName) {
  const name = String(timezoneName).toLowerCase();

  if (name.includes("newfoundland")) return "America/St_Johns";
  if (name.includes("atlantic")) return "America/Halifax";
  if (name.includes("eastern")) return "America/New_York";
  if (name.includes("central")) return "America/Chicago";
  if (name.includes("mountain")) return "America/Denver";
  if (name.includes("pacific")) return "America/Los_Angeles";
  if (name.includes("alaska")) return "America/Anchorage";
  if (name.includes("hawaii")) return "Pacific/Honolulu";
  if (name.includes("samoa")) return "Pacific/Pago_Pago";
  if (name.includes("chamorro")) return "Pacific/Guam";
  if (name.includes("guam")) return "Pacific/Guam";

  return "America/New_York";
}

/* =========================
   SEARCH
   ========================= */

function setupSearch() {
  const searchForm = document.getElementById("searchForm");
  const searchInput = document.getElementById("areaSearch");

  if (!searchForm || !searchInput) {
    console.warn("Search form or input not found.");
    return;
  }

  searchForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const code = searchInput.value.trim();

    searchAreaCode(code);
  });

  searchInput.addEventListener("input", function () {
    searchInput.value = searchInput.value.replace(/\D/g, "").slice(0, 3);
  });
}

function searchAreaCode(code) {
  if (!/^\d{3}$/.test(code)) {
    setStatus("Enter a valid 3-digit area code.");
    clearAreaInfo();
    return;
  }

  const info = getAreaCodeInfo(code);

  if (!info) {
    setStatus(`Area code ${code} was not found.`);
    clearAreaInfo();
    setInfoValue("areaCode", code);
    return;
  }

  const city = info.city || "---";
  const state = info.state || info.province || "---";
  const country = getCountryFromInfo(info);
  const timezone = info.timezone || "---";
  const tzid = getTzidFromInfo(info);

  selectedAreaTzid = tzid;

  setInfoValue("areaCode", code);
  setInfoValue("city", city);
  setInfoValue("state", state);
  setInfoValue("country", country);
  setInfoValue("timezone", timezone);
  updateSelectedAreaLocalTime();

  setStatus(`Showing area code ${code}.`);

  moveMapToArea(info);
  highlightTimezoneCard(timezone);
}

function setStatus(message) {
  const statusElement = document.getElementById("statusMessage");

  if (statusElement) {
    statusElement.textContent = message;
  }
}

/* =========================
   MAP
   ========================= */

function setupMap() {
  const mapElement = document.getElementById("map");

  if (!mapElement) {
    console.warn("No #map element found.");
    return;
  }

  if (typeof maptilersdk === "undefined") {
    console.warn("MapTiler SDK is not loaded.");
    return;
  }

  if (!MAPTILER_KEY || MAPTILER_KEY === "PASTE_YOUR_MAPTILER_KEY_HERE") {
    console.warn("Add your MapTiler key to areacode.js.");
    setStatus("Add your MapTiler key inside areacode.js.");
    return;
  }

  maptilersdk.config.apiKey = MAPTILER_KEY;

  const mapStyle =
    maptilersdk.MapStyle?.DATAVIZ?.DARK ||
    `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`;

  map = new maptilersdk.Map({
    container: "map",
    style: mapStyle,
    center: [-98.5795, 39.8283],
    zoom: 3,
    minZoom: 2,
    maxZoom: 12,
    projection: "globe"
  });

  map.addControl(new maptilersdk.NavigationControl(), "top-right");

  map.on("load", function () {
    console.log("Map loaded.");
    loadTimezoneLayer();
  });
}

function moveMapToArea(info) {
  if (!map) return;

  const lat = Number(info.lat || info.latitude);
  const lng = Number(info.lng || info.lon || info.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    console.warn("No valid lat/lng for this area code:", info);
    return;
  }

  map.flyTo({
    center: [lng, lat],
    zoom: 7,
    speed: 0.9,
    essential: true
  });

  if (areaMarker) {
    areaMarker.remove();
  }

  areaMarker = new maptilersdk.Marker({
    color: "#0ea5e9"
  })
    .setLngLat([lng, lat])
    .addTo(map);
}

/* =========================
   OPTIONAL TIMEZONE GEOJSON
   ========================= */

async function loadTimezoneLayer() {
  if (!map) return;

  try {
    const response = await fetch(TIMEZONE_GEOJSON_FILE);

    if (!response.ok) {
      console.warn(`${TIMEZONE_GEOJSON_FILE} not found. Skipping timezone polygons.`);
      return;
    }

    const geojson = await response.json();

    if (!geojson.features) {
      console.warn("Timezone GeoJSON has no features.");
      return;
    }

    geojson.features.forEach((feature) => {
      const props = feature.properties || {};
      const tzid =
        props.tzid ||
        props.TZID ||
        props.timezone ||
        props.zone ||
        props.name ||
        "";

      feature.properties = {
        ...props,
        __tz_label: getTimezoneLabelFromTzid(tzid)
      };
    });

    if (map.getSource("timezones")) {
      map.getSource("timezones").setData(geojson);
    } else {
      map.addSource("timezones", {
        type: "geojson",
        data: geojson
      });
    }

    if (!map.getLayer("timezones-fill")) {
      map.addLayer({
        id: "timezones-fill",
        type: "fill",
        source: "timezones",
        paint: {
          "fill-color": [
            "match",
            ["get", "__tz_label"],

            "Baker Island", "#64748b",
            "Samoa", "#9333ea",
            "Hawaii", "#a78bfa",
            "Alaska", "#3b82f6",
            "Pacific", "#06b6d4",
            "Mountain", "#fb7185",
            "Central", "#facc15",
            "Eastern", "#22d3ee",
            "Atlantic", "#f59e0b",
            "Newfoundland", "#c084fc",
            "Brasília", "#22c55e",
            "South Georgia", "#14b8a6",
            "Azores", "#38bdf8",
            "Greenwich", "#94a3b8",
            "London", "#94a3b8",
            "Central Europe", "#f97316",
            "Israel", "#2563eb",
            "Gulf", "#d946ef",
            "Pakistan", "#84cc16",
            "Bangladesh", "#65a30d",
            "Indochina", "#10b981",
            "China / Singapore", "#0d9488",
            "Japan / Korea", "#0ea5e9",
            "Australian Eastern", "#2563eb",
            "Solomon Islands", "#4f46e5",
            "New Zealand", "#7c3aed",
            "Tonga", "#9333ea",
            "Line Islands", "#db2777",

            "#475569"
          ],
          "fill-opacity": 0.35
        }
      });
    }

    if (!map.getLayer("timezones-line")) {
      map.addLayer({
        id: "timezones-line",
        type: "line",
        source: "timezones",
        paint: {
          "line-color": "#ffffff",
          "line-opacity": 0.25,
          "line-width": 1
        }
      });
    }

    console.log("Timezone layer loaded.");
  } catch (error) {
    console.warn("Timezone layer skipped:", error);
  }
}

function getTimezoneLabelFromTzid(tzid) {
  const zone = String(tzid).toLowerCase();

  if (zone.includes("gmt+12")) return "Baker Island";
  if (zone.includes("pago_pago") || zone.includes("samoa")) return "Samoa";
  if (zone.includes("honolulu") || zone.includes("hawaii")) return "Hawaii";
  if (zone.includes("anchorage") || zone.includes("alaska")) return "Alaska";
  if (zone.includes("los_angeles") || zone.includes("vancouver")) return "Pacific";
  if (zone.includes("denver") || zone.includes("edmonton") || zone.includes("phoenix")) return "Mountain";
  if (zone.includes("chicago") || zone.includes("winnipeg")) return "Central";
  if (zone.includes("new_york") || zone.includes("toronto")) return "Eastern";
  if (zone.includes("halifax") || zone.includes("atlantic")) return "Atlantic";
  if (zone.includes("st_johns") || zone.includes("newfoundland")) return "Newfoundland";
  if (zone.includes("sao_paulo") || zone.includes("brazil")) return "Brasília";
  if (zone.includes("south_georgia")) return "South Georgia";
  if (zone.includes("azores")) return "Azores";
  if (zone === "utc" || zone.includes("gmt")) return "Greenwich";
  if (zone.includes("london")) return "London";
  if (zone.includes("paris") || zone.includes("berlin") || zone.includes("rome")) return "Central Europe";
  if (zone.includes("jerusalem")) return "Israel";
  if (zone.includes("dubai")) return "Gulf";
  if (zone.includes("karachi")) return "Pakistan";
  if (zone.includes("dhaka")) return "Bangladesh";
  if (zone.includes("bangkok")) return "Indochina";
  if (zone.includes("shanghai") || zone.includes("singapore")) return "China / Singapore";
  if (zone.includes("tokyo") || zone.includes("seoul")) return "Japan / Korea";
  if (zone.includes("sydney") || zone.includes("melbourne")) return "Australian Eastern";
  if (zone.includes("guadalcanal")) return "Solomon Islands";
  if (zone.includes("auckland")) return "New Zealand";
  if (zone.includes("tongatapu")) return "Tonga";
  if (zone.includes("kiritimati")) return "Line Islands";

  return "Greenwich";
}

/* =========================
   HIGHLIGHT CLOCK CARD
   ========================= */

function highlightTimezoneCard(timezoneName) {
  const cards = document.querySelectorAll(".timezone-card");

  cards.forEach((card) => {
    card.classList.remove("active-timezone-card");
  });

  if (!timezoneName) return;

  const name = String(timezoneName).toLowerCase();

  cards.forEach((card) => {
    const label = card.querySelector(".tz-label");

    if (!label) return;

    const labelText = label.textContent.trim().toLowerCase();

    if (
      name.includes(labelText) ||
      labelText.includes(name)
    ) {
      card.classList.add("active-timezone-card");
    }
  });
}

/* =========================
   START APP
   ========================= */

document.addEventListener("DOMContentLoaded", async function () {
  clearAreaInfo();
  startTimezoneClocks();
  setupSearch();
  setupMap();
  await loadAreaCodeData();

  setStatus("Enter a 3-digit area code to search.");
});
