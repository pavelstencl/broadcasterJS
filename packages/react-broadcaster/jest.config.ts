import type { Config } from "@jest/types";

const config:Config.InitialOptions = {
    verbose: true,
    testEnvironment: "jsdom",
    transform: {
        "^.+\\.ts?$": "ts-jest",
    },
};

export default config;
