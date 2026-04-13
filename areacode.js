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

  const WATER_MASK_COLOR = "#d7e9f4";

const WORLD_RING = [
  [-180, -90],
  [180, -90],
  [180, 90],
  [-180, 90],
  [-180, -90]
];

const MAINLAND_RING = [
  [-168.0, 71.5], [-162.0, 70.0], [-156.0, 68.0], [-150.0, 65.0], [-146.0, 61.0],
  [-140.0, 59.0], [-136.0, 57.5], [-132.0, 55.0], [-128.0, 52.0], [-125.0, 49.0],
  [-124.0, 46.0], [-124.0, 43.0], [-123.0, 40.5], [-121.0, 38.0], [-118.0, 34.5],
  [-117.0, 32.5], [-115.5, 31.5], [-114.0, 30.0], [-112.0, 28.5], [-111.0, 27.0],
  [-109.0, 25.0], [-107.0, 23.0], [-105.0, 21.5], [-103.0, 20.5], [-101.0, 19.7],
  [-99.0, 19.0], [-97.0, 18.5], [-95.0, 18.0], [-93.0, 18.3], [-91.0, 18.8],
  [-89.5, 21.0], [-87.5, 21.6], [-89.0, 22.3], [-91.0, 22.0], [-93.5, 21.0],
  [-95.5, 19.0], [-96.5, 21.5], [-97.5, 24.0], [-97.5, 26.0], [-96.5, 27.5],
  [-95.0, 28.8], [-93.0, 29.5], [-90.0, 29.0], [-88.0, 30.2], [-86.5, 30.5],
  [-85.0, 29.8], [-83.0, 29.2], [-82.0, 27.5], [-80.8, 25.5], [-80.1, 26.8],
  [-80.0, 28.5], [-79.5, 30.5], [-79.0, 32.5], [-78.0, 34.5], [-77.0, 36.8],
  [-76.0, 39.2], [-75.0, 41.0], [-73.5, 42.5], [-71.0, 44.5], [-68.5, 46.5],
  [-66.0, 47.0], [-63.0, 46.0], [-60.0, 47.5], [-58.5, 50.0], [-57.0, 53.0],
  [-59.0, 55.5], [-63.0, 58.0], [-69.0, 60.0], [-76.0, 61.5], [-84.0, 63.0],
  [-92.0, 64.0], [-101.0, 66.0], [-111.0, 68.0], [-121.0, 70.0], [-133.0, 71.5],
  [-145.0, 73.0], [-156.0, 74.0], [-164.0, 73.5], [-168.0, 71.5]
];

const GREENLAND_RING = [
  [-74.0, 83.0], [-61.0, 83.0], [-45.0, 80.5], [-35.0, 76.0], [-24.0, 70.0],
  [-22.0, 65.0], [-30.0, 60.0], [-43.0, 60.0], [-52.0, 62.0], [-60.0, 66.0],
  [-64.0, 72.0], [-70.0, 78.0], [-74.0, 83.0]
];

const CUBA_RING = [
  [-85.2, 23.4], [-83.8, 23.5], [-81.0, 23.3], [-79.2, 22.7], [-77.2, 21.8],
  [-74.5, 20.2], [-75.1, 19.8], [-77.5, 20.3], [-79.8, 20.7], [-82.0, 21.3],
  [-84.5, 22.1], [-85.2, 23.4]
];

const HISPANIOLA_RING = [
  [-74.7, 19.9], [-72.2, 20.2], [-70.0, 19.9], [-68.3, 19.0], [-68.4, 18.2],
  [-70.5, 18.0], [-72.6, 18.1], [-74.3, 18.7], [-74.7, 19.9]
];

const JAMAICA_RING = [
  [-78.5, 18.6], [-76.1, 18.6], [-76.0, 17.7], [-78.3, 17.7], [-78.5, 18.6]
];

const PUERTO_RICO_RING = [
  [-67.4, 18.6], [-65.2, 18.6], [-65.2, 17.8], [-67.4, 17.8], [-67.4, 18.6]
];

const BAHAMAS_RING = [
  [-79.8, 27.2], [-77.0, 27.5], [-74.0, 26.8], [-73.0, 24.0], [-74.5, 23.0],
  [-77.5, 23.5], [-79.5, 25.0], [-79.8, 27.2]
];

const CAYMAN_RING = [
  [-81.6, 19.5], [-79.8, 19.5], [-79.8, 18.0], [-81.6, 18.0], [-81.6, 19.5]
];

const BVI_RING = [
  [-64.9, 18.9], [-64.2, 18.9], [-64.2, 18.2], [-64.9, 18.2], [-64.9, 18.9]
];

