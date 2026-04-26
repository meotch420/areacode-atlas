const MAPTILER_KEY = "TRZg1QKiYa41B03OE9Bz";

const AREA_CODE_FILE = "area_code_data.json";
const TIMEZONE_FILE = "timezones-now.geojson";

let map;
let marker;
let areaCodes = {};
let currentAreaRecord = null;

const TIME_ZONES = [
  {
    id: "utcMinus12Time",
    label: "UTC−12",
    offsetMinutes: -720,
    color: "#64748b"
  },
  {
    id: "utcMinus11Time",
    label: "UTC−11",
    offsetMinutes: -660,
    color: "#7c3aed"
  },
  {
    id: "hawaiiTime",
    label: "Hawaii",
    tzid: "Pacific/Honolulu",
    color: "#a78bfa"
  },
  {
    id: "alaskaTime",
    label: "Alaska",
    tzid: "America/Anchorage",
    color: "#60a5fa"
  },
  {
    id: "pacificTime",
    label: "Pacific",
    tzid: "America/Los_Angeles",
    color: "#06b6d4"
  },
  {
    id: "mountainTime",
    label: "Mountain",
    tzid: "America/Denver",
    color: "#fb7185"
  },
  {
    id: "centralTime",
    label: "Central",
    tzid: "America/Chicago",
    color: "#facc15"
  },
  {
    id: "easternTime",
    label: "Eastern",
    tzid: "America/New_York",
    color: "#22d3ee"
  },
  {
    id: "atlanticTime",
    label: "Atlantic",
    tzid: "America/Halifax",
    color: "#fbbf24"
  },
  {
    id: "newfoundlandTime",
    label: "Newfoundland",
    tzid: "America/St_Johns",
    color: "#c084fc"
  },
  {
    id: "brazilTime",
    label: "Brazil",
    tzid: "America/Sao_Paulo",
    color: "#22c55e"
  },
  {
    id: "southGeorgiaTime",
    label: "S. Georgia",
    tzid: "Atlantic/South_Georgia",
    color: "#14b8a6"
  },
  {
    id: "azoresTime",
    label: "Azores",
    tzid: "Atlantic/Azores",
    color: "#38bdf8"
  },
  {
    id: "utcTime",
    label: "UTC",
    offsetMinutes: 0,
    color: "#94a3b8"
  },
  {
    id: "londonTime",
    label: "London",
    tzid: "Europe/London",
    color: "#94a3b8"
  },
  {
    id: "centralEuropeTime",
    label: "Central Europe",
    tzid: "Europe/Paris",
    color: "#fb923c"
  },
  {
    id: "israelTime",
    label: "Israel",
    tzid: "Asia/Jerusalem",
    color: "#0038B8",
    className: "israel-card"
  },
  {
    id: "gulfTime",
    label: "Gulf",
    tzid: "Asia/Dubai",
    color: "#d946ef"
  },
  {
    id: "utcPlus5Time",
    label: "UTC+5",
    offsetMinutes: 300,
    color: "#84cc16"
  },
  {
    id: "utcPlus6Time",
    label: "UTC+6",
    offsetMinutes: 360,
    color: "#65a30d"
  },
  {
    id: "utcPlus7Time",
    label: "UTC+7",
    offsetMinutes: 420,
    color: "#10b981"
  },
  {
    id: "utcPlus8Time",
    label: "UTC+8",
    offsetMinutes: 480,
    color: "#0d9488"
  },
  {
    id: "utcPlus9Time",
    label: "UTC+9",
    offsetMinutes: 540,
    color: "#0891b2"
  },
  {
    id: "utcPlus10Time",
    label: "UTC+10",
    offsetMinutes: 600,
    color: "#2563eb"
  },
  {
    id: "utcPlus11Time",
    label: "UTC+11",
    offsetMinutes: 660,
    color: "#4f46e5"
  },
  {
    id: "utcPlus12Time",
    label: "UTC+12",
    offsetMinutes: 720,
    color: "#7c3aed"
  },
  {
    id: "utcPlus13Time",
    label: "UTC+13",
    offsetMinutes: 780,
    color: "#9333ea"
  },
  {
    id: "utcPlus14Time",
    label: "UTC+14",
    offsetMinutes: 840,
    color: "#be185d"
  }
];

