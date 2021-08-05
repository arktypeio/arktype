import type { Config } from "@jest/types"
import { fromHere } from "@re-do/node-utils"

process.env.TS_JEST_DISABLE_VER_CHECKER = "1"

export const getJestConfig = (): Config.InitialOptions => ({
    preset: "ts-jest/presets/default-esm",
    clearMocks: true,
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "mjs", "json"],
    testRegex: "/__tests__/.*\\.test\\.(j|t)sx?$",
    roots: ["<rootDir>/src"],
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1"
    },
    reporters: [fromHere("jestStderrOnFailOnlyReporter")],
    globals: {
        "ts-jest": {
            useESM: true
        }
    }
})
