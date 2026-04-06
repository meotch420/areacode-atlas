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

  const stateNameToAbbr = {
    Alabama: "AL",
    Alaska: "AK",
    Arizona: "AZ",
    Arkansas: "AR",
    California: "CA",
    Colorado: "CO",
    Connecticut: "CT",
    Delaware: "DE",
    Florida: "FL",
    Georgia: "GA",
    Hawaii: "HI",
    Idaho: "ID",
    Illinois: "IL",
    Indiana: "IN",
    Iowa: "IA",
    Kansas: "KS",
    Kentucky: "KY",
    Louisiana: "LA",
    Maine: "ME",
    Maryland: "MD",
    Massachusetts: "MA",
    Michigan: "MI",
    Minnesota: "MN",
    Mississippi: "MS",
    Missouri: "MO",
    Montana: "MT",
    Nebraska: "NE",
    Nevada: "NV",
    "New Hampshire": "NH",
    "New Jersey": "NJ",
    "New Mexico": "NM",
    "New York": "NY",
    "North Carolina": "NC",
    "North Dakota": "ND",
    Ohio: "OH",
    Oklahoma: "OK",
    Oregon: "OR",
    Pennsylvania: "PA",
    "Rhode Island": "RI",
    "South Carolina": "SC",
    "South Dakota": "SD",
    Tennessee: "TN",
    Texas: "TX",
    Utah: "UT",
    Vermont: "VT",
    Virginia: "VA",
    Washington: "WA",
    "West Virginia": "WV",
    Wisconsin: "WI",
    Wyoming: "WY",
    "District of Columbia": "DC",
    "Puerto Rico": "PR"
  };

  const timezoneColors = {
    Eastern: "#20c7d8",
    Central: "#e6c35a",
    Mountain: "#f48a7a",
    Pacific: "#11b5d9",
    Alaska: "#b58ad6",
    Hawaii: "#ff6fb7",
    Atlantic: "#ff9f43"
  };

  let map = null;
  let mapReady = false;
  let dataLoaded = false;
  let statesLoaded = false;
  let clockInterval = null;
  let currentTimezoneId = null;
  let areaCodesByCode = {};
  let stateTimezoneMap = {};
  let selectedFeatureState = null;
  let currentMarker = null;

  function getTimezoneColor(tz) {
    return timezoneColors[tz] || "#7f8c8d";
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
    infoTimezone.textContent = data.timezone || "-";
    infoHours.textContent = getBusinessHoursStatus(data.tzid || null);
    startClock(data.tzid || null);
  }

  function getFeatureStateAbbr(feature) {
    const props = feature.properties || {};

    return (
      feature.id ||
      props.abbr ||
      props.STUSPS ||
      props.state_code ||
      props.postal ||
      stateNameToAbbr[props.name] ||
      stateNameToAbbr[props.NAME] ||
      null
    );
  }

  function buildStateTimezoneMap() {
    stateTimezoneMap = {};

    Object.keys(areaCodesByCode).forEach((code) => {
      const item = areaCodesByCode[code];
      if (item && item.state && item.timezone && !stateTimezoneMap[item.state]) {
        stateTimezoneMap[item.state] = item.timezone;
      }
    });
  }

  function setFeatureState(featureId, selected) {
    if (!map || !map.getSource("states")) return;

    map.setFeatureState(
      { source: "states", id: featureId },
      { selected: selected }
    );
  }

  function clearMapSelection() {
    if (selectedFeatureState !== null) {
      setFeatureState(selectedFeatureState, false);
      selectedFeatureState = null;
    }
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

  function zoomToFeature(feature) {
    const bounds = new maptilersdk.LngLatBounds();

    function addCoords(coords) {
      coords.forEach((coord) => bounds.extend(coord));
    }

    if (feature.geometry.type === "Polygon") {
      feature.geometry.coordinates.forEach(addCoords);
    } else if (feature.geometry.type === "MultiPolygon") {
      feature.geometry.coordinates.forEach((polygon) => {
        polygon.forEach(addCoords);
      });
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, {
        padding: 40,
        duration: 1200
      });
      return true;
    }

    return false;
  }

  function selectStateByAbbr(stateAbbr) {
    if (!mapReady || !statesLoaded || !stateAbbr) return false;

    const source = map.getSource("states");
    if (!source || !source._data || !Array.isArray(source._data.features)) {
      return false;
    }

    const feature = source._data.features.find(
      (f) => getFeatureStateAbbr(f) === stateAbbr
    );

    if (!feature) return false;

    clearMapSelection();

    if (feature.id !== undefined && feature.id !== null) {
      selectedFeatureState = feature.id;
      setFeatureState(feature.id, true);
    }

    return zoomToFeature(feature);
  }

  function flyToCoordinates(lat, lng) {
    if (!mapReady || !Number.isFinite(lat) || !Number.isFinite(lng)) return false;

    map.flyTo({
      center: [lng, lat],
      zoom: 5,
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
      clearMapSelection();
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

    selectStateByAbbr(item.state);

    // keep the typed number in the box
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

  function addStatesLayer(data) {
    if (!map) return;

    if (!data || data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
      throw new Error("us_states.geojson is not a valid GeoJSON FeatureCollection");
    }

    const normalized = {
      ...data,
      features: data.features.map((feature, index) => {
        const stateAbbr =
          feature.id ||
          feature.properties?.abbr ||
          feature.properties?.STUSPS ||
          feature.properties?.postal ||
          stateNameToAbbr[feature.properties?.name] ||
          stateNameToAbbr[feature.properties?.NAME] ||
          null;

        return {
          ...feature,
          id: feature.id ?? index,
          properties: {
            ...(feature.properties || {}),
            __abbr: stateAbbr,
            __tz: stateTimezoneMap[stateAbbr] || null
          }
        };
      })
    };

    if (map.getLayer("states-outline")) map.removeLayer("states-outline");
    if (map.getLayer("states-fill")) map.removeLayer("states-fill");
    if (map.getSource("states")) map.removeSource("states");

    map.addSource("states", {
      type: "geojson",
      data: normalized
    });

    map.addLayer({
      id: "states-fill",
      type: "fill",
      source: "states",
      paint: {
        "fill-color": [
          "match",
          ["get", "__name"],
          "Eastern", getTimezoneColor("Eastern"),
          "Central", getTimezoneColor("Central"),
          "Mountain", getTimezoneColor("Mountain"),
          "Pacific", getTimezoneColor("Pacific"),
          "Alaska", getTimezoneColor("Alaska"),
          "Hawaii", getTimezoneColor("Hawaii"),
          "Atlantic", getTimezoneColor("Atlantic"),
          "#7f8c8d"
        ],
        "fill-opacity": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          0.75,
          0.35
        ]
      }
    });

    map.addLayer({
      id: "states-outline",
      type: "line",
      source: "states",
      paint: {
        "line-color": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          "#ffffff",
          "#475569"
        ],
        "line-width": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          3,
          1.2
        ]
      }
    });

    statesLoaded = true;
    console.log("States layer added successfully");
  }

  async function loadStatesData() {
    try {
      const res = await fetch(STATES_FILE);
      if (!res.ok) {
        throw new Error(`Failed to load ${STATES_FILE}: ${res.status}`);
      }

      const data = await res.json();
      addStatesLayer(data);
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

      buildStateTimezoneMap();
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