const TIMEZONE_COLOR_ALIASES = {
  "UTC−10": "#a78bfa",
  "UTC-10": "#a78bfa",
  "UTC−9": "#60a5fa",
  "UTC-9": "#60a5fa",
  "UTC−8": "#06b6d4",
  "UTC-8": "#06b6d4",
  "UTC−7": "#fb7185",
  "UTC-7": "#fb7185",
  "UTC−6": "#facc15",
  "UTC-6": "#facc15",
  "UTC−5": "#22d3ee",
  "UTC-5": "#22d3ee",
  "UTC−4": "#fbbf24",
  "UTC-4": "#fbbf24",
  "UTC−3": "#22c55e",
  "UTC-3": "#22c55e",
  "UTC−2": "#14b8a6",
  "UTC-2": "#14b8a6",
  "UTC−1": "#38bdf8",
  "UTC-1": "#38bdf8",
  "UTC+1": "#fb923c",
  "UTC+2": "#0038B8",
  "UTC+3": "#0038B8",
  "UTC+4": "#d946ef"
};

document.addEventListener("DOMContentLoaded", () => {
  buildTimezoneCards();
  updateAllClocks();
  setInterval(updateAllClocks, 1000);

  setupSearch();
  loadAreaCodeData();
  initMap();
});

function buildTimezoneCards() {
  const timezoneBar = document.getElementById("timezoneBar");

  if (!timezoneBar) {
    console.warn("Missing HTML element: timezoneBar");
    return;
  }

  timezoneBar.innerHTML = "";

  TIME_ZONES.forEach((zone) => {
    const card = document.createElement("div");
    card.className = "timezone-card";

    if (zone.className) {
      card.classList.add(zone.className);
    }

    card.style.setProperty("--tz-color", zone.color);
    card.style.setProperty("--tz-glow", hexToRgba(zone.color, 0.5));

    card.innerHTML = `
      <div class="tz-label">${escapeHTML(zone.label)}</div>
      <div class="tz-time" id="${zone.id}">--:--:--</div>
    `;

    timezoneBar.appendChild(card);
  });
}

function updateAllClocks() {
  TIME_ZONES.forEach((zone) => {
    const element = document.getElementById(zone.id);

    if (!element) return;

    element.textContent = formatTimeForZone(zone);
  });

  updateSelectedAreaTime();
}

function formatTimeForZone(zone) {
  if (zone.tzid) {
    return formatIanaTime(zone.tzid);
  }

  return formatFixedOffsetTime(zone.offsetMinutes || 0);
}

function formatIanaTime(tzid) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tzid,
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }).format(new Date());
  } catch (error) {
    console.warn("Invalid timezone:", tzid);
    return "--:--:--";
  }
}

function formatFixedOffsetTime(offsetMinutes) {
  const shiftedDate = new Date(Date.now() + offsetMinutes * 60 * 1000);

  const hour24 = shiftedDate.getUTCHours();
  const minutes = shiftedDate.getUTCMinutes();
  const seconds = shiftedDate.getUTCSeconds();

  const hour12 = hour24 % 12 || 12;
  const ampm = hour24 >= 12 ? "PM" : "AM";

  return `${hour12}:${pad(minutes)}:${pad(seconds)} ${ampm}`;
}

function updateSelectedAreaTime() {
  const selectedLocalTime = document.getElementById("selectedLocalTime");

  if (!selectedLocalTime || !currentAreaRecord) return;

  if (currentAreaRecord.tzid) {
    selectedLocalTime.textContent = formatIanaTime(currentAreaRecord.tzid);
    return;
  }

  const matchingZone = TIME_ZONES.find((zone) => {
    return (
      zone.label.toLowerCase() ===
      String(currentAreaRecord.timezone || "").toLowerCase()
    );
  });

  if (matchingZone) {
    selectedLocalTime.textContent = formatTimeForZone(matchingZone);
  } else {
    selectedLocalTime.textContent = "--:--:--";
  }
}

