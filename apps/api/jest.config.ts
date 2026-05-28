import type { Config } from "jest";

const config: Config = {
  moduleFileExtensions: ["js", "json", "ts"],
  moduleNameMapper: {
    "^@boletas/shared$": "<rootDir>/../../packages/shared/src/index.ts",
    "^@boletas/shared/(.*)$": "<rootDir>/../../packages/shared/src/$1"
  },
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  testEnvironment: "node"
};

export default config;
