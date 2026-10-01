/**
 * Worldsandbox13 — Live Hazard Sources
 * Public government/scientific data connectors.
 * Node.js 18+
 */

const SOURCES = Object.freeze({

  earthquake: {
    provider: "USGS",
    format: "geojson",
    url:
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
  },

  weatherAlerts: {
    provider: "NOAA/NWS",
    format: "geojson",
    url:
      "https://api.weather.gov/alerts/active"
  },

  tsunami: {
    provider: "NOAA/NWS",
    format: "geojson",
    url:
      "https://api.weather.gov/alerts/active"
  },

  tornado: {
    provider: "NOAA/NWS",
    format: "geojson",
    url:
      "https://api.weather.gov/alerts/active"
  },

  volcano: {
    provider:
      "Smithsonian Global Volcanism Program",
    format: "wfs",
    capabilities:
      "https://webservices.volcano.si.edu/geoserver/GVP-VOTW/wfs?request=GetCapabilities"
  }

});


const USER_AGENT =
  process.env.WORLDSANDBOX_USER_AGENT ||
  "Worldsandbox13/0.1 public-hazard-client";


async function fetchJSON(url) {

  const response = await fetch(url, {

    headers: {
      Accept:
        "application/geo+json, application/ld+json, application/json",

      "User-Agent": USER_AGENT
    }

  });


  if (!response.ok) {

    throw new Error(
      `HTTP ${response.status} from ${url}`
    );

  }


  return response.json();

}


function normalizeUSGSEarthquakes(feed) {

  return (feed.features || []).map(
    feature => {

      const properties =
        feature.properties || {};

      const coordinates =
        feature.geometry?.coordinates || [];


      return {

        event_id:
          feature.id,

        hazard_type:
          "earthquake",

        timestamp:
          properties.time
            ? new Date(
                properties.time
              ).toISOString()
            : null,

        latitude:
          coordinates[1] ?? null,

        longitude:
          coordinates[0] ?? null,

        depth_km:
          coordinates[2] ?? null,

        magnitude:
          properties.mag ?? null,

        severity:
          properties.alert || null,

        place:
          properties.place || null,

        tsunami_flag:
          properties.tsunami === 1,

        source:
          "USGS",

        source_url:
          properties.url || null

      };

    }
  );

}


function classifyNWSHazard(event = "") {

  const name =
    event.toLowerCase();


  if (
    name.includes("tornado")
  ) {
    return "tornado";
  }


  if (
    name.includes("tsunami")
  ) {
    return "tsunami";
  }


  if (
    name.includes("microburst")
  ) {
    return "microburst";
  }


  if (
    name.includes(
      "severe thunderstorm"
    ) ||
    name.includes(
      "high wind"
    ) ||
    name.includes(
      "special weather"
    )
  ) {

    return "severe-weather";

  }


  return "weather-alert";

}


function normalizeNWSAlerts(feed) {

  return (feed.features || []).map(
    feature => {

      const properties =
        feature.properties || {};


      return {

        event_id:
          feature.id ||
          properties.id ||
          null,

        hazard_type:
          classifyNWSHazard(
            properties.event
          ),

        timestamp:
          properties.sent ||
          properties.effective ||
          null,

        event:
          properties.event || null,

        severity:
          properties.severity || null,

        certainty:
          properties.certainty || null,

        urgency:
          properties.urgency || null,

        headline:
          properties.headline || null,

        area:
          properties.areaDesc || null,

        geometry:
          feature.geometry || null,

        source:
          "NOAA/NWS",

        source_url:
          properties["@id"] ||
          feature.id ||
          null

      };

    }
  );

}


async function getEarthquakes() {

  const data =
    await fetchJSON(
      SOURCES.earthquake.url
    );


  return normalizeUSGSEarthquakes(
    data
  );

}


async function getActiveNWSAlerts() {

  const data =
    await fetchJSON(
      SOURCES.weatherAlerts.url
    );


  return normalizeNWSAlerts(
    data
  );

}


async function getHazardSnapshot() {

  const results =
    await Promise.allSettled([

      getEarthquakes(),

      getActiveNWSAlerts()

    ]);


  const earthquakes =
    results[0].status === "fulfilled"
      ? results[0].value
      : [];


  const alerts =
    results[1].status === "fulfilled"
      ? results[1].value
      : [];


  return {

    generated_at:
      new Date().toISOString(),

    sources: {

      usgs:
        results[0].status,

      nws:
        results[1].status

    },

    counts: {

      earthquakes:
        earthquakes.length,

      weatherAlerts:
        alerts.length

    },

    events: [

      ...earthquakes,

      ...alerts

    ]

  };

}


module.exports = {

  SOURCES,

  fetchJSON,

  normalizeUSGSEarthquakes,

  normalizeNWSAlerts,

  classifyNWSHazard,

  getEarthquakes,

  getActiveNWSAlerts,

  getHazardSnapshot

};
