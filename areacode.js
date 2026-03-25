const DATA_FILE = "area_code_data.json";
const MAPTILER_KEY = "TRZg1QKiYa41B03OE9Bz";

const worldBounds = L.latLngBounds(
  [-85, -180],
  [85, 180]
);

const map = L.map("map", {
  maxBounds: worldBounds,
  maxBoundsViscosity: 1.0,
  minZoom: 2,
  maxZoom: 10,
  worldCopyJump: false
}).setView([20, 0], 2);

L.maptiler.maptilerLayer({
  apiKey: MAPTILER_KEY,
  style: maptilersdk.MapStyle.STREETS,
  noWrap: true
}).addTo(map);

let areaCodesByCode = {};
let currentPolygon = null;
let clockInterval = null;
let currentTimezoneId = null;
let dataLoaded = false;

function getFillColor(timezone) {
  const colors = {
    Eastern: "#2563eb",
    Central: "#16a34a",
    Mountain: "#f59e0b",
    Pacific: "#dc2626",
    Alaska: "#7c3aed",
    Hawaii: "#0891b2",
    Atlantic: "#0ea5e9",
    Newfoundland: "#14b8a6"
  };
  return colors[timezone] || "#64748b";
}

function getBusinessHoursStatus(tzid) {
  if (!tzid) return "-";

  const hourString = new Date().toLocaleString("en-US", {
    timeZone: tzid,
    hour: "numeric",
    hour12: false
  });

  const hour = parseInt(hourString, 10);
  return hour >= 8 && hour < 17 ? "Open" : "Closed";
}

function startClock(tzid) {
  const clockEl = document.getElementById("clock");

  if (clockInterval) clearInterval(clockInterval);
  currentTimezoneId = tzid;

  function updateClock() {
    if (!currentTimezoneId) {
      clockEl.textContent = "--:--:--";
      return;
    }

    const time = new Date().toLocaleTimeString("en-US", {
      timeZone: currentTimezoneId,
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });

    clockEl.textContent = time;
  }

  updateClock();
  clockInterval = setInterval(updateClock, 1000);
}

function updateInfo(code, data) {
  const infoCity = document.getElementById("info-city");
  const infoState = document.getElementById("info-state");
  const infoAreaCode = document.getElementById("info-area-code");
  const infoTimezone = document.getElementById("info-timezone");
  const infoHours = document.getElementById("info-hours");
  const clockEl = document.getElementById("clock");

  if (!data) {
    infoCity.textContent = "-";
    infoState.textContent = "-";
    infoAreaCode.textContent = "-";
    infoTimezone.textContent = "-";
    infoHours.textContent = "-";
    clockEl.textContent = "--:--:--";
    return;
  }

  infoCity.textContent = data.city || "-";
  infoState.textContent = data.state || "-";
  infoAreaCode.textContent = code || "-";
  infoTimezone.textContent = data.timezone || "-";
  infoHours.textContent = getBusinessHoursStatus(data.tzid);
  startClock(data.tzid);
}

function getPolygonRadiusKm(item) {
  const state = (item.state || "").toUpperCase();

  const largerAreas = [
    "TX", "CA", "AK", "BC", "AB", "SK", "MB", "ON", "QC", "NV", "AZ",
    "CO", "NM", "ID", "MT", "WY", "UT"
  ];

  const smallerAreas = [
    "DC", "DE", "RI", "CT", "NJ", "MD", "MA"
  ];

  if (smallerAreas.includes(state)) return 28;
  if (largerAreas.includes(state)) return 55;
  return 38;
}

function createAreaPolygon(item) {
  const lat = Number(item.lat);
  const lng = Number(item.lng);
  const radiusKm = getPolygonRadiusKm(item);

  const points = [];
  const sides = 40;

  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;

    const latOffset = (radiusKm / 111) * Math.sin(angle);
    const lngOffset =
      (radiusKm / (111 * Math.cos((lat * Math.PI) / 180))) * Math.cos(angle);

    points.push([lat + latOffset, lng + lngOffset]);
  }

  return points;
}

function clearCurrentPolygon() {
  if (currentPolygon) {
    map.removeLayer(currentPolygon);
    currentPolygon = null;
  }
}

function showAreaPolygon(code, item) {
  clearCurrentPolygon();

  const fillColor = getFillColor(item.timezone);
  const polygonCoords = createAreaPolygon(item);

  currentPolygon = L.polygon(polygonCoords, {
    color: "#ffffff",
    weight: 2,
    fillColor: fillColor,
    fillOpacity: 0.45,
    opacity: 1
  }).addTo(map);

  map.fitBounds(currentPolygon.getBounds(), { padding: [40, 40] });

  currentPolygon.bindPopup(`
    <div style="font-weight:700;font-size:16px;">${code}</div>
    <div>${item.city}, ${item.state}</div>
    <div>${item.timezone}</div>
  `);

  currentPolygon.openPopup();
}

function selectArea(code) {
  const item = areaCodesByCode[String(code).trim()];

  if (!item) {
    alert(`Area code ${code} not found.`);
    return;
  }

  showAreaPolygon(code, item);
  updateInfo(code, item);
}

fetch(DATA_FILE)
  .then((res) => {
    if (!res.ok) {
      throw new Error(`Failed to load ${DATA_FILE}: ${res.status}`);
    }
    return res.json();
  })
  .then((data) => {
    const codes = data.area_codes || {};

    Object.keys(codes).forEach((code) => {
      areaCodesByCode[String(code).trim()] = codes[code];
    });

    dataLoaded = true;
    document.getElementById("searchBtn").disabled = false;
  })
  .catch((err) => {
    console.error(err);
    document.getElementById("info-city").textContent = "Error loading data";
  });

function searchArea() {
  if (!dataLoaded) {
    alert("Map still loading. Try again in a second.");
    return;
  }

  const inputEl = document.getElementById("areaSearch");
  const input = inputEl.value.trim();

  if (!input) {
    alert("Enter an area code.");
    return;
  }

  selectArea(input);
  inputEl.value = "";
}

document.getElementById("searchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  searchArea();
});

