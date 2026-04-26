const MAPTILER_KEY = "TRZg1QKiYa41B03OE9Bz";

let map;
let marker;
let areaCodeData = {};
let countryCodeData = {};
let activeInfoTzid = null;

const timezoneColors = {
  "HAWAII": "#a855f7",
  "ALASKA": "#06b6d4",
  "PACIFIC": "#ef4444",
  "MOUNTAIN": "#f59e0b",
  "CENTRAL": "#22c55e",
  "EASTERN": "#3b82f6",
  "ATLANTIC": "#f59e0b",
  "NEWFOUNDLAND": "#8b5cf6",
  "BRASÍLIA": "#10b981",
  "SOUTH GEORGIA": "#f43f5e",
  "AZORES": "#6366f1",
  "GREENWICH": "#64748b",
  "LONDON": "#14b8a6",
  "CENTRAL EUROPE": "#ea580c",
  "ISRAEL": "#60a5fa",
  "GULF": "#f97316",
  "PAKISTAN": "#059669",
  "BANGLADESH": "#84cc16",
  "INDOCHINA": "#e11d48",
  "CHINA / SINGAPORE": "#f97316",
  "JAPAN / KOREA": "#d946ef",
  "AUSTRALIAN EASTERN": "#38bdf8",
  "SOLOMON ISLANDS": "#2dd4bf",
  "NEW ZEALAND": "#818cf8",
  "TONGA": "#ec4899",
  "LINE ISLANDS": "#fde047",
  "BAKER ISLAND": "#94a3b8",
  "SAMOA": "#2563eb"
};

const timezoneNameToTzid = {
  "Hawaii": "Pacific/Honolulu",
  "Alaska": "America/Anchorage",
  "Pacific": "America/Los_Angeles",
  "Mountain": "America/Denver",
  "Central": "America/Chicago",
  "Eastern": "America/New_York",
  "Atlantic": "America/Halifax",
  "Newfoundland": "America/St_Johns",
  "Brasília": "America/Sao_Paulo",
  "Brasilia": "America/Sao_Paulo",
  "South Georgia": "Atlantic/South_Georgia",
  "Azores": "Atlantic/Azores",
  "Greenwich": "Etc/UTC",
  "London": "Europe/London",
  "Central Europe": "Europe/Berlin",
  "Israel": "Asia/Jerusalem",
  "Gulf": "Asia/Dubai",
  "Pakistan": "Asia/Karachi",
  "Bangladesh": "Asia/Dhaka",
  "Indochina": "Asia/Bangkok",
  "China / Singapore": "Asia/Singapore",
  "Japan / Korea": "Asia/Tokyo",
  "Australian Eastern": "Australia/Sydney",
  "Solomon Islands": "Pacific/Guadalcanal",
  "New Zealand": "Pacific/Auckland",
  "Tonga": "Pacific/Tongatapu",
  "Line Islands": "Pacific/Kiritimati",
  "Baker Island": "Etc/GMT+12",
  "Samoa": "Pacific/Pago_Pago",
  "India": "Asia/Kolkata",
  "Brazil": "America/Sao_Paulo",
  "South Africa": "Africa/Johannesburg",
  "Sweden": "Europe/Stockholm"
};

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  loadDataFiles();
  initSearch();
  initTimezoneCards();
  updateAllClocks();

  setInterval(updateAllClocks, 1000);
});

function initMap() {
  maptilersdk.config.apiKey = MAPTILER_KEY;

  map = new maptilersdk.Map({
    container: "map",
    style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
    center: [-35, 22],
    zoom: 1.35,
    pitch: 0,
    bearing: 0,
    projection: "globe"
  });

  map.scrollZoom.disable();

  const mapContainer = document.getElementById("map");

  mapContainer.addEventListener("mouseenter", () => {
    map.scrollZoom.enable();
  });

  mapContainer.addEventListener("mouseleave", () => {
    map.scrollZoom.disable();
  });

  map.on("load", () => {
    if (typeof map.setProjection === "function") {
      try {
        map.setProjection({ type: "globe" });
      } catch (error) {
        console.log("Globe projection already active or not needed.");
      }
    }

    loadTimezoneLayer();
  });
}

