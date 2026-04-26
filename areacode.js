"use strict";

/* =========================
   AREA CODE ATLAS - FULL JS
   WITH 28 TIME ZONES + GLOBE + COUNTRY CODES
   ========================= */

/* Put your real MapTiler key here */
const MAPTILER_KEY = "TRZg1QKiYa41B03OE9Bz";

/* File names */
const AREA_CODE_DATA_FILE = "area_code_data.json";
const COUNTRY_CODE_DATA_FILE = "country_codes.json";
const TIMEZONE_GEOJSON_FILE = "timezones.geojson";

/* Map globals */
let map = null;
let areaMarker = null;
let areaCodeData = {};
let countryCodeData = {};
let selectedAreaTzid = null;

/* =========================
   TIMEZONE CLOCKS - 28 BOXES
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
   DATA LOADING
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
      data.nanp_area_codes ||
      {};

    if (Object.keys(areaCodeData).length === 0 && !data.country_codes && !data.countryCodes) {
      areaCodeData = data;
    }

    const countryCodesInsideAreaFile =
      data.country_codes ||
      data.countryCodes ||
      data.calling_codes ||
      data.callingCodes ||
      null;

    if (countryCodesInsideAreaFile) {
      countryCodeData = normalizeCountryCodeData(countryCodesInsideAreaFile);
      console.log("Country code data loaded from area_code_data.json:", Object.keys(countryCodeData).length);
    }

    console.log("Area code data loaded:", Object.keys(areaCodeData).length);
  } catch (error) {
    console.error("Area code data failed to load:", error);
    setStatus("Area code data failed to load. Check area_code_data.json.");
  }
}

async function loadCountryCodeData() {
  try {
    const response = await fetch(COUNTRY_CODE_DATA_FILE);

    if (!response.ok) {
      console.warn(`${COUNTRY_CODE_DATA_FILE} not found. Using country codes from area_code_data.json if available.`);
      return;
    }

    const data = await response.json();

    const source =
      data.country_codes ||
      data.countryCodes ||
      data.calling_codes ||
      data.callingCodes ||
      data.codes ||
      data;

    const normalized = normalizeCountryCodeData(source);

    countryCodeData = {
      ...countryCodeData,
      ...normalized
    };

    console.log("Country code data loaded:", Object.keys(countryCodeData).length);
  } catch (error) {
    console.warn("Country code data skipped:", error);
  }
}

function normalizeCountryCodeData(source) {
  const normalized = {};

  if (Array.isArray(source)) {
    source.forEach((item) => {
      if (!item) return;

      const rawCode =
        item.code ||
        item.dial_code ||
        item.dialCode ||
        item.country_code ||
        item.countryCode ||
        item.calling_code ||
        item.callingCode ||
        "";

      const cleanCode = normalizeCountryCode(rawCode);

      if (!cleanCode) return;

      normalized[cleanCode] = item;
      normalized[`+${cleanCode}`] = item;
    });

    return normalized;
  }

  if (typeof source === "object" && source !== null) {
    Object.keys(source).forEach((key) => {
      const item = source[key];

      const rawCode =
        key ||
        item?.code ||
        item?.dial_code ||
        item?.dialCode ||
        item?.country_code ||
        item?.countryCode ||
        item?.calling_code ||
        item?.callingCode ||
        "";

      const cleanCode = normalizeCountryCode(rawCode);

      if (!cleanCode) return;

      normalized[cleanCode] = item;
      normalized[`+${cleanCode}`] = item;
    });
  }

  return normalized;
}

/* =========================
   AREA CODE + COUNTRY CODE HELPERS
   ========================= */

function getAreaCodeInfo(code) {
  if (!areaCodeData) return null;

  return areaCodeData[code] || null;
}

function normalizeCountryCode(value) {
  return String(value || "")
    .trim()
    .replace(/[^\d]/g, "");
}

function getCountryCodeInfo(value) {
  if (!countryCodeData) return null;

  const cleanCode = normalizeCountryCode(value);

  if (!cleanCode) return null;

  return (
    countryCodeData[`+${cleanCode}`] ||
    countryCodeData[cleanCode] ||
    null
  );
}

function getCountryFromInfo(info) {
  if (info.country) return info.country;
  if (info.name) return info.name;
  if (info.country_name) return info.country_name;
  if (info.countryName) return info.countryName;

  const state = String(info.state || "").toUpperCase();

  const canadianProvinces = [
    "AB", "BC", "MB", "NB", "NL", "NS",
    "NT", "NU", "ON", "PE", "QC", "SK", "YT"
  ];

  if (canadianProvinces.includes(state)) return "Canada";

  return "United States";
}