const VIRGIN_ISLANDS_RING = [
  [-65.4, 18.6], [-64.4, 18.6], [-64.4, 18.0], [-65.4, 18.0], [-65.4, 18.6]
];

const ANTIGUA_RING = [
  [-62.0, 17.4], [-61.6, 17.4], [-61.6, 16.9], [-62.0, 16.9], [-62.0, 17.4]
];

const BARBADOS_RING = [
  [-59.8, 13.4], [-59.4, 13.4], [-59.4, 13.0], [-59.8, 13.0], [-59.8, 13.4]
];

const GRENADA_RING = [
  [-62.0, 12.2], [-61.5, 12.2], [-61.5, 11.9], [-62.0, 11.9], [-62.0, 12.2]
];

const BERMUDA_RING = [
  [-64.95, 32.45], [-64.55, 32.45], [-64.55, 32.15], [-64.95, 32.15], [-64.95, 32.45]
];

const HUDSON_BAY_RING = [
  [-95.0, 63.0], [-84.0, 64.0], [-78.0, 60.0], [-78.0, 53.0], [-82.0, 51.0],
  [-88.0, 51.0], [-93.0, 54.0], [-96.0, 58.0], [-95.0, 63.0]
];

const LAKE_SUPERIOR_RING = [
  [-92.2, 48.2], [-90.5, 48.6], [-88.0, 48.8], [-86.5, 47.8],
  [-87.8, 46.5], [-90.0, 46.4], [-92.0, 47.0], [-92.2, 48.2]
];

const LAKE_MICHIGAN_RING = [
  [-88.4, 45.9], [-87.0, 46.0], [-86.0, 44.8], [-86.1, 42.0],
  [-87.0, 41.6], [-87.8, 42.6], [-87.9, 44.5], [-88.4, 45.9]
];

const LAKE_HURON_RING = [
  [-84.8, 46.4], [-82.2, 46.4], [-81.2, 45.0], [-82.0, 43.3],
  [-84.0, 43.2], [-84.8, 44.8], [-84.8, 46.4]
];

const LAKE_ERIE_RING = [
  [-83.5, 42.2], [-78.7, 42.2], [-79.0, 41.4], [-82.8, 41.3], [-83.5, 42.2]
];

const LAKE_ONTARIO_RING = [
  [-79.9, 44.2], [-76.8, 44.2], [-76.6, 43.3], [-79.6, 43.3], [-79.9, 44.2]
];

function getLandMaskGeoJSON() {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            WORLD_RING,
            MAINLAND_RING,
            GREENLAND_RING,
            CUBA_RING,
            HISPANIOLA_RING,
            JAMAICA_RING,
            PUERTO_RICO_RING,
            BAHAMAS_RING,
            CAYMAN_RING,
            BVI_RING,
            VIRGIN_ISLANDS_RING,
            ANTIGUA_RING,
            BARBADOS_RING,
            GRENADA_RING,
            BERMUDA_RING
          ]
        }
      },
      { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [HUDSON_BAY_RING] } },
      { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [LAKE_SUPERIOR_RING] } },
      { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [LAKE_MICHIGAN_RING] } },
      { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [LAKE_HURON_RING] } },
      { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [LAKE_ERIE_RING] } },
      { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [LAKE_ONTARIO_RING] } }
    ]
  };
}

function addTimezonesLayer(data) {
  if (!map) return;

  if (!data || data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
    throw new Error("us_states.geojson is not a valid GeoJSON FeatureCollection");
  }

  const labelLayerId = map
    .getStyle()
    .layers.find((layer) => layer.type === "symbol")?.id;

  const filteredFeatures = data.features
    .filter((feature) => {
      const props = feature.properties || {};
      const places = `${props.places || ""} ${props.dst_places || ""}`;
      const isOceanOnly = /\b(ocean|sea|gulf)\b/i.test(places) && !props.tz_name1st;
      return !isOceanOnly;
    })
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

  if (map.getLayer("land-mask-fill")) map.removeLayer("land-mask-fill");
  if (map.getSource("land-mask")) map.removeSource("land-mask");

  if (map.getLayer("timezones-outline")) map.removeLayer("timezones-outline");
  if (map.getLayer("timezones-fill")) map.removeLayer("timezones-fill");
  if (map.getSource("timezones")) map.removeSource("timezones");

  map.addSource("timezones", {
    type: "geojson",
    data: normalized
  });

  map.addLayer(
    {
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
    },
    labelLayerId
  );

  map.addSource("land-mask", {
    type: "geojson",
    data: getLandMaskGeoJSON()
  });

  map.addLayer(
    {
      id: "land-mask-fill",
      type: "fill",
      source: "land-mask",
      paint: {
        "fill-color": WATER_MASK_COLOR,
        "fill-opacity": 1
      }
    },
    labelLayerId
  );

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