function setupSearch() {
  const searchForm = document.getElementById("searchForm");
  const areaSearch = document.getElementById("areaSearch");

  if (!searchForm || !areaSearch) {
    console.warn("Missing searchForm or areaSearch element.");
    return;
  }

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const code = areaSearch.value.trim();

    if (!/^\d{3}$/.test(code)) {
      setStatus("Please enter a valid 3-digit area code.");
      return;
    }

    showAreaCode(code);
  });

  areaSearch.addEventListener("input", () => {
    areaSearch.value = areaSearch.value.replace(/\D/g, "").slice(0, 3);
  });
}

async function loadAreaCodeData() {
  try {
    const response = await fetch(AREA_CODE_FILE);

    if (!response.ok) {
      throw new Error(`Could not load ${AREA_CODE_FILE}`);
    }

    const data = await response.json();

    areaCodes = data.area_codes || data.areaCodes || data;

    setStatus(`${Object.keys(areaCodes).length} area codes loaded.`);
  } catch (error) {
    console.error(error);
    setStatus("Area code data did not load. Check area_code_data.json.");
  }
}

function showAreaCode(code) {
  const record = areaCodes[code];

  if (!record) {
    clearAreaInfo();
    setStatus(`Area code ${code} was not found.`);
    return;
  }

  currentAreaRecord = record;

  setText("areaCodeValue", code);
  setText("cityValue", record.city || "---");
  setText("stateValue", record.state || record.province || "---");
  setText("countryValue", record.country || getCountryFromState(record.state || record.province) || "---");
  setText("timezoneValue", record.timezone || record.tzid || "---");

  updateSelectedAreaTime();

  const lat = Number(record.lat);
  const lng = Number(record.lng);

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    moveMapToAreaCode(lat, lng);
  }

  setStatus(`Showing area code ${code}.`);
}

function clearAreaInfo() {
  currentAreaRecord = null;

  setText("areaCodeValue", "---");
  setText("cityValue", "---");
  setText("stateValue", "---");
  setText("countryValue", "---");
  setText("timezoneValue", "---");
  setText("selectedLocalTime", "--:--:--");
}

function moveMapToAreaCode(lat, lng) {
  if (!map) return;

  map.flyTo({
    center: [lng, lat],
    zoom: 7,
    speed: 1.2,
    curve: 1.4
  });

  if (marker) {
    marker.remove();
  }

  marker = new maptilersdk.Marker({
    color: "#38bdf8"
  })
    .setLngLat([lng, lat])
    .addTo(map);
}

function initMap() {
  if (!window.maptilersdk) {
    showMapNotice("MapTiler did not load. Check your internet connection.");
    return;
  }

  if (!MAPTILER_KEY || MAPTILER_KEY === "YOUR_MAPTILER_API_KEY") {
    showMapNotice("Add your MapTiler API key in areacode.js.");
    return;
  }

  maptilersdk.config.apiKey = MAPTILER_KEY;

  try {
    map = new maptilersdk.Map({
      container: "map",
      style: `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`,
      center: [-97, 38],
      zoom: 2.25,
      minZoom: 1.4,
      maxZoom: 12,
      renderWorldCopies: false
    });

    map.addControl(new maptilersdk.NavigationControl(), "top-right");

    map.on("load", () => {
      hideMapNotice();
      loadTimezonePolygons();
    });

    map.on("error", (error) => {
      console.error("Map error:", error);
      showMapNotice("Map error. Check your MapTiler key.");
    });
  } catch (error) {
    console.error(error);
    showMapNotice("Map could not start. Check your MapTiler key.");
  }
}

async function loadTimezonePolygons() {
  try {
    const response = await fetch(TIMEZONE_FILE);

    if (!response.ok) {
      console.warn(`${TIMEZONE_FILE} was not found.`);
      setStatus("Timezone file did not load. Check timezones-now.geojson.");
      return;
    }

    const geojson = await response.json();

    if (!geojson.features || !Array.isArray(geojson.features)) {
      console.warn("Timezone GeoJSON has no features array.");
      setStatus("Timezone file loaded, but no polygons were found.");
      return;
    }

    geojson.features.forEach((feature) => {
      feature.properties = feature.properties || {};
      feature.properties.__tz_label = getTimezoneLabel(feature.properties);
    });

    if (map.getSource("timezones")) {
      map.getSource("timezones").setData(geojson);
      return;
    }

    map.addSource("timezones", {
      type: "geojson",
      data: geojson
    });

    const firstSymbolLayerId = getFirstSymbolLayerId();

    map.addLayer(
      {
        id: "timezones-fill",
        type: "fill",
        source: "timezones",
        paint: {
          "fill-color": buildTimezoneColorExpression(),
          "fill-opacity": 0.42
        }
      },
      firstSymbolLayerId
    );

    map.addLayer(
      {
        id: "timezones-outline",
        type: "line",
        source: "timezones",
        paint: {
          "line-color": "#ffffff",
          "line-opacity": 0.22,
          "line-width": 0.7
        }
      },
      firstSymbolLayerId
    );

    setStatus(`${geojson.features.length} timezone polygons loaded.`);
  } catch (error) {
    console.warn("Timezone polygons could not load:", error);
    setStatus("Timezone polygons could not load.");
  }
}

