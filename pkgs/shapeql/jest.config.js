const { join } = require("path")

module.exports = {
    ...require("redo-recommended/jest"),
    setupFiles: [join(__dirname, "jest.setup.js")],
    reporters: ["default", "jest-stare"],
    testResultsProcessor: "./node_modules/jest-stare"
}
