import type { Config } from "@jest/types"
import deepmerge from "deepmerge"
import { existsSync } from "fs"
import { fromHere } from "../fs.js"

process.env.TS_JEST_DISABLE_VER_CHECKER = "1"

const getCustomReporterPath = () => {
    const esmReporterPath = fromHere("jestStderrOnFailOnlyReporter.js")
    const cjsReporterPath = fromHere("jestStderrOnFailOnlyReporter.cjs")
    return existsSync(esmReporterPath) ? esmReporterPath : cjsReporterPath
}

export const getJestConfig = (
    options: Config.InitialOptions = {}
): Config.InitialOptions =>
    deepmerge(
        {
            transform: { "^.+\\.tsx?$": "ts-jest" },
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
                "^(\\.{1,2}/.*)\\.js$": "$1",
                "^@re-/tools/node$":
                    "<rootDir>/node_modules/@re-/tools/out/cjs/node"
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
            reporters: [getCustomReporterPath()],
            clearMocks: true,
            verbose: true
        },
        options
    )
