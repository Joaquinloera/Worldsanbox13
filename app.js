/**
 * Worldsandbox13 — Core Bootstrap
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;

function readJSON(filename) {
  const file = path.join(ROOT, filename);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function validateConfig(config) {
  if (!config?.project?.name) {
    throw new Error("Missing project.name");
  }

  if (!config?.hazardEngines) {
    throw new Error("Missing hazardEngines");
  }

  return true;
}

function buildHazardRegistry(config) {
  return Object.entries(config.hazardEngines).map(
    ([id, engine]) => ({
      id,
      enabled: Boolean(engine.enabled),
      source: engine.source,
      adapter: engine.adapter,
      simulation: Boolean(engine.simulation)
    })
  );
}

function buildConnectorRegistry(connectors) {
  return connectors
    .filter(connector => connector.enabled)
    .map(connector => ({
      id: connector.id,
      name: connector.name,
      type: connector.type,
      baseUrl: connector.baseUrl,
      publicInformationOnly:
        connector.accessPolicy?.publicInformationOnly === true
    }));
}

function boot() {

  const config =
    readJSON("worldsandbox.config.json");

  const americaGov =
    readJSON("america-gov.connector.json");

  validateConfig(config);

  const state = {

    project: config.project,

    pipeline: config.pipeline,

    hazards:
      buildHazardRegistry(config),

    connectors:
      buildConnectorRegistry([
        americaGov
      ]),

    security: {
      commitSecrets: false,
      credentials:
        "environment-variables-only"
    },

    startedAt:
      new Date().toISOString()
  };

  console.log(
    "WORLD SANDBOX ONLINE"
  );

  console.log(
    JSON.stringify(state, null, 2)
  );

  return state;
}

if (require.main === module) {

  try {

    boot();

  } catch (error) {

    console.error(
      "WORLD SANDBOX BOOT FAILED:",
      error.message
    );

    process.exitCode = 1;
  }
}

module.exports = {
  boot,
  readJSON,
  validateConfig,
  buildHazardRegistry,
  buildConnectorRegistry
};
