const { join } = require("path")

module.exports = {
    ...require("redo-recommended/jest"),
    setupFiles: [join(__dirname, "jest.setup.js")]
}