function buildTimezoneColorExpression() {
  const matchExpression = ["match", ["get", "__tz_label"]];

  TIME_ZONES.forEach((zone) => {
    matchExpression.push(zone.label, zone.color);
  });

  Object.entries(TIMEZONE_COLOR_ALIASES).forEach(([label, color]) => {
    matchExpression.push(label, color);
  });

  matchExpression.push("#64748b");

  return matchExpression;
}

function getTimezoneLabel(properties) {
  const rawText = Object.values(properties)
    .filter(Boolean)
    .join(" ");

  const text = rawText.toLowerCase();

  if (text.includes("etc/gmt+12")) return "UTC−12";
  if (text.includes("etc/gmt+11")) return "UTC−11";
  if (text.includes("etc/gmt+10")) return "Hawaii";
  if (text.includes("etc/gmt+9")) return "Alaska";
  if (text.includes("etc/gmt+8")) return "Pacific";
  if (text.includes("etc/gmt+7")) return "Mountain";
  if (text.includes("etc/gmt+6")) return "Central";
  if (text.includes("etc/gmt+5")) return "Eastern";
  if (text.includes("etc/gmt+4")) return "Atlantic";
  if (text.includes("etc/gmt+3")) return "Brazil";
  if (text.includes("etc/gmt+2")) return "S. Georgia";
  if (text.includes("etc/gmt+1")) return "Azores";

  if (text.includes("etc/gmt-1")) return "Central Europe";
  if (text.includes("etc/gmt-2")) return "Israel";
  if (text.includes("etc/gmt-3")) return "Israel";
  if (text.includes("etc/gmt-4")) return "Gulf";
  if (text.includes("etc/gmt-5")) return "UTC+5";
  if (text.includes("etc/gmt-6")) return "UTC+6";
  if (text.includes("etc/gmt-7")) return "UTC+7";
  if (text.includes("etc/gmt-8")) return "UTC+8";
  if (text.includes("etc/gmt-9")) return "UTC+9";
  if (text.includes("etc/gmt-10")) return "UTC+10";
  if (text.includes("etc/gmt-11")) return "UTC+11";
  if (text.includes("etc/gmt-12")) return "UTC+12";
  if (text.includes("etc/gmt-13")) return "UTC+13";
  if (text.includes("etc/gmt-14")) return "UTC+14";

  if (text.includes("pacific/honolulu")) return "Hawaii";

  if (
    text.includes("america/anchorage") ||
    text.includes("america/juneau") ||
    text.includes("america/nome") ||
    text.includes("america/sitka") ||
    text.includes("america/yakutat")
  ) {
    return "Alaska";
  }

  if (
    text.includes("america/los_angeles") ||
    text.includes("america/vancouver") ||
    text.includes("america/tijuana") ||
    text.includes("america/dawson") ||
    text.includes("america/whitehorse")
  ) {
    return "Pacific";
  }

  if (
    text.includes("america/denver") ||
    text.includes("america/phoenix") ||
    text.includes("america/boise") ||
    text.includes("america/edmonton") ||
    text.includes("america/mazatlan")
  ) {
    return "Mountain";
  }

  if (
    text.includes("america/chicago") ||
    text.includes("america/winnipeg") ||
    text.includes("america/regina") ||
    text.includes("america/mexico_city") ||
    text.includes("america/monterrey") ||
    text.includes("america/guatemala") ||
    text.includes("america/belize")
  ) {
    return "Central";
  }

  if (
    text.includes("america/new_york") ||
    text.includes("america/toronto") ||
    text.includes("america/detroit") ||
    text.includes("america/indiana") ||
    text.includes("america/kentucky") ||
    text.includes("america/nassau") ||
    text.includes("america/jamaica") ||
    text.includes("america/panama")
  ) {
    return "Eastern";
  }

  if (
    text.includes("america/halifax") ||
    text.includes("america/moncton") ||
    text.includes("america/glace_bay") ||
    text.includes("america/goose_bay") ||
    text.includes("america/puerto_rico") ||
    text.includes("america/barbados") ||
    text.includes("america/bermuda") ||
    text.includes("america/blanc-sablon") ||
    text.includes("america/aruba") ||
    text.includes("america/curacao")
  ) {
    return "Atlantic";
  }

  if (text.includes("america/st_johns")) return "Newfoundland";

  if (
    text.includes("america/sao_paulo") ||
    text.includes("america/buenos_aires") ||
    text.includes("america/argentina") ||
    text.includes("america/montevideo")
  ) {
    return "Brazil";
  }

  if (text.includes("atlantic/south_georgia")) return "S. Georgia";

  if (
    text.includes("atlantic/azores") ||
    text.includes("atlantic/cape_verde")
  ) {
    return "Azores";
  }

  if (
    text.includes("etc/utc") ||
    text.includes("utc") ||
    text.includes("gmt")
  ) {
    const fixedUtcLabel = getFixedUtcLabel(rawText);
    if (fixedUtcLabel) return normalizeUtcLabelToDisplay(fixedUtcLabel);
    return "UTC";
  }

  if (
    text.includes("europe/london") ||
    text.includes("europe/dublin") ||
    text.includes("europe/lisbon")
  ) {
    return "London";
  }

  if (
    text.includes("europe/paris") ||
    text.includes("europe/berlin") ||
    text.includes("europe/rome") ||
    text.includes("europe/madrid") ||
    text.includes("europe/amsterdam") ||
    text.includes("europe/brussels") ||
    text.includes("europe/vienna") ||
    text.includes("europe/warsaw")
  ) {
    return "Central Europe";
  }

  if (
    text.includes("asia/jerusalem") ||
    text.includes("asia/tel_aviv") ||
    text.includes("europe/athens") ||
    text.includes("europe/helsinki") ||
    text.includes("europe/bucharest") ||
    text.includes("africa/cairo") ||
    text.includes("africa/johannesburg")
  ) {
    return "Israel";
  }

  if (
    text.includes("asia/dubai") ||
    text.includes("asia/muscat") ||
    text.includes("asia/baku") ||
    text.includes("asia/tbilisi") ||
    text.includes("asia/yerevan")
  ) {
    return "Gulf";
  }

  if (
    text.includes("asia/karachi") ||
    text.includes("asia/tashkent") ||
    text.includes("asia/yekaterinburg")
  ) {
    return "UTC+5";
  }

  if (
    text.includes("asia/dhaka") ||
    text.includes("asia/almaty") ||
    text.includes("asia/bishkek")
  ) {
    return "UTC+6";
  }

  if (
    text.includes("asia/bangkok") ||
    text.includes("asia/jakarta") ||
    text.includes("asia/ho_chi_minh")
  ) {
    return "UTC+7";
  }

  if (
    text.includes("asia/shanghai") ||
    text.includes("asia/singapore") ||
    text.includes("asia/hong_kong") ||
    text.includes("asia/taipei") ||
    text.includes("australia/perth")
  ) {
    return "UTC+8";
  }

  if (
    text.includes("asia/tokyo") ||
    text.includes("asia/seoul") ||
    text.includes("asia/yakutsk")
  ) {
    return "UTC+9";
  }

  if (
    text.includes("australia/sydney") ||
    text.includes("australia/melbourne") ||
    text.includes("australia/brisbane") ||
    text.includes("pacific/port_moresby")
  ) {
    return "UTC+10";
  }

  if (
    text.includes("pacific/noumea") ||
    text.includes("asia/sakhalin") ||
    text.includes("asia/magadan")
  ) {
    return "UTC+11";
  }

  if (
    text.includes("pacific/auckland") ||
    text.includes("pacific/fiji") ||
    text.includes("asia/kamchatka")
  ) {
    return "UTC+12";
  }

  if (
    text.includes("pacific/tongatapu") ||
    text.includes("pacific/apia") ||
    text.includes("pacific/fakaofo")
  ) {
    return "UTC+13";
  }

  if (text.includes("pacific/kiritimati")) return "UTC+14";

  const fixedUtcLabel = getFixedUtcLabel(rawText);

  if (fixedUtcLabel) {
    return normalizeUtcLabelToDisplay(fixedUtcLabel);
  }

  return "UTC";
}

