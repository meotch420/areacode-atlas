const DATA_FILE = "area_code_data.json"; // change if your file is in /data/

const northAmericaBounds = L.latLngBounds(
  [5, -170],
  [85, -20]
);

const map = L.map("map", {
  maxBounds: northAmericaBounds,
  maxBoundsViscosity: 1.0,
  minZoom: 3
}).setView([45, -100], 4);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
  noWrap: true
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

// ---------- CLOCK ----------
function startClock(tzid) {
  const clockEl = document.getElementById("clock");

  if (clockInterval) clearInterval(clockInterval);

  currentTimezoneId = tzid;

  function updateClock() {
    if (!currentTimezoneId) {
      clockEl.innerHTML = "";
      return;
    }

    const time = new Date().toLocaleTimeString("en-US", {
      timeZone: currentTimezoneId,
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });

    clockEl.innerHTML = `Local Time: ${time}`;
  }

  updateClock();
  clockInterval = setInterval(updateClock, 1000);
}

// ---------- INFO PANEL ----------
function updateInfo(code, data) {
  const info = document.getElementById("info");

  if (!data) {
    info.innerHTML = "Click a region or search an area code.";
    document.getElementById("clock").innerHTML = "";
    return;
  }

  info.innerHTML = `
    <strong>Area Code:</strong> ${code}<br>
    <strong>City:</strong> ${data.city}<br>
    <strong>State:</strong> ${data.state}<br>
    <strong>Timezone:</strong> ${data.timezone}
  `;

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
    document.getElementById("info").innerHTML =
      "<strong>Error loading data file.</strong>";
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

