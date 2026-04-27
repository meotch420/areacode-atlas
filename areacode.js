/* =====================================================
   AREA CODE ATLAS - FULL JS
===================================================== */

maptilersdk.config.apiKey = "TRZg1QKiYa41B03OE9Bz";

/* =====================================================
   AUTO REFRESH PAGE EVERY 1 HOUR
===================================================== */

setTimeout(() => {
  window.location.reload();
}, 60 * 60 * 1000);

/* =====================================================
   MAP
===================================================== */

const map = new maptilersdk.Map({
  container: "map",
  style: maptilersdk.MapStyle.STREETS,
  center: [0, 20],
  zoom: 1.4,
  minZoom: 1.2,
  maxZoom: 10,
  projection: "globe",
  terrain: false,
  geolocate: false,
  hash: false
});

map.addControl(new maptilersdk.NavigationControl(), "top-right");

/* =====================================================
   DOM ELEMENTS
===================================================== */

const searchForm = document.getElementById("searchForm");
const areaSearch = document.getElementById("areaSearch");
const statusMessage = document.getElementById("statusMessage");

const infoAreaCode = document.getElementById("infoAreaCode");
const infoCity = document.getElementById("infoCity");
const infoState = document.getElementById("infoState");
const infoTimezone = document.getElementById("infoTimezone");
const infoCountryCode = document.getElementById("infoCountryCode");
const infoCountry = document.getElementById("infoCountry");

/* =====================================================
   SEARCH LOCATION PIN
===================================================== */

let searchLocationPin = null;

function getSearchCoordinates(result) {
  if (!result) return null;

  if (result.longitude !== undefined && result.latitude !== undefined) {
    return [Number(result.longitude), Number(result.latitude)];
  }

  if (result.lng !== undefined && result.lat !== undefined) {
    return [Number(result.lng), Number(result.lat)];
  }

  if (Array.isArray(result.center) && result.center.length === 2) {
    return [Number(result.center[0]), Number(result.center[1])];
  }

  if (Array.isArray(result.coordinates) && result.coordinates.length === 2) {
    return [Number(result.coordinates[0]), Number(result.coordinates[1])];
  }

  return null;
}

function placeSearchPin(result) {
  const coordinates = getSearchCoordinates(result);

  if (!coordinates) {
    console.warn("No coordinates found for this result:", result);
    return;
  }

  if (searchLocationPin) {
    searchLocationPin.remove();
  }

  searchLocationPin = new maptilersdk.Marker({
    color: "#ff0000"
  })
    .setLngLat(coordinates)
    .addTo(map);
}

/* =====================================================
   DATA
===================================================== */

let areaCodeData = [];

