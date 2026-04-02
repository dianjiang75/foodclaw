import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/__tests__"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^jose$": "<rootDir>/__mocks__/jose.ts",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
  transformIgnorePatterns: [
    "node_modules/(?!(next-themes|@anthropic-ai|jose)/)",
  ],
};

export default config;
