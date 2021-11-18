import type { Config } from "@jest/types"
import { existsSync } from "fs"
import { fromHere } from "../index.js"

process.env.TS_JEST_DISABLE_VER_CHECKER = "1"

const getCustomReporterPath = () => {
    const esmReporterPath = fromHere("jestStderrOnFailOnlyReporter.js")
    const cjsReporterPath = fromHere("jestStderrOnFailOnlyReporter.cjs")
    return existsSync(esmReporterPath) ? esmReporterPath : cjsReporterPath
}

export const getJestConfig = (): Config.InitialOptions => ({
    preset: "ts-jest/presets/default-esm",
    clearMocks: true,
    moduleFileExtensions: [
        "ts",
        "tsx",
        "cts",
        "ctsx",
        "mts",
        "mtsx",
        "js",
        "jsx",
        "cjs",
        "cjsx",
        "mjs",
        "json"
    ],
    testRegex: "/__tests__/.*\\.test\\.(j|t)sx?$",
    roots: ["<rootDir>/src"],
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1"
    },
    reporters: [getCustomReporterPath()],
    globals: {
        "ts-jest": {
            useESM: true,
            isolatedModules: true
        }
    }
})
