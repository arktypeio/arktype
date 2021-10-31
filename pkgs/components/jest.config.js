const { getJestConfig } = require("@re-do/node-utils")

module.exports = {
    ...getJestConfig(),
    testEnvironment: "jsdom",
    setupFiles: ["./jest.setup.js"]
}