function getFixedUtcLabel(value) {
  const text = String(value);

  const etcMatch = text.match(/Etc\/GMT([+-])(\d{1,2})/i);

  if (etcMatch) {
    const sign = etcMatch[1];
    const hour = Number(etcMatch[2]);

    if (sign === "+") {
      return `UTC−${hour}`;
    }

    return `UTC+${hour}`;
  }

  const utcMatch = text
    .replace("GMT", "UTC")
    .replace(/\s+/g, "")
    .match(/UTC([+-])(\d{1,2})/i);

  if (utcMatch) {
    const sign = utcMatch[1] === "+" ? "+" : "−";
    const hour = Number(utcMatch[2]);
    return `UTC${sign}${hour}`;
  }

  if (/Etc\/UTC|UTC|GMT/i.test(text)) {
    return "UTC";
  }

  return null;
}

function normalizeUtcLabelToDisplay(label) {
  const map = {
    "UTC−10": "Hawaii",
    "UTC-10": "Hawaii",
    "UTC−9": "Alaska",
    "UTC-9": "Alaska",
    "UTC−8": "Pacific",
    "UTC-8": "Pacific",
    "UTC−7": "Mountain",
    "UTC-7": "Mountain",
    "UTC−6": "Central",
    "UTC-6": "Central",
    "UTC−5": "Eastern",
    "UTC-5": "Eastern",
    "UTC−4": "Atlantic",
    "UTC-4": "Atlantic",
    "UTC−3": "Brazil",
    "UTC-3": "Brazil",
    "UTC−2": "S. Georgia",
    "UTC-2": "S. Georgia",
    "UTC−1": "Azores",
    "UTC-1": "Azores",
    "UTC+1": "Central Europe",
    "UTC+2": "Israel",
    "UTC+3": "Israel",
    "UTC+4": "Gulf"
  };

  return map[label] || label;
}