async function loadTimezoneLayer() {
  const possibleFiles = [
    "timezones-now.geojson",
    "timezones.geojson",
    "timezones-now.json",
    "timezones.json"
  ];

  let geojson = null;

  for (const file of possibleFiles) {
    try {
      const response = await fetch(file, { cache: "no-store" });

      if (!response.ok) {
        continue;
      }

      geojson = await response.json();
      break;
    } catch (error) {
      continue;
    }
  }

  if (!geojson || !geojson.features) {
    console.log("No timezone GeoJSON file found. The globe map will still load.");
    return;
  }

  geojson.features.forEach((feature) => {
    if (!feature.properties) {
      feature.properties = {};
    }

    const label = getTimezoneLabelFromFeature(feature.properties);
    feature.properties.__tz_label = label || "GREENWICH";
  });

  if (map.getLayer("timezones-fill")) {
    map.removeLayer("timezones-fill");
  }

  if (map.getLayer("timezones-line")) {
    map.removeLayer("timezones-line");
  }

  if (map.getSource("timezones")) {
    map.removeSource("timezones");
  }

  map.addSource("timezones", {
    type: "geojson",
    data: geojson
  });

  const matchExpression = ["match", ["get", "__tz_label"]];

  Object.entries(timezoneColors).forEach(([name, color]) => {
    matchExpression.push(name, color);
  });

  matchExpression.push("#94a3b8");

  map.addLayer({
    id: "timezones-fill",
    type: "fill",
    source: "timezones",
    paint: {
      "fill-color": matchExpression,
      "fill-opacity": 0.34
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
}

function getTimezoneLabelFromFeature(properties) {
  const values = Object.values(properties)
    .filter(Boolean)
    .map((value) => String(value));

  const text = values.join(" ").toLowerCase();

  if (text.includes("honolulu") || text.includes("hawaii")) return "HAWAII";
  if (text.includes("anchorage") || text.includes("juneau") || text.includes("alaska")) return "ALASKA";
  if (text.includes("los_angeles") || text.includes("vancouver") || text.includes("tijuana")) return "PACIFIC";
  if (text.includes("denver") || text.includes("boise") || text.includes("edmonton") || text.includes("mountain")) return "MOUNTAIN";
  if (text.includes("chicago") || text.includes("winnipeg") || text.includes("mexico_city") || text.includes("central")) return "CENTRAL";
  if (text.includes("new_york") || text.includes("toronto") || text.includes("detroit") || text.includes("eastern")) return "EASTERN";
  if (text.includes("halifax") || text.includes("puerto_rico") || text.includes("atlantic")) return "ATLANTIC";
  if (text.includes("st_johns") || text.includes("newfoundland")) return "NEWFOUNDLAND";
  if (text.includes("sao_paulo") || text.includes("brasilia") || text.includes("brazil")) return "BRASÍLIA";
  if (text.includes("south_georgia")) return "SOUTH GEORGIA";
  if (text.includes("azores")) return "AZORES";
  if (text.includes("london")) return "LONDON";
  if (text.includes("berlin") || text.includes("paris") || text.includes("rome") || text.includes("madrid")) return "CENTRAL EUROPE";
  if (text.includes("jerusalem") || text.includes("israel")) return "ISRAEL";
  if (text.includes("dubai") || text.includes("muscat")) return "GULF";
  if (text.includes("karachi") || text.includes("pakistan")) return "PAKISTAN";
  if (text.includes("dhaka") || text.includes("bangladesh")) return "BANGLADESH";
  if (text.includes("bangkok") || text.includes("jakarta") || text.includes("ho_chi_minh")) return "INDOCHINA";
  if (text.includes("singapore") || text.includes("shanghai") || text.includes("hong_kong") || text.includes("china")) return "CHINA / SINGAPORE";
  if (text.includes("tokyo") || text.includes("seoul") || text.includes("japan") || text.includes("korea")) return "JAPAN / KOREA";
  if (text.includes("sydney") || text.includes("melbourne") || text.includes("australia")) return "AUSTRALIAN EASTERN";
  if (text.includes("guadalcanal") || text.includes("solomon")) return "SOLOMON ISLANDS";
  if (text.includes("auckland") || text.includes("new_zealand")) return "NEW ZEALAND";
  if (text.includes("tongatapu") || text.includes("tonga")) return "TONGA";
  if (text.includes("kiritimati") || text.includes("line_islands")) return "LINE ISLANDS";
  if (text.includes("gmt+12") || text.includes("baker")) return "BAKER ISLAND";
  if (text.includes("pago_pago") || text.includes("samoa")) return "SAMOA";
  if (text.includes("utc") || text.includes("gmt") || text.includes("greenwich")) return "GREENWICH";

  return "GREENWICH";
}

async function loadDataFiles() {
  try {
    const areaResponse = await fetch("area_code_data.json", { cache: "no-store" });

    if (areaResponse.ok) {
      const areaJson = await areaResponse.json();
      areaCodeData = normalizeAreaCodeData(areaJson);
    }
  } catch (error) {
    console.log("area_code_data.json not found or could not be loaded.");
  }

  try {
    const countryResponse = await fetch("country_codes.json", { cache: "no-store" });

    if (countryResponse.ok) {
      const countryJson = await countryResponse.json();
      countryCodeData = normalizeCountryCodeData(countryJson);
    }
  } catch (error) {
    console.log("country_codes.json not found or could not be loaded.");
  }

  countryCodeData = {
    ...countryCodeData,
    ...fallbackCountryCodes()
  };
}

function normalizeAreaCodeData(raw) {
  if (!raw) return {};

  if (raw.area_codes) return raw.area_codes;
  if (raw.areaCodes) return raw.areaCodes;

  return raw;
}

function normalizeCountryCodeData(raw) {
  const normalized = {};

  if (!raw) return normalized;

  if (raw.lookup_by_calling_code && typeof raw.lookup_by_calling_code === "object") {
    Object.entries(raw.lookup_by_calling_code).forEach(([codeKey, records]) => {
      const clean = cleanCode(codeKey);

      if (!clean) return;

      const recordList = Array.isArray(records) ? records : [records];
      const firstRecord = recordList[0] || {};

      normalized[clean] = {
        country: recordList.map((item) => item.country).filter(Boolean).join(" / ") || firstRecord.country || "---",
        countryCode: codeKey,
        iso2: firstRecord.iso2 || "",
        iso3: firstRecord.iso3 || "",
        nanp: Boolean(firstRecord.nanp)
      };
    });
  }

  if (Array.isArray(raw.countries)) {
    raw.countries.forEach((item) => {
      const callingCodes = item.calling_codes || item.callingCodes || item.codes || [];

      callingCodes.forEach((callingCode) => {
        const clean = cleanCode(callingCode);

        if (!clean) return;

        normalized[clean] = {
          ...normalized[clean],
          country: item.country || item.name || normalized[clean]?.country || "---",
          countryCode: callingCode,
          iso2: item.iso2 || normalized[clean]?.iso2 || "",
          iso3: item.iso3 || normalized[clean]?.iso3 || "",
          nanp: Boolean(item.nanp)
        };
      });
    });
  }

  return normalized;
}

function fallbackCountryCodes() {
  return {
    "1": {
      country: "United States / Canada",
      countryCode: "+1",
      region: "North America",
      timezone: "Eastern / Central / Mountain / Pacific",
      tzid: "America/New_York",
      lat: 39.8283,
      lng: -98.5795,
      zoom: 3
    },
    "44": {
      country: "United Kingdom",
      countryCode: "+44",
      region: "Europe",
      timezone: "London",
      tzid: "Europe/London",
      lat: 51.5072,
      lng: -0.1276,
      zoom: 5
    },
    "55": {
      country: "Brazil",
      countryCode: "+55",
      region: "South America",
      timezone: "Brasília",
      tzid: "America/Sao_Paulo",
      lat: -15.7939,
      lng: -47.8828,
      zoom: 4
    },
    "57": {
      country: "Colombia",
      countryCode: "+57",
      region: "South America",
      timezone: "Eastern",
      tzid: "America/Bogota",
      lat: 4.711,
      lng: -74.0721,
      zoom: 5
    },
    "81": {
      country: "Japan",
      countryCode: "+81",
      region: "Asia",
      timezone: "Japan / Korea",
      tzid: "Asia/Tokyo",
      lat: 35.6895,
      lng: 139.6917,
      zoom: 5
    },
    "82": {
      country: "South Korea",
      countryCode: "+82",
      region: "Asia",
      timezone: "Japan / Korea",
      tzid: "Asia/Seoul",
      lat: 37.5665,
      lng: 126.978,
      zoom: 5
    },
    "972": {
      country: "Israel",
      countryCode: "+972",
      region: "Middle East",
      timezone: "Israel",
      tzid: "Asia/Jerusalem",
      lat: 31.7683,
      lng: 35.2137,
      zoom: 6
    }
  };
}

function initSearch() {
  const form = document.getElementById("searchForm");
  const input = document.getElementById("areaSearch");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const rawValue = input.value.trim();
    const cleanedValue = cleanCode(rawValue);

    if (!cleanedValue) {
      setStatus("Enter an area code or country code.");
      return;
    }

    const typedPlus = rawValue.startsWith("+");

    if (typedPlus && countryCodeData[cleanedValue]) {
      await showCountryCode(cleanedValue, countryCodeData[cleanedValue]);
      return;
    }

    if (!typedPlus && areaCodeData[cleanedValue]) {
      showAreaCode(cleanedValue, areaCodeData[cleanedValue]);
      return;
    }

    if (countryCodeData[cleanedValue]) {
      await showCountryCode(cleanedValue, countryCodeData[cleanedValue]);
      return;
    }

    setStatus(`No match found for ${rawValue}. Try a 3-digit area code or country code like +972.`);
  });
}

function showAreaCode(code, record) {
  const city = record.city || record.primary_city || record.location || "---";
  const state = record.state || record.region || record.province || "---";
  const country = record.country || "United States / Canada";
  const countryCode = record.countryCode || record.country_code || "+1";
  const timezone = record.timezone || record.time_zone || "---";
  const tzid = record.tzid || record.timezone_id || timezoneNameToTzid[timezone] || "America/New_York";

  setText("infoAreaCode", code);
  setText("infoCity", city);
  setText("infoState", state);
  setText("infoCountry", country);
  setText("infoCountryCode", countryCode);
  setText("infoTimezone", timezone);
  setText("infoLocalTime", formatTime(tzid));

  activeInfoTzid = tzid;

  flyToRecord(record, 6);
  setStatus(`Showing area code ${code}.`);
}

async function showCountryCode(code, record) {
  const country = record.country || record.name || "---";
  const region = record.region || record.continent || "---";
  const countryCode = record.countryCode || record.country_code || `+${code}`;
  const timezone = record.timezone || record.time_zone || record.timeZone || "---";
  const tzid = record.tzid || record.timezone_id || timezoneNameToTzid[timezone] || "Etc/UTC";

  setText("infoAreaCode", "---");
  setText("infoCity", record.city || record.capital || country);
  setText("infoState", region);
  setText("infoCountry", country);
  setText("infoCountryCode", countryCode);
  setText("infoTimezone", timezone);
  setText("infoLocalTime", formatTime(tzid));

  activeInfoTzid = tzid;

  if (hasCoordinates(record)) {
    flyToRecord(record, record.zoom || 5);
    setStatus(`Showing country code ${countryCode}.`);
    return;
  }

  setStatus(`Showing country code ${countryCode}. Finding location on map...`);

  const geocoded = await geocodeCountry(country);

  if (geocoded) {
    record.lat = geocoded.lat;
    record.lng = geocoded.lng;
    record.zoom = 5;

    flyToRecord(record, 5);
    setStatus(`Showing country code ${countryCode}.`);
  } else {
    setStatus(`Country code ${countryCode} was found, but no map location was available.`);
  }
}

function hasCoordinates(record) {
  const lat = Number(record.lat || record.latitude);
  const lng = Number(record.lng || record.lon || record.longitude);

  return Number.isFinite(lat) && Number.isFinite(lng);
}

async function geocodeCountry(countryName) {
  if (!countryName || countryName === "---") {
    return null;
  }

  const firstCountry = countryName.split("/")[0].trim();
  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(firstCountry)}.json?key=${MAPTILER_KEY}&limit=1`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.features || !data.features.length) {
      return null;
    }

    const center = data.features[0].center;

    if (!center || center.length < 2) {
      return null;
    }

    return {
      lng: center[0],
      lat: center[1]
    };
  } catch (error) {
    return null;
  }
}

function initTimezoneCards() {
  const cards = document.querySelectorAll(".timezone-card");

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const lng = Number(card.dataset.lng);
      const lat = Number(card.dataset.lat);
      const zoom = Number(card.dataset.zoom || 4);

      if (!map || !Number.isFinite(lng) || !Number.isFinite(lat)) {
        return;
      }

      map.flyTo({
        center: [lng, lat],
        zoom,
        speed: 1.1,
        curve: 1.4,
        essential: true
      });
    });
  });
}

function updateAllClocks() {
  const cards = document.querySelectorAll(".timezone-card");

  cards.forEach((card) => {
    const tzid = card.dataset.tz;
    const timeElement = card.querySelector(".tz-time");

    if (!tzid || !timeElement) return;

    timeElement.textContent = formatTime(tzid);
  });

  if (activeInfoTzid) {
    setText("infoLocalTime", formatTime(activeInfoTzid));
  }
}

function formatTime(tzid) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tzid,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }).format(new Date());
  } catch (error) {
    return "--:--:--";
  }
}

function flyToRecord(record, defaultZoom = 5) {
  const lat = Number(record.lat || record.latitude);
  const lng = Number(record.lng || record.lon || record.longitude);

  if (!map || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return;
  }

  map.flyTo({
    center: [lng, lat],
    zoom: Number(record.zoom || defaultZoom),
    speed: 1.1,
    curve: 1.4,
    essential: true
  });

  if (!marker) {
    marker = new maptilersdk.Marker({
      color: "#ffffff"
    })
      .setLngLat([lng, lat])
      .addTo(map);
  } else {
    marker.setLngLat([lng, lat]);
  }
}

function cleanCode(value) {
  return String(value || "")
    .replace(/[^\d+]/g, "")
    .replace(/^\+/, "")
    .trim();
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value || "---";
  }
}

function setStatus(message) {
  const element = document.getElementById("statusMessage");

  if (element) {
    element.textContent = message;
  }
}
