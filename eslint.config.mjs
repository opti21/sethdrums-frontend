import next from "eslint-config-next";

const config = [...next, { ignores: ["lib/generated/**", ".next/**", "node_modules/**", "queue-worker/**"] }];

export default config;
