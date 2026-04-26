/* =====================================================
   AREA CODE ATLAS - FULL JS
   Fixes:
   - Loads area_code_data.json correctly
   - Reads area codes from data.area_codes
   - Removes the left-side "+44 found..." message
   - Country-code searches populate Country, Country Code, Time Zone
   - City and State / Region stay blank for country-code searches
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const MAPTILER_KEY = "TRZg1QKiYa41B03OE9Bz";

  maptilersdk.config.apiKey = MAPTILER_KEY;

  const searchForm = document.getElementById("searchForm");
  const searchInput = document.getElementById("areaSearch");

  const statusMessage = document.getElementById("statusMessage");
  if (statusMessage) {
    statusMessage.remove();
  }

  let areaCodeData = {};

  const map = new maptilersdk.Map({
    container: "map",
    style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
    center: [-40, 25],
    zoom: 1.7,
    projection: "globe"
  });

  map.addControl(new maptilersdk.NavigationControl(), "top-right");

  /* =====================================================
     COUNTRY CODE DATA
  ===================================================== */

  const COUNTRY_CODES = {
    "+1": {
      country: "United States / Canada",
      countryCode: "+1",
      timeZone: "Multiple Time Zones",
      center: [-98.5795, 39.8283],
      zoom: 3
    },
    "+44": {
      country: "United Kingdom",
      countryCode: "+44",
      timeZone: "London / Greenwich",
      center: [-3.435973, 55.378051],
      zoom: 4
    },
    "+972": {
      country: "Israel",
      countryCode: "+972",
      timeZone: "Israel Time",
      center: [34.8516, 31.0461],
      zoom: 6
    },
    "+55": {
      country: "Brazil",
      countryCode: "+55",
      timeZone: "Brasília Time",
      center: [-51.9253, -14.235],
      zoom: 4
    },
    "+27": {
      country: "South Africa",
      countryCode: "+27",
      timeZone: "South Africa Standard Time",
      center: [22.9375, -30.5595],
      zoom: 4
    },
    "+46": {
      country: "Sweden",
      countryCode: "+46",
      timeZone: "Central Europe",
      center: [18.6435, 60.1282],
      zoom: 4
    },
    "+81": {
      country: "Japan",
      countryCode: "+81",
      timeZone: "Japan / Korea",
      center: [138.2529, 36.2048],
      zoom: 4
    },
    "+82": {
      country: "South Korea",
      countryCode: "+82",
      timeZone: "Japan / Korea",
      center: [127.7669, 35.9078],
      zoom: 5
    },
    "+49": {
      country: "Germany",
      countryCode: "+49",
      timeZone: "Central Europe",
      center: [10.4515, 51.1657],
      zoom: 4
    },
    "+33": {
      country: "France",
      countryCode: "+33",
      timeZone: "Central Europe",
      center: [2.2137, 46.2276],
      zoom: 4
    },
    "+39": {
      country: "Italy",
      countryCode: "+39",
      timeZone: "Central Europe",
      center: [12.5674, 41.8719],
      zoom: 4
    },
    "+34": {
      country: "Spain",
      countryCode: "+34",
      timeZone: "Central Europe",
      center: [-3.7492, 40.4637],
      zoom: 4
    },
    "+31": {
      country: "Netherlands",
      countryCode: "+31",
      timeZone: "Central Europe",
      center: [5.2913, 52.1326],
      zoom: 5
    },
    "+41": {
      country: "Switzerland",
      countryCode: "+41",
      timeZone: "Central Europe",
      center: [8.2275, 46.8182],
      zoom: 5
    },
    "+43": {
      country: "Austria",
      countryCode: "+43",
      timeZone: "Central Europe",
      center: [14.5501, 47.5162],
      zoom: 5
    },
    "+45": {
      country: "Denmark",
      countryCode: "+45",
      timeZone: "Central Europe",
      center: [9.5018, 56.2639],
      zoom: 5
    },
    "+47": {
      country: "Norway",
      countryCode: "+47",
      timeZone: "Central Europe",
      center: [8.4689, 60.472],
      zoom: 4
    },
    "+358": {
      country: "Finland",
      countryCode: "+358",
      timeZone: "Eastern Europe",
      center: [25.7482, 61.9241],
      zoom: 4
    },
    "+353": {
      country: "Ireland",
      countryCode: "+353",
      timeZone: "Greenwich / Ireland",
      center: [-8.2439, 53.4129],
      zoom: 5
    },
    "+351": {
      country: "Portugal",
      countryCode: "+351",
      timeZone: "Greenwich / Western Europe",
      center: [-8.2245, 39.3999],
      zoom: 5
    },
    "+30": {
      country: "Greece",
      countryCode: "+30",
      timeZone: "Eastern Europe",
      center: [21.8243, 39.0742],
      zoom: 5
    },
    "+90": {
      country: "Turkey",
      countryCode: "+90",
      timeZone: "Turkey Time",
      center: [35.2433, 38.9637],
      zoom: 5
    },
    "+971": {
      country: "United Arab Emirates",
      countryCode: "+971",
      timeZone: "Gulf",
      center: [53.8478, 23.4241],
      zoom: 5
    },
    "+966": {
      country: "Saudi Arabia",
      countryCode: "+966",
      timeZone: "Arabia Standard Time",
      center: [45.0792, 23.8859],
      zoom: 5
    },
    "+974": {
      country: "Qatar",
      countryCode: "+974",
      timeZone: "Gulf",
      center: [51.1839, 25.3548],
      zoom: 6
    },
    "+965": {
      country: "Kuwait",
      countryCode: "+965",
      timeZone: "Arabia Standard Time",
      center: [47.4818, 29.3117],
      zoom: 6
    },
    "+973": {
      country: "Bahrain",
      countryCode: "+973",
      timeZone: "Arabia Standard Time",
      center: [50.5577, 26.0667],
      zoom: 7
    },
    "+968": {
      country: "Oman",
      countryCode: "+968",
      timeZone: "Gulf",
      center: [55.9233, 21.5126],
      zoom: 5
    },
    "+91": {
      country: "India",
      countryCode: "+91",
      timeZone: "India Standard Time",
      center: [78.9629, 20.5937],
      zoom: 4
    },
    "+92": {
      country: "Pakistan",
      countryCode: "+92",
      timeZone: "Pakistan",
      center: [69.3451, 30.3753],
      zoom: 5
    },
    "+880": {
      country: "Bangladesh",
      countryCode: "+880",
      timeZone: "Bangladesh",
      center: [90.3563, 23.685],
      zoom: 6
    },
    "+86": {
      country: "China",
      countryCode: "+86",
      timeZone: "China / Singapore",
      center: [104.1954, 35.8617],
      zoom: 4
    },
    "+65": {
      country: "Singapore",
      countryCode: "+65",
      timeZone: "China / Singapore",
      center: [103.8198, 1.3521],
      zoom: 8
    },
    "+66": {
      country: "Thailand",
      countryCode: "+66",
      timeZone: "Indochina",
      center: [100.9925, 15.87],
      zoom: 5
    },
    "+84": {
      country: "Vietnam",
      countryCode: "+84",
      timeZone: "Indochina",
      center: [108.2772, 14.0583],
      zoom: 5
    },
    "+63": {
      country: "Philippines",
      countryCode: "+63",
      timeZone: "Philippine Time",
      center: [121.774, 12.8797],
      zoom: 5
    },
    "+61": {
      country: "Australia",
      countryCode: "+61",
      timeZone: "Australian Time Zones",
      center: [133.7751, -25.2744],
      zoom: 4
    },
    "+64": {
      country: "New Zealand",
      countryCode: "+64",
      timeZone: "New Zealand",
      center: [174.886, -40.9006],
      zoom: 5
    },
    "+52": {
      country: "Mexico",
      countryCode: "+52",
      timeZone: "Multiple Time Zones",
      center: [-102.5528, 23.6345],
      zoom: 4
    },
    "+54": {
      country: "Argentina",
      countryCode: "+54",
      timeZone: "Argentina Time",
      center: [-63.6167, -38.4161],
      zoom: 4
    },
    "+56": {
      country: "Chile",
      countryCode: "+56",
      timeZone: "Chile Time",
      center: [-71.543, -35.6751],
      zoom: 4
    },
    "+57": {
      country: "Colombia",
      countryCode: "+57",
      timeZone: "Colombia Time",
      center: [-74.2973, 4.5709],
      zoom: 5
    },
    "+51": {
      country: "Peru",
      countryCode: "+51",
      timeZone: "Peru Time",
      center: [-75.0152, -9.19],
      zoom: 5
    }
  };

  const COUNTRY_CODE_PRIORITY_WITHOUT_PLUS = new Set(["972"]);

  /* =====================================================
     TIME ZONE BOXES
  ===================================================== */

  const TIME_ZONES = [
    { key: "hawaii", label: "HAWAII", tz: "Pacific/Honolulu", center: [-157.8583, 21.3069], zoom: 4 },
    { key: "alaska", label: "ALASKA", tz: "America/Anchorage", center: [-149.9003, 61.2181], zoom: 4 },
    { key: "pacific", label: "PACIFIC", tz: "America/Los_Angeles", center: [-118.2437, 34.0522], zoom: 4 },
    { key: "mountain", label: "MOUNTAIN", tz: "America/Denver", center: [-104.9903, 39.7392], zoom: 4 },
    { key: "central", label: "CENTRAL", tz: "America/Chicago", center: [-87.6298, 41.8781], zoom: 4 },
    { key: "eastern", label: "EASTERN", tz: "America/New_York", center: [-74.006, 40.7128], zoom: 4 },
    { key: "atlantic", label: "ATLANTIC", tz: "America/Halifax", center: [-63.5752, 44.6488], zoom: 5 },

    { key: "newfoundland", label: "NEWFOUNDLAND", tz: "America/St_Johns", center: [-52.7126, 47.5615], zoom: 5 },
    { key: "brasilia", label: "BRASÍLIA", tz: "America/Sao_Paulo", center: [-47.8825, -15.7942], zoom: 4 },
    { key: "south-georgia", label: "SOUTH GEORGIA", tz: "Atlantic/South_Georgia", center: [-36.5879, -54.4296], zoom: 4 },
    { key: "azores", label: "AZORES", tz: "Atlantic/Azores", center: [-25.6756, 37.7412], zoom: 5 },
    { key: "greenwich", label: "GREENWICH", tz: "Etc/GMT", center: [0, 51.4769], zoom: 5 },
    { key: "london", label: "LONDON", tz: "Europe/London", center: [-0.1276, 51.5072], zoom: 5 },
    { key: "central-europe", label: "CENTRAL EUROPE", tz: "Europe/Berlin", center: [10.4515, 51.1657], zoom: 4 },

    { key: "israel", label: "ISRAEL", tz: "Asia/Jerusalem", center: [34.8516, 31.0461], zoom: 6 },
    { key: "gulf", label: "GULF", tz: "Asia/Dubai", center: [55.2708, 25.2048], zoom: 5 },
    { key: "pakistan", label: "PAKISTAN", tz: "Asia/Karachi", center: [69.3451, 30.3753], zoom: 5 },
    { key: "bangladesh", label: "BANGLADESH", tz: "Asia/Dhaka", center: [90.3563, 23.685], zoom: 6 },
    { key: "indochina", label: "INDOCHINA", tz: "Asia/Bangkok", center: [100.9925, 15.87], zoom: 5 },
    { key: "china-singapore", label: "CHINA / SINGAPORE", tz: "Asia/Shanghai", center: [104.1954, 35.8617], zoom: 4 },
    { key: "japan-korea", label: "JAPAN / KOREA", tz: "Asia/Tokyo", center: [138.2529, 36.2048], zoom: 4 },

    { key: "australian-eastern", label: "AUSTRALIAN EASTERN", tz: "Australia/Sydney", center: [151.2093, -33.8688], zoom: 4 },
    { key: "solomon-islands", label: "SOLOMON ISLANDS", tz: "Pacific/Guadalcanal", center: [160.1562, -9.6457], zoom: 5 },
    { key: "new-zealand", label: "NEW ZEALAND", tz: "Pacific/Auckland", center: [174.886, -40.9006], zoom: 5 },
    { key: "tonga", label: "TONGA", tz: "Pacific/Tongatapu", center: [-175.1982, -21.1789], zoom: 5 },
    { key: "line-islands", label: "LINE ISLANDS", tz: "Pacific/Kiritimati", center: [-157.3768, 1.8721], zoom: 5 },
    { key: "baker-island", label: "BAKER ISLAND", tz: "Etc/GMT+12", center: [-176.4797, 0.1936], zoom: 5 },
    { key: "samoa", label: "SAMOA", tz: "Pacific/Apia", center: [-172.1046, -13.759], zoom: 5 }
  ];

  const timezoneGrid =
    document.getElementById("timezoneGrid") ||
    document.getElementById("timezonesGrid") ||
    document.querySelector(".timezone-grid") ||
    document.querySelector(".timezones-grid");

  if (timezoneGrid) {
    timezoneGrid.innerHTML = TIME_ZONES.map(zone => {
      return `
        <div class="timezone-card" data-timezone="${zone.key}" role="button" tabindex="0">
          <div class="timezone-name">${zone.label}</div>
          <div class="timezone-time" data-time-display="${zone.key}">--:--:--</div>
        </div>
      `;
    }).join("");
  }

  document.querySelectorAll(".timezone-card").forEach(card => {
    card.addEventListener("click", () => {
      const key = card.dataset.timezone;
      const zone = TIME_ZONES.find(item => item.key === key);

      if (!zone) return;

      map.flyTo({
        center: zone.center,
        zoom: zone.zoom,
        speed: 0.8,
        curve: 1.4,
        essential: true
      });
    });

    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        card.click();
      }
    });
  });

  function updateTimezoneClocks() {
    TIME_ZONES.forEach(zone => {
      const timeElement = document.querySelector(`[data-time-display="${zone.key}"]`);
      if (!timeElement) return;

      const time = new Intl.DateTimeFormat("en-US", {
        timeZone: zone.tz,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      }).format(new Date());

      timeElement.textContent = time;
    });
  }

  updateTimezoneClocks();
  setInterval(updateTimezoneClocks, 1000);

  /* =====================================================
     LOAD AREA CODE DATA
  ===================================================== */

  fetch("area_code_data.json")
    .then(response => {
      if (!response.ok) {
        throw new Error("area_code_data.json could not be loaded");
      }

      return response.json();
    })
    .then(data => {
      areaCodeData = normalizeAreaCodeData(data);
      console.log("Area code data loaded:", areaCodeData);
    })
    .catch(error => {
      console.warn(error);
      areaCodeData = {};
    });

  function normalizeAreaCodeData(data) {
    const normalized = {};

    const source = data && data.area_codes ? data.area_codes : data;

    if (Array.isArray(source)) {
      source.forEach(item => {
        const code = String(
          item.area_code ||
          item.areaCode ||
          item.code ||
          item.npa ||
          ""
        ).trim();

        if (code) {
          normalized[code] = item;
        }
      });

      return normalized;
    }

    if (source && typeof source === "object") {
      Object.keys(source).forEach(code => {
        normalized[String(code).trim()] = source[code];
      });
    }

    return normalized;
  }

  /* =====================================================
     SEARCH
  ===================================================== */

  if (searchForm) {
    searchForm.addEventListener("submit", event => {
      event.preventDefault();

      const rawInput = searchInput ? searchInput.value.trim() : "";

      if (!rawInput) {
        clearInfoPanel();
        return;
      }

      const digits = rawInput.replace(/[^\d]/g, "");
      const countryCodeKey = `+${digits}`;

      const countryMatch = COUNTRY_CODES[countryCodeKey];
      const areaMatch = areaCodeData[digits];

      const shouldSearchCountry =
        rawInput.startsWith("+") ||
        COUNTRY_CODE_PRIORITY_WITHOUT_PLUS.has(digits) ||
        !areaMatch;

      if (countryMatch && shouldSearchCountry) {
        showCountryCodeResult(countryMatch);
        return;
      }

      if (areaMatch) {
        showAreaCodeResult(digits, areaMatch);
        return;
      }

      if (countryMatch) {
        showCountryCodeResult(countryMatch);
        return;
      }

      clearInfoPanel();
    });
  }

  function showCountryCodeResult(data) {
    setInfoPanel({
      city: "",
      region: "",
      country: data.country,
      countryCode: data.countryCode,
      timeZone: data.timeZone
    });

    map.flyTo({
      center: data.center,
      zoom: data.zoom,
      speed: 0.8,
      curve: 1.4,
      essential: true
    });
  }

  function showAreaCodeResult(code, data) {
    const city =
      data.city ||
      data.primary_city ||
      data.main_city ||
      data.location ||
      data.name ||
      "";

    const region =
      data.state ||
      data.state_region ||
      data.region ||
      data.province ||
      "";

    const country =
      data.country ||
      data.country_name ||
      "United States / Canada";

    const countryCode =
      data.country_code ||
      data.calling_code ||
      "+1";

    const timeZone =
      data.time_zone ||
      data.timezone ||
      data.tz ||
      "";

    setInfoPanel({
      city,
      region,
      country,
      countryCode,
      timeZone
    });

    const center = getAreaCenter(data);

    if (center) {
      map.flyTo({
        center,
        zoom: data.zoom || 7,
        speed: 0.8,
        curve: 1.4,
        essential: true
      });
    }
  }

  function getAreaCenter(data) {
    if (Array.isArray(data.center) && data.center.length === 2) {
      return data.center;
    }

    if (Array.isArray(data.coordinates) && data.coordinates.length === 2) {
      return data.coordinates;
    }

    const lng =
      data.lng ||
      data.lon ||
      data.longitude;

    const lat =
      data.lat ||
      data.latitude;

    if (typeof lat === "number" && typeof lng === "number") {
      return [lng, lat];
    }

    return null;
  }

  /* =====================================================
     AREA INFORMATION PANEL
  ===================================================== */

  function setInfoPanel(info) {
    setText(["infoCity"], info.city || "");
    setText(["infoState", "infoRegion", "infoStateRegion"], info.region || "");
    setText(["infoCountry"], info.country || "");
    setText(["infoCountryCode"], info.countryCode || "");
    setText(["infoTimezone", "infoTimeZone"], info.timeZone || "");
  }

  function clearInfoPanel() {
    setInfoPanel({
      city: "",
      region: "",
      country: "",
      countryCode: "",
      timeZone: ""
    });
  }

  function setText(ids, value) {
    ids.forEach(id => {
      const element = document.getElementById(id);

      if (element) {
        element.textContent = value;
      }
    });
  }

  clearInfoPanel();
});
