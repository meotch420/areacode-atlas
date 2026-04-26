window.addEventListener("DOMContentLoaded", () => {
  const DATA_FILE = "area_code_data.json";
  const TIMEZONES_FILE = "timezones.geojson";
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
  const infoTimezone = getEl("info-timezone", "infoTimezone");

  const hawaiiTimeEl = getEl("hawaiiTime");
  const alaskaTimeEl = getEl("alaskaTime");
  const pacificTimeEl = getEl("pacificTime");
  const mountainTimeEl = getEl("mountainTime");
  const centralTimeEl = getEl("centralTime");
  const easternTimeEl = getEl("easternTime");
  const atlanticTimeEl = getEl("atlanticTime");
  const newfoundlandTimeEl = getEl("newfoundlandTime");

  const brazilTimeEl = getEl("brazilTime");
  const southGeorgiaTimeEl = getEl("southGeorgiaTime");
  const azoresTimeEl = getEl("azoresTime");
  const utcTimeEl = getEl("utcTime");
  const londonTimeEl = getEl("londonTime");
  const centralEuropeTimeEl = getEl("centralEuropeTime");
  const israelTimeEl = getEl("israelTime");
  const gulfTimeEl = getEl("gulfTime");

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
    Alaska: "#60a5fa",
    Hawaii: "#a78bfa",
    Atlantic: "#d4af37",
    Newfoundland: "#a855f7",

    Brazil: "#22c55e",
    SouthGeorgia: "#14b8a6",
    Azores: "#38bdf8",
    UTC: "#cbd5e1",
    London: "#94a3b8",
    CentralEurope: "#fb923c",
    Israel: "#f97316",
    Gulf: "#e879f9",

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
    "America/Indiana/Indianapolis": "Eastern",
    "America/Indiana/Vincennes": "Eastern",
    "America/Indiana/Winamac": "Eastern",
    "America/Indiana/Marengo": "Eastern",
    "America/Indiana/Petersburg": "Eastern",
    "America/Indiana/Vevay": "Eastern",
    "America/Kentucky/Louisville": "Eastern",
    "America/Kentucky/Monticello": "Eastern",

    "America/Chicago": "Central",
    "America/Winnipeg": "Central",
    "America/Mexico_City": "Central",
    "America/Regina": "Central",
    "America/Indiana/Knox": "Central",
    "America/Indiana/Tell_City": "Central",
    "America/Menominee": "Central",
    "America/North_Dakota/Center": "Central",
    "America/North_Dakota/New_Salem": "Central",
    "America/North_Dakota/Beulah": "Central",

    "America/Denver": "Mountain",
    "America/Edmonton": "Mountain",
    "America/Phoenix": "Mountain",
    "America/Boise": "Mountain",
    "America/Ciudad_Juarez": "Mountain",
    "America/Ojinaga": "Mountain",

    "America/Los_Angeles": "Pacific",
    "America/Vancouver": "Pacific",
    "America/Tijuana": "Pacific",

    "America/Anchorage": "Alaska",
    "America/Juneau": "Alaska",
    "America/Nome": "Alaska",
    "America/Sitka": "Alaska",
    "America/Yakutat": "Alaska",
    "America/Metlakatla": "Alaska",

    "Pacific/Honolulu": "Hawaii",

    "America/Halifax": "Atlantic",
    "America/Glace_Bay": "Atlantic",
    "America/Moncton": "Atlantic",
    "America/Puerto_Rico": "Atlantic",
    "Atlantic/Bermuda": "Atlantic",

    "America/St_Johns": "Newfoundland",

    "America/Sao_Paulo": "Brazil",
    "Atlantic/South_Georgia": "SouthGeorgia",
    "Atlantic/Azores": "Azores",
    "Etc/UTC": "UTC",
    "UTC": "UTC",
    "Europe/London": "London",
    "Europe/Paris": "CentralEurope",
    "Europe/Berlin": "CentralEurope",
    "Europe/Madrid": "CentralEurope",
    "Europe/Rome": "CentralEurope",
    "Europe/Amsterdam": "CentralEurope",
    "Europe/Brussels": "CentralEurope",
    "Europe/Vienna": "CentralEurope",
    "Europe/Warsaw": "CentralEurope",
    "Asia/Jerusalem": "Israel",
    "Asia/Dubai": "Gulf",
    "Asia/Muscat": "Gulf",
    "Asia/Qatar": "Gulf",
    "Asia/Bahrain": "Gulf",
    "Asia/Kuwait": "Gulf",
    "Asia/Riyadh": "Gulf",

    "Pacific/Guam": "Chamorro",
    "Pacific/Saipan": "Chamorro",
    "Pacific/Pago_Pago": "Samoa"
  };

  const utcToLabel = {
    "UTC-11:00": "Samoa",
    "UTC-10:00": "Hawaii",
    "UTC-09:00": "Alaska",
    "UTC-08:00": "Pacific",
    "UTC-07:00": "Mountain",
    "UTC-06:00": "Central",
    "UTC-05:00": "Eastern",
    "UTC-04:00": "Atlantic",
    "UTC-03:30": "Newfoundland",
    "UTC-03:00": "Brazil",
    "UTC-02:00": "SouthGeorgia",
    "UTC-01:00": "Azores",
    "UTC+00:00": "UTC",
    "UTC+01:00": "London",
    "UTC+02:00": "CentralEurope",
    "UTC+03:00": "Israel",
    "UTC+04:00": "Gulf",
    "UTC+10:00": "Chamorro"
  };

  let map = null;
  let mapReady = false;
  let areaDataLoaded = false;
  let areaCodesByCode = {};
  let currentMarker = null;

  function formatTimeForZone(timeZone) {
    try {
      return new Date().toLocaleTimeString("en-US", {
        timeZone: timeZone,
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
    setText(hawaiiTimeEl, formatTimeForZone("Pacific/Honolulu"));
    setText(alaskaTimeEl, formatTimeForZone("America/Anchorage"));
    setText(pacificTimeEl, formatTimeForZone("America/Los_Angeles"));
    setText(mountainTimeEl, formatTimeForZone("America/Denver"));
    setText(centralTimeEl, formatTimeForZone("America/Chicago"));
    setText(easternTimeEl, formatTimeForZone("America/New_York"));
    setText(atlanticTimeEl, formatTimeForZone("America/Halifax"));
    setText(newfoundlandTimeEl, formatTimeForZone("America/St_Johns"));

    setText(brazilTimeEl, formatTimeForZone("America/Sao_Paulo"));
    setText(southGeorgiaTimeEl, formatTimeForZone("Atlantic/South_Georgia"));
    setText(azoresTimeEl, formatTimeForZone("Atlantic/Azores"));
    setText(utcTimeEl, formatTimeForZone("UTC"));
    setText(londonTimeEl, formatTimeForZone("Europe/London"));
    setText(centralEuropeTimeEl, formatTimeForZone("Europe/Paris"));
    setText(israelTimeEl, formatTimeForZone("Asia/Jerusalem"));
    setText(gulfTimeEl, formatTimeForZone("Asia/Dubai"));
  }

  function getTimezoneColor(label) {
    return timezoneColors[label] || timezoneColors.Various;
  }

  function getTimezoneLabelFromTzid(tzid) {
    return tzidToLabel[tzid] || null;
  }

  function getTimezoneLabelFromFeature(feature) {
    const props = feature.properties || {};

    const possibleValues = [
      props.__tz_label,
      props.tz_name1st,
      props.tzid,
      props.TZID,
      props.timezone,
      props.TimeZone,
      props.tz_name,
      props.zone,
      props.Zone,
      props.name,
      props.NAME,
      props.Name
    ]
      .filter(Boolean)
      .map((value) => String(value));

    for (const value of possibleValues) {
      if (timezoneColors[value]) return value;

      const mapped = getTimezoneLabelFromTzid(value);
      if (mapped) return mapped;
    }

    const joined = possibleValues.join(" ").toLowerCase();

    if (joined.includes("st_johns") || joined.includes("newfoundland")) {
      return "Newfoundland";
    }

    if (
      joined.includes("halifax") ||
      joined.includes("glace_bay") ||
      joined.includes("moncton") ||
      joined.includes("puerto_rico") ||
      joined.includes("bermuda") ||
      joined.includes("atlantic")
    ) {
      return "Atlantic";
    }

    if (
      joined.includes("new_york") ||
      joined.includes("detroit") ||
      joined.includes("toronto") ||
      joined.includes("montreal") ||
      joined.includes("nassau") ||
      joined.includes("cayman") ||
      joined.includes("indiana") ||
      joined.includes("kentucky") ||
      joined.includes("eastern")
    ) {
      return "Eastern";
    }

    if (
      joined.includes("chicago") ||
      joined.includes("winnipeg") ||
      joined.includes("mexico_city") ||
      joined.includes("regina") ||
      joined.includes("central")
    ) {
      return "Central";
    }

    if (
      joined.includes("denver") ||
      joined.includes("edmonton") ||
      joined.includes("phoenix") ||
      joined.includes("boise") ||
      joined.includes("mountain")
    ) {
      return "Mountain";
    }

    if (
      joined.includes("los_angeles") ||
      joined.includes("vancouver") ||
      joined.includes("tijuana") ||
      joined.includes("pacific")
    ) {
      return "Pacific";
    }

    if (
      joined.includes("anchorage") ||
      joined.includes("juneau") ||
      joined.includes("nome") ||
      joined.includes("sitka") ||
      joined.includes("yakutat") ||
      joined.includes("alaska")
    ) {
      return "Alaska";
    }

    if (joined.includes("honolulu") || joined.includes("hawaii")) {
      return "Hawaii";
    }

    if (
      joined.includes("sao_paulo") ||
      joined.includes("sao paulo") ||
      joined.includes("brazil")
    ) {
      return "Brazil";
    }

    if (
      joined.includes("south_georgia") ||
      joined.includes("south georgia")
    ) {
      return "SouthGeorgia";
    }

    if (joined.includes("azores")) {
      return "Azores";
    }

    if (
      joined.includes("utc") ||
      joined.includes("greenwich") ||
      joined.includes("gmt")
    ) {
      return "UTC";
    }

    if (joined.includes("london")) {
      return "London";
    }

    if (
      joined.includes("paris") ||
      joined.includes("berlin") ||
      joined.includes("madrid") ||
      joined.includes("rome") ||
      joined.includes("amsterdam") ||
      joined.includes("brussels") ||
      joined.includes("vienna") ||
      joined.includes("warsaw") ||
      joined.includes("central europe")
    ) {
      return "CentralEurope";
    }

    if (
      joined.includes("jerusalem") ||
      joined.includes("israel")
    ) {
      return "Israel";
    }

    if (
      joined.includes("dubai") ||
      joined.includes("muscat") ||
      joined.includes("qatar") ||
      joined.includes("bahrain") ||
      joined.includes("kuwait") ||
      joined.includes("riyadh") ||
      joined.includes("gulf")
    ) {
      return "Gulf";
    }

    if (
      joined.includes("guam") ||
      joined.includes("saipan") ||
      joined.includes("chamorro")
    ) {
      return "Chamorro";
    }

    if (joined.includes("pago_pago") || joined.includes("samoa")) {
      return "Samoa";
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

    return "Various";
  }

  function clearInfo() {
    setText(infoCity, "-");
    setText(infoState, "-");
    setText(infoTimezone, "-");
  }

  function updateAreaInfo(data) {
    if (!data) {
      clearInfo();
      return;
    }

    setText(infoCity, data.city || "-");
    setText(infoState, data.state || data.province || "-");
    setText(
      infoTimezone,
      data.timezone || getTimezoneLabelFromTzid(data.tzid) || "-"
    );
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
    if (!mapReady || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return false;
    }

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

    updateAreaInfo(item);

    const lat = Number(item.lat);
    const lng = Number(item.lng);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      flyToCoordinates(lat, lng);
    } else {
      clearMarker();
    }

    inputEl.value = cleanCode;
  }

  function searchAtlas() {
    if (!areaDataLoaded) {
      alert("Area code data still loading.");
      return;
    }

    const rawInput = inputEl.value.trim();

    if (!rawInput) {
      alert("Enter an area code.");
      return;
    }

    const possibleAreaCode = extractPossibleAreaCode(rawInput);

    if (possibleAreaCode && areaCodesByCode[possibleAreaCode]) {
      selectArea(possibleAreaCode);
      return;
    }

    alert(`Area code ${rawInput} not found.`);
    clearInfo();
    clearMarker();
  }

  function extractPossibleAreaCode(rawInput) {
    const digits = String(rawInput).replace(/\D/g, "");

    if (digits.length === 3) {
      return digits;
    }

    if (digits.length === 4 && digits.startsWith("1")) {
      return digits.slice(1);
    }

    if (digits.length === 10) {
      return digits.slice(0, 3);
    }

    if (digits.length === 11 && digits.startsWith("1")) {
      return digits.slice(1, 4);
    }

    return null;
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
    const landWords =
      /\b(island|islands|state|province|territory|county|city|municipality|parish|district|country)\b/;

    return waterWords.test(text) && !landWords.test(text);
  }

  function addTimezonesLayer(data) {
    if (!map) return;

    if (!data || data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
      throw new Error("timezones.geojson is not a valid GeoJSON FeatureCollection");
    }

    if (map.getLayer("timezones-outline")) {
      map.removeLayer("timezones-outline");
    }

    if (map.getLayer("timezones-fill")) {
      map.removeLayer("timezones-fill");
    }

    if (map.getSource("timezones")) {
      map.removeSource("timezones");
    }

    const filteredFeatures = data.features
      .filter((feature) => !isWaterOnlyTimezoneFeature(feature))
      .map((feature, index) => {
        const tzLabel = getTimezoneLabelFromFeature(feature) || "Various";

        return {
          ...feature,
          id: feature.id ?? index,
          properties: {
            ...(feature.properties || {}),
            __tz_label: tzLabel
          }
        };
      });

    console.log("Original timezone features:", data.features.length);
    console.log("Timezone features drawn:", filteredFeatures.length);
    console.log("Sample timezone properties:", filteredFeatures[0]?.properties);

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

          "Brazil", getTimezoneColor("Brazil"),
          "SouthGeorgia", getTimezoneColor("SouthGeorgia"),
          "Azores", getTimezoneColor("Azores"),
          "UTC", getTimezoneColor("UTC"),
          "London", getTimezoneColor("London"),
          "CentralEurope", getTimezoneColor("CentralEurope"),
          "Israel", getTimezoneColor("Israel"),
          "Gulf", getTimezoneColor("Gulf"),

          "Chamorro", getTimezoneColor("Chamorro"),
          "Samoa", getTimezoneColor("Samoa"),
          "Various", getTimezoneColor("Various"),

          "#64748b"
        ],
        "fill-opacity": 0.7
      }
    });

    map.addLayer({
      id: "timezones-outline",
      type: "line",
      source: "timezones",
      paint: {
        "line-color": "#020617",
        "line-width": 1
      }
    });

    console.log("Timezone layer added successfully");
  }

  async function loadTimezoneData() {
    try {
      const res = await fetch(`${TIMEZONES_FILE}?v=${Date.now()}`);

      if (!res.ok) {
        throw new Error(`Failed to load ${TIMEZONES_FILE}: ${res.status}`);
      }

      const data = await res.json();
      addTimezonesLayer(data);
    } catch (err) {
      console.error("Timezone load error:", err);
    }
  }

  async function loadAreaCodeData() {
    try {
      const res = await fetch(`${DATA_FILE}?v=${Date.now()}`);

      if (!res.ok) {
        throw new Error(`Failed to load ${DATA_FILE}: ${res.status}`);
      }

      const data = await res.json();
      const codes = data.area_codes || data;

      Object.keys(codes).forEach((code) => {
        areaCodesByCode[String(code).trim()] = codes[code];
      });

      areaDataLoaded = true;
      console.log("Loaded area codes:", Object.keys(areaCodesByCode).length);
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

      await loadTimezoneData();
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
      searchAtlas();
    });
  }

  if (!formEl && buttonEl) {
    buttonEl.addEventListener("click", (e) => {
      e.preventDefault();
      searchAtlas();
    });
  }
});
