window.addEventListener("DOMContentLoaded", () => {
  const DATA_FILE = "area_code_data.json";
  const STATES_FILE = "timezones.geojson";
  const MAPTILER_KEY = "TRZg1QKiYa41B03OE9Bz";

  function getEl(...ids) {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  }

  function setText(el, value) {
    if (el) el.textContent = value;
  }

  const formEl = getEl("searchForm");
  const inputEl = getEl("areaSearch");
  const buttonEl = getEl("searchBtn");
  const mapEl = getEl("map");

  const infoCity = getEl("info-city", "infoCity");
  const infoState = getEl("info-state", "infoState");
  const infoAreaCode = getEl("info-area-code", "infoAreaCode");
  const infoTimezone = getEl("info-timezone", "infoTimezone");

  const liveTimeEl = getEl("clock", "infoTime");

  const localTimeEl = getEl("localTime");
  const pacificTimeEl = getEl("pacificTime");
  const mountainTimeEl = getEl("mountainTime");
  const centralTimeEl = getEl("centralTime");
  const easternTimeEl = getEl("easternTime");
  const alaskaTimeEl = getEl("alaskaTime");
  const hawaiiTimeEl = getEl("hawaiiTime");
  const atlanticTimeEl = getEl("atlanticTime");
  const newfoundlandTimeEl = getEl("newfoundlandTime");

  if (!inputEl || !mapEl) {
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
    Atlantic: "#ff9f43",
    Newfoundland: "#ec4899",
    Chamorro: "#06b6d4",
    Samoa: "#eab308",
    Various: "#64748b"
  };

  const tzidToLabel = {
    "America/New_York": "Eastern",
    "America/Detroit": "Eastern",
    "America/Toronto": "Eastern",
    "America/Montreal": "Eastern",
    "America/Nassau": "Eastern",
    "America/Cayman": "Eastern",

    "America/Chicago": "Central",
    "America/Winnipeg": "Central",
    "America/Mexico_City": "Central",
    "America/Regina": "Central",

    "America/Denver": "Mountain",
    "America/Edmonton": "Mountain",
    "America/Phoenix": "Mountain",
    "America/Boise": "Mountain",

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
    "America/Puerto_Rico": "Atlantic",
    "Atlantic/Bermuda": "Atlantic",

    "America/St_Johns": "Newfoundland",

    "Pacific/Guam": "Chamorro",
    "Pacific/Saipan": "Chamorro",
    "Pacific/Pago_Pago": "Samoa"
  };

  const utcToLabel = {
    "UTC-04:00": "Atlantic",
    "UTC-03:30": "Newfoundland",
    "UTC-05:00": "Eastern",
    "UTC-06:00": "Central",
    "UTC-07:00": "Mountain",
    "UTC-08:00": "Pacific",
    "UTC-09:00": "Alaska",
    "UTC-10:00": "Hawaii",
    "UTC+10:00": "Chamorro",
    "UTC-11:00": "Samoa"
  };

  let map = null;
  let mapReady = false;
  let dataLoaded = false;
  let areaCodesByCode = {};
  let currentMarker = null;

  function formatLocalTime() {
    return new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });
  }

  function formatTimeForZone(timeZone) {
    try {
      return new Date().toLocaleTimeString("en-US", {
        timeZone,
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });
    } catch (err) {
      console.error("Time zone clock error:", err);
      return "--:--:--";
    }
  }

  function updateAllClocks() {
    const localNow = formatLocalTime();

    setText(liveTimeEl, localNow);
    setText(localTimeEl, localNow);

    setText(pacificTimeEl, formatTimeForZone("America/Los_Angeles"));
    setText(mountainTimeEl, formatTimeForZone("America/Denver"));
    setText(centralTimeEl, formatTimeForZone("America/Chicago"));
    setText(easternTimeEl, formatTimeForZone("America/New_York"));
    setText(alaskaTimeEl, formatTimeForZone("America/Anchorage"));
    setText(hawaiiTimeEl, formatTimeForZone("Pacific/Honolulu"));
    setText(atlanticTimeEl, formatTimeForZone("America/Halifax"));
    setText(newfoundlandTimeEl, formatTimeForZone("America/St_Johns"));
  }

  function getTimezoneColor(label) {
    return timezoneColors[label] || "#7f8c8d";
  }

  function getTimezoneLabelFromTzid(tzid) {
    return tzidToLabel[tzid] || null;
  }

  function getTimezoneLabelFromFeature(feature) {
    const props = feature.properties || {};

    const possibleTzids = [
      props.__tz_label,
      props.tz_name1st,
      props.tzid,
      props.timezone,
      props.tz_name,
      props.zone
    ].filter(Boolean);

    for (const tzid of possibleTzids) {
      if (timezoneColors[tzid]) return tzid;
      const mapped = getTimezoneLabelFromTzid(tzid);
      if (mapped) return mapped;
    }

    const possibleUtc = [
      props.time_zone,
      props.utc_format,
      props.utc,
      props.UTC
    ].filter(Boolean);

    for (const utc of possibleUtc) {
      if (utcToLabel[utc]) return utcToLabel[utc];
    }

    return null;
  }

  function clearInfo() {
    setText(infoAreaCode, "-");
    setText(infoCity, "-");
    setText(infoState, "-");
    setText(infoTimezone, "-");
  }

  function updateInfo(code, data) {
    if (!data) {
      clearInfo();
      return;
    }

    setText(infoAreaCode, code || "-");
    setText(infoCity, data.city || "-");
    setText(infoState, data.state || "-");
    setText(infoTimezone, data.timezone || getTimezoneLabelFromTzid(data.tzid) || "-");
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
      zoom: 3.5,
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
          "Newfoundland", getTimezoneColor("Newfoundland"),
          "Chamorro", getTimezoneColor("Chamorro"),
          "Samoa", getTimezoneColor("Samoa"),
          "Various", getTimezoneColor("Various"),
          "#7f8c8d"
        ],
        "fill-opacity": 0.45
      }
    });

    map.addLayer({
      id: "timezones-outline",
      type: "line",
      source: "timezones",
      paint: {
        "line-color": "#0f172a",
        "line-width": 1
      }
    });

    console.log("Timezone layer added successfully");
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
      projection: "globe",
      center: [-98.5795, 39.8283],
      zoom: 2.1,
      pitch: 0,
      bearing: 0
    });

    map.addControl(new maptilersdk.NavigationControl(), "top-left");

    map.on("load", async () => {
      mapReady = true;
      console.log("Globe loaded successfully");

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
  updateAllClocks();
  setInterval(updateAllClocks, 1000);

  if (formEl) {
    formEl.addEventListener("submit", (e) => {
      e.preventDefault();
      searchArea();
    });
  }

  if (!formEl && buttonEl) {
    buttonEl.addEventListener("click", (e) => {
      e.preventDefault();
      searchArea();
    });
  }
});
