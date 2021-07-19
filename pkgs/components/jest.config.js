const { getJestConfig } = require("@re-do/configs")

module.exports = {
    ...getJestConfig(),
    testEnvironment: "jsdom",
    setupFiles: ["./jest.setup.js"]
}
