const { join } = require("path")

module.exports = {
    ...require("@re-do/configs/jest"),
    setupFiles: [join(__dirname, "jest.setup.js")]
}
