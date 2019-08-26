const { join } = require("path")

module.exports = {
    ...require("@re-do/recommended/jest"),
    setupFiles: [join(__dirname, "jest.setup.js")],
    reporters: ["default", "jest-stare"],
    testResultsProcessor: "./node_modules/jest-stare"
}
