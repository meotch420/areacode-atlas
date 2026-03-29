window.addEventListener("DOMContentLoaded", () => {
  const DATA_FILE = "area_code_data.json";
  const MAPTILER_KEY = "TRZg1QKiYa41B03OE9Bz";

  const formEl = document.getElementById("searchForm");
  const inputEl = document.getElementById("areaSearch");
  const buttonEl = document.getElementById("searchBtn");
  const infoCity = document.getElementById("info-city");
  const infoState = document.getElementById("info-state");
  const infoAreaCode = document.getElementById("info-area-code");
  const infoTimezone = document.getElementById("info-timezone");
  const infoHours = document.getElementById("info-hours");
  const clockEl = document.getElementById("clock");

  if (
    !formEl ||
    !inputEl ||
    !buttonEl ||
    !infoCity ||
    !infoState ||
    !infoAreaCode ||
    !infoTimezone ||
    !infoHours ||
    !clockEl
  ) {
    console.error("Missing required HTML elements.");
    return;
  }

  if (!window.maptilersdk) {
    console.error("MapTiler SDK did not load.");
    return;
  }

  maptilersdk.config.apiKey = MAPTILER_KEY;

  const timezoneColors = {
    Eastern: "#3b82f6",
    Central: "#22c55e",
    Mountain: "#f59e0b",
    Pacific: "#ef4444",
    Alaska: "#8b5cf6",
    Hawaii: "#06b6d4"
  };

  let map;
  let currentMarker = null;
  let currentPopup = null;
  let clockInterval = null;
  let currentTimezoneId = null;
  let areaCodesByCode = {};
  let dataLoaded = false;

  try {
    map = new maptilersdk.Map({
      container: "map",
      style: maptilersdk.MapStyle.STREETS,
      projection: "globe",
      center: [-98.5795, 39.8283],
      zoom: 1.6
    });

    map.addControl(new maptilersdk.NavigationControl(), "top-left");
  } catch (err) {
    console.error("Map initialization failed:", err);
    return;
  }

  map.on("load", () => {
    fetch("timezones.geojson")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load timezones.geojson: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("Loaded timezone data:", data);

        if (!data || data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
          throw new Error("timezones.geojson is not a valid GeoJSON FeatureCollection");
        }

        if (map.getSource("timezones")) {
          return;
        }

        map.addSource("timezones", {
          type: "geojson",
          data: data
        });

        map.addLayer({
          id: "timezones-layer",
          type: "fill",
          source: "timezones",
          paint: {
            "fill-color": [
              "match",
              ["get", "name"],
              "Eastern", timezoneColors.Eastern,
              "Central", timezoneColors.Central,
              "Mountain", timezoneColors.Mountain,
              "Pacific", timezoneColors.Pacific,
              "Alaska", timezoneColors.Alaska,
              "Hawaii", timezoneColors.Hawaii,
              "#888"
            ],
            "fill-opacity": 0.35
          }
        });

        map.addLayer({
          id: "timezones-outline",
          type: "line",
          source: "timezones",
          paint: {
            "line-color": "#333",
            "line-width": 1
          }
        });
      })
      .catch((err) => console.error("Timezone load error:", err));
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

      clockEl.textContent = new Date().toLocaleTimeString("en-US", {
        timeZone: currentTimezoneId,
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });
    }

    updateClock();
    clockInterval = setInterval(updateClock, 1000);
  }

  function clearInfo() {
    infoAreaCode.textContent = "-";
    infoCity.textContent = "-";
    infoState.textContent = "-";
    infoTimezone.textContent = "-";
    infoHours.textContent = "-";
    clockEl.textContent = "--:--:--";
  }

  function updateInfo(code, data) {
    if (!data) {
      clearInfo();
      return;
    }

    infoAreaCode.textContent = code || "-";
    infoCity.textContent = data.city || "-";
    infoState.textContent = data.state || "-";
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
    const lat = Number(item.lat);
    const lng = Number(item.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.error(`Invalid coordinates for area code ${code}`);
      return;
    }

    clearMapSelection();

    map.flyTo({
      center: [lng, lat],
      zoom: 10,
      duration: 1.5
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
      .addTo(map);
  }

  function selectArea(code) {
    const cleanCode = String(code).trim();
    const item = areaCodesByCode[cleanCode];

    if (!item) {
      alert(`Area code ${cleanCode} not found.`);
      clearInfo();
      clearMapSelection();
      return;
    }

    updateInfo(cleanCode, item);
    showAreaLocation(cleanCode, item);
  }

  function searchArea() {
    if (!dataLoaded) {
      alert("Data still loading.");
      return;
    }

    const input = inputEl.value.trim();
    if (!input) {
      alert("Enter an area code.");
      return;
    }

    selectArea(input);
  }

  fetch(DATA_FILE)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to load ${DATA_FILE}: ${res.status}`);
      }
      return res.json();
    })
    .then((data) => {
      const codes = data.area_codes || data;

      Object.keys(codes).forEach((code) => {
        areaCodesByCode[String(code).trim()] = codes[code];
      });

      dataLoaded = true;
      console.log("Loaded area codes:", Object.keys(areaCodesByCode).length);
    })
    .catch((err) => {
      console.error("Area code data load error:", err);
    });

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    searchArea();
  });

  buttonEl.addEventListener("click", (e) => {
    e.preventDefault();
    searchArea();
  });
});
