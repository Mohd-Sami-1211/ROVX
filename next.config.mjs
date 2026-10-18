import { fileURLToPath } from "node:url";

const nodeStore = fileURLToPath(new URL("./lib/registration-store.node.js", import.meta.url));

export default {
  poweredByHeader: false,
  devIndicators: false,
  webpack(config) {
    config.resolve.alias["@rovx/registration-store"] = nodeStore;
    return config;
  },
  turbopack: {
    resolveAlias: { "@rovx/registration-store": "./lib/registration-store.node.js" },
  },
};
