const { join } = require("path")

module.exports = {
    ...require("@re-do/recommended/jest"),
    setupFiles: [join(__dirname, "jest.setup.js")],
}
