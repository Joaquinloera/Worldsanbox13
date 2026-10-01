/**
 * Worldsandbox13 — Unified API Server
 * Node.js 18+
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const {
  getHazardSnapshot
} = require("./hazard-sources");

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = __dirname;
const PUBLIC_DIR =
  path.join(ROOT, "public");

const INDEX_FILE =
  path.join(
    PUBLIC_DIR,
    "index.html"
  );
const CACHE_MS = 30000;

let cache = {
  timestamp: 0,
  snapshot: null
};

function readJSON(filename) {
  return JSON.parse(
    fs.readFileSync(
      path.join(ROOT, filename),
      "utf8"
    )
  );
}

function loadRegistries() {
  return {
    institutions: readJSON(
      "global-institutions.json"
    ),

    ai: readJSON(
      "ai-technology.json"
    ),

    security: readJSON(
      "global-security.json"
    ),

    government: readJSON(
      "america-gov.connector.json"
    )
  };
}

function sendJSON(res, status, data) {
  res.writeHead(status, {
    "Content-Type":
      "application/json; charset=utf-8",

    "Cache-Control":
      "no-store",

    "Access-Control-Allow-Origin":
      "*"
  });

  res.end(
    JSON.stringify(data, null, 2)
  );
}

async function getSnapshot() {
  const now = Date.now();

  if (
    cache.snapshot &&
    now - cache.timestamp < CACHE_MS
  ) {
    return cache.snapshot;
  }

  const data =
    await getHazardSnapshot();

  cache = {
    timestamp: now,
    snapshot: data
  };

  return data;
}

function filterHazards(events, type) {
  return events.filter(
    event =>
      event.hazard_type === type
  );
}

function hazardCounts(events) {
  const counts = {};

  for (const event of events) {
    const type =
      event.hazard_type || "unknown";

    counts[type] =
      (counts[type] || 0) + 1;
  }

  return counts;
}

const server = http.createServer(
  async (req, res) => {

    const url = new URL(
      req.url,
      `http://${req.headers.host || "localhost"}`
    );

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods":
          "GET, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type"
      });

      return res.end();
    }

    if (req.method !== "GET") {
      return sendJSON(
        res,
        405,
        {
          error: "Method not allowed"
        }
      );
    }

    try {
      const registries =
        loadRegistries();

      if (url.pathname === "/") {

  if (!fs.existsSync(INDEX_FILE)) {
    return sendJSON(
      res,
      404,
      {
        error:
          "Command center UI not found"
      }
    );
  }

  const html =
    fs.readFileSync(
      INDEX_FILE,
      "utf8"
    );

  res.writeHead(
    200,
    {
      "Content-Type":
        "text/html; charset=utf-8",

      "Cache-Control":
        "no-cache"
    }
  );

  return res.end(html);
      }

      if (url.pathname === "/api/status") {
        return sendJSON(
          res,
          200,
          {
            project: "Worldsandbox13",
            status: "online",
            runtime: process.version,

            registries: {
              banking: true,
              aiTechnology: true,
              nuclearRisk: true,
              governmentInformation: true,
              hazards: true
            },

            timestamp:
              new Date().toISOString()
          }
        );
      }

      if (
        url.pathname ===
        "/api/institutions"
      ) {
        return sendJSON(
          res,
          200,
          registries.institutions
        );
      }

      if (url.pathname === "/api/banks") {
        const institutions =
          registries.institutions;

        return sendJSON(
          res,
          200,
          {
            globalFinancialInstitutions:
              institutions
                .globalFinancialInstitutions ||
              [],

            centralBanks:
              institutions.centralBanks ||
              []
          }
        );
      }

      if (
        url.pathname ===
        "/api/ai-companies"
      ) {
        return sendJSON(
          res,
          200,
          registries.ai
        );
      }

      if (
        url.pathname ===
        "/api/security"
      ) {
        return sendJSON(
          res,
          200,
          registries.security
        );
      }

      if (
        url.pathname ===
        "/api/nuclear-risk"
      ) {
        return sendJSON(
          res,
          200,
          {
            registry:
              registries.security.registry,

            nuclearRisk:
              registries.security
                .nuclearRisk,

            sandboxLayers:
              registries.security
                .sandboxLayers
          }
        );
      }

      if (
        url.pathname ===
        "/api/government"
      ) {
        return sendJSON(
          res,
          200,
          registries.government
        );
      }

      const data =
        await getSnapshot();

      const events =
        data.events || [];

      if (
        url.pathname ===
        "/api/hazards"
      ) {
        return sendJSON(
          res,
          200,
          {
            generated_at:
              data.generated_at,

            sources:
              data.sources,

            counts:
              hazardCounts(events),

            events
          }
        );
      }

      if (
        url.pathname ===
        "/api/earthquakes"
      ) {
        const earthquakes =
          filterHazards(
            events,
            "earthquake"
          );

        return sendJSON(
          res,
          200,
          {
            count:
              earthquakes.length,

            events:
              earthquakes
          }
        );
      }

      if (
        url.pathname ===
        "/api/alerts"
      ) {
        const alerts =
          events.filter(
            event =>
              event.source ===
              "NOAA/NWS"
          );

        return sendJSON(
          res,
          200,
          {
            count:
              alerts.length,

            events:
              alerts
          }
        );
      }

      if (
        url.pathname ===
        "/api/tornadoes"
      ) {
        const eventsFiltered =
          filterHazards(
            events,
            "tornado"
          );

        return sendJSON(
          res,
          200,
          {
            count:
              eventsFiltered.length,

            events:
              eventsFiltered
          }
        );
      }

      if (
        url.pathname ===
        "/api/tsunamis"
      ) {
        const eventsFiltered =
          filterHazards(
            events,
            "tsunami"
          );

        return sendJSON(
          res,
          200,
          {
            count:
              eventsFiltered.length,

            events:
              eventsFiltered
          }
        );
      }

      if (
        url.pathname ===
        "/api/microbursts"
      ) {
        const eventsFiltered =
          filterHazards(
            events,
            "microburst"
          );

        return sendJSON(
          res,
          200,
          {
            count:
              eventsFiltered.length,

            events:
              eventsFiltered
          }
        );
      }

      return sendJSON(
        res,
        404,
        {
          error: "Endpoint not found"
        }
      );

    } catch (error) {
      console.error(
        "WORLD SANDBOX API ERROR:",
        error
      );

      return sendJSON(
        res,
        500,
        {
          status: "degraded",
          error: error.message,
          timestamp:
            new Date().toISOString()
        }
      );
    }
  }
);

server.listen(
  PORT,
  HOST,
  () => {
    console.log(
      `WORLD SANDBOX API ONLINE — ${HOST}:${PORT}`
    );
  }
);

module.exports = {
  server,
  readJSON,
  loadRegistries,
  getSnapshot,
  hazardCounts,
  filterHazards
};
