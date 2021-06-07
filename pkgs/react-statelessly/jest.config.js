const { getJestConfig } = require("@re-do/configs")
const { join } = require("path")

module.exports = {
    ...getJestConfig(),
    setupFiles: [join(__dirname, "jest.setup.js")]
}