const countryCodeData = [
  {
    code: "+1",
    countryCode: "+1",
    country: "United States / Canada",
    city: "",
    state: "",
    region: "",
    timezone: "Multiple Time Zones",
    latitude: 39.8283,
    longitude: -98.5795,
    zoom: 3
  },
  {
    code: "+44",
    countryCode: "+44",
    country: "United Kingdom",
    city: "",
    state: "",
    region: "",
    timezone: "Greenwich Mean Time / British Summer Time",
    latitude: 54.7024,
    longitude: -3.2766,
    zoom: 5
  },
  {
    code: "+972",
    countryCode: "+972",
    country: "Israel",
    city: "",
    state: "",
    region: "",
    timezone: "Israel Time",
    latitude: 31.0461,
    longitude: 34.8516,
    zoom: 6
  },
  {
    code: "+81",
    countryCode: "+81",
    country: "Japan",
    city: "",
    state: "",
    region: "",
    timezone: "Japan Standard Time",
    latitude: 36.2048,
    longitude: 138.2529,
    zoom: 5
  },
  {
    code: "+82",
    countryCode: "+82",
    country: "South Korea",
    city: "",
    state: "",
    region: "",
    timezone: "Korea Standard Time",
    latitude: 35.9078,
    longitude: 127.7669,
    zoom: 6
  },
  {
    code: "+55",
    countryCode: "+55",
    country: "Brazil",
    city: "",
    state: "",
    region: "",
    timezone: "Brazil Time Zones",
    latitude: -14.235,
    longitude: -51.9253,
    zoom: 4
  },
  {
    code: "+27",
    countryCode: "+27",
    country: "South Africa",
    city: "",
    state: "",
    region: "",
    timezone: "South Africa Standard Time",
    latitude: -30.5595,
    longitude: 22.9375,
    zoom: 5
  },
  {
    code: "+46",
    countryCode: "+46",
    country: "Sweden",
    city: "",
    state: "",
    region: "",
    timezone: "Central European Time",
    latitude: 60.1282,
    longitude: 18.6435,
    zoom: 5
  },
  {
    code: "+33",
    countryCode: "+33",
    country: "France",
    city: "",
    state: "",
    region: "",
    timezone: "Central European Time",
    latitude: 46.2276,
    longitude: 2.2137,
    zoom: 5
  },
  {
    code: "+49",
    countryCode: "+49",
    country: "Germany",
    city: "",
    state: "",
    region: "",
    timezone: "Central European Time",
    latitude: 51.1657,
    longitude: 10.4515,
    zoom: 5
  },
  {
    code: "+39",
    countryCode: "+39",
    country: "Italy",
    city: "",
    state: "",
    region: "",
    timezone: "Central European Time",
    latitude: 41.8719,
    longitude: 12.5674,
    zoom: 5
  },
  {
    code: "+34",
    countryCode: "+34",
    country: "Spain",
    city: "",
    state: "",
    region: "",
    timezone: "Central European Time",
    latitude: 40.4637,
    longitude: -3.7492,
    zoom: 5
  },
  {
    code: "+61",
    countryCode: "+61",
    country: "Australia",
    city: "",
    state: "",
    region: "",
    timezone: "Australian Time Zones",
    latitude: -25.2744,
    longitude: 133.7751,
    zoom: 4
  },
  {
    code: "+64",
    countryCode: "+64",
    country: "New Zealand",
    city: "",
    state: "",
    region: "",
    timezone: "New Zealand Standard Time",
    latitude: -40.9006,
    longitude: 174.886,
    zoom: 5
  },
  {
    code: "+52",
    countryCode: "+52",
    country: "Mexico",
    city: "",
    state: "",
    region: "",
    timezone: "Mexico Time Zones",
    latitude: 23.6345,
    longitude: -102.5528,
    zoom: 5
  },
  {
    code: "+91",
    countryCode: "+91",
    country: "India",
    city: "",
    state: "",
    region: "",
    timezone: "India Standard Time",
    latitude: 20.5937,
    longitude: 78.9629,
    zoom: 5
  },
  {
    code: "+86",
    countryCode: "+86",
    country: "China",
    city: "",
    state: "",
    region: "",
    timezone: "China Standard Time",
    latitude: 35.8617,
    longitude: 104.1954,
    zoom: 4
  },
  {
    code: "+7",
    countryCode: "+7",
    country: "Russia / Kazakhstan",
    city: "",
    state: "",
    region: "",
    timezone: "Multiple Time Zones",
    latitude: 61.524,
    longitude: 105.3188,
    zoom: 3
  },
  {
    code: "+31",
    countryCode: "+31",
    country: "Netherlands",
    city: "",
    state: "",
    region: "",
    timezone: "Central European Time",
    latitude: 52.1326,
    longitude: 5.2913,
    zoom: 6
  },
  {
    code: "+41",
    countryCode: "+41",
    country: "Switzerland",
    city: "",
    state: "",
    region: "",
    timezone: "Central European Time",
    latitude: 46.8182,
    longitude: 8.2275,
    zoom: 6
  },
  {
    code: "+43",
    countryCode: "+43",
    country: "Austria",
    city: "",
    state: "",
    region: "",
    timezone: "Central European Time",
    latitude: 47.5162,
    longitude: 14.5501,
    zoom: 6
  },
  {
    code: "+30",
    countryCode: "+30",
    country: "Greece",
    city: "",
    state: "",
    region: "",
    timezone: "Eastern European Time",
    latitude: 39.0742,
    longitude: 21.8243,
    zoom: 6
  },
  {
    code: "+90",
    countryCode: "+90",
    country: "Turkey",
    city: "",
    state: "",
    region: "",
    timezone: "Turkey Time",
    latitude: 38.9637,
    longitude: 35.2433,
    zoom: 5
  },
  {
    code: "+20",
    countryCode: "+20",
    country: "Egypt",
    city: "",
    state: "",
    region: "",
    timezone: "Eastern European Time",
    latitude: 26.8206,
    longitude: 30.8025,
    zoom: 5
  },
  {
    code: "+971",
    countryCode: "+971",
    country: "United Arab Emirates",
    city: "",
    state: "",
    region: "",
    timezone: "Gulf Standard Time",
    latitude: 23.4241,
    longitude: 53.8478,
    zoom: 6
  },
  {
    code: "+966",
    countryCode: "+966",
    country: "Saudi Arabia",
    city: "",
    state: "",
    region: "",
    timezone: "Arabia Standard Time",
    latitude: 23.8859,
    longitude: 45.0792,
    zoom: 5
  },
  {
    code: "+63",
    countryCode: "+63",
    country: "Philippines",
    city: "",
    state: "",
    region: "",
    timezone: "Philippine Standard Time",
    latitude: 12.8797,
    longitude: 121.774,
    zoom: 5
  },
  {
    code: "+65",
    countryCode: "+65",
    country: "Singapore",
    city: "",
    state: "",
    region: "",
    timezone: "Singapore Standard Time",
    latitude: 1.3521,
    longitude: 103.8198,
    zoom: 9
  },
  {
    code: "+66",
    countryCode: "+66",
    country: "Thailand",
    city: "",
    state: "",
    region: "",
    timezone: "Indochina Time",
    latitude: 15.87,
    longitude: 100.9925,
    zoom: 5
  },
  {
    code: "+84",
    countryCode: "+84",
    country: "Vietnam",
    city: "",
    state: "",
    region: "",
    timezone: "Indochina Time",
    latitude: 14.0583,
    longitude: 108.2772,
    zoom: 5
  },
  {
    code: "+62",
    countryCode: "+62",
    country: "Indonesia",
    city: "",
    state: "",
    region: "",
    timezone: "Indonesia Time Zones",
    latitude: -0.7893,
    longitude: 113.9213,
    zoom: 4
  },
  {
    code: "+60",
    countryCode: "+60",
    country: "Malaysia",
    city: "",
    state: "",
    region: "",
    timezone: "Malaysia Time",
    latitude: 4.2105,
    longitude: 101.9758,
    zoom: 5
  },
  {
    code: "+54",
    countryCode: "+54",
    country: "Argentina",
    city: "",
    state: "",
    region: "",
    timezone: "Argentina Time",
    latitude: -38.4161,
    longitude: -63.6167,
    zoom: 4
  },
  {
    code: "+56",
    countryCode: "+56",
    country: "Chile",
    city: "",
    state: "",
    region: "",
    timezone: "Chile Time",
    latitude: -35.6751,
    longitude: -71.543,
    zoom: 4
  },
  {
    code: "+57",
    countryCode: "+57",
    country: "Colombia",
    city: "",
    state: "",
    region: "",
    timezone: "Colombia Time",
    latitude: 4.5709,
    longitude: -74.2973,
    zoom: 5
  },
  {
    code: "+51",
    countryCode: "+51",
    country: "Peru",
    city: "",
    state: "",
    region: "",
    timezone: "Peru Time",
    latitude: -9.19,
    longitude: -75.0152,
    zoom: 5
  }
];

