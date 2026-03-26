window.addEventListener("DOMContentLoaded", () => {
  const DATA_FILE = "area_code_data.json";
  const MAPTILER_KEY = "TRZg1QKiYa41B03OE9Bz";

  maptilersdk.config.apiKey = MAPTILER_KEY;

  const map = new maptilersdk.Map({
    container: "map",
    style: maptilersdk.MapStyle.STREETS,
    projection: "globe",
    zoom: 1.6,
    center: [-98.5795, 39.8283],
    pitch: 0,
    bearing: 0,
    antialias: true,
    hash: false
  });

  map.addControl(new maptilersdk.NavigationControl(), "top-left");
  map.addControl(new maptilersdk.ProjectionControl(), "top-left");

  const formEl = document.getElementById("searchForm");
  const inputEl = document.getElementById("areaSearch");
  const buttonEl = document.getElementById("searchBtn");
  const infoCity = document.getElementById("info-city");
  const infoState = document.getElementById("info-state");
  const infoAreaCode = document.getElementById("info-area-code");
  const infoTimezone = document.getElementById("info-timezone");
  const infoHours = document.getElementById("info-hours");
  const clockEl = document.getElementById("clock");

  let mapReady = false;
  let dataLoaded = false;
  let currentPopup = null;
  let clockInterval = null;
  let currentTimezoneId = null;
  let areaCodesByCode = {};

  const currentPolygonId = "area-highlight-fill";
  const currentPolygonLineId = "area-highlight-line";
  const currentSourceId = "area-highlight-source";

  map.on("load", () => {
    mapReady = true;
    console.log("✅ map loaded");
  });

  map.on("error", (e) => {
    console.error("Map error:", e);
  });

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

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error(`Invalid coordinates: lat=${item.lat}, lng=${item.lng}`);
    }

    const radiusKm = getPolygonRadiusKm(item);
    const points = [];
    const sides = 60;

    for (let i = 0; i <= sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const latOffset = (radiusKm / 111) * Math.sin(angle);
      const lngOffset =
        (radiusKm / (111 * Math.cos((lat * Math.PI) / 180))) * Math.cos(angle);

      points.push([lng + lngOffset, lat + latOffset]);
    }

    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [points]
      },
      properties: {}
    };
  }

  function clearCurrentPolygon() {
    if (map.getLayer(currentPolygonId)) map.removeLayer(currentPolygonId);
    if (map.getLayer(currentPolygonLineId)) map.removeLayer(currentPolygonLineId);
    if (map.getSource(currentSourceId)) map.removeSource(currentSourceId);

    if (currentPopup) {
      currentPopup.remove();
      currentPopup = null;
    }
  }

  function showAreaPolygon(code, item) {
    clearCurrentPolygon();

    const polygonGeoJSON = createAreaPolygon(item);
    const fillColor = getFillColor(item.timezone);

    map.addSource(currentSourceId, {
      type: "geojson",
      data: polygonGeoJSON
    });

    map.addLayer({
      id: currentPolygonId,
      type: "fill",
      source: currentSourceId,
      paint: {
        "fill-color": fillColor,
        "fill-opacity": 0.45
      }
    });

    map.addLayer({
      id: currentPolygonLineId,
      type: "line",
      source: currentSourceId,
      paint: {
        "line-color": "#ffffff",
        "line-width": 2
      }
    });

    const bounds = new maptilersdk.LngLatBounds();
    polygonGeoJSON.geometry.coordinates[0].forEach((coord) => bounds.extend(coord));

    map.fitBounds(bounds, {
      padding: 60,
      maxZoom: 6,
      duration: 1200
    });

    currentPopup = new maptilersdk.Popup({
      closeButton: false,
      closeOnClick: true
    })
      .setLngLat([Number(item.lng), Number(item.lat)])
      .setHTML(`
        <div style="font-weight:700;font-size:16px;">${code}</div>
        <div>${item.city || "-"}, ${item.state || "-"}</div>
        <div>${item.timezone || "-"}</div>
      `)
      .addTo(map);
  }

  function selectArea(code) {
    const cleanCode = String(code).trim();
    const item = areaCodesByCode[cleanCode];

    console.log("searching:", cleanCode);
    console.log("found item:", item);

    if (!item) {
      alert(`Area code ${cleanCode} not found.`);
      updateInfo("-", null);
      return;
    }

    updateInfo(cleanCode, item);

    try {
      showAreaPolygon(cleanCode, item);
    } catch (err) {
      console.error("showAreaPolygon error:", err);
      alert(`Found area code ${cleanCode}, but map display failed. Check console.`);
    }
  }

  fetch(DATA_FILE)
    .then((res) => {
      console.log("data fetch status:", res.status);
      if (!res.ok) {
        throw new Error(`Failed to load ${DATA_FILE}: ${res.status}`);
      }
      return res.json();
    })
    .then((data) => {
      console.log("json loaded:", data);

      const codes = data.area_codes || data;

      Object.keys(codes).forEach((code) => {
        areaCodesByCode[String(code).trim()] = codes[code];
      });

      console.log("loaded codes count:", Object.keys(areaCodesByCode).length);

      dataLoaded = true;
      if (buttonEl) buttonEl.disabled = false;
    })
    .catch((err) => {
      console.error("fetch error:", err);
      infoCity.textContent = "Error loading data";
    });

  function searchArea() {
    console.log("searchArea fired");

    if (!mapReady) {
      alert("Map is still loading. Try again.");
      return;
    }

    if (!dataLoaded) {
      alert("Data is still loading. Try again in a second.");
      return;
    }

    if (!inputEl) {
      alert("Search input not found.");
      return;
    }

    const input = inputEl.value.trim();
    console.log("input:", input);

    if (!input) {
      alert("Enter an area code.");
      return;
    }

    selectArea(input);
    inputEl.value = "";
  }

  if (formEl) {
    formEl.addEventListener("submit", (e) => {
      e.preventDefault();
      searchArea();
    });
  }

  if (buttonEl) {
    buttonEl.addEventListener("click", (e) => {
      e.preventDefault();
      searchArea();
    });
  }
});
