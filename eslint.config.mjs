import next from "eslint-config-next";

const config = [...next, { ignores: ["lib/generated/**", ".next/**", "node_modules/**"] }];

export default config;