/* =====================================================
   TIME ZONE BOX LOCATIONS
===================================================== */

const timezoneLocations = {
  "UTC-12": {
    center: [-176.0, -14.3],
    zoom: 4
  },
  "UTC-11": {
    center: [-170.7, -14.3],
    zoom: 4
  },
  "HAWAII": {
    center: [-157.8583, 21.3069],
    zoom: 5
  },
  "ALASKA": {
    center: [-149.9003, 61.2181],
    zoom: 4
  },
  "PACIFIC": {
    center: [-118.2437, 34.0522],
    zoom: 5
  },
  "MOUNTAIN": {
    center: [-104.9903, 39.7392],
    zoom: 5
  },
  "CENTRAL": {
    center: [-87.6298, 41.8781],
    zoom: 5
  },
  "EASTERN": {
    center: [-74.006, 40.7128],
    zoom: 5
  },
  "ATLANTIC": {
    center: [-63.5752, 44.6488],
    zoom: 5
  },
  "NEWFOUNDLAND": {
    center: [-52.7126, 47.5615],
    zoom: 5
  },
  "UTC": {
    center: [-0.1276, 51.5072],
    zoom: 5
  },
  "CENTRAL EUROPE": {
    center: [10.4515, 51.1657],
    zoom: 5
  },
  "EASTERN EUROPE": {
    center: [25.4858, 42.7339],
    zoom: 5
  },
  "ISRAEL": {
    center: [34.8516, 31.0461],
    zoom: 6
  },
  "ARABIA": {
    center: [45.0792, 23.8859],
    zoom: 5
  },
  "GULF": {
    center: [53.8478, 23.4241],
    zoom: 6
  },
  "PAKISTAN": {
    center: [69.3451, 30.3753],
    zoom: 5
  },
  "INDIA": {
    center: [78.9629, 20.5937],
    zoom: 5
  },
  "BANGLADESH": {
    center: [90.3563, 23.685],
    zoom: 6
  },
  "THAILAND": {
    center: [100.9925, 15.87],
    zoom: 5
  },
  "CHINA": {
    center: [104.1954, 35.8617],
    zoom: 4
  },
  "JAPAN": {
    center: [138.2529, 36.2048],
    zoom: 5
  },
  "AUSTRALIA WEST": {
    center: [121.6283, -25.7603],
    zoom: 4
  },
  "AUSTRALIA CENTRAL": {
    center: [133.7751, -25.2744],
    zoom: 4
  },
  "AUSTRALIA EAST": {
    center: [151.2093, -33.8688],
    zoom: 5
  },
  "NEW ZEALAND": {
    center: [174.886, -40.9006],
    zoom: 5
  },
  "CHATHAM": {
    center: [-176.5, -43.95],
    zoom: 6
  },
  "LINE ISLANDS": {
    center: [-157.4, 1.87],
    zoom: 5
  }
};

