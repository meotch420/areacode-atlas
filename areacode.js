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
  maxZoom: 10
}).setView([20, 0], 2);

L.maptilerLayer({
  apiKey: MAPTILER_KEY,
  style: "streets",
}).addTo(map);

// ---------- STATE ----------
let markers = [];
let markersByCode = {};
let currentMarker = null;
let clockInterval = null;
let currentTimezoneId = null;
let dataLoaded = false;

// ---------- COLORS ----------
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

// ---------- BUSINESS HOURS ----------
function getBusinessHoursStatus(tzid) {
  if (!tzid) return "-";

  const now = new Date();

  const hourString = now.toLocaleString("en-US", {
    timeZone: tzid,
    hour: "numeric",
    hour12: false
  });

  const hour = parseInt(hourString, 10);

  return hour >= 9 && hour < 17 ? "Open" : "Closed";
}

// ---------- CLOCK ----------
function startClock(tzid) {
  const clockEl = document.getElementById("clock");

  if (clockInterval) clearInterval(clockInterval);

  currentTimezoneId = tzid;

  function updateClock() {
    if (!currentTimezoneId) {
      clockEl.textContent = time;
      return;
    }

    const time = new Date().toLocaleTimeString("en-US", {
      timeZone: currentTimezoneId,
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });

    clockEl.innerHTML = `${time}`;
  }

  updateClock();
  clockInterval = setInterval(updateClock, 1000);
}

// ---------- INFO PANEL ----------
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
    clockEl.innerHTML = "";
    return;
  }

  infoCity.textContent = data.city || "-";
  infoState.textContent = data.state || "-";
  infoAreaCode.textContent = code || "-";
  infoTimezone.textContent = data.timezone || "-";
  infoHours.textContent = getBusinessHoursStatus(data.tzid);

  startClock(data.tzid);
}

// ---------- HIGHLIGHT ----------
function highlightMarker(marker) {
  if (currentMarker) {
    currentMarker.setStyle({ radius: 8, weight: 1, color: "#000" });
  }

  marker.setStyle({
    radius: 12,
    weight: 3,
    color: "#ffffff"
  });

  currentMarker = marker;
}

// ---------- LOAD DATA ----------
fetch(DATA_FILE)
  .then(res => {
    if (!res.ok) {
      throw new Error(`Failed to load ${DATA_FILE}: ${res.status}`);
    }
    return res.json();
  })
  .then(data => {
    const codes = data.area_codes;

    Object.keys(codes).forEach(code => {
      const item = codes[code];

      const marker = L.circleMarker([item.lat, item.lng], {
        radius: 8,
        fillColor: getFillColor(item.timezone),
        color: "#000",
        weight: 1,
        fillOpacity: 0.8
      }).addTo(map);

      marker.bindPopup(`
        <strong>${code}</strong><br>
        ${item.city}, ${item.state}<br>
        ${item.timezone}
      `);

      marker.on("click", () => {
        highlightMarker(marker);
        updateInfo(code, item);
        marker.openPopup();
        map.setView([item.lat, item.lng], 6);
      });

      markers.push(marker);
      markersByCode[String(code).trim()] = { marker, data: item };
    });

    dataLoaded = true;
    console.log("Loaded codes:", Object.keys(markersByCode).slice(0, 20));

    document.getElementById("searchBtn").disabled = false;
  })
  .catch(err => {
    console.error(err);
    const infoCity = document.getElementById("info-city");
    const infoState = document.getElementById("info-state");
    const infoAreaCode = document.getElementById("info-area-code");
    const infoTimezone = document.getElementById("info-timezone");
    const infoHours = document.getElementById("info-hours");

    infoCity.textContent = "Error loading data";
    infoState.textContent = "-";
    infoAreaCode.textContent = "-";
    infoTimezone.textContent = "-";
    infoHours.textContent = "-";
  });

// ---------- SEARCH ----------
function searchArea() {
  if (!dataLoaded) {
    alert("Map still loading. Try again in a second.");
    return;
  }

  const input = document.getElementById("areaSearch").value.trim();

  if (!input) {
    alert("Enter an area code.");
    return;
  }

  const result = markersByCode[input];

  if (!result) {
    alert(`Area code ${input} not found.`);
    return;
  }

  const { marker, data } = result;

  highlightMarker(marker);
  updateInfo(input, data);
  marker.openPopup();
  map.setView([data.lat, data.lng], 6);
}

// ---------- FORM ----------
document.getElementById("searchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  searchArea();
});
