/**
 * Worldsandbox13 — Core Runtime
 * Loads configuration, authorized public hazard sources,
 * payment networks, digital currencies, and financial institutions.
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
    throw new Error("Missing project.name");
  }

  if (!config?.hazardEngines) {
    throw new Error("Missing hazardEngines");
  }

  return true;
}

function validatePaymentRegistry(registry) {
  if (
    registry?.registry?.id !==
    "worldsandbox-global-payment-networks"
  ) {
    throw new Error(
      "Invalid payment network registry"
    );
  }

  if (!Array.isArray(registry.paymentNetworks)) {
    throw new Error(
      "Missing paymentNetworks registry"
    );
  }

  if (!Array.isArray(registry.digitalCurrencies)) {
    throw new Error(
      "Missing digitalCurrencies registry"
    );
  }

  return true;
}

function validateInstitutionRegistry(registry) {
  if (
    registry?.registry?.id !==
    "worldsandbox-global-financial-institutions"
  ) {
    throw new Error(
      "Invalid financial institution registry"
    );
  }

  if (!Array.isArray(registry.institutions)) {
    throw new Error(
      "Missing institutions registry"
    );
  }

  return true;
}

function buildHazardRegistry(config) {
  return Object.entries(
    config.hazardEngines
  ).map(([id, engine]) => ({
    id,
    enabled: Boolean(engine.enabled),
    source: engine.source,
    adapter: engine.adapter,
    simulation: Boolean(engine.simulation)
  }));
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
        connector.accessPolicy
          ?.publicInformationOnly === true
    }));
}

function buildPaymentNetworkRegistry(registry) {
  return registry.paymentNetworks.map(
    network => ({
      id: network.id,
      name: network.name,
      category: network.category,
      registered: network.registered === true,
      connectionState: network.connectionState,
      serverSideOnly: network.serverSideOnly === true,
      credentialsStoredInRepository:
        network.credentialsStoredInRepository === true,
      capabilities: network.capabilities || {}
    })
  );
}

function buildDigitalCurrencyRegistry(registry) {
  return registry.digitalCurrencies.map(
    currency => ({
      id: currency.id,
      symbol: currency.symbol,
      name: currency.name,
      category: currency.category,
      network: currency.network || null,
      registered: currency.registered === true,
      settlementEnabled:
        currency.settlementEnabled === true
    })
  );
}

function buildInstitutionRegistry(registry) {
  return registry.institutions.map(
    institution => ({
      id: institution.id,
      name: institution.name,
      category: institution.category,
      registered: institution.registered === true,
      connectionState:
        institution.connectionState,
      externalSystemAccess:
        institution.externalSystemAccess === true,
      credentialsStoredInRepository:
        institution.credentialsStoredInRepository === true,
      capabilities:
        institution.capabilities || {},
      corporateContext:
        institution.corporateContext || null
    })
  );
}

async function boot() {
  console.log("WORLD SANDBOX STARTING...");

  const config =
    readJSON("worldsandbox.config.json");

  const americaGov =
    readJSON("america-gov.connector.json");

  const paymentRegistry =
    readJSON(
      "data/global-payment-networks-registry.json"
    );

  const institutionRegistry =
    readJSON(
      "data/global-financial-institutions-registry.json"
    );

  validateConfig(config);
  validatePaymentRegistry(paymentRegistry);
  validateInstitutionRegistry(institutionRegistry);

  const state = {
    project: config.project,

    pipeline: config.pipeline,

    hazards:
      buildHazardRegistry(config),

    connectors:
      buildConnectorRegistry([
        americaGov
      ]),

    paymentNetworks:
      buildPaymentNetworkRegistry(
        paymentRegistry
      ),

    digitalCurrencies:
      buildDigitalCurrencyRegistry(
        paymentRegistry
      ),

    financialInstitutions:
      buildInstitutionRegistry(
        institutionRegistry
      ),

    paymentAuthority: {
      registryAuthority: "WorldSandbox13",
      executionAuthority: "sonoraport-banking",
      directMoneyMovement: false,
      providerVerificationRequired: true
    },

    sources: SOURCES,

    security: {
      commitSecrets: false,
      credentials:
        "environment-variables-only",
      providerSecretsStoredInRepository:
        false,
      privateKeysStoredInRepository:
        false
    },

    startedAt:
      new Date().toISOString()
  };

  console.log("CORE CONFIGURATION LOADED");

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
    "PAYMENT NETWORKS:",
    state.paymentNetworks
      .map(network => network.name)
      .join(", ")
  );

  console.log(
    "DIGITAL CURRENCIES:",
    state.digitalCurrencies
      .map(currency => currency.symbol)
      .join(", ")
  );

  console.log(
    "FINANCIAL INSTITUTIONS:",
    state.financialInstitutions
      .map(institution => institution.name)
      .join(", ")
  );

  console.log(
    "FETCHING LIVE PUBLIC HAZARD DATA..."
  );

  try {
    const snapshot =
      await getHazardSnapshot();

    state.live = snapshot;

    console.log(
      "LIVE HAZARD SNAPSHOT RECEIVED"
    );

    console.log(
      "EARTHQUAKES:",
      snapshot.counts?.earthquakes ?? 0
    );

    console.log(
      "WEATHER ALERTS:",
      snapshot.counts?.weatherAlerts ?? 0
    );

  } catch (error) {
    state.live = {
      status: "degraded",
      error: error.message
    };

    console.error(
      "LIVE DATA ERROR:",
      error.message
    );
  }

  console.log("WORLD SANDBOX ONLINE");

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
  validatePaymentRegistry,
  validateInstitutionRegistry,
  buildHazardRegistry,
  buildConnectorRegistry,
  buildPaymentNetworkRegistry,
  buildDigitalCurrencyRegistry,
  buildInstitutionRegistry
};
