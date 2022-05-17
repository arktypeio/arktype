import { getJestConfig } from "@re-/node"

export default getJestConfig({
    testRegex: undefined,
    roots: ["<rootDir>/tests/"],
    globalSetup: "./jestSetup.js",
    globalTeardown: "./jestTeardown.js"
})