function getCityFromInfo(info) {
  return (
    info.city ||
    info.capital ||
    info.major_city ||
    info.majorCity ||
    info.region ||
    "---"
  );
}

function getStateFromInfo(info) {
  return (
    info.state ||
    info.province ||
    info.region ||
    info.continent ||
    "---"
  );
}

function getTimezoneNameFromInfo(info) {
  return (
    info.timezone ||
    info.time_zone ||
    info.timeZone ||
    info.zone ||
    info.label ||
    "---"
  );
}

function getTzidFromInfo(info) {
  if (info.tzid) return info.tzid;
  if (info.timezone_id) return info.timezone_id;
  if (info.timeZoneId) return info.timeZoneId;
  if (info.iana) return info.iana;
  if (info.iana_timezone) return info.iana_timezone;
  if (info.ianaTimezone) return info.ianaTimezone;

  return timezoneNameToTzid(getTimezoneNameFromInfo(info));
}

function timezoneNameToTzid(timezoneName) {
  const name = String(timezoneName).toLowerCase();

  if (name.includes("baker")) return "Etc/GMT+12";
  if (name.includes("samoa")) return "Pacific/Pago_Pago";
  if (name.includes("hawaii")) return "Pacific/Honolulu";
  if (name.includes("alaska")) return "America/Anchorage";
  if (name.includes("pacific")) return "America/Los_Angeles";
  if (name.includes("mountain")) return "America/Denver";
  if (name.includes("central europe")) return "Europe/Paris";
  if (name.includes("central")) return "America/Chicago";
  if (name.includes("eastern")) return "America/New_York";
  if (name.includes("atlantic")) return "America/Halifax";
  if (name.includes("newfoundland")) return "America/St_Johns";
  if (name.includes("brasília") || name.includes("brasilia") || name.includes("brazil")) return "America/Sao_Paulo";
  if (name.includes("south georgia")) return "Atlantic/South_Georgia";
  if (name.includes("azores")) return "Atlantic/Azores";
  if (name.includes("greenwich") || name.includes("utc")) return "UTC";
  if (name.includes("london")) return "Europe/London";
  if (name.includes("israel") || name.includes("jerusalem")) return "Asia/Jerusalem";
  if (name.includes("gulf") || name.includes("dubai")) return "Asia/Dubai";
  if (name.includes("pakistan") || name.includes("karachi")) return "Asia/Karachi";
  if (name.includes("bangladesh") || name.includes("dhaka")) return "Asia/Dhaka";
  if (name.includes("indochina") || name.includes("bangkok")) return "Asia/Bangkok";
  if (name.includes("china") || name.includes("singapore") || name.includes("shanghai")) return "Asia/Shanghai";
  if (name.includes("japan") || name.includes("korea") || name.includes("tokyo") || name.includes("seoul")) return "Asia/Tokyo";
  if (name.includes("australian") || name.includes("sydney")) return "Australia/Sydney";
  if (name.includes("solomon")) return "Pacific/Guadalcanal";
  if (name.includes("new zealand") || name.includes("auckland")) return "Pacific/Auckland";
  if (name.includes("tonga")) return "Pacific/Tongatapu";
  if (name.includes("line islands") || name.includes("kiritimati")) return "Pacific/Kiritimati";
  if (name.includes("chamorro") || name.includes("guam")) return "Pacific/Guam";

  return "UTC";
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

    const searchValue = searchInput.value.trim();

    searchCode(searchValue);
  });

  searchInput.addEventListener("input", function () {
    let value = searchInput.value.trim();

    value = value.replace(/[^\d+]/g, "");

    const startsWithPlus = value.startsWith("+");

    value = value.replace(/\+/g, "");

    if (startsWithPlus) {
      value = `+${value.slice(0, 3)}`;
    } else {
      value = value.slice(0, 3);
    }

    searchInput.value = value;
  });
}