function getFirstSymbolLayerId() {
  const layers = map.getStyle().layers || [];

  const symbolLayer = layers.find((layer) => {
    return layer.type === "symbol" && layer.layout && layer.layout["text-field"];
  });

  return symbolLayer ? symbolLayer.id : undefined;
}

function getCountryFromState(state) {
  if (!state) return "";

  const canadianProvinces = [
    "AB", "BC", "MB", "NB", "NL", "NS", "NT",
    "NU", "ON", "PE", "QC", "SK", "YT"
  ];

  const caribbeanCodes = [
    "PR", "VI", "GU", "AS", "MP"
  ];

  const normalizedState = String(state).toUpperCase();

  if (canadianProvinces.includes(normalizedState)) {
    return "Canada";
  }

  if (caribbeanCodes.includes(normalizedState)) {
    return "U.S. Territory";
  }

  return "USA";
}

function setStatus(message) {
  const statusMessage = document.getElementById("statusMessage");

  if (statusMessage) {
    statusMessage.textContent = message;
  }
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function showMapNotice(message) {
  const mapNotice = document.getElementById("mapNotice");

  if (!mapNotice) return;

  mapNotice.textContent = message;
  mapNotice.classList.remove("hidden");
}

function hideMapNotice() {
  const mapNotice = document.getElementById("mapNotice");

  if (!mapNotice) return;

  mapNotice.classList.add("hidden");
}

function pad(number) {
  return String(number).padStart(2, "0");
}

function hexToRgba(hex, alpha) {
  const cleanHex = hex.replace("#", "");

  const red = parseInt(cleanHex.slice(0, 2), 16);
  const green = parseInt(cleanHex.slice(2, 4), 16);
  const blue = parseInt(cleanHex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
