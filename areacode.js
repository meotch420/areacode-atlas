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
  let currentMarker = null;
  let clockInterval = null;
  let currentTimezoneId = null;
  let areaCodesByCode = {};

  map.on("load", () => {
    mapReady = true;
    console.log("✅ map loaded");
  });

  map.on("error", (e) => {
    console.error("Map error:", e);
  });

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

  function clearMapSelection() {
    if (currentPopup) {
      currentPopup.remove();
      currentPopup = null;
    }

    if (currentMarker) {
      currentMarker.remove();
      currentMarker = null;
    }
  }

  function showAreaLocation(code, item) {
    clearMapSelection();

    const lat = Number(item.lat);
    const lng = Number(item.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error(`Invalid coordinates: lat=${item.lat}, lng=${item.lng}`);
    }

    map.flyTo({
      center: [lng, lat],
      zoom: 5,
      duration: 2000
    });

    currentPopup = new maptilersdk.Popup({
      closeButton: false,
      closeOnClick: true
    })
      .setLngLat([lng, lat])
      .setHTML(`
        <div style="font-weight:700;font-size:16px;">${code}</div>
        <div>${item.city || "-"}, ${item.state || "-"}</div>
        <div>${item.timezone || "-"}</div>
      `);

    currentMarker = new maptilersdk.Marker()
      .setLngLat([lng, lat])
      .setPopup(currentPopup)
      .addTo(map);

    currentPopup.addTo(map);
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
      showAreaLocation(cleanCode, item);
    } catch (err) {
      console.error("showAreaLocation error:", err);
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
