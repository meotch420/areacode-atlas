window.addEventListener("DOMContentLoaded", () => {
  const DATA_FILE = "area_code_data.json";
  const STATES_FILE = "us_states.geojson";
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

  const infoCity = getEl("info-city");
  const infoState = getEl("info-state");
  const infoAreaCode = getEl("info-area-code");
  const infoTimezone = getEl("info-timezone");

  const localTimeEl = getEl("localTime");
  const pacificTimeEl = getEl("pacificTime");
  const mountainTimeEl = getEl("mountainTime");
  const centralTimeEl = getEl("centralTime");
  const easternTimeEl = getEl("easternTime");
  const hawaiiTimeEl = getEl("hawaiiTime");
  const atlanticTimeEl = getEl("atlanticTime");
  const newfoundlandTimeEl = getEl("newfoundlandTime");

  if (!inputEl || !mapEl) return;

  maptilersdk.config.apiKey = MAPTILER_KEY;

  const timezoneColors = {
    Eastern: "#20c7d8",
    Central: "#e6c35a",
    Mountain: "#f48a7a",
    Pacific: "#11b5d9",
    Alaska: "#b58ad6",
    Hawaii: "#ff6fb7",
    Atlantic: "#ff9f43",
    Newfoundland: "#ec4899"
  };

  let map, mapReady = false, dataLoaded = false;
  let areaCodesByCode = {};
  let currentMarker = null;

  function formatTime(tz) {
    return new Date().toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });
  }

  function updateClocks() {
    const now = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });

    setText(localTimeEl, now);
    setText(pacificTimeEl, formatTime("America/Los_Angeles"));
    setText(mountainTimeEl, formatTime("America/Denver"));
    setText(centralTimeEl, formatTime("America/Chicago"));
    setText(easternTimeEl, formatTime("America/New_York"));
    setText(hawaiiTimeEl, formatTime("Pacific/Honolulu"));
    setText(atlanticTimeEl, formatTime("America/Halifax"));
    setText(newfoundlandTimeEl, formatTime("America/St_Johns"));
  }

  function clearInfo() {
    setText(infoAreaCode, "-");
    setText(infoCity, "-");
    setText(infoState, "-");
    setText(infoTimezone, "-");
  }

  function updateInfo(code, data) {
    setText(infoAreaCode, code);
    setText(infoCity, data.city);
    setText(infoState, data.state);
    setText(infoTimezone, data.timezone);
  }

  function clearMarker() {
    if (currentMarker) {
      currentMarker.remove();
      currentMarker = null;
    }
  }

  function addMarker(lat, lng) {
    clearMarker();
    currentMarker = new maptilersdk.Marker()
      .setLngLat([lng, lat])
      .addTo(map);
  }

  function flyToCoordinates(lat, lng) {
    map.flyTo({
      center: [lng, lat],
      zoom: 3.5,
      duration: 1200
    });
    addMarker(lat, lng);
  }

  function selectArea(code) {
    const item = areaCodesByCode[code];
    if (!item) return alert("Area code not found");

    updateInfo(code, item);
    flyToCoordinates(item.lat, item.lng);
    inputEl.value = code;
  }

  function searchArea() {
    const input = inputEl.value.trim();
    if (!input) return alert("Enter area code");
    selectArea(input);
  }

  async function loadAreaCodeData() {
    const res = await fetch(DATA_FILE);
    const data = await res.json();

    Object.keys(data.area_codes).forEach(code => {
      areaCodesByCode[code] = data.area_codes[code];
    });

    dataLoaded = true;
  }

  // 🔥 GLOBE MAP (MAIN FIX)
  map = new maptilersdk.Map({
    container: "map",
    style: maptilersdk.MapStyle.DATAVIZ.DARK,
    projection: "globe",
    center: [-98, 39],
    zoom: 2.1
  });

  map.addControl(new maptilersdk.NavigationControl(), "top-left");

  map.on("load", () => {
    mapReady = true;
    console.log("Globe loaded");
  });

  loadAreaCodeData();
  clearInfo();
  updateClocks();
  setInterval(updateClocks, 1000);

  formEl.addEventListener("submit", e => {
    e.preventDefault();
    searchArea();
  });
});
