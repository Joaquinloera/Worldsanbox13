/**
 * Worldsandbox13 — Core Runtime
 * Loads configuration and authorized public hazard sources.
 */

const fs = require("fs");
const path = require("path");

const {
  SOURCES,
  getHazardSnapshot
} = require("./hazard-sources");

const ROOT = __dirname;

function readJSON(filename) {
  const file = path.join(ROOT, filename);

  return JSON.parse(
    fs.readFileSync(file, "utf8")
  );
}

function validateConfig(config) {

  if (!config?.project?.name) {
    throw new Error(
      "Missing project.name"
    );
  }

  if (!config?.hazardEngines) {
    throw new Error(
      "Missing hazardEngines"
    );
  }

  return true;
}

function buildHazardRegistry(config) {

  return Object.entries(
    config.hazardEngines
  ).map(([id, engine]) => ({

    id,

    enabled:
      Boolean(engine.enabled),

    source:
      engine.source,

    adapter:
      engine.adapter,

    simulation:
      Boolean(engine.simulation)

  }));
}

function buildConnectorRegistry(connectors) {

  return connectors

    .filter(
      connector =>
        connector.enabled
    )

    .map(connector => ({

      id:
        connector.id,

      name:
        connector.name,

      type:
        connector.type,

      baseUrl:
        connector.baseUrl,

      publicInformationOnly:
        connector.accessPolicy
          ?.publicInformationOnly === true

    }));
}

async function boot() {

  console.log(
    "WORLD SANDBOX STARTING..."
  );

  const config =
    readJSON(
      "worldsandbox.config.json"
    );

  const americaGov =
    readJSON(
      "america-gov.connector.json"
    );

  validateConfig(config);

  const state = {

    project:
      config.project,

    pipeline:
      config.pipeline,

    hazards:
      buildHazardRegistry(config),

    connectors:
      buildConnectorRegistry([
        americaGov
      ]),

    sources:
      SOURCES,

    security: {

      commitSecrets:
        false,

      credentials:
        "environment-variables-only"

    },

    startedAt:
      new Date().toISOString()

  };

  console.log(
    "CORE CONFIGURATION LOADED"
  );

  console.log(
    "HAZARD ENGINES:",
    state.hazards
      .filter(h => h.enabled)
      .map(h => h.id)
      .join(", ")
  );

  console.log(
    "CONNECTORS:",
    state.connectors
      .map(c => c.name)
      .join(", ")
  );

  console.log(
    "FETCHING LIVE PUBLIC HAZARD DATA..."
  );

  try {

    const snapshot =
      await getHazardSnapshot();

    state.live =
      snapshot;

    console.log(
      "LIVE HAZARD SNAPSHOT RECEIVED"
    );

    console.log(
      "EARTHQUAKES:",
      snapshot.counts
        ?.earthquakes ?? 0
    );

    console.log(
      "WEATHER ALERTS:",
      snapshot.counts
        ?.weatherAlerts ?? 0
    );

  } catch (error) {

    state.live = {

      status:
        "degraded",

      error:
        error.message

    };

    console.error(
      "LIVE DATA ERROR:",
      error.message
    );
  }

  console.log(
    "WORLD SANDBOX ONLINE"
  );

  return state;
}

if (require.main === module) {

  boot()
    .then(state => {

      console.log(
        JSON.stringify(
          state,
          null,
          2
        )
      );

    })
    .catch(error => {

      console.error(
        "WORLD SANDBOX BOOT FAILED:",
        error.message
      );

      process.exitCode = 1;

    });

}

module.exports = {

  boot,

  readJSON,

  validateConfig,

  buildHazardRegistry,

  buildConnectorRegistry

};
