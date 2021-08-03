import type { Config } from "@jest/types"
import { dirName, runScript } from "@re-do/node-utils"

process.env.TS_JEST_DISABLE_VER_CHECKER = "1"

runScript(dirName("..", "..", "src", "jestIgnoreOpenHandlesPatch.ts"), {
    esm: false
})

export const getJestConfig = (): Config.InitialOptions => ({
    preset: "ts-jest/presets/default-esm",
    clearMocks: true,
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "mjs", "json"],
    testRegex: "/__tests__/.*\\.test\\.(j|t)sx?$",
    roots: ["<rootDir>/src"],
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1"
    },
    reporters: [dirName("jestStderrOnFailOnlyReporter")],
    globals: {
        "ts-jest": {
            useESM: true
        }
    }
})
