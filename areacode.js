window.addEventListener("DOMContentLoaded", () => {
  const DATA_FILE = "area_code_data.json";
  const STATES_FILE = "us_states.geojson";
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
    Eastern: "#20c7d8",
    Central: "#e6c35a",
    Mountain: "#f48a7a",
    Pacific: "#11b5d9",
    Alaska: "#b58ad6",
    Hawaii: "#ff6fb7",
    Atlantic: "#ff9f43"
  };

  const tzidToLabel = {
    "America/New_York": "Eastern",
    "America/Detroit": "Eastern",
    "America/Kentucky/Louisville": "Eastern",
    "America/Kentucky/Monticello": "Eastern",
    "America/Indiana/Indianapolis": "Eastern",
    "America/Indiana/Vincennes": "Eastern",
    "America/Indiana/Winamac": "Eastern",
    "America/Indiana/Marengo": "Eastern",
    "America/Indiana/Petersburg": "Eastern",
    "America/Indiana/Vevay": "Eastern",
    "America/Toronto": "Eastern",
    "America/Montreal": "Eastern",
    "America/Nassau": "Eastern",

    "America/Chicago": "Central",
    "America/Winnipeg": "Central",
    "America/Mexico_City": "Central",
    "America/Matamoros": "Central",
    "America/Monterrey": "Central",

    "America/Denver": "Mountain",
    "America/Edmonton": "Mountain",
    "America/Phoenix": "Mountain",
    "America/Chihuahua": "Mountain",

    "America/Los_Angeles": "Pacific",
    "America/Vancouver": "Pacific",
    "America/Tijuana": "Pacific",

    "America/Anchorage": "Alaska",
    "America/Juneau": "Alaska",
    "America/Nome": "Alaska",
    "America/Sitka": "Alaska",
    "America/Yakutat": "Alaska",

    "Pacific/Honolulu": "Hawaii",

    "America/Halifax": "Atlantic",
    "America/Glace_Bay": "Atlantic",
    "America/Moncton": "Atlantic",
    "America/Barbados": "Atlantic",
    "America/Puerto_Rico": "Atlantic"
  };

  const utcToLabel = {
    "UTC-04:00": "Atlantic",
    "UTC-05:00": "Eastern",
    "UTC-06:00": "Central",
    "UTC-07:00": "Mountain",
    "UTC-08:00": "Pacific",
    "UTC-09:00": "Alaska",
    "UTC-10:00": "Hawaii"
  };

  let map = null;
  let mapReady = false;
  let dataLoaded = false;
  let currentTimezoneId = null;
  let clockInterval = null;
  let areaCodesByCode = {};
  let currentMarker = null;

  function getTimezoneColor(label) {
    return timezoneColors[label] || "#7f8c8d";
  }

  function getTimezoneLabelFromTzid(tzid) {
    return tzidToLabel[tzid] || null;
  }

  function getTimezoneLabelFromFeature(feature) {
    const props = feature.properties || {};
    const tzName = props.tz_name1st || null;
    const utc = props.time_zone || props.utc_format || null;

    return getTimezoneLabelFromTzid(tzName) || utcToLabel[utc] || null;
  }

  function getBusinessHoursStatus(tzid) {
    if (!tzid) return "-";

    try {
      const hourString = new Date().toLocaleString("en-US", {
        timeZone: tzid,
        hour: "numeric",
        hour12: false
      });

      const hour = parseInt(hourString, 10);
      return hour >= 8 && hour < 17 ? "Open Now" : "Closed";
    } catch (err) {
      console.error("Business hours error:", err);
      return "-";
    }
  }

  function startClock(tzid) {
    if (clockInterval) clearInterval(clockInterval);
    currentTimezoneId = tzid;

    function updateClock() {
      if (!currentTimezoneId) {
        clockEl.textContent = "--:--:--";
        return;
      }

      try {
        clockEl.textContent = new Date().toLocaleTimeString("en-US", {
          timeZone: currentTimezoneId,
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true
        });
      } catch (err) {
        console.error("Clock update error:", err);
        clockEl.textContent = "--:--:--";
      }
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
    currentTimezoneId = null;

    if (clockInterval) {
      clearInterval(clockInterval);
      clockInterval = null;
    }
  }

  function updateInfo(code, data) {
    if (!data) {
      clearInfo();
      return;
    }

    infoAreaCode.textContent = code || "-";
    infoCity.textContent = data.city || "-";
    infoState.textContent = data.state || "-";
    infoTimezone.textContent = data.timezone || getTimezoneLabelFromTzid(data.tzid) || "-";
    infoHours.textContent = getBusinessHoursStatus(data.tzid || null);
    startClock(data.tzid || null);
  }

  function clearMarker() {
    if (currentMarker) {
      currentMarker.remove();
      currentMarker = null;
    }
  }

  function addMarker(lat, lng) {
    clearMarker();

    currentMarker = new maptilersdk.Marker({
      color: "#2563eb"
    })
      .setLngLat([lng, lat])
      .addTo(map);
  }

  function flyToCoordinates(lat, lng) {
    if (!mapReady || !Number.isFinite(lat) || !Number.isFinite(lng)) return false;

    map.flyTo({
      center: [lng, lat],
      zoom: 4,
      duration: 1200
    });

    addMarker(lat, lng);
    return true;
  }

  function selectArea(code) {
    const cleanCode = String(code).trim();
    const item = areaCodesByCode[cleanCode];

    if (!item) {
      alert(`Area code ${cleanCode} not found.`);
      clearInfo();
      clearMarker();
      return;
    }

    updateInfo(cleanCode, item);

    const lat = Number(item.lat);
    const lng = Number(item.lng);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      flyToCoordinates(lat, lng);
    } else {
      clearMarker();
    }

    inputEl.value = cleanCode;
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

  function isWaterOnlyTimezoneFeature(feature) {
    const props = feature?.properties || {};

    const text = [
      props.name,
      props.NAME,
      props.Name,
      props.places,
      props.dst_places,
      props.description,
      props.admin,
      props.region
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (!text) return false;

    const waterWords = /\b(ocean|sea|gulf|bay|strait|channel|waters)\b/;
    const landWords = /\b(island|islands|state|province|territory|county|city|municipality|parish|district|country)\b/;

    return waterWords.test(text) && !landWords.test(text);
  }

  function addTimezonesLayer(data) {
    if (!map) return;

    if (!data || data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
      throw new Error("us_states.geojson is not a valid GeoJSON FeatureCollection");
    }

    if (map.getLayer("land-mask-fill")) map.removeLayer("land-mask-fill");
    if (map.getSource("land-mask")) map.removeSource("land-mask");

    if (map.getLayer("timezones-outline")) map.removeLayer("timezones-outline");
    if (map.getLayer("timezones-fill")) map.removeLayer("timezones-fill");
    if (map.getSource("timezones")) map.removeSource("timezones");

    const filteredFeatures = data.features
      .filter((feature) => !isWaterOnlyTimezoneFeature(feature))
      .map((feature, index) => {
        const tzLabel = getTimezoneLabelFromFeature(feature);
        if (!tzLabel) return null;

        return {
          ...feature,
          id: feature.id ?? index,
          properties: {
            ...(feature.properties || {}),
            __tz_label: tzLabel
          }
        };
      })
      .filter(Boolean);

    const normalized = {
      type: "FeatureCollection",
      features: filteredFeatures
    };

    map.addSource("timezones", {
      type: "geojson",
      data: normalized
    });

    map.addLayer({
      id: "timezones-fill",
      type: "fill",
      source: "timezones",
      paint: {
        "fill-color": [
          "match",
          ["get", "__tz_label"],
          "Eastern", getTimezoneColor("Eastern"),
          "Central", getTimezoneColor("Central"),
          "Mountain", getTimezoneColor("Mountain"),
          "Pacific", getTimezoneColor("Pacific"),
          "Alaska", getTimezoneColor("Alaska"),
          "Hawaii", getTimezoneColor("Hawaii"),
          "Atlantic", getTimezoneColor("Atlantic"),
          "#7f8c8d"
        ],
        "fill-opacity": 0.45
      }
    });

    console.log("Timezone fill layer added successfully");
  }

  async function loadStatesData() {
    try {
      const res = await fetch(STATES_FILE);
      if (!res.ok) {
        throw new Error(`Failed to load ${STATES_FILE}: ${res.status}`);
      }

      const data = await res.json();
      addTimezonesLayer(data);
    } catch (err) {
      console.error("States load error:", err);
    }
  }

  async function loadAreaCodeData() {
    try {
      const res = await fetch(DATA_FILE);
      if (!res.ok) {
        throw new Error(`Failed to load ${DATA_FILE}: ${res.status}`);
      }

      const data = await res.json();
      const codes = data.area_codes || data;

      Object.keys(codes).forEach((code) => {
        areaCodesByCode[String(code).trim()] = codes[code];
      });

      dataLoaded = true;
      console.log("Loaded area codes:", Object.keys(areaCodesByCode).length);

      if (mapReady) {
        await loadStatesData();
      }
    } catch (err) {
      console.error("Area code data load error:", err);
    }
  }

  try {
    map = new maptilersdk.Map({
      container: "map",
      style: maptilersdk.MapStyle.STREETS,
      projection: "mercator",
      center: [-98.5795, 39.8283],
      zoom: 3
    });

    map.addControl(new maptilersdk.NavigationControl(), "top-left");

    map.on("load", async () => {
      mapReady = true;
      console.log("Map loaded successfully");

      if (dataLoaded) {
        await loadStatesData();
      }
    });

    map.on("error", (err) => {
      console.error("Map error:", err);
    });
  } catch (err) {
    console.error("Map initialization failed:", err);
    return;
  }

  loadAreaCodeData();
  clearInfo();

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    searchArea();
  });

  buttonEl.addEventListener("click", (e) => {
    e.preventDefault();
    searchArea();
  });
});
