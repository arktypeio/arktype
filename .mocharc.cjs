const { join } = require("path")

/**
 * SWC source maps seem to have problems on windows, breaking our @re-/assert tests.
 * As a workaround, we use a custom tsconfig to disable the SWC transpiler that is
 * our default on other platforms.
 *
 * If in the future you can delete this and the tests still pass on Windows, do it!
 **/
if (process.platform === "win32") {
    process.env.TS_NODE_PROJECT = join(__dirname, "tsconfig.windows.json")
}

module.exports = {
    spec: "**/*.test.ts",
    "node-option": ["loader=ts-node/esm", "no-warnings=ExperimentalWarning"]
}
