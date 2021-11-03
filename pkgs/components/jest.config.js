import { getJestConfig } from "@re-do/node"

export default {
    ...getJestConfig(),
    testEnvironment: "jsdom",
    setupFiles: ["./jest.setup.js"]
}
