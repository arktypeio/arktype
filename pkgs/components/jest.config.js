const { getJestConfig } = require("@re-do/node")

module.exports = {
    ...getJestConfig(),
    testEnvironment: "jsdom",
    setupFiles: ["./jest.setup.js"]
}
