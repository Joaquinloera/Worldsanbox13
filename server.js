/**
 * Worldsandbox13 — Unified API Server
 * Node.js 20+
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
const PUBLIC_DIR = path.join(ROOT, "public");
const INDEX_FILE = path.join(PUBLIC_DIR, "index.html");

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
    ),

    dispensaries: readJSON(
      "data/global-dispensary-registry.json"
    ),

    infrastructure: readJSON(
      "data/global-infrastructure-registry.json"
    ),

    shippingAgriculture: readJSON(
      "data/global-shipping-agriculture-registry.json"
    ),

    bankingBridge: readJSON(
      "data/sonoraport-banking-bridge.json"
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
      "*",

    "X-Content-Type-Options":
      "nosniff"
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

/*
 * SonoraPort Banking Bridge
 *
 * Secrets remain in deployment environment variables.
 * They are never returned to API clients.
 */

function getBankingBridgeConfig() {
  const baseUrl =
    process.env.SONORAPORT_BANKING_API_URL || "";

  const token =
    process.env.SONORAPORT_BANKING_BRIDGE_TOKEN || "";

  return {
    configured:
      Boolean(baseUrl && token),

    baseUrl:
      baseUrl.replace(/\/+$/, ""),

    token
  };
}

async function requestBankingService(endpoint) {
  const config =
    getBankingBridgeConfig();

  if (!config.configured) {
    return {
      ok: false,
      configured: false,
      status: "not_configured",
      message:
        "SonoraPort Banking runtime URL and bridge token are not configured."
    };
  }

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      5000
    );

  try {
    const response =
      await fetch(
        `${config.baseUrl}${endpoint}`,
        {
          method: "GET",

          headers: {
            Accept: "application/json",

            Authorization:
              `Bearer ${config.token}`,

            "User-Agent":
              "Worldsandbox13-Banking-Bridge/1.0"
          },

          signal: controller.signal
        }
      );

    const text =
      await response.text();

    let body;

    try {
      body = JSON.parse(text);
    } catch {
      body = {
        raw: text
      };
    }

    return {
      ok: response.ok,
      configured: true,
      upstreamStatus:
        response.status,
      data: body
    };

  } catch (error) {
    return {
      ok: false,
      configured: true,
      status: "unavailable",
      error:
        error.name === "AbortError"
          ? "Banking service request timed out."
          : "Banking service unavailable."
    };

  } finally {
    clearTimeout(timeout);
  }
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
          error:
            "Method not allowed"
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
        const banking =
          getBankingBridgeConfig();

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

            registries: {
              banking: true,
              bankingBridge: true,
              aiTechnology: true,
              nuclearRisk: true,
              governmentInformation: true,
              hazards: true,
              globalDispensaries: true,
              globalInfrastructure: true,
              shippingAgricultureTransportation:
                true
            },

            bankingBridge: {
              configured:
                banking.configured,

              credentialsExposed:
                false
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
              registries.security.nuclearRisk,

            sandboxLayers:
              registries.security.sandboxLayers
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

      if (
        url.pathname ===
        "/api/dispensaries"
      ) {
        return sendJSON(
          res,
          200,
          registries.dispensaries
        );
      }

      if (
        url.pathname ===
        "/api/infrastructure"
      ) {
        return sendJSON(
          res,
          200,
          registries.infrastructure
        );
      }

      if (
        url.pathname ===
        "/api/shipping-agriculture"
      ) {
        return sendJSON(
          res,
          200,
          registries.shippingAgriculture
        );
      }

      /*
       * Banking bridge configuration.
       * Does NOT expose environment secrets.
       */

      if (
        url.pathname ===
        "/api/banking-bridge"
      ) {
        const config =
          getBankingBridgeConfig();

        return sendJSON(
          res,
          200,
          {
            bridge:
              registries.bankingBridge,

            runtime: {
              configured:
                config.configured,

              credentialsExposed:
                false
            }
          }
        );
      }

      /*
       * Banking service health proxy.
       */

      if (
        url.pathname ===
        "/api/banking/health"
      ) {
        const result =
          await requestBankingService(
            "/api/health"
          );

        return sendJSON(
          res,
          result.ok ? 200 : 503,
          result
        );
      }

      /*
       * Banking capability proxy.
       */

      if (
        url.pathname ===
        "/api/banking/capabilities"
      ) {
        const result =
          await requestBankingService(
            "/api/capabilities"
          );

        return sendJSON(
          res,
          result.ok ? 200 : 503,
          result
        );
      }

      /*
       * Banking bridge status proxy.
       */

      if (
        url.pathname ===
        "/api/banking/status"
      ) {
        const result =
          await requestBankingService(
            "/api/world-sandbox/status"
          );

        return sendJSON(
          res,
          result.ok ? 200 : 503,
          result
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
          error:
            "Endpoint not found"
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
          status:
            "degraded",

          error:
            error.message,

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
  filterHazards,
  getBankingBridgeConfig,
  requestBankingService
};
