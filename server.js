/**
 * Worldsandbox13 — HTTP API Server
 * Node.js 18+
 */

const http = require("http");

const {
  getHazardSnapshot
} = require("./hazard-sources");

const PORT =
  Number(process.env.PORT) || 3000;

const HOST =
  process.env.HOST || "0.0.0.0";

const CACHE_MS = 30_000;

let cache = {
  timestamp: 0,
  snapshot: null
};

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

async function snapshot() {
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

function filterHazards(events, type) {
  return events.filter(
    event =>
      event.hazard_type === type
  );
}

const server =
  http.createServer(
    async (req, res) => {

      const url =
        new URL(
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
            error:
              "Method not allowed"
          }
        );
      }

      try {

        if (url.pathname === "/") {
          return sendJSON(
            res,
            200,
            {
              project:
                "Worldsandbox13",

              status:
                "online",

              endpoints: [
                "/api/status",
                "/api/hazards",
                "/api/earthquakes",
                "/api/alerts",
                "/api/tornadoes",
                "/api/tsunamis",
                "/api/microbursts"
              ]
            }
          );
        }

        if (
          url.pathname ===
          "/api/status"
        ) {
          return sendJSON(
            res,
            200,
            {
              project:
                "Worldsandbox13",

              status:
                "online",

              runtime:
                process.version,

              timestamp:
                new Date()
                  .toISOString()
            }
          );
        }

        const data =
          await snapshot();

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
          const tornadoes =
            filterHazards(
              events,
              "tornado"
            );

          return sendJSON(
            res,
            200,
            {
              count:
                tornadoes.length,

              events:
                tornadoes
            }
          );
        }

        if (
          url.pathname ===
          "/api/tsunamis"
        ) {
          const tsunamis =
            filterHazards(
              events,
              "tsunami"
            );

          return sendJSON(
            res,
            200,
            {
              count:
                tsunamis.length,

              events:
                tsunamis
            }
          );
        }

        if (
          url.pathname ===
          "/api/microbursts"
        ) {
          const microbursts =
            filterHazards(
              events,
              "microburst"
            );

          return sendJSON(
            res,
            200,
            {
              count:
                microbursts.length,

              events:
                microbursts
            }
          );
        }

        return sendJSON(
          res,
          404,
          {
            error:
              "Endpoint not found"
          }
        );

      } catch (error) {

        console.error(
          "API ERROR:",
          error
        );

        return sendJSON(
          res,
          503,
          {
            status:
              "degraded",

            error:
              "Hazard data temporarily unavailable",

            timestamp:
              new Date()
                .toISOString()
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
  snapshot,
  hazardCounts,
  filterHazards
};