function searchCode(rawInput) {
  const input = String(rawInput || "").trim();

  if (!input) {
    setStatus("Enter a 3-digit area code or country code like +972.");
    clearAreaInfo();
    return;
  }

  const hasPlus = input.startsWith("+");
  const cleanCode = normalizeCountryCode(input);

  if (!/^\d{1,3}$/.test(cleanCode)) {
    setStatus("Enter a valid area code or country code like 212, +1, or +972.");
    clearAreaInfo();
    return;
  }

  /*
    Search order:
    1. If user types +972, +1, etc. => country code first.
    2. If user types 3 digits without + => area code first.
    3. If no area code match => country code fallback.
    4. If 1 or 2 digits without + => country code.
  */

  if (hasPlus) {
    const countryInfo = getCountryCodeInfo(cleanCode);

    if (countryInfo) {
      showCountryCodeResult(cleanCode, countryInfo);
      return;
    }

    setStatus(`Country code +${cleanCode} was not found.`);
    clearAreaInfo();
    setInfoValue("areaCode", `+${cleanCode}`);
    return;
  }

  if (cleanCode.length === 3) {
    const areaInfo = getAreaCodeInfo(cleanCode);

    if (areaInfo) {
      showAreaCodeResult(cleanCode, areaInfo);
      return;
    }

    const countryInfo = getCountryCodeInfo(cleanCode);

    if (countryInfo) {
      showCountryCodeResult(cleanCode, countryInfo);
      return;
    }

    setStatus(`Area code or country code ${cleanCode} was not found.`);
    clearAreaInfo();
    setInfoValue("areaCode", cleanCode);
    return;
  }

  const countryInfo = getCountryCodeInfo(cleanCode);

  if (countryInfo) {
    showCountryCodeResult(cleanCode, countryInfo);
    return;
  }

  setStatus(`Country code +${cleanCode} was not found.`);
  clearAreaInfo();
  setInfoValue("areaCode", `+${cleanCode}`);
}

function showAreaCodeResult(code, info) {
  const city = getCityFromInfo(info);
  const state = getStateFromInfo(info);
  const country = getCountryFromInfo(info);
  const timezone = getTimezoneNameFromInfo(info);
  const tzid = getTzidFromInfo(info);

  selectedAreaTzid = tzid;

  setInfoValue("areaCode", code);
  setInfoValue("city", city);
  setInfoValue("state", state);
  setInfoValue("country", country);
  setInfoValue("timezone", timezone);
  updateSelectedAreaLocalTime();

  setStatus(`Showing area code ${code}.`);

  moveMapToLocation(info, 7);
  highlightTimezoneCard(timezone);
}

function showCountryCodeResult(code, info) {
  const cleanCode = normalizeCountryCode(code);
  const displayCode = `+${cleanCode}`;

  const city = getCityFromInfo(info);
  const state = getStateFromInfo(info);
  const country = getCountryFromInfo(info);
  const timezone = getTimezoneNameFromInfo(info);
  const tzid = getTzidFromInfo(info);

  selectedAreaTzid = tzid;

  setInfoValue("areaCode", displayCode);
  setInfoValue("city", city);
  setInfoValue("state", state);
  setInfoValue("country", country);
  setInfoValue("timezone", timezone);
  updateSelectedAreaLocalTime();

  setStatus(`Showing country code ${displayCode}.`);

  moveMapToLocation(info, 4);
  highlightTimezoneCard(timezone);
}

function setStatus(message) {
  const statusElement = document.getElementById("statusMessage");

  if (statusElement) {
    statusElement.textContent = message;
  }
}

/* =========================
   MAP - COLOR GLOBE
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

  /*
    COLOR GLOBE STYLE:
    This replaces the black/gray Dataviz Dark map.
  */
  const mapStyle =
    maptilersdk.MapStyle?.STREETS ||
    `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;

  map = new maptilersdk.Map({
    container: "map",
    style: mapStyle,
    center: [-98.5795, 39.8283],
    zoom: 2.7,
    minZoom: 1.5,
    maxZoom: 12,
    projection: "globe"
  });

  map.addControl(new maptilersdk.NavigationControl(), "top-right");

  map.on("load", function () {
    console.log("Color globe loaded.");
    loadTimezoneLayer();
  });
}

function moveMapToLocation(info, zoomLevel) {
  if (!map) return;

  const lat = Number(
    info.lat ||
    info.latitude ||
    info.center_lat ||
    info.centerLat
  );

  const lng = Number(
    info.lng ||
    info.lon ||
    info.longitude ||
    info.center_lng ||
    info.centerLng
  );

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    console.warn("No valid lat/lng for this result:", info);
    return;
  }

  map.flyTo({
    center: [lng, lat],
    zoom: zoomLevel,
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
   TIMEZONE GEOJSON COLORS
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
          "fill-opacity": 0.32
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
          "line-opacity": 0.35,
          "line-width": 1
        }
      });
    }

    console.log("Timezone color layer loaded.");
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
  await loadCountryCodeData();

  setStatus("Enter a 3-digit area code or country code like +972.");
});
