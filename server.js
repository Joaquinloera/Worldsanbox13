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
    )
  };
}
