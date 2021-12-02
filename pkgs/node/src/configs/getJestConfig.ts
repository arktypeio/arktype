import type { Config } from "@jest/types"
import deepmerge from "deepmerge"

process.env.TS_JEST_DISABLE_VER_CHECKER = "1"

export const getJestConfig = (
    options: Config.InitialOptions = {}
): Config.InitialOptions =>
    deepmerge(
        {
            transform: { "^.+\\.(j|t)sx?$": "ts-jest" },
            testRegex: "/__tests__/.*\\.test\\.(j|t)sx?$",
            coveragePathIgnorePatterns: ["/node_modules/", "/__tests__/.*"],
            roots: ["<rootDir>/src"],
            moduleFileExtensions: [
                "ts",
                "tsx",
                "mts",
                "mtsx",
                "cts",
                "ctsx",
                "js",
                "jsx",
                "mjs",
                "mjsx",
                "cjs",
                "cjsx",
                "json"
            ],
            extensionsToTreatAsEsm: [".ts", ".tsx", ".mts", ".mtsx"],
            moduleNameMapper: {
                "^(\\.{1,2}/.*)\\.js$": "$1"
            },
            globals: {
                "ts-jest": {
                    useESM: true,
                    isolatedModules: true
                }
            },
            snapshotFormat: {
                printBasicPrototype: false
            },
            clearMocks: true,
            verbose: true
        },
        options
    )