/* =====================================================
   TIME ZONE CLOCKS
===================================================== */

const timezoneClockData = [
  {
    id: "timeUtcMinus12",
    timezone: "Etc/GMT+12"
  },
  {
    id: "timeUtcMinus11",
    timezone: "Pacific/Pago_Pago"
  },
  {
    id: "timeHawaii",
    timezone: "Pacific/Honolulu"
  },
  {
    id: "timeAlaska",
    timezone: "America/Anchorage"
  },
  {
    id: "timePacific",
    timezone: "America/Los_Angeles"
  },
  {
    id: "timeMountain",
    timezone: "America/Denver"
  },
  {
    id: "timeCentral",
    timezone: "America/Chicago"
  },
  {
    id: "timeEastern",
    timezone: "America/New_York"
  },
  {
    id: "timeAtlantic",
    timezone: "America/Halifax"
  },
  {
    id: "timeNewfoundland",
    timezone: "America/St_Johns"
  },
  {
    id: "timeUtc",
    timezone: "Etc/UTC"
  },
  {
    id: "timeCentralEurope",
    timezone: "Europe/Berlin"
  },
  {
    id: "timeEasternEurope",
    timezone: "Europe/Athens"
  },
  {
    id: "timeIsrael",
    timezone: "Asia/Jerusalem"
  },
  {
    id: "timeArabia",
    timezone: "Asia/Riyadh"
  },
  {
    id: "timeGulf",
    timezone: "Asia/Dubai"
  },
  {
    id: "timePakistan",
    timezone: "Asia/Karachi"
  },
  {
    id: "timeIndia",
    timezone: "Asia/Kolkata"
  },
  {
    id: "timeBangladesh",
    timezone: "Asia/Dhaka"
  },
  {
    id: "timeThailand",
    timezone: "Asia/Bangkok"
  },
  {
    id: "timeChina",
    timezone: "Asia/Shanghai"
  },
  {
    id: "timeJapan",
    timezone: "Asia/Tokyo"
  },
  {
    id: "timeAustraliaWest",
    timezone: "Australia/Perth"
  },
  {
    id: "timeAustraliaCentral",
    timezone: "Australia/Adelaide"
  },
  {
    id: "timeAustraliaEast",
    timezone: "Australia/Sydney"
  },
  {
    id: "timeNewZealand",
    timezone: "Pacific/Auckland"
  },
  {
    id: "timeChatham",
    timezone: "Pacific/Chatham"
  },
  {
    id: "timeLineIslands",
    timezone: "Pacific/Kiritimati"
  }
];

function updateTimezoneClocks() {
  timezoneClockData.forEach((item) => {
    const element = document.getElementById(item.id);

    if (!element) return;

    element.textContent = new Intl.DateTimeFormat("en-US", {
      timeZone: item.timezone,
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    }).format(new Date());
  });
}

updateTimezoneClocks();
setInterval(updateTimezoneClocks, 1000);

/* =====================================================
   LOAD AREA CODE DATA
===================================================== */

fetch("area_code_data.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error("Could not load area_code_data.json");
    }

    return response.json();
  })
  .then((data) => {
    areaCodeData = Array.isArray(data) ? data : [];

    if (statusMessage) {
      statusMessage.textContent =
        "Enter a 3-digit area code or country code like +972.";
    }
  })
  .catch((error) => {
    console.error(error);

    if (statusMessage) {
      statusMessage.textContent =
        "Area code data could not be loaded. Country-code search still works.";
    }
  });

/* =====================================================
   HELPERS
===================================================== */

function normalizeSearchInput(value) {
  return String(value || "").trim().replace(/\s+/g, "");
}

function normalizeCountryCode(value) {
  const cleaned = normalizeSearchInput(value).replace(/[^\d+]/g, "");

  if (!cleaned) return "";

  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  return `+${cleaned}`;
}

