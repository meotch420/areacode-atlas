window.addEventListener("DOMContentLoaded", () => {
  const DATA_FILE = "area_code_data.json";
  const COUNTRY_CODES_FILE = "country_codes.json";
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

  let areaDataLoaded = false;
  let countryDataLoaded = false;

  let areaCodesByCode = {};
  let countryCodes = [];

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
    setText(infoAreaCode, "-");
    setText(infoCity, "-");
    setText(infoState, "-");
    setText(infoTimezone, "-");
  }

  function updateAreaInfo(code, data) {
    if (!data) {
      clearInfo();
      return;
    }

    setText(infoAreaCode, code || "-");
    setText(infoCity, data.city || "-");
    setText(infoState, data.state || data.province || "-");
    setText(
      infoTimezone,
      data.timezone || getTimezoneLabelFromTzid(data.tzid) || "-"
    );
  }

  function updateCountryInfo(match) {
    setText(infoAreaCode, match.matchedCode || "-");
    setText(infoCity, match.country || "-");
    setText(infoState, `${match.iso2 || "-"} / ${match.iso3 || "-"}`);
    setText(infoTimezone, match.nanp ? "NANP: Yes" : "NANP: No");
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
      showSearchResultBox("No Match Found", [
        ["Search", cleanCode],
        ["Try", "Use an area code like 212 or a country code like +972"]
      ]);
      return;
    }

    updateAreaInfo(cleanCode, item);

    const countryInfo = getCountryInfoForAreaCode(cleanCode, item);

    showSearchResultBox("Area Information", [
      ["Area Code", cleanCode],
      ["City", item.city || "N/A"],
      ["State / Region", item.state || item.province || "N/A"],
      ["Time Zone", item.timezone || getTimezoneLabelFromTzid(item.tzid) || "N/A"],
      ["TZ ID", item.tzid || "N/A"],
      ["Country", countryInfo.country],
      ["Country Calling Code", countryInfo.callingCode]
    ]);

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
      alert("Enter an area code or country code.");
      return;
    }

    const cleanInput = removeSearchWords(rawInput);
    const digitsOnly = cleanInput.replace(/\D/g, "");
    const explicitCountrySearch = isExplicitCountrySearch(rawInput);

    /*
      Important:
      - Plain 212 searches area code 212.
      - Plain 972 searches area code 972 if it exists.
      - To search a country code, use +972, 00972, or country 972.
    */

    if (explicitCountrySearch) {
      const countryMatches = findCountryCodeMatches(rawInput);

      if (countryMatches.length > 0) {
        displayCountryCodeResult(rawInput, countryMatches);
        return;
      }

      const possibleAreaCode = extractPossibleAreaCode(cleanInput);

      if (possibleAreaCode && areaCodesByCode[possibleAreaCode]) {
        selectArea(possibleAreaCode);
        return;
      }

      showSearchResultBox("No Country Code Found", [
        ["Search", rawInput],
        ["Try", "Use +972, +44, +1-242, or country 972"]
      ]);

      clearMarker();
      return;
    }

    if (digitsOnly.length === 3 && areaCodesByCode[digitsOnly]) {
      selectArea(digitsOnly);
      return;
    }

    const countryMatches = findCountryCodeMatches(rawInput);

    if (countryMatches.length > 0) {
      displayCountryCodeResult(rawInput, countryMatches);
      return;
    }

    const possibleAreaCode = extractPossibleAreaCode(cleanInput);

    if (possibleAreaCode && areaCodesByCode[possibleAreaCode]) {
      selectArea(possibleAreaCode);
      return;
    }

    showSearchResultBox("No Match Found", [
      ["Search", rawInput],
      ["Try Area Code", "212"],
      ["Try Country Code", "+972"]
    ]);

    clearInfo();
    clearMarker();
  }

  function removeSearchWords(value) {
    return String(value)
      .trim()
      .replace(/^(country|calling|international|country code|calling code)\s+/i, "")
      .trim();
  }

  function isExplicitCountrySearch(value) {
    const text = String(value).trim().toLowerCase();

    return (
      text.startsWith("+") ||
      text.startsWith("00") ||
      text.startsWith("country ") ||
      text.startsWith("country code ") ||
      text.startsWith("calling ") ||
      text.startsWith("calling code ") ||
      text.startsWith("international ")
    );
  }

  function findCountryCodeMatches(rawInput) {
    if (!countryDataLoaded || !Array.isArray(countryCodes)) {
      return [];
    }

    let search = removeSearchWords(rawInput);

    if (search.startsWith("00")) {
      search = "+" + search.slice(2);
    }

    const searchDigits = search.replace(/\D/g, "");

    if (!searchDigits) return [];

    const matches = [];

    countryCodes.forEach((country) => {
      const codes = country.calling_codes || [];

      codes.forEach((code) => {
        const codeDigits = String(code).replace(/\D/g, "");

        if (codeDigits === searchDigits) {
          matches.push({
            ...country,
            matchedCode: code
          });
        }
      });
    });

    return matches;
  }

  function displayCountryCodeResult(rawInput, matches) {
    clearMarker();

    if (!matches || matches.length === 0) {
      showSearchResultBox("No Country Code Found", [
        ["Search", rawInput],
        ["Try", "+972, +44, +1-242"]
      ]);
      return;
    }

    updateCountryInfo(matches[0]);

    const rows = [];

    rows.push(["Search", rawInput]);

    matches.forEach((match, index) => {
      const label = matches.length > 1 ? `Match ${index + 1}` : "Country";

      rows.push([label, match.country || "N/A"]);
      rows.push(["ISO 2", match.iso2 || "N/A"]);
      rows.push(["ISO 3", match.iso3 || "N/A"]);
      rows.push(["Calling Code", match.matchedCode || "N/A"]);
      rows.push(["NANP", match.nanp ? "Yes" : "No"]);

      if (index < matches.length - 1) {
        rows.push(["---", "---"]);
      }
    });

    showSearchResultBox("Country Code Information", rows);
  }

  function extractPossibleAreaCode(rawInput) {
    const digits = String(rawInput).replace(/\D/g, "");

    if (digits.length === 3) {
      return digits;
    }

    /*
      Allows:
      +1-212
      1-212
      1212
    */
    if (digits.length === 4 && digits.startsWith("1")) {
      return digits.slice(1);
    }

    /*
      Allows:
      2125551212
      1-212-555-1212
    */
    if (digits.length === 10) {
      return digits.slice(0, 3);
    }

    if (digits.length === 11 && digits.startsWith("1")) {
      return digits.slice(1, 4);
    }

    return null;
  }

  function getCountryInfoForAreaCode(areaCode, data) {
    const state = data.state || data.province || "";

    const canadianRegions = [
      "AB", "BC", "MB", "NB", "NL", "NS", "NT",
      "NU", "ON", "PE", "QC", "SK", "YT"
    ];

    const usRegions = [
      "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
      "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
      "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
      "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
      "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
      "DC"
    ];

    const nanpCountryByAreaCode = {
      "242": "Bahamas",
      "246": "Barbados",
      "264": "Anguilla",
      "268": "Antigua and Barbuda",
      "284": "British Virgin Islands",
      "340": "United States Virgin Islands",
      "345": "Cayman Islands",
      "441": "Bermuda",
      "473": "Grenada",
      "649": "Turks and Caicos Islands",
      "658": "Jamaica",
      "664": "Montserrat",
      "670": "Northern Mariana Islands",
      "671": "Guam",
      "684": "American Samoa",
      "721": "Sint Maarten",
      "758": "Saint Lucia",
      "767": "Dominica",
      "784": "Saint Vincent and the Grenadines",
      "787": "Puerto Rico",
      "809": "Dominican Republic",
      "829": "Dominican Republic",
      "849": "Dominican Republic",
      "868": "Trinidad and Tobago",
      "869": "Saint Kitts and Nevis",
      "876": "Jamaica",
      "939": "Puerto Rico"
    };

    if (nanpCountryByAreaCode[areaCode]) {
      return {
        country: nanpCountryByAreaCode[areaCode],
        callingCode: "+1-" + areaCode
      };
    }

    if (canadianRegions.includes(state)) {
      return {
        country: "Canada",
        callingCode: "+1"
      };
    }

    if (usRegions.includes(state)) {
      return {
        country: "United States",
        callingCode: "+1"
      };
    }

    return {
      country: data.country || "NANP Region",
      callingCode: "+1"
    };
  }

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function injectSearchResultStyles() {
    if (document.getElementById("atlasSearchResultStyles")) return;

    const style = document.createElement("style");
    style.id = "atlasSearchResultStyles";

    style.textContent = `
      #atlasSearchResultBox {
        margin-top: 14px;
        padding: 14px;
        border: 1px solid #334155;
        border-radius: 12px;
        background: #0f172a;
        color: #e5e7eb;
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.25);
        max-width: 420px;
      }

      .atlas-result-title {
        font-size: 1.15rem;
        font-weight: 700;
        margin-bottom: 10px;
        color: #ffffff;
        text-align: center;
      }

      .atlas-result-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 6px 0;
        border-bottom: 1px solid rgba(148, 163, 184, 0.2);
      }

      .atlas-result-row:last-child {
        border-bottom: none;
      }

      .atlas-result-label {
        font-weight: 700;
        color: #93c5fd;
        white-space: nowrap;
      }

      .atlas-result-value {
        color: #f8fafc;
        text-align: right;
        word-break: break-word;
      }

      .atlas-result-divider {
        border: none;
        border-top: 1px solid #475569;
        margin: 10px 0;
      }
    `;

    document.head.appendChild(style);
  }

  function showSearchResultBox(title, rows) {
    let resultBox = document.getElementById("atlasSearchResultBox");

    if (!resultBox) {
      resultBox = document.createElement("div");
      resultBox.id = "atlasSearchResultBox";

      const parent =
        document.getElementById("areaInfo") ||
        document.querySelector(".area-info") ||
        document.querySelector(".info-panel") ||
        document.querySelector(".info-card") ||
        document.querySelector(".top-right") ||
        document.querySelector(".details-card") ||
        document.querySelector(".top-section") ||
        document.body;

      parent.appendChild(resultBox);
    }

    let html = `<div class="atlas-result-title">${escapeHTML(title)}</div>`;

    rows.forEach((row) => {
      const label = row[0];
      const value = row[1];

      if (label === "---") {
        html += `<hr class="atlas-result-divider" />`;
      } else {
        html += `
          <div class="atlas-result-row">
            <span class="atlas-result-label">${escapeHTML(label)}:</span>
            <span class="atlas-result-value">${escapeHTML(value)}</span>
          </div>
        `;
      }
    });

    resultBox.innerHTML = html;
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

  async function loadCountryCodeData() {
    try {
      const res = await fetch(`${COUNTRY_CODES_FILE}?v=${Date.now()}`);

      if (!res.ok) {
        throw new Error(`Failed to load ${COUNTRY_CODES_FILE}: ${res.status}`);
      }

      const data = await res.json();

      countryCodes = data.countries || [];
      countryDataLoaded = true;

      console.log("Loaded country codes:", countryCodes.length);
    } catch (err) {
      countryCodes = [];
      countryDataLoaded = false;
      console.error("Country code data load error:", err);

      showSearchResultBox("Country Codes Not Loaded", [
        ["Missing File", COUNTRY_CODES_FILE],
        ["Fix", "Upload country_codes.json into the same folder as index.html"]
      ]);
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

  injectSearchResultStyles();

  loadAreaCodeData();
  loadCountryCodeData();

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