function normalizeAreaCode(value) {
  return normalizeSearchInput(value).replace(/\D/g, "");
}

function setText(element, value) {
  if (!element) return;

  element.textContent =
    value !== undefined && value !== null && String(value).trim() !== ""
      ? value
      : "---";
}

function getAreaCodeValue(result) {
  return (
    result.area_code ||
    result.areaCode ||
    result.code ||
    result.npa ||
    result.AreaCode ||
    ""
  );
}

function getCityValue(result) {
  return result.city || result.City || "";
}

function getStateValue(result) {
  return result.state || result.region || result.State || result.Region || "";
}

function getTimezoneValue(result) {
  return result.timezone || result.time_zone || result.TimeZone || "";
}

function getCountryCodeValue(result) {
  return result.countryCode || result.country_code || result.code || "";
}

function getCountryValue(result) {
  return result.country || result.Country || "";
}

function updateInfoPanel(result, type) {
  if (type === "country") {
    setText(infoAreaCode, "");
    setText(infoCity, "");
    setText(infoState, "");
    setText(infoTimezone, getTimezoneValue(result));
    setText(infoCountryCode, getCountryCodeValue(result));
    setText(infoCountry, getCountryValue(result));
    return;
  }

  setText(infoAreaCode, getAreaCodeValue(result));
  setText(infoCity, getCityValue(result));
  setText(infoState, getStateValue(result));
  setText(infoTimezone, getTimezoneValue(result));
  setText(infoCountryCode, getCountryCodeValue(result));
  setText(infoCountry, getCountryValue(result));
}

function flyToResult(result) {
  const coordinates = getSearchCoordinates(result);

  if (!coordinates) return;

  map.flyTo({
    center: coordinates,
    zoom: result.zoom || 6,
    speed: 1.2,
    curve: 1.4,
    essential: true
  });

  placeSearchPin(result);
}

function findAreaCode(searchValue) {
  const areaCode = normalizeAreaCode(searchValue);

  if (!areaCode) return null;

  return areaCodeData.find((item) => {
    const itemCode = String(getAreaCodeValue(item)).replace(/\D/g, "");
    return itemCode === areaCode;
  });
}

function findCountryCode(searchValue) {
  const countryCode = normalizeCountryCode(searchValue);

  if (!countryCode) return null;

  return countryCodeData.find((item) => item.code === countryCode);
}

/* =====================================================
   SEARCH
===================================================== */

if (searchForm) {
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const searchValue = normalizeSearchInput(areaSearch ? areaSearch.value : "");

    if (!searchValue) {
      if (statusMessage) {
        statusMessage.textContent =
          "Enter a 3-digit area code or country code like +972.";
      }

      return;
    }

    const isCountryCodeSearch =
      searchValue.startsWith("+") || normalizeAreaCode(searchValue).length > 3;

    if (isCountryCodeSearch) {
      const foundCountry = findCountryCode(searchValue);

      if (!foundCountry) {
        if (statusMessage) {
          statusMessage.textContent = `${searchValue} was not found.`;
        }

        return;
      }

      updateInfoPanel(foundCountry, "country");
      flyToResult(foundCountry);

      if (statusMessage) {
        statusMessage.textContent = `${foundCountry.countryCode} found: ${foundCountry.country}`;
      }

      return;
    }

    const foundArea = findAreaCode(searchValue);

    if (!foundArea) {
      if (statusMessage) {
        statusMessage.textContent = `${searchValue} was not found.`;
      }

      return;
    }

    updateInfoPanel(foundArea, "area");
    flyToResult(foundArea);

    if (statusMessage) {
      const city = getCityValue(foundArea);
      const state = getStateValue(foundArea);

      statusMessage.textContent = `${getAreaCodeValue(foundArea)} found${
        city || state ? `: ${city}${city && state ? ", " : ""}${state}` : "."
      }`;
    }
  });
}

/* =====================================================
   CLICK TIME ZONE BOXES TO FLY TO LOCATION
===================================================== */

document.querySelectorAll(".timezone-card").forEach((card) => {
  card.addEventListener("click", () => {
    const timezoneName =
      card.dataset.timezone ||
      card.dataset.zone ||
      card.querySelector(".timezone-name")?.textContent ||
      card.querySelector("h3")?.textContent ||
      card.textContent;

    const cleanedName = String(timezoneName || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, " ");

    const location = timezoneLocations[cleanedName];

    if (!location) {
      console.warn("No map location found for timezone:", cleanedName);
      return;
    }

    map.flyTo({
      center: location.center,
      zoom: location.zoom,
      speed: 1.2,
      curve: 1.4,
      essential: true
    });
  });
});
